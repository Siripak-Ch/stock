// ============================================================
// CES Stock Pro V6 — Stock_Inventory.gs
// Inventory + accessories + rent/equipment actions API.
// ============================================================

function si_getStockInventoryData(forceRefresh) {
  try {
    var payload = sp_getStockPayload_(forceRefresh === true);
    return {
      success: true,
      timestamp: payload.timestamp,
      inventory: payload.inventory,
      accessories: payload.accessories,
      filters: payload.filters,
      kpi: si_buildInventoryKpi_(payload.inventory, payload.accessories)
    };
  } catch (err) {
    sp_logError_('si_getStockInventoryData', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_buildInventoryKpi_(devices, accessories) {
  return {
    total: devices.length,
    stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
    inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
    risk: devices.filter(function (d) { return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck'; }).length,
    accessories: accessories.length,
    accLow: accessories.filter(function (a) { return Number(a.qty || 0) <= Number(a.minStock || 0); }).length
  };
}

function si_editEquipment(payload) {
  try {
    payload = payload || {};
    var idCode = sp_str_(payload.originalIdCode || payload.idCode || payload.id_code || payload.sn || payload.serialNumber);
    if (!idCode) return { success:false, message:'Missing device ID' };
    var fields = {
      idCode: payload.idCode || payload.id_code,
      serialNumber: payload.serialNumber || payload.sn,
      brand: payload.brand,
      model: payload.model,
      itemName: payload.itemName || payload.item_name,
      category: payload.category,
      location: payload.location,
      baseStatus: payload.baseStatus || payload.base_status,
      rentalStatus: payload.rentalStatus || payload.rental_status,
      actionRequired: payload.actionRequired || payload.action_required,
      recheckNote: payload.recheckNote || payload.recheck_note
    };
    return sp_updateDeviceRecord_(idCode, fields, payload.user || '');
  } catch (err) {
    sp_logError_('si_editEquipment', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_markEquipmentBroken(payload) {
  try {
    payload = payload || {};
    var idCode = sp_str_(payload.idCode || payload.id_code || payload.sn);
    if (!idCode) return { success:false, message:'Missing device ID' };
    return sp_updateDeviceRecord_(idCode, {
      baseStatus:'BROKEN',
      rentalStatus:'',
      actionRequired: payload.reason || 'Marked broken from web',
      recheckNote: payload.note || ''
    }, payload.user || '');
  } catch (err) {
    sp_logError_('si_markEquipmentBroken', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_deleteEquipment(payload) {
  try {
    payload = payload || {};
    var idCode = sp_str_(payload.idCode || payload.id_code || payload.sn);
    if (!idCode) return { success:false, message:'Missing device ID' };
    return sp_updateDeviceRecord_(idCode, {
      baseStatus:'DELETED',
      rentalStatus:'',
      actionRequired: payload.reason || 'Deleted / hidden from web',
      recheckNote: payload.note || ''
    }, payload.user || '');
  } catch (err) {
    sp_logError_('si_deleteEquipment', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_extendRental(payload) {
  try {
    payload = payload || {};
    var idCode = sp_str_(payload.idCode || payload.id_code || payload.sn);
    var due = sp_isoDate_(payload.expectedReturnDate || payload.dueDate || payload.expected_return_date);
    if (!idCode) return { success:false, message:'Missing device ID' };
    if (!due) return { success:false, message:'Missing expected return date' };
    var res = sp_updateLatestRental_(idCode, { expectedReturnDate: due, note: payload.note || 'Extend contract from web' }, payload.user || '');
    if (res.success) sp_updateDeviceRecord_(idCode, { rentalStatus:'IN_USE', actionRequired:'Contract extended', location:payload.location }, payload.user || '');
    return res;
  } catch (err) {
    sp_logError_('si_extendRental', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_returnEquipment(payload) {
  try {
    payload = payload || {};
    var idCode = sp_str_(payload.idCode || payload.id_code || payload.sn);
    if (!idCode) return { success:false, message:'Missing device ID' };
    var ret = sp_isoDate_(payload.returnDate || new Date());
    sp_updateLatestRental_(idCode, { returnDate: ret, note: payload.note || 'Return from web', finalStatusAfterRental:'STOCK' }, payload.user || '');
    var res = sp_updateDeviceRecord_(idCode, { rentalStatus:'STOCK', baseStatus:'STOCK', location:payload.location || 'Warehouse', actionRequired:'No action' }, payload.user || '');
    sp_appendScanLog_('RETURN', idCode, 'SUCCESS', payload.note || 'Return equipment', payload.user || '');
    return res;
  } catch (err) {
    sp_logError_('si_returnEquipment', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_bulkExtendRental(payload) {
  try {
    payload = payload || {};
    var ids = payload.ids || [];
    var ok = 0, fail = 0, errors = [];
    ids.forEach(function (id) {
      var r = si_extendRental({ idCode:id, expectedReturnDate:payload.expectedReturnDate, note:payload.note, user:payload.user });
      if (r && r.success) ok++; else { fail++; errors.push(id + ': ' + (r.message || 'failed')); }
    });
    sp_clearStockCache();
    return { success:true, message:'Extended ' + ok + ' item(s), failed ' + fail, ok:ok, fail:fail, errors:errors };
  } catch (err) {
    sp_logError_('si_bulkExtendRental', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_bulkReturnEquipment(payload) {
  try {
    payload = payload || {};
    var ids = payload.ids || [];
    var ok = 0, fail = 0, errors = [];
    ids.forEach(function (id) {
      var r = si_returnEquipment({ idCode:id, returnDate:payload.returnDate || new Date(), location:payload.location || 'Warehouse', note:payload.note, user:payload.user });
      if (r && r.success) ok++; else { fail++; errors.push(id + ': ' + (r.message || 'failed')); }
    });
    sp_clearStockCache();
    return { success:true, message:'Returned ' + ok + ' item(s), failed ' + fail, ok:ok, fail:fail, errors:errors };
  } catch (err) {
    sp_logError_('si_bulkReturnEquipment', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_checkoutCart(payload) {
  try {
    payload = payload || {};
    var equipment = payload.equipment || [];
    var accessories = payload.accessories || [];
    var borrower = sp_str_(payload.borrower);
    var location = sp_str_(payload.location);
    var due = sp_isoDate_(payload.expectedReturnDate || payload.dueDate);
    if (!borrower || !location || !due) return { success:false, message:'Borrower, location and due date are required' };

    var ok = 0, fail = 0, errors = [];
    equipment.forEach(function (it) {
      var id = sp_str_(it.idCode || it.id_code || it.sn);
      var r = sc_recordCheckAction({
        action:'CHECK-OUT', idCode:id, borrower:borrower, location:location,
        borrowDate:payload.borrowDate || new Date(), expectedReturnDate:due,
        note:payload.note || '', brand:it.brand, model:it.model, serialNumber:it.sn, user:payload.user || ''
      });
      if (r && r.success) ok++; else { fail++; errors.push(id + ': ' + (r.message || 'failed')); }
    });

    accessories.forEach(function (a) {
      var qty = Number(a.qty || a.issueQty || 1);
      var key = a.idCode || a.name || a.type;
      var r = sp_updateAccessoryQty_(key, -qty, payload.user || '', 'Issue to ' + borrower + ' / ' + location);
      if (r && r.success) ok++; else { fail++; errors.push(key + ': ' + (r.message || 'failed')); }
    });

    sp_appendActivityLog_('CHECKOUT_CART', borrower, 'equipment=' + equipment.length + ', accessories=' + accessories.length + ', location=' + location, payload.user || '');
    sp_clearStockCache();
    return { success:true, message:'Checkout completed. Success ' + ok + ', failed ' + fail, ok:ok, fail:fail, errors:errors };
  } catch (err) {
    sp_logError_('si_checkoutCart', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_issueAccessory(payload) {
  try {
    payload = payload || {};
    var key = payload.idCode || payload.id_code || payload.name || payload.type;
    var qty = Number(payload.qty || payload.issueQty || 1);
    if (!key) return { success:false, message:'Missing accessory ID/name' };
    if (!qty || qty < 1) return { success:false, message:'Invalid quantity' };
    var res = sp_updateAccessoryQty_(key, -qty, payload.user || '', payload.note || 'Issue accessory');
    return res;
  } catch (err) {
    sp_logError_('si_issueAccessory', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_adjustAccessory(payload) {
  try {
    payload = payload || {};
    var key = payload.idCode || payload.id_code || payload.name || payload.type;
    var delta = Number(payload.delta || 0);
    if (!key) return { success:false, message:'Missing accessory ID/name' };
    var res = sp_updateAccessoryQty_(key, delta, payload.user || '', payload.note || 'Adjust accessory');
    return res;
  } catch (err) {
    sp_logError_('si_adjustAccessory', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_testInventory() {
  var res = si_getStockInventoryData(true);
  Logger.log(JSON.stringify({ success: res.success, inventory: res.inventory ? res.inventory.length : 0, accessories: res.accessories ? res.accessories.length : 0 }, null, 2));
  return res;
}


// ============================================================
// CES Stock Pro V8 — ADDITIVE PATCH FROM V6 BASE
// Overrides backend behavior without removing V6 functions.
// - Accessories checkout creates approval request + email notification.
// - Restock supports new accessory schema.
// - KPI separates equipment and accessories.
// ============================================================
function si_buildInventoryKpi_(devices, accessories) {
  devices = devices || [];
  accessories = accessories || [];
  return {
    total: devices.length,
    stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
    inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
    overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
    missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
    broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
    recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
    risk: devices.filter(function (d) { return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck'; }).length,
    accessories: accessories.length,
    accTotalStock: accessories.reduce(function (s, a) { return s + Number(a.stockQty || a.qty || 0); }, 0),
    accLow: accessories.filter(function (a) { return Number(a.stockQty || a.qty || 0) <= Number(a.minStockQty || a.minStock || 0); }).length,
    accPending: accessories.filter(function (a) { return String(a.status || '').toUpperCase().indexOf('PENDING') >= 0; }).length,
    accTeams: sp_unique_(accessories.map(function (a) { return a.team; })).length
  };
}

function si_checkoutCart(payload) {
  try {
    payload = payload || {};
    var equipment = payload.equipment || [];
    var accessories = payload.accessories || [];
    var borrower = sp_str_(payload.borrower);
    var location = sp_str_(payload.location);
    var due = sp_isoDate_(payload.expectedReturnDate || payload.dueDate);
    if (!borrower || !location || !due) return { success: false, message: 'Borrower, location and due date are required' };

    var ok = 0, fail = 0, errors = [];
    equipment.forEach(function (it) {
      var id = sp_str_(it.idCode || it.id_code || it.sn);
      var r = sc_recordCheckAction({
        action: 'CHECK-OUT', idCode: id, borrower: borrower, location: location,
        borrowDate: payload.borrowDate || new Date(), expectedReturnDate: due,
        note: payload.note || '', brand: it.brand, model: it.model, serialNumber: it.sn, user: payload.user || ''
      });
      if (r && r.success) ok++; else { fail++; errors.push(id + ': ' + (r.message || 'failed')); }
    });

    var approvals = [];
    accessories.forEach(function (a) {
      var qty = Number(a.qty || a.issueQty || 1);
      var requestId = sp_appendAccessoryApproval_(a, qty, borrower, location, payload.note || '', payload.user || '');
      approvals.push({ requestId: requestId, team: a.team || '', itemName: a.itemName || a.name || '', qty: qty });
      ok++;
    });
    if (approvals.length) sp_sendAccessoryApprovalEmail_(approvals, borrower, location);

    sp_appendActivityLog_('CHECKOUT_CART', borrower, 'equipment=' + equipment.length + ', accessory_approval=' + accessories.length + ', location=' + location, payload.user || '');
    sp_clearStockCache();
    return {
      success: true,
      message: 'Checkout completed. Equipment checked-out: ' + equipment.length + '. Accessory approval request(s): ' + accessories.length + '. Failed: ' + fail,
      ok: ok,
      fail: fail,
      errors: errors,
      equipmentDone: equipment.length,
      accessoryRequests: accessories.length,
      approvals: approvals
    };
  } catch (err) {
    sp_logError_('si_checkoutCart_V8', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_submitMixedCheckout(payload) {
  return si_checkoutCart(payload);
}

function si_restockAccessory(payload) {
  try {
    payload = payload || {};
    var key = payload.accessoryId || payload.accessory_id || payload.idCode || payload.id_code || payload.itemName || payload.name;
    var qty = Number(payload.qty || payload.delta || 0);
    if (!key) return { success: false, message: 'Missing accessory id/name' };
    if (!qty || qty < 1) return { success: false, message: 'Invalid restock quantity' };
    return sp_updateAccessoryQty_(key, qty, payload.user || '', payload.note || 'Restock accessory');
  } catch (err) {
    sp_logError_('si_restockAccessory', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}


/* ============================================================
   CES Stock Pro V12 — Inventory additive backend
   - Update min_stock_qty from Accessories card
   - Does not remove or rename V8/V11 functions
============================================================ */
function si_updateAccessoryMinStock(payload) {
  try {
    payload = payload || {};
    var key = payload.accessoryId || payload.accessory_id || payload.idCode || payload.id_code || payload.itemName || payload.name;
    var minStock = Number(payload.minStockQty || payload.min_stock_qty || payload.minStock || payload.minimum_stock || 0);
    if (!key) return { success: false, message: 'Missing accessory id/name' };
    if (isNaN(minStock) || minStock < 0) return { success: false, message: 'Invalid minimum stock value' };

    var found = sp_findAccessoryRow_(key);
    if (!found) return { success: false, message: 'Accessory not found: ' + key };
    if (found.idxMin < 0) return { success: false, message: 'Minimum stock column not found' };

    found.sheet.getRange(found.row, found.idxMin + 1).setValue(minStock);

    var current = found.idxStock >= 0 ? sp_num_(found.sheet.getRange(found.row, found.idxStock + 1).getValue()) : 0;
    sp_setCellByHeaders_(found.sheet, found.row, found.headers, ['status'], current <= minStock ? 'LOW_STOCK' : 'STOCK');
    sp_setCellByHeaders_(found.sheet, found.row, found.headers, ['action_required', 'action'], current <= minStock ? 'Restock required' : 'No action');
    sp_appendActivityLog_('ACCESSORY_MIN_STOCK_UPDATE', key, 'new_min=' + minStock + ', current=' + current, payload.user || '');
    sp_clearStockCache();

    return { success: true, message: 'Minimum stock updated', minStockQty: minStock, stockQty: current };
  } catch (err) {
    sp_logError_('si_updateAccessoryMinStock', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}


/* ============================================================
   CES Stock Pro V13 — Inventory backend additions
   - Batch update min stock from Settings button
   - History button data source from Stock_Activity_Log / Stock_Scan_Log
   Additive only: no existing function removed.
============================================================ */
function si_updateAccessoryMinStockBatch(payload) {
  try {
    payload = payload || {};
    var items = payload.items || [];
    if (!items.length) return { success: false, message: 'No items to update' };
    var ok = 0, fail = 0, errors = [];
    items.forEach(function (it) {
      var r = si_updateAccessoryMinStock(it);
      if (r && r.success) ok++; else { fail++; errors.push((it.accessoryId || it.itemName || '-') + ': ' + (r.message || 'failed')); }
    });
    sp_appendActivityLog_('ACCESSORY_MIN_STOCK_BATCH_UPDATE', 'BATCH', 'ok=' + ok + ', fail=' + fail, payload.user || '');
    sp_clearStockCache();
    return { success: true, message: 'Minimum stock updated: ' + ok + ' item(s). Failed: ' + fail, ok: ok, fail: fail, errors: errors };
  } catch (err) {
    sp_logError_('si_updateAccessoryMinStockBatch', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_getInventoryHistory(request) {
  try {
    var scope = 'all';
    var limit = 80;

    if (typeof request === 'object' && request !== null) {
      scope = sp_str_(request.scope || 'all').toLowerCase();
      limit = Number(request.limit || 80);
    } else {
      limit = Number(request || 80);
    }

    var ss = sp_ss_();
    var n = Number(limit || 80);
    var out = [];

    function isAccessoryHistory_(item) {
      var text = [item.action, item.refId, item.detail, item.source].join(' ').toUpperCase();
      return text.indexOf('ACCESSORY') >= 0 || text.indexOf('ACC') >= 0 || text.indexOf('MIN_STOCK') >= 0 || text.indexOf('RESTOCK') >= 0 || text.indexOf('APPROVAL') >= 0;
    }

    function isEquipmentHistory_(item) {
      var text = [item.action, item.refId, item.detail, item.source].join(' ').toUpperCase();
      return !isAccessoryHistory_(item) || text.indexOf('EQUIPMENT') >= 0 || text.indexOf('CHECK') >= 0 || text.indexOf('RENTAL') >= 0 || text.indexOf('RETURN') >= 0 || text.indexOf('BROKEN') >= 0;
    }

    var act = ss.getSheetByName(STOCK_PRO.SHEETS.ACTIVITY_LOG || 'Stock_Activity_Log');
    if (act && act.getLastRow() > 1) {
      var vals = act.getDataRange().getDisplayValues();
      var head = vals[0].map(function (h) { return sp_normHeader_(h); });
      var idxTs = head.indexOf('timestamp');
      var idxAct = head.indexOf('action');
      var idxRef = head.indexOf('ref_id');
      if (idxRef < 0) idxRef = head.indexOf('refid');
      var idxDetail = head.indexOf('detail');
      var idxUser = head.indexOf('user');
      for (var i = vals.length - 1; i >= 1; i--) {
        out.push({
          source: 'Activity',
          timestamp: idxTs >= 0 ? vals[i][idxTs] : '',
          action: idxAct >= 0 ? vals[i][idxAct] : '',
          refId: idxRef >= 0 ? vals[i][idxRef] : '',
          detail: idxDetail >= 0 ? vals[i][idxDetail] : vals[i].join(' | '),
          user: idxUser >= 0 ? vals[i][idxUser] : ''
        });
      }
    }

    var scan = ss.getSheetByName(STOCK_PRO.SHEETS.SCAN_LOG || 'Stock_Scan_Log');
    if (scan && scan.getLastRow() > 1) {
      var sv = scan.getDataRange().getDisplayValues();
      var sh = sv[0].map(function (h) { return sp_normHeader_(h); });
      var sTs = sh.indexOf('timestamp'), sAct = sh.indexOf('action'), sId = sh.indexOf('idcode');
      if (sId < 0) sId = sh.indexOf('id_code');
      var sRes = sh.indexOf('result'), sMsg = sh.indexOf('message'), sUser = sh.indexOf('user');
      for (var j = sv.length - 1; j >= 1; j--) {
        out.push({
          source: 'Scan',
          timestamp: sTs >= 0 ? sv[j][sTs] : '',
          action: sAct >= 0 ? sv[j][sAct] : 'SCAN',
          refId: sId >= 0 ? sv[j][sId] : '',
          detail: (sRes >= 0 ? sv[j][sRes] : '') + ' ' + (sMsg >= 0 ? sv[j][sMsg] : ''),
          user: sUser >= 0 ? sv[j][sUser] : ''
        });
      }
    }

    if (scope === 'accessories' || scope === 'acc') {
      out = out.filter(isAccessoryHistory_);
    } else if (scope === 'equipment' || scope === 'equip') {
      out = out.filter(isEquipmentHistory_);
    }

    out.sort(function (a, b) {
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    });

    return { success: true, scope: scope, logs: out.slice(0, n) };
  } catch (err) {
    sp_logError_('si_getInventoryHistory', err);
    return { success: false, message: err.message, logs: [] };
  }
}


/* ============================================================
   CES Stock Pro V15 — Inventory Approval & Accessory Issue Patch
   Additive/override over V14. Accessories checkout requests approval.
============================================================ */
function si_checkoutCart(payload) {
  try {
    payload = payload || {};
    var equipment = payload.equipment || [];
    var accessories = payload.accessories || [];
    var borrower = sp_str_(payload.borrower);
    var location = sp_str_(payload.location);
    var due = sp_isoDate_(payload.expectedReturnDate || payload.dueDate);
    if (!borrower || !location || !due) return { success: false, message: 'Borrower, location and due date are required' };
    var requester = payload.requester || { name: payload.user || '', email: payload.userEmail || '', team: payload.userTeam || '' };
    var ok = 0, fail = 0, errors = [];
    equipment.forEach(function (it) {
      var id = sp_str_(it.idCode || it.id_code || it.sn);
      var r = sc_recordCheckAction({ action:'CHECK-OUT', idCode:id, borrower:borrower, location:location, borrowDate:payload.borrowDate || new Date(), expectedReturnDate:due, note:payload.note || '', brand:it.brand, model:it.model, serialNumber:it.sn, user:requester.email || requester.name || '' });
      if (r && r.success) ok++; else { fail++; errors.push(id + ': ' + (r.message || 'failed')); }
    });
    var approvals = [];
    accessories.forEach(function (a) {
      var qty = Math.max(1, Number(a.issueQty || a.qty || 1));
      var requestId = sp_appendAccessoryApproval_(a, qty, borrower, location, payload.note || '', requester);
      approvals.push({ requestId:requestId, team:a.team || requester.team || '', itemName:a.itemName || a.item_name || a.name || '', qty:qty });
      ok++;
    });
    if (approvals.length) sp_sendAccessoryApprovalEmail_(approvals, borrower, location, requester);
    sp_appendActivityLog_('CHECKOUT_CART', borrower, 'equipment=' + equipment.length + ', accessory_approval=' + accessories.length + ', location=' + location, requester.email || requester.name || '');
    sp_clearStockCache();
    return { success:true, message:'Checkout completed. Equipment checked-out: ' + equipment.length + '. Accessory approval request(s): ' + accessories.length + '.', ok:ok, fail:fail, errors:errors, equipmentDone:equipment.length, accessoryRequests:accessories.length, approvals:approvals };
  } catch (err) {
    sp_logError_('si_checkoutCart_V15', err);
    return { success:false, message:err.message, stack:err.stack };
  }
}

function si_getAccessoryLowStockAlerts() {
  try {
    var payload = sp_getStockPayload_(true);
    var rows = (payload.accessories || []).filter(function (a) { return Number(a.stockQty || a.qty || 0) <= Number(a.minStockQty || a.minStock || 0); });
    return { success:true, count:rows.length, data:rows };
  } catch (err) {
    sp_logError_('si_getAccessoryLowStockAlerts', err);
    return { success:false, message:err.message, data:[] };
  }
}


/* ============================================================
   CES Stock Pro V16 — Inventory backend additive patch
   - Pending approval KPI counts Stock_Accessory_Approval PENDING_APPROVAL rows.
   - Better scoped history.
   - Keeps all previous V15 functions; overrides only same public endpoints.
============================================================ */
function si_v16CountPendingAccessoryApprovals_() {
  try {
    var sh = sp_getOrCreateSheet_('Stock_Accessory_Approval', [
      'timestamp','request_id','accessory_id','team','item_name','qty','borrower','location','status','note','requested_by'
    ]);
    if (!sh || sh.getLastRow() < 2) return 0;
    var values = sh.getDataRange().getValues();
    var headers = values[0].map(function(h){ return sp_normHeader_(h); });
    var idx = headers.indexOf('status');
    if (idx < 0) return 0;
    var count = 0;
    for (var i=1;i<values.length;i++) {
      if (sp_upper_(values[i][idx]) === 'PENDING_APPROVAL') count++;
    }
    return count;
  } catch(e) { return 0; }
}

function si_buildInventoryKpi_(devices, accessories) {
  devices = devices || [];
  accessories = accessories || [];
  return {
    total: devices.length,
    stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
    inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
    overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
    missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
    broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
    recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
    risk: devices.filter(function (d) {
      return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck';
    }).length,
    accessories: accessories.length,
    accTotalStock: accessories.reduce(function (s, a) { return s + Number(a.stockQty || a.qty || 0); }, 0),
    accLow: accessories.filter(function (a) { return Number(a.stockQty || a.qty || 0) <= Number(a.minStockQty || a.minStock || 0); }).length,
    accPending: si_v16CountPendingAccessoryApprovals_(),
    accTeams: sp_unique_(accessories.map(function (a) { return a.team; })).length
  };
}

function si_getInventoryHistory(request) {
  try {
    var scope = 'all', limit = 80;
    if (typeof request === 'object' && request !== null) {
      scope = sp_str_(request.scope || 'all').toLowerCase();
      limit = Number(request.limit || 80);
    } else {
      limit = Number(request || 80);
    }
    var ss = sp_ss_();
    var out = [];
    function readSheet(sheetName, source) {
      var sh = ss.getSheetByName(sheetName);
      if (!sh || sh.getLastRow() < 2) return;
      var values = sh.getDataRange().getDisplayValues();
      var headers = values[0].map(function(h){ return sp_normHeader_(h); });
      for (var i=1;i<values.length;i++) {
        var obj = { source: source };
        headers.forEach(function(h, c){ obj[h] = values[i][c]; });
        var text = JSON.stringify(obj).toLowerCase();
        var isAcc = /accessory|acc-|accessory_|stock_accessory|restock|approval|low_stock|qty_update/.test(text);
        var isEq = /equipment|cesr|check-out|check-in|rental|device|broken|return/.test(text) && !isAcc;
        if (scope === 'accessories' && !isAcc) return;
        if (scope === 'equipment' && isAcc) return;
        out.push({
          timestamp: obj.timestamp || obj.date || obj.time || '',
          action: obj.action || obj.status || obj.result || source,
          refId: obj.ref_id || obj.request_id || obj.id_code || obj.accessory_id || '',
          detail: obj.detail || obj.message || obj.note || obj.item_name || '',
          user: obj.user || obj.requested_by || obj.approved_by || '',
          source: source
        });
      }
    }
    readSheet('Stock_Activity_Log', 'Activity');
    readSheet('Stock_Scan_Log', 'Scan');
    readSheet('Stock_Accessory_Approval', 'Approval');
    out.sort(function(a,b){ return String(b.timestamp || '').localeCompare(String(a.timestamp || '')); });
    return { success:true, scope:scope, logs:out.slice(0, limit) };
  } catch(err) {
    sp_logError_('si_getInventoryHistory_V16', err);
    return { success:false, message:err.message, logs:[] };
  }
}



/* ============================================================
   CES Stock Pro V28 — Approval + History Stability Patch
   Additive only. Keeps all previous inventory functions.
   Fixes:
   1) Approval link actually processes APPROVE/REJECT.
   2) Sends result email back to requester.
   3) History no longer fails when helper header function is missing.
   4) Approval sheet stores requester_email and audit fields.
============================================================ */

/** Header normalizer fallback/alias. Safe even if Stock_Config also has one. */
function sp_normHeader_(h) {
  return String(h || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function sp_normHead_(h) { return sp_normHeader_(h); }
function sp_normHead(h)  { return sp_normHeader_(h); }

function sp_v28WebAppUrl_() {
  try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; }
}

function sp_v28Now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
}

function sp_v28Safe_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sp_v28Email_(v) {
  v = String(v || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : '';
}

function sp_v28UserEmail_(user) {
  if (!user) return '';
  if (typeof user === 'string') return sp_v28Email_(user);
  return sp_v28Email_(user.email || user.mail || user.userEmail || user.id || '');
}

function sp_v28UserName_(user) {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return String(user.name || user.name_eng || user.name_th || user.displayName || user.email || '').trim();
}

function sp_v28TeamManagers_(team) {
  var t = String(team || '').toUpperCase();
  var map = {
    MED: ['Phuwasin.Yi@nhealth-asia.com'],
    LAB: ['Trithip.Ma@nhealth-asia.com', 'Natwara.Kh@nhealth-asia.com'],
    EHS: ['Noppadol.Kh@nhealth-asia.com', 'Nathithon.Ko@nhealth-asia.com'],
    TES: ['Kridsada.Bo@nhealth-asia.com']
  };
  if (t.indexOf('LAB') >= 0) return map.LAB;
  if (t.indexOf('EHS') >= 0) return map.EHS;
  if (t.indexOf('TES') >= 0) return map.TES;
  return map.MED;
}

function sp_v28ApprovalHeaders_() {
  return [
    'timestamp',
    'request_id',
    'accessory_id',
    'team',
    'item_name',
    'qty',
    'borrower',
    'location',
    'status',
    'note',
    'requested_by',
    'requester_email',
    'request_date',
    'approved_by',
    'approved_at',
    'decision_note'
  ];
}

function sp_v28ApprovalSheet_() {
  var sh = sp_getOrCreateSheet_('Stock_Accessory_Approval', sp_v28ApprovalHeaders_());
  var headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), sp_v28ApprovalHeaders_().length)).getDisplayValues()[0];
  var norm = headers.map(sp_normHeader_);
  var required = sp_v28ApprovalHeaders_();

  required.forEach(function (h) {
    if (norm.indexOf(sp_normHeader_(h)) < 0) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
      headers.push(h);
      norm.push(sp_normHeader_(h));
    }
  });
  return sh;
}

function sp_v28HeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var map = {};
  headers.forEach(function (h, i) { map[sp_normHeader_(h)] = i + 1; });
  return map;
}

function sp_v28GetByHeader_(rowValues, map, key) {
  var col = map[sp_normHeader_(key)];
  return col ? rowValues[col - 1] : '';
}

function sp_v28SetByHeader_(sheet, row, map, key, value) {
  var col = map[sp_normHeader_(key)];
  if (col) sheet.getRange(row, col).setValue(value);
}

function sp_v28FindApprovalRow_(requestId) {
  var sh = sp_v28ApprovalSheet_();
  if (sh.getLastRow() < 2) return null;
  var map = sp_v28HeaderMap_(sh);
  var idCol = map.request_id;
  if (!idCol) return null;

  var vals = sh.getRange(2, idCol, sh.getLastRow() - 1, 1).getDisplayValues();
  var target = String(requestId || '').trim();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === target) {
      var row = i + 2;
      var rowValues = sh.getRange(row, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
      return { sheet: sh, row: row, map: map, values: rowValues };
    }
  }
  return null;
}

/** Override/complete missing helper used by checkout. */
function sp_appendAccessoryApproval_(a, qty, borrower, location, note, requester) {
  var sh = sp_v28ApprovalSheet_();
  var map = sp_v28HeaderMap_(sh);
  var now = sp_v28Now_();
  var team = String(a.team || a.Team || '').trim();
  var accessoryId = String(a.accessoryId || a.accessory_id || a.idCode || a.id_code || a.itemName || a.name || '').trim();
  var itemName = String(a.itemName || a.item_name || a.name || accessoryId || '').trim();
  var requesterName = sp_v28UserName_(requester);
  var requesterEmail = sp_v28UserEmail_(requester);

  var requestId = 'ACC-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);

  var row = new Array(sh.getLastColumn()).fill('');
  function put(key, value) {
    var col = map[sp_normHeader_(key)];
    if (col) row[col - 1] = value;
  }

  put('timestamp', now);
  put('request_id', requestId);
  put('accessory_id', accessoryId);
  put('team', team);
  put('item_name', itemName);
  put('qty', Number(qty || 1));
  put('borrower', borrower || '');
  put('location', location || '');
  put('status', 'PENDING_APPROVAL');
  put('note', note || '');
  put('requested_by', requesterName || requesterEmail || '');
  put('requester_email', requesterEmail || '');
  put('request_date', now);

  sh.appendRow(row);
  try {
    sp_appendActivityLog_('ACCESSORY_APPROVAL_REQUEST', requestId, itemName + ' x' + qty + ' / ' + location, requesterEmail || requesterName || '');
  } catch (e) {}
  return requestId;
}

function sp_v28ApprovalActionUrl_(requestId, decision) {
  var url = sp_v28WebAppUrl_();
  if (!url) return '';
  return url + '?stockAction=accessoryApproval&decision=' + encodeURIComponent(decision) + '&requestId=' + encodeURIComponent(requestId);
}

/** Override/complete approval email sender. */
function sp_sendAccessoryApprovalEmail_(approvals, borrower, location, requester) {
  approvals = approvals || [];
  if (!approvals.length) return { success: true, message: 'No approvals to send' };

  var adminTo = 'Siripak.Ch@nhealth-asia.com';
  var ccSet = {};
  var requesterEmail = sp_v28UserEmail_(requester);
  var requesterName = sp_v28UserName_(requester);

  approvals.forEach(function (a) {
    sp_v28TeamManagers_(a.team).forEach(function (mail) { ccSet[mail] = true; });
  });
  if (requesterEmail) ccSet[requesterEmail] = true;

  var rows = approvals.map(function (a) {
    var approveUrl = sp_v28ApprovalActionUrl_(a.requestId, 'approve');
    var rejectUrl = sp_v28ApprovalActionUrl_(a.requestId, 'reject');
    return '<tr>' +
      '<td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">' + sp_v28Safe_(a.requestId) + '</td>' +
      '<td style="padding:12px;border-bottom:1px solid #e5e7eb;">' + sp_v28Safe_(a.team || '-') + '</td>' +
      '<td style="padding:12px;border-bottom:1px solid #e5e7eb;">' + sp_v28Safe_(a.itemName || '-') + '</td>' +
      '<td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:800;">' + sp_v28Safe_(a.qty || 1) + '</td>' +
      '<td style="padding:12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">' +
        '<a href="' + approveUrl + '" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:800;margin-right:8px;">Approve</a>' +
        '<a href="' + rejectUrl + '" style="display:inline-block;background:#ef4444;color:white;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:800;">Reject</a>' +
      '</td>' +
    '</tr>';
  }).join('');

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;color:#111827;">' +
      '<div style="max-width:760px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08);">' +
        '<div style="background:#2563eb;color:white;padding:24px 28px;">' +
          '<h2 style="margin:0;font-size:24px;">CES Stock — Accessory Approval</h2>' +
          '<p style="margin:6px 0 0;color:#dbeafe;">Please review and approve before stock deduction.</p>' +
        '</div>' +
        '<div style="padding:24px 28px;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">' +
            '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase;">Requester</div><div style="font-size:15px;font-weight:800;">' + sp_v28Safe_(requesterName || requesterEmail || '-') + '</div><div style="font-size:12px;color:#64748b;">' + sp_v28Safe_(requesterEmail || '') + '</div></div>' +
            '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;"><div style="font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase;">Borrower / Location</div><div style="font-size:15px;font-weight:800;">' + sp_v28Safe_(borrower || '-') + ' / ' + sp_v28Safe_(location || '-') + '</div></div>' +
          '</div>' +
          '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;font-size:13px;">' +
            '<thead><tr style="background:#f1f5f9;color:#334155;text-align:left;"><th style="padding:12px;">Request</th><th style="padding:12px;">Team</th><th style="padding:12px;">Item</th><th style="padding:12px;text-align:center;">Qty</th><th style="padding:12px;">Action</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
          '<p style="color:#64748b;font-size:12px;margin-top:18px;">After approval, stock will be deducted automatically and requester will receive notification.</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: adminTo,
    cc: Object.keys(ccSet).join(','),
    subject: '[CES Stock] Accessory Approval Request (' + approvals.length + ')',
    htmlBody: html
  });

  return { success: true };
}

/**
 * Main approval processor called by Code.gs doGet route.
 * decision: approve | reject
 */
function si_processAccessoryApproval(requestId, decision, approverEmail, decisionNote) {
  try {
    requestId = String(requestId || '').trim();
    decision = String(decision || '').toLowerCase().trim();
    approverEmail = String(approverEmail || Session.getActiveUser().getEmail() || '').trim();
    decisionNote = String(decisionNote || '').trim();

    if (!requestId) return { success: false, message: 'Missing requestId' };
    if (decision !== 'approve' && decision !== 'reject') return { success: false, message: 'Invalid decision' };

    var found = sp_v28FindApprovalRow_(requestId);
    if (!found) return { success: false, message: 'Request not found: ' + requestId };

    var status = String(sp_v28GetByHeader_(found.values, found.map, 'status') || '').toUpperCase();
    if (status === 'APPROVED' || status === 'REJECTED') {
      return { success: true, alreadyDone: true, status: status, requestId: requestId, message: 'This request is already ' + status };
    }

    var accessoryId = sp_v28GetByHeader_(found.values, found.map, 'accessory_id');
    var itemName = sp_v28GetByHeader_(found.values, found.map, 'item_name');
    var qty = Number(sp_v28GetByHeader_(found.values, found.map, 'qty') || 0);
    var borrower = sp_v28GetByHeader_(found.values, found.map, 'borrower');
    var location = sp_v28GetByHeader_(found.values, found.map, 'location');
    var requesterEmail = sp_v28Email_(sp_v28GetByHeader_(found.values, found.map, 'requester_email'));
    var requesterName = sp_v28GetByHeader_(found.values, found.map, 'requested_by');
    var team = sp_v28GetByHeader_(found.values, found.map, 'team');

    if (decision === 'approve') {
      if (!accessoryId) return { success: false, message: 'Missing accessory_id in approval row' };
      if (!qty || qty < 1) return { success: false, message: 'Invalid approval quantity' };

      var upd = sp_updateAccessoryQty_(accessoryId, -qty, approverEmail, 'APPROVED issue request ' + requestId + ' to ' + borrower + ' / ' + location);
      if (!upd || !upd.success) {
        return { success: false, message: (upd && upd.message) || 'Stock deduction failed' };
      }

      sp_v28SetByHeader_(found.sheet, found.row, found.map, 'status', 'APPROVED');
      sp_v28SetByHeader_(found.sheet, found.row, found.map, 'approved_by', approverEmail);
      sp_v28SetByHeader_(found.sheet, found.row, found.map, 'approved_at', sp_v28Now_());
      sp_v28SetByHeader_(found.sheet, found.row, found.map, 'decision_note', decisionNote || 'Approved by email link');

      try { sp_appendActivityLog_('ACCESSORY_APPROVED', requestId, accessoryId + ' x' + qty + ' -> ' + borrower + ' / ' + location, approverEmail); } catch (e) {}
      sp_clearStockCache();

      sp_v28SendApprovalResultEmail_({
        requestId: requestId,
        status: 'APPROVED',
        requesterEmail: requesterEmail,
        requesterName: requesterName,
        itemName: itemName,
        accessoryId: accessoryId,
        team: team,
        qty: qty,
        borrower: borrower,
        location: location,
        approver: approverEmail,
        note: decisionNote,
        newQty: upd.newQty
      });

      return { success: true, status: 'APPROVED', requestId: requestId, message: 'Approved and stock deducted', newQty: upd.newQty };
    }

    sp_v28SetByHeader_(found.sheet, found.row, found.map, 'status', 'REJECTED');
    sp_v28SetByHeader_(found.sheet, found.row, found.map, 'approved_by', approverEmail);
    sp_v28SetByHeader_(found.sheet, found.row, found.map, 'approved_at', sp_v28Now_());
    sp_v28SetByHeader_(found.sheet, found.row, found.map, 'decision_note', decisionNote || 'Rejected by email link');

    try { sp_appendActivityLog_('ACCESSORY_REJECTED', requestId, accessoryId + ' x' + qty + ' / ' + location, approverEmail); } catch (e) {}

    sp_v28SendApprovalResultEmail_({
      requestId: requestId,
      status: 'REJECTED',
      requesterEmail: requesterEmail,
      requesterName: requesterName,
      itemName: itemName,
      accessoryId: accessoryId,
      team: team,
      qty: qty,
      borrower: borrower,
      location: location,
      approver: approverEmail,
      note: decisionNote
    });

    return { success: true, status: 'REJECTED', requestId: requestId, message: 'Rejected and requester notified' };

  } catch (err) {
    sp_logError_('si_processAccessoryApproval', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

function sp_v28SendApprovalResultEmail_(info) {
  var to = sp_v28Email_(info.requesterEmail);
  if (!to) return { success: false, message: 'No requester email stored' };

  var isOk = info.status === 'APPROVED';
  var color = isOk ? '#059669' : '#ef4444';
  var title = isOk ? 'Accessory Request Approved' : 'Accessory Request Rejected';
  var subtitle = isOk ? 'Stock has been deducted automatically.' : 'Stock has not been deducted.';

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;color:#111827;">' +
      '<div style="max-width:620px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08);">' +
        '<div style="background:' + color + ';color:white;padding:22px 26px;">' +
          '<h2 style="margin:0;font-size:22px;">' + title + '</h2>' +
          '<p style="margin:6px 0 0;color:white;opacity:.9;">' + subtitle + '</p>' +
        '</div>' +
        '<div style="padding:24px 26px;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
            '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Request ID</td><td style="padding:8px;font-weight:800;">' + sp_v28Safe_(info.requestId) + '</td></tr>' +
            '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Item</td><td style="padding:8px;">' + sp_v28Safe_(info.itemName || info.accessoryId) + '</td></tr>' +
            '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Team / Qty</td><td style="padding:8px;">' + sp_v28Safe_(info.team || '-') + ' / ' + sp_v28Safe_(info.qty) + ' pcs</td></tr>' +
            '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Borrower / Location</td><td style="padding:8px;">' + sp_v28Safe_(info.borrower || '-') + ' / ' + sp_v28Safe_(info.location || '-') + '</td></tr>' +
            '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Approved by</td><td style="padding:8px;">' + sp_v28Safe_(info.approver || '-') + '</td></tr>' +
            (info.newQty !== undefined ? '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Remaining stock</td><td style="padding:8px;font-weight:800;">' + sp_v28Safe_(info.newQty) + '</td></tr>' : '') +
            (info.note ? '<tr><td style="padding:8px;color:#64748b;font-weight:800;">Note</td><td style="padding:8px;">' + sp_v28Safe_(info.note) + '</td></tr>' : '') +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: to,
    cc: 'Siripak.Ch@nhealth-asia.com',
    subject: '[CES Stock] ' + title + ' — ' + info.requestId,
    htmlBody: html
  });
  return { success: true };
}

function si_renderApprovalResultPage_(result) {
  var ok = result && result.success;
  var status = result && result.status ? result.status : '';
  var color = ok ? (status === 'REJECTED' ? '#ef4444' : '#059669') : '#ef4444';
  var icon = ok ? (status === 'REJECTED' ? '✕' : '✓') : '!';
  var title = ok ? (status === 'REJECTED' ? 'Request Rejected' : 'Request Approved') : 'Approval Error';
  var msg = (result && result.message) || 'Unable to process request';

  var html = '<!DOCTYPE html><html><head><base target="_top"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{width:min(620px,calc(100vw - 32px));background:#fff;border:1px solid #e5e7eb;border-radius:24px;box-shadow:0 20px 50px rgba(15,23,42,.12);overflow:hidden}.head{padding:32px;text-align:center;background:' + color + ';color:#fff}.icon{width:72px;height:72px;border-radius:999px;border:3px solid rgba(255,255,255,.75);display:inline-flex;align-items:center;justify-content:center;font-size:42px;font-weight:900;margin-bottom:14px}.body{padding:28px;text-align:center}.msg{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-top:16px;color:#475569}.btn{display:inline-block;margin-top:20px;padding:12px 18px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:800}</style></head><body>' +
    '<div class="card"><div class="head"><div class="icon">' + icon + '</div><h1 style="margin:0;font-size:26px;">' + title + '</h1><p style="margin:8px 0 0;opacity:.9;">CES Stock Approval</p></div><div class="body"><h2 style="margin:0 0 8px;">' + sp_v28Safe_(result.requestId || '') + '</h2><div class="msg">' + sp_v28Safe_(msg) + '</div><a class="btn" href="' + sp_v28WebAppUrl_() + '">Open CES Hub</a></div></div>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('CES Stock Approval');
}

/** Call this from Code.gs doGet(e). */
function si_handleStockApprovalRoute(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.stockAction || p.action || '').trim();
  if (action !== 'accessoryApproval') return null;

  var requestId = p.requestId || p.request_id || '';
  var decision = p.decision || p.status || '';
  var note = p.note || '';
  var approver = '';
  try { approver = Session.getActiveUser().getEmail() || ''; } catch (err) {}

  var result = si_processAccessoryApproval(requestId, decision, approver, note);
  return si_renderApprovalResultPage_(result);
}

/** Safer history endpoint. Overrides previous history function. */
function si_getInventoryHistory(request) {
  try {
    var scope = 'all', limit = 100;
    if (typeof request === 'object' && request !== null) {
      scope = sp_str_(request.scope || 'all').toLowerCase();
      limit = Number(request.limit || 100);
    } else if (request) {
      limit = Number(request || 100);
    }

    var ss = sp_ss_();
    var out = [];

    function readGeneric_(sheetName, source) {
      var sh = ss.getSheetByName(sheetName);
      if (!sh || sh.getLastRow() < 2) return;
      var values = sh.getDataRange().getDisplayValues();
      var headers = values[0].map(sp_normHeader_);

      for (var r = 1; r < values.length; r++) {
        var obj = {};
        headers.forEach(function (h, c) { if (h) obj[h] = values[r][c]; });

        var text = JSON.stringify(obj).toLowerCase();
        var isAcc = /accessory|acc-|acc_|stock_accessory|restock|approval|low_stock|qty_update|accessory_approval/.test(text);
        var isEq = /equipment|cesr|check-out|check-in|rental|device|broken|return|extend/.test(text) && !isAcc;

        if ((scope === 'accessories' || scope === 'acc') && !isAcc) return;
        if ((scope === 'equipment' || scope === 'equip') && isAcc) return;

        out.push({
          timestamp: obj.timestamp || obj.request_date || obj.approved_at || obj.date || obj.time || '',
          action: obj.action || obj.status || obj.result || source,
          refId: obj.ref_id || obj.request_id || obj.id_code || obj.idcode || obj.accessory_id || '',
          detail: obj.detail || obj.message || obj.note || obj.item_name || obj.decision_note || '',
          user: obj.user || obj.requested_by || obj.requester_email || obj.approved_by || '',
          source: source
        });
      }
    }

    readGeneric_('Stock_Activity_Log', 'Activity');
    readGeneric_('Stock_Scan_Log', 'Scan');
    readGeneric_('Stock_Accessory_Approval', 'Approval');

    out.sort(function (a, b) {
      var aa = String(a.timestamp || '');
      var bb = String(b.timestamp || '');
      return bb.localeCompare(aa);
    });

    return { success: true, scope: scope, logs: out.slice(0, limit) };
  } catch (err) {
    try { sp_logError_('si_getInventoryHistory_V28', err); } catch (e) {}
    return { success: false, message: err.message, logs: [] };
  }
}


/* ============================================================
   CES Stock Pro V30 — Pending Approval KPI + Web Approval APIs
   Additive override. Keeps all old inventory functions.
   Fixes:
   - Pending Approval KPI counts approval sheet, not accessory status only.
   - Notification popup can approve/reject requests directly.
   - Approval action sends requester email through si_processAccessoryApproval().
============================================================ */
function si_v30ApprovalSheet_() {
  if (typeof sp_v28ApprovalSheet_ === 'function') return sp_v28ApprovalSheet_();
  return sp_getOrCreateSheet_('Stock_Accessory_Approval', [
    'timestamp','request_id','accessory_id','team','item_name','qty','borrower','location','status','note','requested_by','requester_email','approved_by','approved_at','decision_note'
  ]);
}

function si_v30HeaderMap_(headers) {
  var map = {};
  (headers || []).forEach(function (h, i) { map[sp_normHeader_(h)] = i; });
  return map;
}

function si_v30Get_(row, map, names) {
  names = Array.isArray(names) ? names : [names];
  for (var i = 0; i < names.length; i++) {
    var k = sp_normHeader_(names[i]);
    if (map[k] !== undefined) return row[map[k]];
  }
  return '';
}

function si_v30IsPendingStatus_(status) {
  var s = String(status || '').toUpperCase().trim();
  if (!s) return false;
  if (s.indexOf('APPROVED') >= 0 || s.indexOf('REJECT') >= 0 || s.indexOf('CANCEL') >= 0) return false;
  return s.indexOf('PENDING') >= 0 || s === 'REQUESTED' || s === 'WAITING_APPROVAL';
}

function si_v30ReadApprovalRows_(pendingOnly, limit) {
  var sh = si_v30ApprovalSheet_();
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getDisplayValues();
  var headers = values[0];
  var map = si_v30HeaderMap_(headers);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var status = si_v30Get_(row, map, 'status');
    if (pendingOnly && !si_v30IsPendingStatus_(status)) continue;
    out.push({
      timestamp: si_v30Get_(row, map, ['timestamp','request_date','date']),
      requestId: si_v30Get_(row, map, ['request_id','requestid']),
      accessoryId: si_v30Get_(row, map, ['accessory_id','accessoryid','id_code','idcode']),
      team: si_v30Get_(row, map, 'team'),
      itemName: si_v30Get_(row, map, ['item_name','itemname','name']),
      qty: Number(si_v30Get_(row, map, 'qty') || 0),
      borrower: si_v30Get_(row, map, 'borrower'),
      location: si_v30Get_(row, map, 'location'),
      status: status,
      note: si_v30Get_(row, map, 'note'),
      requestedBy: si_v30Get_(row, map, ['requested_by','requestedby','requester_name']),
      requesterEmail: si_v30Get_(row, map, ['requester_email','requesteremail','email']),
      approvedBy: si_v30Get_(row, map, ['approved_by','approvedby']),
      approvedAt: si_v30Get_(row, map, ['approved_at','approvedat']),
      rowNumber: r + 1
    });
  }
  out.sort(function(a,b){ return String(b.timestamp || '').localeCompare(String(a.timestamp || '')); });
  return out.slice(0, Number(limit || 200));
}

function si_v16CountPendingAccessoryApprovals_() {
  try { return si_v30ReadApprovalRows_(true, 10000).length; } catch (e) { return 0; }
}

function si_getAccessoryApprovalAlerts(request) {
  try {
    request = request || {};
    var pendingOnly = request.pendingOnly !== false;
    var rows = si_v30ReadApprovalRows_(pendingOnly, request.limit || 200);
    return { success: true, count: rows.length, data: rows, approvals: rows };
  } catch (err) {
    try { sp_logError_('si_getAccessoryApprovalAlerts', err); } catch(e) {}
    return { success: false, message: err.message, data: [], approvals: [] };
  }
}

function si_approveAccessoryRequestFromWeb(payload) {
  payload = payload || {};
  var requestId = payload.requestId || payload.request_id || '';
  var approver = payload.approverEmail || payload.approver || '';
  try { if (!approver && typeof Session !== 'undefined') approver = Session.getActiveUser().getEmail(); } catch (e) {}
  var res = si_processAccessoryApproval(requestId, 'approve', approver, payload.note || 'Approved from CES Hub notification');
  sp_clearStockCache();
  return res;
}

function si_rejectAccessoryRequestFromWeb(payload) {
  payload = payload || {};
  var requestId = payload.requestId || payload.request_id || '';
  var approver = payload.approverEmail || payload.approver || '';
  try { if (!approver && typeof Session !== 'undefined') approver = Session.getActiveUser().getEmail(); } catch (e) {}
  var res = si_processAccessoryApproval(requestId, 'reject', approver, payload.note || 'Rejected from CES Hub notification');
  sp_clearStockCache();
  return res;
}

// Final KPI override: count pending approvals from Stock_Accessory_Approval sheet.
function si_buildInventoryKpi_(devices, accessories) {
  devices = devices || [];
  accessories = accessories || [];
  var pending = si_v16CountPendingAccessoryApprovals_();
  return {
    total: devices.length,
    stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
    inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
    overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
    missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
    broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
    recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
    risk: devices.filter(function (d) { return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck' || Number(d.overdueDays || 0) > 0; }).length,
    accessories: accessories.length,
    accTotalStock: accessories.reduce(function (s, a) { return s + Number(a.stockQty || a.stock_qty || a.qty || 0); }, 0),
    accLow: accessories.filter(function (a) { return Number(a.stockQty || a.stock_qty || a.qty || 0) <= Number(a.minStockQty || a.min_stock_qty || a.minStock || 0); }).length,
    accPending: pending,
    pendingApproval: pending,
    accTeams: sp_unique_(accessories.map(function (a) { return a.team; })).length
  };
}
/* ============================================================
   CES Stock Pro — Accessories Check Interval Patch
   Purpose:
   - Replace Thai A/B/C status text with universal interval fields
   - Add stock alerts: LOW_STOCK + CHECK_DUE + PENDING_APPROVAL
   - Keep existing checkout / approval / min-stock functions unchanged
   Paste this at the END of Stock_Inventory.gs / Stock_Inventory.js
============================================================ */

var SI_CHECK_INTERVAL = {
  FREQUENT: { code: 'MONTHLY',     days: 30,  label: 'Monthly',     priority: 1 },
  MEDIUM:   { code: 'QUARTERLY',   days: 90,  label: 'Quarterly',   priority: 2 },
  LOW:      { code: 'HALF_YEARLY', days: 180, label: 'Half-yearly', priority: 3 }
};

function si_ciNorm_(v) {
  return String(v == null ? '' : v).toLowerCase().trim();
}

function si_ciToday_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
}

function si_ciDateToYmd_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return '';
  var m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s.slice(0, 10);
}

function si_ciAddDays_(ymd, days) {
  var base = ymd ? new Date(ymd + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  return Utilities.formatDate(base, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
}

function si_ciDaysUntil_(ymd) {
  if (!ymd) return 999999;
  var today = new Date(si_ciToday_() + 'T00:00:00');
  var target = new Date(ymd + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function si_ciRuleForAccessory_(a) {
  a = a || {};
  var text = si_ciNorm_([
    a.itemName, a.item_name, a.name, a.type, a.category, a.remark,
    a.actionRequired, a.action_required, a.team
  ].join(' '));

  // High movement / consumable / disposable / frequently issued items.
  if (/tip|pipette|filter|glove|mask|tissue|paper|wipe|swab|alcohol|ppe|consumable|disposable|syringe|ถุงมือ|หน้ากาก|ทิชชู่|ของใช้แล้วทิ้ง/.test(text)) {
    return SI_CHECK_INTERVAL.FREQUENT;
  }

  // Reusable but operationally important accessories.
  if (/battery|batt|sensor|probe|cable|cord|adapter|aed|pad|cuff|charger|power|สาย|แบต|เซนเซอร์/.test(text)) {
    return SI_CHECK_INTERVAL.MEDIUM;
  }

  // Slow movement / spare / master stock / structural parts.
  return SI_CHECK_INTERVAL.LOW;
}

function si_ciPickInterval_(a) {
  a = a || {};
  var days = Number(a.checkIntervalDays || a.check_interval_days || a.intervalDays || a.interval_days || 0);
  var code = String(a.checkIntervalCode || a.check_interval_code || a.intervalCode || a.interval_code || '').toUpperCase().trim();

  if (days > 0) {
    if (!code) code = days <= 30 ? 'MONTHLY' : (days <= 90 ? 'QUARTERLY' : 'HALF_YEARLY');
    return { code: code, days: days, label: code.replace('_', '-'), priority: days <= 30 ? 1 : (days <= 90 ? 2 : 3) };
  }

  if (code === 'MONTHLY') return SI_CHECK_INTERVAL.FREQUENT;
  if (code === 'QUARTERLY') return SI_CHECK_INTERVAL.MEDIUM;
  if (code === 'HALF_YEARLY' || code === 'HALF-YEARLY' || code === 'SEMI_ANNUAL') return SI_CHECK_INTERVAL.LOW;

  return si_ciRuleForAccessory_(a);
}

function si_ciEnrichAccessory_(a) {
  a = a || {};
  var rule = si_ciPickInterval_(a);
  var stock = Number(a.stockQty || a.stock_qty || a.qty || 0);
  var minStock = Number(a.minStockQty || a.min_stock_qty || a.minStock || 0);
  var last = si_ciDateToYmd_(a.lastCheckDate || a.last_check_date || a.checkedDate || a.checked_date);
  var next = si_ciDateToYmd_(a.nextCheckDate || a.next_check_date);
  if (!next) next = last ? si_ciAddDays_(last, rule.days) : si_ciToday_();
  var dueIn = si_ciDaysUntil_(next);
  var stockStatus = stock <= minStock ? 'LOW_STOCK' : 'STOCK_OK';
  var checkStatus = dueIn < 0 ? 'OVERDUE' : (dueIn <= 0 ? 'DUE' : (dueIn <= 7 ? 'DUE_SOON' : 'OK'));

  a.checkIntervalCode = rule.code;
  a.check_interval_code = rule.code;
  a.checkIntervalDays = rule.days;
  a.check_interval_days = rule.days;
  a.checkIntervalLabel = rule.label;
  a.checkPriority = rule.priority;
  a.lastCheckDate = last;
  a.last_check_date = last;
  a.nextCheckDate = next;
  a.next_check_date = next;
  a.daysUntilCheck = dueIn;
  a.days_until_check = dueIn;
  a.stockStatus = stockStatus;
  a.stock_status = stockStatus;
  a.checkStatus = checkStatus;
  a.check_status = checkStatus;
  a.alertLevel = stockStatus === 'LOW_STOCK' ? 'LOW_STOCK' : (checkStatus === 'OVERDUE' || checkStatus === 'DUE' ? 'CHECK_DUE' : (checkStatus === 'DUE_SOON' ? 'CHECK_SOON' : 'OK'));
  a.alert_level = a.alertLevel;
  return a;
}

// Final override: decorate accessories before returning to frontend.
function si_getStockInventoryData(forceRefresh) {
  try {
    var payload = sp_getStockPayload_(forceRefresh === true);
    payload.accessories = (payload.accessories || []).map(si_ciEnrichAccessory_);
    return {
      success: true,
      timestamp: payload.timestamp,
      inventory: payload.inventory,
      accessories: payload.accessories,
      filters: payload.filters,
      kpi: si_buildInventoryKpi_(payload.inventory, payload.accessories)
    };
  } catch (err) {
    sp_logError_('si_getStockInventoryData_CHECK_INTERVAL', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

// Final KPI override: add check-due metrics while keeping existing equipment/accessory KPIs.
function si_buildInventoryKpi_(devices, accessories) {
  devices = devices || [];
  accessories = (accessories || []).map(si_ciEnrichAccessory_);
  var pending = 0;
  try { pending = si_v16CountPendingAccessoryApprovals_(); } catch (e) {}
  return {
    total: devices.length,
    stock: devices.filter(function (d) { return d.status === 'Stock'; }).length,
    inUse: devices.filter(function (d) { return d.status === 'In-Use'; }).length,
    overdue: devices.filter(function (d) { return d.status === 'Overdue' || Number(d.overdueDays || 0) > 0; }).length,
    missing: devices.filter(function (d) { return d.status === 'Missing'; }).length,
    broken: devices.filter(function (d) { return d.status === 'Broken'; }).length,
    recheck: devices.filter(function (d) { return d.status === 'Recheck'; }).length,
    risk: devices.filter(function (d) { return d.status === 'Overdue' || d.status === 'Missing' || d.status === 'Broken' || d.status === 'Recheck' || Number(d.overdueDays || 0) > 0; }).length,
    accessories: accessories.length,
    accTotalStock: accessories.reduce(function (s, a) { return s + Number(a.stockQty || a.stock_qty || a.qty || 0); }, 0),
    accLow: accessories.filter(function (a) { return a.stockStatus === 'LOW_STOCK'; }).length,
    accCheckDue: accessories.filter(function (a) { return a.checkStatus === 'DUE' || a.checkStatus === 'OVERDUE'; }).length,
    accCheckSoon: accessories.filter(function (a) { return a.checkStatus === 'DUE_SOON'; }).length,
    accMonthly: accessories.filter(function (a) { return a.checkIntervalCode === 'MONTHLY'; }).length,
    accQuarterly: accessories.filter(function (a) { return a.checkIntervalCode === 'QUARTERLY'; }).length,
    accHalfYearly: accessories.filter(function (a) { return a.checkIntervalCode === 'HALF_YEARLY'; }).length,
    accPending: pending,
    pendingApproval: pending,
    accTeams: sp_unique_(accessories.map(function (a) { return a.team; })).length
  };
}

function si_getAccessoryStockAlerts(request) {
  try {
    request = request || {};
    var payload = sp_getStockPayload_(true);
    var acc = (payload.accessories || []).map(si_ciEnrichAccessory_);
    var pending = [];
    try { pending = si_v30ReadApprovalRows_(true, request.limit || 200); } catch (e) {}
    return {
      success: true,
      lowStock: acc.filter(function (a) { return a.stockStatus === 'LOW_STOCK'; }),
      checkDue: acc.filter(function (a) { return a.checkStatus === 'DUE' || a.checkStatus === 'OVERDUE'; }),
      checkSoon: acc.filter(function (a) { return a.checkStatus === 'DUE_SOON'; }),
      pending: pending,
      count: 0
    };
  } catch (err) {
    sp_logError_('si_getAccessoryStockAlerts', err);
    return { success: false, message: err.message, lowStock: [], checkDue: [], checkSoon: [], pending: [] };
  }
}

function si_ciHeaderIndex_(headers, names) {
  names = Array.isArray(names) ? names : [names];
  var norm = headers.map(function (h) { return sp_normHeader_(h); });
  for (var i = 0; i < names.length; i++) {
    var idx = norm.indexOf(sp_normHeader_(names[i]));
    if (idx >= 0) return idx;
  }
  return -1;
}

function si_ciSetCell_(sheet, row, headers, names, value) {
  names = Array.isArray(names) ? names : [names];
  var idx = si_ciHeaderIndex_(headers, names);
  if (idx < 0) {
    idx = headers.length;
    headers.push(names[0]);
    sheet.getRange(1, idx + 1).setValue(names[0]);
  }
  sheet.getRange(row, idx + 1).setValue(value);
}

function si_updateAccessoryCheckResult(payload) {
  try {
    payload = payload || {};
    var key = payload.accessoryId || payload.accessory_id || payload.idCode || payload.id_code || payload.itemName || payload.name;
    if (!key) return { success: false, message: 'Missing accessory id/name' };

    var found = sp_findAccessoryRow_(key);
    if (!found) return { success: false, message: 'Accessory not found: ' + key };

    var values = found.sheet.getRange(found.row, 1, 1, found.sheet.getLastColumn()).getValues()[0];
    var obj = {};
    found.headers.forEach(function (h, i) { obj[sp_normHeader_(h)] = values[i]; });
    var enriched = si_ciEnrichAccessory_(obj);
    var intervalDays = Number(payload.checkIntervalDays || payload.check_interval_days || enriched.checkIntervalDays || 90);
    var checkDate = si_ciDateToYmd_(payload.checkDate || payload.check_date || new Date());
    var nextDate = si_ciAddDays_(checkDate, intervalDays);
    var physicalQty = payload.physicalQty !== undefined ? Number(payload.physicalQty) : '';
    var systemQty = Number(enriched.stockQty || enriched.stock_qty || enriched.qty || 0);
    var gap = physicalQty === '' || isNaN(physicalQty) ? '' : physicalQty - systemQty;
    var result = payload.result || payload.checkResult || (gap === '' || gap === 0 ? 'COUNT_OK' : 'COUNT_MISMATCH');

    var headers = found.sheet.getRange(1, 1, 1, found.sheet.getLastColumn()).getValues()[0];
    si_ciSetCell_(found.sheet, found.row, headers, ['check_interval_code'], payload.checkIntervalCode || payload.check_interval_code || enriched.checkIntervalCode);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_interval_days'], intervalDays);
    si_ciSetCell_(found.sheet, found.row, headers, ['last_check_date'], checkDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['next_check_date'], nextDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_result'], result);
    si_ciSetCell_(found.sheet, found.row, headers, ['physical_qty'], physicalQty);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_gap'], gap);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_note'], payload.note || payload.check_note || '');
    si_ciSetCell_(found.sheet, found.row, headers, ['checked_by'], payload.user || payload.checkedBy || '');
    si_ciSetCell_(found.sheet, found.row, headers, ['last_check_timestamp'], Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd HH:mm:ss'));

    if (payload.updateStock === true && physicalQty !== '' && !isNaN(physicalQty)) {
      si_ciSetCell_(found.sheet, found.row, headers, ['stock_qty','qty'], physicalQty);
    }

    sp_appendActivityLog_('ACCESSORY_STOCK_CHECK', key, 'result=' + result + ', physical=' + physicalQty + ', gap=' + gap + ', next=' + nextDate, payload.user || '');
    sp_clearStockCache();
    return { success: true, message: 'Stock check saved', lastCheckDate: checkDate, nextCheckDate: nextDate, result: result, stockGap: gap };
  } catch (err) {
    sp_logError_('si_updateAccessoryCheckResult', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}


/* ============================================================
   CES Stock Pro V31 — Check Interval Performance + Recheck Fix
   Final overrides for:
   1) reliable interval filtering data fields
   2) table alert payload for fast UI
   3) recheck always updates physical stock + last checked date
   4) stock_status/check_status/action_required recalculated after check
============================================================ */
function si_ciGetAny_(obj, keys, fallback) {
  obj = obj || {};
  keys = Array.isArray(keys) ? keys : [keys];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    var nk = sp_normHeader_(k);
    if (obj[nk] !== undefined && obj[nk] !== null && obj[nk] !== '') return obj[nk];
  }
  return fallback;
}

function si_ciObjFromFoundRow_(found) {
  var values = found.sheet.getRange(found.row, 1, 1, found.sheet.getLastColumn()).getValues()[0];
  var display = found.sheet.getRange(found.row, 1, 1, found.sheet.getLastColumn()).getDisplayValues()[0];
  var obj = {};
  found.headers.forEach(function (h, i) {
    var norm = sp_normHeader_(h);
    obj[norm] = values[i];
    obj[h] = values[i];
    // Alias common frontend/backend names.
    if (norm === 'accessoryid' || norm === 'accessory_id' || norm === 'idcode' || norm === 'id_code') obj.accessoryId = values[i];
    if (norm === 'itemname' || norm === 'item_name' || norm === 'name') obj.itemName = values[i];
    if (norm === 'team') obj.team = values[i];
    if (norm === 'stockqty' || norm === 'stock_qty' || norm === 'qty' || norm === 'currentstock' || norm === 'current_stock') obj.stockQty = values[i];
    if (norm === 'minstockqty' || norm === 'min_stock_qty' || norm === 'minstock' || norm === 'minimumstock' || norm === 'minimum_stock') obj.minStockQty = values[i];
    if (norm === 'checkintervalcode' || norm === 'check_interval_code' || norm === 'intervalcode' || norm === 'interval_code') obj.checkIntervalCode = values[i];
    if (norm === 'checkintervaldays' || norm === 'check_interval_days' || norm === 'intervaldays' || norm === 'interval_days') obj.checkIntervalDays = values[i];
    if (norm === 'lastcheckdate' || norm === 'last_check_date') obj.lastCheckDate = display[i] || values[i];
    if (norm === 'nextcheckdate' || norm === 'next_check_date') obj.nextCheckDate = display[i] || values[i];
    if (norm === 'status') obj.status = values[i];
    if (norm === 'actionrequired' || norm === 'action_required') obj.actionRequired = values[i];
  });
  return obj;
}

function si_ciFindStockHeaderNames_() {
  return ['stock_qty', 'stockQty', 'qty', 'current_stock', 'currentStock', 'stock'];
}

function si_ciFindMinHeaderNames_() {
  return ['min_stock_qty', 'minStockQty', 'minStock', 'minimum_stock', 'minimumStock'];
}

function si_ciAlertRow_(a) {
  a = si_ciEnrichAccessory_(a || {});
  var stock = Number(si_ciGetAny_(a, ['stockQty','stock_qty','qty','stockqty'], 0));
  var minStock = Number(si_ciGetAny_(a, ['minStockQty','min_stock_qty','minStock','minstockqty'], 0));
  return {
    accessoryId: si_ciGetAny_(a, ['accessoryId','accessory_id','idCode','id_code','idcode'], ''),
    itemName: si_ciGetAny_(a, ['itemName','item_name','name','itemname'], ''),
    team: si_ciGetAny_(a, ['team'], ''),
    stockQty: stock,
    minStockQty: minStock,
    stockGapToMin: stock - minStock,
    status: si_ciGetAny_(a, ['status'], ''),
    actionRequired: si_ciGetAny_(a, ['actionRequired','action_required','actionrequired'], ''),
    checkIntervalCode: a.checkIntervalCode,
    checkIntervalDays: a.checkIntervalDays,
    lastCheckDate: a.lastCheckDate || '',
    nextCheckDate: a.nextCheckDate || '',
    daysUntilCheck: a.daysUntilCheck,
    checkStatus: a.checkStatus,
    stockStatus: a.stockStatus,
    alertLevel: a.alertLevel
  };
}

// Faster alert API: return compact rows only. Avoid sending unnecessary large accessory objects to the modal.
function si_getAccessoryStockAlerts(request) {
  try {
    request = request || {};
    var payload = sp_getStockPayload_(true);
    var limit = Number(request.limit || 300);
    var acc = (payload.accessories || []).map(si_ciEnrichAccessory_);
    var pending = [];
    try { pending = si_v30ReadApprovalRows_(true, limit); } catch (e) {}
    function sortedRows(filterFn) {
      return acc.filter(filterFn).sort(function(a,b){
        var da = Number(a.daysUntilCheck || 999999), db = Number(b.daysUntilCheck || 999999);
        if (da !== db) return da - db;
        return String(a.team || '').localeCompare(String(b.team || ''));
      }).slice(0, limit).map(si_ciAlertRow_);
    }
    return {
      success: true,
      lowStock: sortedRows(function (a) { return a.stockStatus === 'LOW_STOCK'; }),
      checkDue: sortedRows(function (a) { return a.checkStatus === 'DUE' || a.checkStatus === 'OVERDUE'; }),
      checkSoon: sortedRows(function (a) { return a.checkStatus === 'DUE_SOON'; }),
      pending: pending,
      count: 0
    };
  } catch (err) {
    sp_logError_('si_getAccessoryStockAlerts_V31', err);
    return { success: false, message: err.message, lowStock: [], checkDue: [], checkSoon: [], pending: [] };
  }
}

// Recheck result: always update inventory stock to physical count, write last checked date, next due date, status/action.
function si_updateAccessoryCheckResult(payload) {
  try {
    payload = payload || {};
    var key = payload.accessoryId || payload.accessory_id || payload.idCode || payload.id_code || payload.itemName || payload.name;
    if (!key) return { success: false, message: 'Missing accessory id/name' };

    var found = sp_findAccessoryRow_(key);
    if (!found) return { success: false, message: 'Accessory not found: ' + key };

    var obj = si_ciObjFromFoundRow_(found);
    var enriched = si_ciEnrichAccessory_(obj);
    var intervalDays = Number(payload.checkIntervalDays || payload.check_interval_days || enriched.checkIntervalDays || 90);
    if (!intervalDays || intervalDays < 1) intervalDays = 90;
    var intervalCode = String(payload.checkIntervalCode || payload.check_interval_code || enriched.checkIntervalCode || 'QUARTERLY').toUpperCase();
    var checkDate = si_ciDateToYmd_(payload.checkDate || payload.check_date || new Date());
    var nextDate = si_ciAddDays_(checkDate, intervalDays);

    var currentSystemQty = Number(si_ciGetAny_(obj, ['stockQty','stock_qty','qty','stockqty'], 0));
    var minStock = Number(si_ciGetAny_(obj, ['minStockQty','min_stock_qty','minStock','minstockqty'], 0));
    var physicalQty = payload.physicalQty !== undefined ? Number(payload.physicalQty) : currentSystemQty;
    if (isNaN(physicalQty) || physicalQty < 0) return { success: false, message: 'Invalid physical quantity' };

    var gap = physicalQty - currentSystemQty;
    var stockGapToMin = physicalQty - minStock;
    var result = payload.result || payload.checkResult || (gap === 0 ? 'COUNT_OK' : 'COUNT_MISMATCH');
    var newStockStatus = physicalQty <= minStock ? 'LOW_STOCK' : 'STOCK_OK';
    var newDisplayStatus = physicalQty <= minStock ? 'LOW_STOCK' : 'STOCK';
    var newAction = physicalQty <= minStock ? 'Reorder / replenish stock' : 'No action';

    var headers = found.sheet.getRange(1, 1, 1, found.sheet.getLastColumn()).getValues()[0];
    si_ciSetCell_(found.sheet, found.row, headers, ['check_interval_code'], intervalCode);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_interval_days'], intervalDays);
    si_ciSetCell_(found.sheet, found.row, headers, ['last_check_date'], checkDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['next_check_date'], nextDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_result'], result);
    si_ciSetCell_(found.sheet, found.row, headers, ['physical_qty'], physicalQty);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_gap'], gap);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_gap_to_min'], stockGapToMin);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_note'], payload.note || payload.check_note || '');
    si_ciSetCell_(found.sheet, found.row, headers, ['checked_by'], payload.user || payload.checkedBy || Session.getActiveUser().getEmail() || '');
    si_ciSetCell_(found.sheet, found.row, headers, ['last_check_timestamp'], Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd HH:mm:ss'));

    // Always sync inventory stock to physical count after recheck.
    si_ciSetCell_(found.sheet, found.row, headers, si_ciFindStockHeaderNames_(), physicalQty);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_status'], newStockStatus);
    si_ciSetCell_(found.sheet, found.row, headers, ['check_status'], 'OK');
    si_ciSetCell_(found.sheet, found.row, headers, ['status'], newDisplayStatus);
    si_ciSetCell_(found.sheet, found.row, headers, ['action_required', 'actionRequired', 'action'], newAction);

    sp_appendActivityLog_('ACCESSORY_STOCK_RECHECK', key, 'physical=' + physicalQty + ', previous=' + currentSystemQty + ', gap=' + gap + ', next=' + nextDate + ', status=' + newDisplayStatus, payload.user || '');
    sp_clearStockCache();
    return { success: true, message: 'Stock recheck saved and inventory quantity updated', lastCheckDate: checkDate, nextCheckDate: nextDate, result: result, stockGap: gap, stockQty: physicalQty, status: newDisplayStatus };
  } catch (err) {
    sp_logError_('si_updateAccessoryCheckResult_V31', err);
    return { success: false, message: err.message, stack: err.stack };
  }
}

/* ============================================================
   CES Stock Pro V32 — Simplified Accessories Alerts + Preload
   Additive patch over V31. Paste at the END of Stock_Inventory.gs.
   - Alert API uses cached stock payload instead of force refresh.
   - getStockInventoryData preloads alerts + recent history.
   - Restock always writes current/restock date and updates stock/status.
   - Batch recheck updates physical stock count + last_check_date per item.
============================================================ */

function si_v32BuildAccessoryAlertsFromRows_(accessories, pendingRows, limit) {
  limit = Number(limit || 300);
  accessories = (accessories || []).map(function(a){ return si_ciEnrichAccessory_(a || {}); });

  function compact_(a) { return si_ciAlertRow_(a); }
  function sortByRisk_(a, b) {
    var ad = Number(a.daysUntilCheck || 999999), bd = Number(b.daysUntilCheck || 999999);
    if (ad !== bd) return ad - bd;
    var alow = a.stockStatus === 'LOW_STOCK' ? 0 : 1;
    var blow = b.stockStatus === 'LOW_STOCK' ? 0 : 1;
    if (alow !== blow) return alow - blow;
    return String(a.team || '').localeCompare(String(b.team || '')) || String(a.itemName || '').localeCompare(String(b.itemName || ''));
  }

  var action = accessories.filter(function(a){
    return a.stockStatus === 'LOW_STOCK' || a.checkStatus === 'DUE' || a.checkStatus === 'OVERDUE';
  }).sort(sortByRisk_).slice(0, limit).map(compact_);

  var soon = accessories.filter(function(a){ return a.checkStatus === 'DUE_SOON'; })
    .sort(sortByRisk_).slice(0, limit).map(compact_);

  var low = accessories.filter(function(a){ return a.stockStatus === 'LOW_STOCK'; })
    .sort(sortByRisk_).slice(0, limit).map(compact_);

  var due = accessories.filter(function(a){ return a.checkStatus === 'DUE' || a.checkStatus === 'OVERDUE'; })
    .sort(sortByRisk_).slice(0, limit).map(compact_);

  return {
    success: true,
    actionRequired: action,
    lowStock: low,
    checkDue: due,
    checkSoon: soon,
    pending: pendingRows || [],
    counts: {
      actionRequired: action.length,
      lowStock: low.length,
      checkDue: due.length,
      checkSoon: soon.length,
      pending: (pendingRows || []).length
    }
  };
}

// Fast alert API: do not force stock refresh every time the bell is opened.
function si_getAccessoryStockAlerts(request) {
  try {
    request = request || {};
    var limit = Number(request.limit || 300);
    var payload = sp_getStockPayload_(request.forceRefresh === true);
    var pending = [];
    try { pending = si_v30ReadApprovalRows_(true, limit); } catch (e) { pending = []; }
    return si_v32BuildAccessoryAlertsFromRows_(payload.accessories || [], pending, limit);
  } catch (err) {
    try { sp_logError_('si_getAccessoryStockAlerts_V32', err); } catch(e) {}
    return { success: false, message: err.message, actionRequired: [], lowStock: [], checkDue: [], checkSoon: [], pending: [], counts: {} };
  }
}

// Keep a reference to the latest stock loader, then enrich its response with small preloaded data.
var si_v32Base_getStockInventoryData = si_getStockInventoryData;
function si_getStockInventoryData(forceRefresh) {
  var res = si_v32Base_getStockInventoryData(forceRefresh === true);
  if (res && res.success) {
    try {
      var pending = [];
      try { pending = si_v30ReadApprovalRows_(true, 300); } catch (e) { pending = []; }
      res.preloadedAlerts = si_v32BuildAccessoryAlertsFromRows_(res.accessories || [], pending, 300);
      res.alerts = res.preloadedAlerts;
      res.kpi = res.kpi || {};
      res.kpi.accPending = pending.length;
      res.kpi.pendingApproval = pending.length;
      res.kpi.accActionRequired = (res.preloadedAlerts.counts && res.preloadedAlerts.counts.actionRequired) || 0;
    } catch (alertErr) {
      res.preloadedAlerts = { success:false, message:alertErr.message, actionRequired:[], pending:[] };
    }
    try {
      res.preloadedHistory = {
        accessories: si_getInventoryHistory({ scope:'accessories', limit:80 }),
        equipment: si_getInventoryHistory({ scope:'equipment', limit:80 })
      };
    } catch (histErr) {
      res.preloadedHistory = { accessories:{success:false, logs:[]}, equipment:{success:false, logs:[]} };
    }
  }
  return res;
}

// Restock: always stamp current date by default, update stock quantity, status and action.
function si_restockAccessory(payload) {
  try {
    payload = payload || {};
    var key = payload.accessoryId || payload.accessory_id || payload.idCode || payload.id_code || payload.itemName || payload.name;
    var qty = Number(payload.qty || payload.delta || 0);
    if (!key) return { success: false, message: 'Missing accessory id/name' };
    if (!qty || qty < 1) return { success: false, message: 'Invalid restock quantity' };

    var found = sp_findAccessoryRow_(key);
    if (!found) return { success: false, message: 'Accessory not found: ' + key };

    var obj = si_ciObjFromFoundRow_(found);
    var current = Number(si_ciGetAny_(obj, ['stockQty','stock_qty','qty','stockqty'], 0));
    var minStock = Number(si_ciGetAny_(obj, ['minStockQty','min_stock_qty','minStock','minstockqty'], 0));
    var newQty = current + qty;
    var restockDate = si_ciDateToYmd_(payload.restockDate || payload.restock_date || new Date());
    var user = payload.user || Session.getActiveUser().getEmail() || '';
    var headers = found.sheet.getRange(1, 1, 1, found.sheet.getLastColumn()).getValues()[0];
    var newDisplayStatus = newQty <= minStock ? 'LOW_STOCK' : 'STOCK';
    var newStockStatus = newQty <= minStock ? 'LOW_STOCK' : 'STOCK_OK';
    var newAction = newQty <= minStock ? 'Reorder / replenish stock' : 'No action';

    si_ciSetCell_(found.sheet, found.row, headers, si_ciFindStockHeaderNames_(), newQty);
    si_ciSetCell_(found.sheet, found.row, headers, ['restock_date','last_restock_date','last_stock_in_date'], restockDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['restock_qty','last_restock_qty'], qty);
    si_ciSetCell_(found.sheet, found.row, headers, ['restock_by','updated_by'], user);
    si_ciSetCell_(found.sheet, found.row, headers, ['last_update_date','updated_date'], restockDate);
    si_ciSetCell_(found.sheet, found.row, headers, ['status'], newDisplayStatus);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_status'], newStockStatus);
    si_ciSetCell_(found.sheet, found.row, headers, ['stock_gap_to_min'], newQty - minStock);
    si_ciSetCell_(found.sheet, found.row, headers, ['action_required', 'actionRequired', 'action'], newAction);

    sp_appendActivityLog_('ACCESSORY_RESTOCK', key, 'added=' + qty + ', previous=' + current + ', new=' + newQty + ', restock_date=' + restockDate + ', status=' + newDisplayStatus + (payload.note ? ', note=' + payload.note : ''), user);
    sp_clearStockCache();
    return { success: true, message: 'Restock saved', previousQty: current, addedQty: qty, newQty: newQty, stockQty: newQty, restockDate: restockDate, status: newDisplayStatus };
  } catch (err) {
    try { sp_logError_('si_restockAccessory_V32', err); } catch(e) {}
    return { success: false, message: err.message, stack: err.stack };
  }
}

// Batch recheck: each row can send a different physicalQty. Same check date by default = current date.
function si_updateAccessoryCheckResultBatch(payload) {
  try {
    payload = payload || {};
    var items = payload.items || [];
    if (!items.length) return { success:false, message:'No items selected' };
    var checkDate = si_ciDateToYmd_(payload.checkDate || payload.check_date || new Date());
    var ok = 0, fail = 0, errors = [];
    items.forEach(function(it){
      it = it || {};
      it.checkDate = it.checkDate || checkDate;
      it.user = it.user || payload.user || '';
      var r = si_updateAccessoryCheckResult(it);
      if (r && r.success) ok++; else { fail++; errors.push((it.accessoryId || it.itemName || '-') + ': ' + ((r && r.message) || 'failed')); }
    });
    sp_appendActivityLog_('ACCESSORY_STOCK_RECHECK_BATCH', 'BATCH', 'ok=' + ok + ', fail=' + fail + ', check_date=' + checkDate, payload.user || '');
    sp_clearStockCache();
    return { success:true, message:'Batch recheck saved: ' + ok + ' item(s). Failed: ' + fail, ok:ok, fail:fail, errors:errors, checkDate:checkDate };
  } catch (err) {
    try { sp_logError_('si_updateAccessoryCheckResultBatch_V32', err); } catch(e) {}
    return { success:false, message:err.message, stack:err.stack };
  }
}

/* ============================================================
   CES Stock Pro V33 HOTFIX — 2026-06-01
   Fix: RangeError: Maximum call stack size exceeded
   Cause in V32: si_getStockInventoryData wrapped itself through
   si_v32Base_getStockInventoryData because Apps Script hoists the
   last function declaration. This final override is non-recursive.
============================================================ */
function si_getStockInventoryData(forceRefresh) {
  try {
    var payload = sp_getStockPayload_(forceRefresh === true);
    var accessories = payload.accessories || [];
    var inventory = payload.inventory || [];

    var pending = [];
    try {
      pending = si_v30ReadApprovalRows_(true, 300) || [];
    } catch (pendingErr) {
      pending = [];
    }

    var preloadedAlerts;
    try {
      preloadedAlerts = si_v32BuildAccessoryAlertsFromRows_(accessories, pending, 300);
    } catch (alertErr) {
      preloadedAlerts = {
        success: false,
        message: alertErr.message,
        actionRequired: [],
        lowStock: [],
        checkDue: [],
        checkSoon: [],
        pending: pending,
        counts: { actionRequired: 0, lowStock: 0, checkDue: 0, checkSoon: 0, pending: pending.length }
      };
    }

    var kpi = si_buildInventoryKpi_(inventory, accessories) || {};
    kpi.accPending = pending.length;
    kpi.pendingApproval = pending.length;
    kpi.accActionRequired = (preloadedAlerts.counts && preloadedAlerts.counts.actionRequired) || 0;

    var preloadedHistory = { accessories: { success: true, logs: [] }, equipment: { success: true, logs: [] } };
    try {
      preloadedHistory.accessories = si_getInventoryHistory({ scope: 'accessories', limit: 80 });
    } catch (histAccErr) {
      preloadedHistory.accessories = { success: false, message: histAccErr.message, logs: [] };
    }
    try {
      preloadedHistory.equipment = si_getInventoryHistory({ scope: 'equipment', limit: 80 });
    } catch (histEqErr) {
      preloadedHistory.equipment = { success: false, message: histEqErr.message, logs: [] };
    }

    return {
      success: true,
      timestamp: payload.timestamp,
      inventory: inventory,
      accessories: accessories,
      filters: payload.filters || {},
      kpi: kpi,
      preloadedAlerts: preloadedAlerts,
      alerts: preloadedAlerts,
      preloadedHistory: preloadedHistory
    };
  } catch (err) {
    try { sp_logError_('si_getStockInventoryData_V33_NON_RECURSIVE', err); } catch(e) {}
    return { success: false, message: err.message, stack: err.stack };
  }
}

function si_testInventoryV33Hotfix() {
  var res = si_getStockInventoryData(true);
  Logger.log(JSON.stringify({
    success: res.success,
    inventory: res.inventory ? res.inventory.length : 0,
    accessories: res.accessories ? res.accessories.length : 0,
    actionRequired: res.preloadedAlerts && res.preloadedAlerts.counts ? res.preloadedAlerts.counts.actionRequired : 0,
    pending: res.kpi ? res.kpi.accPending : 0
  }, null, 2));
  return res;
}


/* ============================================================
   CES Stock Pro V34 — GitHub Migration Fast Loader
   Final override for GitHub Pages API.
   - Non-recursive final si_getStockInventoryData()
   - Avoids preloading history on every inventory load to prevent API timeout
   - Alerts are still preloaded; history loads on demand from si_getInventoryHistory()
============================================================ */
function si_getStockInventoryData(forceRefresh, options) {
  try {
    options = options || {};
    var payload = sp_getStockPayload_(forceRefresh === true);
    var accessories = payload.accessories || [];
    var inventory = payload.inventory || [];

    var pending = [];
    try {
      pending = si_v30ReadApprovalRows_(true, Number(options.pendingLimit || 200)) || [];
    } catch (pendingErr) {
      pending = [];
    }

    var preloadedAlerts;
    try {
      preloadedAlerts = si_v32BuildAccessoryAlertsFromRows_(accessories, pending, Number(options.alertLimit || 300));
    } catch (alertErr) {
      preloadedAlerts = {
        success: false,
        message: alertErr.message,
        actionRequired: [],
        lowStock: [],
        checkDue: [],
        checkSoon: [],
        pending: pending,
        counts: { actionRequired: 0, lowStock: 0, checkDue: 0, checkSoon: 0, pending: pending.length }
      };
    }

    var kpi = si_buildInventoryKpi_(inventory, accessories) || {};
    kpi.accPending = pending.length;
    kpi.pendingApproval = pending.length;
    kpi.accActionRequired = (preloadedAlerts.counts && preloadedAlerts.counts.actionRequired) || 0;

    var response = {
      success: true,
      timestamp: payload.timestamp || new Date().toISOString(),
      inventory: inventory,
      accessories: accessories,
      filters: payload.filters || {},
      kpi: kpi,
      preloadedAlerts: preloadedAlerts,
      alerts: preloadedAlerts,
      gitHubFastMode: true
    };

    if (options.includeHistory === true) {
      response.preloadedHistory = { accessories: si_getInventoryHistory({ scope:'accessories', limit:80 }), equipment: si_getInventoryHistory({ scope:'equipment', limit:80 }) };
    }
    return response;
  } catch (err) {
    try { sp_logError_('si_getStockInventoryData_V34_GITHUB_FAST', err); } catch(e) {}
    return { success: false, message: err.message, stack: err.stack };
  }
}
