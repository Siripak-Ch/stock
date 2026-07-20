// ============================================================
// 110-users-management.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

let _userCache = null; 
    let _permConfig = {};
    const ALL_MODULES = [
        // Main Dashboard
        { id: 'home',            name: 'Home',              group: 'Main Dashboard', icon: 'fa-home' },
        { id: 'yearly',          name: 'Job Dashboard',     group: 'Main Dashboard', icon: 'fa-chart-pie' },
        { id: 'revenue',         name: 'Revenue Dashboard', group: 'Main Dashboard', icon: 'fa-hand-holding-usd' },
        { id: 'ot',              name: 'OT Dashboard',      group: 'Main Dashboard', icon: 'fa-clock' },

        // Performance
        { id: 'service',         name: 'Service CSI',       group: 'Performance', icon: 'fa-clipboard-check' },
        { id: 'report',          name: 'Report CSI',        group: 'Performance', icon: 'fa-chart-bar' },

        // Operation
        { id: 'calendar',        name: 'Master Calendar',   group: 'Operation', icon: 'fa-calendar-alt' },
        { id: 'checkin',         name: 'Check-in',          group: 'Operation', icon: 'fa-map-marker-alt' },
        { id: 'weekly',          name: 'Weekly Report',     group: 'Operation', icon: 'fa-calendar-check' },
        { id: 'kpi',             name: 'KPI Tracking',      group: 'Operation', icon: 'fa-chart-line' },
        { id: 'report_manage',   name: 'Report Management', group: 'Operation', icon: 'fa-file-invoice-dollar' },

        // Inventory
        { id: 'stock_dashboard', name: 'Stock Dashboard',   group: 'Inventory', icon: 'fa-chart-pie' },
        { id: 'inventory',       name: 'Inventory',         group: 'Inventory', icon: 'fa-boxes-stacked' },
        { id: 'check_stock',     name: 'Check Stock',       group: 'Inventory', icon: 'fa-qrcode' },

        // System
        { id: 'users',           name: 'User Management',   group: 'System', icon: 'fa-users-cog' },
        { id: 'setting',         name: 'Setting',           group: 'System', icon: 'fa-cogs' }
    ];

    function initUsers() {
        if (_userCache) {
            renderApprovalSection();
            filterUserTable();
        } else {
            refreshUserList();
        }
    }

    function refreshUserList(force = false) {
        if(force) _userCache = null;
        const tbody = document.getElementById('user-list-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-400 italic"><div class="flex flex-col items-center"><i class="fas fa-circle-notch fa-spin text-2xl mb-3 text-[#003DA5]"></i>Fetching user data...</div></td></tr>';
        google.script.run.withSuccessHandler(data => {
            _userCache = data;
            renderApprovalSection();
            filterUserTable();
        }).withFailureHandler(err => {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500">Error: ${err.message}</td></tr>`;
        }).getAllUsers();
    }

    function renderApprovalSection() {
        const pending = _userCache.filter(u => u.role === 'PENDING');
        const sec = document.getElementById('approval-section');
        const cont = document.getElementById('approval-container');
        
        if (pending.length === 0) {
            sec.classList.add('hidden');
            return;
        }
        
        sec.classList.remove('hidden');
        cont.innerHTML = pending.map(u => `
            <div class="bg-white border border-[#003DA5] rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-16 h-16 bg-[#003DA5] rounded-bl-full -z-10 group-hover:bg-[#003DA5] transition-colors"></div>
                <div class="flex gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#003DA5] to-[#004aad] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                        ${(u.name_eng || u.name_th || u.id).charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-gray-800 text-sm truncate">${u.name_eng || u.name_th}</p>
                        <p class="text-[10px] text-gray-500 truncate">${u.email || u.id}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="handleApprove('${u.id}', ${u.rowIndex})" class="flex-1 bg-[#003DA5]/10 text-[#003DA5] hover:bg-[#003DA5] hover:text-white py-2 rounded-xl text-xs font-bold transition-all border border-[#003DA5] hover:border-[#003DA5]">
                        <i class="fas fa-check mr-1"></i> Approve
                    </button>
                    <button onclick="handleReject('${u.id}', ${u.rowIndex})" class="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-all border border-red-100 hover:border-red-500">
                        <i class="fas fa-times mr-1"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    function filterUserTable() {
        const query = (document.getElementById('user-search').value || '').toLowerCase();
        const activeUsers = _userCache.filter(u => u.role !== 'PENDING');
        
        const filtered = activeUsers.filter(u => 
            (u.name_eng && u.name_eng.toLowerCase().includes(query)) ||
            (u.name_th && u.name_th.toLowerCase().includes(query)) ||
            (u.team && u.team.toLowerCase().includes(query)) ||
            (u.id && u.id.toLowerCase().includes(query))
        );
        const tbody = document.getElementById('user-list-tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400 italic">No users found matching "${query}"</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((u, i) => {
            let roleColor = 'gray';
            if(u.role === 'ADMIN') roleColor = 'blue';
            else if(u.role === 'SUPERVISOR') roleColor = 'blue';
            else if(u.role === 'STAFF') roleColor = 'slate';

            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 border-r text-center text-xs text-gray-400 font-bold">${i+1}</td>
                <td class="p-4 border-r">
                    <p class="font-bold text-gray-800 text-sm">${u.name_eng || u.name_th}</p>
                    <p class="text-[10px] text-gray-500">${u.email || u.id}</p>
                </td>
                <td class="p-4 border-r">
                    <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider">${u.team || '-'}</span>
                    <p class="text-[11px] text-gray-500 mt-1 truncate max-w-[150px]">${u.position || '-'}</p>
                </td>
                <td class="p-4 border-r text-center">
                    <span class="bg-${roleColor}-100 text-${roleColor}-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">${u.role}</span>
                </td>
                <td class="p-4 border-r text-center">
                    <span class="text-[#003DA5] text-xs font-bold"><i class="fas fa-circle text-[8px] mr-1"></i> Active</span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="editUser('${u.id}')" class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors" title="Edit Role">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function handleApprove(id, row) {
        Swal.fire({ title: 'Approving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        google.script.run.withSuccessHandler(res => {
            if(res.success) {
                Swal.fire({ icon: 'success', title: 'Approved', timer: 1500, showConfirmButton: false });
                refreshUserList(true);
            } else Swal.fire('Error', res.message, 'error');
        }).approveUser(id, row);
    }

    function handleReject(id, row) {
        Swal.fire({
            title: 'Reject User?', text: "They will be removed from the system.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#E4002B', confirmButtonText: 'Yes, Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Rejecting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                google.script.run.withSuccessHandler(res => {
                    if(res.success) {
                        Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
                        refreshUserList(true);
                    } else Swal.fire('Error', res.message, 'error');
                }).rejectUser(id, row);
            }
        });
    }

    function editUser(id) {
        const user = _userCache.find(u => u.id === id);
        if(!user) return;
        
        document.getElementById('edit-row').value = user.rowIndex;
        document.getElementById('edit-name').value = user.name_eng || user.name_th;
        document.getElementById('edit-email').value = user.email;
        
        document.getElementById('edit-team').value = user.team || 'OTHER';
        document.getElementById('edit-position').value = user.position || '';
        document.getElementById('edit-role').value = user.role;

        document.getElementById('edit-costCenter').value = user.costCenter || '';
        document.getElementById('edit-supervisor').value = user.supervisor || '';
        document.getElementById('edit-empType').value = user.empType || '';
        document.getElementById('edit-tel').value = user.tel || '';

        document.getElementById('editUserModal').classList.remove('hidden');
    }

    function saveUserEdit() {
        const updates = {
            rowIndex: parseInt(document.getElementById('edit-row').value),
            team: document.getElementById('edit-team').value,
            position: document.getElementById('edit-position').value,
            role: document.getElementById('edit-role').value,
            costCenter: document.getElementById('edit-costCenter').value,
            supervisor: document.getElementById('edit-supervisor').value,
            empType: document.getElementById('edit-empType').value,
            tel: document.getElementById('edit-tel').value
        };
        const btn = document.querySelector('#editUserModal button:last-child');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
        btn.disabled = true;
        google.script.run.withSuccessHandler(res => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            if(res.success) {
                document.getElementById('editUserModal').classList.add('hidden');
                Swal.fire({ icon: 'success', title: 'Saved', text: 'User profile updated.', timer: 1500, showConfirmButton: false });
                refreshUserList(true);
            } else Swal.fire('Error', res.message, 'error');
        }).withFailureHandler(err => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            Swal.fire('Error', err.message, 'error');
        }).saveUserChange(updates);
    }

    function openPermissionModal() {
        const defaultPerms = {
            'SUPERVISOR': [
                'home', 'yearly', 'revenue', 'ot',
                'service', 'report',
                'calendar', 'checkin', 'weekly', 'kpi', 'report_manage',
                'stock_dashboard', 'inventory', 'check_stock'
            ],
            'STAFF': [
                'home',
                'checkin', 'weekly', 'report_manage', 'kpi',
                'stock_dashboard', 'inventory', 'check_stock'
            ],
            'ADMIN': ALL_MODULES.map(m => m.id)
        };

        if (!globalPermissions) {
            _permConfig = JSON.parse(JSON.stringify(defaultPerms));
        } else {
            _permConfig = JSON.parse(JSON.stringify(globalPermissions));

            // Auto-add missing arrays to avoid old Config breaking new modules.
            ['ADMIN', 'SUPERVISOR', 'STAFF'].forEach(role => {
                if (!_permConfig[role]) _permConfig[role] = defaultPerms[role] || [];
            });

            // ADMIN always sees every module.
            _permConfig.ADMIN = ALL_MODULES.map(m => m.id);
        }

        renderPermissionTable();
        document.getElementById('permissionModal').classList.remove('hidden');
    }

    function renderPermissionTable() {
        const roles = ['ADMIN', 'SUPERVISOR', 'STAFF'];
        const tbody = document.getElementById('perm-tbody');
        if (!tbody) return;

        let currentGroup = '';
        const rows = [];

        ALL_MODULES.forEach(mod => {
            if (mod.group !== currentGroup) {
                currentGroup = mod.group;
                rows.push(`
                    <tr class="bg-slate-50">
                        <td colspan="4" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            ${currentGroup}
                        </td>
                    </tr>
                `);
            }

            let rowHtml = `
                <tr class="hover:bg-indigo-50/30 transition-colors">
                    <td class="p-4 border-r text-sm font-bold text-gray-700">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <i class="fas ${mod.icon || 'fa-cube'} text-xs"></i>
                            </div>
                            <div>
                                <div>${mod.name}</div>
                                <div class="text-[10px] text-slate-400 font-bold">${mod.id}</div>
                            </div>
                        </div>
                    </td>
            `;

            roles.forEach(role => {
                let isChecked = false;

                if (role === 'ADMIN') {
                    isChecked = true;
                } else if (_permConfig[role] && _permConfig[role].includes(mod.id)) {
                    isChecked = true;
                }

                const disabled = role === 'ADMIN' ? 'disabled' : '';
                rowHtml += `
                    <td class="p-4 text-center bg-gray-50/20">
                        <input type="checkbox"
                               class="perm-chk w-5 h-5 accent-indigo-600 cursor-pointer rounded border-gray-300 focus:ring-indigo-500"
                               data-role="${role}"
                               data-mod="${mod.id}"
                               ${isChecked ? 'checked' : ''}
                               ${disabled}>
                    </td>
                `;
            });

            rows.push(rowHtml + '</tr>');
        });

        tbody.innerHTML = rows.join('');
    }

    function savePermissions() {
        const roles = ['ADMIN', 'SUPERVISOR', 'STAFF'];
        let newPerms = {};

        roles.forEach(role => {
            newPerms[role] = [];
        });

        // ADMIN always gets all modules.
        newPerms.ADMIN = ALL_MODULES.map(m => m.id);

        document.querySelectorAll('.perm-chk:checked').forEach(chk => {
            const r = chk.dataset.role;
            const m = chk.dataset.mod;
            if (!newPerms[r]) newPerms[r] = [];
            if (!newPerms[r].includes(m)) newPerms[r].push(m);
        });

        // Keep home visible for all roles to avoid blank login landing.
        ['SUPERVISOR', 'STAFF'].forEach(role => {
            if (!newPerms[role].includes('home')) newPerms[role].unshift('home');
        });

        Swal.fire({ 
            title: 'Saving permissions...', 
            text: 'Updating sidebar module access',
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        const onSaveSuccess = (res) => {
            if (res && res.success) {
                const savedPerms = (res.permissions && typeof res.permissions === 'object') ? res.permissions : newPerms;
                globalPermissions = savedPerms;
                _permConfig = JSON.parse(JSON.stringify(savedPerms));

                // Re-read Config after saving so reopening the modal reflects the sheet value,
                // not stale in-memory permissions from the first page load.
                const afterSave = () => {
                    document.getElementById('permissionModal')?.classList.add('hidden');
                    if (currentUser && typeof applyRolePermissions === 'function') {
                        applyRolePermissions(currentUser.role);
                    }
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Saved', 
                        text: 'Sidebar module permissions updated.',
                        timer: 1500, 
                        showConfirmButton: false 
                    });
                };

                try {
                    google.script.run
                        .withSuccessHandler(cfg => {
                            if (cfg && cfg.ROLE_PERMISSIONS) {
                                try {
                                    globalPermissions = JSON.parse(cfg.ROLE_PERMISSIONS);
                                    _permConfig = JSON.parse(JSON.stringify(globalPermissions));
                                } catch (e) {
                                    globalPermissions = savedPerms;
                                }
                            }
                            afterSave();
                        })
                        .withFailureHandler(() => afterSave())
                        .getSystemSettings();
                } catch (e) {
                    afterSave();
                }
            } else {
                Swal.fire('Error', (res && res.message) || 'Unable to save permissions', 'error');
            }
        };

        const onSaveFail = (err) => {
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึก: ' + ((err && err.message) || err || 'Unknown error'), 'error');
        };

        // Use JSONP for this small permission payload. Hidden iframe POST can hang on GitHub Pages/LIFF.
        if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
            window.CES_API.callFunction('saveRolePermissions', [JSON.stringify(newPerms)], { transport: 'jsonp', timeoutMs: 120000 })
                .then(onSaveSuccess)
                .catch(onSaveFail);
            return;
        }

        google.script.run
            .withSuccessHandler(onSaveSuccess)
            .withFailureHandler(onSaveFail)
            .saveRolePermissions(JSON.stringify(newPerms));
    }
