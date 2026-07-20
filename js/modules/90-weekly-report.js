// ============================================================
// 90-weekly-report.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// --- Global State ---
let wkCurrentTeam = 'MED', wkActiveDashTeam = 'ALL', wkActiveStatus = 'ALL'; 
let wkRawJobs = [], wkRawStaff = [], wkSelectedMembers = [], wkUploadQueue = [], wkMemoQueue = []; 
let wkCurrentWeekInfo = '', wkRawDashboardData = [], wkDraftQueue = []; 

let wkPendingCloseJobs = [];
let wkActiveCloseFilter = 'ALL';

const WK_SUBTEAMS = {
    'MED': ['Team1', 'Team2', 'Team3', 'Team4', 'Team5', 'Team6', 'Team7', 'Team8', 'Team9', 'BEC', 'NE', 'PAO1', 'PAO2'],
    'LAB': ['Team 1', 'Team 2', 'Team 3'],
    'EHS': ['CPT-A', 'CPT-B', 'CPT-C', 'ENV']
};

// ====== 1. ฟังก์ชันเริ่มต้น ======
function initWeekly() {
    const today = new Date(); populateDateFilters(today);
    wkCurrentWeekInfo = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} (Week ${Math.ceil(today.getDate() / 7)})`;
    document.getElementById('wk-display-week').innerText = wkCurrentWeekInfo;

    ['filter-year', 'filter-month', 'filter-week'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => { if(id==='filter-month') updateWeekOptions(); applyFilters(); });
    });

    document.getElementById('weekly-loading').classList.remove('hidden');
    google.script.run.withSuccessHandler(data => {
        wkRawJobs = data.jobs || []; wkRawStaff = data.staff || [];
        switchWeeklyTeam('MED');
        document.getElementById('weekly-loading').classList.add('hidden');
    }).getWeeklyInitialData();
}

function submitWeeklyReport(e) { if (e) e.preventDefault(); addReportToQueue(); }

function populateDateFilters(d) {
    const ySelect = document.getElementById('filter-year');
    ySelect.innerHTML = '<option value="">Year</option>';
    [2026, 2027].forEach(y => ySelect.add(new Option(y, y)));
    ySelect.value = d.getFullYear(); 

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mSelect = document.getElementById('filter-month'); mSelect.innerHTML = '<option value="">Month</option>';
    months.forEach((m, i) => mSelect.add(new Option(m, i+1)));
    mSelect.value = d.getMonth() + 1;
    
    updateWeekOptions();
    document.getElementById('filter-week').value = `Week ${Math.ceil(d.getDate() / 7)}`;
}

function updateWeekOptions() {
    const wSelect = document.getElementById('filter-week'); wSelect.innerHTML = '<option value="">All Weeks</option>';
    for(let i=1; i<=5; i++) wSelect.add(new Option(`Week ${i}`, `Week ${i}`));
}

function switchWeeklyView(mode) {
    const btnForm = document.getElementById('btn-view-form'), btnDash = document.getElementById('btn-view-dash');
    const divForm = document.getElementById('wk-mode-form'), divDash = document.getElementById('wk-mode-dash');
    
    const activeFormCls = "flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm bg-white text-[#003DA5] transition-all border border-transparent";
    const inactiveCls = "flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:text-[#003DA5] transition-all";

    if (mode === 'form') {
        btnForm.className = activeFormCls; btnDash.className = inactiveCls;
        divForm.classList.remove('hidden'); divDash.classList.add('hidden');
    } else {
        btnDash.className = activeFormCls; btnForm.className = inactiveCls;
        divDash.classList.remove('hidden'); divForm.classList.add('hidden');
        if(wkRawDashboardData.length === 0) loadWeeklyDashboard(); 
    }
}

function switchWeeklyTeam(team) {
    wkCurrentTeam = team;
    ['MED', 'LAB', 'EHS'].forEach(t => {
        const btn = document.getElementById('tab-wk-' + t.toLowerCase());
        if(!btn) return;
        btn.className = "flex-1 py-3 px-4 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:shadow-sm whitespace-nowrap transition-all";
        if(t === team) btn.className = `flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-md transform scale-105 transition-all whitespace-nowrap btn-${t.toLowerCase()}-active text-white`;
    });

    const subSelect = document.getElementById('wk-subteam');
    subSelect.innerHTML = '<option value="">-- Select Team --</option>';
    if (WK_SUBTEAMS[team]) WK_SUBTEAMS[team].forEach(st => subSelect.appendChild(new Option(st, st)));

    document.getElementById('wk-subteam-wrapper').classList.remove('hidden'); 
    toggleJobType();
}

function toggleJobType() {
    const checkedEl = document.querySelector('input[name="jobType"]:checked');
    const isRepair = (checkedEl ? checkedEl.value : 'Onsite') === 'In-house';
    
    document.getElementById('wk-subteam-wrapper').classList.toggle('hidden', isRepair);
    document.getElementById('wk-job-container').classList.toggle('hidden', isRepair);
    document.getElementById('wk-repair-info-container').classList.toggle('hidden', !isRepair);
    document.getElementById('wk-info-label').innerText = isRepair ? "In-house / Repair Details *" : "Details *";
    
    if(!isRepair) renderWeeklyJobs(wkCurrentTeam);
    checkAutoStatus(); 
}

function checkAutoStatus() {
    const jobType = document.querySelector('input[name="jobType"]:checked')?.value || 'Onsite';
    const devPct = parseInt(document.getElementById('wk-dev-percent').innerText) || 0;
    const repPct = parseInt(document.getElementById('wk-report-prog-val').value) || 0;
    const isFinish = (jobType === 'Onsite') ? (devPct === 100 && repPct === 100) : (repPct === 100);
    
    const finishBtn = document.getElementById('status-finish'), procBtn = document.getElementById('status-onprocess');
    if (isFinish && finishBtn) finishBtn.checked = true;
    else if (procBtn) procBtn.checked = true;
}

function setReportProgress(val) {
    const input = document.getElementById('wk-report-prog-val');
    if(input) input.value = val;
    
    [20, 40, 60, 80, 100].forEach(pt => {
        const btn = document.getElementById(`prog-btn-${pt}`);
        if(btn) {
            if(parseInt(val) === pt) {
                btn.className = "prog-btn flex-1 py-2 text-xs font-bold rounded-lg transition-all shadow-md bg-[#003DA5] text-white border-transparent";
            } else {
                btn.className = "prog-btn flex-1 py-2 text-xs font-bold rounded-lg transition-all border border-gray-200 bg-white text-gray-500 hover:bg-gray-50";
            }
        }
    });
    checkAutoStatus();
}

function calcDeviceProgress() {
    const act = parseFloat(document.getElementById('wk-dev-act').value) || 0;
    const total = parseFloat(document.getElementById('wk-dev-total').value) || 0;
    document.getElementById('wk-dev-percent').innerText = (total > 0) ? Math.min(100, Math.round((act / total) * 100)) + '%' : '0%';
    checkAutoStatus();
}

function toggleIncident() {
    const isChecked = document.getElementById('wk-incident-check').checked;
    const textEl = document.getElementById('wk-incident-text');
    textEl.classList.toggle('hidden', !isChecked);
    if (isChecked) textEl.focus(); else textEl.value = '';
}

// 💡 เพิ่มการอ่านค่าและตรวจสอบ Work Order
function getFormDataPayload() {
    const rType = document.querySelector('input[name="jobType"]:checked')?.value || 'Onsite';
    let subTeam = document.getElementById('wk-subteam').value;
    let jobTitle = rType === 'In-house' ? document.getElementById('wk-repair-input').value : document.getElementById('wk-job-select').value;
    
    let workOrder = document.getElementById('wk-work-order').value.trim();
    
    if(rType === 'In-house') subTeam = 'In-house';
    else if(!subTeam) return Swal.fire('Warning', 'Please select Team', 'warning'), null;

    if (!jobTitle) return Swal.fire('Warning', 'Please select or enter Job details', 'warning'), null;
    
    if (!workOrder) return Swal.fire('Warning', 'Please enter Work Order No.', 'warning'), null;

    if (rType !== 'In-house' && !document.getElementById('wk-edit-id').value) {
        const isDupDash = wkRawDashboardData.some(r => (r.job === jobTitle) && (r.week === wkCurrentWeekInfo));
        const isDupDraft = wkDraftQueue.some(d => d.jobTitle === jobTitle);
        if (isDupDash || isDupDraft) {
            Swal.fire('Warning', 'Report for this job already exists for this week.', 'warning');
            return null;
        }
    }

    if (wkSelectedMembers.length === 0) return Swal.fire('Warning', 'Please select at least one member.', 'warning'), null;

    return {
        rowId: document.getElementById('wk-edit-id').value, mainTeam: wkCurrentTeam, subTeam: subTeam, reportType: rType, 
        jobTitle: jobTitle, reportProgress: document.getElementById('wk-report-prog-val').value || 0, 
        status: document.querySelector('input[name="wkStatus"]:checked')?.value || 'On Process', 
        deviceAct: document.getElementById('wk-dev-act').value || 0, deviceTotal: document.getElementById('wk-dev-total').value || 0, 
        deviceProgress: document.getElementById('wk-dev-percent').innerText.replace('%',''), 
        members: wkSelectedMembers, note: document.getElementById('wk-note').value, 
        incident: document.getElementById('wk-incident-check').checked ? document.getElementById('wk-incident-text').value : "", 
        existingImages: wkUploadQueue.filter(i => !i.isNew).map(i => i.url), newImages: wkUploadQueue.filter(i => i.isNew).map(i => ({ name: i.file.name, mime: i.file.type, base64: i.base64 })), 
        existingMemos: wkMemoQueue.filter(i => !i.isNew).map(i => i.url), newMemos: wkMemoQueue.filter(i => i.isNew).map(i => ({ name: i.name, mime: i.mime, base64: i.base64 })), 
        reporter: typeof currentUser !== 'undefined' ? (currentUser.name_eng || currentUser.name_th) : 'Unknown', weekInfo: wkCurrentWeekInfo,
        workOrder: workOrder // 💡 แนบ Work Order ลงใน Payload
    };
}

function addReportToQueue() {
    const payload = getFormDataPayload(); if(!payload) return; 
    wkDraftQueue.push(payload); renderDraftQueue(); resetForm(false); 
    Swal.fire({ icon: 'success', title: 'Added to Queue', timer: 1000, showConfirmButton: false });
}

function renderDraftQueue() {
    const container = document.getElementById('wk-draft-container'), list = document.getElementById('wk-draft-list'), count = document.getElementById('wk-draft-count');
    if(!container) return;
    if(wkDraftQueue.length === 0) { container.classList.add('hidden'); return; }

    container.classList.remove('hidden'); count.innerText = wkDraftQueue.length;
    list.innerHTML = wkDraftQueue.map((d, i) => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div class="flex-1 pr-4">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[9px] font-black bg-[#003DA5]/10 text-[#003DA5] px-2 py-0.5 rounded uppercase tracking-wider">${d.mainTeam} / ${d.subTeam}</span>
                    <span class="text-[9px] font-bold ${d.status==='Finish'?'text-[#003DA5]':'text-[#003DA5]'} border px-1.5 py-0.5 rounded">${d.status}</span>
                </div>
                <div class="text-xs font-bold text-gray-800 line-clamp-2">${d.jobTitle}</div>
            </div>
            <button type="button" onclick="wkDraftQueue.splice(${i}, 1); renderDraftQueue(); renderWeeklyJobs(wkCurrentTeam);" class="w-8 h-8 shrink-0 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"><i class="fas fa-times text-xs"></i></button>
        </div>`).join('');
    renderWeeklyJobs(wkCurrentTeam);
}

function submitAllReports(e) {
    if(e) e.preventDefault();
    const editId = document.getElementById('wk-edit-id').value;
    
    // โหมดแก้ไข Report
    if (editId) {
         const p = getFormDataPayload(); if(!p) return; 
         Swal.fire({ title: 'Saving...', html: 'Updating your report, please wait.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
         
         google.script.run.withSuccessHandler(res => {
             if (res.success) { Swal.fire({ icon: 'success', title: 'Finish save report', timer: 1500, showConfirmButton: false }); resetForm(true); loadWeeklyDashboard(); switchWeeklyView('dash'); } 
             else Swal.fire('Error', res.message, 'error');
         }).withFailureHandler(err => { Swal.fire('Error', err.message, 'error'); }).saveWeeklyReport(p);
         return;
    }

    // โหมดเพิ่มใหม่ (เช็กจาก Draft)
    if ((document.querySelector('input[name="jobType"]:checked')?.value === 'In-house' ? document.getElementById('wk-repair-input').value : document.getElementById('wk-job-select').value)) {
        const p = getFormDataPayload(); if(p) { wkDraftQueue.push(p); resetForm(false); }
    }
    if (wkDraftQueue.length === 0) return Swal.fire('Warning', 'Please add at least one report.', 'warning');

    Swal.fire({ title: 'Saving...', html: `Processing ${wkDraftQueue.length} report(s), please wait.`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    google.script.run.withSuccessHandler(res => {
        if (res.success) { Swal.fire({ icon: 'success', title: 'Finish save report', timer: 1500, showConfirmButton: false }); resetForm(true); loadWeeklyDashboard(); switchWeeklyView('dash'); } 
        else Swal.fire('Error', res.message, 'error');
    }).withFailureHandler(err => { Swal.fire('Error', err.message, 'error'); }).saveMultipleWeeklyReports(wkDraftQueue);
}

function toggleBtnLoad(id, isLoading, text) {
    const btn = document.getElementById(id);
    if(btn) { btn.disabled = isLoading; btn.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin"></i> ${text}` : text; }
}

function renderWeeklyJobs(team) {
    const jobSelect = document.getElementById('wk-job-select'); if(!jobSelect) return;
    jobSelect.innerHTML = '<option value="">-- Select Job --</option>';
    
    const exclude = [...wkRawDashboardData.filter(r => (r.week || r.weekInfo) === wkCurrentWeekInfo).map(r => (r.job || r.jobTitle || '').trim()), ...wkDraftQueue.map(d => (d.jobTitle || '').trim())];
    const available = wkRawJobs.filter(j => j.team?.toUpperCase() === team?.toUpperCase() && !exclude.includes((j.fullLabel || j.title || '').trim()));

    if(available.length === 0) return jobSelect.innerHTML = '<option value="">-- No pending jobs --</option>'; 
    available.forEach(j => jobSelect.appendChild(new Option(j.fullLabel || j.title, j.fullLabel || j.title)));
}

function loadWeeklyDashboard() {
    document.getElementById('wk-dash-loading').classList.remove('hidden'); document.getElementById('wk-dash-grid').classList.add('hidden');
    google.script.run.withSuccessHandler(data => {
        document.getElementById('wk-dash-loading').classList.add('hidden'); document.getElementById('wk-dash-grid').classList.remove('hidden');
        wkRawDashboardData = data || []; applyFilters(); renderWeeklyJobs(wkCurrentTeam);
    }).getWeeklyDashboardHistory(null);
}

function filterDash(team) {
    wkActiveDashTeam = team;
    ['ALL', 'MED', 'LAB', 'EHS'].forEach(t => {
        const btn = document.getElementById(`filter-${t.toLowerCase()}`);
        if(btn) {
            btn.className = "px-5 py-2 rounded-lg text-sm font-bold bg-white text-gray-500 border border-transparent hover:text-[#003DA5] transition-all whitespace-nowrap"; 
            if (t === team) btn.className = `px-5 py-2 rounded-lg text-sm font-bold bg-gray-800 text-white shadow-sm transition-all whitespace-nowrap ${t!=='ALL'?'bg-'+t.toLowerCase():''}`; 
        }
    }); applyFilters();
}

function filterStatusDash(status) {
    wkActiveStatus = status;
    ['ALL', 'On Process', 'Finish'].forEach(s => {
        const btn = document.getElementById(`filter-stat-${{'ALL':'all', 'On Process':'on', 'Finish':'fin'}[s]}`);
        if(btn) {
            btn.className = "px-5 py-2 rounded-lg text-sm font-bold bg-white text-gray-500 border border-transparent hover:text-[#003DA5] transition-all whitespace-nowrap";
            let icon = s==='On Process'?'<i class="fas fa-spinner text-[#003DA5] mr-1.5"></i>':s==='Finish'?'<i class="fas fa-check text-[#003DA5] mr-1.5"></i>':'';
            if(s === status) btn.className = `px-5 py-2 rounded-lg text-sm font-bold text-white shadow-sm transition-all whitespace-nowrap ${s==='Finish'?'bg-[#003DA5]':s==='On Process'?'bg-[#003DA5]':'bg-gray-800'}`;
            if(s === status && s !== 'ALL') icon = icon.replace('text-[#003DA5]', 'text-white').replace('text-[#003DA5]', 'text-white');
            if(s !== 'ALL') btn.innerHTML = icon + s;
        }
    }); applyFilters();
}

function applyFilters() {
    const y = document.getElementById('filter-year').value, m = document.getElementById('filter-month').value, w = document.getElementById('filter-week').value;
    let filtered = wkRawDashboardData;
    
    if(y || m || w) filtered = filtered.filter(r => {
        const wkStr = r.week || r.weekInfo || ''; if(!wkStr) return true;
        const [dd, mm, yy] = wkStr.split(' ')[0].split('/');
        return (!y || yy === y) && (!m || parseInt(mm) === parseInt(m)) && (!w || wkStr.includes(w));
    });
    if (wkActiveStatus !== 'ALL') filtered = filtered.filter(r => r.status === wkActiveStatus);

    ['MED', 'LAB', 'EHS'].forEach(t => {
        document.getElementById(`wrapper-${t.toLowerCase()}`).classList.toggle('hidden', wkActiveDashTeam !== 'ALL' && wkActiveDashTeam !== t);
        const tData = filtered.filter(d => d.team === t);
        document.getElementById(`count-${t.toLowerCase()}`).innerText = tData.length;
        document.getElementById(`col-${t.toLowerCase()}`).innerHTML = tData.length ? tData.map(createPhotoCard).join('') : '<div class="text-center text-xs text-gray-300 py-10 border-2 border-dashed border-gray-100 rounded-xl">No Update</div>';
    });
}

function createPhotoCard(r) {
    const colors = {'MED':{c:'bg-med',t:'text-med',bg:'bg-blue-50'}, 'LAB':{c:'bg-lab',t:'text-lab',bg:'bg-cyan-50'}, 'EHS':{c:'bg-ehs',t:'text-ehs',bg:'bg-[#0fc1a1]/10'}};
    const c = colors[r.team] || {c:'bg-gray-800',t:'text-gray-800',bg:'bg-gray-100'};
    let isFin = r.status === 'Finish';
    
    let devAct = parseInt(r.deviceAct) || 0;
    let devTot = parseInt(r.deviceTotal) || 0;
    let rptPct = parseInt(r.reportProgress) || 0; 
    if (typeof r.reportProgress === 'string' && r.reportProgress.includes('%')) {
        rptPct = parseInt(r.reportProgress.replace('%', '')) || 0;
    }
    if (isNaN(rptPct)) rptPct = 0;

    // --- 🌟 SMART CACHE PATCH: สวมทับข้อมูลที่พังจาก Backend ---
    try {
        const cacheKey = r.rowId + '_' + r.job;
        let qc_dev = JSON.parse(localStorage.getItem('qc_dev_fix') || '{}');
        let qc_rep = JSON.parse(localStorage.getItem('qc_rep_fix') || '{}');
        
        // ถ้างานนี้เพิ่งถูกกด Quick Update ไป ให้ใช้ตัวเลขที่จำไว้สวมทับข้อมูลรวนทันที
        if (qc_dev[cacheKey]) {
            devTot = parseInt(qc_dev[cacheKey]) || devTot || 1;
            devAct = devTot;
        }
        if (qc_rep[cacheKey]) {
            rptPct = 100;
        }
        
        // ถ้าทั้ง 2 อย่างครบ 100% ให้บังคับแสดงผลเป็นการ์ด Finish ไปเลย
        if (devAct >= devTot && devTot > 0 && rptPct >= 100) {
            isFin = true;
        }
    } catch(e) {}
    // ----------------------------------------------------

    if (isFin) {
        if (devTot === 0) devTot = 1;
        devAct = devTot;
        rptPct = 100;
    }
    
    let devPct = (devTot > 0) ? Math.min(100, Math.round((devAct / devTot) * 100)) : 0;
    const devDisplay = `${devAct}/${devTot} (${devPct}%)`;
    const rptDisplay = `${rptPct}%`;

    let imgs = []; try { imgs = JSON.parse(r.photo||'[]'); if(!Array.isArray(imgs)) imgs=[r.photo]; } catch(e){}
    imgs = imgs.filter(u => u && u !== '-' && !u.startsWith('Error'));

    let photoHtml = `<div class="collage-container flex items-center justify-center text-gray-300 text-xs py-4">No Photo</div>`;
    if(imgs.length > 0) {
        photoHtml = `<div class="collage-container"><div class="collage-grid collage-${imgs.length>3?'more':imgs.length}">` + 
            imgs.slice(0,4).map((u, i) => `<div class="collage-item" onclick="viewDetailByRowId('${r.rowId}')"><img src="${getDriveImgUrl(u)}" class="collage-img" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=No+Image';">${i===3 && imgs.length>4 ? `<div class="more-overlay">+${imgs.length-3}</div>`:''}</div>`).join('') + `</div></div>`;
    }

    const barColor = isFin ? '#004aad' : (r.team === 'MED' ? '#004aad' : (r.team === 'LAB' ? '#19a7ce' : '#19a7ce'));

    return `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative" data-id="${r.rowId}">
        <div class="absolute top-2 right-2 flex gap-1 z-20">
            <button onclick="editCard('${r.rowId}')" class="w-8 h-8 bg-white/95 rounded-full shadow text-[#003DA5] hover:text-[#003DA5] flex items-center justify-center backdrop-blur-sm transition-colors"><i class="fas fa-pen text-xs"></i></button>
            <button onclick="deleteCard('${r.rowId}')" class="w-8 h-8 bg-white/95 rounded-full shadow text-red-400 hover:text-red-600 flex items-center justify-center backdrop-blur-sm transition-colors"><i class="fas fa-trash text-xs"></i></button>
        </div>
        ${photoHtml}
        <div class="p-4 flex-1 flex flex-col">
            <div class="flex justify-between items-start mb-3">
                <span class="text-[10px] font-black text-white px-2.5 py-1 rounded-md shadow-sm uppercase tracking-widest ${c.c}">${r.subTeam}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${isFin?'bg-[#003DA5]/10 text-[#003DA5] border-[#003DA5]':'bg-[#003DA5]/10 text-[#003DA5] border-[#003DA5]'}">${r.status}</span>
            </div>
            <h4 class="font-bold text-gray-800 text-sm mb-1 leading-snug line-clamp-2 cursor-pointer hover:text-[#003DA5]" onclick="viewDetailByRowId('${r.rowId}')">${r.job}</h4>
            ${r.incident && r.incident!=='-' ? `<div class="mt-2 w-full bg-red-50 border border-red-200 p-2 rounded-lg flex gap-2"><i class="fas fa-exclamation-circle text-red-500 text-xs mt-0.5"></i><span class="text-[11px] text-red-700 font-bold leading-snug">${r.incident}</span></div>` : ''}
            <div class="mt-auto pt-3 mt-3 border-t border-dashed border-gray-100">
                <div class="mb-2">
                    <div class="flex justify-between text-[9px] mb-1">
                        <span class="text-gray-500 font-bold"><i class="fas fa-microchip"></i> Device</span>
                        <span class="font-bold ${isFin?'text-[#003DA5]':c.t}">${devDisplay}</span>
                    </div>
                    <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div class="h-1.5 rounded-full transition-all duration-500" style="width: ${devPct}%; background-color: ${barColor};"></div>
                    </div>
                </div>
                <div class="mb-1">
                    <div class="flex justify-between text-[9px] mb-1">
                        <span class="text-gray-500 font-bold"><i class="fas fa-chart-line"></i> Report</span>
                        <span class="font-bold ${isFin?'text-[#003DA5]':c.t}">${rptDisplay}</span>
                    </div>
                    <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div class="h-1.5 rounded-full transition-all duration-500" style="width: ${rptPct}%; background-color: ${barColor};"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}
function viewDetailByRowId(id) { const r = wkRawDashboardData.find(i => i.rowId == id); if(r) viewDetail(r); }

// 💡 เพิ่มการโหลดข้อมูล Work Order เดิมมาแสดงตอนแก้ไข
function editCard(id) {
    const r = wkRawDashboardData.find(i => i.rowId == id); if(!r) return;
    switchWeeklyView('form'); switchWeeklyTeam(r.team);
    
    document.getElementById('btn-wk-add-draft')?.classList.add('hidden');
    document.getElementById('wk-draft-container')?.classList.add('hidden');
    const btn = document.getElementById('btn-wk-submit-all'); if(btn) btn.innerHTML = '<i class="fas fa-save text-lg"></i> Update Report';

    setTimeout(() => {
        document.getElementById('wk-subteam').value = r.subTeam;
        if (r.type === 'In-house') { 
            document.querySelector('input[name="jobType"][value="In-house"]').checked = true; 
            toggleJobType(); 
            document.getElementById('wk-repair-input').value = r.job; 
        } else {
            document.querySelector('input[name="jobType"][value="Onsite"]').checked = true; 
            toggleJobType();
            setTimeout(() => { 
                const sel = document.getElementById('wk-job-select');
                let optionExists = Array.from(sel.options).some(o => o.value === r.job);
                if (!optionExists) {
                    sel.appendChild(new Option(r.job, r.job));
                }
                sel.value = r.job; 
            }, 100);
        }
        
        document.getElementById('wk-work-order').value = r.workOrder || ''; // 💡 ดึงค่า Work Order เดิมมาใส่ฟอร์ม
        document.getElementById('wk-note').value = r.note || '';
        document.getElementById('wk-incident-check').checked = !!(r.incident && r.incident!=='-'); toggleIncident();
        if(r.incident && r.incident!=='-') document.getElementById('wk-incident-text').value = r.incident;

        document.getElementById('wk-dev-act').value = r.deviceAct || 0; document.getElementById('wk-dev-total').value = r.deviceTotal || 0; calcDeviceProgress(); 
        
        setReportProgress(r.reportProgress ? parseInt(r.reportProgress) : parseInt(r.progressVal) || 0);
        document.getElementById(r.status === 'Finish' ? 'status-finish' : 'status-onprocess').checked = true;

        wkSelectedMembers = r.members ? r.members.split(',').map(s=>s.trim()).filter(s=>s) : []; renderSelectedMembers();
        
        wkUploadQueue = []; let imgs = []; try{imgs=JSON.parse(r.photo||'[]')}catch(e){}
        imgs.forEach(u => wkUploadQueue.push({isNew: false, url: u})); renderPreview();
        
        wkMemoQueue = []; let mms = []; try{mms=JSON.parse(r.memo||'[]')}catch(e){}
        mms.forEach((u,i) => wkMemoQueue.push({isNew: false, url: u, name: `Doc ${i+1}`})); renderMemoPreview();
        
        document.getElementById('wk-edit-id').value = r.rowId; window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
}

// 💡 เพิ่มการแสดงข้อมูล Work Order บน Popup รายละเอียด
function viewDetail(r) {
    const c = r.team==='MED'?'bg-med':r.team==='LAB'?'bg-lab':'bg-ehs';
    let imgs = []; try { imgs=JSON.parse(r.photo||'[]').filter(u=>u!=='-') } catch(e){}
    let memos = []; try { memos=JSON.parse(r.memo||'[]').filter(u=>u!=='-') } catch(e){}
    const devPct = r.deviceTotal > 0 ? Math.min(100, Math.round((r.deviceAct/r.deviceTotal)*100)) : 0;
    const rptPct = parseInt(r.reportProgress) || 0;

    Swal.fire({
        title: `<div class="text-xl font-extrabold text-gray-800 leading-snug pr-4 text-left">${r.job}</div>`,
        html: `
        <div class="space-y-4 text-left font-sans mt-2">
            <div class="flex justify-between items-center text-xs pb-3 border-b border-gray-100">
                <span class="px-2.5 py-1 rounded-lg ${c} text-white font-bold uppercase tracking-wider">${r.team} / ${r.subTeam}</span>
                <span class="px-2.5 py-0.5 rounded-full ${r.status==='Finish'?'bg-[#003DA5]/10 text-[#003DA5] border-[#003DA5]':'bg-[#003DA5]/10 text-[#003DA5] border-[#003DA5]'} font-bold border">${r.status}</span>
            </div>

            <div class="grid grid-cols-2 gap-4 text-xs">
                <div><span class="text-gray-400 font-bold block mb-1">Reporter</span><span class="text-gray-700 font-bold bg-gray-100 px-2 py-0.5 rounded-md inline-block"><i class="fas fa-user-edit text-blue-400 mr-1"></i>${r.reporter}</span></div>
                <div><span class="text-gray-400 font-bold block mb-1">Last Update</span><span class="text-gray-700 font-bold bg-gray-100 px-2 py-0.5 rounded-md inline-block"><i class="fas fa-history text-[#003DA5] mr-1"></i>${r.ts ? r.ts.split(' ')[0] : '-'}</span></div>
                <div><span class="text-gray-400 font-bold block mb-1">Work Order</span><span class="text-gray-700 font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md inline-block"><i class="fas fa-file-invoice mr-1"></i>${r.workOrder || '-'}</span></div>
                <div class="col-span-2"><span class="text-gray-400 font-bold block mb-1.5">Team Members</span><div class="flex flex-wrap gap-1.5">${(r.members||'-').split(',').map(m=>`<span class="bg-[#003DA5] border border-[#003DA5] text-[#003DA5] px-2 py-0.5 rounded-md font-bold">${m.trim()}</span>`).join('')}</div></div>
            </div>

            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-3">
                <h4 class="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider border-b border-gray-50 pb-2">Progress Tracking</h4>
                <div class="mb-4">
                    <div class="flex justify-between text-[10px] mb-1.5">
                        <span class="text-gray-500 font-bold"><i class="fas fa-microchip text-blue-500 mr-1"></i> Device Completed</span>
                        <span class="font-bold text-blue-600">${r.deviceAct} / ${r.deviceTotal} (${devPct}%)</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div class="bg-blue-500 h-full rounded-full transition-all duration-1000" style="width: ${devPct}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-[10px] mb-1.5">
                        <span class="text-gray-500 font-bold"><i class="fas fa-chart-line text-[#003DA5] mr-1"></i> Report Progress</span>
                        <span class="font-bold text-[#003DA5]">${rptPct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div class="bg-[#003DA5] h-full rounded-full transition-all duration-1000" style="width: ${rptPct}%"></div></div>
                </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-xl border border-gray-100"><h4 class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Note</h4><p class="text-sm text-gray-800 whitespace-pre-wrap">${r.note||'-'}</p></div>
            ${r.incident&&r.incident!=='-'?`<div class="bg-red-50 p-4 rounded-xl border border-red-200"><h4 class="text-[10px] font-bold text-red-600 mb-2 uppercase tracking-wider">Incident</h4><p class="text-sm text-red-700 whitespace-pre-wrap">${r.incident}</p></div>`:''}
            
            ${imgs.length>0 ? `<div class="mt-2"><h4 class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Photos (${imgs.length})</h4><div class="grid grid-cols-2 gap-2">${imgs.map(u=>`<img src="${getDriveImgUrl(u)}" onclick="window.open('${getDriveImgUrl(u)}')" class="w-full h-24 object-cover rounded-xl cursor-pointer shadow-sm hover:scale-105 transition-transform">`).join('')}</div></div>` : ''}
            
            ${memos.length>0 ? `<div class="mt-2"><h4 class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Memos / Work Orders (${memos.length})</h4><div class="flex flex-col gap-2">${memos.map((u,i)=>`<a href="${u}" target="_blank" class="text-xs bg-blue-50 text-blue-600 p-2.5 rounded-lg border border-blue-100 flex items-center hover:bg-blue-100 font-bold transition-colors"><i class="fas fa-file-alt text-lg mr-2 text-blue-400"></i> Open Document ${i+1}</a>`).join('')}</div></div>` : ''}
        </div>`,
        width: 600, showConfirmButton: false, showCloseButton: true,
        customClass: { popup: 'rounded-3xl p-0 overflow-hidden', header: 'bg-gray-50/50 px-6 py-5 border-b border-gray-100', content: 'px-6 py-5 custom-scrollbar max-h-[80vh] overflow-y-auto', closeButton: 'focus:outline-none' }
    });
}

function cancelEdit() { resetForm(true); }

// 💡 เพิ่มเคลียร์ข้อมูลในช่อง Work Order
function clearWeeklyForm() {
    let form = document.getElementById('weekly-form');
    if (form) form.reset();

    // กลุ่มล้างตัวเลขเป็น 0
    ['wk-dev-act', 'wk-dev-total', 'wk-report-prog-val'].forEach(id => { 
        let el = document.getElementById(id); 
        if(el) el.value = '0'; 
    });
    
    let pctEl = document.getElementById('wk-dev-percent');
    if (pctEl) pctEl.innerText = '0%';
    
    // กลุ่มล้างข้อความ/ไฟล์ รวมถึง wk-work-order
    ['wk-repair-input', 'wk-incident-text', 'wk-member-search', 'wk-photo-upload', 'wk-memo-upload', 'wk-work-order'].forEach(id => { 
        let el = document.getElementById(id);
        if(el) el.value = ''; 
    });
    
    // กลุ่มล้าง HTML (รูปภาพ, Tag)
    ['wk-preview-grid', 'wk-memo-preview', 'wk-member-tags'].forEach(id => { 
        let el = document.getElementById(id);
        if(el) el.innerHTML = ''; 
    });

    // รีเซ็ต Dropdown และ Checkbox
    let selectEl = document.getElementById('wk-job-select');
    if (selectEl) selectEl.selectedIndex = 0;
    
    let incCheck = document.getElementById('wk-incident-check');
    if (incCheck) incCheck.checked = false;
    
    let incText = document.getElementById('wk-incident-text');
    if (incText) incText.classList.add('hidden');

    // รีเซ็ตปุ่ม % Progress
    document.querySelectorAll('.prog-btn').forEach(b => {
        b.classList.remove('bg-[#003DA5]', 'text-white', 'border-transparent');
        b.classList.add('bg-white', 'text-gray-500', 'border-gray-200');
    });

    // ล้างตัวแปร Global Array
    wkSelectedMembers = []; wkUploadQueue = []; wkMemoQueue = [];
    
    if(typeof toggleJobType === 'function') toggleJobType();
}

function resetForm(clearDrafts = true) {
    clearWeeklyForm();
    if(document.getElementById('wk-edit-id')) document.getElementById('wk-edit-id').value = '';
    
    renderSelectedMembers(); 
    renderPreview(); 
    renderMemoPreview(); 
    
    switchWeeklyTeam(wkCurrentTeam);
    
    let btnAdd = document.getElementById('btn-wk-add-draft');
    if(btnAdd) btnAdd.classList.remove('hidden');
    
    let btnSubmit = document.getElementById('btn-wk-submit-all'); 
    if(btnSubmit) btnSubmit.innerHTML = '<i class="fas fa-paper-plane text-lg"></i> Submit All Reports';
    
    if(clearDrafts) { 
        wkDraftQueue = []; 
        renderDraftQueue(); 
    } else {
        renderWeeklyJobs(wkCurrentTeam);
    }
}

function deleteCard(rowId) { Swal.fire({title:'Delete?', text:"Undone action", icon:'warning', showCancelButton:true, confirmButtonColor:'#E4002B', confirmButtonText:'Delete'}).then((r)=>{ if(r.isConfirmed) google.script.run.withSuccessHandler(loadWeeklyDashboard).deleteWeeklyReport(rowId); }); }
function exportWeeklyXLSX() { Swal.fire({title:'Exporting...', didOpen:()=>Swal.showLoading()}); google.script.run.withSuccessHandler(url=>{Swal.close(); window.open(url, '_blank');}).getWeeklyExcelUrl(wkCurrentWeekInfo); }

function searchStaff(k){ 
    const d=document.getElementById('wk-member-dropdown'); d.innerHTML='';
    if(!k||k.length<2) return d.classList.add('hidden');
    const m = wkRawStaff.filter(s => s.team===wkCurrentTeam && ((s.name_eng||'').toLowerCase().includes(k.toLowerCase()) || (s.name_th||'').includes(k.toLowerCase()))).slice(0,6);
    if(m.length===0) return d.classList.add('hidden');
    m.forEach(s=>{ let el=document.createElement('div'); el.className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b flex flex-col"; el.innerHTML=`<span class="text-xs font-bold text-gray-700">${s.name_th}</span><span class="text-[10px] text-gray-400">${s.name_eng}</span>`; el.onclick=()=>addMember(s.name_eng||s.name_th); d.appendChild(el); });
    d.classList.remove('hidden'); 
}
function addMember(n){ if(!wkSelectedMembers.includes(n)) wkSelectedMembers.push(n); renderSelectedMembers(); document.getElementById('wk-member-search').value=''; document.getElementById('wk-member-dropdown').classList.add('hidden'); }
function removeMember(n){ wkSelectedMembers=wkSelectedMembers.filter(m=>m!==n); renderSelectedMembers(); }
function renderSelectedMembers(){ document.getElementById('wk-member-tags').innerHTML=wkSelectedMembers.map(m=>`<span class="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#003DA5]/10 text-[#003DA5] text-xs font-bold border border-[#003DA5] shadow-sm">${m}<button type="button" onclick="removeMember('${m}')" class="hover:text-red-500 ml-1"><i class="fas fa-times"></i></button></span>`).join(''); }

function handleFilesSelect(e) {
    const f = Array.from(e.target.files); if (!f.length) return;
    if (wkUploadQueue.length + f.length > 5) return Swal.fire('Limit Exceeded', 'Max 5 photos', 'warning');
    f.forEach(file => { const r = new FileReader(); r.readAsDataURL(file); r.onload = ev => { const img = new Image(); img.src = ev.target.result; img.onload = () => { const cvs = document.createElement('canvas'); const scale = 1000/img.width; cvs.width = 1000; cvs.height = img.height*scale; cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height); wkUploadQueue.push({isNew:true, file:file, base64:cvs.toDataURL('image/jpeg', 0.7)}); renderPreview(); } } });
    e.target.value = ''; 
}
function renderPreview() { document.getElementById('wk-preview-grid').innerHTML = wkUploadQueue.map((i, idx) => `<div class="relative h-20 rounded-xl overflow-hidden shadow-sm"><img src="${i.isNew?i.base64:getDriveImgUrl(i.url)}" class="w-full h-full object-cover"><button type="button" onclick="wkUploadQueue.splice(${idx},1); renderPreview();" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-[10px]"><i class="fas fa-times"></i></button></div>`).join(''); }

function handleMemoSelect(e) { const f = Array.from(e.target.files); if(!f.length) return; f.forEach(file => { const r = new FileReader(); r.onload = ev => { wkMemoQueue.push({isNew:true, name:file.name, mime:file.type||'application/octet-stream', base64:ev.target.result}); renderMemoPreview(); }; r.readAsDataURL(file); }); e.target.value = ''; }
function renderMemoPreview() { document.getElementById('wk-memo-preview').innerHTML = wkMemoQueue.map((m, i) => `<div class="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium border shadow-sm"><span class="truncate w-10/12"><i class="fas fa-paperclip text-blue-400 mr-2"></i>${m.name}</span><button type="button" onclick="wkMemoQueue.splice(${i},1); renderMemoPreview();" class="text-gray-400 hover:text-red-500"><i class="fas fa-times-circle text-sm"></i></button></div>`).join(''); }

function getDriveImgUrl(url) {
    if (!url || url === '-' || url.startsWith('Error')) return null; if (url.startsWith('data:image')) return url;
    const parts = url.match(/\/file\/d\/(.+?)\//) || url.match(/[?&]id=([^&]+)/) || url.match(/[-\w]{25,}/);
    return parts ? `https://drive.google.com/thumbnail?id=${parts[1]||parts[0]}&sz=w800` : url; 
}

// ====== 3. ระบบตรวจสอบ & ปิดงาน (แบบแยก Device และ Report อิสระ + แก้บั๊กคำนวณ) ======
function openCloseJobModal() {
    try {
        const modal = document.getElementById('modal-close-jobs');
        const content = document.getElementById('modal-close-jobs-content');
        const container = document.getElementById('close-job-list-container');
        
        if (container) {
            container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-[#003DA5]"></i><p class="text-sm font-bold mt-3 text-gray-500">Preparing data...</p></div>';
        }
        
        if (modal) {
            modal.classList.remove('hidden'); 
            modal.classList.add('flex');
        }
        
        if (content) {
            setTimeout(() => { 
                content.classList.remove('scale-95', 'opacity-0'); 
                content.classList.add('scale-100', 'opacity-100'); 
            }, 10);
        }

        const yEl = document.getElementById('filter-year');
        const mEl = document.getElementById('filter-month');
        const wEl = document.getElementById('filter-week');
        const y = yEl ? yEl.value : '';
        const m = mEl ? mEl.value : '';
        const w = wEl ? wEl.value : '';
        
        wkPendingCloseJobs = wkRawDashboardData.filter(r => {
            if (r.status === 'Finish') return false; 

            const wkStr = r.week || r.weekInfo || '';
            if (!wkStr) return true;
            try {
                const datePart = wkStr.split(' ')[0];
                const parts = datePart.split('/');
                if (parts.length >= 3) {
                    const yy = parts[2];
                    const mm = parts[1];
                    if (y && yy !== y) return false;
                    if (m && parseInt(mm) !== parseInt(m)) return false;
                    if (w && !wkStr.includes(w)) return false;
                }
            } catch (e) {
                console.error("Date format warning", e);
            }
            return true; 
        });

        wkActiveCloseFilter = 'ALL';
        
        setTimeout(renderCloseJobModal, 300);
    } catch (error) {
        console.error("Modal Error:", error);
    }
}

function renderCloseJobModal() {
    try {
        const container = document.getElementById('close-job-list-container');
        if (!container) return;
        
        let filtered = wkPendingCloseJobs || [];
        if (wkActiveCloseFilter !== 'ALL') {
            filtered = filtered.filter(j => j.team === wkActiveCloseFilter);
        }

        let filterTabs = `
            <div class="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-xl sticky top-0 z-10 shadow-sm border border-gray-200">
                ${['ALL', 'MED', 'LAB', 'EHS'].map(t => `<button type="button" onclick="wkActiveCloseFilter='${t}'; renderCloseJobModal();" class="flex-1 py-2 text-xs font-bold rounded-lg transition-all ${wkActiveCloseFilter === t ? 'bg-white shadow-sm text-[#003DA5]' : 'text-gray-500 hover:bg-gray-200'}">${t}</button>`).join('')}
            </div>
        `;

        if (filtered.length === 0) {
            container.innerHTML = filterTabs + `<div class="text-center py-10 text-gray-400"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto"><i class="fas fa-box-open text-3xl text-gray-300"></i></div><p class="font-bold text-sm">No pending jobs available for ${wkActiveCloseFilter}</p></div>`;
            return;
        }

        container.innerHTML = filterTabs + '<div class="space-y-4">' + filtered.map(j => {
            let devAct = parseInt(j.deviceAct) || 0;
            let devTot = parseInt(j.deviceTotal) || 0;
            let rptPct = parseInt(j.reportProgress) || 0;
            if (typeof j.reportProgress === 'string' && j.reportProgress.includes('%')) {
                rptPct = parseInt(j.reportProgress.replace('%', '')) || 0;
            }
            if (isNaN(rptPct)) rptPct = 0;

            try {
                const cacheKey = j.rowId + '_' + j.job;
                let qc_dev = JSON.parse(localStorage.getItem('qc_dev_fix') || '{}');
                let qc_rep = JSON.parse(localStorage.getItem('qc_rep_fix') || '{}');
                if (qc_dev[cacheKey]) { devTot = parseInt(qc_dev[cacheKey]) || devTot || 1; devAct = devTot; }
                if (qc_rep[cacheKey]) { rptPct = 100; }
            } catch(e) {}

            if (devTot === 0) devTot = 1; 
            if (j.status === 'Finish') { devAct = devTot; rptPct = 100; }

            const isDevDone = (devAct >= devTot && devTot > 0) || j.status === 'Finish';
            const isRepDone = (rptPct >= 100) || j.status === 'Finish';

            let devPct = Math.round((devAct / devTot) * 100);
            let devOriginalHtml = `<span class="text-[9px] text-gray-400">${devAct}/${devTot} (${devPct}%) <i class="fas fa-arrow-right mx-1 text-gray-300"></i> ${devTot}/${devTot} (100%)</span>`;
            let devCompletedHtml = `<span class="text-[9px] text-blue-600 font-bold"><i class="fas fa-check-circle mr-1"></i>Will update to ${devTot}/${devTot} (100%)</span>`;

            let rptOriginalHtml = `<span class="text-[9px] text-gray-400">${rptPct}% <i class="fas fa-arrow-right mx-1 text-gray-300"></i> 100%</span>`;
            let rptCompletedHtml = `<span class="text-[9px] text-[#003DA5] font-bold"><i class="fas fa-check-circle mr-1"></i>Will update to 100%</span>`;

            const teamClass = j.team ? j.team.toLowerCase() : 'gray-500';
            const teamDisplay = j.team || 'None';
            const jobTitle = j.job || 'No Title';
            const reporterDisplay = j.reporter || 'Unknown';

            return `
            <div class="flex flex-col p-4 bg-white rounded-2xl border border-gray-200 hover:border-[#003DA5] shadow-sm job-close-row transition-all" data-rowid="${j.rowId}">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-bold text-gray-800 leading-tight pr-2">${jobTitle}</span>
                    <div class="flex gap-1 items-center">
                        <span class="text-[10px] bg-${teamClass} text-white px-2 py-0.5 rounded-md font-bold shrink-0 shadow-sm whitespace-nowrap">${teamDisplay}</span>
                    </div>
                </div>
                
                <div class="mt-3 grid grid-cols-2 gap-3">
                    <label class="flex items-center gap-2 p-2.5 rounded-xl border ${isDevDone ? 'bg-[#003DA5] border-[#003DA5] cursor-not-allowed' : 'bg-white border-gray-200 hover:border-blue-400 cursor-pointer'} transition-all">
                        <input type="checkbox" class="chk-dev w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${isDevDone ? 'checked disabled' : ''} onchange="toggleCloseCheckbox(this, 'dev')">
                        <div class="flex flex-col flex-1 data-container" data-original-html='${devOriginalHtml}' data-completed-html='${devCompletedHtml}'>
                            <span class="text-[11px] font-black title-span ${isDevDone ? 'text-[#003DA5]' : 'text-gray-700'}">Device 100%</span>
                            <div class="status-content mt-0.5">
                                ${isDevDone ? `<span class="text-[9px] text-[#003DA5] font-bold"><i class="fas fa-check mr-1"></i>Completed</span>` : devOriginalHtml}
                            </div>
                        </div>
                    </label>
                    
                    <label class="flex items-center gap-2 p-2.5 rounded-xl border ${isRepDone ? 'bg-[#003DA5] border-[#003DA5] cursor-not-allowed' : 'bg-white border-gray-200 hover:border-[#003DA5] cursor-pointer'} transition-all">
                        <input type="checkbox" class="chk-rep w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]" ${isRepDone ? 'checked disabled' : ''} onchange="toggleCloseCheckbox(this, 'rep')">
                        <div class="flex flex-col flex-1 data-container" data-original-html='${rptOriginalHtml}' data-completed-html='${rptCompletedHtml}'>
                            <span class="text-[11px] font-black title-span ${isRepDone ? 'text-[#003DA5]' : 'text-gray-700'}">Report 100%</span>
                            <div class="status-content mt-0.5">
                                ${isRepDone ? `<span class="text-[9px] text-[#003DA5] font-bold"><i class="fas fa-check mr-1"></i>Completed</span>` : rptOriginalHtml}
                            </div>
                        </div>
                    </label>
                </div>
                <div class="mt-3 border-t border-gray-100 pt-2 flex justify-end items-center">
                    <span class="text-[9px] font-bold text-gray-400"><i class="fas fa-user-edit text-blue-400 mr-1"></i>Last Update by: <span class="text-gray-600">${reporterDisplay}</span></span>
                </div>
            </div>`;
        }).join('') + '</div>';
    } catch (error) {
        console.error("Render Error:", error);
    }
}

window.toggleCloseCheckbox = function(cb, type) {
    try {
        const label = cb.closest('label');
        const dataContainer = label.querySelector('.data-container');
        const titleSpan = label.querySelector('.title-span');
        const statusContent = label.querySelector('.status-content');

        if (cb.checked) {
            label.classList.remove('bg-white', 'border-gray-200');
            if (type === 'dev') {
                label.classList.add('bg-blue-50', 'border-blue-400');
                titleSpan.classList.remove('text-gray-700');
                titleSpan.classList.add('text-blue-700');
            } else {
                label.classList.add('bg-[#003DA5]', 'border-[#003DA5]');
                titleSpan.classList.remove('text-gray-700');
                titleSpan.classList.add('text-[#003DA5]');
            }
            if (statusContent && dataContainer && dataContainer.getAttribute('data-completed-html')) {
                statusContent.innerHTML = dataContainer.getAttribute('data-completed-html');
            }
        } else {
            label.classList.add('bg-white', 'border-gray-200');
            label.classList.remove('bg-blue-50', 'border-blue-400', 'bg-[#003DA5]', 'border-[#003DA5]');
            titleSpan.classList.remove('text-blue-700', 'text-[#003DA5]');
            titleSpan.classList.add('text-gray-700');
            if (statusContent && dataContainer && dataContainer.getAttribute('data-original-html')) {
                statusContent.innerHTML = dataContainer.getAttribute('data-original-html');
            }
        }
    } catch (e) { console.error(e); }
};

function closeCloseJobModal() {
    const modal = document.getElementById('modal-close-jobs');
    const content = document.getElementById('modal-close-jobs-content');
    if (content) {
        content.classList.remove('scale-100', 'opacity-100'); 
        content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(() => { 
        if (modal) {
            modal.classList.add('hidden'); 
            modal.classList.remove('flex'); 
        }
    }, 300);
}

function submitQuickCloseJobs() {
    try {
        const updates = [];
        const updatesToCache = [];
        const currentUserStr = typeof currentUser !== 'undefined' ? (currentUser.name_eng || currentUser.name_th) : 'Admin';
        
        document.querySelectorAll('.job-close-row').forEach(rowEl => {
            const rowId = rowEl.dataset.rowid;
            const devCheck = rowEl.querySelector('.chk-dev');
            const repCheck = rowEl.querySelector('.chk-rep');
            
            const isDevCheckedNew = devCheck && devCheck.checked && !devCheck.disabled;
            const isRepCheckedNew = repCheck && repCheck.checked && !repCheck.disabled;
            
            if (isDevCheckedNew || isRepCheckedNew) {
                const job = wkPendingCloseJobs.find(j => j.rowId == rowId);
                
                if (job) {
                    const cacheKey = job.rowId + '_' + job.job;
                    const originalDevTot = parseInt(job.deviceTotal) || 1;
                    
                    if (isDevCheckedNew) updatesToCache.push({ key: cacheKey, type: 'dev', val: originalDevTot });
                    if (isRepCheckedNew) updatesToCache.push({ key: cacheKey, type: 'rep', val: 100 });
                }

                updates.push({ 
                    rowId: rowId, 
                    closeDevice: isDevCheckedNew, 
                    closeReport: isRepCheckedNew,
                    deviceAct: isDevCheckedNew ? (job ? job.deviceTotal : undefined) : undefined,
                    deviceTotal: job ? job.deviceTotal : undefined,
                    updater: currentUserStr
                });
            }
        });

        if (updates.length === 0) {
            Swal.fire('Warning', 'กรุณาเลือกรายการที่ต้องการอัปเดตอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        Swal.fire({
            title: 'Saving...',
            html: 'Updating job status, please wait.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        google.script.run.withSuccessHandler(res => {
            if (res && res.success) { 
                try {
                    let qc_dev = JSON.parse(localStorage.getItem('qc_dev_fix') || '{}');
                    let qc_rep = JSON.parse(localStorage.getItem('qc_rep_fix') || '{}');
                    updatesToCache.forEach(u => {
                        if (u.type === 'dev') qc_dev[u.key] = u.val;
                        if (u.type === 'rep') qc_rep[u.key] = u.val;
                    });
                    localStorage.setItem('qc_dev_fix', JSON.stringify(qc_dev));
                    localStorage.setItem('qc_rep_fix', JSON.stringify(qc_rep));
                } catch(e) {}

                closeCloseJobModal(); 
                loadWeeklyDashboard(); 
                Swal.fire({ icon: 'success', title: 'Finish update report', timer: 1500, showConfirmButton: false }); 
            } else {
                Swal.fire('Error', res ? res.message : 'Unknown error occurred.', 'error');
            }
        }).withFailureHandler(err => { 
            Swal.fire('Error', err.message || 'Connection failed', 'error'); 
        }).quickCloseJobsFromDashboard(updates);
    } catch (error) {
        console.error("submitQuickCloseJobs Error:", error);
        Swal.fire('Error', 'Script error: ' + error.message, 'error');
    }
}

function resetToNewWeeklyForm() {
    try { typeof cancelEdit === 'function' && cancelEdit(); } catch(e) {}
    
    clearWeeklyForm();
    if (document.getElementById('wk-edit-id')) document.getElementById('wk-edit-id').value = '';

    typeof switchWeeklyTeam === 'function' && switchWeeklyTeam('MED');
    
    let rOnsite = document.querySelector('input[name="jobType"][value="Onsite"]');
    if (rOnsite) { rOnsite.checked = true; typeof toggleJobType === 'function' && toggleJobType(); }
    
    let rStatus = document.querySelector('input[name="wkStatus"][value="On Process"]');
    if (rStatus) rStatus.checked = true;

    ['btn-wk-cancel', 'btn-wk-update'].forEach(id => document.getElementById(id)?.classList.add('hidden'));

    let btnDraft = document.getElementById('btn-wk-add-draft');
    if (btnDraft) {
        btnDraft.className = 'flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[#003DA5] bg-[#003DA5] hover:bg-[#003DA5] transition-all shadow-sm border border-[#003DA5] flex items-center justify-center gap-2';
        btnDraft.innerHTML = '<i class="fas fa-plus"></i> Add to Queue';
        btnDraft.setAttribute('onclick', 'addReportToQueue()');
    }

    let btnSubmit = document.getElementById('btn-wk-submit-all');
    if (btnSubmit) {
        btnSubmit.className = 'flex-1 px-8 py-3 rounded-xl font-black text-white bg-gradient-to-r from-[#003DA5] to-[#004aad] hover:from-[#003DA5] hover:to-[#004aad] transition-all shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2';
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane text-lg"></i> Submit All Reports';
        btnSubmit.setAttribute('onclick', 'submitAllReports(event)');
        btnSubmit.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    typeof Swal !== 'undefined' && Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ready for New Report', showConfirmButton: false, timer: 1500 });
}
