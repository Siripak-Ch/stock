/**
 * 9999-final-frontend-fix.js
 * CES Hub GitHub Frontend final patch — 2026-07-08
 * Load LAST after all legacy modules.
 *
 * Fixes:
 *  - Revenue Dashboard reads Revenue_Data_2025 / Revenue_Data_2026 via backend API and normalizes responses.
 *  - Stock Dashboard / Inventory status counts normalize to Thai status labels.
 *  - Service CSI / Report CSI export loads html2canvas + jsPDF automatically before preview/download.
 *  - Theme tone aligned to N Health / CES blue-white-light across all pages.
 *  - Adds frontend recheck helpers for deployment validation.
 */
(function () {
  'use strict';

  var PATCH_VERSION = '20260708-frontend-final';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var TEAMS = ['MED','LAB','EHS'];
  var STOCK_STATUSES = ['พร้อมส่ง','รอสอบเทียบ','เช่ายืม','ใช้งานไม่ได้','ไม่พบในรายการ'];
  var chartLoadPromise = null;
  var pdfLibPromise = null;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(v) { return v == null ? '' : String(v).trim(); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = text(v).replace(/[,฿%\s]/g, '');
    if (!s || s === '-' || s.toLowerCase() === 'nan') return 0;
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  function esc(s) { return text(s).replace(/[&<>'"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]; }); }
  function safeJson(value) { try { return JSON.stringify(value); } catch (e) { return 'null'; } }
  function fmtShort(v) {
    var n = num(v);
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function fmtMoney(v) { return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(actual, target) { return target ? (actual / target * 100) : 0; }
  function setText(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
  function setWidth(id, value) { var el = document.getElementById(id); if (el) el.style.width = Math.min(Math.max(num(value), 0), 100) + '%'; }
  function getYear() { var el = $('#rev-filter-year'); return el && el.value ? String(el.value) : String(new Date().getFullYear()); }

  function unwrapResponse(res) {
    if (!res) return res;
    if (res.data && res.data.result !== undefined) return res.data.result;
    if (res.result !== undefined) return res.result;
    if (res.ok === true && res.data !== undefined) return res.data;
    if (res.success === true && res.data !== undefined) return res.data;
    return res;
  }

  function callBackend(fnName, args, options) {
    args = Array.isArray(args) ? args : [];
    options = options || {};
    if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
      return window.CES_API.callFunction(fnName, args, options).then(unwrapResponse);
    }
    if (window.CES_API && typeof window.CES_API.call === 'function') {
      var payload = args.length === 1 ? args[0] : args;
      return window.CES_API.call(fnName, payload, options).then(unwrapResponse);
    }
    return new Promise(function (resolve, reject) {
      try {
        var runner = google.script.run
          .withSuccessHandler(function (res) { resolve(unwrapResponse(res)); })
          .withFailureHandler(function (err) { reject(err); });
        runner[fnName].apply(runner, args);
      } catch (e) {
        reject(e);
      }
    });
  }

  function callAny(candidates) {
    var i = 0;
    function next(lastErr) {
      if (i >= candidates.length) return Promise.reject(lastErr || new Error('No backend function succeeded'));
      var c = candidates[i++];
      return callBackend(c.fn, c.args || [], c.options || {}).catch(next);
    }
    return next();
  }

  function loadScriptOnce(id, urls, testFn) {
    if (typeof testFn === 'function' && testFn()) return Promise.resolve();
    if (!Array.isArray(urls)) urls = [urls];
    return new Promise(function (resolve, reject) {
      var idx = 0;
      function tryNext() {
        if (typeof testFn === 'function' && testFn()) { resolve(); return; }
        if (idx >= urls.length) { reject(new Error('Cannot load library: ' + id)); return; }
        var url = urls[idx++];
        var existing = document.querySelector('script[data-ces-lib="' + id + '"][src="' + url + '"]') || document.querySelector('script[src="' + url + '"]');
        if (existing) {
          existing.addEventListener('load', function () { if (!testFn || testFn()) resolve(); else tryNext(); }, { once: true });
          existing.addEventListener('error', tryNext, { once: true });
          setTimeout(function () { if (!testFn || testFn()) resolve(); }, 80);
          return;
        }
        var s = document.createElement('script');
        s.src = url;
        s.async = false;
        s.dataset.cesLib = id;
        s.onload = function () { if (!testFn || testFn()) resolve(); else tryNext(); };
        s.onerror = tryNext;
        document.head.appendChild(s);
      }
      tryNext();
    });
  }

  function ensureChartLibs() {
    if (window.Chart) return Promise.resolve();
    if (!chartLoadPromise) {
      chartLoadPromise = loadScriptOnce('chartjs', [
        'https://cdn.jsdelivr.net/npm/chart.js',
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
        'https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js'
      ], function () { return !!window.Chart; }).then(function () {
        return loadScriptOnce('chartjs-datalabels', [
          'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0',
          'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2'
        ], function () { return !!window.ChartDataLabels || !!window.Chart; }).catch(function () {});
      });
    }
    return chartLoadPromise;
  }

  function ensurePdfLibs() {
    if (window.html2canvas && window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (!pdfLibPromise) {
      pdfLibPromise = loadScriptOnce('html2canvas', [
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
      ], function () { return !!window.html2canvas; }).then(function () {
        return loadScriptOnce('jspdf', [
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
          'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
          'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ], function () { return !!(window.jspdf && window.jspdf.jsPDF); });
      });
    }
    return pdfLibPromise;
  }

  /* ============================================================
     THEME
  ============================================================ */
  function injectTheme() {
    if ($('#ces-final-front-theme')) return;
    var style = document.createElement('style');
    style.id = 'ces-final-front-theme';
    style.textContent = `
      :root{--ces-blue:#003DA5;--ces-blue2:#0A5BD3;--ces-blue-soft:#EEF5FF;--ces-cyan:#00A9E0;--ces-teal:#00A88E;--ces-red:#E53935;--ces-navy:#102A56;--ces-bg:#F6F9FD;--ces-card:#FFFFFF;--ces-text:#172033;--ces-muted:#63748A;--ces-border:#DCE7F5;--ces-shadow:0 12px 30px rgba(16,42,86,.08)}
      body{background:var(--ces-bg)!important;color:var(--ces-text)!important;font-family:Prompt,Inter,Arial,sans-serif!important}
      #main-dashboard,.main-content,main,#app-main-content{background:var(--ces-bg)!important}
      .nav-item.active,.ces-nav-item.active{background:var(--ces-blue-soft)!important;color:var(--ces-blue)!important;border-left:4px solid var(--ces-blue)!important;box-shadow:0 8px 22px rgba(0,61,165,.08)!important}
      .nav-item:hover{background:#F2F7FF!important;color:var(--ces-blue)!important}
      .ces-view-header,.stockpro-header-card,.bg-white.rounded-3xl,.bg-white.p-5.rounded-3xl{border:1px solid var(--ces-border)!important;border-radius:22px!important;box-shadow:var(--ces-shadow)!important;background:#fff!important}
      .ces-view-icon,.stockpro-icon,.p-3.bg-\[\#003DA5\]\/10{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2))!important;color:#fff!important;box-shadow:0 10px 24px rgba(0,61,165,.18)!important}
      button,.sp-btn,.swal2-confirm,.swal2-cancel{border-radius:12px!important;font-weight:800!important}
      .sp-btn.primary,.bg-\[\#003DA5\],button.bg-\[\#003DA5\],.ces-final-primary{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2))!important;color:#fff!important;border:0!important}
      .sp-btn.ghost,.ces-final-secondary{background:#F2F7FF!important;color:var(--ces-blue)!important;border:1px solid var(--ces-border)!important}
      .stockpro-card,.stockpro-filter-card,.r-card,.r-card-static,.si-kpi-card,.sp-kpi-card,.sp-model-card,.sp-chart-box,.sp-table-wrap{background:#fff!important;border:1px solid var(--ces-border)!important;border-radius:18px!important;box-shadow:var(--ces-shadow)!important}
      .r-label,.si-kpi-label,.sp-kpi-label,.stockpro-card-head h3,h1,h2,h3{color:var(--ces-blue)!important}
      .r-value,.si-kpi-value,.sp-kpi-value{color:var(--ces-navy)!important}
      .sp-badge,.ces-status-badge{border-radius:999px!important;font-weight:900!important;padding:.25rem .65rem!important;font-size:.75rem!important;display:inline-flex!important;align-items:center!important;gap:.25rem!important}
      .sp-badge.พร้อมส่ง,.ces-status-ready{background:#E9FBF6!important;color:#007F68!important}
      .sp-badge.รอสอบเทียบ,.ces-status-cal{background:#FFF6DE!important;color:#9A6300!important}
      .sp-badge.เช่ายืม,.ces-status-rent{background:#EAF4FF!important;color:#006BB6!important}
      .sp-badge.ใช้งานไม่ได้,.ces-status-broken{background:#EDF2F7!important;color:#40556B!important}
      .sp-badge.ไม่พบในรายการ,.ces-status-missing{background:#FDECEC!important;color:#B42318!important}
      .ces-final-note{background:#F2F7FF;border:1px solid var(--ces-border);color:var(--ces-blue);border-radius:14px;padding:12px 14px;font-weight:700;margin:10px 0}
      .ces-final-error{background:#FFF1F2;border:1px solid #fecdd3;color:#B42318;border-radius:14px;padding:12px 14px;font-weight:700;margin:10px 0}
      .ces-mini-btn{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2));color:#fff;border:0;border-radius:12px;padding:9px 12px;font-weight:900;display:inline-flex;gap:7px;align-items:center}
      .ces-mini-btn.secondary{background:#F2F7FF;color:var(--ces-blue);border:1px solid var(--ces-border)}
      @media print{.no-print,.swal2-container,.ces-mini-btn{display:none!important} body{background:#fff!important}}
    `;
    document.head.appendChild(style);
  }

  function refreshTheme() {
    injectTheme();
    if (window.CESUI && typeof window.CESUI.refresh === 'function') {
      try { window.CESUI.refresh(window.currentTab); } catch (e) {}
    }
  }

  /* ============================================================
     REVENUE
  ============================================================ */
  function monthIndex(m) {
    var s = text(m);
    if (!s) return -1;
    var n = Number(s);
    if (n >= 1 && n <= 12) return n - 1;
    var short = s.slice(0, 3).toLowerCase();
    for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].toLowerCase() === short) return i;
    var th = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];
    for (var j = 0; j < th.length; j++) if (s.indexOf(th[j]) >= 0) return j;
    return -1;
  }
  function normalizeTeam(t) {
    var s = text(t).toUpperCase();
    if (/MED|MEDICAL|เครื่องมือ/.test(s)) return 'MED';
    if (/LAB|TEST|LABORATORY|ห้องปฏิบัติ/.test(s)) return 'LAB';
    if (/EHS|ENV|ENVIRONMENT|สิ่งแวดล้อม/.test(s)) return 'EHS';
    if (/TES|TECH/.test(s)) return 'TES';
    return s || 'MED';
  }
  function emptyRevenue(year) {
    return {
      year: String(year),
      monthly: MONTHS.map(function (m) { return { month:m, med:{t:0,a:0,pct:0}, lab:{t:0,a:0,pct:0}, ehs:{t:0,a:0,pct:0} }; }),
      summary: { totalTarget:0,totalActual:0,med:{tgt:0,act:0},lab:{tgt:0,act:0},ehs:{tgt:0,act:0} },
      charts: { labels: MONTHS.slice(), med_t:[],med_a:[],lab_t:[],lab_a:[],ehs_t:[],ehs_a:[] }
    };
  }
  function addRevenueValue(base, idx, team, target, actual) {
    if (idx < 0 || idx > 11) return;
    var key = team.toLowerCase();
    if (!base.monthly[idx][key]) return;
    base.monthly[idx][key].t += num(target);
    base.monthly[idx][key].a += num(actual);
  }
  function normalizeRevenue(data, year) {
    data = unwrapResponse(data) || {};
    if (Array.isArray(data.data)) data = data.data;
    var out = emptyRevenue(year || data.year || getYear());
    var rows = [];

    if (Array.isArray(data)) rows = data;
    else if (Array.isArray(data.rows)) rows = data.rows;
    else if (Array.isArray(data.records)) rows = data.records;
    else if (Array.isArray(data.values)) rows = data.values;

    if (Array.isArray(data.monthly) && data.monthly.length) {
      data.monthly.forEach(function (m, i) {
        var idx = monthIndex(m.month || m.label || m.Month || (i + 1));
        if (idx < 0) idx = i;
        ['med','lab','ehs'].forEach(function (team) {
          var obj = m[team] || m[team.toUpperCase()] || {};
          var target = obj.t !== undefined ? obj.t : (obj.target !== undefined ? obj.target : (m[team + '_t'] !== undefined ? m[team + '_t'] : m[team + 'Target']));
          var actual = obj.a !== undefined ? obj.a : (obj.actual !== undefined ? obj.actual : (m[team + '_a'] !== undefined ? m[team + '_a'] : m[team + 'Actual']));
          addRevenueValue(out, idx, team.toUpperCase(), target, actual);
        });
        // aggregated monthly fallback can be split only if team unavailable; keep in total summary later.
      });
    }

    rows.forEach(function (r) {
      if (Array.isArray(r)) return;
      var idx = monthIndex(r.month || r.Month || r.MONTH || r.month_name || r.MonthName || r.period || r.Period || r.date || r.Date);
      var team = normalizeTeam(r.team || r.Team || r.TEAM || r.service || r.Service || r.department || r.Department);
      if (idx < 0 && r.timestamp) idx = monthIndex(new Date(r.timestamp).getMonth() + 1);
      var target = r.target !== undefined ? r.target : (r.Target !== undefined ? r.Target : (r.TARGET !== undefined ? r.TARGET : r.tgt));
      var actual = r.actual !== undefined ? r.actual : (r.Actual !== undefined ? r.Actual : (r.ACTUAL !== undefined ? r.ACTUAL : (r.revenue !== undefined ? r.revenue : r.Revenue)));

      if (idx >= 0 && TEAMS.indexOf(team) >= 0 && (target !== undefined || actual !== undefined)) {
        addRevenueValue(out, idx, team, target, actual);
      } else if (idx >= 0) {
        ['MED','LAB','EHS'].forEach(function (t) {
          var lower = t.toLowerCase();
          addRevenueValue(out, idx, t,
            r[lower + '_t'] || r[lower + '_target'] || r[t + '_TARGET'] || r[t + ' Target'],
            r[lower + '_a'] || r[lower + '_actual'] || r[t + '_ACTUAL'] || r[t + ' Actual']
          );
        });
      }
    });

    if (data.summary) {
      var s = data.summary;
      ['med','lab','ehs'].forEach(function (team) {
        var src = s[team] || s[team.toUpperCase()] || {};
        // Only use explicit summary if monthly is still zero for that team.
        var hasMonthly = out.monthly.some(function (m) { return num(m[team].a) || num(m[team].t); });
        if (!hasMonthly) {
          out.summary[team].act = num(src.act || src.actual || src.totalActual || src.revenue);
          out.summary[team].tgt = num(src.tgt || src.target || src.totalTarget);
        }
      });
    }

    out.summary.totalActual = 0;
    out.summary.totalTarget = 0;
    out.monthly.forEach(function (m) {
      ['med','lab','ehs'].forEach(function (team) {
        m[team].pct = pct(m[team].a, m[team].t);
        out.summary[team].act += m[team].a;
        out.summary[team].tgt += m[team].t;
      });
    });
    ['med','lab','ehs'].forEach(function (team) {
      out.summary.totalActual += out.summary[team].act;
      out.summary.totalTarget += out.summary[team].tgt;
    });

    // Summary fallback when backend provides only totals.
    if (!out.summary.totalActual && data.summary) {
      out.summary.totalActual = num(data.summary.totalActual || data.summary.totalRevenue || data.summary.actual || data.summary.revenue);
      out.summary.totalTarget = num(data.summary.totalTarget || data.summary.target);
    }

    out.charts.labels = out.monthly.map(function (m) { return m.month; });
    out.charts.med_t = out.monthly.map(function (m) { return m.med.t; });
    out.charts.med_a = out.monthly.map(function (m) { return m.med.a; });
    out.charts.lab_t = out.monthly.map(function (m) { return m.lab.t; });
    out.charts.lab_a = out.monthly.map(function (m) { return m.lab.a; });
    out.charts.ehs_t = out.monthly.map(function (m) { return m.ehs.t; });
    out.charts.ehs_a = out.monthly.map(function (m) { return m.ehs.a; });
    return out;
  }

  function renderRevenue(normalized) {
    if (!normalized) return;
    var sum = normalized.summary;
    setText('rev-total-act', fmtShort(sum.totalActual));
    setText('rev-total-tgt', fmtShort(sum.totalTarget));
    setText('rev-total-pct-badge', (pct(sum.totalActual, sum.totalTarget)).toFixed(1) + '%');
    setWidth('rev-total-prog', pct(sum.totalActual, sum.totalTarget));
    ['med','lab','ehs'].forEach(function (team) {
      var d = sum[team] || { act:0, tgt:0 };
      setText('rev-' + team + '-act', fmtShort(d.act));
      setText('rev-' + team + '-tgt', fmtShort(d.tgt));
      setText('rev-' + team + '-pct', (pct(d.act, d.tgt)).toFixed(0) + '%');
      setWidth('rev-' + team + '-prog', pct(d.act, d.tgt));
    });
    if (typeof window.renderRevenueTables === 'function') window.renderRevenueTables(normalized.monthly);
    ensureChartLibs().then(function () {
      if (typeof window.renderRevenueChart === 'function') window.renderRevenueChart(normalized.charts);
    }).catch(function () {});
  }

  function refreshRevenue(showLoading) {
    injectTheme();
    var year = getYear();
    if (showLoading !== false && typeof window.revenueSetLoading === 'function') window.revenueSetLoading(true);
    return callAny([
      { fn: 'getRevenueDashboardData', args: [year] },
      { fn: 'getRevenueDashboardData', args: [{ year: year, sheet: 'Revenue_Data_' + year }] },
      { fn: 'rd_getRevenueDashboardData', args: [year] },
      { fn: 'rd_getRevenueDashboardData', args: [{ year: year }] },
      { fn: 'getRevenueData', args: [year] },
      { fn: 'getRevenueData', args: [{ year: year }] }
    ]).then(function (res) {
      var normalized = normalizeRevenue(res, year);
      try { window.revenueCache = normalized; } catch (e) {}
      try { revenueCache = normalized; } catch (e2) {}
      renderRevenue(normalized);
      if (typeof window.revenueSetLoading === 'function') window.revenueSetLoading(false);
      return normalized;
    }).catch(function (err) {
      if (typeof window.revenueSetLoading === 'function') window.revenueSetLoading(false);
      var box = $('#view-revenue .ces-final-error') || document.createElement('div');
      box.className = 'ces-final-error';
      box.innerHTML = 'Revenue load failed. ตรวจสอบ backend ให้มี function <b>getRevenueDashboardData(year)</b> และ sheet <b>Revenue_Data_' + esc(year) + '</b><br><small>' + esc(err && err.message ? err.message : err) + '</small>';
      var view = $('#view-revenue');
      if (view && !box.parentNode) view.insertBefore(box, view.children[1] || null);
      if (window.Swal) window.Swal.fire('Revenue Error', err && err.message ? err.message : String(err), 'error');
      throw err;
    });
  }

  function patchRevenue() {
    window.fetchRevenueDataBackground = function (showLoading) { return refreshRevenue(showLoading); };
    window.forceReloadRevenue = function () { try { revenueCache = null; } catch (e) {} return refreshRevenue(true); };
    window.loadRevenueData = function () { return refreshRevenue(true); };
    var yearSel = $('#rev-filter-year');
    if (yearSel && !yearSel.dataset.cesFinalRevenue) {
      yearSel.dataset.cesFinalRevenue = '1';
      yearSel.addEventListener('change', function () { refreshRevenue(true); });
    }
  }

  /* ============================================================
     STOCK / INVENTORY
  ============================================================ */
  function normalizeStockStatus(row) {
    row = row || {};
    var raw = [row.display_status, row.displayStatus, row.status, row.base_status, row.baseStatus, row.rental_status, row.rentalStatus, row.action].map(text).join(' ').toLowerCase();
    if (/(ไม่พบ|missing|not found|lost)/i.test(raw)) return 'ไม่พบในรายการ';
    if (/(ใช้งานไม่ได้|ชำรุด|เสีย|broken|damage|not working|out of service)/i.test(raw)) return 'ใช้งานไม่ได้';
    if (/(เช่ายืม|เช่า|ยืม|rental|rent|borrow|loan|checkout|check-out)/i.test(raw) && !/(คืน|return|returned|รับคืน)/i.test(raw)) return 'เช่ายืม';
    if (/(พร้อมส่ง|ready|available|pass|passed|cf|cal\/pm|cal pm)/i.test(raw) && !/(รอ|pending|wait)/i.test(raw)) return 'พร้อมส่ง';
    if (/(รอสอบเทียบ|pending|waiting|calibration|สอบเทียบ|warehouse|คลัง)/i.test(raw)) return 'รอสอบเทียบ';
    return 'รอสอบเทียบ';
  }
  function normalizeStockRow(r) {
    var out = Object.assign({}, r || {});
    out.id_code = text(out.id_code || out.idCode || out.ID_CODE || out.ID || out.code || out.Code);
    out.serial_number = text(out.serial_number || out.serialNumber || out.SN || out.sn || out.Serial || out.serial || out.serial_no);
    out.brand = text(out.brand || out.Brand || out.BRAND);
    out.model = text(out.model || out.Model || out.MODEL);
    out.location = text(out.location || out.Location || out.LOCATION || out.department || out.Department || out.site || out.Site);
    out.display_status = normalizeStockStatus(out);
    return out;
  }
  function normalizeStockData(data) {
    data = unwrapResponse(data) || {};
    var rows = [];
    if (Array.isArray(data)) rows = data;
    else if (Array.isArray(data.devices)) rows = data.devices;
    else if (Array.isArray(data.inventory)) rows = data.inventory;
    else if (Array.isArray(data.rows)) rows = data.rows;
    rows = rows.map(normalizeStockRow);
    var dist = {};
    STOCK_STATUSES.forEach(function (s) { dist[s] = 0; });
    rows.forEach(function (r) { dist[r.display_status] = (dist[r.display_status] || 0) + 1; });
    var byModel = {};
    rows.forEach(function (r) {
      var key = r.model || r.brand || 'ไม่ระบุรุ่น';
      byModel[key] = byModel[key] || { model:key, total:0, stock:0, recheck:0, inUse:0, broken:0, missing:0 };
      byModel[key].total++;
      if (r.display_status === 'พร้อมส่ง') byModel[key].stock++;
      else if (r.display_status === 'รอสอบเทียบ') byModel[key].recheck++;
      else if (r.display_status === 'เช่ายืม') byModel[key].inUse++;
      else if (r.display_status === 'ใช้งานไม่ได้') byModel[key].broken++;
      else if (r.display_status === 'ไม่พบในรายการ') byModel[key].missing++;
    });
    var rentalByMonth = {};
    MONTHS.forEach(function (m) { rentalByMonth[m] = 0; });
    rows.filter(function (r) { return r.display_status === 'เช่ายืม'; }).forEach(function (r) {
      var d = r.checkout_date || r.borrow_date || r.start_date || r.date || r.timestamp;
      var idx = monthIndex(d ? (new Date(d).getMonth() + 1) : '');
      if (idx >= 0) rentalByMonth[MONTHS[idx]] = (rentalByMonth[MONTHS[idx]] || 0) + 1;
    });
    return {
      devices: rows,
      inventory: rows,
      kpi: { total: rows.length, stock: dist['พร้อมส่ง'] || 0, recheck: dist['รอสอบเทียบ'] || 0, inUse: dist['เช่ายืม'] || 0, broken: dist['ใช้งานไม่ได้'] || 0, missing: dist['ไม่พบในรายการ'] || 0 },
      modelCards: Object.keys(byModel).map(function (k) { return byModel[k]; }),
      contractSummary: data.contractSummary || [],
      alerts: data.alerts || [],
      rentalByMonth: data.rentalByMonth || rentalByMonth,
      statusDistribution: data.statusDistribution || dist,
      raw: data
    };
  }
  function loadStockData(force) {
    if (force) {
      try { localStorage.removeItem('CES_STOCK_DASHBOARD_CACHE'); localStorage.removeItem('CES_STOCK_INVENTORY_CACHE'); } catch (e) {}
    }
    return callAny([
      { fn: 'sd_getStockDashboardData', args: [!!force] },
      { fn: 'getStockDashboardData', args: [!!force] },
      { fn: 'stockFinalRecheck', args: [] }
    ]).then(normalizeStockData);
  }
  function patchStock() {
    window.initStockDashboardModule = function (force) {
      injectTheme();
      var el = $('#view-stock_dashboard') || $('#stockpro-dashboard') || $('#main-content');
      if (!el) return;
      if (typeof window.sdEnsureStyle === 'function') { try { window.sdEnsureStyle(); } catch (e) {} }
      el.innerHTML = '<div class="stockpro-dashboard"><div class="sp-loading"><div class="spinner"></div><p>กำลังโหลด Stock Dashboard...</p></div></div>';
      loadStockData(force).then(function (data) {
        if (typeof window.sdRender === 'function') window.sdRender(el, data);
        else renderStockFallback(el, data);
      }).catch(function (err) {
        el.innerHTML = '<div class="ces-final-error">โหลด Stock Dashboard ไม่สำเร็จ: ' + esc(err && err.message ? err.message : err) + '</div>';
      });
    };
    window.sdRefresh = function () { return window.initStockDashboardModule(true); };
    window.sdLoadDashboard = function () { return window.initStockDashboardModule(false); };

    window.initStockInventoryModule = function (force) {
      injectTheme();
      var el = $('#view-inventory') || $('#stockpro-inventory') || $('#main-content');
      if (!el) return;
      if (typeof window.siEnsureStyle === 'function') { try { window.siEnsureStyle(); } catch (e) {} }
      el.innerHTML = '<div class="stockpro-inventory"><div class="si-loading">⏳ กำลังโหลด Inventory...</div></div>';
      loadStockData(force).then(function (data) {
        try { siDevices = data.devices.slice(); siFiltered = data.devices.slice(); siPage = 1; } catch (e) {}
        try { localStorage.setItem('CES_STOCK_INVENTORY_CACHE', JSON.stringify({ ts: Date.now(), data: data.devices })); } catch (e2) {}
        if (typeof window.siRenderFull === 'function') window.siRenderFull(el);
        else renderInventoryFallback(el, data.devices);
      }).catch(function (err) {
        el.innerHTML = '<div class="ces-final-error">โหลด Inventory ไม่สำเร็จ: ' + esc(err && err.message ? err.message : err) + '</div>';
      });
    };
    window.siLoadInventory = function () { return window.initStockInventoryModule(false); };
  }
  function renderStockFallback(el, data) {
    var k = data.kpi || {};
    el.innerHTML = '<div class="stockpro-dashboard"><h2>Stock Dashboard</h2><div class="sp-kpi-grid">' +
      ['จำนวนทั้งหมด:'+k.total,'พร้อมส่ง:'+k.stock,'รอสอบเทียบ:'+k.recheck,'เช่ายืม:'+k.inUse,'ใช้งานไม่ได้:'+k.broken,'ไม่พบในรายการ:'+k.missing].map(function (x) {
        var a = x.split(':'); return '<div class="sp-kpi-card"><div class="sp-kpi-info"><div class="sp-kpi-label">'+esc(a[0])+'</div><div class="sp-kpi-value">'+esc(a[1])+'</div></div></div>';
      }).join('') + '</div></div>';
  }
  function renderInventoryFallback(el, rows) {
    rows = rows || [];
    el.innerHTML = '<div class="stockpro-inventory"><h2>Inventory</h2><div class="stockpro-card"><div class="stockpro-card-head"><h3>Equipment List</h3><span class="sp-pill">'+rows.length+' items</span></div><div style="overflow:auto"><table class="sp-table"><thead><tr><th>ID</th><th>SN</th><th>Brand</th><th>Model</th><th>Location</th><th>Status</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td>'+esc(r.id_code)+'</td><td>'+esc(r.serial_number)+'</td><td>'+esc(r.brand)+'</td><td>'+esc(r.model)+'</td><td>'+esc(r.location)+'</td><td><span class="sp-badge '+esc(r.display_status)+'">'+esc(r.display_status)+'</span></td></tr>';
    }).join('') + '</tbody></table></div></div></div>';
  }

  /* ============================================================
     CSI / PDF
  ============================================================ */
  function patchPdfExports() {
    var origService = window.exportServiceToPDF;
    var origReport = window.exportReportToPDF;
    if (typeof origService === 'function' && !origService.__cesFinalWrapped) {
      window.exportServiceToPDF = async function () {
        try {
          if (window.Swal) window.Swal.fire({ title: 'Loading PDF libraries...', allowOutsideClick: false, didOpen: function () { window.Swal.showLoading(); } });
          await ensurePdfLibs();
          if (window.Swal) window.Swal.close();
          return await origService.apply(this, arguments);
        } catch (err) {
          if (window.Swal) window.Swal.fire('Missing Library', 'โหลด html2canvas/jsPDF ไม่สำเร็จ: ' + (err && err.message ? err.message : err), 'error');
          else alert('PDF library load failed: ' + (err && err.message ? err.message : err));
        }
      };
      window.exportServiceToPDF.__cesFinalWrapped = true;
    }
    if (typeof origReport === 'function' && !origReport.__cesFinalWrapped) {
      window.exportReportToPDF = async function () {
        try {
          if (window.Swal) window.Swal.fire({ title: 'Loading PDF libraries...', allowOutsideClick: false, didOpen: function () { window.Swal.showLoading(); } });
          await ensurePdfLibs();
          if (window.Swal) window.Swal.close();
          return await origReport.apply(this, arguments);
        } catch (err) {
          if (window.Swal) window.Swal.fire('Missing Library', 'โหลด html2canvas/jsPDF ไม่สำเร็จ: ' + (err && err.message ? err.message : err), 'error');
          else alert('PDF library load failed: ' + (err && err.message ? err.message : err));
        }
      };
      window.exportReportToPDF.__cesFinalWrapped = true;
    }
  }

  function patchCsiReload() {
    window.CES_RECHECK_CSI_FRONTEND = function () {
      return Promise.allSettled([
        callAny([{ fn: 'serviceCSIRecheck', args: [] }, { fn: 'getServiceDataOnly', args: [] }]),
        callAny([{ fn: 'reportCSIRecheck', args: [] }, { fn: 'getReportDataOnly', args: [] }])
      ]).then(function (r) {
        console.log('[CES CSI Recheck]', r);
        return r;
      });
    };
    var origSwitch = window.switchTab;
    if (typeof origSwitch === 'function' && !origSwitch.__cesFinalCsiTheme) {
      window.switchTab = function (tab) {
        var result = origSwitch.apply(this, arguments);
        setTimeout(function () {
          refreshTheme();
          if (tab === 'service' || tab === 'report') patchPdfExports();
          if (tab === 'revenue') refreshRevenue(false).catch(function () {});
          if (tab === 'stock_dashboard') window.initStockDashboardModule(false);
          if (tab === 'inventory') window.initStockInventoryModule(false);
        }, 50);
        return result;
      };
      window.switchTab.__cesFinalCsiTheme = true;
    }
  }

  /* ============================================================
     API / RECHECK
  ============================================================ */
  function patchApiHelpers() {
    window.CES_FRONTEND_FINAL_VERSION = PATCH_VERSION;
    window.CES_API_RECHECK = function () {
      var out = { frontend: PATCH_VERSION, gasUrl: (window.CES_CONFIG && window.CES_CONFIG.GAS_API_URL) || '', checks: {} };
      return callAny([{ fn: 'health', args: [] }, { fn: 'cesHubHealthCheck', args: [] }, { fn: 'CES_RECHECK_ALL', args: [] }])
        .then(function (res) { out.checks.api = { ok:true, result:res }; console.log('[CES_API_RECHECK]', out); return out; })
        .catch(function (err) { out.checks.api = { ok:false, error: err && err.message ? err.message : String(err) }; console.error('[CES_API_RECHECK]', out); return out; });
    };
    window.CES_FRONTEND_RECHECK_ALL = function () {
      return Promise.allSettled([
        window.CES_API_RECHECK(),
        refreshRevenue(false),
        loadStockData(false),
        ensurePdfLibs().then(function () { return { pdfLibs:true }; }),
        ensureChartLibs().then(function () { return { chart:true }; })
      ]).then(function (results) { console.log('[CES_FRONTEND_RECHECK_ALL]', results); return results; });
    };
  }

  function boot() {
    injectTheme();
    patchRevenue();
    patchStock();
    patchPdfExports();
    patchCsiReload();
    patchApiHelpers();
    refreshTheme();
    // Render current tab after all wrappers are ready.
    setTimeout(function () {
      patchPdfExports();
      var tab = window.currentTab || (document.body.dataset && document.body.dataset.cesTab) || '';
      if (tab === 'revenue' || !$('#view-revenue.hidden')) refreshRevenue(false).catch(function () {});
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  console.log('[CES Hub] Final frontend fix loaded:', PATCH_VERSION);
})();
