// ============================================================
// 990-service-csi-index-fix-v18.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

(function () {
  'use strict';
  if (window.__CES_SERVICE_CSI_INDEX_FIX_V18__) return;
  window.__CES_SERVICE_CSI_INDEX_FIX_V18__ = true;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let serviceLoadBusy = false;
  let lastServiceLoadAt = 0;

  function log() {
    if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) {
      console.log.apply(console, ['[Service CSI Fix]'].concat([].slice.call(arguments)));
    }
  }

  function unwrapResponse(raw) {
    if (!raw) return raw;
    if (raw.data && typeof raw.data === 'object' && Object.prototype.hasOwnProperty.call(raw.data, 'result')) return raw.data.result;
    if (Object.prototype.hasOwnProperty.call(raw, 'result')) return raw.result;
    if (Array.isArray(raw.data)) return raw.data;
    return raw;
  }

  function asArray(raw) {
    raw = unwrapResponse(raw);
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.rows)) return raw.rows;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (raw && Array.isArray(raw.records)) return raw.records;
    return [];
  }

  function str(v) { return String(v == null ? '' : v).trim(); }
  function lower(v) { return str(v).toLowerCase(); }
  function upper(v) { return str(v).toUpperCase(); }
  function num(v) {
    const n = Number(str(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function getAny(obj, keys, fallback) {
    if (!obj || typeof obj !== 'object') return fallback || '';
    const map = {};
    Object.keys(obj).forEach(k => { map[String(k).trim().toLowerCase()] = obj[k]; });
    for (const k of keys) {
      const kk = String(k).trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(map, kk)) return map[kk];
    }
    return fallback || '';
  }

  function normalizeYear(v, row) {
    if (v instanceof Date && !isNaN(v.getTime())) return String(v.getFullYear());
    let s = str(v);
    if (!s && row) s = str(getAny(row, ['timestamp','date','created_at','วันที่','MonthFull','monthFull'], ''));
    if (!s) return 'Unknown';

    const thaiYearMatch = s.match(/(25\d{2})/);
    if (thaiYearMatch) return String(Number(thaiYearMatch[1]) - 543);

    const christianYearMatch = s.match(/(20\d{2})/);
    if (christianYearMatch) return christianYearMatch[1];

    const n = Number(s);
    if (Number.isFinite(n)) {
      if (n > 2400 && n < 2700) return String(n - 543);
      if (n > 1900 && n < 2200) return String(n);
      // Excel serial date
      if (n > 20000 && n < 80000) {
        const d = new Date((n - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) return String(d.getFullYear());
      }
    }

    const d = parseFlexibleDate(s);
    return d ? String(d.getFullYear()) : 'Unknown';
  }

  function parseFlexibleDate(v) {
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const s = str(v);
    if (!s) return null;
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      if (y > 2400) y -= 543;
      const d2 = new Date(y, Number(m[2]) - 1, Number(m[1]));
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  }

  function normalizeMonth(v, row) {
    let s = str(v);
    if (MONTHS.includes(s)) return s;
    const full = str(row && getAny(row, ['monthFull','MonthFull','month_full','เดือน'], ''));
    const source = [s, full, str(row && getAny(row, ['timestamp','date','วันที่'], ''))].join(' ');
    const sourceLower = source.toLowerCase();
    const fullNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    for (let i = 0; i < MONTHS.length; i++) {
      if (sourceLower.includes(MONTHS[i].toLowerCase()) || sourceLower.includes(fullNames[i])) return MONTHS[i];
    }
    const th = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];
    for (let i = 0; i < th.length; i++) if (source.includes(th[i])) return MONTHS[i];
    const d = parseFlexibleDate(source);
    if (d) return MONTHS[d.getMonth()];
    const n = Number(s);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return MONTHS[n - 1];
    return 'Unknown';
  }

  function normalizeTeam(v) {
    const t = upper(v);
    if (!t) return 'Other';
    if (t === 'MED' || t.includes('MEDICAL') || t.includes('CAL-MED')) return 'MED';
    if (t === 'LAB' || t.includes('LAB') || t.includes('TESTING')) return 'LAB';
    if (t === 'EHS' || t.includes('ENV') || t.includes('ENVIRONMENTAL') || t.includes('HEALTH')) return 'EHS';
    if (t === 'TES' || t.includes('TECHNICAL')) return 'TES';
    return str(v) || 'Other';
  }

  function normalizeFinished(v) {
    const s = lower(v);
    if (['yes','y','true','1','finished','finish','complete','completed','done','สำเร็จ','เสร็จ'].includes(s)) return 'Yes';
    if (['no','n','false','0','not finish','not finished','pending','ยังไม่เสร็จ'].includes(s)) return 'No';
    return s ? str(v) : 'No';
  }

  function normalizeCustomerType(v) {
    const s = lower(v);
    if (s.includes('network')) return 'Network';
    if (s.includes('commercial')) return 'Commercial';
    if (s.includes('bdms')) return 'Network';
    return str(v) || 'Commercial';
  }

  function normalizeServiceRow(row) {
    if (Array.isArray(row)) {
      row = {
        id: row[0], monthFull: row[1], monthOnly: row[2], year: row[3], finished: row[4],
        team: row[5], customer: row[6], s1: row[7], s2: row[8], s3: row[9], s4: row[10], s5: row[11],
        comments: row[12], raw: row[13], customerName: row[14]
      };
    }
    row = row || {};
    const rawDate = getAny(row, ['timestamp','date','created_at','วันที่'], '');
    const y = normalizeYear(getAny(row, ['year','Year','ปี'], rawDate), row);
    const m = normalizeMonth(getAny(row, ['monthOnly','MonthOnly','month_only','month','Month','เดือน'], ''), row);
    return {
      id: str(getAny(row, ['id','ID','responseId','Response ID','response_id'], '')),
      monthFull: str(getAny(row, ['monthFull','MonthFull','month_full'], m)),
      monthOnly: m,
      year: y,
      finished: normalizeFinished(getAny(row, ['finished','Finished','status','Status','สถานะ'], 'No')),
      team: normalizeTeam(getAny(row, ['team','Team','serviceTeam','Service Team','service','Raw','sourceSheet'], 'Other')),
      customer: normalizeCustomerType(getAny(row, ['customer','Customer','customerType','Customer Type','type','ประเภท'], 'Commercial')),
      s1: num(getAny(row, ['s1','S1'], 0)),
      s2: num(getAny(row, ['s2','S2'], 0)),
      s3: num(getAny(row, ['s3','S3'], 0)),
      s4: num(getAny(row, ['s4','S4'], 0)),
      s5: num(getAny(row, ['s5','S5'], 0)),
      comments: str(getAny(row, ['comments','Comments','comment','feedback'], '')),
      raw: str(getAny(row, ['raw','Raw','service','Service'], '')),
      customerName: str(getAny(row, ['customerName','customer_name','Customer Name','customer_name_th','customer'], '')),
      sourceSheet: str(getAny(row, ['sourceSheet','source_sheet'], '')),
      _raw: row
    };
  }

  function normalizeServiceRows(rows) {
    const seen = {};
    return asArray(rows).map(normalizeServiceRow).filter(r => {
      if (!(r.id || r.customerName || r.customer)) return false;
      const teamKey = normalizeTeam(r.team);
      // v8: Do not show invalid partial Formbricks rows that were saved as Other.
      if (!['MED','LAB','EHS','TES'].includes(teamKey)) return false;
      // v9: hide old invalid rows from migrated/uploaded sheets, e.g. blank/test TES rows with all scores = 0.
      const allScoresZero = [r.s1, r.s2, r.s3, r.s4, r.s5].every(v => num(v) <= 0);
      const customerText = lower(r.customerName || r.customer || '');
      const badCustomer = !customerText || ['a','aa','.', '-', 'test','เทส','ทดสอบ'].includes(customerText) || customerText.includes('test') || customerText.includes('ทดสอบ');
      if (allScoresZero && badCustomer) return false;
      // v7: TES rows should come from TES_Service_Data only.
      // Ignore old migrated rows where Service_Data/other sheets contain team TES.
      if (teamKey === 'TES' && r.sourceSheet && !/TES[_ ]Service[_ ]Data/i.test(r.sourceSheet)) return false;
      const key = [r.sourceSheet || '', r.id || '', teamKey, r.customerName || r.customer || ''].join('|');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function normalizeCustomerRows(rows) {
    const arr = asArray(rows);
    if (!arr.length && Array.isArray(serviceRawData)) {
      return serviceRawData.map(r => ({
        monthOnly: r.monthOnly, year: r.year, finished: r.finished, team: r.team,
        customerType: r.customer, customer: r.customerName || r.customer,
        s1: r.s1, s2: r.s2, s3: r.s3, s4: r.s4, s5: r.s5
      })).filter(r => str(r.customer) && ['MED','LAB','EHS','TES'].includes(normalizeTeam(r.team)));
    }
    return arr.map(c => {
      c = c || {};
      const y = normalizeYear(getAny(c, ['year','Year','ปี'], ''), c);
      const m = normalizeMonth(getAny(c, ['monthOnly','MonthOnly','month','Month'], ''), c);
      return {
        monthOnly: m,
        year: y,
        finished: normalizeFinished(getAny(c, ['finished','Finished','status','Status'], 'No')),
        team: normalizeTeam(getAny(c, ['team','Team','serviceTeam','Service Team'], 'Other')),
        customerType: normalizeCustomerType(getAny(c, ['customerType','Customer Type','customer','Customer','type'], 'Commercial')),
        customer: str(getAny(c, ['customer','Customer','customerName','Customer Name','customer_name'], '')),
        s1: num(getAny(c, ['s1','S1'], 0)), s2: num(getAny(c, ['s2','S2'], 0)),
        s3: num(getAny(c, ['s3','S3'], 0)), s4: num(getAny(c, ['s4','S4'], 0)), s5: num(getAny(c, ['s5','S5'], 0))
      };
    }).filter(r => str(r.customer) && ['MED','LAB','EHS','TES'].includes(normalizeTeam(r.team)));
  }

  function getYears(rows) {
    return Array.from(new Set((rows || []).map(r => normalizeYear(r.year, r)).filter(y => y && y !== 'Unknown'))).sort();
  }

  function pickDefaultYear(rows) {
    const years = getYears(rows);
    if (!years.length) return 'All';
    const current = String(new Date().getFullYear());
    if (years.includes(current)) return current;
    if (years.includes('2026')) return '2026';
    return years[years.length - 1];
  }

  function syncSelect(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if ([].slice.call(el.options).some(o => String(o.value) === String(value))) el.value = value;
  }

  function setOptions(id, options, allText) {
    const el = document.getElementById(id);
    if (!el) return;
    const opts = ['<option value="All">' + (allText || 'All') + '</option>'].concat((options || []).map(x => '<option value="' + x + '">' + x + '</option>'));
    el.innerHTML = opts.join('');
  }

  window.populateServiceDropdowns = function () {
    try {
      const years = getYears(serviceRawData || []);
      if (!sFilters || typeof sFilters !== 'object') sFilters = { team:'All', year:'All', month:'All', customer:'All', status:'All' };
      if (!years.includes(String(sFilters.year)) && sFilters.year !== 'All') sFilters.year = pickDefaultYear(serviceRawData || []);
      setOptions('s-filter-year', years, 'All Years');
      setOptions('s-filter-month', MONTHS, 'All Months');
      syncSelect('s-filter-year', sFilters.year || 'All');
      syncSelect('s-filter-month', sFilters.month || 'All');
      syncSelect('s-filter-customer', sFilters.customer || 'All');
      syncSelect('s-filter-status', sFilters.status || 'All');
      log('dropdowns', { years: years, selectedYear: sFilters.year, rows: (serviceRawData || []).length });
    } catch (e) {
      console.error('[Service CSI Fix] populateServiceDropdowns error', e);
    }
  };

  window.renderCustomerList = function () {
    const tbody = document.getElementById('customer-list-body');
    const badge = document.getElementById('customer-count-badge');
    if (!tbody) return;
    const rows = normalizeCustomerRows(customerRawData || []);
    let filtered = rows.filter(c => {
      return (sFilters.team === 'All' || normalizeTeam(c.team) === sFilters.team) &&
        (sFilters.year === 'All' || String(c.year) === String(sFilters.year)) &&
        (sFilters.month === 'All' || c.monthOnly === sFilters.month) &&
        (sFilters.customer === 'All' || normalizeCustomerType(c.customerType) === sFilters.customer) &&
        (sFilters.status === 'All' || (sFilters.status === 'Yes' ? normalizeFinished(c.finished) === 'Yes' : normalizeFinished(c.finished) !== 'Yes'));
    });
    if (typeof custSortCol !== 'undefined' && custSortCol) {
      filtered.sort((a, b) => {
        const va = num(a[custSortCol]);
        const vb = num(b[custSortCol]);
        return custSortAsc ? va - vb : vb - va;
      });
    }
    const html = filtered.map(c => {
      const team = normalizeTeam(c.team);
      const color = (typeof COLORS !== 'undefined' && COLORS[team]) ? COLORS[team] : '#64748b';
      const fmt = v => num(v) > 0 ? num(v).toFixed(2) : '-';
      return '<tr class="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">' +
        '<td class="p-3 align-middle whitespace-nowrap"><span style="display:inline-flex;align-items:center;justify-content:center;width:45px;height:24px;border-radius:4px;background:' + color + ';color:white;font-size:10px;font-weight:800;">' + team + '</span></td>' +
        '<td class="p-3 align-middle text-sm font-semibold text-gray-800 truncate max-w-[220px]" title="' + str(c.customer).replace(/"/g,'&quot;') + '">' + (str(c.customer) || '-') + '</td>' +
        '<td class="p-3 align-middle text-center text-xs text-gray-600">' + fmt(c.s1) + '</td>' +
        '<td class="p-3 align-middle text-center text-xs text-gray-600">' + fmt(c.s2) + '</td>' +
        '<td class="p-3 align-middle text-center text-xs text-gray-600">' + fmt(c.s3) + '</td>' +
        '<td class="p-3 align-middle text-center text-xs text-gray-600">' + fmt(c.s4) + '</td>' +
        '<td class="p-3 align-middle text-center text-xs text-gray-600">' + fmt(c.s5) + '</td>' +
        '</tr>';
    }).join('');
    tbody.innerHTML = html || '<tr><td colspan="7" class="p-10 text-center text-gray-400">No data available for selected filters</td></tr>';
    if (badge) badge.innerText = filtered.length + ' Items';
  };

  window.applyServiceFilters = function () {
    try {
      serviceRawData = normalizeServiceRows(serviceRawData || []);
      if (!sFilters || typeof sFilters !== 'object') sFilters = { team:'All', year:'All', month:'All', customer:'All', status:'All' };
      const years = getYears(serviceRawData);
      if (!years.includes(String(sFilters.year)) && sFilters.year !== 'All') sFilters.year = pickDefaultYear(serviceRawData);
      populateServiceDropdowns();

      serviceFilteredData = (serviceRawData || []).filter(d => {
        return (sFilters.team === 'All' || normalizeTeam(d.team) === sFilters.team) &&
          (sFilters.year === 'All' || String(d.year) === String(sFilters.year)) &&
          (sFilters.month === 'All' || d.monthOnly === sFilters.month) &&
          (sFilters.customer === 'All' || normalizeCustomerType(d.customer) === sFilters.customer) &&
          (sFilters.status === 'All' || (sFilters.status === 'Yes' ? normalizeFinished(d.finished) === 'Yes' : normalizeFinished(d.finished) !== 'Yes'));
      });

      ['All','MED','LAB','EHS','TES'].forEach(t => {
        const idMap = {All:'All', MED:'Med', LAB:'Lab', EHS:'Env', TES:'Tes'};
        const btn = document.getElementById('btn-team-' + idMap[t]);
        if (!btn) return;
        btn.className = (sFilters.team === t)
          ? 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#003DA5] shadow-md transform scale-105 transition-all'
          : 'px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:bg-white hover:text-indigo-600 transition-all';
      });

      renderCustomerList();
      if (typeof updateServiceUI === 'function') updateServiceUI(serviceFilteredData);

      if (!serviceRawData.length && Date.now() - lastServiceLoadAt > 3000) {
        setTimeout(() => window.loadServiceCSIOnly(false), 100);
      }
    } catch (e) {
      console.error('[Service CSI Fix] applyServiceFilters error', e);
      if (window.Swal) Swal.fire('Service CSI Error', e.message || String(e), 'error');
    }
  };

  window.initService = function (data) {
    try {
      serviceRawData = normalizeServiceRows(data || []);
      if (!sFilters || typeof sFilters !== 'object') sFilters = { team:'All', year:'All', month:'All', customer:'All', status:'All' };
      sFilters.team = sFilters.team || 'All';
      sFilters.month = sFilters.month || 'All';
      sFilters.customer = sFilters.customer || 'All';
      sFilters.status = sFilters.status || 'All';
      const years = getYears(serviceRawData);
      if (!years.includes(String(sFilters.year)) && sFilters.year !== 'All') sFilters.year = pickDefaultYear(serviceRawData);

      customerRawData = normalizeCustomerRows([]);
      populateServiceDropdowns();
      if (typeof populateCompareDropdowns === 'function') populateCompareDropdowns();
      applyServiceFilters();

      // Refresh customer table from backend. The service data itself is already enough as fallback.
      try {
        google.script.run
          .withSuccessHandler(cust => {
            customerRawData = normalizeCustomerRows(cust || []);
            renderCustomerList();
          })
          .withFailureHandler(err => {
            console.warn('[Service CSI Fix] getCustomerListData failed; using derived customer list', err);
            customerRawData = normalizeCustomerRows([]);
            renderCustomerList();
          })
          .getCustomerListData();
      } catch (e) {
        customerRawData = normalizeCustomerRows([]);
        renderCustomerList();
      }
      log('initService done', { rows: serviceRawData.length, year: sFilters.year });
    } catch (e) {
      console.error('[Service CSI Fix] initService error', e);
      if (window.Swal) Swal.fire('Service CSI Init Error', e.message || String(e), 'error');
    }
  };

  window.setSFilter = function (k, v) {
    if (!sFilters || typeof sFilters !== 'object') sFilters = { team:'All', year:'All', month:'All', customer:'All', status:'All' };
    sFilters[k] = v;
    applyServiceFilters();
  };

  window.loadServiceCSIOnly = function (showLoading) {
    if (serviceLoadBusy) return;
    serviceLoadBusy = true;
    lastServiceLoadAt = Date.now();
    const loader = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (showLoading && loader) loader.classList.remove('hidden');
    if (showLoading && text) text.innerText = 'Loading Service CSI...';

    google.script.run
      .withSuccessHandler(res => {
        serviceLoadBusy = false;
        if (loader) loader.classList.add('hidden');
        const rows = normalizeServiceRows(res || []);
        initService(rows);
        if (showLoading && window.Swal) Swal.fire({ icon:'success', title:'Service CSI Loaded', text: rows.length + ' records', timer:1200, showConfirmButton:false });
      })
      .withFailureHandler(err => {
        serviceLoadBusy = false;
        if (loader) loader.classList.add('hidden');
        const msg = err && err.message ? err.message : String(err || 'Unknown error');
        console.error('[Service CSI Fix] load failed', err);
        if (window.Swal) Swal.fire('Service CSI Load Error', msg, 'error');
      })
      .getServiceDataOnly();
  };

  window.serviceV23ReloadData = function () { return window.loadServiceCSIOnly(true); };

  function patchServiceButtons() {
    const view = document.getElementById('view-service');
    if (!view) return;
    view.querySelectorAll('[onclick="loadAllData()"], [onclick="loadAllData();"]').forEach(el => {
      el.setAttribute('onclick', 'loadServiceCSIOnly(true)');
      el.setAttribute('title', 'Reload Service CSI');
    });
  }

  function requestedServiceTab() {
    try {
      const qs = new URLSearchParams(location.search);
      const tab = (qs.get('tab') || qs.get('page') || '').toLowerCase();
      return tab === 'service' || tab === 'csi' || tab === 'service-csi';
    } catch (e) { return false; }
  }

  const waitWrap = setInterval(function () {
    if (typeof window.switchTab === 'function') {
      clearInterval(waitWrap);
      const originalSwitchTab = window.switchTab;
      window.switchTab = function (tab) {
        const ret = originalSwitchTab.apply(this, arguments);
        if (String(tab || '').toLowerCase() === 'service') {
          setTimeout(function () {
            patchServiceButtons();
            const years = getYears(serviceRawData || []);
            if (!Array.isArray(serviceRawData) || !serviceRawData.length || (!years.length && Date.now() - lastServiceLoadAt > 3000)) {
              window.loadServiceCSIOnly(false);
            } else {
              applyServiceFilters();
            }
          }, 80);
        }
        return ret;
      };
    }
  }, 200);

  document.addEventListener('DOMContentLoaded', function () {
    patchServiceButtons();
    if (requestedServiceTab()) setTimeout(function () { window.loadServiceCSIOnly(false); }, 800);
  });
})();
