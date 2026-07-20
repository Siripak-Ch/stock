// ============================================================
// 995-ui-theme-normalizer.js
// Unified visual system for CES Hub after migration to GitHub Pages.
// Standardizes page headers, loading overlay, popup styling hooks, icon colors,
// active navigation state, and removes accidental migration text residue.
// ============================================================
(function (window, document) {
  'use strict';

  const VALID_TABS = [
    'home', 'yearly', 'revenue', 'ot', 'service', 'report', 'calendar',
    'checkin', 'weekly', 'report_manage', 'kpi', 'stock_dashboard',
    'inventory', 'check_stock', 'users', 'setting'
  ];

  const TITLES = {
    home: 'Home',
    yearly: 'Job Dashboard',
    revenue: 'Revenue Dashboard',
    ot: 'OT Dashboard',
    service: 'Service CSI',
    report: 'Report CSI',
    calendar: 'Master Calendar',
    checkin: 'Check-in',
    weekly: 'Weekly Report',
    report_manage: 'Report Management',
    kpi: 'KPI Tracking',
    stock_dashboard: 'Stock Dashboard',
    inventory: 'Inventory',
    check_stock: 'Check Stock',
    users: 'User Management',
    setting: 'Setting'
  };

  const ICONS = {
    home: 'fa-home',
    yearly: 'fa-chart-pie',
    revenue: 'fa-hand-holding-usd',
    ot: 'fa-clock',
    service: 'fa-wrench',
    report: 'fa-chart-bar',
    calendar: 'fa-calendar-alt',
    checkin: 'fa-map-marker-alt',
    weekly: 'fa-calendar-check',
    report_manage: 'fa-file-invoice-dollar',
    kpi: 'fa-chart-line',
    stock_dashboard: 'fa-chart-pie',
    inventory: 'fa-boxes-stacked',
    check_stock: 'fa-qrcode',
    users: 'fa-users-cog',
    setting: 'fa-cogs'
  };

  function safeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function getActiveTab(tab) {
    if (tab && VALID_TABS.includes(tab)) return tab;
    if (window.currentTab && VALID_TABS.includes(window.currentTab)) return window.currentTab;
    const visible = VALID_TABS.find(id => {
      const el = document.getElementById('view-' + id);
      return el && !el.classList.contains('hidden');
    });
    return visible || 'home';
  }

  function setTheme(tab) {
    const active = getActiveTab(tab);
    document.body.dataset.cesTab = active;
    document.documentElement.dataset.cesTab = active;
    const headerTitle = document.getElementById('header-page-title');
    if (headerTitle) headerTitle.textContent = TITLES[active] || 'CES Hub';
    return active;
  }

  function normalizeSidebar(activeTab) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.add('ces-nav-item');
      if (activeTab && btn.id === 'btn-' + activeTab) {
        btn.classList.add('active');
      }
    });
  }

  function findViewHeader(view) {
    if (!view) return null;
    const stockHeader = view.querySelector(':scope .stockpro-header-card');
    if (stockHeader) return stockHeader;

    const direct = Array.from(view.children).filter(el => el && el.nodeType === 1);
    return direct.find(el => {
      const hasTitle = !!el.querySelector('h1, h2');
      const hasIcon = !!el.querySelector('i.fa, i.fas, i.far, i.fa-solid');
      const tooLarge = el.querySelectorAll('canvas, table, tbody').length > 0;
      return hasTitle && hasIcon && !tooLarge;
    }) || null;
  }

  function normalizeHeaderIcon(header, tab) {
    if (!header) return;
    let iconWrap = header.querySelector('.stockpro-icon');
    if (!iconWrap) {
      const icons = Array.from(header.querySelectorAll('i.fa, i.fas, i.far, i.fa-solid'));
      const icon = icons.find(i => i.parentElement && i.parentElement.tagName === 'DIV') || icons[0];
      iconWrap = icon ? icon.parentElement : null;
    }

    if (!iconWrap) return;
    iconWrap.classList.add('ces-view-icon');

    const icon = iconWrap.querySelector('i');
    if (icon && ICONS[tab]) {
      Array.from(icon.classList).forEach(cls => {
        if (/^fa-/.test(cls) && cls !== 'fas' && cls !== 'far' && cls !== 'fa-solid' && cls !== 'fa-regular') {
          icon.classList.remove(cls);
        }
      });
      if (!icon.classList.contains('fas') && !icon.classList.contains('far') && !icon.classList.contains('fa-solid')) icon.classList.add('fas');
      icon.classList.add(ICONS[tab]);
    }
  }

  function normalizeView(tab) {
    const active = getActiveTab(tab);
    const view = document.getElementById('view-' + active);
    if (!view) return;

    view.classList.add('ces-view-root');
    const header = findViewHeader(view);
    if (header) {
      header.classList.add('ces-view-header');
      normalizeHeaderIcon(header, active);

      header.querySelectorAll('button, a').forEach(el => el.classList.add('ces-ui-action'));
      header.querySelectorAll('.bg-gray-100, .bg-slate-100, .bg-indigo-50, .bg-blue-50\/50').forEach(el => el.classList.add('ces-segmented'));
    }
  }

  function normalizeAllViews() {
    VALID_TABS.forEach(normalizeView);
  }

  function normalizeLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay || overlay.dataset.cesNormalized === '1') return;

    const currentText = document.getElementById('loadingText') ? document.getElementById('loadingText').textContent : 'Processing Data...';
    overlay.innerHTML = `
      <div class="ces-loading-panel">
        <div class="ces-loading-mark">
          <div class="ces-loading-ring"></div>
          <i class="fas fa-bolt"></i>
        </div>
        <p id="loadingText">${safeText(currentText) || 'Processing Data...'}</p>
        <p class="ces-loading-subtext">CES Hub is syncing data securely</p>
      </div>`;
    overlay.dataset.cesNormalized = '1';
  }

  function showLoading(message) {
    normalizeLoadingOverlay();
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (text && message) text.textContent = message;
    if (overlay) overlay.classList.remove('hidden');
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function cleanDebugResidue() {
    const root = document.getElementById('app-main-content') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = safeText(node.nodeValue);
        if (!text) return NodeFilter.FILTER_REJECT;
        const isResidue = /\[cite:\s*\d+\]|End Main Container|Main Setting View Container|View ID:|CES Stock Pro V\d|={8,}/i.test(text);
        return isResidue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const toClean = [];
    while (walker.nextNode()) toClean.push(walker.currentNode);
    toClean.forEach(node => { node.nodeValue = ''; });

    root.querySelectorAll('*').forEach(el => {
      const text = safeText(el.childNodes.length === 1 ? el.textContent : '');
      if (/\[cite:\s*\d+\]|End Main Container|Main Setting View Container|View ID:|CES Stock Pro V\d|={8,}/i.test(text)) {
        el.classList.add('ces-debug-residue');
      }
    });
  }

  function patchSweetAlertDefaults() {
    if (!window.Swal || window.Swal.__cesThemePatched) return;

    const originalFire = window.Swal.fire.bind(window.Swal);
    window.Swal.fire = function patchedCesSwalFire(...args) {
      if (args.length === 1 && args[0] && typeof args[0] === 'object') {
        args[0] = Object.assign({
          buttonsStyling: true,
          confirmButtonColor: '#003DA5',
          cancelButtonColor: '#e2e8f0'
        }, args[0], {
          customClass: Object.assign({ popup: 'ces-swal-popup' }, args[0].customClass || {})
        });
      }
      return originalFire(...args);
    };
    window.Swal.__cesThemePatched = true;
  }

  function wrapControllerFunctions() {
    if (window.switchTab && !window.switchTab.__cesThemeWrapped) {
      const originalSwitchTab = window.switchTab;
      window.switchTab = function cesSwitchTabWrapper(tab) {
        const result = originalSwitchTab.apply(this, arguments);
        setTimeout(() => CESUI.onTabChanged(tab), 0);
        return result;
      };
      window.switchTab.__cesThemeWrapped = true;
    }

    if (window.onLoginSuccess && !window.onLoginSuccess.__cesThemeWrapped) {
      const originalLoginSuccess = window.onLoginSuccess;
      window.onLoginSuccess = function cesOnLoginSuccessWrapper() {
        const result = originalLoginSuccess.apply(this, arguments);
        setTimeout(() => CESUI.refresh(), 100);
        return result;
      };
      window.onLoginSuccess.__cesThemeWrapped = true;
    }
  }

  function refresh(tab) {
    normalizeLoadingOverlay();
    cleanDebugResidue();
    normalizeAllViews();
    const active = setTheme(tab);
    normalizeSidebar(active);
    normalizeView(active);
    patchSweetAlertDefaults();
    return active;
  }

  function onTabChanged(tab) {
    const active = setTheme(tab);
    normalizeSidebar(active);
    normalizeView(active);
    cleanDebugResidue();
  }

  const CESUI = {
    refresh,
    onTabChanged,
    showLoading,
    hideLoading,
    normalizeLoadingOverlay,
    cleanDebugResidue
  };

  window.CESUI = CESUI;
  window.showGlobalLoading = showLoading;
  window.hideGlobalLoading = hideLoading;

  // Initial pass. HTML is already injected by include-loader before modules run.
  refresh();
  wrapControllerFunctions();

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    wrapControllerFunctions();
  });

  window.addEventListener('load', () => {
    setTimeout(() => {
      refresh();
      wrapControllerFunctions();
    }, 150);
  });
})(window, document);
