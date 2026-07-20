// ============================================================
// CES Stock Pro V3 — Stock_Config.gs
// Shared configuration + helpers
// Works inside CES Hub SPA. Do NOT add doGet() here.
// ============================================================

const STOCK_PRO = {
  SPREADSHEET_ID: '1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk',

  SHEETS: {
    DEVICES_CLEAN: 'DB_Devices_Clean',
    DEVICES_FALLBACK: 'DB_Devices',

    RENTAL_CLEAN: 'DB_Rental_History_Clean',
    RENTAL_FALLBACK: 'DB_Rental_History',

    ACCESSORIES_CLEAN: 'Accessories_Clean',
    ACCESSORIES_FALLBACK_1: 'DB_Accessories',
    ACCESSORIES_FALLBACK_2: 'Accessories',

    SCAN_LOG: 'Stock_Scan_Log',
    ACTIVITY_LOG: 'Stock_Activity_Log',
    ERROR_LOG: 'Stock_Error_Log'
  },

  CACHE: {
    DASHBOARD: 'STOCK_PRO_V6_DASHBOARD',
    INVENTORY: 'STOCK_PRO_V6_INVENTORY',
    CHECK: 'STOCK_PRO_V6_CHECK',
    TTL_SECONDS: 90
  },

  DEFAULT_PAGE_SIZE: 50,
  TIMEZONE: 'Asia/Bangkok'
};


/**
 * Return Spreadsheet instance.
 */
function sp_ss_() {
  return SpreadsheetApp.openById(STOCK_PRO.SPREADSHEET_ID);
}


/**
 * Try multiple sheet names and return the first existing sheet.
 */
function sp_getSheetAny_(ss, names) {
  for (var i = 0; i < names.length; i++) {
    var sh = ss.getSheetByName(names[i]);
    if (sh) return sh;
  }
  return null;
}


/**
 * Normalize header name for tolerant matching.
 */
function sp_normHeader_(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^\wก-๙]/g, '');
}


/**
 * Convert sheet values to object array.
 */
function sp_readObjects_(sheet) {
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  var headers = values[0].map(function (h) { return sp_normHeader_(h); });

  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var hasData = row.some(function (c) { return c !== '' && c !== null && c !== undefined; });
    if (!hasData) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = sp_cell_(row[c]);
    }
    obj._rowNumber = r + 1;
    out.push(obj);
  }

  return out;
}


/**
 * Safe cell formatting.
 */
function sp_cell_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, STOCK_PRO.TIMEZONE, 'yyyy-MM-dd');
  }
  if (v === null || v === undefined) return '';
  return v;
}


function sp_str_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}


function sp_upper_(v) {
  return sp_str_(v).toUpperCase();
}


function sp_num_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}


function sp_today_() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}


function sp_toDate_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;

  var s = sp_str_(v);
  if (!s) return null;

  // yyyy-mm-dd
  var m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m1) return new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));

  // dd/mm/yyyy or dd/mm/yy
  var m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m2) {
    var y = Number(m2[3]);
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    return new Date(y, Number(m2[2]) - 1, Number(m2[1]));
  }

  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}


function sp_isoDate_(v) {
  var d = sp_toDate_(v);
  if (!d) return '';
  return Utilities.formatDate(d, STOCK_PRO.TIMEZONE, 'yyyy-MM-dd');
}


function sp_thDate_(v) {
  var d = sp_toDate_(v);
  if (!d) return '-';
  return Utilities.formatDate(d, STOCK_PRO.TIMEZONE, 'dd/MM/yyyy');
}


function sp_daysRemaining_(dueDate) {
  var d = sp_toDate_(dueDate);
  if (!d) return '';
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - sp_today_().getTime()) / 86400000);
}


function sp_overdueDays_(dueDate) {
  var left = sp_daysRemaining_(dueDate);
  if (left === '') return 0;
  return left < 0 ? Math.abs(left) : 0;
}


function sp_unique_(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function (v) {
    var s = sp_str_(v);
    if (!s || seen[s]) return;
    seen[s] = true;
    out.push(s);
  });
  return out.sort();
}


function sp_groupCount_(arr, key) {
  var map = {};
  arr.forEach(function (x) {
    var k = sp_str_(x[key]) || 'Unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.keys(map).sort().map(function (k) {
    return { name: k, count: map[k] };
  });
}


function sp_normalStatus_(baseStatus, rentalStatus, dqStatus) {
  var b = sp_upper_(baseStatus);
  var r = sp_upper_(rentalStatus);
  var d = sp_upper_(dqStatus);

  if (b.indexOf('BROKEN') >= 0) return 'Broken';
  if (b.indexOf('MISSING') >= 0) return 'Missing';
  if (d.indexOf('RECHECK') >= 0) return 'Recheck';

  if (r.indexOf('OVERDUE') >= 0) return 'Overdue';
  if (r.indexOf('IN_USE') >= 0 || r.indexOf('IN-USE') >= 0 || r.indexOf('BORROW') >= 0) return 'In-Use';

  if (b.indexOf('IN_USE') >= 0 || b.indexOf('IN-USE') >= 0 || b.indexOf('BORROW') >= 0) return 'In-Use';
  if (b.indexOf('STOCK') >= 0 || b.indexOf('AVAILABLE') >= 0 || b === '') return 'Stock';

  return sp_str_(baseStatus) || 'Stock';
}


/**
 * Read normalized devices.
 * Output keys are designed for frontend compatibility with the original Stock Pro.
 */
function sp_getDevices_() {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.DEVICES_CLEAN,
    STOCK_PRO.SHEETS.DEVICES_FALLBACK
  ]);

  var rows = sp_readObjects_(sh);

  return rows.map(function (r) {
    var idCode = sp_str_(r.id_code || r.idcode || r.device_key || r.device_uid || r.id || r.code);
    var sn = sp_str_(r.serial_number || r.sn || r.s_n || r.serial);
    var brand = sp_str_(r.brand || r.manufacturer);
    var model = sp_str_(r.model || r.item_name || r.item || r.name);
    var itemName = sp_str_(r.item_name || r.item || model);
    var category = sp_str_(r.category || r.type || 'Equipment');
    var location = sp_str_(r.location || r.current_location || 'คลัง');
    var baseStatus = sp_str_(r.base_status || r.status || r.current_status);
    var dqStatus = sp_str_(r.dq_status || r.data_quality || '');
    var rentalStatus = sp_str_(r.rental_status || r.current_rental_status || '');
    var actionRequired = sp_str_(r.action_required || r.action || '');
    var recheckNote = sp_str_(r.recheck_note || r.note || '');

    var status = sp_normalStatus_(baseStatus, rentalStatus, dqStatus);

    return {
      rowNumber: r._rowNumber,
      idCode: idCode,
      id_code: idCode,
      serialNumber: sn,
      serial_number: sn,
      sn: sn,
      brand: brand,
      model: model,
      itemName: itemName,
      item_name: itemName,
      category: category,
      location: location,
      baseStatus: baseStatus,
      base_status: baseStatus,
      dqStatus: dqStatus,
      dq_status: dqStatus,
      rentalStatus: rentalStatus,
      rental_status: rentalStatus,
      status: status,
      finalStatus: status,
      actionRequired: actionRequired,
      action_required: actionRequired,
      recheckNote: recheckNote,
      recheck_note: recheckNote
    };
  }).filter(function (d) {
    var deleted = String(d.baseStatus || '').toUpperCase().indexOf('DELETED') >= 0 || String(d.baseStatus || '').toUpperCase().indexOf('HIDDEN') >= 0;
    return (d.idCode || d.sn) && !deleted;
  });
}


/**
 * Read normalized rental history.
 */
function sp_getRental_() {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.RENTAL_CLEAN,
    STOCK_PRO.SHEETS.RENTAL_FALLBACK
  ]);

  var rows = sp_readObjects_(sh);

  return rows.map(function (r) {
    var idCode = sp_str_(r.id_code || r.idcode || r.device_key || r.id || r.code);
    var due = sp_isoDate_(r.expected_return_date || r.due_date || r.return_due || r.expected_return);
    var ret = sp_isoDate_(r.return_date || r.actual_return);
    var rentalStatus = sp_str_(r.rental_status || r.status || '');
    var overdueDays = sp_num_(r.overdue_days);
    if (!overdueDays) overdueDays = ret ? 0 : sp_overdueDays_(due);

    if (!rentalStatus) {
      if (ret) rentalStatus = 'RETURNED';
      else if (overdueDays > 0) rentalStatus = 'OVERDUE';
      else rentalStatus = 'IN_USE';
    }

    return {
      rowNumber: r._rowNumber,
      rentalId: sp_str_(r.rental_id || r.id || ''),
      rental_id: sp_str_(r.rental_id || r.id || ''),
      idCode: idCode,
      id_code: idCode,
      serialNumber: sp_str_(r.serial_number || r.sn || r.serial),
      serial_number: sp_str_(r.serial_number || r.sn || r.serial),
      brand: sp_str_(r.brand),
      model: sp_str_(r.model),
      borrower: sp_str_(r.borrower || r.user || r.requester || '-'),
      location: sp_str_(r.location || '-'),
      borrowDate: sp_isoDate_(r.borrow_date || r.checkout_date || r.date),
      borrow_date: sp_isoDate_(r.borrow_date || r.checkout_date || r.date),
      durationMonth: sp_num_(r.duration_month),
      duration_month: sp_num_(r.duration_month),
      expectedReturnDate: due,
      expected_return_date: due,
      returnDate: ret,
      return_date: ret,
      dueDate: due,
      due_date: due,
      daysRemaining: sp_daysRemaining_(due),
      days_remaining: sp_daysRemaining_(due),
      overdueDays: overdueDays,
      overdue_days: overdueDays,
      rentalStatus: rentalStatus,
      rental_status: rentalStatus,
      finalStatusAfterRental: sp_str_(r.final_status_after_rental || ''),
      final_status_after_rental: sp_str_(r.final_status_after_rental || ''),
      actionRequired: sp_str_(r.action_required || ''),
      action_required: sp_str_(r.action_required || ''),
      note: sp_str_(r.note || ''),
      sourceRow: sp_str_(r.source_row || ''),
      source_row: sp_str_(r.source_row || '')
    };
  }).filter(function (r) {
    return r.idCode || r.serialNumber || r.borrower || r.location;
  });
}


/**
 * Read accessories.
 */
function sp_getAccessories_() {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.ACCESSORIES_CLEAN,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_1,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_2
  ]);

  var rows = sp_readObjects_(sh);

  return rows.map(function (r) {
    var qty = sp_num_(r.qty || r.quantity || r.stock || r.current_stock || 0);
    var min = sp_num_(r.minimum_stock || r.min_stock || r.min || 0);
    return {
      rowNumber: r._rowNumber,
      idCode: sp_str_(r.id_code || r.id || r.code),
      id_code: sp_str_(r.id_code || r.id || r.code),
      name: sp_str_(r.name || r.item_name || r.item || r.accessory || r.type),
      type: sp_str_(r.type || r.category || r.name || 'Accessory'),
      qty: qty,
      quantity: qty,
      minStock: min,
      minimum_stock: min,
      location: sp_str_(r.location || ''),
      status: sp_str_(r.status || (qty <= min ? 'LOW' : 'OK')),
      remark: sp_str_(r.remark || r.note || '')
    };
  }).filter(function (a) {
    return a.name || a.idCode || a.qty;
  });
}


/**
 * Get latest rental by idCode.
 */
function sp_latestRentalMap_(rentals) {
  var map = {};
  rentals.forEach(function (r) {
    if (!r.idCode) return;
    var key = r.idCode.toUpperCase();
    if (!map[key]) {
      map[key] = r;
      return;
    }

    var oldD = sp_toDate_(map[key].borrowDate || map[key].expectedReturnDate);
    var newD = sp_toDate_(r.borrowDate || r.expectedReturnDate);
    if (newD && (!oldD || newD.getTime() > oldD.getTime())) {
      map[key] = r;
    }
  });
  return map;
}


/**
 * Attach latest rental fields to devices for frontend display.
 */
function sp_mergeDeviceRental_(devices, rentals) {
  var rentMap = sp_latestRentalMap_(rentals);
  return devices.map(function (d) {
    var r = rentMap[String(d.idCode || '').toUpperCase()];
    if (!r) return d;

    var isOpen = !r.returnDate && String(r.rentalStatus || '').toUpperCase() !== 'RETURNED';
    var status = d.status;
    if (isOpen && d.status !== 'Broken' && d.status !== 'Missing' && d.status !== 'Recheck') {
      status = r.overdueDays > 0 ? 'Overdue' : 'In-Use';
    }

    d.borrower = isOpen ? r.borrower : '-';
    d.borrowDate = isOpen ? r.borrowDate : '';
    d.expectedReturn = isOpen ? r.expectedReturnDate : '';
    d.expectedReturnDate = isOpen ? r.expectedReturnDate : '';
    d.returnDate = r.returnDate || '';
    d.overdueDays = isOpen ? r.overdueDays : 0;
    d.daysRemaining = isOpen ? r.daysRemaining : '';
    d.rentalStatus = isOpen ? r.rentalStatus : d.rentalStatus;
    d.status = status;
    d.finalStatus = status;
    if (isOpen && r.location && (!d.location || d.location === 'คลัง')) d.location = r.location;
    return d;
  });
}


/**
 * Return standard payload used by all modules.
 */
function sp_getStockPayload_(forceRefresh) {
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(STOCK_PRO.CACHE.INVENTORY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  var devices = sp_getDevices_();
  var rentals = sp_getRental_();
  devices = sp_mergeDeviceRental_(devices, rentals);
  var accessories = sp_getAccessories_();

  var payload = {
    success: true,
    timestamp: new Date().toISOString(),
    inventory: devices,
    devices: devices,
    rental: rentals,
    rentals: rentals,
    accessories: accessories,
    filters: {
      brands: sp_unique_(devices.map(function (d) { return d.brand; })),
      models: sp_unique_(devices.map(function (d) { return d.model; })),
      locations: sp_unique_(devices.map(function (d) { return d.location; })),
      statuses: sp_unique_(devices.map(function (d) { return d.status; })),
      accessoryTypes: sp_unique_(accessories.map(function (a) { return a.type; }))
    }
  };

  try {
    cache.put(STOCK_PRO.CACHE.INVENTORY, JSON.stringify(payload), STOCK_PRO.CACHE.TTL_SECONDS);
  } catch (e2) {}

  return payload;
}


/**
 * Ensure log sheets exist.
 */
function sp_getOrCreateSheet_(sheetName, headers) {
  var ss = sp_ss_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}


function sp_appendScanLog_(action, idCode, result, message, user) {
  var sh = sp_getOrCreateSheet_(STOCK_PRO.SHEETS.SCAN_LOG, [
    'timestamp', 'action', 'id_code', 'result', 'message', 'user'
  ]);
  sh.appendRow([
    new Date(),
    action || '',
    idCode || '',
    result || '',
    message || '',
    user || ''
  ]);
}


function sp_logError_(fn, err) {
  try {
    var sh = sp_getOrCreateSheet_(STOCK_PRO.SHEETS.ERROR_LOG, [
      'timestamp', 'function_name', 'message', 'stack'
    ]);
    sh.appendRow([
      new Date(),
      fn,
      err && err.message ? err.message : String(err),
      err && err.stack ? err.stack : ''
    ]);
  } catch (e) {
    Logger.log('sp_logError_ failed: ' + e.message);
  }
}


function sp_clearStockCache() {
  var cache = CacheService.getScriptCache();
  cache.remove(STOCK_PRO.CACHE.DASHBOARD);
  cache.remove(STOCK_PRO.CACHE.INVENTORY);
  cache.remove(STOCK_PRO.CACHE.CHECK);
  return { success: true, message: 'Stock cache cleared' };
}


function sp_findDeviceRow_(idCodeOrSn) {
  var q = sp_str_(idCodeOrSn).toUpperCase();
  if (!q) return null;

  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.DEVICES_CLEAN,
    STOCK_PRO.SHEETS.DEVICES_FALLBACK
  ]);
  if (!sh) return null;

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return null;

  var headers = values[0].map(sp_normHeader_);
  var idxId = headers.indexOf('id_code');
  var idxSn = headers.indexOf('serial_number');
  var idxStatus = headers.indexOf('rental_status');
  if (idxStatus < 0) idxStatus = headers.indexOf('base_status');
  var idxLoc = headers.indexOf('location');

  for (var r = 1; r < values.length; r++) {
    var id = idxId >= 0 ? sp_str_(values[r][idxId]).toUpperCase() : '';
    var sn = idxSn >= 0 ? sp_str_(values[r][idxSn]).toUpperCase() : '';
    if (id === q || sn === q) {
      return {
        sheet: sh,
        row: r + 1,
        headers: headers,
        idxId: idxId,
        idxSn: idxSn,
        idxStatus: idxStatus,
        idxLoc: idxLoc
      };
    }
  }
  return null;
}


// ============================================================
// CES Stock Pro V6 — Shared write helpers
// Added to preserve original Stock Pro UX while using Clean DB columns.
// ============================================================
function sp_findHeaderIndex_(headers, candidates) {
  candidates = candidates || [];
  for (var i = 0; i < candidates.length; i++) {
    var c = sp_normHeader_(candidates[i]);
    var idx = headers.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function sp_setCellByHeaders_(sheet, rowNumber, headers, candidates, value) {
  var idx = sp_findHeaderIndex_(headers, candidates);
  if (idx >= 0) {
    sheet.getRange(rowNumber, idx + 1).setValue(value);
    return true;
  }
  return false;
}

function sp_appendActivityLog_(action, ref, detail, user) {
  try {
    var sh = sp_getOrCreateSheet_(STOCK_PRO.SHEETS.ACTIVITY_LOG, [
      'timestamp', 'action', 'reference', 'detail', 'user'
    ]);
    sh.appendRow([new Date(), action || '', ref || '', detail || '', user || '']);
  } catch (err) {
    Logger.log('sp_appendActivityLog_ error: ' + err.message);
  }
}

function sp_updateDeviceRecord_(idCodeOrSn, fields, user) {
  var found = sp_findDeviceRow_(idCodeOrSn);
  if (!found) return { success:false, message:'Device not found: ' + idCodeOrSn };
  fields = fields || {};
  var h = found.headers;
  var sh = found.sheet;
  var row = found.row;

  if (fields.idCode !== undefined || fields.id_code !== undefined) sp_setCellByHeaders_(sh, row, h, ['id_code','idcode','device_key','device_uid','id'], fields.idCode || fields.id_code);
  if (fields.serialNumber !== undefined || fields.sn !== undefined || fields.serial_number !== undefined) sp_setCellByHeaders_(sh, row, h, ['serial_number','sn','s_n','serial'], fields.serialNumber || fields.sn || fields.serial_number);
  if (fields.brand !== undefined) sp_setCellByHeaders_(sh, row, h, ['brand','manufacturer'], fields.brand);
  if (fields.model !== undefined) sp_setCellByHeaders_(sh, row, h, ['model'], fields.model);
  if (fields.itemName !== undefined || fields.item_name !== undefined) sp_setCellByHeaders_(sh, row, h, ['item_name','item','name'], fields.itemName || fields.item_name);
  if (fields.category !== undefined) sp_setCellByHeaders_(sh, row, h, ['category','type'], fields.category);
  if (fields.location !== undefined) sp_setCellByHeaders_(sh, row, h, ['location','current_location'], fields.location);
  if (fields.baseStatus !== undefined || fields.base_status !== undefined) sp_setCellByHeaders_(sh, row, h, ['base_status','status','current_status'], fields.baseStatus || fields.base_status);
  if (fields.rentalStatus !== undefined || fields.rental_status !== undefined) sp_setCellByHeaders_(sh, row, h, ['rental_status','current_rental_status'], fields.rentalStatus || fields.rental_status);
  if (fields.dqStatus !== undefined || fields.dq_status !== undefined) sp_setCellByHeaders_(sh, row, h, ['dq_status','data_quality'], fields.dqStatus || fields.dq_status);
  if (fields.actionRequired !== undefined || fields.action_required !== undefined) sp_setCellByHeaders_(sh, row, h, ['action_required','action'], fields.actionRequired || fields.action_required);
  if (fields.recheckNote !== undefined || fields.recheck_note !== undefined) sp_setCellByHeaders_(sh, row, h, ['recheck_note','note'], fields.recheckNote || fields.recheck_note);

  // SpreadsheetApp.flush(); // Removed: unnecessary, adds latency
  sp_appendActivityLog_('DEVICE_UPDATE', idCodeOrSn, JSON.stringify(fields), user || '');
  sp_clearStockCache();
  return { success:true, message:'Device updated', idCode:idCodeOrSn };
}

function sp_findLatestRentalRow_(idCodeOrSn) {
  var q = sp_str_(idCodeOrSn).toUpperCase();
  if (!q) return null;
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [STOCK_PRO.SHEETS.RENTAL_CLEAN, STOCK_PRO.SHEETS.RENTAL_FALLBACK]);
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(sp_normHeader_);
  var idxId = sp_findHeaderIndex_(headers, ['id_code','idcode','device_key','id','code']);
  var idxSn = sp_findHeaderIndex_(headers, ['serial_number','sn','s_n','serial']);
  var idxRet = sp_findHeaderIndex_(headers, ['return_date','actual_return']);
  var idxDue = sp_findHeaderIndex_(headers, ['expected_return_date','due_date','expected_return']);
  var idxBorrow = sp_findHeaderIndex_(headers, ['borrow_date','checkout_date','date']);
  var best = null;
  for (var r = 1; r < values.length; r++) {
    var id = idxId >= 0 ? sp_str_(values[r][idxId]).toUpperCase() : '';
    var sn = idxSn >= 0 ? sp_str_(values[r][idxSn]).toUpperCase() : '';
    if (id !== q && sn !== q) continue;
    var ret = idxRet >= 0 ? sp_str_(values[r][idxRet]) : '';
    var d = sp_toDate_((idxBorrow >= 0 ? values[r][idxBorrow] : '') || (idxDue >= 0 ? values[r][idxDue] : '')) || new Date(0);
    var item = { sheet:sh, row:r+1, headers:headers, values:values[r], isOpen:!ret, date:d };
    if (!best || (item.isOpen && !best.isOpen) || (item.date.getTime() > best.date.getTime())) best = item;
  }
  return best;
}

function sp_updateLatestRental_(idCodeOrSn, fields, user) {
  var found = sp_findLatestRentalRow_(idCodeOrSn);
  if (!found) return { success:false, message:'Rental row not found: ' + idCodeOrSn };
  fields = fields || {};
  var sh = found.sheet, row = found.row, h = found.headers;
  if (fields.expectedReturnDate !== undefined || fields.expected_return_date !== undefined || fields.dueDate !== undefined) {
    var due = sp_isoDate_(fields.expectedReturnDate || fields.expected_return_date || fields.dueDate);
    sp_setCellByHeaders_(sh, row, h, ['expected_return_date','expected_return'], due);
    sp_setCellByHeaders_(sh, row, h, ['due_date'], due);
    sp_setCellByHeaders_(sh, row, h, ['days_remaining'], sp_daysRemaining_(due));
    sp_setCellByHeaders_(sh, row, h, ['overdue_days'], sp_overdueDays_(due));
    sp_setCellByHeaders_(sh, row, h, ['rental_status','status'], sp_overdueDays_(due) > 0 ? 'OVERDUE' : 'IN_USE');
  }
  if (fields.returnDate !== undefined || fields.return_date !== undefined) {
    var ret = sp_isoDate_(fields.returnDate || fields.return_date || new Date());
    sp_setCellByHeaders_(sh, row, h, ['return_date','actual_return'], ret);
    sp_setCellByHeaders_(sh, row, h, ['rental_status','status'], 'RETURNED');
    sp_setCellByHeaders_(sh, row, h, ['final_status_after_rental'], fields.finalStatusAfterRental || 'STOCK');
    sp_setCellByHeaders_(sh, row, h, ['action_required'], fields.actionRequired || 'Returned');
  }
  if (fields.note !== undefined) sp_setCellByHeaders_(sh, row, h, ['note','remark'], fields.note);
  // SpreadsheetApp.flush(); // Removed: unnecessary, adds latency
  sp_appendActivityLog_('RENTAL_UPDATE', idCodeOrSn, JSON.stringify(fields), user || '');
  sp_clearStockCache();
  return { success:true, message:'Rental updated', idCode:idCodeOrSn };
}

function sp_findAccessoryRow_(idCodeOrName) {
  var q = sp_str_(idCodeOrName).toUpperCase();
  if (!q) return null;
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [STOCK_PRO.SHEETS.ACCESSORIES_CLEAN, STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_1, STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_2]);
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(sp_normHeader_);
  var idxId = sp_findHeaderIndex_(headers, ['id_code','id','code']);
  var idxName = sp_findHeaderIndex_(headers, ['name','item_name','item','accessory','type']);
  var idxQty = sp_findHeaderIndex_(headers, ['qty','quantity','stock','current_stock']);
  for (var r = 1; r < values.length; r++) {
    var id = idxId >= 0 ? sp_str_(values[r][idxId]).toUpperCase() : '';
    var name = idxName >= 0 ? sp_str_(values[r][idxName]).toUpperCase() : '';
    if (id === q || name === q) return { sheet:sh, row:r+1, headers:headers, values:values[r], idxQty:idxQty, idxId:idxId, idxName:idxName };
  }
  return null;
}

function sp_updateAccessoryQty_(idCodeOrName, delta, user, note) {
  var found = sp_findAccessoryRow_(idCodeOrName);
  if (!found) return { success:false, message:'Accessory not found: ' + idCodeOrName };
  if (found.idxQty < 0) return { success:false, message:'Accessory qty column not found' };
  var current = sp_num_(found.values[found.idxQty]);
  var next = current + Number(delta || 0);
  if (next < 0) return { success:false, message:'Not enough stock. Current=' + current };
  found.sheet.getRange(found.row, found.idxQty + 1).setValue(next);
  sp_appendActivityLog_('ACCESSORY_QTY', idCodeOrName, 'delta=' + delta + ' current=' + current + ' next=' + next + ' note=' + (note || ''), user || '');
  sp_clearStockCache();
  return { success:true, message:'Accessory updated', current:current, next:next };
}


// ============================================================
// CES Stock Pro V8 — ADDITIVE PATCH FROM V6 BASE
// Accessory schema support:
// accessory_id | team | item_name | stock_qty | min_stock_qty | status | action_required
// Keeps all original V6 helpers and overrides only the accessory adapter/write helpers.
// ============================================================
function sp_getAccessories_() {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.ACCESSORIES_CLEAN,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_1,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_2
  ]);
  var rows = sp_readObjects_(sh);
  return rows.map(function (r) {
    var accessoryId = sp_str_(r.accessory_id || r.accessoryid || r.id_code || r.id || r.code);
    var team = sp_str_(r.team || r.department || r.group || 'GENERAL');
    var itemName = sp_str_(r.item_name || r.itemname || r.name || r.item || r.accessory || r.type);
    var stockQty = sp_num_(r.stock_qty || r.stockqty || r.qty || r.quantity || r.stock || r.current_stock || 0);
    var minStockQty = sp_num_(r.min_stock_qty || r.minstockqty || r.minimum_stock || r.min_stock || r.min || 0);
    var status = sp_str_(r.status || (stockQty <= minStockQty ? 'LOW_STOCK' : 'STOCK'));
    var actionRequired = sp_str_(r.action_required || r.actionrequired || r.action || (stockQty <= minStockQty ? 'Restock required' : 'No action'));
    return {
      rowNumber: r._rowNumber,
      accessoryId: accessoryId,
      accessory_id: accessoryId,
      idCode: accessoryId,
      id_code: accessoryId,
      team: team,
      itemName: itemName,
      item_name: itemName,
      name: itemName,
      type: sp_str_(r.type || r.category || itemName || 'Accessory'),
      stockQty: stockQty,
      stock_qty: stockQty,
      qty: stockQty,
      quantity: stockQty,
      minStockQty: minStockQty,
      min_stock_qty: minStockQty,
      minStock: minStockQty,
      minimum_stock: minStockQty,
      status: status,
      actionRequired: actionRequired,
      action_required: actionRequired,
      location: sp_str_(r.location || ''),
      remark: sp_str_(r.remark || r.note || '')
    };
  }).filter(function (a) {
    return a.accessoryId || a.itemName || Number(a.stockQty || 0) !== 0;
  });
}

function sp_findAccessoryRow_(idCodeOrName) {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.ACCESSORIES_CLEAN,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_1,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_2
  ]);
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  if (!data || data.length < 2) return null;
  var headers = data[0].map(function (h) { return sp_normHeader_(h); });
  var idxId = sp_findHeaderIndex_(headers, ['accessory_id', 'id_code', 'id', 'code']);
  var idxItem = sp_findHeaderIndex_(headers, ['item_name', 'name', 'item', 'accessory', 'type']);
  var idxStock = sp_findHeaderIndex_(headers, ['stock_qty', 'qty', 'quantity', 'stock', 'current_stock']);
  var idxMin = sp_findHeaderIndex_(headers, ['min_stock_qty', 'minimum_stock', 'min_stock', 'min']);
  var q = sp_upper_(idCodeOrName);
  for (var i = 1; i < data.length; i++) {
    var id = idxId >= 0 ? sp_upper_(data[i][idxId]) : '';
    var item = idxItem >= 0 ? sp_upper_(data[i][idxItem]) : '';
    if (id === q || item === q) {
      return { sheet: sh, row: i + 1, headers: headers, idxId: idxId, idxItem: idxItem, idxStock: idxStock, idxMin: idxMin, rowValues: data[i] };
    }
  }
  return null;
}

function sp_updateAccessoryQty_(idCodeOrName, delta, user, note) {
  var found = sp_findAccessoryRow_(idCodeOrName);
  if (!found) return { success: false, message: 'Accessory not found: ' + idCodeOrName };
  if (found.idxStock < 0) return { success: false, message: 'Stock quantity column not found' };
  var current = sp_num_(found.sheet.getRange(found.row, found.idxStock + 1).getValue());
  var next = current + Number(delta || 0);
  if (next < 0) return { success: false, message: 'Insufficient stock. Current: ' + current };
  found.sheet.getRange(found.row, found.idxStock + 1).setValue(next);
  var min = found.idxMin >= 0 ? sp_num_(found.sheet.getRange(found.row, found.idxMin + 1).getValue()) : 0;
  sp_setCellByHeaders_(found.sheet, found.row, found.headers, ['status'], next <= min ? 'LOW_STOCK' : 'STOCK');
  sp_setCellByHeaders_(found.sheet, found.row, found.headers, ['action_required', 'action'], next <= min ? 'Restock required' : 'No action');
  sp_appendActivityLog_('ACCESSORY_QTY_UPDATE', idCodeOrName, 'delta=' + delta + ', current=' + current + ', next=' + next + ', note=' + (note || ''), user || '');
  sp_clearStockCache();
  return { success: true, message: 'Accessory quantity updated', previousQty: current, newQty: next };
}

function sp_accessoryApprovalSheet_() {
  return sp_getOrCreateSheet_('Stock_Accessory_Approval', [
    'timestamp', 'request_id', 'accessory_id', 'team', 'item_name', 'qty',
    'borrower', 'location', 'status', 'note', 'requested_by'
  ]);
}

function sp_appendAccessoryApproval_(a, qty, borrower, location, note, user) {
  var sh = sp_accessoryApprovalSheet_();
  var requestId = 'ACC-' + Utilities.formatDate(new Date(), STOCK_PRO.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 999);
  sh.appendRow([
    new Date(),
    requestId,
    a.accessoryId || a.idCode || a.id_code || '',
    a.team || '',
    a.itemName || a.item_name || a.name || '',
    Number(qty || 1),
    borrower || '',
    location || '',
    'PENDING_APPROVAL',
    note || '',
    user || ''
  ]);
  return requestId;
}

function sp_sendAccessoryApprovalEmail_(requests, borrower, location) {
  try {
    if (!requests || !requests.length) return;
    var to = STOCK_PRO.ALERT_EMAIL || Session.getActiveUser().getEmail();
    if (!to) return;
    var html = '<div style="font-family:Arial,sans-serif"><h2>CES Stock Accessory Approval</h2>' +
      '<p><b>Borrower:</b> ' + sp_str_(borrower) + '<br><b>Location:</b> ' + sp_str_(location) + '</p>' +
      '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:12px"><tr><th>Request ID</th><th>Team</th><th>Item</th><th>Qty</th><th>Status</th></tr>' +
      requests.map(function (r) { return '<tr><td>' + r.requestId + '</td><td>' + sp_str_(r.team) + '</td><td>' + sp_str_(r.itemName) + '</td><td>' + r.qty + '</td><td>PENDING_APPROVAL</td></tr>'; }).join('') +
      '</table></div>';
    GmailApp.sendEmail(to, '[CES Stock] Accessory Approval Request', 'Accessory approval request', { htmlBody: html });
  } catch (err) {
    sp_logError_('sp_sendAccessoryApprovalEmail_', err);
  }
}

STOCK_PRO.ALERT_EMAIL = STOCK_PRO.ALERT_EMAIL || 'Siripak.Ch@nhealth-asia.com';

/* ============================================================
   CES Stock Pro V11 — V8 ORIGINAL ADDITIVE PATCH
   Requirement: keep V8 functions, add warehouse/in-stock normalization
   and clean accessory mapping for accessory_id/team/item_name/stock_qty/min_stock_qty/status/action_required.
============================================================ */

function sp_v11IsWarehouseLocation_(loc) {
  var s = sp_upper_(loc).replace(/\s+/g, ' ');
  return s === 'WAREHOUSE' || s === 'STORE' || s === 'STOCK ROOM' || s === 'STOCKROOM' ||
    s.indexOf('WAREHOUSE') >= 0 || s.indexOf('คลัง') >= 0 || s.indexOf('สโตร์') >= 0;
}

function sp_v11NormalizeWarehouseDevice_(d) {
  if (!d) return d;
  if (sp_v11IsWarehouseLocation_(d.location)) {
    d.location = 'Warehouse';
    d.status = 'Stock';
    d.finalStatus = 'Stock';
    d.rentalStatus = 'STOCK';
    d.rental_status = 'STOCK';
    d.borrower = '-';
    d.borrowDate = '';
    d.borrow_date = '';
    d.expectedReturn = '';
    d.expectedReturnDate = '';
    d.expected_return_date = '';
    d.dueDate = '';
    d.due_date = '';
    d.overdueDays = 0;
    d.overdue_days = 0;
    d.daysRemaining = '';
    d.days_remaining = '';
  }
  return d;
}

/* Override by same name, preserving V8 public function name. */
function sp_mergeDeviceRental_(devices, rentals) {
  var rentMap = sp_latestRentalMap_(rentals || []);
  return (devices || []).map(function (d) {
    d = d || {};

    if (sp_v11IsWarehouseLocation_(d.location)) {
      return sp_v11NormalizeWarehouseDevice_(d);
    }

    var r = rentMap[String(d.idCode || '').toUpperCase()];
    if (!r) return sp_v11NormalizeWarehouseDevice_(d);

    var returnDate = r.returnDate || r.return_date || '';
    var rentalStatus = String(r.rentalStatus || r.rental_status || '').toUpperCase();
    var isOpen = !returnDate && rentalStatus !== 'RETURNED' && rentalStatus !== 'DONE' && rentalStatus !== 'COMPLETED';

    var status = d.status;
    if (isOpen && d.status !== 'Broken' && d.status !== 'Missing' && d.status !== 'Recheck') {
      status = Number(r.overdueDays || r.overdue_days || 0) > 0 ? 'Overdue' : 'In-Use';
    }

    d.borrower = isOpen ? (r.borrower || '-') : '-';
    d.borrowDate = isOpen ? (r.borrowDate || r.borrow_date || '') : '';
    d.borrow_date = d.borrowDate;
    d.expectedReturn = isOpen ? (r.expectedReturnDate || r.expected_return_date || r.dueDate || r.due_date || '') : '';
    d.expectedReturnDate = d.expectedReturn;
    d.expected_return_date = d.expectedReturn;
    d.dueDate = d.expectedReturn;
    d.due_date = d.expectedReturn;
    d.returnDate = returnDate;
    d.return_date = returnDate;
    d.overdueDays = isOpen ? Number(r.overdueDays || r.overdue_days || 0) : 0;
    d.overdue_days = d.overdueDays;
    d.daysRemaining = isOpen ? (r.daysRemaining || r.days_remaining || '') : '';
    d.days_remaining = d.daysRemaining;
    d.rentalStatus = isOpen ? (r.rentalStatus || r.rental_status || '') : d.rentalStatus;
    d.rental_status = d.rentalStatus;
    d.status = status;
    d.finalStatus = status;

    if (isOpen && r.location) d.location = r.location;

    return sp_v11NormalizeWarehouseDevice_(d);
  });
}

/* Override by same name, preserving V8 public function name. */
function sp_getAccessories_() {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.ACCESSORIES_CLEAN,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_1,
    STOCK_PRO.SHEETS.ACCESSORIES_FALLBACK_2
  ]);

  var rows = sp_readObjects_(sh);

  return rows.map(function (r) {
    var id = sp_str_(r.accessory_id || r.id_code || r.id || r.code || r.accessoryid);
    var team = sp_str_(r.team || r.department || r.group || 'GENERAL');
    var item = sp_str_(r.item_name || r.name || r.item || r.accessory || r.type);
    var qty = sp_num_(r.stock_qty || r.qty || r.quantity || r.stock || r.current_stock || 0);
    var min = sp_num_(r.min_stock_qty || r.minimum_stock || r.min_stock || r.min || 0);
    var action = sp_str_(r.action_required || r.action || r.recommendation || '');
    var status = sp_str_(r.status || '');

    if (!status) status = qty <= min ? 'LOW_STOCK' : 'STOCK';
    if (qty <= min && status === 'STOCK') status = 'LOW_STOCK';

    return {
      rowNumber: r._rowNumber,
      accessoryId: id,
      accessory_id: id,
      idCode: id,
      id_code: id,
      team: team,
      itemName: item,
      item_name: item,
      name: item,
      type: sp_str_(r.type || r.category || item || 'Accessory'),
      stockQty: qty,
      stock_qty: qty,
      qty: qty,
      quantity: qty,
      minStockQty: min,
      min_stock_qty: min,
      minStock: min,
      minimum_stock: min,
      status: status,
      actionRequired: action,
      action_required: action,
      location: sp_str_(r.location || ''),
      remark: sp_str_(r.remark || r.note || '')
    };
  }).filter(function (a) {
    return a.itemName || a.accessoryId || a.stockQty;
  });
}

/* Override by same name, preserving V8 public function name, with richer filters. */
function sp_getStockPayload_(forceRefresh) {
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(STOCK_PRO.CACHE.INVENTORY);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
  }

  var devices = sp_mergeDeviceRental_(sp_getDevices_(), sp_getRental_());
  var rentals = sp_getRental_();
  var accessories = sp_getAccessories_();

  var payload = {
    success: true,
    timestamp: new Date().toISOString(),
    inventory: devices,
    devices: devices,
    rental: rentals,
    rentals: rentals,
    accessories: accessories,
    filters: {
      brands: sp_unique_(devices.map(function (d) { return d.brand; })),
      models: sp_unique_(devices.map(function (d) { return d.model; })),
      locations: sp_unique_(devices.map(function (d) { return d.location; })),
      statuses: sp_unique_(devices.map(function (d) { return d.status; })),
      accessoryTypes: sp_unique_(accessories.map(function (a) { return a.type; })),
      accessoryTeams: sp_unique_(accessories.map(function (a) { return a.team; })),
      accessoryItems: sp_unique_(accessories.map(function (a) { return a.itemName || a.name; })),
      accessoryStatuses: sp_unique_(accessories.map(function (a) { return a.status; })),
      accessoryActions: sp_unique_(accessories.map(function (a) { return a.actionRequired; }))
    }
  };

  try { cache.put(STOCK_PRO.CACHE.INVENTORY, JSON.stringify(payload), STOCK_PRO.CACHE.TTL_SECONDS); } catch (e2) {}
  return payload;
}


/* ============================================================
   CES Stock Pro V15 — Approval + Mail Routing Patch
   Additive over V8/V14. Existing functions are kept; this block
   overrides approval email routing and adds approve/reject API.
============================================================ */
STOCK_PRO.ACCESSORY_APPROVAL = STOCK_PRO.ACCESSORY_APPROVAL || {
  ADMIN_TO: 'Siripak.Ch@nhealth-asia.com',
  ADMIN_CC: 'Siripak.Ch@nhealth-asia.com',
  MANAGERS: {
    MED: ['Phuwasin.Yi@nhealth-asia.com'],
    LAB: ['Trithip.Ma@nhealth-asia.com', 'Natwara.Kh@nhealth-asia.com'],
    EHS: ['Noppadol.Kh@nhealth-asia.com', 'Nathithon.Ko@nhealth-asia.com'],
    TES: ['Kridsada.Bo@nhealth-asia.com']
  }
};

function sp_v15UniqueEmails_(arr) {
  var map = {}, out = [];
  (arr || []).join(',').split(/[;,]/).forEach(function (x) {
    var s = sp_str_(x);
    if (!s) return;
    var k = s.toLowerCase();
    if (!map[k]) { map[k] = true; out.push(s); }
  });
  return out;
}

function sp_v15TeamManagers_(teams) {
  var cfg = STOCK_PRO.ACCESSORY_APPROVAL || {};
  var mgr = cfg.MANAGERS || {};
  var out = [];
  (teams || []).forEach(function (t) {
    var key = sp_upper_(t);
    if (mgr[key]) out = out.concat(mgr[key]);
  });
  return sp_v15UniqueEmails_(out);
}

function sp_v15EnsureApprovalColumns_() {
  var sh = sp_accessoryApprovalSheet_();
  var values = sh.getDataRange().getValues();
  var headers = values.length ? values[0].map(function (h) { return sp_normHeader_(h); }) : [];
  var required = ['approved_by', 'approved_at', 'requester_email', 'requester_team', 'manager_to', 'admin_to', 'cc', 'approval_note'];
  required.forEach(function (h) {
    if (headers.indexOf(h) < 0) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
      headers.push(h);
    }
  });
  return sh;
}

function sp_v15SetApprovalCell_(sheet, row, headerName, value) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return sp_normHeader_(h); });
  var idx = headers.indexOf(sp_normHeader_(headerName));
  if (idx >= 0) sheet.getRange(row, idx + 1).setValue(value);
}

function sp_v15FindApprovalRow_(requestId) {
  var sh = sp_v15EnsureApprovalColumns_();
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return sp_normHeader_(h); });
  var idxReq = headers.indexOf('request_id');
  if (idxReq < 0) return null;
  for (var r = 1; r < values.length; r++) {
    if (sp_str_(values[r][idxReq]) === sp_str_(requestId)) {
      return { sheet: sh, row: r + 1, values: values[r], headers: headers };
    }
  }
  return null;
}

function sp_v15ApprovalField_(found, name) {
  var idx = found.headers.indexOf(sp_normHeader_(name));
  return idx >= 0 ? found.values[idx] : '';
}

function sp_appendAccessoryApproval_(a, qty, borrower, location, note, user) {
  var sh = sp_v15EnsureApprovalColumns_();
  var requestId = 'ACC-' + Utilities.formatDate(new Date(), STOCK_PRO.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 999);
  var requester = (typeof user === 'object' && user) ? user : { name: sp_str_(user), email: '', team: sp_str_(a.team || '') };
  var team = sp_str_(a.team || requester.team || '');
  var managers = sp_v15TeamManagers_([team]);
  var cfg = STOCK_PRO.ACCESSORY_APPROVAL || {};
  var adminTo = cfg.ADMIN_TO || STOCK_PRO.ALERT_EMAIL || Session.getActiveUser().getEmail();
  var cc = sp_v15UniqueEmails_([cfg.ADMIN_CC || '', requester.email || ''].concat(managers)).join(',');
  sh.appendRow([
    new Date(),
    requestId,
    a.accessoryId || a.idCode || a.id_code || '',
    team,
    a.itemName || a.item_name || a.name || '',
    Number(qty || 1),
    borrower || '',
    location || '',
    'PENDING_APPROVAL',
    note || '',
    requester.name || requester.id || sp_str_(user || ''),
    '', '', requester.email || '', requester.team || team, managers.join(','), adminTo, cc, ''
  ]);
  return requestId;
}

function sp_sendAccessoryApprovalEmail_(requests, borrower, location, requester) {
  try {
    if (!requests || !requests.length) return;
    requester = requester || {};
    var teams = sp_unique_(requests.map(function (r) { return r.team; }));
    var cfg = STOCK_PRO.ACCESSORY_APPROVAL || {};
    var to = cfg.ADMIN_TO || STOCK_PRO.ALERT_EMAIL || Session.getActiveUser().getEmail();
    var cc = sp_v15UniqueEmails_([cfg.ADMIN_CC || '', requester.email || ''].concat(sp_v15TeamManagers_(teams))).join(',');
    var url = ScriptApp.getService().getUrl();
    var html = '<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto">' +
      '<h2 style="color:#0f172a">CES Stock — Accessory Approval Request</h2>' +
      '<p><b>Requester:</b> ' + sp_str_(requester.name || requester.email || '-') + '<br>' +
      '<b>Borrower:</b> ' + sp_str_(borrower) + '<br><b>Location:</b> ' + sp_str_(location) + '</p>' +
      '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:12px;width:100%"><tr style="background:#f8fafc"><th>Request ID</th><th>Team</th><th>Item</th><th>Qty</th><th>Status</th><th>Action</th></tr>' +
      requests.map(function (r) {
        var approve = url ? (url + '?stockAction=approve_accessory&requestId=' + encodeURIComponent(r.requestId)) : '';
        return '<tr><td><b>' + r.requestId + '</b></td><td>' + sp_str_(r.team) + '</td><td>' + sp_str_(r.itemName) + '</td><td>' + r.qty + '</td><td>PENDING_APPROVAL</td><td>' + (approve ? '<a href="' + approve + '" style="background:#059669;color:white;padding:7px 10px;border-radius:8px;text-decoration:none">Approve</a>' : 'Open CES Hub') + '</td></tr>';
      }).join('') +
      '</table><p style="color:#64748b;font-size:12px">After approval, stock will be deducted and activity will be logged automatically.</p></div>';
    GmailApp.sendEmail(to, '[CES Stock] Accessory Approval Request (' + requests.length + ')', 'Accessory approval request', { htmlBody: html, cc: cc });
  } catch (err) {
    sp_logError_('sp_sendAccessoryApprovalEmail_V15', err);
  }
}

function si_approveAccessoryRequest(requestId, approverEmail) {
  try {
    var found = sp_v15FindApprovalRow_(requestId);
    if (!found) return { success: false, message: 'Request not found: ' + requestId };
    var status = sp_upper_(sp_v15ApprovalField_(found, 'status'));
    if (status === 'APPROVED') return { success: true, message: 'Already approved' };
    if (status === 'REJECTED') return { success: false, message: 'Request already rejected' };
    var accId = sp_v15ApprovalField_(found, 'accessory_id');
    var qty = Number(sp_v15ApprovalField_(found, 'qty') || 0);
    if (!accId || qty <= 0) return { success: false, message: 'Invalid request data' };
    var cut = sp_updateAccessoryQty_(accId, -qty, approverEmail || Session.getActiveUser().getEmail(), 'APPROVED issue request ' + requestId);
    if (!cut || !cut.success) return cut;
    sp_v15SetApprovalCell_(found.sheet, found.row, 'status', 'APPROVED');
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_by', approverEmail || Session.getActiveUser().getEmail());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_at', new Date());
    sp_appendActivityLog_('ACCESSORY_APPROVED', requestId, 'Accessory=' + accId + ', qty=' + qty, approverEmail || '');
    sp_clearStockCache();
    return { success: true, message: 'Approved and stock deducted', requestId: requestId, accessoryId: accId, qty: qty };
  } catch (err) {
    sp_logError_('si_approveAccessoryRequest', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_rejectAccessoryRequest(requestId, approverEmail, note) {
  try {
    var found = sp_v15FindApprovalRow_(requestId);
    if (!found) return { success: false, message: 'Request not found: ' + requestId };
    sp_v15SetApprovalCell_(found.sheet, found.row, 'status', 'REJECTED');
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_by', approverEmail || Session.getActiveUser().getEmail());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_at', new Date());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approval_note', note || 'Rejected');
    sp_appendActivityLog_('ACCESSORY_REJECTED', requestId, note || '', approverEmail || '');
    return { success: true, message: 'Rejected', requestId: requestId };
  } catch (err) {
    sp_logError_('si_rejectAccessoryRequest', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function stockHandleWebApproval_(e) {
  var p = (e && e.parameter) || {};
  if (p.stockAction === 'approve_accessory') {
    var res = si_approveAccessoryRequest(p.requestId, Session.getActiveUser().getEmail());
    return HtmlService.createHtmlOutput('<div style="font-family:Arial;padding:32px"><h2>' + (res.success ? 'Approved' : 'Error') + '</h2><p>' + res.message + '</p></div>');
  }
  if (p.stockAction === 'reject_accessory') {
    var rej = si_rejectAccessoryRequest(p.requestId, Session.getActiveUser().getEmail(), p.note || 'Rejected by email link');
    return HtmlService.createHtmlOutput('<div style="font-family:Arial;padding:32px"><h2>' + (rej.success ? 'Rejected' : 'Error') + '</h2><p>' + rej.message + '</p></div>');
  }
  return null;
}


/* ============================================================
   CES Stock Pro V16 — Approval email UX + requester notification
   Keeps all existing approval functions; overrides mail/approve/reject output only.
============================================================ */
function sp_v16ApprovalEmailTemplate_(requests, borrower, location, requester) {
  requester = requester || {};
  var url = ScriptApp.getService().getUrl();
  var rows = (requests || []).map(function(r) {
    var approve = url ? (url + '?stockAction=approve_accessory&requestId=' + encodeURIComponent(r.requestId)) : '';
    var reject  = url ? (url + '?stockAction=reject_accessory&requestId=' + encodeURIComponent(r.requestId)) : '';
    return '<tr>' +
      '<td style="padding:10px;border-bottom:1px solid #e2e8f0"><b style="color:#0f172a">' + sp_str_(r.requestId) + '</b></td>' +
      '<td style="padding:10px;border-bottom:1px solid #e2e8f0"><span style="background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:999px;font-weight:700;font-size:11px">' + sp_str_(r.team || '-') + '</span></td>' +
      '<td style="padding:10px;border-bottom:1px solid #e2e8f0">' + sp_str_(r.itemName || '-') + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center"><b>' + Number(r.qty || 1) + '</b></td>' +
      '<td style="padding:10px;border-bottom:1px solid #e2e8f0;white-space:nowrap">' +
      (approve ? '<a href="' + approve + '" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:8px 12px;border-radius:9px;font-weight:700;margin-right:6px">Approve</a>' : '') +
      (reject ? '<a href="' + reject + '" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:8px 12px;border-radius:9px;font-weight:700">Reject</a>' : '') +
      '</td></tr>';
  }).join('');
  return '<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">' +
    '<div style="max-width:820px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 14px 32px rgba(15,23,42,.08)">' +
    '<div style="background:#2563eb;color:#fff;padding:22px 26px"><h2 style="margin:0;font-size:22px">CES Stock — Accessory Approval</h2><p style="margin:6px 0 0;color:#dbeafe;font-size:13px">Please review and approve before stock deduction.</p></div>' +
    '<div style="padding:22px 26px;color:#334155;font-size:14px;line-height:1.6">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><b>Requester</b><br>' + sp_str_(requester.name || requester.email || '-') + '</div>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><b>Borrower / Location</b><br>' + sp_str_(borrower || '-') + ' / ' + sp_str_(location || '-') + '</div>' +
    '</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:13px">' +
    '<thead><tr style="background:#f1f5f9;color:#475569;text-align:left"><th style="padding:10px">Request</th><th style="padding:10px">Team</th><th style="padding:10px">Item</th><th style="padding:10px;text-align:center">Qty</th><th style="padding:10px">Action</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p style="font-size:12px;color:#64748b;margin-top:16px">After approval, stock will be deducted automatically and activity will be logged.</p>' +
    '</div></div></div>';
}

function sp_sendAccessoryApprovalEmail_(requests, borrower, location, requester) {
  try {
    if (!requests || !requests.length) return;
    requester = requester || {};
    var teams = sp_unique_(requests.map(function (r) { return r.team; }));
    var cfg = STOCK_PRO.ACCESSORY_APPROVAL || {};
    var to = cfg.ADMIN_TO || STOCK_PRO.ALERT_EMAIL || Session.getActiveUser().getEmail();
    var cc = sp_v15UniqueEmails_([cfg.ADMIN_CC || 'Siripak.Ch@nhealth-asia.com', requester.email || ''].concat(sp_v15TeamManagers_(teams))).join(',');
    GmailApp.sendEmail(to, '[CES Stock] Accessory Approval Request (' + requests.length + ')', 'Accessory approval request', {
      htmlBody: sp_v16ApprovalEmailTemplate_(requests, borrower, location, requester),
      cc: cc
    });
  } catch (err) {
    sp_logError_('sp_sendAccessoryApprovalEmail_V16', err);
  }
}

function sp_v16NotifyRequester_(found, decision, approver, note) {
  try {
    var email = sp_v15ApprovalField_(found, 'requester_email');
    if (!email) return;
    var reqId = sp_v15ApprovalField_(found, 'request_id');
    var item = sp_v15ApprovalField_(found, 'item_name');
    var qty = sp_v15ApprovalField_(found, 'qty');
    var ok = decision === 'APPROVED';
    var color = ok ? '#059669' : '#dc2626';
    var bg = ok ? '#ecfdf5' : '#fef2f2';
    var html = '<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">' +
      '<div style="background:' + color + ';color:white;padding:20px 24px"><h2 style="margin:0">Accessory Request ' + decision + '</h2></div>' +
      '<div style="padding:22px 24px;color:#334155"><div style="background:' + bg + ';border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px"><b>Request ID:</b> ' + sp_str_(reqId) + '<br><b>Item:</b> ' + sp_str_(item) + '<br><b>Qty:</b> ' + sp_str_(qty) + '<br><b>Approver:</b> ' + sp_str_(approver || '-') + '</div>' +
      '<p>' + (note ? sp_str_(note) : (ok ? 'Stock has been deducted and activity has been logged.' : 'The request was rejected.')) + '</p></div></div></div>';
    GmailApp.sendEmail(email, '[CES Stock] Accessory Request ' + decision + ' - ' + reqId, 'Accessory request ' + decision, { htmlBody: html });
  } catch (err) { sp_logError_('sp_v16NotifyRequester_', err); }
}

function si_approveAccessoryRequest(requestId, approverEmail) {
  try {
    var found = sp_v15FindApprovalRow_(requestId);
    if (!found) return { success: false, message: 'Request not found: ' + requestId };
    var status = sp_upper_(sp_v15ApprovalField_(found, 'status'));
    if (status === 'APPROVED') return { success: true, message: 'Already approved' };
    if (status === 'REJECTED') return { success: false, message: 'Request already rejected' };
    var accId = sp_v15ApprovalField_(found, 'accessory_id');
    var qty = Number(sp_v15ApprovalField_(found, 'qty') || 0);
    if (!accId || qty <= 0) return { success: false, message: 'Invalid request data' };
    var cut = sp_updateAccessoryQty_(accId, -qty, approverEmail || Session.getActiveUser().getEmail(), 'APPROVED issue request ' + requestId);
    if (!cut || !cut.success) return cut;
    sp_v15SetApprovalCell_(found.sheet, found.row, 'status', 'APPROVED');
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_by', approverEmail || Session.getActiveUser().getEmail());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_at', new Date());
    sp_appendActivityLog_('ACCESSORY_APPROVED', requestId, 'Accessory=' + accId + ', qty=' + qty, approverEmail || '');
    sp_v16NotifyRequester_(found, 'APPROVED', approverEmail || Session.getActiveUser().getEmail(), 'Stock has been deducted successfully.');
    sp_clearStockCache();
    return { success: true, message: 'Approved and stock deducted', requestId: requestId, accessoryId: accId, qty: qty };
  } catch (err) {
    sp_logError_('si_approveAccessoryRequest_V16', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_rejectAccessoryRequest(requestId, approverEmail, note) {
  try {
    var found = sp_v15FindApprovalRow_(requestId);
    if (!found) return { success: false, message: 'Request not found: ' + requestId };
    sp_v15SetApprovalCell_(found.sheet, found.row, 'status', 'REJECTED');
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_by', approverEmail || Session.getActiveUser().getEmail());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approved_at', new Date());
    sp_v15SetApprovalCell_(found.sheet, found.row, 'approval_note', note || 'Rejected');
    sp_appendActivityLog_('ACCESSORY_REJECTED', requestId, note || '', approverEmail || '');
    sp_v16NotifyRequester_(found, 'REJECTED', approverEmail || Session.getActiveUser().getEmail(), note || 'The request was rejected.');
    sp_clearStockCache();
    return { success: true, message: 'Rejected', requestId: requestId };
  } catch (err) {
    sp_logError_('si_rejectAccessoryRequest_V16', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function stockHandleWebApproval_(e) {
  var p = (e && e.parameter) || {};
  var res = null;
  if (p.stockAction === 'approve_accessory') res = si_approveAccessoryRequest(p.requestId, Session.getActiveUser().getEmail());
  if (p.stockAction === 'reject_accessory') res = si_rejectAccessoryRequest(p.requestId, Session.getActiveUser().getEmail(), p.note || 'Rejected by email link');
  if (!res) return null;
  var ok = res.success;
  var color = ok ? '#059669' : '#dc2626';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;min-height:100vh;padding:36px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;text-align:center;box-shadow:0 14px 32px rgba(15,23,42,.08)"><div style="width:64px;height:64px;border-radius:999px;background:' + color + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px">' + (ok ? '✓' : '!') + '</div><h2 style="margin:0 0 8px;color:#0f172a">' + (ok ? 'Completed' : 'Error') + '</h2><p style="color:#475569">' + sp_str_(res.message) + '</p></div></div>');
}


/* ============================================================
   CES Stock Pro V30 — Shared Data Status Normalization Patch
   Additive override. Keeps all existing helper names/functions.
   Fixes Stock Dashboard status counts: Overdue / Missing / Broken.
============================================================ */
function sp_v30Text_(arr) {
  return (arr || []).map(function (v) { return String(v || ''); }).join(' ').toUpperCase();
}

function sp_v30IsWarehouse_(location) {
  var t = String(location || '').toLowerCase();
  return /warehouse|stock|store|คลัง|คลังสินค้า|stock room|store room/.test(t);
}

function sp_v30NormalizeDeviceStatus_(d) {
  d = d || {};
  var text = sp_v30Text_([
    d.status, d.baseStatus, d.base_status, d.rentalStatus, d.rental_status,
    d.dqStatus, d.dq_status, d.actionRequired, d.action_required,
    d.recheckNote, d.recheck_note, d.note, d.finalStatus, d.final_status
  ]);

  var status = String(d.status || '').trim();

  // Priority order: physical/data-quality exceptions first.
  if (/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง/.test(text)) status = 'Broken';
  else if (/MISSING|LOST|สูญหาย|หาย|หาไม่พบ/.test(text)) status = 'Missing';
  else if (/RECHECK|RE-CHECK|ตรวจซ้ำ|ตรวจสอบซ้ำ/.test(text)) status = 'Recheck';
  else if (/OVERDUE|EXPIRED|เลยกำหนด|เกินกำหนด/.test(text) || Number(d.overdueDays || d.overdue_days || 0) > 0) status = 'Overdue';
  else if (sp_v30IsWarehouse_(d.location) && !/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) status = 'Stock';
  else if (/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) status = 'In-Use';
  else if (/STOCK|AVAILABLE|คลัง/.test(text) || !status) status = 'Stock';

  d.status = status;
  d.finalStatus = status;
  d.final_status = status;
  return d;
}

// Final payload override: normalize statuses after device/rental merge, then rebuild filters.
function sp_getStockPayload_(forceRefresh) {
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(STOCK_PRO.CACHE.INVENTORY);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
  }

  var rentals = sp_getRental_();
  var devices = sp_mergeDeviceRental_(sp_getDevices_(), rentals).map(sp_v30NormalizeDeviceStatus_);
  var accessories = sp_getAccessories_();

  var payload = {
    success: true,
    timestamp: new Date().toISOString(),
    inventory: devices,
    devices: devices,
    rental: rentals,
    rentals: rentals,
    accessories: accessories,
    filters: {
      brands: sp_unique_(devices.map(function (d) { return d.brand; })),
      models: sp_unique_(devices.map(function (d) { return d.model; })),
      locations: sp_unique_(devices.map(function (d) { return d.location; })),
      statuses: sp_unique_(devices.map(function (d) { return d.status; })),
      accessoryTypes: sp_unique_(accessories.map(function (a) { return a.type; })),
      accessoryTeams: sp_unique_(accessories.map(function (a) { return a.team; })),
      accessoryItems: sp_unique_(accessories.map(function (a) { return a.itemName || a.name; })),
      accessoryStatuses: sp_unique_(accessories.map(function (a) { return a.status; })),
      accessoryActions: sp_unique_(accessories.map(function (a) { return a.actionRequired; }))
    }
  };

  try { cache.put(STOCK_PRO.CACHE.INVENTORY, JSON.stringify(payload), STOCK_PRO.CACHE.TTL_SECONDS); } catch (e2) {}
  return payload;
}
