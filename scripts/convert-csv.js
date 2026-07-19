const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.resolve(__dirname, '..', '..', 'รายงานสินค้าคงเหลือตามSKU.xlsx - rawdata.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split(/\r?\n/);

const products = [];

// Estimate pack sizes for default database if not specified
function getEstimatedPackSize(name, unit) {
  const lowercaseName = name.toLowerCase();
  
  if (lowercaseName.includes('c-vitt')) return 30;
  if (lowercaseName.includes('น้ำดื่ม') || lowercaseName.includes('คริสตัล') || lowercaseName.includes('อากัว')) {
    if (lowercaseName.includes('1500')) return 6;
    if (lowercaseName.includes('600')) return 12;
    if (lowercaseName.includes('350')) return 12;
    return 12;
  }
  if (lowercaseName.includes('กุมิ กุมิ')) return 6;
  if (lowercaseName.includes('เบอร์ดี้') || lowercaseName.includes('โรบัตต้า') || lowercaseName.includes('เอสเปรสโซ')) return 30;
  if (lowercaseName.includes('แฟนต้า') || lowercaseName.includes('โค้ก') || lowercaseName.includes('สไปร์ท') || lowercaseName.includes('แป๊บซี่')) return 24;
  if (lowercaseName.includes('มาม่าคัพ') || lowercaseName.includes('ควิกคัพ') || lowercaseName.includes('ซือดะคัพ') || lowercaseName.includes('คนอร์คัพ')) return 36;
  if (lowercaseName.includes('โออิชิ')) return 24;
  if (lowercaseName.includes('ไวตามิ๊ลค์')) return 24;
  if (lowercaseName.includes('โฟร์โมสต์') || lowercaseName.includes('ดัชมิลล์') || lowercaseName.includes('โอวัลติน') || lowercaseName.includes('ไมโล')) return 36;
  
  if (unit === 'ขวด') return 24;
  if (unit === 'กระป๋อง') return 24;
  
  return 1; // Default
}

if (lines.length > 0) {
  // Parse header
  const headerParts = lines[0].split(',').map(h => h.trim().toLowerCase());
  let nameIdx = 2, priceIdx = 3, costIdx = 4, unitIdx = 5, categoryIdx = 6, pluIdx = 1, packSizeIdx = -1;

  headerParts.forEach((h, i) => {
    if (h === 'name' || h.includes('ชื่อ')) nameIdx = i;
    if (h === 'price' || h.includes('ราคา')) priceIdx = i;
    if (h === 'cost' || h.includes('ทุน') || h.includes('ต้นทุน')) costIdx = i;
    if (h === 'unit' || h.includes('หน่วย')) unitIdx = i;
    if (h === 'category' || h.includes('หมวด') || h.includes('ประเภท')) categoryIdx = i;
    if (h === 'plu code' || h === 'plu' || h.includes('barcode') || h.includes('บาร์โค้ด')) pluIdx = i;
    if (h.includes('pack') || h.includes('ลัง') || h.includes('กล่องใหญ่') || h.includes('บรรจุ')) packSizeIdx = i;
  });

  // Parse lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,,')) continue;

    const parts = line.split(',');
    if (parts.length < 7) continue;

    const no = parts[0].trim();
    const plu = parts[pluIdx]?.trim() || '';
    const name = parts[nameIdx]?.trim() || '';
    const price = parseFloat(parts[priceIdx]) || 0;
    const cost = parseFloat(parts[costIdx]) || 0;
    const unit = parts[unitIdx]?.trim() || 'ชิ้น';
    const category = parts[categoryIdx]?.trim() || 'Uncategory';
    const packSize = packSizeIdx !== -1 ? parseInt(parts[packSizeIdx]) || getEstimatedPackSize(name, unit) : getEstimatedPackSize(name, unit);

    if (!name || !category) continue;

    products.push({
      id: parseInt(no) || i,
      plu,
      name,
      price,
      cost,
      unit,
      packSize,
      category
    });
  }
}

// Category display names mapping
const categoryMap = {
  '1เครื่องดิ่ม': 'เครื่องดื่ม',
  '2Snacks': 'ขนมขบเคี้ยว (Snacks)',
  '3อาหารกึ่งสำเร็จรูป': 'อาหารกึ่งสำเร็จรูป',
  '4อาหารปรุงสุก': 'อาหารปรุงสุก',
  '5ของใช้ส่วนตัว': 'ของใช้ส่วนตัว',
  '6เครื่องเขียน': 'เครื่องเขียน',
  '7บริการ': 'บริการ',
  '8เบเกอรี่': 'เบเกอรี่',
  '9ฝากขาย': 'ฝากขาย',
  'Uncategory': 'อื่นๆ'
};

// Category icon mapping
const categoryIcons = {
  '1เครื่องดิ่ม': '🥤',
  '2Snacks': '🍿',
  '3อาหารกึ่งสำเร็จรูป': '🍜',
  '4อาหารปรุงสุก': '🍛',
  '5ของใช้ส่วนตัว': '🧴',
  '6เครื่องเขียน': '✏️',
  '7บริการ': '🖨️',
  '8เบเกอรี่': '🧁',
  '9ฝากขาย': '📦',
  'Uncategory': '📋'
};

const categories = [...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b, 'th'));

const output = `// Auto-generated from CSV data
// Generated on: ${new Date().toISOString()}
// Total products: ${products.length}

const PRODUCTS = ${JSON.stringify(products, null, 2)};

const CATEGORY_DISPLAY = ${JSON.stringify(categoryMap, null, 2)};

const CATEGORY_ICONS = ${JSON.stringify(categoryIcons, null, 2)};

const CATEGORIES = ${JSON.stringify(categories, null, 2)};
`;

const outputPath = path.resolve(__dirname, '..', 'data.js');
fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`Generated data.js with ${products.length} products`);
console.log('Categories found:', categories);
