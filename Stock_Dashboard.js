// ============================================================
// CES Stock Pro V6 — Stock_Dashboard.gs
// Dashboard summary API + contract/rent actions compatible with V3 UI.
// ============================================================

function sd_getStockDashboardData(forceRefresh) {
  try {
    var payload = sp_getStockPayload_(forceRefresh === true);
    var devices = payload.inventory || [];
    var rentals = payload.rentals || [];

    var kpi = {
      total: devices.length,
      stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
      inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
      overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
      missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
      broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
      recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
      rentalRows: rentals.length
    };

    var byStatus = sp_groupCount_(devices, 'status');
    var byBrand = sp_groupCount_(devices, 'brand');
    var byModel = sp_groupCount_(devices, 'model');
    var byLocation = sp_groupCount_(devices, 'location');
    var rentalMonth = sd_buildRentalByMonth_(rentals);
    var modelCards = sd_buildModelCards_(devices);
    var contractSummary = sd_buildContractSummary_(devices);

    var alerts = devices.filter(function (d) {
      return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck' ||
        Number(d.overdueDays || 0) > 0 || d.actionRequired;
    }).slice(0, 150);

    return {
      success: true,
      timestamp: payload.timestamp,
      kpi: kpi,
      byStatus: byStatus,
      byBrand: byBrand,
      byModel: byModel,
      byLocation: byLocation,
      rentalMonth: rentalMonth,
      modelCards: modelCards,
      contractSummary: contractSummary,
      alerts: alerts,
      inventory: devices,
      devices: devices,
      rentals: rentals,
      filters: payload.filters
    };
  } catch (err) {
    sp_logError_('sd_getStockDashboardData', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function sd_buildModelCards_(devices) {
  var configs = [
    { brand: 'B.BRAUN', keyword: 'INFUSOMAT', label: 'Infusomat Space', color: '#059669', bg: '#d1fae5' },
    { brand: 'B.BRAUN', keyword: 'SPACEPLUS', label: 'Spaceplus', color: '#047857', bg: '#a7f3d0' },
    { brand: 'BYOND', keyword: 'SUNFUSION', label: 'Sunfusion', color: '#2563eb', bg: '#dbeafe' }
  ];
  return configs.map(function (cfg) {
    var rows = devices.filter(function (d) {
      var b = String(d.brand || '').toUpperCase();
      var text = [d.model, d.itemName, d.item_name].join(' ').toUpperCase();
      return b.indexOf(cfg.brand) >= 0 && text.indexOf(cfg.keyword) >= 0;
    });
    return {
      brand: cfg.brand,
      label: cfg.label,
      color: cfg.color,
      bg: cfg.bg,
      total: rows.length,
      inUse: rows.filter(function (d) { return d.status === 'In-Use'; }).length,
      overdue: rows.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length
    };
  });
}

function sd_buildRentalByMonth_(rentals) {
  var months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var byond = new Array(12).fill(0);
  var bbraun = new Array(12).fill(0);
  rentals.forEach(function (r) {
    var d = sp_toDate_(r.borrowDate || r.expectedReturnDate);
    if (!d) return;
    var m = d.getMonth();
    var brand = String(r.brand || '').toUpperCase();
    if (brand.indexOf('BYOND') >= 0) byond[m]++;
    else bbraun[m]++;
  });
  return { labels: months, datasets: [{ label: 'BYOND', data: byond }, { label: 'B.Braun', data: bbraun }] };
}

function sd_buildContractSummary_(devices) {
  var map = {};
  devices.forEach(function (d) {
    var active = d.status === 'In-Use' || d.status === 'Overdue' || Number(d.overdueDays || 0) > 0;
    if (!active) return;
    var loc = sp_str_(d.location || 'Unknown');
    if (!map[loc]) map[loc] = { location: loc, total: 0, inUse: 0, overdue: 0, returned: 0, models: {}, ids: [], borrowDate: '', expectedReturn: '', maxOverdue: 0 };
    map[loc].total++;
    if (d.status === 'Overdue' || Number(d.overdueDays || 0) > 0) map[loc].overdue++; else map[loc].inUse++;
    var model = sp_str_(d.model || d.itemName || 'Unknown');
    map[loc].models[model] = (map[loc].models[model] || 0) + 1;
    map[loc].ids.push(d.idCode);
    if (!map[loc].borrowDate && d.borrowDate) map[loc].borrowDate = d.borrowDate;
    if (!map[loc].expectedReturn && d.expectedReturn) map[loc].expectedReturn = d.expectedReturn;
    map[loc].maxOverdue = Math.max(map[loc].maxOverdue, Number(d.overdueDays || 0));
  });
  return Object.keys(map).sort().map(function (k) {
    var x = map[k];
    var modelList = Object.keys(x.models).map(function (m) { return m + ' ×' + x.models[m]; }).join(', ');
    x.modelList = modelList;
    return x;
  });
}

function sd_testDashboard() {
  var res = sd_getStockDashboardData(true);
  Logger.log(JSON.stringify({ success: res.success, total: res.kpi ? res.kpi.total : 0, contractSummary: res.contractSummary ? res.contractSummary.length : 0 }, null, 2));
  return res;
}


// ============================================================
// CES Stock Pro V8 — ADDITIVE PATCH FROM V6 BASE
// Purpose: keep all V6 backend functions and override only model-card palette.
// BYOND = blue, B.Braun Infusomat = light green, B.Braun Spaceplus = yellow.
// ============================================================
function sd_buildModelCards_(devices) {
  var configs = [
    { brand: 'B.BRAUN', keyword: 'INFUSOMAT', label: 'Infusomat Space', color: '#059669', bg: '#dcfce7', accent: 'bbraun-infusomat' },
    { brand: 'B.BRAUN', keyword: 'SPACEPLUS', label: 'Spaceplus', color: '#d97706', bg: '#fef3c7', accent: 'bbraun-spaceplus' },
    { brand: 'BYOND', keyword: 'SUNFUSION', label: 'Sunfusion', color: '#2563eb', bg: '#dbeafe', accent: 'byond-sunfusion' }
  ];
  return configs.map(function (cfg) {
    var rows = (devices || []).filter(function (d) {
      var b = String(d.brand || '').toUpperCase();
      var text = [d.model, d.itemName, d.item_name].join(' ').toUpperCase();
      return b.indexOf(cfg.brand) >= 0 && text.indexOf(cfg.keyword) >= 0;
    });
    return {
      brand: cfg.brand,
      label: cfg.label,
      color: cfg.color,
      bg: cfg.bg,
      accent: cfg.accent,
      total: rows.length,
      inUse: rows.filter(function (d) { return d.status === 'In-Use'; }).length,
      overdue: rows.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
      stock: rows.filter(function (d) { return d.status === 'Stock'; }).length
    };
  });
}


/* ============================================================
   CES Stock Pro V30 — Dashboard Backend KPI Correction
   Additive override. Separates Overdue / Missing / Broken / Recheck.
============================================================ */
function sd_v30Status_(d) {
  if (typeof sp_v30NormalizeDeviceStatus_ === 'function') return sp_v30NormalizeDeviceStatus_(d).status;
  var text = [d.status,d.baseStatus,d.base_status,d.rentalStatus,d.rental_status,d.actionRequired,d.action_required,d.recheckNote,d.recheck_note].join(' ').toUpperCase();
  if (/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง/.test(text)) return 'Broken';
  if (/MISSING|LOST|สูญหาย|หาย|หาไม่พบ/.test(text)) return 'Missing';
  if (/RECHECK|RE-CHECK|ตรวจซ้ำ|ตรวจสอบซ้ำ/.test(text)) return 'Recheck';
  if (/OVERDUE|EXPIRED|เลยกำหนด|เกินกำหนด/.test(text) || Number(d.overdueDays || d.overdue_days || 0) > 0) return 'Overdue';
  if (/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) return 'In-Use';
  return 'Stock';
}

function sd_getStockDashboardData(forceRefresh) {
  try {
    var payload = sp_getStockPayload_(forceRefresh === true);
    var devices = (payload.inventory || []).map(function(d){ d.status = sd_v30Status_(d); d.finalStatus = d.status; return d; });
    var rentals = payload.rentals || [];

    var kpi = {
      total: devices.length,
      stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
      inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
      overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
      missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
      broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
      recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
      rentalRows: rentals.length
    };

    return {
      success: true,
      timestamp: payload.timestamp,
      kpi: kpi,
      byStatus: sp_groupCount_(devices, 'status'),
      byBrand: sp_groupCount_(devices, 'brand'),
      byModel: sp_groupCount_(devices, 'model'),
      byLocation: sp_groupCount_(devices, 'location'),
      rentalMonth: sd_buildRentalByMonth_(rentals),
      modelCards: sd_buildModelCards_(devices),
      contractSummary: sd_buildContractSummary_(devices),
      alerts: devices.filter(function (d) {
        return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck' ||
          Number(d.overdueDays || 0) > 0 || d.actionRequired || d.recheckNote;
      }).slice(0, 150),
      inventory: devices,
      devices: devices,
      rentals: rentals,
      filters: payload.filters
    };
  } catch (err) {
    sp_logError_('sd_getStockDashboardData_V30', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}
