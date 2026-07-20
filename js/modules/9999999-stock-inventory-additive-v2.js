/**
 * CES Hub — Stock Inventory Additive UI V2 (2026-07-20)
 *
 * IMPORTANT:
 * - Does NOT replace the CES Hub shell/sidebar.
 * - Does NOT replace legacy Stock Dashboard, Inventory, Check Stock views.
 * - Preserves Cart, Accessories, OCR, Contract Summary, alerts and every legacy function.
 * - Adds the requested Infusion Pump dashboard and strict workflow controls above legacy content.
 */
(function () {
  'use strict';

  if (window.__CES_STOCK_ADDITIVE_V2__) return;
  window.__CES_STOCK_ADDITIVE_V2__ = true;

  var VERSION = '2026-07-20-preserve-all-v2';
  var STATUSES = ['พร้อมส่ง', 'รอสอบเทียบ', 'เช่ายืม', 'ใช้งานไม่ได้', 'ไม่พบในรายการ'];
  var MODELS = [
    { brand: 'B.Braun', model: 'Infusomat Space' },
    { brand: 'B.Braun', model: 'Spaceplus' },
    { brand: 'BYOND', model: 'Sunfusion 2' }
  ];
  var META = {
    'พร้อมส่ง': { color: '#10b981', bg: '#ecfdf5', icon: 'fa-circle-check' },
    'รอสอบเทียบ': { color: '#f59e0b', bg: '#fffbeb', icon: 'fa-screwdriver-wrench' },
    'เช่ายืม': { color: '#3b82f6', bg: '#eff6ff', icon: 'fa-arrow-right-arrow-left' },
    'ใช้งานไม่ได้': { color: '#ef4444', bg: '#fff1f2', icon: 'fa-triangle-exclamation' },
    'ไม่พบในรายการ': { color: '#64748b', bg: '#f1f5f9', icon: 'fa-circle-question' }
  };
  var STATE = { payload: null, devices: [], loading: null, lookupId: '' };

  function el(id) { return document.getElementById(id); }
  function txt(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) {
    return txt(v).replace(/[&<>"']/g, function (s) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
  }
  function unique(values) {
    var seen = {};
    (values || []).forEach(function (v) { v = txt(v); if (v) seen[v] = true; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'th'); });
  }
  function displayModel(v) { return /sunfusion/i.test(txt(v)) ? 'Sunfusion 2' : txt(v); }
  function status(v) { v = txt(v); return STATUSES.indexOf(v) >= 0 ? v : 'รอสอบเทียบ'; }
  function normalize(d) {
    d = d || {};
    return {
      id_code: txt(d.id_code || d.idCode),
      serial_number: txt(d.serial_number || d.serialNumber || d.sn),
      brand: txt(d.brand),
      model: displayModel(d.model),
      raw_model: txt(d.raw_model || d.model),
      item_name: txt(d.item_name || d.itemName),
      category: txt(d.category),
      location: txt(d.location),
      base_status: status(d.base_status || d.baseStatus || d.display_status || d.displayStatus || d.status),
      rental_status: txt(d.rental_status || d.rentalStatus),
      action_required: txt(d.action_required || d.actionRequired),
      borrower: txt(d.borrower || d.customer),
      due_date: txt(d.due_date || d.dueDate || d.expected_return_date || d.expectedReturnDate)
    };
  }
  function extractDevices(payload) {
    payload = payload || {};
    var rows = payload.devices || payload.inventory || payload.rows || payload.data || [];
    if (!Array.isArray(rows) && rows && Array.isArray(rows.devices)) rows = rows.devices;
    return Array.isArray(rows) ? rows.map(normalize).filter(function (d) { return d.id_code || d.serial_number; }) : [];
  }
  function api(fn, args) {
    args = Array.isArray(args) ? args : [];
    if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
      return window.CES_API.callFunction(fn, args, {});
    }
    return new Promise(function (resolve, reject) {
      try {
        if (!window.google || !google.script || !google.script.run) throw new Error('Google Apps Script API is unavailable');
        var runner = google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(function (err) { reject(err instanceof Error ? err : new Error((err && err.message) || String(err))); });
        runner[fn].apply(runner, args);
      } catch (err) { reject(err); }
    });
  }
  function toast(icon, message) {
    if (window.Swal) {
      Swal.fire({ toast: true, position: 'top-end', icon: icon || 'success', title: message, timer: 2200, showConfirmButton: false });
    } else {
      alert(message);
    }
  }
  function errorBox(err) {
    var message = err && err.message ? err.message : String(err || 'Unknown error');
    if (window.Swal) Swal.fire('ไม่สำเร็จ', message, 'error');
    else alert(message);
  }
  function confirmBox(title, text) {
    if (window.Swal) return Swal.fire({ title: title, text: text || '', icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน' });
    return Promise.resolve({ isConfirmed: window.confirm(title + (text ? '\n' + text : '')) });
  }

  function ensureStyle() {
    if (el('ces-stock-additive-v2-style')) return;
    var style = document.createElement('style');
    style.id = 'ces-stock-additive-v2-style';
    style.textContent = [
      '.csi2-root{margin:0 0 18px;color:#172033;font-family:Inter,"Noto Sans Thai","Segoe UI",Tahoma,sans-serif}',
      '.csi2-panel{background:#fff;border:1px solid #dce7f3;border-radius:18px;box-shadow:0 12px 30px rgba(16,42,86,.07);padding:16px;margin-bottom:12px}',
      '.csi2-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}',
      '.csi2-head h2{margin:0;font-size:17px;font-weight:950;color:#172033}.csi2-head p{margin:3px 0 0;font-size:10px;color:#64748b}',
      '.csi2-head-actions{display:flex;gap:7px;flex-wrap:wrap}',
      '.csi2-btn{border:1px solid #dce7f3;background:#fff;color:#172033;border-radius:10px;padding:8px 11px;font-size:10px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
      '.csi2-btn.primary{color:#fff;border-color:transparent;background:linear-gradient(135deg,#003da5,#0a5bd3)}',
      '.csi2-btn.cyan{color:#fff;border-color:transparent;background:linear-gradient(135deg,#00a9e0,#00a88e)}',
      '.csi2-btn.success{color:#047857;background:#ecfdf5;border-color:#a7f3d0}.csi2-btn.danger{color:#be123c;background:#fff1f2;border-color:#fecdd3}',
      '.csi2-filter{display:grid;grid-template-columns:minmax(210px,1.45fr) repeat(4,minmax(120px,.75fr));gap:8px;margin-bottom:11px}',
      '.csi2-filter input,.csi2-filter select,.csi2-lookup input{width:100%;border:1px solid #dce7f3;border-radius:10px;padding:9px 10px;background:#fff;font-size:10px;outline:none}',
      '.csi2-filter input:focus,.csi2-filter select:focus,.csi2-lookup input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}',
      '.csi2-kpis{display:grid;grid-template-columns:repeat(6,minmax(105px,1fr));gap:8px;margin-bottom:11px}',
      '.csi2-kpi{position:relative;overflow:hidden;background:#fff;border:1px solid #dce7f3;border-radius:14px;padding:12px;min-height:82px}',
      '.csi2-kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tone)}',
      '.csi2-kpi small{display:block;color:#64748b;font-size:9px;font-weight:900}.csi2-kpi strong{display:block;font-size:23px;line-height:1.1;margin-top:7px;font-weight:950}.csi2-kpi span{font-size:8px;color:#94a3b8}',
      '.csi2-models{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:11px}',
      '.csi2-model{border:1px solid #dce7f3;border-top:4px solid var(--brand);border-radius:14px;background:#fff;padding:12px}',
      '.csi2-model-top{display:flex;justify-content:space-between;gap:8px}.csi2-brand{border-radius:999px;padding:4px 7px;background:var(--brand);color:#fff;font-size:8px;font-weight:950}.csi2-model h3{font-size:12px;margin:7px 0 0}.csi2-model-total{font-size:23px;font-weight:950}.csi2-mini{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.csi2-mini span{font-size:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:4px 6px}',
      '.csi2-grid3{display:grid;grid-template-columns:.85fr 1.2fr .85fr;gap:8px}.csi2-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.csi2-card{border:1px solid #dce7f3;border-radius:14px;padding:12px;min-width:0;background:#fff}.csi2-card h3{margin:0 0 10px;font-size:11px;font-weight:950}',
      '.csi2-donut-wrap{display:grid;place-items:center;height:175px}.csi2-donut{width:145px;height:145px;border-radius:50%;position:relative}.csi2-donut:after{content:"";position:absolute;inset:29px;border-radius:50%;background:#fff}.csi2-donut-label{position:absolute;z-index:2;text-align:center}.csi2-donut-label strong{display:block;font-size:23px}.csi2-donut-label span{font-size:8px;color:#64748b}',
      '.csi2-legend{display:grid;gap:5px}.csi2-legend-row{display:grid;grid-template-columns:9px 1fr auto;gap:6px;align-items:center;font-size:8px}.csi2-dot{width:8px;height:8px;border-radius:50%}',
      '.csi2-bars{display:grid;gap:10px;align-content:center;min-height:205px}.csi2-bar-row{display:grid;grid-template-columns:105px 1fr 36px;gap:7px;align-items:center;font-size:8px}.csi2-bar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.csi2-track{height:16px;border-radius:999px;background:#eef2f7;display:flex;overflow:hidden}.csi2-seg{height:100%}',
      '.csi2-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:11px}.csi2-table{width:100%;border-collapse:collapse;min-width:720px}.csi2-table th{background:#f8fbff;color:#52647a;font-size:8px;text-align:left;padding:8px;border-bottom:1px solid #dce7f3}.csi2-table td{font-size:9px;padding:8px;border-bottom:1px solid #edf2f7}',
      '.csi2-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 7px;background:var(--bg);color:var(--color);font-size:8px;font-weight:950;white-space:nowrap}',
      '.csi2-workflow{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:9px;font-size:9px;color:#475569}.csi2-workflow b{color:#003da5}',
      '.csi2-lookup{display:flex;gap:7px}.csi2-lookup input{font-size:13px;padding:11px}.csi2-device{border:1px solid #dce7f3;background:#fafdff;border-radius:13px;padding:12px;margin-top:10px}.csi2-device-head{display:flex;justify-content:space-between;gap:10px}.csi2-device h3{font-size:15px;margin:0}.csi2-device-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:9px}.csi2-pair{border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:8px}.csi2-pair small{display:block;font-size:8px;color:#94a3b8;margin-bottom:3px}.csi2-pair strong{font-size:9px}.csi2-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}',
      '.csi2-empty{text-align:center;padding:18px;color:#94a3b8;font-size:10px}.csi2-note{font-size:9px;color:#64748b;margin-top:7px}',
      '@media(max-width:1200px){.csi2-kpis{grid-template-columns:repeat(3,1fr)}.csi2-grid3{grid-template-columns:1fr}.csi2-filter{grid-template-columns:repeat(3,1fr)}.csi2-filter input{grid-column:span 3}}',
      '@media(max-width:760px){.csi2-head{align-items:flex-start;flex-direction:column}.csi2-filter{grid-template-columns:1fr}.csi2-filter input{grid-column:auto}.csi2-kpis{grid-template-columns:repeat(2,1fr)}.csi2-models,.csi2-grid2{grid-template-columns:1fr}.csi2-device-grid{grid-template-columns:1fr}.csi2-lookup{flex-direction:column}}'
    ].join('');
    document.head.appendChild(style);
  }

  function badge(s) {
    s = status(s);
    var m = META[s];
    return '<span class="csi2-badge" style="--color:' + m.color + ';--bg:' + m.bg + '"><i class="fas ' + m.icon + '"></i>' + esc(s) + '</span>';
  }
  function optionHtml(values, label, selected) {
    return '<option value="all">' + esc(label) + '</option>' + values.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }
  function counts(rows) {
    var out = { total: rows.length };
    STATUSES.forEach(function (s) { out[s] = 0; });
    rows.forEach(function (d) { out[d.base_status] = (out[d.base_status] || 0) + 1; });
    return out;
  }
  function percent(n, total) { return total ? (n * 100 / total).toFixed(1) : '0.0'; }

  function loadData(force) {
    if (force) { STATE.payload = null; STATE.devices = []; STATE.loading = null; }
    if (STATE.payload && !force) return Promise.resolve(STATE.payload);
    if (STATE.loading && !force) return STATE.loading;
    STATE.loading = api('cesStockV2_getDashboardData', [!!force]).then(function (payload) {
      STATE.payload = payload || {};
      STATE.devices = extractDevices(payload);
      STATE.loading = null;
      return STATE.payload;
    }).catch(function (err) { STATE.loading = null; throw err; });
    return STATE.loading;
  }

  function renameStockNavigation() {
    var names = {
      'btn-stock_dashboard': 'Infusion Pump Dashboard',
      'btn-inventory': 'Equipment Dashboard',
      'btn-check_stock': 'Check Stock'
    };
    Object.keys(names).forEach(function (id) {
      var button = el(id);
      if (!button) return;
      var span = button.querySelector('span');
      if (span) span.textContent = names[id];
    });
  }

  function dashboardMarkup() {
    return '<div id="csi2-dashboard-root" class="csi2-root">' +
      '<div class="csi2-panel">' +
        '<div class="csi2-head"><div><h2>Infusion Pump Inventory Snapshot</h2><p>เพิ่มจากระบบเดิมโดยไม่ลบ Contract Summary, Alerts และ Rental analytics</p></div>' +
        '<div class="csi2-head-actions"><button class="csi2-btn" onclick="CES_STOCK_V2.exportCsv()"><i class="fas fa-file-csv"></i> Export CSV</button><button class="csi2-btn primary" onclick="CES_STOCK_V2.refresh(true)"><i class="fas fa-rotate"></i> Refresh</button></div></div>' +
        '<div class="csi2-filter"><input id="csi2-q" placeholder="Search ID / Serial Number" oninput="CES_STOCK_V2.renderDashboard()"><select id="csi2-brand" onchange="CES_STOCK_V2.syncModels();CES_STOCK_V2.renderDashboard()"></select><select id="csi2-model" onchange="CES_STOCK_V2.renderDashboard()"></select><select id="csi2-status" onchange="CES_STOCK_V2.renderDashboard()"></select><select id="csi2-location" onchange="CES_STOCK_V2.renderDashboard()"></select></div>' +
        '<div id="csi2-kpis" class="csi2-kpis"></div><div id="csi2-models" class="csi2-models"></div>' +
        '<div class="csi2-grid3"><div class="csi2-card"><h3>Status Share</h3><div id="csi2-donut" class="csi2-donut-wrap"></div><div id="csi2-legend" class="csi2-legend"></div></div><div class="csi2-card"><h3>Model × Status</h3><div id="csi2-model-bars" class="csi2-bars"></div></div><div class="csi2-card"><h3>Brand Share</h3><div id="csi2-brand-bars" class="csi2-bars"></div></div></div>' +
        '<div class="csi2-card" style="margin-top:8px"><h3>Top Location</h3><div id="csi2-locations" class="csi2-table-wrap"></div></div>' +
      '</div></div>';
  }

  function inventoryMarkup() {
    return '<div id="csi2-inventory-root" class="csi2-root"><div class="csi2-panel"><div class="csi2-head"><div><h2>Equipment Dashboard Summary</h2><p>ตาราง, Cart, Accessories, Approval และฟังก์ชันเดิมยังคงอยู่ด้านล่างครบถ้วน</p></div><button class="csi2-btn primary" onclick="CES_STOCK_V2.refresh(true)"><i class="fas fa-rotate"></i> Refresh Summary</button></div><div id="csi2-inv-kpis" class="csi2-kpis"></div><div class="csi2-workflow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><b>CF CAL/PM</b><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span><i class="fas fa-arrow-right"></i><b>Check-Out</b><i class="fas fa-arrow-right"></i><span>เช่ายืม</span><i class="fas fa-arrow-right"></i><b>Return</b></div><div class="csi2-note">Status ที่อนุญาต: พร้อมส่ง, รอสอบเทียบ, เช่ายืม, ใช้งานไม่ได้, ไม่พบในรายการ</div></div></div>';
  }

  function checkMarkup() {
    return '<div id="csi2-check-root" class="csi2-root"><div class="csi2-panel"><div class="csi2-head"><div><h2>Quick Check Stock — Exact ID/SN Workflow</h2><p>ส่วน OCR, Check-In/Check-Out mode, Accessories issue และ Scan Log เดิมยังอยู่ด้านล่าง</p></div><button class="csi2-btn" onclick="CES_STOCK_V2.refresh(true)"><i class="fas fa-rotate"></i> Refresh</button></div><div class="csi2-workflow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><b>CF CAL/PM</b><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span><i class="fas fa-arrow-right"></i><b>Check-Out</b><i class="fas fa-arrow-right"></i><span>เช่ายืม</span><i class="fas fa-arrow-right"></i><b>Return</b></div><div class="csi2-lookup" style="margin-top:10px"><input id="csi2-lookup" placeholder="Enter ID Code or Serial Number" onkeydown="if(event.key===\'Enter\')CES_STOCK_V2.lookup()"><button class="csi2-btn primary" onclick="CES_STOCK_V2.lookup()"><i class="fas fa-search"></i> Search</button></div><div id="csi2-lookup-result" class="csi2-empty">กรอก ID Code หรือ Serial Number เพื่อค้นหา</div></div></div>';
  }

  function insertAfterHeader(viewId, html) {
    var view = el(viewId);
    if (!view) return false;
    var shell = view.querySelector('.stockpro-shell') || view;
    var header = shell.querySelector('.stockpro-header-card');
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var node = wrap.firstElementChild;
    if (header && header.parentNode) header.parentNode.insertBefore(node, header.nextSibling);
    else shell.insertBefore(node, shell.firstChild);
    return true;
  }

  function ensureDashboard() {
    ensureStyle();
    if (!el('csi2-dashboard-root')) insertAfterHeader('view-stock_dashboard', dashboardMarkup());
    fillFilters();
  }
  function ensureInventory() {
    ensureStyle();
    if (!el('csi2-inventory-root')) insertAfterHeader('view-inventory', inventoryMarkup());
  }
  function ensureCheck() {
    ensureStyle();
    if (!el('csi2-check-root')) insertAfterHeader('view-check_stock', checkMarkup());
  }

  function fillFilters() {
    if (!el('csi2-brand')) return;
    var brandEl = el('csi2-brand'), modelEl = el('csi2-model'), statusEl = el('csi2-status'), locEl = el('csi2-location');
    var oldBrand = brandEl.value || 'all', oldModel = modelEl.value || 'all', oldStatus = statusEl.value || 'all', oldLoc = locEl.value || 'all';
    brandEl.innerHTML = optionHtml(unique(STATE.devices.map(function (d) { return d.brand; })), 'All Brand', oldBrand);
    statusEl.innerHTML = optionHtml(STATUSES, 'All Status', oldStatus);
    locEl.innerHTML = optionHtml(unique(STATE.devices.map(function (d) { return d.location; })), 'All Location', oldLoc);
    syncModels(oldModel);
  }
  function syncModels(preferred) {
    var brandEl = el('csi2-brand'), modelEl = el('csi2-model');
    if (!brandEl || !modelEl) return;
    var brand = brandEl.value || 'all', old = preferred || modelEl.value || 'all';
    var values = unique(STATE.devices.filter(function (d) { return brand === 'all' || d.brand === brand; }).map(function (d) { return d.model; }));
    modelEl.innerHTML = optionHtml(values, 'All Model', values.indexOf(old) >= 0 ? old : 'all');
  }
  function filteredRows() {
    var q = txt(el('csi2-q') && el('csi2-q').value).toLowerCase();
    var brand = el('csi2-brand') ? el('csi2-brand').value : 'all';
    var model = el('csi2-model') ? el('csi2-model').value : 'all';
    var st = el('csi2-status') ? el('csi2-status').value : 'all';
    var loc = el('csi2-location') ? el('csi2-location').value : 'all';
    return STATE.devices.filter(function (d) {
      var hay = [d.id_code, d.serial_number, d.brand, d.model, d.location].join(' ').toLowerCase();
      return (!q || hay.indexOf(q) >= 0) && (brand === 'all' || d.brand === brand) && (model === 'all' || d.model === model) && (st === 'all' || d.base_status === st) && (loc === 'all' || d.location === loc);
    });
  }
  function kpiHtml(rows) {
    var c = counts(rows), cards = [
      ['Total Equipment', c.total, '#003da5'],
      ['พร้อมส่ง', c['พร้อมส่ง'], META['พร้อมส่ง'].color],
      ['รอสอบเทียบ', c['รอสอบเทียบ'], META['รอสอบเทียบ'].color],
      ['เช่ายืม', c['เช่ายืม'], META['เช่ายืม'].color],
      ['ใช้งานไม่ได้', c['ใช้งานไม่ได้'], META['ใช้งานไม่ได้'].color],
      ['ไม่พบในรายการ', c['ไม่พบในรายการ'], META['ไม่พบในรายการ'].color]
    ];
    return cards.map(function (x) {
      return '<div class="csi2-kpi" style="--tone:' + x[2] + '"><small>' + esc(x[0]) + '</small><strong>' + Number(x[1] || 0).toLocaleString('th-TH') + '</strong><span>' + (x[0] === 'Total Equipment' ? 'Filtered result' : percent(x[1], c.total) + '%') + '</span></div>';
    }).join('');
  }

  function renderDashboard() {
    if (!el('csi2-kpis')) return;
    var rows = filteredRows(), c = counts(rows);
    el('csi2-kpis').innerHTML = kpiHtml(rows);
    el('csi2-models').innerHTML = MODELS.map(function (m) {
      var r = rows.filter(function (d) { return d.brand === m.brand && d.model === m.model; });
      var cc = counts(r), color = m.brand === 'B.Braun' ? '#003da5' : '#00a88e';
      var minis = STATUSES.filter(function (s) { return cc[s] > 0; }).map(function (s) { return '<span>' + esc(s) + ' <b>' + cc[s] + '</b></span>'; }).join('');
      return '<div class="csi2-model" style="--brand:' + color + '"><div class="csi2-model-top"><div><span class="csi2-brand">' + esc(m.brand) + '</span><h3>' + esc(m.model) + '</h3></div><span class="csi2-model-total">' + r.length + '</span></div><div class="csi2-mini">' + (minis || '<span>No data</span>') + '</div></div>';
    }).join('');

    var parts = [], cursor = 0;
    STATUSES.forEach(function (s) {
      var end = cursor + (c.total ? c[s] * 100 / c.total : 0);
      if (c[s]) parts.push(META[s].color + ' ' + cursor + '% ' + end + '%');
      cursor = end;
    });
    el('csi2-donut').innerHTML = '<div class="csi2-donut" style="background:conic-gradient(' + (parts.join(',') || '#e2e8f0 0 100%') + ')"><div class="csi2-donut-label"><strong>' + c.total + '</strong><span>equipment</span></div></div>';
    el('csi2-legend').innerHTML = STATUSES.map(function (s) { return '<div class="csi2-legend-row"><span class="csi2-dot" style="background:' + META[s].color + '"></span><span>' + esc(s) + '</span><b>' + c[s] + ' (' + percent(c[s], c.total) + '%)</b></div>'; }).join('');

    var modelMap = {};
    rows.forEach(function (d) { modelMap[d.model] = modelMap[d.model] || []; modelMap[d.model].push(d); });
    var maxModel = Math.max.apply(Math, [1].concat(Object.keys(modelMap).map(function (m) { return modelMap[m].length; })));
    el('csi2-model-bars').innerHTML = Object.keys(modelMap).sort().map(function (m) {
      var r = modelMap[m], mc = counts(r);
      return '<div class="csi2-bar-row"><span class="csi2-bar-label" title="' + esc(m) + '">' + esc(m) + '</span><div class="csi2-track" style="width:' + Math.max(12, r.length * 100 / maxModel) + '%">' + STATUSES.map(function (s) { return mc[s] ? '<span class="csi2-seg" title="' + esc(s) + ': ' + mc[s] + '" style="width:' + (mc[s] * 100 / r.length) + '%;background:' + META[s].color + '"></span>' : ''; }).join('') + '</div><b>' + r.length + '</b></div>';
    }).join('') || '<div class="csi2-empty">No data</div>';

    var brands = {};
    rows.forEach(function (d) { brands[d.brand] = (brands[d.brand] || 0) + 1; });
    var maxBrand = Math.max.apply(Math, [1].concat(Object.keys(brands).map(function (b) { return brands[b]; })));
    el('csi2-brand-bars').innerHTML = Object.keys(brands).sort().map(function (b) {
      var color = b === 'B.Braun' ? '#003da5' : '#00a88e';
      return '<div class="csi2-bar-row"><span class="csi2-bar-label"><b style="color:' + color + '">' + esc(b) + '</b></span><div class="csi2-track"><span class="csi2-seg" style="width:' + (brands[b] * 100 / maxBrand) + '%;background:' + color + '"></span></div><b>' + brands[b] + '</b></div>';
    }).join('') || '<div class="csi2-empty">No data</div>';

    var locations = {};
    rows.forEach(function (d) { var key = d.location || 'ไม่ระบุ'; locations[key] = locations[key] || []; locations[key].push(d); });
    var locRows = Object.keys(locations).map(function (key) { return { location: key, rows: locations[key] }; }).sort(function (a, b) { return b.rows.length - a.rows.length; }).slice(0, 10);
    el('csi2-locations').innerHTML = '<table class="csi2-table"><thead><tr><th>Location</th><th>Total</th>' + STATUSES.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '</tr></thead><tbody>' + locRows.map(function (x) { var lc = counts(x.rows); return '<tr><td><b>' + esc(x.location) + '</b></td><td>' + x.rows.length + '</td>' + STATUSES.map(function (s) { return '<td>' + lc[s] + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }

  function renderInventorySummary() {
    if (el('csi2-inv-kpis')) el('csi2-inv-kpis').innerHTML = kpiHtml(STATE.devices);
  }

  function renderLookup(devices) {
    var root = el('csi2-lookup-result');
    if (!root) return;
    if (!devices.length) { root.innerHTML = '<div class="csi2-empty">ไม่พบอุปกรณ์ในฐานข้อมูล</div>'; return; }
    root.innerHTML = devices.map(function (d) {
      var actions = [];
      if (d.base_status === 'รอสอบเทียบ') actions.push('<button class="csi2-btn success" onclick="CES_STOCK_V2.calibrate(\'' + esc(d.id_code) + '\')"><i class="fas fa-check-double"></i> CF CAL/PM</button>');
      if (d.base_status === 'พร้อมส่ง') actions.push('<button class="csi2-btn cyan" onclick="CES_STOCK_V2.checkout(\'' + esc(d.id_code) + '\')"><i class="fas fa-arrow-up-right-from-square"></i> Check-Out</button>');
      if (d.base_status === 'เช่ายืม') actions.push('<button class="csi2-btn primary" onclick="CES_STOCK_V2.returnDevice(\'' + esc(d.id_code) + '\')"><i class="fas fa-rotate-left"></i> Return</button>');
      if (d.base_status !== 'ใช้งานไม่ได้') actions.push('<button class="csi2-btn danger" onclick="CES_STOCK_V2.setStatus(\'' + esc(d.id_code) + '\',\'ใช้งานไม่ได้\')">ใช้งานไม่ได้</button>');
      if (d.base_status !== 'ไม่พบในรายการ') actions.push('<button class="csi2-btn" onclick="CES_STOCK_V2.setStatus(\'' + esc(d.id_code) + '\',\'ไม่พบในรายการ\')">ไม่พบในรายการ</button>');
      if (d.base_status === 'ใช้งานไม่ได้' || d.base_status === 'ไม่พบในรายการ') actions.push('<button class="csi2-btn success" onclick="CES_STOCK_V2.setStatus(\'' + esc(d.id_code) + '\',\'รอสอบเทียบ\')">Recover</button>');
      return '<div class="csi2-device"><div class="csi2-device-head"><div><h3>' + esc(d.id_code) + '</h3><span style="font-size:9px;color:' + (d.brand === 'B.Braun' ? '#003da5' : '#008b87') + ';font-weight:900">' + esc(d.brand) + ' · ' + esc(d.model) + '</span></div>' + badge(d.base_status) + '</div><div class="csi2-device-grid"><div class="csi2-pair"><small>Serial Number</small><strong>' + esc(d.serial_number || '-') + '</strong></div><div class="csi2-pair"><small>Location</small><strong>' + esc(d.location || '-') + '</strong></div><div class="csi2-pair"><small>Rental Status</small><strong>' + esc(d.rental_status || '-') + '</strong></div><div class="csi2-pair"><small>Borrower / Due Date</small><strong>' + esc(d.borrower || '-') + (d.due_date ? ' · ' + esc(d.due_date) : '') + '</strong></div><div class="csi2-pair" style="grid-column:1/-1"><small>Action Required</small><strong>' + esc(d.action_required || '-') + '</strong></div></div><div class="csi2-actions">' + actions.join('') + '</div></div>';
    }).join('');
  }

  function lookup() {
    var q = txt(el('csi2-lookup') && el('csi2-lookup').value);
    if (!q) { toast('warning', 'กรุณากรอก ID Code หรือ Serial Number'); return Promise.resolve(); }
    STATE.lookupId = q;
    el('csi2-lookup-result').innerHTML = '<div class="csi2-empty"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    return api('cesStockV2_lookup', [q]).then(function (result) {
      var rows = extractDevices(result);
      renderLookup(rows);
      return rows;
    }).catch(function (err) { el('csi2-lookup-result').innerHTML = '<div class="csi2-empty" style="color:#be123c">' + esc(err.message || err) + '</div>'; });
  }

  function afterAction(result, idCode) {
    if (result && result.success === false) throw new Error(result.message || 'Action failed');
    toast('success', (result && result.message) || 'Completed');
    STATE.payload = null; STATE.devices = [];
    return loadData(true).then(function () {
      fillFilters(); renderDashboard(); renderInventorySummary();
      if (idCode && el('csi2-lookup')) { el('csi2-lookup').value = idCode; return lookup(); }
    }).then(function () {
      try { if (typeof window.__CES_LEGACY_STOCK_DASH_INIT__ === 'function') window.__CES_LEGACY_STOCK_DASH_INIT__(true); } catch (ignore) {}
      try { if (typeof window.__CES_LEGACY_STOCK_INV_INIT__ === 'function') window.__CES_LEGACY_STOCK_INV_INIT__(true); } catch (ignore2) {}
      try { if (typeof window.__CES_LEGACY_STOCK_CHECK_INIT__ === 'function') window.__CES_LEGACY_STOCK_CHECK_INIT__(true); } catch (ignore3) {}
      return result;
    });
  }
  function action(fn, args, id) { return api(fn, args).then(function (r) { return afterAction(r, id); }).catch(errorBox); }

  function calibrate(id) {
    return confirmBox('ยืนยัน CF CAL/PM', id + ' : รอสอบเทียบ → พร้อมส่ง').then(function (r) { if (r.isConfirmed) return action('cesStockV2_calibrate', [id], id); });
  }
  function checkout(id) {
    if (!window.Swal) {
      var borrower = prompt('Borrower / Customer'); if (!borrower) return;
      var location = prompt('Location'); if (!location) return;
      return action('cesStockV2_checkout', [id, borrower, location, '', 3], id);
    }
    var due = new Date(); due.setMonth(due.getMonth() + 3);
    var ymd = due.getFullYear() + '-' + String(due.getMonth() + 1).padStart(2, '0') + '-' + String(due.getDate()).padStart(2, '0');
    return Swal.fire({ title: 'Check-Out · ' + id, width: 620, html: '<input id="csi2-sw-borrower" class="swal2-input" placeholder="Borrower / Customer"><input id="csi2-sw-location" class="swal2-input" placeholder="Location"><input id="csi2-sw-due" class="swal2-input" type="date" value="' + ymd + '">', showCancelButton: true, confirmButtonText: 'Confirm Check-Out', preConfirm: function () { var borrower = txt(el('csi2-sw-borrower').value), location = txt(el('csi2-sw-location').value), dueDate = txt(el('csi2-sw-due').value); if (!borrower || !location || !dueDate) { Swal.showValidationMessage('กรอก Borrower, Location และ Due Date ให้ครบ'); return false; } return [id, borrower, location, dueDate, 3]; } }).then(function (r) { if (r.isConfirmed) return action('cesStockV2_checkout', r.value, id); });
  }
  function returnDevice(id) {
    return confirmBox('ยืนยัน Return / Check-In', id + ' : เช่ายืม → รอสอบเทียบ').then(function (r) { if (r.isConfirmed) return action('cesStockV2_return', [id], id); });
  }
  function setStatus(id, next) {
    return confirmBox('ยืนยันเปลี่ยนสถานะ', id + ' → ' + next).then(function (r) { if (r.isConfirmed) return action('cesStockV2_setStatus', [id, next, next], id); });
  }

  function exportCsv() {
    var rows = filteredRows();
    var cols = ['id_code', 'serial_number', 'brand', 'model', 'item_name', 'category', 'location', 'base_status', 'rental_status', 'action_required'];
    var csv = [cols.join(',')].concat(rows.map(function (d) { return cols.map(function (c) { return '"' + txt(d[c]).replace(/"/g, '""') + '"'; }).join(','); })).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'CES_Infusion_Pump_Inventory_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function refresh(force) {
    ensureDashboard(); ensureInventory(); ensureCheck();
    return loadData(!!force).then(function () { fillFilters(); renderDashboard(); renderInventorySummary(); return STATE.payload; }).catch(function (err) { console.error('[CES Stock Additive V2]', err); errorBox(err); });
  }

  function wrapLegacyInit(name, backupName, after) {
    var legacy = window[name];
    if (typeof legacy !== 'function' || legacy.__csi2Wrapped) return;
    window[backupName] = legacy;
    var wrapped = function () {
      var args = arguments, result;
      try { result = legacy.apply(this, args); }
      finally { setTimeout(function () { try { after.apply(null, args); } catch (err) { console.error('[CES Stock Additive V2]', name, err); } }, 0); }
      return result;
    };
    wrapped.__csi2Wrapped = true;
    wrapped.__legacy = legacy;
    window[name] = wrapped;
  }

  function install() {
    ensureStyle();
    renameStockNavigation();
    ensureDashboard(); ensureInventory(); ensureCheck();
    wrapLegacyInit('initStockDashboardModule', '__CES_LEGACY_STOCK_DASH_INIT__', function (force) { refresh(!!force); });
    wrapLegacyInit('initStockInventoryModule', '__CES_LEGACY_STOCK_INV_INIT__', function (force) { refresh(!!force); });
    wrapLegacyInit('initStockCheckModule', '__CES_LEGACY_STOCK_CHECK_INIT__', function (force) { ensureCheck(); if (force) loadData(true).then(renderInventorySummary); });
    loadData(false).then(function () { fillFilters(); renderDashboard(); renderInventorySummary(); }).catch(function (err) { console.warn('[CES Stock Additive V2] initial load skipped:', err && err.message ? err.message : err); });
  }

  window.CES_STOCK_V2 = {
    version: VERSION,
    statuses: STATUSES.slice(),
    models: MODELS.slice(),
    refresh: refresh,
    renderDashboard: renderDashboard,
    syncModels: syncModels,
    lookup: lookup,
    calibrate: calibrate,
    checkout: checkout,
    returnDevice: returnDevice,
    setStatus: setStatus,
    exportCsv: exportCsv,
    getState: function () { return STATE; },
    recheck: function () {
      return {
        success: true,
        version: VERSION,
        sidebarPresent: !!el('sidebar-menu'),
        shellPresent: !!el('main-dashboard'),
        legacyViews: {
          stockDashboard: !!el('view-stock_dashboard'),
          inventory: !!el('view-inventory'),
          checkStock: !!el('view-check_stock')
        },
        legacyFunctions: {
          dashboard: typeof window.__CES_LEGACY_STOCK_DASH_INIT__ === 'function',
          inventory: typeof window.__CES_LEGACY_STOCK_INV_INIT__ === 'function',
          checkStock: typeof window.__CES_LEGACY_STOCK_CHECK_INIT__ === 'function',
          cart: typeof window.si_toggleCart === 'function' || typeof window.si_submitCheckout === 'function',
          accessories: typeof window.si_renderAccCards === 'function' || typeof window.sc_loadAccessoryOptions === 'function',
          ocr: typeof window.sc_ocrImage === 'function' || typeof window.sd_ocrScan === 'function'
        },
        additiveRoots: {
          dashboard: !!el('csi2-dashboard-root'),
          inventory: !!el('csi2-inventory-root'),
          checkStock: !!el('csi2-check-root')
        },
        loadedDevices: STATE.devices.length
      };
    }
  };
  window.CES_STOCK_ADDITIVE_RECHECK = function () { return window.CES_STOCK_V2.recheck(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
