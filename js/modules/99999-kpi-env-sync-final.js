/**
 * 99999-kpi-env-sync-final.js
 * Final frontend sync for KPI ENV workflow.
 * ENV must start from SUP status only:
 * กำลังตรวจ → ตรวจเสร็จ → รอส่ง Report → ส่ง Report เสร็จแล้ว
 */
(function (window, document) {
  'use strict';

  function esc(v) {
    if (typeof window.kpiEsc === 'function') return window.kpiEsc(v);
    if (typeof window.spEsc === 'function') return window.spEsc(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) { return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m]; });
  }
  function attr(v) {
    if (typeof window.kpiAttr === 'function') return window.kpiAttr(v);
    return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  function norm(v) {
    if (typeof window.kpiNormalizeStatus === 'function') return window.kpiNormalizeStatus(v);
    var s = String(v || '').replace(/\s+/g, ' ').trim();
    var c = s.replace(/\s+/g, '').toLowerCase();
    if (!s) return '';
    if (c.indexOf('ส่งreportเสร็จแล้ว') >= 0 || c.indexOf('completed') >= 0) return 'ส่ง Report เสร็จแล้ว';
    if (c.indexOf('รอส่งreport') >= 0) return 'รอส่ง Report';
    if (c.indexOf('ตรวจเสร็จ') >= 0) return 'ตรวจเสร็จ';
    if (c.indexOf('กำลังตรวจ') >= 0 || c.indexOf('checking') >= 0) return 'กำลังตรวจ';
    if (c.indexOf('เสร็จพร้อมตรวจ') >= 0 || c.indexOf('พร้อมตรวจ') >= 0) return 'เสร็จพร้อมตรวจ';
    if (c.indexOf('กำลังทำ') >= 0 || c.indexOf('doing') >= 0) return 'กำลังทำ';
    if (c.indexOf('รอแก้ไข') >= 0 || c.indexOf('แก้ไข') >= 0 || c.indexOf('revise') >= 0) return 'รอแก้ไข';
    return s;
  }
  function isEnvRow(row) {
    row = row || {};
    var serviceTeam = String(row.workflowType || row.serviceTeam || '').toUpperCase();
    var source = String(row.sourceSheet || '').toUpperCase();
    var workType = String(row.workType || '').toUpperCase();
    return serviceTeam === 'ENV' || source.indexOf('ENV') >= 0 || workType.indexOf('ENV') >= 0;
  }
  function envCurrent(sup, rep) {
    sup = norm(sup); rep = norm(rep);
    if (rep === 'ส่ง Report เสร็จแล้ว') return 'ส่ง Report เสร็จแล้ว';
    if (rep === 'รอแก้ไข') return 'รอแก้ไข';
    if (rep === 'รอส่ง Report') return 'รอส่ง Report';
    if (sup === 'รอแก้ไข') return 'รอแก้ไข';
    if (sup === 'ตรวจเสร็จ') return 'ตรวจเสร็จ';
    if (sup === 'กำลังตรวจ') return 'กำลังตรวจ';
    return 'กำลังตรวจ';
  }
  function applyEnvRow(row) {
    if (!isEnvRow(row)) return row;
    row.workflowType = 'ENV';
    row.serviceTeam = 'ENV';
    row.rawStatus = row.rawStatus || {};
    row.rawStatus.eng = '';
    row.rawStatus.engDate = '';
    row.rawStatus.sup = norm(row.rawStatus.sup);
    row.rawStatus.rep = norm(row.rawStatus.rep);
    row.currentStatus = envCurrent(row.rawStatus.sup, row.rawStatus.rep);
    row.statusDetail = row.currentStatus;
    row.isFinished = row.currentStatus === 'ส่ง Report เสร็จแล้ว';
    row.hasEdit = row.rawStatus.sup === 'รอแก้ไข' || row.rawStatus.rep === 'รอแก้ไข';
    return row;
  }

  var originalApply = window.kpiApplyStrictWorkflowStatus;
  window.kpiApplyStrictWorkflowStatus = function (rows) {
    rows = Array.isArray(rows) ? rows : [];
    var out = typeof originalApply === 'function' ? originalApply(rows) : rows;
    return (out || []).map(applyEnvRow);
  };

  var oldPendingEngineer = window.kpiIsPendingEngineer;
  var oldPendingSup = window.kpiIsPendingSup;
  var oldPendingReport = window.kpiIsPendingReport;

  window.kpiIsPendingEngineer = function (row) {
    if (isEnvRow(row)) return false;
    return typeof oldPendingEngineer === 'function' ? oldPendingEngineer(row) : false;
  };
  window.kpiIsPendingSup = function (row) {
    if (isEnvRow(row)) {
      applyEnvRow(row);
      var sup = norm(row.rawStatus && row.rawStatus.sup);
      var rep = norm(row.rawStatus && row.rawStatus.rep);
      return !row.isFinished && (!rep || rep === 'รอแก้ไข') && (!sup || sup === 'กำลังตรวจ' || sup === 'รอแก้ไข');
    }
    return typeof oldPendingSup === 'function' ? oldPendingSup(row) : false;
  };
  window.kpiIsPendingReport = function (row) {
    if (isEnvRow(row)) {
      applyEnvRow(row);
      var sup = norm(row.rawStatus && row.rawStatus.sup);
      var rep = norm(row.rawStatus && row.rawStatus.rep);
      return !row.isFinished && sup === 'ตรวจเสร็จ' && (!rep || rep === 'รอส่ง Report' || rep === 'รอแก้ไข');
    }
    return typeof oldPendingReport === 'function' ? oldPendingReport(row) : false;
  };

  var originalOpen = window.openUpdateModal;
  window.openUpdateModal = function (data) {
    if (!isEnvRow(data)) {
      return typeof originalOpen === 'function' ? originalOpen(data) : undefined;
    }
    data = applyEnvRow(Object.assign({}, data || {}, { rawStatus: Object.assign({}, data && data.rawStatus || {}) }));
    var r = data.rawStatus || {};
    var sup = norm(r.sup), rep = norm(r.rep);
    var supChecking = !sup || sup === 'กำลังตรวจ' || sup === 'ตรวจเสร็จ' || rep;
    var supDone = sup === 'ตรวจเสร็จ' || rep === 'รอส่ง Report' || rep === 'ส่ง Report เสร็จแล้ว';
    var reportWait = rep === 'รอส่ง Report' || rep === 'ส่ง Report เสร็จแล้ว';
    var reportDone = rep === 'ส่ง Report เสร็จแล้ว';
    var supEdit = sup === 'รอแก้ไข';
    var repEdit = rep === 'รอแก้ไข';

    var rowInput = document.getElementById('upd-row-id');
    if (rowInput) rowInput.value = data.rowId;

    var header = document.getElementById('upd-job-header');
    if (header) header.innerHTML = '<div class="flex flex-wrap gap-2 w-full">' +
      '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hospital text-slate-400"></i> ' + esc(data.customerId) + '</span>' +
      '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hashtag text-slate-400"></i> Job: ' + esc(data.jobNo) + '</span>' +
      '<span class="bg-green-50 text-green-700 border border-green-300 px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm"><i class="fas fa-leaf"></i> ENV Workflow</span>' +
      '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-user-tag text-slate-400"></i> Req: ' + esc(data.requester || '-') + '</span>' +
      '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-calendar-alt text-slate-400"></i> CAL: ' + esc(data.calDate) + '</span>' +
      '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-flag-checkered text-slate-400"></i> KPI: ' + esc(data.deadline) + '</span>' +
      '</div>';

    var dev = document.getElementById('modal-devices-container');
    if (dev) {
      var devStr = Object.entries(data.devices || {}).filter(function (kv) { return kv[1] && kv[1] !== '0'; }).map(function (kv) {
        return '<span class="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-600 uppercase shadow-sm">' + esc(kv[0]) + ': <b class="text-slate-800">' + esc(kv[1]) + '</b></span>';
      }).join('');
      dev.innerHTML = '<div class="flex flex-wrap gap-2 text-[10px] font-bold">' + (devStr || '<span class="text-slate-400">No Device Specifics</span>') + '</div>' +
        '<div class="text-[11px] font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">TOTAL: ' + esc(data.totalAmount || '0') + '</div>';
    }

    var steps = [
      { l:'กำลังตรวจ', t:'SUP Status', d:supChecking || supEdit, edit:supEdit, date:r.supDate },
      { l:'ตรวจเสร็จ', t:'SUP Status', d:supDone, edit:false, date:r.supDate },
      { l:'รอส่ง Report', t:'Report Status', d:reportWait || repEdit, edit:repEdit, date:r.repDate },
      { l:'ส่ง Report เสร็จแล้ว', t:'Report Status', d:reportDone, edit:false, date:r.repDate }
    ];
    var stepper = document.getElementById('modal-stepper-container');
    if (stepper) stepper.innerHTML = '<div class="flex items-start justify-between min-w-[560px] w-full pt-6 relative">' + steps.map(function (s, i) {
      return '<div class="flex flex-col items-center flex-1 relative">' +
        ((i === 0 || i === 2) ? '<span class="absolute -top-8 text-[9px] font-black ' + (s.d || s.edit ? 'text-[#003DA5]' : 'text-slate-400') + ' bg-white px-2 rounded border border-slate-200 shadow-sm">' + esc(s.t) + '</span>' : '') +
        '<div class="z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ' + (s.edit ? 'bg-[#003DA5] text-white ring-4 ring-[#003DA5]/20' : s.d ? 'bg-blue-100 text-[#003DA5] shadow-md' : 'bg-slate-100 text-slate-300 border-2 border-slate-200') + '">' + (s.edit ? '<i class="fas fa-tools"></i>' : s.d ? '<i class="fas fa-check"></i>' : (i + 1)) + '</div>' +
        '<span class="text-[9px] font-extrabold mt-3 ' + (s.d || s.edit ? 'text-slate-800' : 'text-slate-400') + ' text-center h-6 leading-tight">' + esc(s.l) + '</span>' +
        (s.date && s.d && !s.edit ? '<span class="text-[8px] font-bold text-[#003DA5] bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-200 shadow-sm">' + esc(s.date) + '</span>' : '') +
        '</div>' + (i < steps.length - 1 ? '<div class="flex-1 h-[3px] mt-4 ' + (s.d ? 'bg-blue-300' : 'bg-slate-200') + '"></div>' : '');
    }).join('') + '</div>';

    var target = '', opts = [];
    if (!sup) { target = 'Supervisor Status'; opts = ['กำลังตรวจ']; }
    else if (sup === 'กำลังตรวจ' || sup === 'รอแก้ไข') { target = 'Supervisor Status'; opts = ['ตรวจเสร็จ', 'รอแก้ไข']; }
    else if (sup === 'ตรวจเสร็จ' && !rep) { target = 'Report Status'; opts = ['รอส่ง Report']; }
    else if (rep === 'รอส่ง Report' || rep === 'รอแก้ไข') { target = 'Report Status'; opts = ['ส่ง Report เสร็จแล้ว', 'รอแก้ไข']; }

    var targetEl = document.getElementById('upd-target-col');
    if (targetEl) targetEl.value = target || 'Completed';
    var statusEl = document.getElementById('upd-new-status');
    if (statusEl) statusEl.innerHTML = opts.length ? opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') : '<option value="">งานเสร็จสมบูรณ์</option>';
    var saveBtn = document.getElementById('btn-save-kpi');
    if (saveBtn) saveBtn.disabled = opts.length === 0;
    var modal = document.getElementById('modal-kpi-update');
    if (modal) modal.classList.remove('hidden');
  };

  window.kpiV39EnvWorkflowRecheck = function () {
    var sample = [
      { workflowType:'ENV', rawStatus:{ sup:'', rep:'' } },
      { workflowType:'ENV', rawStatus:{ sup:'กำลังตรวจ', rep:'' } },
      { workflowType:'ENV', rawStatus:{ sup:'ตรวจเสร็จ', rep:'' } },
      { workflowType:'ENV', rawStatus:{ sup:'ตรวจเสร็จ', rep:'รอส่ง Report' } },
      { workflowType:'ENV', rawStatus:{ sup:'ตรวจเสร็จ', rep:'ส่ง Report เสร็จแล้ว' } }
    ].map(applyEnvRow);
    var out = { ok:true, version:'20260709-env-front-sync', sample: sample };
    console.log('[KPI ENV workflow recheck]', out);
    return out;
  };

  if (Array.isArray(window.globalKpiData)) {
    try { window.globalKpiData = window.globalKpiData.map(applyEnvRow); } catch (e) {}
  }

  console.log('[CES Hub] KPI ENV final frontend sync loaded');
})(window, document);
