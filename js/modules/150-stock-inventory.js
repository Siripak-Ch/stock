/**
 * 150-stock-inventory.js
 * CES Stock Inventory Module — Full rewrite for new data structure
 * Uses display_status (Thai) directly from DB_Devices_Clean sheet
 * NO SI_STATUS_MAP — display_status is single source of truth
 * 
 * Spreadsheet: 1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk
 * Sheet: DB_Devices_Clean
 */

/* ============================================================
   CONSTANTS & CONFIG
   ============================================================ */
const SI_CACHE_KEY = 'CES_STOCK_INVENTORY_CACHE';
const SI_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const SI_PAGE_SIZE = 50;

const SI_COLORS = {
  navy: '#003DA5',
  steel: '#5B7F95',
  cyan: '#19a7ce',
  red: '#E4002B',
  green: '#16a34a',
  iconBg: 'rgba(0,61,165,0.1)'
};

const SI_STATUSES = ['พร้อมส่ง', 'รอสอบเทียบ', 'เช่ายืม', 'ใช้งานไม่ได้', 'ไม่พบในรายการ'];

// Module state
let siDevices = [];
let siFiltered = [];
let siPage = 1;
let siCart = [];
let siActiveTab = 'equipment'; // 'equipment' | 'accessories'

/* ============================================================
   STYLES
   ============================================================ */
function siEnsureStyle() {
  if (document.getElementById('si-styles')) return;
  const style = document.createElement('style');
  style.id = 'si-styles';
  style.textContent = `
    .stockpro-inventory { padding: 16px; font-family: 'Sarabun', sans-serif; }
    .stockpro-inventory h2 { color: ${SI_COLORS.navy}; margin-bottom: 16px; font-size: 1.5rem; }

    /* KPI Cards */
    .si-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .si-kpi-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 12px; }
    .si-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; background: ${SI_COLORS.iconBg}; color: ${SI_COLORS.navy}; }
    .si-kpi-info { flex: 1; }
    .si-kpi-label { font-size: 0.8rem; color: #64748b; }
    .si-kpi-value { font-size: 1.5rem; font-weight: 700; }

    /* Tabs */
    .si-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
    .si-tab { padding: 10px 20px; cursor: pointer; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .si-tab.active { color: ${SI_COLORS.navy}; border-bottom-color: ${SI_COLORS.navy}; }
    .si-tab:hover { color: ${SI_COLORS.navy}; }

    /* Filters */
    .si-filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; align-items: center; }
    .si-filter-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; min-width: 160px; }
    .si-filter-input:focus { outline: none; border-color: ${SI_COLORS.navy}; box-shadow: 0 0 0 2px rgba(0,61,165,0.1); }
    .si-filter-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: #fff; cursor: pointer; }

    /* Table */
    .si-table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; margin-bottom: 16px; }
    .si-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .si-table th { background: #f8fafc; color: ${SI_COLORS.navy}; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
    .si-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    .si-table tr:hover td { background: #f8fafc; }

    /* Badges */
    .sp-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
    .sp-badge.พร้อมส่ง { background: #dcfce7; color: #16a34a; }
    .sp-badge.รอสอบเทียบ { background: #f1f5f9; color: #5B7F95; }
    .sp-badge.เช่ายืม { background: #e0f7fa; color: #0e7490; }
    .sp-badge.ใช้งานไม่ได้ { background: #e2e8f0; color: #475569; }
    .sp-badge.ไม่พบในรายการ { background: #fee2e2; color: #991b1b; }

    /* Action Buttons */
    .si-btn { padding: 4px 10px; border-radius: 6px; border: none; font-size: 0.75rem; cursor: pointer; font-weight: 500; }
    .si-btn-cart { background: ${SI_COLORS.navy}; color: #fff; }
    .si-btn-cart:hover { opacity: 0.9; }
    .si-btn-cart:disabled { background: #cbd5e1; cursor: not-allowed; }
    .si-btn-edit { background: #f1f5f9; color: ${SI_COLORS.navy}; border: 1px solid #e2e8f0; }
    .si-btn-edit:hover { background: #e2e8f0; }
    .si-btn-rent { background: ${SI_COLORS.cyan}; color: #fff; }
    .si-btn-rent:hover { opacity: 0.9; }

    /* Pagination */
    .si-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; }
    .si-page-btn { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.85rem; }
    .si-page-btn.active { background: ${SI_COLORS.navy}; color: #fff; border-color: ${SI_COLORS.navy}; }
    .si-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .si-page-info { font-size: 0.85rem; color: #64748b; }

    /* Cart */
    .si-cart-bar { position: sticky; bottom: 0; background: ${SI_COLORS.navy}; color: #fff; padding: 12px 20px; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -4px 12px rgba(0,0,0,0.1); }
    .si-cart-bar.hidden { display: none; }
    .si-cart-count { font-size: 0.9rem; }
    .si-cart-actions { display: flex; gap: 8px; }
    .si-cart-btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .si-cart-btn-checkout { background: ${SI_COLORS.green}; color: #fff; }
    .si-cart-btn-clear { background: rgba(255,255,255,0.2); color: #fff; }

    /* Accessories */
    .si-acc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .si-acc-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .si-acc-card h5 { color: ${SI_COLORS.navy}; margin: 0 0 8px 0; }

    /* Loading */
    .si-loading { text-align: center; padding: 40px; color: #64748b; }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   DATA LOADING
   ============================================================ */
function siLoadInventory() {
  siEnsureStyle();
  const el = document.getElementById('view-inventory') || document.getElementById('view-inventory') || document.getElementById('stockpro-inventory') || document.getElementById('main-content');
  if (!el) return;

  el.innerHTML = `<div class="stockpro-inventory"><div class="si-loading">⏳ กำลังโหลดข้อมูล...</div></div>`;

  // Try cache
  const cached = siGetCache();
  if (cached) {
    siDevices = cached;
    siFiltered = cached.slice();
    siPage = 1;
    siRenderFull(el);
    return;
  }

  google.script.run
    .withSuccessHandler(function(data) {
      siDevices = (data && data.devices) || (data && data.inventory) || (Array.isArray(data) ? data : []);
      siSetCache(siDevices);
      siFiltered = siDevices.slice();
      siPage = 1;
      siRenderFull(el);
    })
    .withFailureHandler(function(err) {
      el.innerHTML = `<div class="stockpro-inventory"><p style="color:${SI_COLORS.red}">❌ โหลดข้อมูลไม่สำเร็จ: ${spEsc(err.message || err)}</p></div>`;
    })
    .sd_getStockDashboardData(false);
}

function siGetCache() {
  try {
    const raw = localStorage.getItem(SI_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > SI_CACHE_TTL) { localStorage.removeItem(SI_CACHE_KEY); return null; }
    return obj.data;
  } catch (e) { return null; }
}

function siSetCache(data) {
  try { localStorage.setItem(SI_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

/* ============================================================
   FULL PAGE RENDER
   ============================================================ */
function siRenderFull(el) {
  const devices = siDevices;

  // KPI counts from display_status
  const kpi = {
    total: devices.length,
    stock: devices.filter(function(d) { return d.display_status === 'พร้อมส่ง'; }).length,
    recheck: devices.filter(function(d) { return d.display_status === 'รอสอบเทียบ'; }).length,
    inUse: devices.filter(function(d) { return d.display_status === 'เช่ายืม'; }).length
  };

  // Get unique filter values
  const brands = [...new Set(devices.map(function(d) { return d.brand; }).filter(Boolean))].sort();
  const models = [...new Set(devices.map(function(d) { return d.model; }).filter(Boolean))].sort();
  const locations = [...new Set(devices.map(function(d) { return d.location; }).filter(Boolean))].sort();

  let html = `<div class="stockpro-inventory">`;
  html += `<h2>📦 Stock Inventory</h2>`;

  // KPI Cards
  html += `<div class="si-kpi-grid">`;
  html += siKpiCard('📦', 'จำนวนทั้งหมด', kpi.total, SI_COLORS.navy);
  html += siKpiCard('✅', 'พร้อมส่ง', kpi.stock, SI_COLORS.green);
  html += siKpiCard('🔧', 'รอสอบเทียบ', kpi.recheck, SI_COLORS.steel);
  html += siKpiCard('🔄', 'เช่ายืม', kpi.inUse, SI_COLORS.cyan);
  html += `</div>`;

  // Tabs
  html += `<div class="si-tabs">
    <div class="si-tab ${siActiveTab === 'equipment' ? 'active' : ''}" onclick="siSwitchTab('equipment')">🔬 Equipment</div>
    <div class="si-tab ${siActiveTab === 'accessories' ? 'active' : ''}" onclick="siSwitchTab('accessories')">🧰 Accessories</div>
  </div>`;

  if (siActiveTab === 'equipment') {
    // Filters
    html += `<div class="si-filters">
      <input type="text" class="si-filter-input" id="si-search" placeholder="🔍 ค้นหา ID, SN, Brand, Model..." oninput="siApplyFilters()" style="min-width:220px;">
      <select class="si-filter-select" id="si-filter-brand" onchange="siApplyFilters()">
        <option value="">ทุก Brand</option>
        ${brands.map(function(b) { return '<option value="' + spEsc(b) + '">' + spEsc(b) + '</option>'; }).join('')}
      </select>
      <select class="si-filter-select" id="si-filter-model" onchange="siApplyFilters()">
        <option value="">ทุก Model</option>
        ${models.map(function(m) { return '<option value="' + spEsc(m) + '">' + spEsc(m) + '</option>'; }).join('')}
      </select>
      <select class="si-filter-select" id="si-filter-location" onchange="siApplyFilters()">
        <option value="">ทุก Location</option>
        ${locations.map(function(l) { return '<option value="' + spEsc(l) + '">' + spEsc(l) + '</option>'; }).join('')}
      </select>
      <select class="si-filter-select" id="si-filter-status" onchange="siApplyFilters()">
        <option value="">ทุกสถานะ</option>
        ${SI_STATUSES.map(function(s) { return '<option value="' + spEsc(s) + '">' + spEsc(s) + '</option>'; }).join('')}
      </select>
    </div>`;

    // Table placeholder
    html += `<div id="si-table-container"></div>`;

    // Cart Bar
    html += `<div class="si-cart-bar ${siCart.length === 0 ? 'hidden' : ''}" id="si-cart-bar">
      <span class="si-cart-count">🛒 ตะกร้า: <strong id="si-cart-count">${siCart.length}</strong> รายการ</span>
      <div class="si-cart-actions">
        <button class="si-cart-btn si-cart-btn-clear" onclick="siClearCart()">ล้างตะกร้า</button>
        <button class="si-cart-btn si-cart-btn-checkout" onclick="siCheckout()">Check-out →</button>
      </div>
    </div>`;
  } else {
    // Accessories tab
    html += `<div id="si-accessories-container"></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;

  // Render table or accessories
  if (siActiveTab === 'equipment') {
    siRenderTable();
  } else {
    siRenderAccessories();
  }
}

/* ============================================================
   KPI CARD
   ============================================================ */
function siKpiCard(icon, label, value, color) {
  return `<div class="si-kpi-card">
    <div class="si-kpi-icon">${icon}</div>
    <div class="si-kpi-info">
      <div class="si-kpi-label">${spEsc(label)}</div>
      <div class="si-kpi-value" style="color:${color}">${spNum(value)}</div>
    </div>
  </div>`;
}

/* ============================================================
   FILTERS
   ============================================================ */
function siApplyFilters() {
  const search = (document.getElementById('si-search').value || '').toLowerCase().trim();
  const brand = document.getElementById('si-filter-brand').value;
  const model = document.getElementById('si-filter-model').value;
  const location = document.getElementById('si-filter-location').value;
  const status = document.getElementById('si-filter-status').value;

  siFiltered = siDevices.filter(function(d) {
    if (search) {
      const hay = [d.id_code, d.serial_number, d.brand, d.model, d.item_name].join(' ').toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    if (brand && d.brand !== brand) return false;
    if (model && d.model !== model) return false;
    if (location && d.location !== location) return false;
    if (status && d.display_status !== status) return false;
    return true;
  });

  siPage = 1;
  siRenderTable();
}

/* ============================================================
   TABLE RENDER
   ============================================================ */
function siRenderTable() {
  const container = document.getElementById('si-table-container');
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(siFiltered.length / SI_PAGE_SIZE));
  if (siPage > totalPages) siPage = totalPages;
  const start = (siPage - 1) * SI_PAGE_SIZE;
  const pageData = siFiltered.slice(start, start + SI_PAGE_SIZE);

  let html = `<div class="si-table-wrap"><table class="si-table">
    <thead><tr>
      <th>#</th><th>ID Code</th><th>SN</th><th>Brand/Model</th><th>สถานะ</th>
      <th>Location</th><th>Borrower</th><th>Due Date</th><th>Action Required</th><th>Rent</th><th>Edit</th>
    </tr></thead><tbody>`;

  if (pageData.length === 0) {
    html += `<tr><td colspan="11" style="text-align:center;padding:30px;color:#94a3b8;">ไม่พบข้อมูล</td></tr>`;
  } else {
    pageData.forEach(function(d, i) {
      const idx = start + i + 1;
      const canAddCart = d.display_status === 'พร้อมส่ง' || d.display_status === 'รอสอบเทียบ';
      const inCart = siCart.some(function(c) { return c.id_code === d.id_code; });

      html += `<tr>
        <td>${idx}</td>
        <td><strong>${spEsc(d.id_code || '-')}</strong></td>
        <td>${spEsc(d.serial_number || '-')}</td>
        <td>${spEsc(d.brand || '')} ${spEsc(d.model || '')}</td>
        <td><span class="sp-badge ${spEsc(d.display_status || '')}">${spEsc(d.display_status || '-')}</span></td>
        <td>${spEsc(d.location || '-')}</td>
        <td>${spEsc(d.borrower || '-')}</td>
        <td>${spFmtDate(d.due_date)}</td>
        <td>${spEsc(d.action_required || '-')}</td>
        <td>${canAddCart ? '<button class="si-btn si-btn-cart" ' + (inCart ? 'disabled' : '') + ' onclick="siAddToCart(\'' + spEsc(d.id_code) + '\')">' + (inCart ? '✓' : '🛒') + '</button>' : '-'}</td>
        <td><button class="si-btn si-btn-edit" onclick="siEditDevice('${spEsc(d.id_code)}')">✏️</button></td>
      </tr>`;
    });
  }

  html += `</tbody></table></div>`;

  // Pagination
  html += `<div class="si-pagination">`;
  html += `<button class="si-page-btn" onclick="siGoPage(${siPage - 1})" ${siPage <= 1 ? 'disabled' : ''}>← ก่อนหน้า</button>`;
  html += `<span class="si-page-info">หน้า ${siPage} / ${totalPages} (${siFiltered.length} รายการ)</span>`;
  html += `<button class="si-page-btn" onclick="siGoPage(${siPage + 1})" ${siPage >= totalPages ? 'disabled' : ''}>ถัดไป →</button>`;
  html += `</div>`;

  container.innerHTML = html;
}

function siGoPage(p) {
  const totalPages = Math.max(1, Math.ceil(siFiltered.length / SI_PAGE_SIZE));
  if (p < 1 || p > totalPages) return;
  siPage = p;
  siRenderTable();
}

/* ============================================================
   CART
   ============================================================ */
function siAddToCart(idCode) {
  const device = siDevices.find(function(d) { return d.id_code === idCode; });
  if (!device) return;
  if (device.display_status !== 'พร้อมส่ง' && device.display_status !== 'รอสอบเทียบ') {
    Swal.fire('ไม่สามารถเพิ่มได้', 'สถานะเครื่องต้องเป็น "พร้อมส่ง" หรือ "รอสอบเทียบ" เท่านั้น', 'warning');
    return;
  }
  if (siCart.some(function(c) { return c.id_code === idCode; })) return;

  siCart.push(device);
  siUpdateCartBar();
  siRenderTable();
}

function siClearCart() {
  siCart = [];
  siUpdateCartBar();
  siRenderTable();
}

function siUpdateCartBar() {
  const bar = document.getElementById('si-cart-bar');
  const countEl = document.getElementById('si-cart-count');
  if (bar) {
    bar.classList.toggle('hidden', siCart.length === 0);
  }
  if (countEl) {
    countEl.textContent = siCart.length;
  }
}

function siCheckout() {
  if (siCart.length === 0) return;

  const items = siCart.map(function(d) { return d.id_code + ' (' + d.brand + ' ' + d.model + ')'; }).join('\n');

  Swal.fire({
    title: 'Check-out เช่ายืม',
    html: `<p>จำนวน ${siCart.length} รายการ:</p><pre style="text-align:left;font-size:0.8rem;max-height:200px;overflow:auto;">${spEsc(items)}</pre>
      <input id="swal-borrower" class="swal2-input" placeholder="ผู้ยืม/หน่วยงาน">
      <input id="swal-location" class="swal2-input" placeholder="Location">
      <input id="swal-due" class="swal2-input" type="date" placeholder="Due Date">`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน Check-out',
    confirmButtonColor: SI_COLORS.navy,
    preConfirm: function() {
      const borrower = document.getElementById('swal-borrower').value.trim();
      const location = document.getElementById('swal-location').value.trim();
      const dueDate = document.getElementById('swal-due').value;
      if (!borrower || !location || !dueDate) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบ');
        return false;
      }
      return { borrower: borrower, location: location, dueDate: dueDate };
    }
  }).then(function(result) {
    if (result.isConfirmed) {
      const idCodes = siCart.map(function(d) { return d.id_code; });
      google.script.run
        .withSuccessHandler(function() {
          Swal.fire('สำเร็จ!', 'Check-out ' + idCodes.length + ' รายการเรียบร้อย', 'success');
          siCart = [];
          localStorage.removeItem(SI_CACHE_KEY);
          siLoadInventory();
        })
        .withFailureHandler(function(err) {
          Swal.fire('Error', err.message || err, 'error');
        })
        .sd_batchCheckout(idCodes, result.value.borrower, result.value.location, result.value.dueDate);
    }
  });
}

/* ============================================================
   EDIT DEVICE
   ============================================================ */
function siEditDevice(idCode) {
  const device = siDevices.find(function(d) { return d.id_code === idCode; });
  if (!device) return;

  const statusOptions = SI_STATUSES.map(function(s) {
    return '<option value="' + spEsc(s) + '"' + (device.display_status === s ? ' selected' : '') + '>' + spEsc(s) + '</option>';
  }).join('');

  Swal.fire({
    title: 'แก้ไขสถานะ',
    html: `<div style="text-align:left;font-size:0.9rem;">
      <p><strong>ID:</strong> ${spEsc(device.id_code)}</p>
      <p><strong>SN:</strong> ${spEsc(device.serial_number || '-')}</p>
      <p><strong>Brand/Model:</strong> ${spEsc(device.brand || '')} ${spEsc(device.model || '')}</p>
      <hr>
      <label style="font-weight:600;">สถานะ:</label>
      <select id="swal-status" class="swal2-select" style="width:100%;margin-top:8px;">${statusOptions}</select>
      <label style="font-weight:600;margin-top:12px;display:block;">หมายเหตุ:</label>
      <input id="swal-note" class="swal2-input" value="${spEsc(device.recheck_note || '')}" placeholder="หมายเหตุ (ถ้ามี)">
    </div>`,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    confirmButtonColor: SI_COLORS.navy,
    preConfirm: function() {
      return {
        status: document.getElementById('swal-status').value,
        note: document.getElementById('swal-note').value.trim()
      };
    }
  }).then(function(result) {
    if (result.isConfirmed) {
      google.script.run
        .withSuccessHandler(function() {
          Swal.fire('สำเร็จ!', 'อัพเดทสถานะเรียบร้อย', 'success');
          localStorage.removeItem(SI_CACHE_KEY);
          siLoadInventory();
        })
        .withFailureHandler(function(err) {
          Swal.fire('Error', err.message || err, 'error');
        })
        .sd_updateDeviceStatus(idCode, result.value.status, result.value.note);
    }
  });
}

/* ============================================================
   TABS
   ============================================================ */
function siSwitchTab(tab) {
  siActiveTab = tab;
  const el = document.getElementById('view-inventory') || document.getElementById('view-inventory') || document.getElementById('stockpro-inventory') || document.getElementById('main-content');
  if (el) siRenderFull(el);
}

/* ============================================================
   ACCESSORIES TAB
   ============================================================ */
function siRenderAccessories() {
  const container = document.getElementById('si-accessories-container');
  if (!container) return;

  // Accessories are grouped by category
  const accessories = siDevices.filter(function(d) {
    return d.category && d.category.toLowerCase().indexOf('accessor') !== -1;
  });

  if (accessories.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
      <p>ไม่พบข้อมูล Accessories</p>
      <p style="font-size:0.85rem;">Accessories จะแสดงเมื่อมี category = "Accessories" ในข้อมูล</p>
    </div>`;
    return;
  }

  // Group by item_name or model
  const groups = {};
  accessories.forEach(function(d) {
    const key = d.item_name || d.model || 'อื่นๆ';
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });

  let html = `<div class="si-acc-grid">`;
  Object.keys(groups).forEach(function(key) {
    const items = groups[key];
    const available = items.filter(function(d) { return d.display_status === 'พร้อมส่ง'; }).length;
    html += `<div class="si-acc-card">
      <h5>${spEsc(key)}</h5>
      <p style="font-size:0.85rem;color:#64748b;">จำนวน: ${items.length} | พร้อมใช้: ${available}</p>
      <div style="margin-top:8px;">
        ${items.slice(0, 5).map(function(d) {
          return '<span class="sp-badge ' + spEsc(d.display_status || '') + '" style="margin:2px;">' + spEsc(d.id_code || '') + '</span>';
        }).join('')}
        ${items.length > 5 ? '<span style="font-size:0.75rem;color:#94a3b8;"> +' + (items.length - 5) + ' more</span>' : ''}
      </div>
    </div>`;
  });
  html += `</div>`;

  container.innerHTML = html;
}

/* ============================================================
   INIT
   ============================================================ */
function siInit() {
  siLoadInventory();
}

/* ============================================================
   APP CONTROLLER COMPATIBILITY
   ============================================================ */
function initStockInventoryModule(force) {
  if (force) localStorage.removeItem(SI_CACHE_KEY);
  siLoadInventory();
}
