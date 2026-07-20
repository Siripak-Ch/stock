// ============================================================
// 50-revenue-dashboard.js
// Revenue Dashboard module — GitHub Pages + Apps Script bridge ready
// Backend contract:
//   getRevenueDashboardData(year)
//   saveRevenueData(year, month, team, target, actual)
//   saveBulkRevenueData(year, bulkData)
// ============================================================

let revenueChart = null;
let revenueCache = null;
let revenueLoading = false;
let currentEditTeam = '';

(function initRevenueSystem() {
  // Start after modular views are loaded. This cache is also used by Home Dashboard.
  setTimeout(function () {
    if (document.getElementById('view-revenue')) fetchRevenueDataBackground(false);
  }, 1000);
})();

function revenueNotifyError(message) {
  const msg = String(message || 'Revenue API error');
  console.error('[Revenue]', msg);
  if (window.Swal) Swal.fire({ icon: 'error', title: 'Revenue Error', text: msg });
  else alert('Revenue Error: ' + msg);
}

function revenueSetLoading(isLoading) {
  revenueLoading = !!isLoading;
  const totalActEl = document.getElementById('rev-total-act');
  if (totalActEl && isLoading) totalActEl.innerHTML = '<i class="fas fa-spinner fa-spin text-gray-300"></i>';
  const reloadBtnIcon = document.querySelector('#view-revenue button[onclick="forceReloadRevenue()"] i');
  if (reloadBtnIcon) reloadBtnIcon.classList.toggle('fa-spin', !!isLoading);
}

function revenueSelectedYear() {
  const yearSelect = document.getElementById('rev-filter-year');
  return yearSelect ? String(yearSelect.value || '2026') : '2026';
}

function normalizeRevenueResponse(data, year) {
  if (!data) return { year: String(year), monthly: [], summary: null, charts: { labels: [], med_t: [], med_a: [], lab_t: [], lab_a: [], ehs_t: [], ehs_a: [] } };
  // In case a bridge returns {success:true,data/result:...} directly.
  if (data.data && data.data.result) data = data.data.result;
  if (data.result) data = data.result;
  data.year = String(data.year || year || revenueSelectedYear());
  data.monthly = Array.isArray(data.monthly) ? data.monthly : [];
  data.summary = data.summary || { totalTarget: 0, totalActual: 0, med: { tgt:0, act:0 }, lab: { tgt:0, act:0 }, ehs: { tgt:0, act:0 } };
  data.charts = data.charts || {
    labels: data.monthly.map(function (m) { return m.month; }),
    med_t: data.monthly.map(function (m) { return m.med && m.med.t || 0; }),
    med_a: data.monthly.map(function (m) { return m.med && m.med.a || 0; }),
    lab_t: data.monthly.map(function (m) { return m.lab && m.lab.t || 0; }),
    lab_a: data.monthly.map(function (m) { return m.lab && m.lab.a || 0; }),
    ehs_t: data.monthly.map(function (m) { return m.ehs && m.ehs.t || 0; }),
    ehs_a: data.monthly.map(function (m) { return m.ehs && m.ehs.a || 0; })
  };
  return data;
}

function fetchRevenueDataBackground(showLoading) {
  const year = revenueSelectedYear();
  if (showLoading !== false) revenueSetLoading(true);

  google.script.run
    .withSuccessHandler(function (data) {
      revenueSetLoading(false);
      revenueCache = normalizeRevenueResponse(data, year);
      const view = document.getElementById('view-revenue');
      if (view && !view.classList.contains('hidden')) renderRevenueFromCache();
    })
    .withFailureHandler(function (err) {
      revenueSetLoading(false);
      revenueNotifyError(err && err.message ? err.message : err);
    })
    .getRevenueDashboardData(year);
}

function loadRevenueData() {
  const selectedYear = revenueSelectedYear();
  if (revenueCache && String(revenueCache.year) === String(selectedYear)) renderRevenueFromCache();
  else fetchRevenueDataBackground(true);
}

function forceReloadRevenue() {
  revenueCache = null;
  fetchRevenueDataBackground(true);
}

function renderRevenueFromCache() {
  if (!revenueCache || !Array.isArray(revenueCache.monthly)) return;
  updateRevenueCards(revenueCache.summary);
  renderRevenueTables(revenueCache.monthly);
  renderRevenueChart(revenueCache.charts);
}

function formatCurrencyShort(num) {
  num = Number(num || 0);
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function formatMoney(num) {
  return (Number(num || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleInputComma(input) {
  const value = String(input.value || '').replace(/,/g, '').replace(/฿/g, '').trim();
  if (!isNaN(value) && value !== '') input.value = parseFloat(value).toLocaleString('en-US');
}

function parseRawValue(str) {
  return parseFloat(String(str || '').replace(/,/g, '').replace(/฿/g, '').trim()) || 0;
}

function updateRevenueCards(sum) {
  if (!sum) return;
  const setTxt = function (id, val) { const el = document.getElementById(id); if (el) el.innerText = val; };
  const setWidth = function (id, pct) { const el = document.getElementById(id); if (el) el.style.width = Math.min(Number(pct || 0), 100) + '%'; };

  const totalPct = sum.totalTarget > 0 ? (sum.totalActual / sum.totalTarget) * 100 : 0;
  setTxt('rev-total-act', formatCurrencyShort(sum.totalActual));
  setTxt('rev-total-tgt', formatCurrencyShort(sum.totalTarget));
  setTxt('rev-total-pct-badge', totalPct.toFixed(1) + '%');
  setTimeout(function () { setWidth('rev-total-prog', totalPct); }, 100);

  const updateTeamCard = function (team, data) {
    data = data || { tgt: 0, act: 0 };
    const pct = data.tgt > 0 ? (data.act / data.tgt) * 100 : 0;
    setTxt('rev-' + team + '-act', formatCurrencyShort(data.act));
    setTxt('rev-' + team + '-tgt', formatCurrencyShort(data.tgt));
    setTxt('rev-' + team + '-pct', pct.toFixed(0) + '%');
    setTimeout(function () { setWidth('rev-' + team + '-prog', pct); }, 150);
  };

  updateTeamCard('med', sum.med);
  updateTeamCard('lab', sum.lab);
  updateTeamCard('ehs', sum.ehs);
}

function renderRevenueTables(list) {
  const renderTableSafe = function (id, key, hexColor) {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.innerHTML = list.map(function (d) {
      const item = d[key] || { a: 0, t: 0, pct: 0 };
      let pctColor = 'text-red-500';
      if (item.pct >= 80) pctColor = 'text-[#003DA5]';
      else if (item.pct >= 50) pctColor = 'text-[#003DA5]';
      return '<tr class="hover:bg-gray-50 transition-colors">' +
        '<td class="p-3 border-b border-gray-50 font-bold text-gray-700 w-16">' + d.month + '</td>' +
        '<td class="p-3 border-b border-gray-50 text-right">' +
          '<div class="font-bold text-gray-800">' + formatMoney(item.a) + '</div>' +
          '<div class="w-full bg-gray-100 h-1 rounded-full mt-1 ml-auto max-w-[100px] overflow-hidden">' +
            '<div class="h-1 rounded-full" style="width: ' + Math.min(item.pct || 0, 100) + '%; background-color: ' + hexColor + '"></div>' +
          '</div>' +
        '</td>' +
        '<td class="p-3 border-b border-gray-50 text-right font-black ' + pctColor + ' text-xs w-16 align-top">' + Number(item.pct || 0).toFixed(0) + '%</td>' +
      '</tr>';
    }).join('');
  };
  renderTableSafe('table-med', 'med', '#004aad');
  renderTableSafe('table-lab', 'lab', '#19a7ce');
  renderTableSafe('table-ehs', 'ehs', '#0fc1a1');
}

function openRevenueEditModal(team) {
  if (!revenueCache) { fetchRevenueDataBackground(true); return; }
  currentEditTeam = String(team || '').toLowerCase();
  const modal = document.getElementById('modal-edit-revenue');
  const header = document.getElementById('modal-rev-header');
  const monthSelect = document.getElementById('edit-rev-month');
  if (!modal || !header || !monthSelect) return;

  const colors = { med: '#004aad', lab: '#19a7ce', ehs: '#0fc1a1' };
  header.style.backgroundColor = colors[currentEditTeam] || '#1e293b';
  monthSelect.innerHTML = revenueCache.monthly.map(function (m) { return '<option value="' + m.month + '">' + m.month + '</option>'; }).join('');

  monthSelect.onchange = function () {
    const selectedMonth = monthSelect.value;
    const row = revenueCache.monthly.find(function (i) { return i.month === selectedMonth; });
    const data = row && row[currentEditTeam] ? row[currentEditTeam] : { t: 0, a: 0 };
    const tgtInput = document.getElementById('edit-rev-target');
    const actInput = document.getElementById('edit-rev-actual');
    if (tgtInput) tgtInput.value = Number(data.t || 0).toLocaleString();
    if (actInput) actInput.value = Number(data.a || 0).toLocaleString();
  };
  monthSelect.onchange();
  modal.classList.remove('hidden');
}

function closeRevenueEditModal() {
  const modal = document.getElementById('modal-edit-revenue');
  if (modal) modal.classList.add('hidden');
}

function submitRevenueEdit() {
  if (!revenueCache || revenueLoading) return;
  const btn = document.getElementById('btn-save-revenue');
  const year = revenueCache.year;
  const month = document.getElementById('edit-rev-month').value;
  const target = parseRawValue(document.getElementById('edit-rev-target').value);
  const actual = parseRawValue(document.getElementById('edit-rev-actual').value);

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

  google.script.run
    .withSuccessHandler(function (res) {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Save Changes'; }
      if (res && res.success === false) return revenueNotifyError(res.message || 'Save failed');
      closeRevenueEditModal();
      forceReloadRevenue();
    })
    .withFailureHandler(function (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Save Changes'; }
      revenueNotifyError(err && err.message ? err.message : err);
    })
    .saveRevenueData(year, month, currentEditTeam, target, actual);
}

function openBulkEditModal() {
  if (!revenueCache) { fetchRevenueDataBackground(true); return; }
  const tbody = document.getElementById('bulk-edit-tbody');
  const modal = document.getElementById('modal-bulk-edit');
  if (!tbody || !modal) return;
  tbody.innerHTML = revenueCache.monthly.map(function (m) {
    return '<tr class="hover:bg-gray-50/50 transition-colors">' +
      '<td class="p-4 font-bold text-gray-700 bg-gray-50/30">' + m.month + '</td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-blue-700" data-month="' + m.month + '" data-field="med-t" value="' + Number(m.med.t || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-blue-900" data-month="' + m.month + '" data-field="med-a" value="' + Number(m.med.a || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-cyan-700" data-month="' + m.month + '" data-field="lab-t" value="' + Number(m.lab.t || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-cyan-900" data-month="' + m.month + '" data-field="lab-a" value="' + Number(m.lab.a || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-[#003DA5]" data-month="' + m.month + '" data-field="ehs-t" value="' + Number(m.ehs.t || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
      '<td class="p-2"><input type="text" class="bulk-edit-input text-[#003DA5]" data-month="' + m.month + '" data-field="ehs-a" value="' + Number(m.ehs.a || 0).toLocaleString() + '" onblur="handleInputComma(this)"></td>' +
    '</tr>';
  }).join('');
  modal.classList.remove('hidden');
}

function closeBulkEditModal() {
  const modal = document.getElementById('modal-bulk-edit');
  if (modal) modal.classList.add('hidden');
}

function submitBulkEdit() {
  if (!revenueCache || revenueLoading) return;
  const btn = document.getElementById('btn-save-bulk');
  const rows = document.querySelectorAll('#bulk-edit-tbody tr');
  const year = revenueCache.year;
  const bulkData = [];

  rows.forEach(function (row) {
    const month = row.querySelector('td').innerText;
    bulkData.push({
      month: month,
      med_t: parseRawValue(row.querySelector('[data-field="med-t"]').value),
      med_a: parseRawValue(row.querySelector('[data-field="med-a"]').value),
      lab_t: parseRawValue(row.querySelector('[data-field="lab-t"]').value),
      lab_a: parseRawValue(row.querySelector('[data-field="lab-a"]').value),
      ehs_t: parseRawValue(row.querySelector('[data-field="ehs-t"]').value),
      ehs_a: parseRawValue(row.querySelector('[data-field="ehs-a"]').value)
    });
  });

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

  google.script.run
    .withSuccessHandler(function (res) {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Save All Data'; }
      if (res && res.success === false) return revenueNotifyError(res.message || 'Bulk save failed');
      closeBulkEditModal();
      forceReloadRevenue();
      if (window.Swal) Swal.fire({ icon: 'success', title: 'Updated!', text: 'All revenue data has been saved.', timer: 1800, showConfirmButton: false });
    })
    .withFailureHandler(function (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Save All Data'; }
      revenueNotifyError(err && err.message ? err.message : err);
    })
    .saveBulkRevenueData(year, bulkData);
}

function renderRevenueChart(chartData) {
  const ctx = document.getElementById('revenueTrendChart');
  if (!ctx || !window.Chart || !chartData) return;
  if (revenueChart) revenueChart.destroy();

  const targetBarPlugin = {
    id: 'targetBarLayer',
    beforeDatasetsDraw: function (chart) {
      const x = chart.scales.x, y = chart.scales.y, c = chart.ctx;
      chart.data.datasets.forEach(function (dataset, i) {
        if (!dataset.targetData) return;
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach(function (bar, index) {
          const targetVal = dataset.targetData[index];
          if (targetVal == null) return;
          const xPos = bar.x;
          const width = bar.width;
          const yPosTarget = y.getPixelForValue(targetVal);
          const yPosZero = y.getPixelForValue(0);
          c.save();
          c.fillStyle = '#e2e8f0';
          c.fillRect(xPos - (width / 2) - 2, yPosTarget, width + 4, yPosZero - yPosTarget);
          c.restore();
        });
      });
    }
  };

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels || [],
      datasets: [
        { label: 'MED', data: chartData.med_a || [], backgroundColor: '#004aad', targetData: chartData.med_t || [], barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'LAB', data: chartData.lab_a || [], backgroundColor: '#19a7ce', targetData: chartData.lab_t || [], barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'EHS', data: chartData.ehs_a || [], backgroundColor: '#0fc1a1', targetData: chartData.ehs_t || [], barPercentage: 0.6, categoryPercentage: 0.8 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: function (v) { return (v / 1000000).toFixed(0) + 'M'; } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: function (v) { return (v / 1000000).toFixed(1) + 'M'; },
          font: { size: 9, weight: 'bold' },
          color: function (c) { return c.dataset.backgroundColor; },
          display: function (c) { return c.dataset.data[c.dataIndex] > 0; }
        },
        tooltip: {
          callbacks: {
            label: function (c) {
              const tgt = c.dataset.targetData[c.dataIndex] || 0;
              return [' Actual: ' + formatMoney(c.raw), ' Target: ' + formatMoney(tgt)];
            }
          }
        }
      }
    },
    plugins: window.ChartDataLabels ? [ChartDataLabels, targetBarPlugin] : [targetBarPlugin]
  });
}
