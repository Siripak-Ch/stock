// ============================================================
// CES Stock Pro V3 — Stock_Check.gs
// Check stock / OCR / scan API
// ============================================================

function sc_lookupStockDevice(keyword) {
  try {
    var q = sp_str_(keyword).toUpperCase();
    if (!q) return { success: false, message: 'Please input ID Code or Serial Number', data: [] };

    var payload = sp_getStockPayload_(false);
    var rows = (payload.inventory || []).filter(function (d) {
      return String(d.idCode || '').toUpperCase().indexOf(q) >= 0 ||
        String(d.sn || '').toUpperCase().indexOf(q) >= 0 ||
        String(d.serialNumber || '').toUpperCase().indexOf(q) >= 0 ||
        String(d.model || '').toUpperCase().indexOf(q) >= 0;
    });

    sp_appendScanLog_('LOOKUP', q, rows.length ? 'FOUND' : 'NOT_FOUND', rows.length + ' item(s)', '');

    return {
      success: true,
      count: rows.length,
      data: rows.slice(0, 20)
    };
  } catch (err) {
    sp_logError_('sc_lookupStockDevice', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}


function sc_getScanLogs(limit) {
  try {
    var ss = sp_ss_();
    var sh = ss.getSheetByName(STOCK_PRO.SHEETS.SCAN_LOG);
    if (!sh || sh.getLastRow() < 2) return { success: true, logs: [] };

    var n = Number(limit || 50);
    var last = sh.getLastRow();
    var start = Math.max(2, last - n + 1);
    var values = sh.getRange(start, 1, last - start + 1, 6).getDisplayValues();

    var logs = values.reverse().map(function (r) {
      return {
        timestamp: r[0],
        action: r[1],
        idCode: r[2],
        result: r[3],
        message: r[4],
        user: r[5]
      };
    });

    return { success: true, logs: logs };
  } catch (err) {
    sp_logError_('sc_getScanLogs', err);
    return { success: false, message: err.message, logs: [] };
  }
}


function sc_recordCheckAction(payload) {
  try {
    payload = payload || {};
    var action = sp_upper_(payload.action || 'LOOKUP');
    var idCode = sp_str_(payload.idCode || payload.id_code || payload.serialNumber || payload.sn);
    var user = sp_str_(payload.user || '');
    var location = sp_str_(payload.location || '');
    var borrower = sp_str_(payload.borrower || '');
    var note = sp_str_(payload.note || '');

    if (!idCode) return { success: false, message: 'Missing idCode' };

    var found = sp_findDeviceRow_(idCode);
    if (!found) {
      sp_appendScanLog_(action, idCode, 'NOT_FOUND', 'Device not found', user);
      return { success: false, message: 'Device not found: ' + idCode };
    }

    if (action === 'CHECK-IN') {
      if (found.idxStatus >= 0) found.sheet.getRange(found.row, found.idxStatus + 1).setValue('STOCK');
      if (found.idxLoc >= 0) found.sheet.getRange(found.row, found.idxLoc + 1).setValue(location || 'คลัง');
      sp_appendScanLog_(action, idCode, 'SUCCESS', note || 'Check-in completed', user);
      sp_clearStockCache();
      return { success: true, message: 'Check-in completed' };
    }

    if (action === 'CHECK-OUT') {
      if (!borrower || !location) return { success: false, message: 'Borrower and location are required' };

      if (found.idxStatus >= 0) found.sheet.getRange(found.row, found.idxStatus + 1).setValue('IN_USE');
      if (found.idxLoc >= 0) found.sheet.getRange(found.row, found.idxLoc + 1).setValue(location);

      sc_appendRental_(idCode, borrower, location, payload);
      sp_appendScanLog_(action, idCode, 'SUCCESS', 'Checkout to ' + borrower + ' / ' + location, user);
      sp_clearStockCache();
      return { success: true, message: 'Check-out completed' };
    }

    sp_appendScanLog_(action, idCode, 'SUCCESS', note || 'Action recorded', user);
    return { success: true, message: 'Action recorded' };

  } catch (err) {
    sp_logError_('sc_recordCheckAction', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}


function sc_appendRental_(idCode, borrower, location, payload) {
  var ss = sp_ss_();
  var sh = sp_getSheetAny_(ss, [
    STOCK_PRO.SHEETS.RENTAL_CLEAN,
    STOCK_PRO.SHEETS.RENTAL_FALLBACK
  ]);

  if (!sh) {
    sh = ss.insertSheet(STOCK_PRO.SHEETS.RENTAL_CLEAN);
    sh.appendRow([
      'rental_id', 'id_code', 'serial_number', 'brand', 'model',
      'borrower', 'location', 'borrow_date', 'duration_month',
      'expected_return_date', 'return_date', 'due_date',
      'days_remaining', 'overdue_days', 'rental_status',
      'final_status_after_rental', 'action_required', 'note', 'source_row'
    ]);
  }

  var p = payload || {};
  var borrowDate = sp_isoDate_(p.borrowDate || new Date());
  var dueDate = sp_isoDate_(p.expectedReturnDate || p.dueDate || p.returnDate || '');
  var duration = sp_num_(p.durationMonth || p.duration || 0);
  var rentalId = 'R-' + Utilities.formatDate(new Date(), STOCK_PRO.TIMEZONE, 'yyyyMMdd-HHmmss');

  sh.appendRow([
    rentalId,
    idCode,
    p.serialNumber || '',
    p.brand || '',
    p.model || '',
    borrower,
    location,
    borrowDate,
    duration,
    dueDate,
    '',
    dueDate,
    sp_daysRemaining_(dueDate),
    sp_overdueDays_(dueDate),
    'IN_USE',
    '',
    '',
    p.note || '',
    ''
  ]);
}


function sc_testLookup() {
  var res = sc_lookupStockDevice('CESR00001');
  Logger.log(JSON.stringify({ success: res.success, count: res.count }, null, 2));
  return res;
}


/* ============================================================
   CES Stock Pro V15 — Check Stock Accessory Issue API
============================================================ */
function sc_getAccessoryLookupOptions() {
  try {
    var payload = sp_getStockPayload_(false);
    var rows = payload.accessories || [];
    return { success:true, data:rows.map(function(a){ return { accessoryId:a.accessoryId || a.idCode || a.id_code || '', team:a.team || a.type || '', itemName:a.itemName || a.item_name || a.name || '', stockQty:Number(a.stockQty || a.qty || 0), minStockQty:Number(a.minStockQty || a.minStock || 0), status:a.status || '', actionRequired:a.actionRequired || a.action_required || '' }; }) };
  } catch (err) {
    sp_logError_('sc_getAccessoryLookupOptions', err);
    return { success:false, message:err.message, data:[] };
  }
}

function sc_requestAccessoryIssue(payload) {
  try {
    payload = payload || {};
    var accessory = payload.accessory || {};
    var qty = Math.max(1, Number(payload.qty || accessory.qty || 1));
    var borrower = sp_str_(payload.borrower || payload.requesterName || 'Accessory Issue');
    var location = sp_str_(payload.location || 'Issue');
    var due = sp_isoDate_(payload.expectedReturnDate || new Date());
    return si_checkoutCart({ equipment:[], accessories:[Object.assign({}, accessory, { qty:qty, issueQty:qty })], borrower:borrower, location:location, expectedReturnDate:due, note:payload.note || 'Issue accessory from Check Stock', requester:payload.requester || {} });
  } catch (err) {
    sp_logError_('sc_requestAccessoryIssue', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}
