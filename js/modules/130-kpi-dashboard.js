// ============================================================
// 130-kpi-dashboard.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ==========================================
// KPI_java.html - Logic & Rendering V32
// Adds EHS Executive Summary cards + detailed status filters
// ==========================================

let globalKpiData = [];
let globalKpiSummary = null;
let currentKpiTeam = 'EHS';

const KPI_DRIVE_LINKS = {
    'LAB': 'https://bdmsgroup-my.sharepoint.com/personal/nhbmecallab_bdms_co_th/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fnhbmecallab%5Fbdms%5Fco%5Fth%2FDocuments%2F0%2E8%20Report%20Backup%202026&ga=1',
    'EHS': 'https://bdmsgroup-my.sharepoint.com/personal/natkanok_ko_bdms_co_th/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fnatkanok%5Fko%5Fbdms%5Fco%5Fth%2FDocuments%2FDocuments%2F2026&ga=1',
    'MED': '#'
};

const KPI_DETAIL_STATUS_OPTIONS = [
    'กำลังทำ',
    'เสร็จพร้อมตรวจ',
    'กำลังตรวจ',
    'ตรวจเสร็จ',
    'รอส่ง Report',
    'ส่ง Report เสร็จแล้ว',
    'รอแก้ไข'
];

function initKPITab() {
    switchKpiTab('EHS');
}

function switchKpiTab(team) {
    currentKpiTeam = team;

    ['MED', 'LAB', 'EHS'].forEach(t => {
        const btn = document.getElementById(`kpi-tab-${t.toLowerCase()}`);
        if (btn) {
            btn.className = t === team
                ? 'px-5 py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm transition-all'
                : 'px-5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all';
        }
    });

    const dLink = document.getElementById('kpi-drive-link');
    const dTitle = document.getElementById('kpi-drive-title');

    if (dLink && dTitle) {
        if (KPI_DRIVE_LINKS[team] && KPI_DRIVE_LINKS[team] !== '#') {
            dLink.href = KPI_DRIVE_LINKS[team];
            dTitle.innerText = `Drive ${team}`;
            dLink.classList.remove('hidden');
        } else {
            dLink.classList.add('hidden');
        }
    }

    const summaryWrap = document.getElementById('kpi-summary-section');
    if (summaryWrap) summaryWrap.classList.toggle('hidden', team !== 'EHS');

    fetchKPIData();
}

function fetchKPIData(keepOpenRowId = null) {
    const tbody = document.getElementById('kpi-table-body');

    if (!keepOpenRowId && tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-16 text-center text-slate-400">
            <i class="fas fa-circle-notch fa-spin text-3xl mb-3 text-slate-300"></i>
            <p class="font-bold text-xs uppercase tracking-widest">Syncing Data...</p>
        </td></tr>`;
    }

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            if (!keepOpenRowId && tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-10 font-bold">${kpiEsc(err.message || String(err))}</td></tr>`;
            }
        })
        .withSuccessHandler(res => {
            if (res && res.success) {
                globalKpiData = kpiApplyStrictWorkflowStatus(res.data || []);
                globalKpiSummary = res.summary || null;

                populateKpiStatusFilter(res.statusOptions || KPI_DETAIL_STATUS_OPTIONS);
                populateKpiYearMonthFilters();
                renderKpiExecutiveSummary();
                renderKPITable();
                updateLateBadge();

                if (keepOpenRowId) {
                    const updatedRow = globalKpiData.find(r => String(r.rowId) === String(keepOpenRowId));
                    if (updatedRow) openUpdateModal(updatedRow);
                }
            } else {
                Swal.fire('Error', (res && res.message) || 'Cannot load KPI data', 'error');
                if (!keepOpenRowId && tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10">${kpiEsc((res && res.message) || 'Cannot load data')}</td></tr>`;
                }
            }
        })
        .getKPIDashboardData(currentKpiTeam);
}

function populateKpiStatusFilter(options) {
    const el = document.getElementById('kpi-filter-detail-status');
    if (!el) return;

    const current = el.value || 'All';
    const opts = ['All'].concat(options || KPI_DETAIL_STATUS_OPTIONS);
    el.innerHTML = opts.map(o => `<option value="${kpiEsc(o)}">${o === 'All' ? 'All Detailed Status' : kpiEsc(o)}</option>`).join('');
    el.value = opts.includes(current) ? current : 'All';
}

function populateKpiYearMonthFilters() {
    const yearEl = document.getElementById('kpi-filter-year');
    const monthEl = document.getElementById('kpi-filter-month');
    if (!yearEl || !monthEl) return;

    const curY = yearEl.value || 'All';
    const curM = monthEl.value || 'All';

    const years = [...new Set(globalKpiData.map(r => {
        const p = parseKpiDateParts(r.calDate);
        return p.year;
    }).filter(Boolean))].sort().reverse();

    if (years.length) {
        yearEl.innerHTML = `<option value="All">All Years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearEl.value = years.includes(curY) ? curY : 'All';
    }

    monthEl.value = curM;
}

function renderKpiExecutiveSummary() {
    const section = document.getElementById('kpi-summary-section');
    const cardsWrap = document.getElementById('kpi-summary-cards');
    const statusWrap = document.getElementById('kpi-status-summary');
    const updated = document.getElementById('kpi-summary-updated');

    if (!section || !cardsWrap || !statusWrap) return;

    if (currentKpiTeam !== 'EHS') {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    const summary = globalKpiSummary || {};
    const cards = summary.cards || [];
    const statusCounts = summary.statusCounts || {};

    cardsWrap.innerHTML = cards.map(c => `
        <div class="rounded-2xl border ${c.border || 'border-slate-100'} ${c.bg || 'bg-white'} p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${kpiEsc(c.label)}</p>
                    <h3 class="text-2xl font-black ${c.color || 'text-slate-800'} mt-1">${kpiNum(c.value)}</h3>
                    <p class="text-[10px] font-bold text-slate-500 mt-1 leading-tight">${kpiEsc(c.note || '')}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${c.color || 'text-slate-500'} shadow-sm">
                    <i class="fas ${c.icon || 'fa-chart-simple'}"></i>
                </div>
            </div>
        </div>
    `).join('');

    statusWrap.innerHTML = KPI_DETAIL_STATUS_OPTIONS.map(s => {
        const n = Number(statusCounts[s] || 0);
        const cls = kpiStatusMiniClass(s);
        return `
            <button onclick="kpiQuickStatusFilter('${kpiAttr(s)}')" class="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left hover:shadow-sm transition ${cls.box}">
                <span class="text-[10px] font-black leading-tight ${cls.text}">${kpiEsc(s)}</span>
                <span class="text-sm font-black ${cls.text}">${n}</span>
            </button>
        `;
    }).join('');

    if (updated) {
        updated.innerText = summary.updatedAt ? `Updated: ${summary.updatedAt}` : `Records: ${summary.total || globalKpiData.length}`;
    }
}

function kpiQuickStatusFilter(status) {
    const el = document.getElementById('kpi-filter-detail-status');
    if (!el) return;
    el.value = status;
    renderKPITable();
}

function getKpiFilteredRows() {
    const fYear = document.getElementById('kpi-filter-year')?.value || 'All';
    const fMonth = document.getElementById('kpi-filter-month')?.value || 'All';
    const fStatus = document.getElementById('kpi-filter-status')?.value || 'All';
    const fDetail = document.getElementById('kpi-filter-detail-status')?.value || 'All';
    const fWorkType = (document.getElementById('kpi-filter-worktype')?.value || 'All').toLowerCase();
    const search = (document.getElementById('kpi-filter-search')?.value || '').toLowerCase().trim();

    return globalKpiData.filter(row => {
        if (!row.calDate || !row.jobNo || !row.customerId || !row.workType) return false;

        const p = parseKpiDateParts(row.calDate);

        if (fYear !== 'All' && String(p.year) !== String(fYear)) return false;
        if (fMonth !== 'All' && String(p.month) !== String(fMonth)) return false;
        if (fWorkType !== 'all' && String(row.workType || '').toLowerCase() !== fWorkType) return false;

        if (fStatus === 'Late' && (row.isFinished || row.daysLate <= 0)) return false;
        if (fStatus === 'Completed' && !row.isFinished) return false;
        if (fStatus === 'Process' && (row.isFinished || row.daysLate > 0)) return false;

        if (fDetail !== 'All') {
            if (fDetail === 'รอแก้ไข') {
                if (!row.hasEdit && row.currentStatus !== 'รอแก้ไข') return false;
            } else if (row.currentStatus !== fDetail) {
                return false;
            }
        }

        if (search) {
            const hay = [
                row.customerId, row.jobNo, row.calDate, row.workType, row.requester,
                row.sourceSheet, row.currentStatus,
                row.rawStatus?.eng, row.rawStatus?.sup, row.rawStatus?.rep
            ].join(' ').toLowerCase();

            if (!hay.includes(search)) return false;
        }

        return true;
    });
}

function renderKPITable() {
    const tbody = document.getElementById('kpi-table-body');
    if (!tbody) return;

    const filtered = getKpiFilteredRows();
    const counter = document.getElementById('kpi-filtered-count');
    if (counter) counter.innerText = `${filtered.length} / ${globalKpiData.length} records`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-slate-400 italic font-bold">No tracking records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const statusUi = kpiStatusUi(row);
        const kpiCell = `
            <div class="flex flex-col items-start gap-1">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">KPI Limit</span>
                <div class="bg-slate-100 text-slate-700 font-black text-xs px-2.5 py-1.5 rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5">
                    <i class="far fa-calendar-alt text-slate-400"></i> ${kpiEsc(row.deadline)}
                </div>
            </div>
        `;

        let timelineCell = '';
        if (row.isFinished) {
            timelineCell = `<div class="bg-green-50 text-green-700 border border-green-300 px-2 py-1.5 rounded-xl text-[11px] font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><i class="fas fa-check mb-0.5"></i>DONE</div>`;
        } else if (row.daysLate > 0) {
            timelineCell = `<div class="bg-red-50 text-[#E4002B] border border-red-300 px-2 py-1.5 rounded-xl text-xs font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><span class="text-[8px] uppercase opacity-70 mb-0.5">LATE</span>+${row.daysLate}d</div>`;
        } else {
            timelineCell = `<div class="bg-blue-50 text-[#003DA5] border border-blue-200 px-2 py-1.5 rounded-xl text-xs font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><span class="text-[8px] uppercase opacity-70 mb-0.5">LEFT</span>${Math.abs(row.daysLate)}d</div>`;
        }

        const isNet = String(row.workType || '').toLowerCase().includes('network');
        const isCom = String(row.workType || '').toLowerCase().includes('commercial');
        const wtColor = isNet
            ? 'bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]'
            : (isCom ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200');

        return `<tr onclick='openUpdateModal(${JSON.stringify(row).replace(/'/g, "\\'")})' class="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="p-4 align-middle">
                <h4 class="text-sm font-black text-slate-800">${kpiEsc(row.customerId)}</h4>
                <p class="text-[10px] font-bold text-slate-400 mt-1">Job: ${kpiEsc(row.jobNo)}</p>
                <p class="text-[9px] font-bold text-indigo-400 mt-1">${kpiEsc(row.sourceSheet || '')}</p>
            </td>
            <td class="p-4 align-middle text-center font-bold text-slate-600 text-xs">${kpiEsc(row.calDate)}</td>
            <td class="p-4 align-middle text-center">
                <span class="px-2.5 py-1 rounded text-[9px] font-bold uppercase shadow-sm ${wtColor}">${kpiEsc(row.workType)}</span>
            </td>
            <td class="p-4 align-middle text-center font-black text-slate-600 text-xs">${kpiEsc(row.totalAmount || '-')}</td>
            <td class="p-4 align-middle">${statusUi}</td>
            <td class="p-4 align-middle text-center">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black ${kpiStatusPillClass(row.currentStatus)}">${kpiEsc(row.currentStatus)}</span>
            </td>
            <td class="p-4 align-middle">${kpiCell}</td>
            <td class="p-4 align-middle">${timelineCell}</td>
        </tr>`;
    }).join('');
}

function kpiStatusUi(row) {
    const isDone = row.isFinished;
    const isLate = !row.isFinished && row.daysLate > 0;
    const isEdit = row.hasEdit || row.currentStatus === 'รอแก้ไข';

    let statusBg = isDone ? 'bg-blue-50 border-blue-200 text-[#003DA5]'
        : isEdit ? 'bg-amber-50 border-amber-200 text-amber-700'
        : isLate ? 'bg-red-50 border-red-200 text-[#E4002B]'
        : 'bg-slate-50 border-slate-200 text-slate-700';

    let statusIcon = isDone ? 'fa-check-circle text-[#003DA5]'
        : isEdit ? 'fa-screwdriver-wrench text-[#003DA5]'
        : isLate ? 'fa-exclamation-circle text-[#003DA5]'
        : 'fa-spinner fa-spin text-[#003DA5]';

    let statusText = isDone ? 'COMPLETED'
        : isEdit ? 'WAITING EDIT'
        : isLate ? 'LATE PROCESS'
        : 'ON-PROCESS';

    return `
        <div class="flex flex-col border rounded-lg px-3 py-2 shadow-sm w-full max-w-[190px] ${statusBg}">
            <span class="text-[8px] font-black uppercase tracking-wider opacity-70 mb-1">${statusText}</span>
            <div class="text-[10px] font-bold flex items-center gap-1.5 leading-tight">
                <i class="fas ${statusIcon}"></i>
                <span class="truncate">${kpiEsc(row.currentStatus || 'รอเริ่มงาน')}</span>
            </div>
        </div>
    `;
}

function openUpdateModal(data) {
    document.getElementById('upd-row-id').value = data.rowId;

    document.getElementById('upd-job-header').innerHTML = `
        <div class="flex flex-wrap gap-2 w-full">
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hospital text-slate-400"></i> ${kpiEsc(data.customerId)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hashtag text-slate-400"></i> Job: ${kpiEsc(data.jobNo)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-layer-group text-slate-400"></i> ${kpiEsc(data.sourceSheet || '-')}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-user-tag text-slate-400"></i> Req: ${kpiEsc(data.requester || '-')}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-calendar-alt text-slate-400"></i> CAL: ${kpiEsc(data.calDate)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-flag-checkered text-slate-400"></i> KPI: ${kpiEsc(data.deadline)}</span>
        </div>
    `;

    const devStr = Object.entries(data.devices || {})
        .filter(([k, v]) => v && v !== '0')
        .map(([k, v]) => `<span class="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-600 uppercase shadow-sm">${k}: <b class="text-slate-800">${kpiEsc(v)}</b></span>`)
        .join('');

    document.getElementById('modal-devices-container').innerHTML =
        `<div class="flex flex-wrap gap-2 text-[10px] font-bold">${devStr || '<span class="text-slate-400">No Device Specifics</span>'}</div>
         <div class="text-[11px] font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">TOTAL: ${kpiEsc(data.totalAmount || '0')}</div>`;

    const r = data.rawStatus || {};

    const isEngDone = (r.eng === 'เสร็จพร้อมตรวจ');
    const isSupDone = isEngDone && (r.sup === 'ตรวจเสร็จ');
    const isRepDone = isSupDone && (r.rep === 'ส่ง Report เสร็จแล้ว');

    const isEngProcess = (r.eng === 'กำลังทำ' || isEngDone);
    const isSupProcess = isEngDone && (r.sup === 'กำลังตรวจ' || isSupDone || r.sup === 'รอแก้ไข');
    const isRepProcess = isSupDone && (r.rep === 'รอส่ง Report' || isRepDone || r.rep === 'รอแก้ไข');

    const isSupEdit = isEngDone && (r.sup === 'รอแก้ไข');
    const isRepEdit = isSupDone && (r.rep === 'รอแก้ไข');

    const steps = [
        { l: 'กำลังทำ', t: 'Engineer Status', d: isEngProcess, edit: false, date: r.engDate },
        { l: 'เสร็จพร้อมตรวจ', t: 'Engineer Status', d: isEngDone, edit: false, date: r.engDate },
        { l: 'กำลังตรวจ', t: 'Supervisor Status', d: isSupProcess, edit: isSupEdit, date: r.supDate },
        { l: 'ตรวจเสร็จ', t: 'Supervisor Status', d: isSupDone, edit: false, date: r.supDate },
        { l: 'รอส่ง Report', t: 'Report Status', d: isRepProcess, edit: isRepEdit, date: r.repDate },
        { l: 'ส่ง Report เสร็จแล้ว', t: 'Report Status', d: isRepDone, edit: false, date: r.repDate }
    ];

    document.getElementById('modal-stepper-container').innerHTML = `
        <div class="flex items-start justify-between min-w-[750px] w-full pt-6 relative">
            ${steps.map((s, i) => `
                <div class="flex flex-col items-center flex-1 relative">
                    ${(i === 0 || i === 2 || i === 4) ? `<span class="absolute -top-8 text-[9px] font-black ${s.d || s.edit ? 'text-indigo-600' : 'text-slate-400'} bg-white px-2 rounded border border-slate-200 shadow-sm">${s.t}</span>` : ''}
                    <div class="z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm
                        ${s.edit ? 'bg-[#003DA5] text-white ring-4 ring-[#003DA5]' : s.d ? 'bg-blue-100 text-[#003DA5] shadow-md' : 'bg-slate-100 text-slate-300 border-2 border-slate-200'}">
                        ${s.edit ? '<i class="fas fa-tools"></i>' : s.d ? '<i class="fas fa-check"></i>' : i + 1}
                    </div>
                    <span class="text-[9px] font-extrabold mt-3 ${s.d || s.edit ? 'text-slate-800' : 'text-slate-400'} text-center h-6 leading-tight">${s.l}</span>
                    ${s.date && s.d && !s.edit ? `<span class="text-[8px] font-bold text-[#003DA5] bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-200 shadow-sm">${kpiEsc(s.date)}</span>` : ''}
                </div>
                ${i < steps.length - 1 ? `<div class="flex-1 h-[3px] mt-4 ${s.d ? 'bg-blue-300' : 'bg-slate-200'}"></div>` : ''}
            `).join('')}
        </div>`;

    let target = '';
    let opts = [];

    if (!r.eng || r.eng === '') {
        target = 'Engineer Status'; opts = ['กำลังทำ'];
    } else if (r.eng === 'กำลังทำ') {
        target = 'Engineer Status'; opts = ['เสร็จพร้อมตรวจ'];
    } else if (isEngDone && (!r.sup || r.sup === '')) {
        target = 'Supervisor Status'; opts = ['กำลังตรวจ'];
    } else if (isEngDone && (r.sup === 'กำลังตรวจ' || r.sup === 'รอแก้ไข')) {
        target = 'Supervisor Status'; opts = ['ตรวจเสร็จ', 'รอแก้ไข'];
    } else if (isSupDone && (!r.rep || r.rep === '')) {
        target = 'Report Status'; opts = ['รอส่ง Report'];
    } else if (isSupDone && (r.rep === 'รอส่ง Report' || r.rep === 'รอแก้ไข')) {
        target = 'Report Status'; opts = ['ส่ง Report เสร็จแล้ว', 'รอแก้ไข'];
    }

    document.getElementById('upd-target-col').value = target || 'Completed';
    document.getElementById('upd-new-status').innerHTML = opts.length
        ? opts.map(o => `<option value="${kpiEsc(o)}">${kpiEsc(o)}</option>`).join('')
        : '<option value="">งานเสร็จสมบูรณ์</option>';

    document.getElementById('btn-save-kpi').disabled = opts.length === 0;
    document.getElementById('modal-kpi-update').classList.remove('hidden');
}

function saveJobStatus() {
    const rId = document.getElementById('upd-row-id').value;
    const tCol = document.getElementById('upd-target-col').value;
    const nSt = document.getElementById('upd-new-status').value;

    if (!nSt) return;

    const btn = document.getElementById('btn-save-kpi');
    const oldHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .withSuccessHandler(res => {
            if (res && res.success) {
                Swal.fire({ icon: 'success', title: 'Saved!', timer: 1000, showConfirmButton: false });
                fetchKPIData(rId);
            } else {
                Swal.fire('Error', (res && res.message) || 'Save failed', 'error');
            }
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .updateJobStatus(currentKpiTeam, rId, tCol, nSt);
}

function updateLateBadge() {
    const lateJobs = globalKpiData.filter(r => !r.isFinished && r.daysLate > 0);
    const b = document.getElementById('kpi-late-badge');
    if (!b) return;
    b.innerText = lateJobs.length;
    b.classList[lateJobs.length > 0 ? 'remove' : 'add']('hidden');
}

function openLateAlertModal() {
    ['late-search', 'late-f-year', 'late-f-month'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'late-search' ? '' : 'All');
    });
    renderLateJobsUI();
    document.getElementById('modal-kpi-late').classList.remove('hidden');
}

function renderLateJobsUI() {
    const s = (document.getElementById('late-search')?.value || '').toLowerCase();
    const fY = document.getElementById('late-f-year')?.value || 'All';
    const fM = document.getElementById('late-f-month')?.value || 'All';
    const srt = document.getElementById('late-f-sort')?.value || 'desc';

    let lateJobs = globalKpiData.filter(r => !r.isFinished && r.daysLate > 0).filter(job => {
        if (s && !String(job.customerId).toLowerCase().includes(s) && !String(job.jobNo).toLowerCase().includes(s)) return false;

        const p = parseKpiDateParts(job.calDate);
        if (fY !== 'All' && String(p.year) !== String(fY)) return false;
        if (fM !== 'All' && String(p.month) !== String(fM)) return false;

        return true;
    }).sort((a, b) => srt === 'desc' ? b.daysLate - a.daysLate : a.daysLate - b.daysLate);

    const target = document.getElementById('late-jobs-container');
    if (!target) return;

    target.innerHTML = lateJobs.length === 0
        ? `<div class="p-8 text-center font-bold text-slate-400">ไม่มีงานล่าช้าในเงื่อนไขนี้!</div>`
        : lateJobs.map(job => `<div onclick='closeModal("modal-kpi-late"); openUpdateModal(${JSON.stringify(job).replace(/'/g, "\\'")})' class="bg-white p-4 rounded-xl shadow-sm border border-[#003DA5] mb-3 flex justify-between items-center cursor-pointer hover:border-[#003DA5] transition-all">
            <div>
                <h4 class="font-extrabold text-sm text-slate-800">${kpiEsc(job.customerId)}</h4>
                <p class="text-[10px] text-slate-500 font-bold mt-1">Job: ${kpiEsc(job.jobNo)} | TGT: ${kpiEsc(job.deadline)} | ${kpiEsc(job.sourceSheet || '')}</p>
            </div>
            <div class="text-right"><span class="text-[11px] font-black text-[#003DA5] bg-red-50 px-3 py-1.5 rounded border border-red-200 shadow-sm">LATE +${job.daysLate} Days</span></div>
        </div>`).join('');
}

function triggerLateEmail() {
    const btn = document.getElementById('btn-send-late-email');
    const oldHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Email...';
    btn.disabled = true;

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .withSuccessHandler(res => {
            btn.innerHTML = oldHtml;
            btn.disabled = false;

            if (res && res.success) {
                Swal.fire('Success!', res.message, 'success');
                closeModal('modal-kpi-late');
            } else {
                Swal.fire('Error', (res && res.message) || 'Cannot send email', 'error');
            }
        })
        .sendLateKpiEmail(currentKpiTeam);
}

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

// ==========================================
// Small helpers
// ==========================================
function parseKpiDateParts(v) {
    const s = String(v || '').trim();
    let d = '', m = '', y = '';

    if (s.includes('/')) {
        const p = s.split('/');
        d = p[0] || '';
        m = String(p[1] || '').padStart(2, '0');
        y = p[2] || '';
        if (String(y).length === 2) y = '20' + y;
    } else if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const p = s.slice(0, 10).split('-');
        y = p[0]; m = String(p[1]).padStart(2, '0'); d = p[2];
    }

    return { day: d, month: m, year: y };
}

function kpiStatusMiniClass(status) {
    if (status === 'ส่ง Report เสร็จแล้ว') return { box: 'bg-blue-50 border-blue-200', text: 'text-[#003DA5]' };
    if (status === 'รอแก้ไข') return { box: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
    if (status === 'รอส่ง Report') return { box: 'bg-cyan-50 border-cyan-100', text: 'text-cyan-700' };
    if (status === 'กำลังตรวจ' || status === 'ตรวจเสร็จ') return { box: 'bg-indigo-50 border-[#003DA5]/20', text: 'text-indigo-700' };
    if (status === 'กำลังทำ' || status === 'เสร็จพร้อมตรวจ') return { box: 'bg-blue-50 border-blue-100', text: 'text-blue-700' };
    return { box: 'bg-slate-50 border-slate-100', text: 'text-slate-700' };
}

function kpiStatusPillClass(status) {
    return kpiStatusMiniClass(status).box + ' ' + kpiStatusMiniClass(status).text;
}

function kpiNum(v) {
    const n = Number(String(v || '').replace(/,/g, ''));
    if (!isNaN(n)) return n.toLocaleString();
    return kpiEsc(v || '0');
}

function kpiEsc(v) {
    return String(v === null || v === undefined ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function kpiAttr(v) {
    return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}


// ============================================================
// CES KPI Tracking V33 — Filter + Summary UX Fix
// Additive frontend override. Keeps V32 functions and fixes:
// 1) detailed status filter can match currentStatus OR raw Eng/SUP/Report status
// 2) summary split into Executive cards + Pending Engineer/SUP/Report
// ============================================================
let KPI_STAGE_FILTER = 'All';

function kpiNormalizeStatus(v) {
    const s = String(v || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    const compact = s.replace(/\s+/g, '').toLowerCase();

    if (compact.includes('ส่งreportเสร็จแล้ว') || compact.includes('ส่งรายงานเสร็จ') || compact.includes('completed')) return 'ส่ง Report เสร็จแล้ว';
    if (compact.includes('รอส่งreport') || compact.includes('รอส่งรายงาน')) return 'รอส่ง Report';
    if (compact.includes('ตรวจเสร็จ') || compact.includes('supdone')) return 'ตรวจเสร็จ';
    if (compact.includes('กำลังตรวจ') || compact.includes('checking')) return 'กำลังตรวจ';
    if (compact.includes('เสร็จพร้อมตรวจ') || compact.includes('พร้อมตรวจ') || compact.includes('readytocheck')) return 'เสร็จพร้อมตรวจ';
    if (compact.includes('กำลังทำ') || compact.includes('doing') || compact.includes('process')) return 'กำลังทำ';
    if (compact.includes('รอแก้ไข') || compact.includes('แก้ไข') || compact.includes('revise') || compact.includes('edit')) return 'รอแก้ไข';
    return s;
}

function kpiRowStatusList(row) {
    const r = row.rawStatus || {};
    return [row.currentStatus, row.statusDetail, r.eng, r.sup, r.rep]
        .map(kpiNormalizeStatus)
        .filter(Boolean);
}

function kpiIsPendingEngineer(row) {
    const eng = kpiNormalizeStatus(row.rawStatus?.eng);
    return !row.isFinished && (!eng || eng === 'กำลังทำ' || row.currentStatus === 'กำลังทำ' || row.currentStatus === 'รอเริ่มงาน');
}

function kpiIsPendingSup(row) {
    const eng = kpiNormalizeStatus(row.rawStatus?.eng);
    const sup = kpiNormalizeStatus(row.rawStatus?.sup);
    return !row.isFinished && eng === 'เสร็จพร้อมตรวจ' && (!sup || sup === 'กำลังตรวจ' || sup === 'รอแก้ไข');
}

function kpiIsPendingReport(row) {
    const sup = kpiNormalizeStatus(row.rawStatus?.sup);
    const rep = kpiNormalizeStatus(row.rawStatus?.rep);
    return !row.isFinished && sup === 'ตรวจเสร็จ' && (!rep || rep === 'รอส่ง Report' || rep === 'รอแก้ไข');
}

function kpiApplyStageFilter(stage) {
    KPI_STAGE_FILTER = stage || 'All';
    const detailEl = document.getElementById('kpi-filter-detail-status');
    if (detailEl) detailEl.value = 'All';
    renderKPITable();
}

function kpiClearStageFilter() {
    KPI_STAGE_FILTER = 'All';
}

function kpiQuickStatusFilter(status) {
    KPI_STAGE_FILTER = 'All';
    const el = document.getElementById('kpi-filter-detail-status');
    if (!el) return;
    el.value = status;
    renderKPITable();
}

function renderKpiExecutiveSummary() {
    const section = document.getElementById('kpi-summary-section');
    const cardsWrap = document.getElementById('kpi-summary-cards');
    const statusWrap = document.getElementById('kpi-status-summary');
    const updated = document.getElementById('kpi-summary-updated');

    if (!section || !cardsWrap || !statusWrap) return;

    if (currentKpiTeam !== 'EHS') {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    const rows = globalKpiData || [];
    const summary = globalKpiSummary || {};
    const stageCounts = summary.stageCounts || {
        pendingEngineer: rows.filter(kpiIsPendingEngineer).length,
        pendingSup: rows.filter(kpiIsPendingSup).length,
        pendingReport: rows.filter(kpiIsPendingReport).length
    };

    const waitingEdit = Number(summary.waitingEdit ?? rows.filter(r => r.hasEdit || kpiRowStatusList(r).includes('รอแก้ไข')).length);
    const active = Number(summary.active ?? rows.filter(r => !r.isFinished).length);
    const overdue = Number(summary.overdue ?? rows.filter(r => !r.isFinished && Number(r.daysLate || 0) > 0).length);
    const dueToday = Number(summary.dueToday ?? rows.filter(r => !r.isFinished && Number(r.daysLate || 0) === 0).length);
    const actionRisk = overdue + dueToday + waitingEdit;

    const cards = [
        { label: 'Active Jobs', value: active, note: 'EHS + ENV · ยังไม่ส่ง Report เสร็จ', icon: 'fa-briefcase', color: 'text-[#003DA5]', bg: 'bg-blue-50', border: 'border-blue-200' },
        { label: 'Action Required / Risk',  value: actionRisk, note: 'Overdue / Due today / SD แก้ไข', icon: 'fa-triangle-exclamation', color: 'text-[#E4002B]', bg: 'bg-red-50', border: 'border-red-200' },
        { label: 'ALL WORK ทั้งหมด', value: rows.length, note: 'EHS + ENV · จำนวนงานทั้งหมด', icon: 'fa-layer-group', color: 'text-[#5B7F95]', bg: 'bg-slate-50', border: 'border-slate-200' },
        { label: 'รอแก้ไข', value: waitingEdit, note: 'รายการที่ถูกตีกลับให้แก้ไข', icon: 'fa-screwdriver-wrench', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
    ];

    cardsWrap.innerHTML = cards.map(c => `
        <button onclick="${c.label === 'รอแก้ไข' ? "kpiQuickStatusFilter('รอแก้ไข')" : ''}" class="text-left rounded-2xl border ${c.border || 'border-slate-100'} ${c.bg || 'bg-white'} p-4 shadow-sm hover:shadow-md transition w-full">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${kpiEsc(c.label)}</p>
                    <h3 class="text-2xl font-black ${c.color || 'text-slate-800'} mt-1">${kpiNum(c.value)}</h3>
                    <p class="text-[10px] font-bold text-slate-500 mt-1 leading-tight">${kpiEsc(c.note || '')}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${c.color || 'text-slate-500'} shadow-sm">
                    <i class="fas ${c.icon || 'fa-chart-simple'}"></i>
                </div>
            </div>
        </button>
    `).join('');

    const stageCards = [
        { key: 'pendingEngineer', label: 'Pending Engineer', sub: 'กำลังทำ / ยังไม่พร้อมตรวจ', value: stageCounts.pendingEngineer || 0, icon: 'fa-person-digging', cls: 'bg-blue-50 border-blue-100 text-blue-700' },
        { key: 'pendingSup', label: 'Pending SUP', sub: 'เสร็จพร้อมตรวจ / กำลังตรวจ', value: stageCounts.pendingSup || 0, icon: 'fa-user-check', cls: 'bg-indigo-50 border-[#003DA5]/20 text-indigo-700' },
        { key: 'pendingReport', label: 'Pending Report', sub: 'ตรวจเสร็จ / รอส่ง Report', value: stageCounts.pendingReport || 0, icon: 'fa-file-signature', cls: 'bg-cyan-50 border-cyan-100 text-cyan-700' }
    ];

    statusWrap.innerHTML = stageCards.map(s => {
        const active = KPI_STAGE_FILTER === s.key;
        return `
        <button onclick="kpiApplyStageFilter('${s.key}')" title="คลิกเพื่อกรอง / คลิกซ้ำเพื่อยกเลิก" class="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:shadow-sm transition ${s.cls} ${active ? 'ring-2 ring-indigo-300 shadow-md' : ''}">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shadow-sm"><i class="fas ${s.icon}"></i></div>
                <div class="min-w-0">
                    <p class="text-xs font-black leading-tight">${kpiEsc(s.label)} ${active ? '<span class="ml-1 text-[9px] opacity-70">ACTIVE</span>' : ''}</p>
                    <p class="text-[10px] font-bold opacity-70 truncate">${kpiEsc(s.sub)}</p>
                </div>
            </div>
            <span class="text-xl font-black">${kpiNum(s.value)}</span>
        </button>`;
    }).join('');

    if (updated) {
        updated.innerText = summary.updatedAt ? `Updated: ${summary.updatedAt}` : `Records: ${rows.length}`;
    }
}

function getKpiFilteredRows() {
    const fYear = document.getElementById('kpi-filter-year')?.value || 'All';
    const fMonth = document.getElementById('kpi-filter-month')?.value || 'All';
    const fStatus = document.getElementById('kpi-filter-status')?.value || 'All';
    const fDetail = document.getElementById('kpi-filter-detail-status')?.value || 'All';
    const fWorkType = (document.getElementById('kpi-filter-worktype')?.value || 'All').toLowerCase();
    const search = (document.getElementById('kpi-filter-search')?.value || '').toLowerCase().trim();

    return globalKpiData.filter(row => {
        if (!row.calDate || !row.jobNo || !row.customerId || !row.workType) return false;

        const p = parseKpiDateParts(row.calDate);
        if (fYear !== 'All' && String(p.year) !== String(fYear)) return false;
        if (fMonth !== 'All' && String(p.month) !== String(fMonth)) return false;
        if (fWorkType !== 'all' && String(row.workType || '').toLowerCase() !== fWorkType) return false;

        if (fStatus === 'Late' && (row.isFinished || row.daysLate <= 0)) return false;
        if (fStatus === 'Completed' && !row.isFinished) return false;
        if (fStatus === 'Process' && (row.isFinished || row.daysLate > 0)) return false;

        if (KPI_STAGE_FILTER === 'pendingEngineer' && !kpiIsPendingEngineer(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingSup' && !kpiIsPendingSup(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingReport' && !kpiIsPendingReport(row)) return false;

        if (fDetail !== 'All') {
            const normalizedDetail = kpiNormalizeStatus(fDetail);
            const statuses = kpiRowStatusList(row);
            if (normalizedDetail === 'รอแก้ไข') {
                if (!row.hasEdit && !statuses.includes('รอแก้ไข')) return false;
            } else if (!statuses.includes(normalizedDetail)) {
                return false;
            }
        }

        if (search) {
            const hay = [
                row.customerId, row.jobNo, row.calDate, row.workType, row.requester,
                row.sourceSheet, row.currentStatus,
                row.rawStatus?.eng, row.rawStatus?.sup, row.rawStatus?.rep
            ].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }

        return true;
    });
}

const kpi_v33_old_renderKPITable = renderKPITable;
function renderKPITable() {
    renderKpiExecutiveSummary();
    const tbody = document.getElementById('kpi-table-body');
    if (!tbody) return;

    const filtered = getKpiFilteredRows();
    const counter = document.getElementById('kpi-filtered-count');
    if (counter) {
        const stageLabel = KPI_STAGE_FILTER !== 'All'
            ? ' • ' + ({pendingEngineer:'Pending Engineer', pendingSup:'Pending SUP', pendingReport:'Pending Report'}[KPI_STAGE_FILTER] || KPI_STAGE_FILTER)
            : '';
        counter.innerText = `${filtered.length} / ${globalKpiData.length} records${stageLabel}`;
    }

    // Reuse V32 row template by temporarily replacing global data filter logic would be risky;
    // therefore keep V32 renderer if no stage issue, but we need exact filtered rows.
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-slate-400 italic font-bold">No tracking records found for selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const statusInfo = getKpiProgressInfo(row);
        const timelineCell = getKpiTimelineHtml(row);
        const wtClass = getKpiWorkTypeClass(row.workType);
        const detailClass = kpiStatusPillClass(row.currentStatus);

        return `<tr onclick='openUpdateModal(${JSON.stringify(row).replace(/'/g, "\\'")})' class="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="p-4 align-middle">
                <h4 class="text-sm font-black text-slate-800">${kpiEsc(row.customerId)}</h4>
                <p class="text-[10px] font-bold text-indigo-500 mt-1">Job: ${kpiEsc(row.jobNo)}</p>
                <p class="text-[9px] font-bold text-slate-400 mt-0.5">${kpiEsc(row.sourceSheet || '')}</p>
            </td>
            <td class="p-4 align-middle text-center font-bold text-slate-600 text-xs">${kpiEsc(row.calDate)}</td>
            <td class="p-4 align-middle text-center"><span class="px-2.5 py-1 rounded text-[9px] font-bold uppercase shadow-sm ${wtClass}">${kpiEsc(row.workType)}</span></td>
            <td class="p-4 align-middle text-center font-black text-slate-600 text-xs">${kpiEsc(row.totalAmount || '-')}</td>
            <td class="p-4 align-middle">${statusInfo}</td>
            <td class="p-4 align-middle text-center"><span class="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${detailClass}">${kpiEsc(row.currentStatus || '-')}</span></td>
            <td class="p-4 align-middle">${getKpiTargetHtml(row)}</td>
            <td class="p-4 align-middle">${timelineCell}</td>
        </tr>`;
    }).join('');
}

function getKpiProgressInfo(row) {
    const statusBg = row.isFinished ? 'bg-blue-50 border-blue-200 text-[#003DA5]' : (row.daysLate > 0 ? 'bg-red-50 border-red-200 text-[#E4002B]' : 'bg-slate-50 border-slate-200 text-slate-700');
    const statusIcon = row.isFinished ? 'fa-check-circle text-[#003DA5]' : (row.daysLate > 0 ? 'fa-exclamation-circle text-[#003DA5]' : 'fa-spinner fa-spin text-[#003DA5]');
    const statusText = row.isFinished ? 'COMPLETED' : (row.daysLate > 0 ? 'LATE PROCESS' : 'ON-PROCESS');
    const curStepText = row.isFinished ? 'ส่ง Report เสร็จแล้ว' : (row.currentStatus || row.rawStatus?.rep || row.rawStatus?.sup || row.rawStatus?.eng || 'รอเริ่มงาน');

    return `<div class="flex flex-col border rounded-lg px-3 py-2 shadow-sm w-full max-w-[180px] ${statusBg}">
        <span class="text-[8px] font-black uppercase tracking-wider opacity-70 mb-1">${statusText}</span>
        <div class="text-[10px] font-bold flex items-center gap-1.5 leading-tight">
            <i class="fas ${statusIcon}"></i> <span class="truncate">${kpiEsc(curStepText)}</span>
        </div>
    </div>`;
}

function getKpiTargetHtml(row) {
    return `<div class="flex flex-col items-start gap-1">
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">KPI Limit</span>
        <div class="bg-slate-100 text-slate-700 font-black text-xs px-2.5 py-1.5 rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5">
            <i class="far fa-calendar-alt text-slate-400"></i> ${kpiEsc(row.deadline)}
        </div>
    </div>`;
}

function getKpiTimelineHtml(row) {
    if (row.isFinished) return `<div class="bg-green-50 text-green-700 border border-green-300 px-2 py-1.5 rounded-xl text-[11px] font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><i class="fas fa-check mb-0.5"></i>DONE</div>`;
    if (row.daysLate > 0) return `<div class="bg-red-50 text-[#E4002B] border border-red-300 px-2 py-1.5 rounded-xl text-xs font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><span class="text-[8px] uppercase opacity-70 mb-0.5">LATE</span>+${row.daysLate}d</div>`;
    return `<div class="bg-blue-50 text-[#003DA5] border border-blue-200 px-2 py-1.5 rounded-xl text-xs font-black text-center shadow-sm flex flex-col justify-center w-16 mx-auto"><span class="text-[8px] uppercase opacity-70 mb-0.5">LEFT</span>${Math.abs(row.daysLate)}d</div>`;
}

function getKpiWorkTypeClass(v) {
    const t = String(v || '').toLowerCase();
    if (t.includes('network')) return 'bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]';
    if (t.includes('commercial')) return 'bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
}


// ============================================================
// CES KPI Tracking V34 — STRICT WORKFLOW STATUS FIX
// Frontend safety normalization. This prevents stale/incorrect sheet values
// in later stages from overriding the actual current strict workflow stage.
// ============================================================
function kpiStrictCurrentStatusFromRaw(rawStatus) {
    const r = rawStatus || {};
    const eng = kpiNormalizeStatus(r.eng);
    const sup = kpiNormalizeStatus(r.sup);
    const rep = kpiNormalizeStatus(r.rep);

    // Engineer is the gate. If not finished, ignore SUP/Report columns.
    if (!eng) return 'รอเริ่มงาน';
    if (eng === 'รอแก้ไข') return 'รอแก้ไข';
    if (eng === 'กำลังทำ') return 'กำลังทำ';
    if (eng !== 'เสร็จพร้อมตรวจ') return eng || 'รอเริ่มงาน';

    // Supervisor stage starts only after engineer finished.
    if (!sup) return 'เสร็จพร้อมตรวจ';
    if (sup === 'รอแก้ไข') return 'รอแก้ไข';
    if (sup === 'กำลังตรวจ') return 'กำลังตรวจ';
    if (sup !== 'ตรวจเสร็จ') return sup || 'เสร็จพร้อมตรวจ';

    // Report stage starts only after supervisor finished.
    if (!rep) return 'ตรวจเสร็จ';
    if (rep === 'รอแก้ไข') return 'รอแก้ไข';
    if (rep === 'รอส่ง Report') return 'รอส่ง Report';
    if (rep === 'ส่ง Report เสร็จแล้ว') return 'ส่ง Report เสร็จแล้ว';

    return rep || 'ตรวจเสร็จ';
}

function kpiApplyStrictWorkflowStatus(rows) {
    return (rows || []).map(row => {
        const strict = kpiStrictCurrentStatusFromRaw(row.rawStatus || {});
        return Object.assign({}, row, {
            currentStatus: strict,
            statusDetail: strict,
            isFinished: strict === 'ส่ง Report เสร็จแล้ว',
            hasEdit: strict === 'รอแก้ไข' || kpiRowStatusList(row).includes('รอแก้ไข')
        });
    });
}



// ============================================================
// CES KPI Tracking V35 — TEAM FILTER FIX
// Replace the duplicated Detailed Status dropdown with EHS / ENV team filter.
// Detailed Status Summary remains as action cards and no longer conflicts with filter bar.
// ============================================================
let KPI_QUICK_STATUS_FILTER = 'All';

function kpiGetTeamFilterValue() {
    const el = document.getElementById('kpi-filter-team');
    return el ? (el.value || 'All') : 'All';
}

function kpiRowServiceTeam(row) {
    const explicit = String(row?.serviceTeam || '').trim().toUpperCase();
    if (explicit === 'ENV' || explicit === 'EHS') return explicit;

    const source = String(row?.sourceSheet || '').trim().toUpperCase();
    if (source.indexOf('ENV') >= 0) return 'ENV';
    if (source.indexOf('EHS') >= 0) return 'EHS';

    const workType = String(row?.workType || '').trim().toUpperCase();
    if (workType.indexOf('ENV') >= 0) return 'ENV';

    return 'EHS';
}

function kpiApplyStageFilter(stage) {
    const next = stage || 'All';
    // Toggle behavior: click the active Summary card again to unselect it.
    KPI_STAGE_FILTER = (KPI_STAGE_FILTER === next) ? 'All' : next;
    KPI_QUICK_STATUS_FILTER = 'All';
    renderKPITable();
}

function kpiClearStageFilter() {
    KPI_STAGE_FILTER = 'All';
}

function kpiQuickStatusFilter(status) {
    const next = kpiNormalizeStatus(status) || 'All';
    KPI_STAGE_FILTER = 'All';
    // Toggle behavior for Executive card such as รอแก้ไข.
    KPI_QUICK_STATUS_FILTER = (KPI_QUICK_STATUS_FILTER === next) ? 'All' : next;
    renderKPITable();
}

function kpiClearQuickStatusFilter() {
    KPI_QUICK_STATUS_FILTER = 'All';
}

function kpiFilteredBaseRowsForSummary() {
    const fTeam = kpiGetTeamFilterValue();
    return (globalKpiData || []).filter(row => {
        if (currentKpiTeam === 'EHS' && fTeam !== 'All' && kpiRowServiceTeam(row) !== fTeam) return false;
        return true;
    });
}

function renderKpiExecutiveSummary() {
    const section = document.getElementById('kpi-summary-section');
    const cardsWrap = document.getElementById('kpi-summary-cards');
    const statusWrap = document.getElementById('kpi-status-summary');
    const updated = document.getElementById('kpi-summary-updated');

    if (!section || !cardsWrap || !statusWrap) return;

    if (currentKpiTeam !== 'EHS') {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    const rows = kpiFilteredBaseRowsForSummary();
    const stageCounts = {
        pendingEngineer: rows.filter(kpiIsPendingEngineer).length,
        pendingSup: rows.filter(kpiIsPendingSup).length,
        pendingReport: rows.filter(kpiIsPendingReport).length
    };

    const waitingEdit = rows.filter(r => r.hasEdit || kpiRowStatusList(r).includes('รอแก้ไข')).length;
    const active = rows.filter(r => !r.isFinished).length;
    const overdue = rows.filter(r => !r.isFinished && Number(r.daysLate || 0) > 0).length;
    const dueToday = rows.filter(r => !r.isFinished && Number(r.daysLate || 0) === 0).length;
    const actionRisk = overdue + dueToday + waitingEdit;

    const fTeam = kpiGetTeamFilterValue();
    const scopeNote = fTeam === 'All' ? 'EHS + ENV' : fTeam;

    const cards = [
        { label: 'Active Jobs', value: active, note: scopeNote + ' • ยังไม่ส่ง Report เสร็จ', icon: 'fa-briefcase', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', action: '' },
        { label: 'Action Required / Risk',  value: actionRisk, note: 'Overdue / Due today / รอแก้ไข', icon: 'fa-triangle-exclamation', color: 'text-[#003DA5]', bg: 'bg-[#003DA5]/10', border: 'border-[#003DA5]/30', action: '' },
        { label: 'All Work ทั้งหมด', value: rows.length, note: scopeNote + ' • จำนวนงานทั้งหมด', icon: 'fa-layer-group', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-[#003DA5]/20', action: '' },
        { label: 'รอแก้ไข', value: waitingEdit, note: 'รายการที่ถูกตีกลับให้แก้ไข', icon: 'fa-screwdriver-wrench', color: 'text-[#003DA5]', bg: 'bg-[#003DA5]/10', border: 'border-[#003DA5]/30', action: "kpiQuickStatusFilter('รอแก้ไข')" }
    ];

    cardsWrap.innerHTML = cards.map(c => `
        <button onclick="${c.action || ''}" class="text-left rounded-2xl border ${c.border || 'border-slate-100'} ${c.bg || 'bg-white'} p-4 shadow-sm hover:shadow-md transition w-full">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${kpiEsc(c.label)}</p>
                    <h3 class="text-2xl font-black ${c.color || 'text-slate-800'} mt-1">${kpiNum(c.value)}</h3>
                    <p class="text-[10px] font-bold text-slate-500 mt-1 leading-tight">${kpiEsc(c.note || '')}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${c.color || 'text-slate-500'} shadow-sm">
                    <i class="fas ${c.icon || 'fa-chart-simple'}"></i>
                </div>
            </div>
        </button>
    `).join('');

    const stageCards = [
        { key: 'pendingEngineer', label: 'Pending Engineer', sub: 'กำลังทำ / ยังไม่พร้อมตรวจ', value: stageCounts.pendingEngineer || 0, icon: 'fa-person-digging', cls: 'bg-blue-50 border-blue-100 text-blue-700' },
        { key: 'pendingSup', label: 'Pending SUP', sub: 'เสร็จพร้อมตรวจ / กำลังตรวจ', value: stageCounts.pendingSup || 0, icon: 'fa-user-check', cls: 'bg-indigo-50 border-[#003DA5]/20 text-indigo-700' },
        { key: 'pendingReport', label: 'Pending Report', sub: 'ตรวจเสร็จ / รอส่ง Report', value: stageCounts.pendingReport || 0, icon: 'fa-file-signature', cls: 'bg-cyan-50 border-cyan-100 text-cyan-700' }
    ];

    statusWrap.innerHTML = stageCards.map(s => {
        const active = KPI_STAGE_FILTER === s.key;
        return `
        <button onclick="kpiApplyStageFilter('${s.key}')" title="คลิกเพื่อกรอง / คลิกซ้ำเพื่อยกเลิก" class="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:shadow-sm transition ${s.cls} ${active ? 'ring-2 ring-indigo-300 shadow-md' : ''}">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shadow-sm"><i class="fas ${s.icon}"></i></div>
                <div class="min-w-0">
                    <p class="text-xs font-black leading-tight">${kpiEsc(s.label)} ${active ? '<span class="ml-1 text-[9px] opacity-70">ACTIVE</span>' : ''}</p>
                    <p class="text-[10px] font-bold opacity-70 truncate">${kpiEsc(s.sub)}</p>
                </div>
            </div>
            <span class="text-xl font-black">${kpiNum(s.value)}</span>
        </button>`;
    }).join('');

    if (updated) {
        updated.innerText = `Scope: ${scopeNote} • Records: ${rows.length}`;
    }
}

function getKpiFilteredRows() {
    const fYear = document.getElementById('kpi-filter-year')?.value || 'All';
    const fMonth = document.getElementById('kpi-filter-month')?.value || 'All';
    const fStatus = document.getElementById('kpi-filter-status')?.value || 'All';
    const fTeam = kpiGetTeamFilterValue();
    const fWorkType = (document.getElementById('kpi-filter-worktype')?.value || 'All').toLowerCase();
    const search = (document.getElementById('kpi-filter-search')?.value || '').toLowerCase().trim();

    return (globalKpiData || []).filter(row => {
        if (!row.calDate || !row.jobNo || !row.customerId || !row.workType) return false;

        const p = parseKpiDateParts(row.calDate);
        if (fYear !== 'All' && String(p.year) !== String(fYear)) return false;
        if (fMonth !== 'All' && String(p.month) !== String(fMonth)) return false;
        if (fWorkType !== 'all' && String(row.workType || '').toLowerCase() !== fWorkType) return false;

        if (currentKpiTeam === 'EHS' && fTeam !== 'All' && kpiRowServiceTeam(row) !== fTeam) return false;

        if (fStatus === 'Late' && (row.isFinished || row.daysLate <= 0)) return false;
        if (fStatus === 'Completed' && !row.isFinished) return false;
        if (fStatus === 'Process' && (row.isFinished || row.daysLate > 0)) return false;

        if (KPI_STAGE_FILTER === 'pendingEngineer' && !kpiIsPendingEngineer(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingSup' && !kpiIsPendingSup(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingReport' && !kpiIsPendingReport(row)) return false;

        if (KPI_QUICK_STATUS_FILTER !== 'All') {
            const statuses = kpiRowStatusList(row);
            if (!statuses.includes(KPI_QUICK_STATUS_FILTER)) return false;
        }

        if (search) {
            const hay = [
                row.customerId, row.jobNo, row.calDate, row.workType, row.requester,
                row.sourceSheet, row.serviceTeam, kpiRowServiceTeam(row), row.currentStatus,
                row.rawStatus?.eng, row.rawStatus?.sup, row.rawStatus?.rep
            ].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }

        return true;
    });
}

function renderKPITable() {
    renderKpiExecutiveSummary();
    const tbody = document.getElementById('kpi-table-body');
    if (!tbody) return;

    const filtered = getKpiFilteredRows();
    const counter = document.getElementById('kpi-filtered-count');
    if (counter) {
        const stageLabel = KPI_STAGE_FILTER !== 'All'
            ? ' • ' + ({pendingEngineer:'Pending Engineer', pendingSup:'Pending SUP', pendingReport:'Pending Report'}[KPI_STAGE_FILTER] || KPI_STAGE_FILTER)
            : '';
        const quickLabel = KPI_QUICK_STATUS_FILTER !== 'All' ? ' • ' + KPI_QUICK_STATUS_FILTER : '';
        const teamLabel = currentKpiTeam === 'EHS' ? ' • ' + kpiGetTeamFilterValue() : '';
        counter.innerText = `${filtered.length} / ${globalKpiData.length} records${teamLabel}${stageLabel}${quickLabel}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-slate-400 italic font-bold">No tracking records found for selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const statusInfo = getKpiProgressInfo(row);
        const timelineCell = getKpiTimelineHtml(row);
        const wtClass = getKpiWorkTypeClass(row.workType);
        const detailClass = kpiStatusPillClass(row.currentStatus);
        const serviceBadge = kpiRowServiceTeam(row);
        const serviceCls = serviceBadge === 'ENV' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-indigo-50 text-indigo-600 border-[#003DA5]/20';

        return `<tr onclick='openUpdateModal(${JSON.stringify(row).replace(/'/g, "\\'")})' class="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="p-4 align-middle">
                <h4 class="text-sm font-black text-slate-800">${kpiEsc(row.customerId)}</h4>
                <p class="text-[10px] font-bold text-indigo-500 mt-1">Job: ${kpiEsc(row.jobNo)}</p>
                <div class="flex items-center gap-1 mt-1">
                    <span class="inline-flex px-2 py-0.5 rounded-md text-[8px] font-black border ${serviceCls}">${serviceBadge}</span>
                    <span class="text-[9px] font-bold text-slate-400">${kpiEsc(row.sourceSheet || '')}</span>
                </div>
            </td>
            <td class="p-4 align-middle text-center font-bold text-slate-600 text-xs">${kpiEsc(row.calDate)}</td>
            <td class="p-4 align-middle text-center"><span class="px-2.5 py-1 rounded text-[9px] font-bold uppercase shadow-sm ${wtClass}">${kpiEsc(row.workType)}</span></td>
            <td class="p-4 align-middle text-center font-black text-slate-600 text-xs">${kpiEsc(row.totalAmount || '-')}</td>
            <td class="p-4 align-middle">${statusInfo}</td>
            <td class="p-4 align-middle text-center"><span class="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${detailClass}">${kpiEsc(row.currentStatus || '-')}</span></td>
            <td class="p-4 align-middle">${getKpiTargetHtml(row)}</td>
            <td class="p-4 align-middle">${timelineCell}</td>
        </tr>`;
    }).join('');
}

function kpiResetFilters() {
    KPI_STAGE_FILTER = 'All';
    KPI_QUICK_STATUS_FILTER = 'All';
    ['kpi-filter-search','kpi-filter-year','kpi-filter-month','kpi-filter-worktype','kpi-filter-status','kpi-filter-team'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = id === 'kpi-filter-search' ? '' : 'All';
    });
    renderKPITable();
}



// ============================================================
// CES KPI Tracking V38 — TABLE CLEANUP + KPI TIMELINE PIE FIX
// 1) Remove Detailed Status column from table rendering
// 2) Timeline shows finish date and KPI outcome: ก่อน / ตรง / เกิน KPI
// 3) Adds KPI Performance pie chart based on current filtered rows
// ============================================================
let KPI_PERFORMANCE_CHART = null;

function kpiParseDateObj(v) {
    const s = String(v || '').trim();
    if (!s || s === '-' || s.toUpperCase() === 'N/A') return null;

    if (s.includes('/')) {
        const p = s.split('/');
        if (p.length >= 3) {
            let d = Number(p[0]);
            let m = Number(p[1]);
            let y = Number(String(p[2]).trim());
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            const out = new Date(y, m - 1, d);
            out.setHours(0,0,0,0);
            return isNaN(out.getTime()) ? null : out;
        }
    }

    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        const out = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        out.setHours(0,0,0,0);
        return isNaN(out.getTime()) ? null : out;
    }

    const native = new Date(s);
    if (isNaN(native.getTime())) return null;
    native.setHours(0,0,0,0);
    return native;
}

function kpiFormatDateShort(v) {
    const d = kpiParseDateObj(v);
    if (!d) return '-';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function kpiGetFinishDate(row) {
    const r = row?.rawStatus || {};
    if (row?.isFinished) return r.repDate || r.hard || '';
    return '';
}

function kpiGetPerformanceResult(row) {
    const deadline = kpiParseDateObj(row?.deadline);
    const finishDateRaw = kpiGetFinishDate(row);
    const finishDate = kpiParseDateObj(finishDateRaw);

    // COMPLETED: finished jobs
    if (row?.isFinished && deadline && finishDate) {
        const diffDays = Math.round((finishDate.getTime() - deadline.getTime()) / 86400000);
        if (diffDays > 0) {
            // Finished LATE → RED
            return { key:'late', label:'เกิน KPI', short:'เกิน', days:diffDays, finishDate:finishDateRaw, icon:'fa-triangle-exclamation', box:'bg-red-50 text-[#E4002B] border-red-300' };
        }
        if (diffDays === 0) {
            // Finished exactly on time → GREEN
            return { key:'on', label:'ตรง KPI', short:'ตรง', days:0, finishDate:finishDateRaw, icon:'fa-bullseye', box:'bg-green-50 text-green-700 border-green-300' };
        }
        // Finished EARLY → GREEN
        return { key:'early', label:'ก่อน KPI', short:'ก่อน', days:Math.abs(diffDays), finishDate:finishDateRaw, icon:'fa-check-circle', box:'bg-green-50 text-green-700 border-green-300' };
    }

    // UNFINISHED jobs
    const daysLate = Number(row?.daysLate || 0);
    if (!row?.isFinished && daysLate > 0) {
        // Overdue → RED
        return { key:'late', label:'เกิน KPI', short:'เกิน', days:daysLate, finishDate:'', icon:'fa-clock', box:'bg-red-50 text-[#E4002B] border-red-300' };
    }
    if (!row?.isFinished && daysLate === 0) {
        // Due today → YELLOW
        return { key:'on', label:'ตรง KPI', short:'ตรง', days:0, finishDate:'', icon:'fa-bullseye', box:'bg-yellow-50 text-yellow-700 border-yellow-300' };
    }
    // Has remaining days
    const remaining = Math.abs(daysLate);
    if (remaining <= 3) {
        // Near deadline (≤3 days) → YELLOW
        return { key:'near', label:'ใกล้ KPI', short:'ใกล้', days:remaining, finishDate:'', icon:'fa-hourglass-half', box:'bg-yellow-50 text-yellow-700 border-yellow-300' };
    }
    // Still have time (>3 days) → GREEN
    return { key:'early', label:'ก่อน KPI', short:'ก่อน', days:remaining, finishDate:'', icon:'fa-hourglass-half', box:'bg-green-50 text-green-700 border-green-300' };
}

function getKpiTimelineHtml(row) {
    const p = kpiGetPerformanceResult(row);
    const finishDate = kpiGetFinishDate(row);
    const finishLine = row?.isFinished
        ? `<span class="text-[9px] font-black text-slate-500 mt-1">เสร็จ: ${kpiEsc(kpiFormatDateShort(finishDate))}</span>`
        : `<span class="text-[9px] font-black text-slate-500 mt-1">ยังไม่เสร็จ</span>`;

    let dayLine = '';
    if (row?.isFinished) {
        if (p.key === 'late') dayLine = `<span class="text-[9px] font-bold opacity-80">ช้ากว่า ${p.days} วัน</span>`;
        else if (p.key === 'early') dayLine = `<span class="text-[9px] font-bold opacity-80">เร็วกว่า ${p.days} วัน</span>`;
        else dayLine = `<span class="text-[9px] font-bold opacity-80">เสร็จตรงวัน KPI</span>`;
    } else {
        if (p.key === 'late') dayLine = `<span class="text-[9px] font-bold opacity-80">เลย ${p.days} วัน</span>`;
        else if (p.key === 'early') dayLine = `<span class="text-[9px] font-bold opacity-80">เหลือ ${p.days} วัน</span>`;
        else dayLine = `<span class="text-[9px] font-bold opacity-80">ครบกำหนดวันนี้</span>`;
    }

    return `<div class="${p.box} border px-3 py-2 rounded-2xl text-center shadow-sm flex flex-col justify-center min-w-[112px] mx-auto">
        <span class="text-[10px] font-black flex items-center justify-center gap-1"><i class="fas ${p.icon}"></i> ${kpiEsc(p.label)}</span>
        ${finishLine}
        ${dayLine}
    </div>`;
}

function renderKpiPerformanceSummary(rows) {
    const list = Array.isArray(rows) ? rows : getKpiFilteredRows();
    const counts = { early:0, on:0, late:0 };
    list.forEach(row => { counts[kpiGetPerformanceResult(row).key]++; });

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = kpiNum(val); };
    setText('kpi-perf-early', counts.early);
    setText('kpi-perf-on', counts.on);
    setText('kpi-perf-late', counts.late);

    const note = document.getElementById('kpi-performance-note');
    if (note) note.innerText = `Filtered records: ${list.length}`;

    const canvas = document.getElementById('kpi-performance-pie');
    const fallback = document.getElementById('kpi-performance-pie-fallback');
    if (!canvas) return;

    const chartData = [counts.early, counts.on, counts.late];

    if (typeof Chart === 'undefined') {
        canvas.classList.add('hidden');
        if (fallback) {
            fallback.classList.remove('hidden');
            fallback.innerHTML = `ก่อน KPI: ${counts.early}<br>ตรง KPI: ${counts.on}<br>เกิน KPI: ${counts.late}`;
        }
        return;
    }

    canvas.classList.remove('hidden');
    if (fallback) fallback.classList.add('hidden');

    if (KPI_PERFORMANCE_CHART) KPI_PERFORMANCE_CHART.destroy();
    KPI_PERFORMANCE_CHART = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['ก่อน KPI', 'ตรง KPI', 'เกิน KPI'],
            datasets: [{
                data: chartData,
                backgroundColor: ['#16a34a', '#5B7F95', '#E4002B'],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.raw} งาน`
                    }
                }
            }
        }
    });
}

function renderKPITable() {
    renderKpiExecutiveSummary();
    const tbody = document.getElementById('kpi-table-body');
    if (!tbody) return;

    const filtered = getKpiFilteredRows();
    renderKpiPerformanceSummary(filtered);

    const counter = document.getElementById('kpi-filtered-count');
    if (counter) {
        const stageLabel = KPI_STAGE_FILTER !== 'All'
            ? ' • ' + ({pendingEngineer:'Pending Engineer', pendingSup:'Pending SUP', pendingReport:'Pending Report'}[KPI_STAGE_FILTER] || KPI_STAGE_FILTER)
            : '';
        const quickLabel = KPI_QUICK_STATUS_FILTER !== 'All' ? ' • ' + KPI_QUICK_STATUS_FILTER : '';
        const teamLabel = currentKpiTeam === 'EHS' ? ' • ' + kpiGetTeamFilterValue() : '';
        counter.innerText = `${filtered.length} / ${globalKpiData.length} records${teamLabel}${stageLabel}${quickLabel}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 italic font-bold">No tracking records found for selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(row => {
        const statusInfo = getKpiProgressInfo(row);
        const timelineCell = getKpiTimelineHtml(row);
        const wtClass = getKpiWorkTypeClass(row.workType);
        const serviceBadge = kpiRowServiceTeam(row);
        const serviceCls = serviceBadge === 'ENV' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-indigo-50 text-indigo-600 border-[#003DA5]/20';

        return `<tr onclick='openUpdateModal(${JSON.stringify(row).replace(/'/g, "\\'")})' class="cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="p-4 align-middle">
                <h4 class="text-sm font-black text-slate-800">${kpiEsc(row.customerId)}</h4>
                <p class="text-[10px] font-bold text-indigo-500 mt-1">Job: ${kpiEsc(row.jobNo)}</p>
                <div class="flex items-center gap-1 mt-1">
                    <span class="inline-flex px-2 py-0.5 rounded-md text-[8px] font-black border ${serviceCls}">${serviceBadge}</span>
                    <span class="text-[9px] font-bold text-slate-400">${kpiEsc(row.sourceSheet || '')}</span>
                </div>
            </td>
            <td class="p-4 align-middle text-center font-bold text-slate-600 text-xs">${kpiEsc(row.calDate)}</td>
            <td class="p-4 align-middle text-center"><span class="px-2.5 py-1 rounded text-[9px] font-bold uppercase shadow-sm ${wtClass}">${kpiEsc(row.workType)}</span></td>
            <td class="p-4 align-middle text-center font-black text-slate-600 text-xs">${kpiEsc(row.totalAmount || '-')}</td>
            <td class="p-4 align-middle">${statusInfo}</td>
            <td class="p-4 align-middle">${getKpiTargetHtml(row)}</td>
            <td class="p-4 align-middle">${timelineCell}</td>
        </tr>`;
    }).join('');
}
