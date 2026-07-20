/**
 * 140-stock-dashboard.js
 * CES Stock Pro Dashboard — Full rewrite for new data structure
 * Uses display_status (Thai) directly from DB_Devices_Clean sheet
 * NO English status mapping needed
 * 
 * Spreadsheet: 1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk
 * Sheet: DB_Devices_Clean — display_status is single source of truth
 */

/* ============================================================
   CONSTANTS & CONFIG
   ============================================================ */
const SD_CACHE_KEY = 'CES_STOCK_DASHBOARD_CACHE';
const SD_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const SD_COLORS = {
  navy: '#003DA5',
  steel: '#5B7F95',
  cyan: '#19a7ce',
  red: '#E4002B',
  green: '#16a34a',
  iconBg: 'rgba(0,61,165,0.1)'
};

const SD_STATUS_LABELS = ['พร้อมส่ง', 'รอสอบเทียบ', 'เช่ายืม', 'ใช้งานไม่ได้', 'ไม่พบในรายการ'];

const SD_BADGE_COLORS = {
  'พร้อมส่ง': { bg: '#dcfce7', color: '#16a34a' },
  'รอสอบเทียบ': { bg: '#f1f5f9', color: '#5B7F95' },
  'เช่ายืม': { bg: '#e0f7fa', color: '#0e7490' },
  'ใช้งานไม่ได้': { bg: '#e2e8f0', color: '#475569' },
  'ไม่พบในรายการ': { bg: '#fee2e2', color: '#991b1b' }
};

/* ============================================================
   STYLES
   ============================================================ */
function sdEnsureStyle() {
  if (document.getElementById('sd-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-styles';
  style.textContent = `
    .stockpro-dashboard { padding: 16px; font-family: 'Sarabun', sans-serif; }
    .stockpro-dashboard h2 { color: ${SD_COLORS.navy}; margin-bottom: 16px; font-size: 1.5rem; }

    /* KPI Cards */
    .sp-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .sp-kpi-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
    .sp-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .sp-kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; background: ${SD_COLORS.iconBg}; color: ${SD_COLORS.navy}; }
    .sp-kpi-info { flex: 1; }
    .sp-kpi-label { font-size: 0.85rem; color: #64748b; margin-bottom: 4px; }
    .sp-kpi-value { font-size: 1.75rem; font-weight: 700; line-height: 1; }

    /* Badges */
    .sp-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .sp-badge.พร้อมส่ง { background: #dcfce7; color: #16a34a; }
    .sp-badge.รอสอบเทียบ { background: #f1f5f9; color: #5B7F95; }
    .sp-badge.เช่ายืม { background: #e0f7fa; color: #0e7490; }
    .sp-badge.ใช้งานไม่ได้ { background: #e2e8f0; color: #475569; }
    .sp-badge.ไม่พบในรายการ { background: #fee2e2; color: #991b1b; }

    /* Model Cards */
    .sp-model-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .sp-model-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid ${SD_COLORS.navy}; }
    .sp-model-card h4 { color: ${SD_COLORS.navy}; margin: 0 0 12px 0; font-size: 1rem; }
    .sp-model-stat { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; color: #475569; }
    .sp-model-stat span:last-child { font-weight: 600; }

    /* Charts */
    .sp-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 768px) { .sp-chart-grid { grid-template-columns: 1fr; } }
    .sp-chart-box { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .sp-chart-box h4 { color: ${SD_COLORS.navy}; margin: 0 0 16px 0; font-size: 0.95rem; }

    /* Contract Table */
    .sp-table-wrap { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px; overflow-x: auto; }
    .sp-table-wrap h4 { color: ${SD_COLORS.navy}; margin: 0 0 12px 0; }
    .sp-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .sp-table th { background: #f8fafc; color: ${SD_COLORS.navy}; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    .sp-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .sp-table tr:hover td { background: #f8fafc; }

    /* Alert Table */
    .sp-alert-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .sp-alert-section h4 { color: ${SD_COLORS.red}; margin: 0 0 12px 0; }
    .sp-alert-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .sp-alert-row:last-child { border-bottom: none; }
    .sp-alert-icon { color: ${SD_COLORS.red}; font-size: 1.1rem; }

    /* Loading */
    .sp-loading { text-align: center; padding: 60px 20px; color: #64748b; }
    .sp-loading .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: ${SD_COLORS.navy}; border-radius: 50%; animation: sp-spin 0.8s linear infinite; }
    @keyframes sp-spin { to { transform: rotate(360deg); } }

    /* Refresh Button */
    .sp-refresh-btn { background: ${SD_COLORS.navy}; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .sp-refresh-btn:hover { opacity: 0.9; }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   DATA FETCHING & CACHING
   ============================================================ */
function sdLoadDashboard() {
  sdEnsureStyle();
  const el = document.getElementById('view-stock_dashboard') || document.getElementById('stockpro-dashboard') || document.getElementById('main-content');
  if (!el) return;

  // Show loading
  el.innerHTML = `
    <div class="stockpro-dashboard">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2>📊 Stock Dashboard</h2>
        <button class="sp-refresh-btn" onclick="sdRefresh()">🔄 รีเฟรช</button>
      </div>
      <div class="sp-loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
    </div>`;

  // Try cache first
  const cached = sdGetCache();
  if (cached) {
    sdRender(el, cached);
    return;
  }

  // Fetch from server
  google.script.run
    .withSuccessHandler(function(data) {
      sdSetCache(data);
      sdRender(el, data);
    })
    .withFailureHandler(function(err) {
      el.querySelector('.sp-loading').innerHTML = `<p style="color:${SD_COLORS.red}">❌ โหลดข้อมูลไม่สำเร็จ: ${spEsc(err.message || err)}</p>`;
    })
    .sd_getStockDashboardData(false);
}

function sdRefresh() {
  localStorage.removeItem(SD_CACHE_KEY);
  const el = document.getElementById('view-stock_dashboard') || document.getElementById('stockpro-dashboard') || document.getElementById('main-content');
  if (!el) return;

  el.querySelector('.stockpro-dashboard').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2>📊 Stock Dashboard</h2>
      <button class="sp-refresh-btn" onclick="sdRefresh()">🔄 รีเฟรช</button>
    </div>
    <div class="sp-loading"><div class="spinner"></div><p>กำลังรีเฟรชข้อมูล...</p></div>`;

  google.script.run
    .withSuccessHandler(function(data) {
      sdSetCache(data);
      sdRender(el, data);
    })
    .withFailureHandler(function(err) {
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้: ' + (err.message || err), 'error');
    })
    .sd_getStockDashboardData(true);
}

function sdGetCache() {
  try {
    const raw = localStorage.getItem(SD_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > SD_CACHE_TTL) {
      localStorage.removeItem(SD_CACHE_KEY);
      return null;
    }
    return obj.data;
  } catch (e) { return null; }
}

function sdSetCache(data) {
  try {
    localStorage.setItem(SD_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (e) { /* quota exceeded — ignore */ }
}

/* ============================================================
   RENDER
   ============================================================ */
function sdRender(el, data) {
  const kpi = data.kpi || {};
  const models = data.modelCards || [];
  const contracts = data.contractSummary || [];
  const alerts = data.alerts || [];
  const rentalByMonth = data.rentalByMonth || {};
  const statusDist = data.statusDistribution || {};

  let html = `<div class="stockpro-dashboard">`;

  // Header
  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h2>📊 Stock Dashboard</h2>
    <button class="sp-refresh-btn" onclick="sdRefresh()">🔄 รีเฟรช</button>
  </div>`;

  // KPI Cards (4 cards)
  html += `<div class="sp-kpi-grid">`;
  html += sdKpiCard('📦', 'จำนวนทั้งหมด', kpi.total || 0, SD_COLORS.navy);
  html += sdKpiCard('✅', 'พร้อมส่ง', kpi.stock || 0, SD_COLORS.green);
  html += sdKpiCard('🔧', 'รอสอบเทียบ', kpi.recheck || 0, SD_COLORS.steel);
  html += sdKpiCard('🔄', 'เช่ายืม', kpi.inUse || 0, SD_COLORS.cyan);
  html += `</div>`;

  // Model Cards
  if (models.length > 0) {
    html += `<h3 style="color:${SD_COLORS.navy};margin-bottom:12px;">📋 สรุปตามรุ่น</h3>`;
    html += `<div class="sp-model-grid">`;
    models.forEach(function(m) {
      html += sdModelCard(m);
    });
    html += `</div>`;
  }

  // Charts
  html += `<div class="sp-chart-grid">`;
  html += `<div class="sp-chart-box"><h4>🥧 สัดส่วนสถานะ</h4><canvas id="sd-pie-chart" width="300" height="300"></canvas></div>`;
  html += `<div class="sp-chart-box"><h4>📈 เช่ายืมรายเดือน</h4><canvas id="sd-bar-chart" width="300" height="300"></canvas></div>`;
  html += `</div>`;

  // Contract Summary Table
  if (contracts.length > 0) {
    html += `<div class="sp-table-wrap">`;
    html += `<h4>📄 สรุปสัญญาตามหน่วยงาน</h4>`;
    html += `<table class="sp-table"><thead><tr>
      <th>หน่วยงาน/Location</th><th>จำนวนเครื่อง</th><th>เช่ายืม</th><th>เกินกำหนด</th>
    </tr></thead><tbody>`;
    contracts.forEach(function(c) {
      html += `<tr>
        <td>${spEsc(c.location || '-')}</td>
        <td>${spNum(c.total)}</td>
        <td>${spNum(c.inUse)}</td>
        <td style="color:${c.overdue > 0 ? SD_COLORS.red : 'inherit'};font-weight:${c.overdue > 0 ? '600' : 'normal'}">${spNum(c.overdue)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // Alert Table
  if (alerts.length > 0) {
    html += `<div class="sp-alert-section">`;
    html += `<h4>⚠️ แจ้งเตือน (${alerts.length} รายการ)</h4>`;
    alerts.slice(0, 20).forEach(function(a) {
      html += `<div class="sp-alert-row">
        <span class="sp-alert-icon">⚠️</span>
        <span style="flex:1"><strong>${spEsc(a.id_code || '')}</strong> ${spEsc(a.brand || '')} ${spEsc(a.model || '')} — ${spEsc(a.action_required || a.note || '')}</span>
        <span class="sp-badge ${spEsc(a.display_status || '')}">${spEsc(a.display_status || '-')}</span>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;

  el.innerHTML = html;

  // Render Charts
  setTimeout(function() {
    sdRenderPieChart(statusDist);
    sdRenderBarChart(rentalByMonth);
  }, 100);
}

/* ============================================================
   KPI CARD BUILDER
   ============================================================ */
function sdKpiCard(icon, label, value, color) {
  return `<div class="sp-kpi-card">
    <div class="sp-kpi-icon">${icon}</div>
    <div class="sp-kpi-info">
      <div class="sp-kpi-label">${spEsc(label)}</div>
      <div class="sp-kpi-value" style="color:${color}">${spNum(value)}</div>
    </div>
  </div>`;
}

/* ============================================================
   MODEL CARD BUILDER
   ============================================================ */
function sdModelCard(m) {
  return `<div class="sp-model-card">
    <h4>${spEsc(m.brand || '')} ${spEsc(m.model || '')}</h4>
    <div class="sp-model-stat"><span>จำนวนทั้งหมด</span><span>${spNum(m.total)}</span></div>
    <div class="sp-model-stat"><span>พร้อมส่ง</span><span style="color:${SD_COLORS.green}">${spNum(m.stock)}</span></div>
    <div class="sp-model-stat"><span>รอสอบเทียบ</span><span style="color:${SD_COLORS.steel}">${spNum(m.recheck)}</span></div>
    <div class="sp-model-stat"><span>เช่ายืม</span><span style="color:${SD_COLORS.cyan}">${spNum(m.inUse)}</span></div>
    <div class="sp-model-stat"><span>เกินกำหนด</span><span style="color:${SD_COLORS.red}">${spNum(m.overdue || 0)}</span></div>
  </div>`;
}

/* ============================================================
   CHARTS (Chart.js)
   ============================================================ */
function sdRenderPieChart(statusDist) {
  const canvas = document.getElementById('sd-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = [];
  const values = [];
  const colors = [];

  SD_STATUS_LABELS.forEach(function(s) {
    const count = statusDist[s] || 0;
    if (count > 0) {
      labels.push(s);
      values.push(count);
      colors.push(SD_BADGE_COLORS[s] ? SD_BADGE_COLORS[s].color : '#94a3b8');
    }
  });

  new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Sarabun', size: 12 } } }
      }
    }
  });
}

function sdRenderBarChart(rentalByMonth) {
  const canvas = document.getElementById('sd-bar-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = Object.keys(rentalByMonth).sort();
  const values = labels.map(function(k) { return rentalByMonth[k]; });

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'จำนวนเช่ายืม',
        data: values,
        backgroundColor: SD_COLORS.cyan,
        borderRadius: 6,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { font: { size: 11 } } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
function sdInit() {
  sdLoadDashboard();
}

/* ============================================================
   APP CONTROLLER COMPATIBILITY
   ============================================================ */
function initStockDashboardModule(force) {
  if (force) localStorage.removeItem(SD_CACHE_KEY);
  sdLoadDashboard();
}
