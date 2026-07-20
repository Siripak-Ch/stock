// ============================================================
// 900-app-controller.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ============================================================
    // CES Hub — Controller Script  (Dual Login: Browser + LINE LIFF)
    // ============================================================

    // ---------- Global App Variables ----------
    let currentTab  = 'home';
    let currentUser = null;
    let currentRole = null;

    // Data Caches
    let globalCalData     = [];
    let globalYearlyStats = [];
    let globalConfig      = { MED: 12, LAB: 3, EHS: 3 };
    let globalPermissions = null;

    // ---------- LIFF / LINE Variables ----------
    const LIFF_ID = '2009944147-iluulCQj';   // ← your LIFF ID
    let pendingLineProfile = null;             // Holds LINE profile while waiting for Employee-ID entry
    let pendingLineIdToken = null;             // Holds LINE idToken for server-side verification


    // ============================================================
    // AUTHENTICATION
    // ============================================================

    /**
     * Called after a successful login.
     * @param {object}  user      – the user object from the backend
     * @param {boolean} skipLink  – true  → already linked, no need to write LINE ID
     *                              false → first-time LINE user, write LINE ID now
     */
    function onLoginSuccess(user, skipLink = true) {
        currentUser = user;
        currentRole = user.role;

        // ── LINE Account Linking (runs silently in background) ──
        // First-time LINE user: after Employee ID login, link LINE account by verified idToken.
        if (!skipLink && pendingLineProfile && pendingLineIdToken) {
            const profile = pendingLineProfile;
            const token   = pendingLineIdToken;

            pendingLineProfile = null;          // clear immediately – prevent double write
            pendingLineIdToken = null;

            google.script.run
                .withSuccessHandler((res) => {
                    console.log('[LIFF] Account link result:', res);

                    if (String(res).indexOf('Linked:') === 0) {
                        currentUser.lineUserId = profile.userId;
                        currentUser.lineName   = profile.displayName;
                        localStorage.setItem('ces_user', JSON.stringify(currentUser));
                    } else {
                        console.warn('[LIFF] Linking failed:', res);
                    }
                })
                .withFailureHandler(err => {
                    console.warn('[LIFF] Linking failed (non-critical):', err.message);
                })
                .updateStaffLineDataByToken(user.id, token);
        }

        localStorage.setItem('ces_user', JSON.stringify(user));

        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('main-dashboard').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('flex');

        updateProfileUI();
        loadAllData();
    }

    function updateProfileUI() {
        if (!currentUser) return;
        const displayName = currentUser.name_eng || currentUser.name_th || currentUser.id;
        document.getElementById('user-name-display').innerText = displayName;
        document.getElementById('user-role-display').innerText = `${currentUser.position} | ${currentUser.team}`;
    }

    function logout() {
        Swal.fire({
            title: 'Signing out...',
            text: 'See you next time!',
            timer: 1000,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        }).then(() => {
            localStorage.removeItem('ces_user');
            currentUser      = null;
            currentRole      = null;
            pendingLineProfile = null;
            pendingLineIdToken = null;

            // Also log out of LIFF when running inside LINE
            try {
                if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient()) {
                    liff.logout();
                }
            } catch (e) { /* ignore */ }

            document.getElementById('main-dashboard').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('flex');
            document.getElementById('login-container').classList.remove('hidden');

            if (document.getElementById('loginId')) document.getElementById('loginId').value = '';
            const btnLogin = document.getElementById('btnLogin');
            if (btnLogin) {
                btnLogin.innerHTML = 'Login / Check ID <i class="fas fa-arrow-right ml-2"></i>';
                btnLogin.disabled  = false;
            }
        });
    }


    // ============================================================
    // PERMISSIONS
    // ============================================================

    function applyRolePermissions(role) {
        const allTabs = ['home','yearly','revenue','ot','service','report','calendar','checkin','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','users','setting'];

        // Hide all first
        allTabs.forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.classList.add('hidden');
        });

        // Show according to role
        if (role === 'ADMIN') {
            allTabs.forEach(id => {
                const btn = document.getElementById('btn-' + id);
                if (btn) btn.classList.remove('hidden');
            });
        } else if (globalPermissions && globalPermissions[role]) {
            globalPermissions[role].forEach(tabId => {
                const btn = document.getElementById('btn-' + tabId);
                if (btn) btn.classList.remove('hidden');
            });
        } else {
            if (role === 'STAFF') {
                ['home','checkin','service','ot','calendar','weekly','report_manage','kpi'].forEach(t => {
                    const btn = document.getElementById('btn-' + t);
                    if (btn) btn.classList.remove('hidden');
                });
            }
            if (role === 'SUPERVISOR') {
                ['home','checkin','service','report','ot','calendar','yearly','revenue','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock'].forEach(t => {
                    const btn = document.getElementById('btn-' + t);
                    if (btn) btn.classList.remove('hidden');
                });
            }
        }

        // Smart group hiding
        document.querySelectorAll('.menu-group').forEach(group => {
            const visibleButtons = Array.from(group.querySelectorAll('button')).filter(btn => !btn.classList.contains('hidden'));
            group.classList.toggle('hidden', visibleButtons.length === 0);
        });

        if (role !== 'ADMIN') {
            if (!document.getElementById('admin-css-guard')) {
                const style = document.createElement('style');
                style.id = 'admin-css-guard';
                style.innerHTML = `button[onclick*="SettingsModal"], button[onclick*="saveConfig"], .fa-cog { display: none !important; }`;
                document.head.appendChild(style);
            }
        } else {
            const guard = document.getElementById('admin-css-guard');
            if (guard) guard.remove();
        }
    }


    // ============================================================
    // NAVIGATION & UI
    // ============================================================

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar-menu');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
            sidebar.classList.toggle('flex');
        }
    }

    function switchTab(tab) {
        currentTab = tab;

        const allBtns = document.querySelectorAll('.nav-item');
        allBtns.forEach(btn => btn.classList.remove('active','bg-slate-50','text-indigo-600'));

        const activeBtn = document.getElementById(`btn-${tab}`);
        if (activeBtn) activeBtn.classList.add('active','bg-slate-50','text-indigo-600');

        const views = ['home','service','report','yearly','revenue','calendar','checkin','users','setting','ot','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock'];
        views.forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) { el.classList.add('hidden'); el.classList.remove('slide-up'); }
        });

        const activeView = document.getElementById(`view-${tab}`);
        if (activeView) { activeView.classList.remove('hidden'); activeView.classList.add('slide-up'); }

        const titles = {
            home: 'Home', service: 'Service CSI', report: 'Report CSI',
            yearly: 'Job Dashboard', revenue: 'Revenue Dashboard',
            calendar: 'Master Calendar', checkin: 'Check-in',
            users: 'User Management', setting: 'Setting',
            ot: 'OT Dashboard', weekly: 'Weekly Report',
            report_manage: 'Report Management',
            kpi: 'KPI Tracking',
            stock_dashboard: 'Infusion Pump Dashboard',
            inventory: 'Equipment Dashboard',
            check_stock: 'Check Stock'
        };
        const headerTitle = document.getElementById('header-page-title');
        if (headerTitle) headerTitle.innerText = titles[tab] || 'Dashboard';

        if      (tab === 'home'          && typeof renderHomeDashboard   === 'function') renderHomeDashboard();
        else if (tab === 'calendar'      && typeof initCalendar          === 'function') initCalendar(globalCalData);
        else if (tab === 'yearly'        && typeof renderYearlyStats     === 'function') renderYearlyStats(globalYearlyStats, globalConfig);
        else if (tab === 'checkin'       && typeof initCheckin           === 'function') initCheckin();
        else if (tab === 'revenue'       && typeof loadRevenueData       === 'function') loadRevenueData();
        else if (tab === 'users'         && typeof initUsers             === 'function') initUsers();
        else if (tab === 'setting'       && typeof initSettings          === 'function') initSettings();
        else if (tab === 'service'       && typeof applyServiceFilters   === 'function') applyServiceFilters();
        else if (tab === 'report'        && typeof applyReportFilters    === 'function') applyReportFilters();
        else if (tab === 'ot'            && typeof initOTData            === 'function') initOTData();
        else if (tab === 'weekly'        && typeof initWeekly            === 'function') initWeekly();
        else if (tab === 'report_manage' && typeof initReportManage      === 'function') initReportManage();
        else if (tab === 'kpi'           && typeof initKPITab            === 'function') initKPITab();
        else if (tab === 'stock_dashboard' && typeof initStockDashboardModule === 'function') initStockDashboardModule(true);
        else if (tab === 'inventory'       && typeof initStockInventoryModule === 'function') initStockInventoryModule(true);
        else if (tab === 'check_stock'     && typeof initStockCheckModule     === 'function') initStockCheckModule(true);

        // Auto-close sidebar on mobile
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar-menu');
            if (sidebar && !sidebar.classList.contains('hidden') && typeof toggleSidebar === 'function') toggleSidebar();
        }
    }


    // ============================================================
    // MODALS — Profile
    // ============================================================

    function openProfileModal() {
        if (!currentUser) return;

        document.getElementById('prof-id').value       = currentUser.id       || '';
        document.getElementById('prof-role').value     = currentUser.role     || '';
        document.getElementById('prof-name-eng').value = currentUser.name_eng || '';
        document.getElementById('prof-name-th').value  = currentUser.name_th  || '';
        document.getElementById('prof-email').value    = currentUser.email    || '';
        document.getElementById('prof-team').value     = currentUser.team     || '';
        document.getElementById('prof-position').value = currentUser.position || '';

        const costCenterEl  = document.getElementById('prof-costCenter');
        const empTypeEl     = document.getElementById('prof-empType');
        const supervisorEl  = document.getElementById('prof-supervisor');
        const telEl         = document.getElementById('prof-tel');

        if (costCenterEl)  costCenterEl.value  = currentUser.costCenter  || currentUser.cost_center || '-';
        if (empTypeEl)     empTypeEl.value     = currentUser.empType     || currentUser.emp_type    || '-';
        if (supervisorEl)  supervisorEl.value  = currentUser.supervisor  || '-';
        if (telEl)         telEl.value         = currentUser.tel         || '-';

        // Show LINE linking status in profile (optional UX enhancement)
        const lineStatusEl = document.getElementById('prof-line-status');
        if (lineStatusEl) {
            lineStatusEl.innerText = currentUser.lineUserId
                ? `✅ Linked (${currentUser.lineName || currentUser.lineUserId})`
                : '— Not linked';
        }

        document.getElementById('profileModal').classList.remove('hidden');
    }

    function closeProfileModal() {
        document.getElementById('profileModal').classList.add('hidden');
    }

    function saveProfileChanges() {
        const updates = {
            id:       currentUser.id,
            name_eng: document.getElementById('prof-name-eng').value,
            name_th:  document.getElementById('prof-name-th').value,
            email:    document.getElementById('prof-email').value
        };
        const btn = document.querySelector('#profileModal button:last-child');
        const originalBtnHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled  = true;

        google.script.run
            .withSuccessHandler(res => {
                btn.innerHTML = originalBtnHtml;
                btn.disabled  = false;
                if (res.success) {
                    currentUser.name_eng = updates.name_eng;
                    currentUser.name_th  = updates.name_th;
                    currentUser.email    = updates.email;
                    localStorage.setItem('ces_user', JSON.stringify(currentUser));
                    updateProfileUI();
                    closeProfileModal();
                    Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                btn.innerHTML = originalBtnHtml;
                btn.disabled  = false;
                Swal.fire('Error', err.message, 'error');
            })
            .updateUserProfile(updates);
    }


    // ============================================================
    // MODALS — Reset
    // ============================================================

    function openResetModal() {
        let targetName = currentTab.toUpperCase();
        if (currentTab === 'calendar') targetName = 'CALENDAR SUMMARY';
        if (currentTab === 'home')     targetName = 'DASHBOARD (Read-Only)';
        if (document.getElementById('resetTargetName')) document.getElementById('resetTargetName').innerText = targetName;
        if (document.getElementById('resetModal'))      document.getElementById('resetModal').classList.remove('hidden');
    }

    function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    function confirmReset() {
        closeModal('resetModal');
        if (currentTab === 'home') return;
        document.getElementById('loadingOverlay').classList.remove('hidden');

        let fn = '';
        if (currentTab === 'service')  fn = 'clearServiceData';
        else if (currentTab === 'report')   fn = 'clearReportData';
        else if (currentTab === 'calendar') fn = 'clearCalendarData';

        if (fn) {
            google.script.run
                .withSuccessHandler(() => {
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
                    loadAllData();
                })
                .withFailureHandler(e => {
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    Swal.fire('Error', e.message, 'error');
                })[fn]();
        } else {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }



    function getRequestedTabFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            let tab = params.get('tab') || params.get('app') || '';
            tab = String(tab || '').toLowerCase().trim();
            const alias = {
                dashboard: 'home',
                'job-dashboard': 'yearly',
                job_dashboard: 'yearly',
                yearly: 'yearly',
                'revenue-dashboard': 'revenue',
                revenue_dashboard: 'revenue',
                'ot-dashboard': 'ot',
                ot_dashboard: 'ot',
                csi: 'service',
                'service-csi': 'service',
                'report-csi': 'report',
                report_csi: 'report',
                'master-calendar': 'calendar',
                master_calendar: 'calendar',
                'check-in': 'checkin',
                check_in: 'checkin',
                'weekly-report': 'weekly',
                weekly_report: 'weekly',
                'kpi-tracking': 'kpi',
                kpi_tracking: 'kpi',
                'report-management': 'report_manage',
                reportmanagement: 'report_manage',
                'stock-dashboard': 'stock_dashboard',
                stock_dashboard: 'stock_dashboard',
                'check-stock': 'check_stock',
                check_stock: 'check_stock',
                'user-management': 'users',
                user_management: 'users',
                settings: 'setting'
            };
            tab = alias[tab] || tab;
            const valid = ['home','yearly','revenue','ot','service','report','calendar','checkin','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','users','setting'];
            return valid.includes(tab) ? tab : '';
        } catch (e) {
            return '';
        }
    }


    // ============================================================
    // DATA LOADERS
    // ============================================================

    function loadAllData() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.classList.remove('hidden');
        if (document.getElementById('loadingText')) document.getElementById('loadingText').innerText = 'Starting System...';

        google.script.run
            .withSuccessHandler((data) => {
                if (loader) loader.classList.add('hidden');

                if (data.config) {
                    globalConfig = data.config;
                    if (data.config.ROLE_PERMISSIONS) {
                        try { globalPermissions = JSON.parse(data.config.ROLE_PERMISSIONS); } catch (e) {}
                    }
                }

                globalYearlyStats = data.yearlyStats  || [];
                globalCalData     = data.calSummary   || [];

                if (currentUser) applyRolePermissions(currentUser.role);

                if (typeof renderYearlyStats   === 'function') renderYearlyStats(globalYearlyStats, globalConfig);
                if (typeof initCalendar        === 'function') initCalendar(globalCalData);
                if (typeof renderHomeDashboard === 'function') renderHomeDashboard();

                let requestedTab = getRequestedTabFromUrl();
                let startTab = requestedTab || 'home';
                if (!requestedTab && currentUser && currentUser.role !== 'ADMIN') {
                    startTab = 'calendar';
                    if (globalPermissions && globalPermissions[currentUser.role] && globalPermissions[currentUser.role].length > 0) {
                        if (!globalPermissions[currentUser.role].includes('calendar')) {
                            startTab = globalPermissions[currentUser.role][0];
                        }
                    }
                }

                currentTab = startTab;
                switchTab(startTab);

                if (document.getElementById('lastUpdateText')) {
                    document.getElementById('lastUpdateText').innerHTML = `<i class="fas fa-check-circle text-[#003DA5]"></i> Active`;
                }

                loadHeavyDataBackground();
            })
            .withFailureHandler(err => {
                if (loader) loader.classList.add('hidden');
                Swal.fire('Connection Error', (err && err.message ? err.message : 'Could not load system data. Please refresh.'), 'error');
            })
            .getAllData();
    }

    function loadHeavyDataBackground() {
        google.script.run
            .withSuccessHandler(data => {
                if (typeof initService === 'function') initService(data);
                if (currentTab === 'service' || currentTab === 'home') {
                    if (currentTab === 'service') applyServiceFilters();
                    else renderHomeDashboard();
                }
            })
            .getServiceDataOnly();

        google.script.run
            .withSuccessHandler(data => {
                if (typeof initReport === 'function') initReport(data.report, data.tickets);
                if (currentTab === 'report') applyReportFilters();
            })
            .getReportDataOnly();
    }


    // ============================================================
    // LIFF / LINE ROUTING LOGIC
    // ============================================================

    /** True when the page is running inside the LINE in-app browser */
    function isLineEnvironment() {
        return /Line/i.test(navigator.userAgent);
    }

    /** Show the login form UI */
    function showLoginForm() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('hidden');

        if (typeof refreshLineNotice === 'function') {
            refreshLineNotice();
        }
    }

    /**
     * Initialise LIFF and decide:
     *   - Auto-login (Scenario C)   → LINE ID already in Staff_Data
     *   - Show login form (Scenario B) → first-time visitor, needs Employee-ID entry
     */
    async function initLiffAndRoute() {
        try {
            await liff.init({ liffId: LIFF_ID });

            // Force login if not authenticated within LINE
            if (!liff.isLoggedIn()) {
                liff.login({ redirectUri: window.location.href });
                return; // Page will reload after LINE auth
            }

            const profile = await liff.getProfile();
            const idToken = liff.getIDToken();

            if (!idToken) {
                console.error('[LIFF] No ID token. Please enable openid scope in LINE Developers.');
                showLoginForm();
                Swal.fire(
                    'LINE Login Error',
                    'ไม่พบ LINE ID Token กรุณาตรวจสอบว่า LIFF scope มี openid',
                    'error'
                );
                return;
            }

            const lineUserId = profile.userId;
            const lineName   = profile.displayName;

            console.log('[LIFF] Profile fetched →', lineName, '|', lineUserId);

            pendingLineIdToken = idToken;

            // Ask backend to verify idToken and check if this LINE user is already linked.
            google.script.run
                .withSuccessHandler((res) => {
                    if (res && res.success && res.user) {
                        // ── Scenario C: Auto-Login ──────────────────────────
                        console.log('[LIFF] Auto-login for empId:', res.user.id);
                        localStorage.setItem('ces_user', JSON.stringify(res.user));
                        onLoginSuccess(res.user, true);   // skipLink = true (already linked)
                    } else {
                        // ── Scenario B: First-time — show login form ────────
                        console.log('[LIFF] No linked account found — showing login form');
                        pendingLineProfile = { userId: lineUserId, displayName: lineName };
                        showLoginForm();

                        if (typeof refreshLineNotice === 'function') {
                            refreshLineNotice();
                        }
                    }
                })
                .withFailureHandler((err) => {
                    console.error('[LIFF] checkUserByLineToken error:', err.message);
                    // Fallback: show login form, still attempt linking after Employee-ID entry
                    pendingLineProfile = { userId: lineUserId, displayName: lineName };
                    showLoginForm();

                    if (typeof refreshLineNotice === 'function') {
                        refreshLineNotice();
                    }
                })
                .checkUserByLineToken(idToken);

        } catch (err) {
            console.error('[LIFF] Init error:', err);
            showLoginForm(); // Graceful fallback
        }
    }


    // ============================================================
    // BOOTSTRAP — window.onload (Entry Point)
    // ============================================================

    window.onload = async () => {

        // ── Step 1: Check cached session (fastest path, works for all flows) ──
        const savedUser = localStorage.getItem('ces_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user && user.id) {
                    onLoginSuccess(user, true);   // Restore session — no need to re-link
                    return;
                }
            } catch (e) {
                localStorage.removeItem('ces_user');  // Corrupted — clear and continue
            }
        }

        // ── Step 2: Route by environment ──────────────────────────────────────
        if (isLineEnvironment() && typeof liff !== 'undefined') {
            // Scenario B or C — inside LINE app
            console.log('[CES Hub] LINE environment detected → initialising LIFF…');
            await initLiffAndRoute();
        } else {
            // Scenario A — standard browser
            console.log('[CES Hub] Standard browser → showing login form.');
            showLoginForm();
        }
    };
