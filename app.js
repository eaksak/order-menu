/* ============================================
   ORDER MENU — Application Logic
   ============================================ */

// ---- Data Layer ----
// These are initialized from data.js but can be overridden by localStorage
let products = [...PRODUCTS];
let categories = [...CATEGORIES];
let categoryDisplay = { ...CATEGORY_DISPLAY };
let categoryIcons = { ...CATEGORY_ICONS };

const STORAGE_KEY = 'orderMenu_products';
const STORAGE_DATE_KEY = 'orderMenu_lastUpdate';
const STORAGE_SOURCE_KEY = 'orderMenu_source';

// ---- State ----
let currentCategory = 'all';
let searchQuery = '';
let amounts = {}; // { productId: amount }
let pendingImportData = null; // holds parsed data before user confirms

// ---- DOM References ----
const dom = {
  categoryScroll: document.getElementById('categoryScroll'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  productBody: document.getElementById('productBody'),
  emptyState: document.getElementById('emptyState'),
  tableScroll: document.querySelector('.table-scroll'),
  currentCategoryTitle: document.getElementById('currentCategoryTitle'),
  visibleCount: document.getElementById('visibleCount'),
  orderCount: document.getElementById('orderCount'),
  orderBadge: document.getElementById('orderBadge'),
  dateDisplay: document.getElementById('dateDisplay'),
  // Summary toggle
  summaryToggle: document.getElementById('summaryToggle'),
  toggleBadge: document.getElementById('toggleBadge'),
  toggleTotal: document.getElementById('toggleTotal'),
  toggleSummaryBtn: document.getElementById('toggleSummaryBtn'),
  // Order Panel
  orderPanel: document.getElementById('orderPanel'),
  orderOverlay: document.getElementById('orderOverlay'),
  closePanel: document.getElementById('closePanel'),
  summaryList: document.getElementById('summaryList'),
  totalItems: document.getElementById('totalItems'),
  grandTotalPrice: document.getElementById('grandTotalPrice'),
  grandTotalCost: document.getElementById('grandTotalCost'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  printBtn: document.getElementById('printBtn'),
  // Print
  printBody: document.getElementById('printBody'),
  printDate: document.getElementById('printDate'),
  printTime: document.getElementById('printTime'),
  printTotalQty: document.getElementById('printTotalQty'),
  printTotalValue: document.getElementById('printTotalValue'),
  printTotalCost: document.getElementById('printTotalCost'),
  // Import Modal
  importBtn: document.getElementById('importBtn'),
  importOverlay: document.getElementById('importOverlay'),
  importModal: document.getElementById('importModal'),
  closeImport: document.getElementById('closeImport'),
  uploadArea: document.getElementById('uploadArea'),
  fileInput: document.getElementById('fileInput'),
  uploadStatus: document.getElementById('uploadStatus'),
  statusIcon: document.getElementById('statusIcon'),
  statusText: document.getElementById('statusText'),
  importPreview: document.getElementById('importPreview'),
  previewStats: document.getElementById('previewStats'),
  previewBody: document.getElementById('previewBody'),
  cancelImport: document.getElementById('cancelImport'),
  confirmImport: document.getElementById('confirmImport'),
  currentDataCount: document.getElementById('currentDataCount'),
  lastUpdateDate: document.getElementById('lastUpdateDate'),
  dataSource: document.getElementById('dataSource'),
  resetDataBtn: document.getElementById('resetDataBtn'),
};

// ---- Initialization ----
function init() {
  loadSavedData();
  updateDateDisplay();
  rebuildUI();
  setupEventListeners();
  setupImportListeners();
  updateDataInfo();
  // Update date every minute
  setInterval(updateDateDisplay, 60000);
}

// ---- Data Persistence ----
function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        products = parsed;
        rebuildCategoriesFromProducts();
      }
    }
  } catch (e) {
    console.warn('Could not load saved data:', e);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Could not save data:', e);
  }
}

function rebuildCategoriesFromProducts() {
  categories = [...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b, 'th'));
  // Add display names for any new categories not in the original map
  categories.forEach(cat => {
    if (!categoryDisplay[cat]) {
      categoryDisplay[cat] = cat;
    }
    if (!categoryIcons[cat]) {
      categoryIcons[cat] = '📋';
    }
  });
}

function updateDataInfo() {
  dom.currentDataCount.textContent = `${products.length} รายการ`;

  const lastUpdate = localStorage.getItem(STORAGE_DATE_KEY);
  if (lastUpdate) {
    const date = new Date(lastUpdate);
    dom.lastUpdateDate.textContent = date.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } else {
    dom.lastUpdateDate.textContent = 'ข้อมูลเริ่มต้น';
  }

  const source = localStorage.getItem(STORAGE_SOURCE_KEY);
  dom.dataSource.textContent = source || 'ไฟล์เริ่มต้น (data.js)';
}

// ---- Rebuild UI after data change ----
function rebuildUI() {
  // Clear existing dynamic category pills
  const existingPills = dom.categoryScroll.querySelectorAll('.category-pill:not(#cat-all)');
  existingPills.forEach(pill => pill.remove());

  currentCategory = 'all';
  document.getElementById('cat-all').classList.add('active');
  dom.currentCategoryTitle.textContent = 'สินค้าทั้งหมด';

  renderCategoryPills();
  renderProducts();
  updateOrderSummary();
}

// ---- Date Display ----
function updateDateDisplay() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('th-TH', options);
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  dom.dateDisplay.innerHTML = `${dateStr}<br>${timeStr} น.`;
}

// ---- Category Pills ----
function renderCategoryPills() {
  // Count products per category
  const categoryCounts = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  // Update "All" count
  document.getElementById('count-all').textContent = products.length;

  // Create category pills
  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'category-pill';
    pill.dataset.category = cat;
    pill.id = `cat-${cat}`;

    const icon = categoryIcons[cat] || '📋';
    const displayName = categoryDisplay[cat] || cat;
    const count = categoryCounts[cat] || 0;

    pill.innerHTML = `
      <span class="pill-icon">${icon}</span>
      <span class="pill-text">${displayName}</span>
      <span class="pill-count">${count}</span>
    `;

    pill.addEventListener('click', () => selectCategory(cat));
    dom.categoryScroll.appendChild(pill);
  });
}

function selectCategory(category) {
  currentCategory = category;

  // Update active pill
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === category);
  });

  // Update title
  if (category === 'all') {
    dom.currentCategoryTitle.textContent = 'สินค้าทั้งหมด';
  } else {
    const icon = categoryIcons[category] || '';
    const name = categoryDisplay[category] || category;
    dom.currentCategoryTitle.textContent = `${icon} ${name}`;
  }

  renderProducts();

  // Scroll to table
  dom.tableScroll.scrollTop = 0;
}

// ---- Search ----
function setupEventListeners() {
  // Search input
  dom.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    dom.clearSearch.classList.toggle('visible', searchQuery.length > 0);
    renderProducts();
  });

  dom.clearSearch.addEventListener('click', () => {
    dom.searchInput.value = '';
    searchQuery = '';
    dom.clearSearch.classList.remove('visible');
    renderProducts();
    dom.searchInput.focus();
  });

  // "All" category pill
  document.getElementById('cat-all').addEventListener('click', () => selectCategory('all'));

  // Order badge click -> open panel
  dom.orderBadge.addEventListener('click', openOrderPanel);

  // Summary toggle click -> open panel
  dom.toggleSummaryBtn.addEventListener('click', openOrderPanel);

  // Close panel
  dom.closePanel.addEventListener('click', closeOrderPanel);
  dom.orderOverlay.addEventListener('click', closeOrderPanel);

  // Clear all
  dom.clearAllBtn.addEventListener('click', clearAllAmounts);

  // Print
  dom.printBtn.addEventListener('click', handlePrint);

  // Keyboard shortcut: Escape to close panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOrderPanel();
      closeImportModal();
    }
  });
}

// ---- Product Rendering ----
function getFilteredProducts() {
  let filtered = products;

  // Filter by category
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  // Filter by search
  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.plu.includes(searchQuery)
    );
  }

  // Sort alphabetically by Thai name
  filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));

  return filtered;
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();

  dom.visibleCount.textContent = `${filteredProducts.length} รายการ`;

  if (filteredProducts.length === 0) {
    dom.tableScroll.style.display = 'none';
    dom.emptyState.style.display = 'block';
    return;
  }

  dom.tableScroll.style.display = 'block';
  dom.emptyState.style.display = 'none';

  // Build rows
  const fragment = document.createDocumentFragment();

  filteredProducts.forEach((product, index) => {
    const tr = document.createElement('tr');
    const amt = amounts[product.id] || 0;
    if (amt > 0) tr.classList.add('has-amount');
    tr.dataset.productId = product.id;

    const categoryTag = currentCategory === 'all'
      ? `<div class="td-category-tag">${categoryDisplay[product.category] || product.category}</div>`
      : '';

    tr.innerHTML = `
      <td class="td-no">${index + 1}</td>
      <td class="td-name">
        <div class="name-text">${product.name}</div>
        ${categoryTag}
        <div class="mobile-pack-row">
          <span class="pack-label">📦 1 ลัง =</span>
          <input type="number"
                 class="pack-input"
                 data-id="${product.id}"
                 value="${product.packSize || 1}"
                 min="1"
                 inputmode="numeric">
          <span class="pack-unit">${product.unit}</span>
        </div>
      </td>
      <td class="td-cost">${formatCurrency(product.cost)}</td>
      <td class="td-price">${formatCurrency(product.price)}</td>
      <td class="td-unit">${product.unit}</td>
      <td class="td-pack">
        <div class="pack-control">
          <span class="pack-label">1 ลัง =</span>
          <input type="number"
                 class="pack-input"
                 data-id="${product.id}"
                 value="${product.packSize || 1}"
                 min="1"
                 inputmode="numeric">
          <span class="pack-unit">${product.unit}</span>
        </div>
      </td>
      <td class="td-amount">
        <div class="amount-control">
          <button class="amount-btn minus" data-id="${product.id}" data-action="minus" title="ลด">−</button>
          <input type="number"
                 class="amount-input ${amt > 0 ? 'has-value' : ''}"
                 data-id="${product.id}"
                 value="${amt || ''}"
                 min="0"
                 placeholder="0"
                 inputmode="numeric">
          <button class="amount-btn plus" data-id="${product.id}" data-action="plus" title="เพิ่ม">+</button>
        </div>
      </td>
    `;

    // Event listeners for this row
    const minusBtn = tr.querySelector('.minus');
    const plusBtn = tr.querySelector('.plus');
    const input = tr.querySelector('.amount-input');
    const packInputs = tr.querySelectorAll('.pack-input');

    minusBtn.addEventListener('click', () => changeAmount(product.id, -1, tr));
    plusBtn.addEventListener('click', () => changeAmount(product.id, 1, tr));
    input.addEventListener('change', (e) => setAmount(product.id, parseInt(e.target.value) || 0, tr));
    input.addEventListener('focus', (e) => e.target.select());

    packInputs.forEach(packInp => {
      packInp.addEventListener('change', (e) => {
        const val = parseInt(e.target.value) || 1;
        setPackSize(product.id, val, tr);
      });
      packInp.addEventListener('focus', (e) => e.target.select());
    });

    fragment.appendChild(tr);
  });

  dom.productBody.innerHTML = '';
  dom.productBody.appendChild(fragment);
}

// ---- Pack Size Management ----
function setPackSize(productId, newPackSize, rowElement) {
  const size = Math.max(1, parseInt(newPackSize) || 1);
  const targetProduct = products.find(p => p.id === productId);
  if (targetProduct) {
    targetProduct.packSize = size;
    saveData();

    // Sync pack input values in this row
    if (rowElement) {
      rowElement.querySelectorAll('.pack-input').forEach(inp => {
        inp.value = size;
      });
    }

    updateOrderSummary();
    showSuccessToast(`แก้ไขขนาดแพ็ค: ${targetProduct.name} เป็น 1 ลัง = ${size} ${targetProduct.unit}`);
  }
}

// ---- Amount Management ----
function changeAmount(productId, delta, rowElement) {
  const current = amounts[productId] || 0;
  const newAmount = Math.max(0, current + delta);
  setAmount(productId, newAmount, rowElement);
}

function setAmount(productId, amount, rowElement) {
  if (amount <= 0) {
    delete amounts[productId];
  } else {
    amounts[productId] = amount;
  }

  // Update the input in this row
  if (rowElement) {
    const input = rowElement.querySelector('.amount-input');
    input.value = amount || '';
    input.classList.toggle('has-value', amount > 0);
    rowElement.classList.toggle('has-amount', amount > 0);

    // Pulse animation
    rowElement.classList.remove('pulse');
    void rowElement.offsetWidth; // force reflow
    rowElement.classList.add('pulse');
  }

  updateOrderSummary();
}

function clearAllAmounts() {
  if (Object.keys(amounts).length === 0) return;

  if (confirm('ต้องการล้างรายการทั้งหมดหรือไม่?')) {
    amounts = {};
    renderProducts();
    updateOrderSummary();
    closeOrderPanel();
  }
}

// ---- Order Summary ----
function updateOrderSummary() {
  const orderItems = getOrderItems();
  const totalCartons = orderItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPieces = orderItems.reduce((sum, item) => sum + (item.qty * (item.packSize || 1)), 0);
  const totalPrice = orderItems.reduce((sum, item) => sum + (item.price * item.qty * (item.packSize || 1)), 0);
  const totalCost = orderItems.reduce((sum, item) => sum + (item.cost * item.qty * (item.packSize || 1)), 0);

  // Update badge
  dom.orderCount.textContent = orderItems.length;

  // Update floating toggle
  if (orderItems.length > 0) {
    dom.summaryToggle.style.display = 'block';
    dom.toggleBadge.textContent = orderItems.length;
    dom.toggleTotal.textContent = formatCurrency(totalPrice);
  } else {
    dom.summaryToggle.style.display = 'none';
  }

  // Update panel content
  dom.totalItems.textContent = `${totalCartons} ลัง (${totalPieces} ชิ้น)`;
  dom.grandTotalPrice.textContent = `฿ ${formatCurrency(totalPrice)}`;
  dom.grandTotalCost.textContent = `฿ ${formatCurrency(totalCost)}`;

  // Render summary list
  if (orderItems.length === 0) {
    dom.summaryList.innerHTML = `
      <div class="summary-empty">
        <p>ยังไม่มีรายการสินค้า</p>
        <span>กรุณาเลือกสินค้าและระบุจำนวน</span>
      </div>
    `;
  } else {
    dom.summaryList.innerHTML = orderItems.map((item, i) => {
      const subtotalPieces = item.qty * (item.packSize || 1);
      return `
        <div class="summary-item">
          <div class="summary-item-info">
            <div class="summary-item-name">${item.name}</div>
            <div class="summary-item-detail">แพ็คละ ${item.packSize || 1} ${item.unit} • ฿${formatCurrency(item.price)}/ชิ้น</div>
          </div>
          <div class="summary-item-qty">${item.qty} ลัง (${subtotalPieces} ${item.unit})</div>
          <div class="summary-item-subtotal">฿ ${formatCurrency(item.price * subtotalPieces)}</div>
        </div>
      `;
    }).join('');
  }
}

function getOrderItems() {
  const items = [];
  for (const [idStr, qty] of Object.entries(amounts)) {
    const id = parseInt(idStr);
    const product = products.find(p => p.id === id);
    if (product && qty > 0) {
      items.push({
        ...product,
        qty
      });
    }
  }
  // Sort by category then name
  items.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category, 'th');
    return a.name.localeCompare(b.name, 'th');
  });
  return items;
}

// ---- Order Panel ----
function openOrderPanel() {
  dom.orderPanel.classList.add('visible');
  dom.orderOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeOrderPanel() {
  dom.orderPanel.classList.remove('visible');
  dom.orderOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

// ---- Print ----
function handlePrint() {
  const orderItems = getOrderItems();

  if (orderItems.length === 0) {
    alert('ยังไม่มีรายการสินค้า กรุณาเลือกสินค้าและระบุจำนวนก่อนพิมพ์');
    return;
  }

  // Fill print template
  const now = new Date();
  dom.printDate.textContent = `วันที่: ${now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  dom.printTime.textContent = `เวลา: ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

  let totalCartons = 0;
  let totalPieces = 0;
  let totalPrice = 0;
  let totalCost = 0;

  dom.printBody.innerHTML = orderItems.map((item, i) => {
    const qtyPieces = item.qty * (item.packSize || 1);
    const subtotal = item.price * qtyPieces;
    totalCartons += item.qty;
    totalPieces += qtyPieces;
    totalPrice += subtotal;
    totalCost += item.cost * qtyPieces;

    return `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${item.name}</td>
        <td style="text-align:right;">${formatCurrency(item.cost)}</td>
        <td style="text-align:right;">${formatCurrency(item.price)}</td>
        <td style="text-align:center;">${item.unit}</td>
        <td style="text-align:center;">${item.packSize || 1}</td>
        <td style="text-align:center;">${item.qty}</td>
        <td style="text-align:center;">${qtyPieces}</td>
        <td style="text-align:right;">${formatCurrency(subtotal)}</td>
      </tr>
    `;
  }).join('');

  dom.printTotalQty.textContent = totalCartons;
  document.getElementById('printTotalPieces').textContent = totalPieces;
  dom.printTotalValue.textContent = `฿ ${formatCurrency(totalPrice)}`;
  dom.printTotalCost.textContent = `฿ ${formatCurrency(totalCost)}`;

  // Close panel first then print
  closeOrderPanel();
  setTimeout(() => window.print(), 300);
}

// ============================================
// IMPORT / DATA UPDATE LOGIC
// ============================================

function setupImportListeners() {
  // Open import modal
  dom.importBtn.addEventListener('click', openImportModal);

  // Close import modal
  dom.closeImport.addEventListener('click', closeImportModal);
  dom.importOverlay.addEventListener('click', closeImportModal);

  // Upload area click -> trigger file input
  dom.uploadArea.addEventListener('click', () => dom.fileInput.click());

  // File input change
  dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag and drop
  dom.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.uploadArea.classList.add('drag-over');
  });

  dom.uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dom.uploadArea.classList.remove('drag-over');
  });

  dom.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Cancel import
  dom.cancelImport.addEventListener('click', resetImportState);

  // Confirm import
  dom.confirmImport.addEventListener('click', confirmImportData);

  // Reset to default data
  dom.resetDataBtn.addEventListener('click', resetToDefaultData);
}

function openImportModal() {
  updateDataInfo();
  resetImportState();
  dom.importModal.classList.add('visible');
  dom.importOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeImportModal() {
  dom.importModal.classList.remove('visible');
  dom.importOverlay.classList.remove('visible');
  document.body.style.overflow = '';
  resetImportState();
}

function resetImportState() {
  pendingImportData = null;
  dom.uploadArea.style.display = '';
  dom.uploadStatus.style.display = 'none';
  dom.importPreview.style.display = 'none';
  dom.fileInput.value = '';
}

// ---- File Handling ----
function handleFile(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    showProcessing();
    readCSVFile(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    showProcessing();
    readExcelFile(file);
  } else {
    alert('รองรับเฉพาะไฟล์ .csv และ .xlsx เท่านั้น');
  }
}

function showProcessing() {
  dom.uploadArea.style.display = 'none';
  dom.uploadStatus.style.display = 'block';
  dom.statusIcon.textContent = '⏳';
  dom.statusText.textContent = 'กำลังประมวลผล...';
}

// ---- CSV Parsing ----
function readCSVFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        showError('ไม่พบข้อมูลสินค้าในไฟล์ กรุณาตรวจสอบรูปแบบคอลัมน์');
        return;
      }

      pendingImportData = parsed;
      localStorage.setItem(STORAGE_SOURCE_KEY, file.name);
      showPreview(parsed, file.name);
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
    }
  };

  reader.onerror = () => showError('ไม่สามารถอ่านไฟล์ได้');
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Try to detect header
  const header = lines[0].toLowerCase();
  let nameIdx = 2, priceIdx = 3, costIdx = 4, unitIdx = 5, categoryIdx = 6, pluIdx = 1, packSizeIdx = -1;

  // Auto-detect column positions from header
  const headerParts = lines[0].split(',').map(h => h.trim().toLowerCase());
  headerParts.forEach((h, i) => {
    if (h === 'name' || h.includes('ชื่อ')) nameIdx = i;
    if (h === 'price' || h.includes('ราคา')) priceIdx = i;
    if (h === 'cost' || h.includes('ทุน') || h.includes('ต้นทุน')) costIdx = i;
    if (h === 'unit' || h.includes('หน่วย')) unitIdx = i;
    if (h === 'category' || h.includes('หมวด') || h.includes('ประเภท')) categoryIdx = i;
    if (h === 'plu code' || h === 'plu' || h.includes('barcode') || h.includes('บาร์โค้ด')) pluIdx = i;
    if (h.includes('pack') || h.includes('ลัง') || h.includes('กล่องใหญ่') || h.includes('บรรจุ')) packSizeIdx = i;
  });

  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,,')) continue;

    const parts = line.split(',');
    const maxIdx = Math.max(nameIdx, priceIdx, costIdx, unitIdx, categoryIdx, pluIdx, packSizeIdx);
    if (parts.length <= maxIdx) continue;

    const name = parts[nameIdx]?.trim();
    const category = parts[categoryIdx]?.trim();
    if (!name || !category) continue;

    const price = parseFloat(parts[priceIdx]) || 0;
    const cost = parseFloat(parts[costIdx]) || 0;
    const unit = parts[unitIdx]?.trim() || 'ชิ้น';
    const plu = parts[pluIdx]?.trim() || '';
    const no = parseInt(parts[0]) || i;
    const packSize = packSizeIdx !== -1 ? parseInt(parts[packSizeIdx]) || 1 : 1;

    products.push({
      id: no,
      plu,
      name,
      price,
      cost,
      unit,
      packSize,
      category
    });
  }

  return products;
}

// ---- Excel Parsing (basic .xlsx) ----
function readExcelFile(file) {
  // For .xlsx, we try to load SheetJS dynamically
  dom.statusText.textContent = 'กำลังโหลดตัวแปลง Excel...';

  const script = document.createElement('script');
  script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

  script.onload = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to CSV, then parse
        const csvText = XLSX.utils.sheet_to_csv(sheet);
        const parsed = parseCSV(csvText);

        if (parsed.length === 0) {
          showError('ไม่พบข้อมูลสินค้าในไฟล์ กรุณาตรวจสอบรูปแบบคอลัมน์');
          return;
        }

        pendingImportData = parsed;
        localStorage.setItem(STORAGE_SOURCE_KEY, file.name);
        showPreview(parsed, file.name);
      } catch (err) {
        showError('เกิดข้อผิดพลาดในการอ่าน Excel: ' + err.message);
      }
    };

    reader.onerror = () => showError('ไม่สามารถอ่านไฟล์ได้');
    reader.readAsArrayBuffer(file);
  };

  script.onerror = () => {
    showError('ไม่สามารถโหลดตัวแปลง Excel ได้ กรุณาบันทึกเป็น CSV แทน');
  };

  document.head.appendChild(script);
}

// ---- Preview ----
function showPreview(parsedProducts, fileName) {
  dom.uploadStatus.style.display = 'none';
  dom.importPreview.style.display = 'block';

  const cats = [...new Set(parsedProducts.map(p => p.category))];

  dom.previewStats.innerHTML = `
    <div class="preview-stat">สินค้า: <strong>${parsedProducts.length}</strong> รายการ</div>
    <div class="preview-stat">หมวดหมู่: <strong>${cats.length}</strong> หมวด</div>
    <div class="preview-stat">ไฟล์: <strong>${fileName}</strong></div>
  `;

  // Show first 10 items as preview
  const previewItems = parsedProducts.slice(0, 10);
  dom.previewBody.innerHTML = previewItems.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${formatCurrency(p.cost)}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.unit}</td>
      <td>${p.packSize || 1}</td>
      <td>${categoryDisplay[p.category] || p.category}</td>
    </tr>
  `).join('');

  if (parsedProducts.length > 10) {
    dom.previewBody.innerHTML += `
      <tr>
        <td colspan="6" style="text-align:center; color: var(--text-muted); font-style: italic;">
          ... และอีก ${parsedProducts.length - 10} รายการ
        </td>
      </tr>
    `;
  }
}

function showError(message) {
  dom.uploadStatus.style.display = 'block';
  dom.statusIcon.textContent = '❌';
  dom.statusText.textContent = message;

  // Allow retry after 2 seconds
  setTimeout(() => {
    resetImportState();
  }, 3000);
}

// ---- Confirm Import ----
function confirmImportData() {
  if (!pendingImportData || pendingImportData.length === 0) return;

  products = pendingImportData;
  rebuildCategoriesFromProducts();
  saveData();

  // Clear current order amounts (product IDs may have changed)
  amounts = {};

  rebuildUI();
  updateDataInfo();
  closeImportModal();

  // Show success feedback
  showSuccessToast(`นำเข้าสำเร็จ! ${products.length} รายการ`);
}

// ---- Reset to Default ----
function resetToDefaultData() {
  if (!confirm('ต้องการกลับไปใช้ข้อมูลเริ่มต้นหรือไม่?\n(ข้อมูลที่นำเข้าจะถูกลบ)')) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_DATE_KEY);
  localStorage.removeItem(STORAGE_SOURCE_KEY);

  products = [...PRODUCTS];
  categories = [...CATEGORIES];
  categoryDisplay = { ...CATEGORY_DISPLAY };
  categoryIcons = { ...CATEGORY_ICONS };
  amounts = {};

  rebuildUI();
  updateDataInfo();
  closeImportModal();

  showSuccessToast('กลับไปใช้ข้อมูลเริ่มต้นแล้ว');
}

// ---- Success Toast ----
function showSuccessToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #34d399, #059669);
    color: #fff; padding: 12px 28px; border-radius: 50px;
    font-family: var(--font-family); font-size: 0.9rem; font-weight: 600;
    box-shadow: 0 4px 20px rgba(52, 211, 153, 0.3);
    z-index: 9999; animation: fadeInUp 0.4s ease-out;
  `;
  toast.textContent = `✅ ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease-in';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---- Utilities ----
function formatCurrency(value) {
  return Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---- Start ----
document.addEventListener('DOMContentLoaded', init);
