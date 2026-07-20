// ============================================================
// 70-checkin.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// State Variables
let currentCheckinData = { dailyJobs: [], recentActivity: [], activityLogs: [], kpi: {}, serviceShare: {} };
let selectedActionJob = null;
let currentActionType = 'IN';
let currentLocationLink = ''; 
let currentLocationName = ''; 
let photoBase64Data = null;

// GPS State
let gpsAttempts = 0;
const MAX_GPS_ATTEMPTS = 3;
const ACCEPTABLE_ACCURACY = 500; // meters

function initCheckin() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    flatpickr("#checkin-datepicker", { dateFormat: "d/m/Y", defaultDate: new Date(), disableMobile: "true", position: "auto center", static: true, onChange: (d, s) => { document.getElementById('display-date-text').innerText = s; loadCheckinData(); } });
    document.getElementById('btn-date-trigger').addEventListener('click', () => { document.querySelector("#checkin-datepicker")._flatpickr.open(); });
    const today = new Date();
    document.getElementById('display-date-text').innerText = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
    if (currentUser && currentUser.role === 'ADMIN') { document.getElementById('ck-admin-filter').classList.remove('hidden'); document.getElementById('btn-checkin-reset').classList.remove('hidden'); }
    loadCheckinData();
}

function changeCheckinDate(days) {
    const fp = document.querySelector("#checkin-datepicker")._flatpickr;
    const currentDate = fp.selectedDates[0] || new Date();
    currentDate.setDate(currentDate.getDate() + days);
    fp.setDate(currentDate, true);
}

function loadCheckinData() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const dateStr = document.getElementById('display-date-text').innerText;
    document.getElementById('job-list-container').innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-12 text-gray-300"><i class="fas fa-circle-notch fa-spin text-3xl mb-3"></i><span class="text-xs font-bold">Syncing Data...</span></div>`;
    const userCtx = { role: currentUser ? currentUser.role : 'USER', team: currentUser ? (currentUser.team || 'General') : 'General' };
    google.script.run.withSuccessHandler(data => {
        currentCheckinData = data;
        renderKPIs(); renderJobList(); renderRecentActivity(); filterActivityTable();
    }).getCheckinDashboardData(dateStr, userCtx);
}

function renderKPIs() {
    const k = currentCheckinData.kpi || {}, t = k.target || {}, a = k.actual || {};
    const update = (key, valId, tgtId, barId, pctId) => {
        const tgt = t[key] || 1, val = a[key] || 0, pct = Math.min(100, Math.round((val/tgt)*100));
        document.getElementById(valId).innerText = val; document.getElementById(tgtId).innerText = tgt;
        document.getElementById(barId).setAttribute('style', `width: ${pct}%`);
        document.getElementById(pctId).innerText = pct + '%'; 
    };
    update('ALL', 'kpi-total-val', 'kpi-total-target', 'prog-total', 'pct-total');
    update('MED', 'kpi-med-val', 'kpi-med-target', 'prog-med', 'pct-med');
    update('LAB', 'kpi-lab-val', 'kpi-lab-target', 'prog-lab', 'pct-lab');
    update('EHS', 'kpi-ehs-val', 'kpi-ehs-target', 'prog-ehs', 'pct-ehs');
}

function renderJobList() {
    const container = document.getElementById('job-list-container'), teamFilter = document.getElementById('ck-team-select').value, statusFilter = document.getElementById('ck-status-filter').value;
    let jobs = currentCheckinData.dailyJobs || [];
    
    // ✅ แก้ไขเงื่อนไขให้รวมคำว่า 'MGT' เข้าไปด้วย
    jobs = jobs.filter(j => !['MANAGEMENT', 'MNG', 'MGT'].includes((j.team || '').toString().trim().toUpperCase()));
    
    if (currentUser && currentUser.role === 'ADMIN' && teamFilter !== 'All') jobs = jobs.filter(j => j.team === teamFilter);
    if (statusFilter !== 'All') jobs = jobs.filter(j => j.status === statusFilter);
    if (jobs.length === 0) { container.innerHTML = `<div class="col-span-full text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><i class="far fa-calendar-times text-gray-300 text-3xl mb-2"></i><p class="text-gray-400 font-bold text-xs">No Jobs Found</p></div>`; return; }
    
    container.innerHTML = jobs.map(job => {
        const teamColor = job.team === 'MED' ? 'bg-[#003DA5]' : (job.team === 'LAB' ? 'bg-[#004aad]' : 'bg-[#5B7F95]');
        const count = job.totalPeople || 0;
        
        let statusText = job.status || 'Wait';
        let statusBadge = '';
        if (statusText === 'Finished') {
            statusBadge = `<span class="bg-emerald-100 text-[#003DA5] px-2 py-0.5 rounded-md text-[9px] font-bold border border-[#003DA5] uppercase"><i class="fas fa-check-circle"></i> Finished</span>`;
        } else if (statusText === 'On-going') {
            statusBadge = `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[9px] font-bold border border-blue-200 uppercase"><i class="fas fa-spinner fa-spin"></i> On-going</span>`;
        } else {
            statusBadge = `<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[9px] font-bold border border-gray-200 uppercase"><i class="fas fa-clock"></i> Wait</span>`;
        }

        let hasIN = (statusText === 'On-going' || statusText === 'Finished');
        let outBtn = '';
        if (hasIN) {
            outBtn = `<button onclick="openActionModal('${job.uniqueKey}', 'OUT')" class="py-2 bg-[#003DA5] hover:bg-[#003DA5] text-white rounded-lg text-[9px] font-bold shadow transition-transform active:scale-95 flex items-center justify-center gap-1"><i class="fas fa-sign-out-alt"></i> OUT</button>`;
        } else {
            outBtn = `<button onclick="Swal.fire('Notice', 'กรุณากด Check-in ก่อนทำการ Check-out นะครับ', 'warning')" class="py-2 bg-gray-200 hover:bg-gray-300 text-gray-400 cursor-not-allowed rounded-lg text-[9px] font-bold shadow flex items-center justify-center gap-1"><i class="fas fa-sign-out-alt"></i> OUT</button>`;
        }

        return `<div class="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col h-full">
            <div class="flex justify-between items-start mb-2"><span class="${teamColor} text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">${job.team}</span>${statusBadge}</div>
            <h4 class="font-bold text-gray-800 text-xs leading-tight mb-1 line-clamp-2 min-h-[32px]" title="${job.title}">${job.title}</h4>
            <p class="text-[9px] text-gray-400 flex items-center gap-1 mb-2 truncate"><i class="fas fa-map-marker-alt text-[#003DA5]"></i> ${job.location || 'Unknown'}</p>
            <div class="flex-1"></div>
            <div class="flex items-center justify-between bg-gray-50 p-1.5 rounded-xl border border-gray-100 mb-2">
                <div class="flex items-center gap-1"><div class="w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 shadow-sm">${count}</div><span class="text-[8px] text-gray-500 font-bold">Staff</span></div>
                <button onclick='showDetailModal(${JSON.stringify(job.people).replace(/'/g, "\\'")})' class="text-[9px] text-indigo-500 font-bold hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors">View</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-50">
                <button onclick="openActionModal('${job.uniqueKey}', 'IN')" class="py-2 bg-emerald-500 hover:bg-[#003DA5] text-white rounded-lg text-[9px] font-bold shadow transition-transform active:scale-95 flex items-center justify-center gap-1"><i class="fas fa-sign-in-alt"></i> IN</button>
                ${outBtn}
            </div>
        </div>`;
    }).join('');
}

function showDetailModal(people) {
    const list = document.getElementById('detail-list');
    if (!people || people.length === 0) { list.innerHTML = `<div class="flex flex-col items-center py-8 text-gray-300"><i class="fas fa-user-slash text-3xl mb-2"></i><span class="text-xs">No activity yet.</span></div>`;
    } else {
        list.innerHTML = people.map(p => {
            const isWorking = p.status === 'On-going'; 
            const icon = isWorking ? 'fa-clock text-blue-500' : 'fa-check-circle text-[#003DA5]'; 
            const statusText = isWorking ? 'On-Site' : 'Finished';
            return `<div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl mb-2 shadow-sm"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-indigo-50 border border-[#003DA5]/20 flex items-center justify-center font-bold text-xs text-indigo-600">${p.name.charAt(0)}</div><div><p class="text-xs font-bold text-gray-800">${p.name}</p><p class="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1"><i class="fas ${icon}"></i> 
            ${statusText}</p></div></div><div class="text-right flex flex-col gap-1"><span class="text-[9px] font-bold text-[#003DA5] bg-emerald-100 px-2 py-0.5 rounded-md border border-[#003DA5]">IN: ${p.inTime}</span><span class="text-[9px] font-bold text-[#003DA5] bg-rose-100 px-2 py-0.5 rounded-md border border-[#003DA5]">OUT: ${p.outTime}</span></div></div>`;
        }).join('');
    }
    document.getElementById('detailModal').classList.remove('hidden');
}

function renderRecentActivity() {
    const list = document.getElementById('recent-activity-list');
    const recent = currentCheckinData.recentActivity || [];
    if (recent.length === 0) { list.innerHTML = `<p class="text-center text-gray-300 text-xs italic py-4">No recent activity.</p>`; return; }
    list.innerHTML = recent.map(r => {
        const isIN = r.type === 'IN'; const colorClass = isIN ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'; const timeParts = r.timestamp.split(' ')[1] || '-';
        return `<div onclick='openLogDetail(${JSON.stringify(r).replace(/'/g, "\\'")})' class="flex gap-3 items-start p-2 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer group"><div class="w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0 font-bold text-[9px] shadow-sm group-hover:scale-110 transition-transform">${r.type}</div><div class="min-w-0 flex-1"><div class="flex justify-between"><p class="text-xs font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors">${r.user}</p><span class="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded">${timeParts}</span></div><p class="text-[10px] text-gray-400 truncate">${r.title}</p></div></div>`;
    }).join('');
}

function filterActivityTable() {
    const search = document.getElementById('act-search').value.toLowerCase();
    const team = document.getElementById('act-filter-team').value;
    const container = document.getElementById('team-activity-tbody');
    let logs = currentCheckinData.activityLogs || [];
    logs = logs.filter(l => {
        const matchSearch = l.user.toLowerCase().includes(search) || l.job.toLowerCase().includes(search);
        const matchTeam = team === 'All' || l.team === team;
        return matchSearch && matchTeam;
    });
    if (logs.length === 0) { container.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400 italic">No records found.</td></tr>`; return; }
    container.innerHTML = logs.map(row => {
        const isIN = row.type === 'IN'; const badge = isIN ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'; const time = row.ts.split(' ')[1];
        const hasPhoto = row.photo && row.photo.includes('http');
        const photoHtml = hasPhoto ? `<a href="${row.photo}" target="_blank" class="text-indigo-500 hover:text-indigo-700" onclick="event.stopPropagation()"><i class="fas fa-image"></i></a>` : `<span class="text-gray-300">-</span>`;
        
        const isMapLink = row.gps && (row.gps.includes('google.com/maps') || row.gps.includes('maps.google'));
        const gpsHtml = isMapLink
            ? `<a href="${row.gps}" target="_blank" class="text-blue-500 hover:text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-[9px] flex items-center justify-center w-16 mx-auto" onclick="event.stopPropagation()"><i class="fas fa-map-marked-alt mr-1"></i> Map</a>` 
            : `<span class="text-gray-300 text-[9px] block text-center">-</span>`;
            
        return `<tr onclick='openLogDetail(${JSON.stringify(row).replace(/'/g, "\\'")})' class="hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100 cursor-pointer"><td class="p-4 font-bold text-gray-600 text-xs">${time} <span class="ml-1 text-[9px] text-gray-400">${row.date}</span></td><td class="p-4 font-bold text-xs"><span class="${row.team === 'MED' ? 'text-blue-600' : row.team === 'LAB' ? 'text-cyan-600' : 'text-[#003DA5]'}">${row.team}</span></td><td class="p-4 font-bold text-gray-800 text-xs">${row.user}</td><td class="p-4"><span class="px-2 py-1 rounded text-[9px] font-bold ${badge}">${row.type}</span></td><td class="p-4 text-gray-500 text-xs truncate max-w-[150px]" title="${row.job}">${row.job}</td><td class="p-4 text-center">${photoHtml}</td><td class="p-4">${gpsHtml}</td></tr>`;
    }).join('');
}

// --- ACTION & GPS ---

function openActionModal(key, type) {
    if(!currentUser) return Swal.fire('Error', 'Login required', 'error');
    selectedActionJob = currentCheckinData.dailyJobs.find(j => j.uniqueKey === key);
    currentActionType = type;
    document.getElementById('actionModal').classList.remove('hidden');
    document.getElementById('modal-job').innerText = selectedActionJob.title;
    const btn = document.getElementById('btn-confirm-action');
    clearPhoto();
    
    currentLocationLink = ''; currentLocationName = '';
    document.getElementById('gps-text').innerText = 'Waiting for GPS...';
    document.getElementById('gps-indicator').innerHTML = '<i class="fas fa-satellite-dish text-xs"></i>';
    document.getElementById('gps-indicator').className = 'w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shrink-0';
    
    document.getElementById('manual-loc-container').classList.add('hidden');
    document.getElementById('manual-loc-input').value = '';
    document.getElementById('btn-manual-toggle').classList.add('hidden');

    if(type === 'IN') { 
        document.getElementById('modal-header-bg').className = 'bg-gradient-to-r from-[#003DA5] to-[#004aad] p-6 text-center relative'; document.getElementById('modal-title').innerText = 'Check In';
        btn.className = 'w-full py-3.5 rounded-2xl font-bold text-white shadow-xl bg-emerald-500 hover:bg-[#003DA5] transition-all text-sm'; btn.innerText = 'Confirm IN';
    } else { 
        document.getElementById('modal-header-bg').className = 'bg-gradient-to-r from-[#003DA5] to-[#004aad] p-6 text-center relative'; document.getElementById('modal-title').innerText = 'Check Out';
        btn.className = 'w-full py-3.5 rounded-2xl font-bold text-white shadow-xl bg-[#003DA5] hover:bg-[#002d7a] transition-all text-sm'; btn.innerText = 'Confirm OUT';
    }
    
    gpsAttempts = 0;
    btn.disabled = true;
    attemptGetPosition(document.getElementById('gps-text'), document.getElementById('gps-indicator'), btn);
}

function attemptGetPosition(txt, ind, btn) {
    gpsAttempts++;
    txt.innerHTML = `<i class="fas fa-satellite-dish fa-spin text-[#003DA5]"></i> Locating... (Try ${gpsAttempts}/${MAX_GPS_ATTEMPTS})`;
    
    if (!navigator.geolocation) { txt.innerText = "GPS Not Supported"; return; }

    navigator.geolocation.getCurrentPosition(
        (p) => {
            const acc = p.coords.accuracy;
            if (acc > ACCEPTABLE_ACCURACY && gpsAttempts < MAX_GPS_ATTEMPTS) {
                setTimeout(() => attemptGetPosition(txt, ind, btn), 1500);
                return;
            }
            processValidPosition(p, txt, ind, btn);
        },
        (err) => {
            console.error("GPS Error:", err);
            if (err.code === 1) { 
                Swal.fire('Location Required', 'กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location) เพื่อทำการ Check-in/out', 'warning');
                txt.innerText = "Permission Denied (โปรดเปิดสิทธิ์ Location)";
                ind.innerHTML = '<i class="fas fa-ban text-[#003DA5]"></i>';
                btn.disabled = false;
                document.getElementById('manual-loc-container').classList.remove('hidden');
            } else if (err.code === 3 && gpsAttempts < MAX_GPS_ATTEMPTS) { 
                 setTimeout(() => attemptGetPosition(txt, ind, btn), 1500);
            } else {
                txt.innerText = "GPS Error / Timeout";
                ind.innerHTML = '<i class="fas fa-exclamation-triangle text-[#003DA5]"></i>';
                btn.disabled = false;
                document.getElementById('manual-loc-container').classList.remove('hidden');
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 } 
    );
}

function processValidPosition(p, txt, ind, btn) {
    const lat = p.coords.latitude;
    const lng = p.coords.longitude;
    const acc = Math.round(p.coords.accuracy);
    
    currentLocationLink = `https://www.google.com/maps?q=${lat},${lng}`;
    
    txt.innerHTML = `<i class="fas fa-circle-notch fa-spin text-[#003DA5]"></i> Found (+/-${acc}m). Getting Address...`;
    
    google.script.run.withSuccessHandler(res => {
        if(res.success) {
            currentLocationName = res.address;
            const accText = acc <= 100 ? `<span class="text-[#003DA5]">High (${acc}m)</span>` : `<span class="text-[#003DA5]">Avg (${acc}m)</span>`;
            
            txt.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="truncate">${res.address}</span>
                    <a href="${currentLocationLink}" target="_blank" class="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-md"><i class="fas fa-external-link-alt text-[10px]"></i></a>
                </div>
                <span class="text-[9px] font-normal text-gray-400">Accuracy: ${accText}</span>
            `;
            
            ind.innerHTML = '<i class="fas fa-map-marker-alt text-[#003DA5]"></i>';
            ind.className = 'w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-[#003DA5]';
            btn.disabled = false;
        } else {
            currentLocationName = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            txt.innerHTML = `${lat.toFixed(5)}, ${lng.toFixed(5)} <a href="${currentLocationLink}" target="_blank" class="ml-1 text-blue-500"><i class="fas fa-external-link-alt"></i></a>`;
            ind.innerHTML = '<i class="fas fa-check text-blue-500"></i>';
            btn.disabled = false;
        }

        if(gpsAttempts >= MAX_GPS_ATTEMPTS && acc > ACCEPTABLE_ACCURACY) {
            document.getElementById('manual-loc-container').classList.remove('hidden');
            document.getElementById('manual-loc-input').value = currentLocationName; 
        } else {
            document.getElementById('btn-manual-toggle').classList.remove('hidden');
        }

    }).convertLatLngToAddress(lat, lng);
}

function toggleManualInput() {
    const el = document.getElementById('manual-loc-container');
    const btn = document.getElementById('btn-manual-toggle');
    if(el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        document.getElementById('manual-loc-input').value = currentLocationName; 
        btn.innerText = "Cancel Edit";
    } else {
        el.classList.add('hidden');
        btn.innerText = "Edit Location";
        document.getElementById('manual-loc-input').value = '';
    }
}

function submitAction() {
    const btn = document.getElementById('btn-confirm-action'), oldTxt = btn.innerText;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing';
    btn.disabled = true;

    Swal.fire({
        title: 'Saving data...',
        text: 'Please wait a moment',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });
    
    const manualInput = document.getElementById('manual-loc-input').value;
    
    const req = { 
        jobKey: selectedActionJob.uniqueKey, jobTitle: selectedActionJob.title, type: currentActionType, 
        userId: currentUser.id, userName: currentUser.name_eng || currentUser.name_th, userTeam: currentUser.team, 
        gps: currentLocationLink, 
        locationName: currentLocationName,
        manualLocation: manualInput, 
        photoBase64: photoBase64Data, 
        location: selectedActionJob.location, dateRef: document.getElementById('display-date-text').innerText 
    };

    google.script.run.withSuccessHandler(res => {
        document.getElementById('actionModal').classList.add('hidden');
        if(res.success) {
            Swal.close();
            const sum = res.summary;
            if(sum) {
                const isIN = currentActionType === 'IN';
                const header = document.getElementById('sum-banner');
                const icon = document.getElementById('sum-icon');
                if(isIN) {
                    header.className = 'h-20 w-full bg-gradient-to-r from-[#003DA5] to-[#004aad] flex items-center justify-center';
                    icon.className = 'fas fa-check text-2xl text-white';
                    document.getElementById('sum-title').innerText = 'Check-In Complete';
                    document.getElementById('sum-action-label').innerText = 'Time IN';
                    document.getElementById('sum-action-label').className = 'text-[10px] font-bold text-emerald-600 uppercase';
                    document.getElementById('sum-csi-container').classList.add('hidden');
                } else {
                    header.className = 'h-20 w-full bg-gradient-to-r from-[#003DA5] to-[#004aad] flex items-center justify-center';
                    icon.className = 'fas fa-sign-out-alt text-2xl text-white';
                    document.getElementById('sum-title').innerText = 'Check-Out Complete';
                    document.getElementById('sum-action-label').innerText = 'Time OUT';
                    document.getElementById('sum-action-label').className = 'text-[10px] font-bold text-rose-600 uppercase';
                    document.getElementById('sum-csi-container').classList.remove('hidden');
                }

                document.getElementById('sum-job').innerText = sum.job || '-';
                document.getElementById('sum-date').innerText = sum.date || '-';
                document.getElementById('sum-team').innerText = sum.team || '-';
                document.getElementById('sum-loc').innerText = sum.location || '-';
                document.getElementById('sum-time').innerText = sum.time || '-';
                
                const pBadge = document.getElementById('sum-photo-badge');
                if(sum.photo === 'Uploaded') {
                    pBadge.className = 'text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded';
                    pBadge.innerHTML = '<i class="fas fa-check-circle"></i> Photo Saved';
                } else {
                    pBadge.className = 'text-[10px] font-bold text-gray-400 flex items-center gap-1';
                    pBadge.innerHTML = '<i class="fas fa-times-circle"></i> No Photo';
                }

                const outSection = document.getElementById('sum-out-details');
                if(!isIN) {
                    outSection.classList.remove('hidden');
                    document.getElementById('sum-in-time').innerText = sum.inTime || '-';
                    document.getElementById('sum-duration').innerText = sum.duration || '-';
                    document.getElementById('sum-ot').innerText = sum.ot || '-';
                } else {
                    outSection.classList.add('hidden');
                }

                document.getElementById('summaryModal').classList.remove('hidden');
            }
            loadCheckinData();
        } else { Swal.fire('Error', res.message, 'error'); btn.innerHTML = oldTxt; btn.disabled = false; }
    }).withFailureHandler(err => {
        Swal.fire('Error', err.message, 'error');
        btn.innerHTML = oldTxt; 
        btn.disabled = false;
    }).saveCheckinTransaction(req);
}

function closeActionModal() { 
    document.getElementById('actionModal').classList.add('hidden'); 
    selectedActionJob = null;
    currentActionType = 'IN';
    currentLocationLink = '';
    currentLocationName = '';
    clearPhoto();
}

function previewPhoto(e) { 
    const file = e.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = (ev) => { 
        const img = new Image(); 
        img.onload = () => { 
            const c = document.createElement('canvas'), ctx = c.getContext('2d'), max = 800; 
            let w = img.width, h = img.height; 
            if(w>max){h*=max/w;w=max;} 
            c.width=w;c.height=h; 
            ctx.drawImage(img,0,0,w,h); 
            photoBase64Data = c.toDataURL('image/jpeg',0.6); 
            document.getElementById('photo-preview').src = photoBase64Data; 
            document.getElementById('photo-preview-box').classList.remove('hidden'); 
            
            c.width = 0;
            c.height = 0;
            ctx.clearRect(0, 0, 0, 0);
        }; 
        img.src = ev.target.result; 
    }; 
    reader.readAsDataURL(file); 
}

function clearPhoto() { 
    document.getElementById('action-photo').value=''; 
    document.getElementById('photo-preview-box').classList.add('hidden'); 
    photoBase64Data=null; 
}

function resetCheckinDB() { Swal.fire({ title: 'Confirm Reset?', text: "Clear 'Checkinout' sheet?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#E4002B', confirmButtonText: 'Yes, Reset' }).then((result) => { if (result.isConfirmed) { google.script.run.withSuccessHandler(() => { Swal.fire('Reset Complete', '', 'success'); loadCheckinData(); }).clearCheckinData(); } }); }

function openLogDetail(data) {
    document.getElementById('ld-user').innerText = data.user || data.name; document.getElementById('ld-team').innerText = data.team; document.getElementById('ld-job').innerText = data.job || data.title; document.getElementById('ld-time').innerText = data.ts || data.timestamp;
    const gpsEl = document.getElementById('ld-gps');
    if(data.location && data.location.length > 2) { gpsEl.innerText = data.location; } else { gpsEl.innerText = "No Address"; }
    const mapBtn = document.getElementById('ld-map-btn');
    if(data.gps && (data.gps.includes('google.com/maps') || data.gps.includes('maps.google'))) { mapBtn.href = data.gps; mapBtn.classList.remove('hidden'); } else { mapBtn.classList.add('hidden'); }
    const isIN = data.type === 'IN';
    const iconDiv = document.getElementById('ld-icon');
    iconDiv.className = `w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md ${isIN ? 'bg-emerald-500' : 'bg-[#003DA5]'}`;
    iconDiv.innerHTML = `<i class=\"fas ${isIN ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}\"></i>`;
    const photoBox = document.getElementById('ld-photo-container'); const photoLink = document.getElementById('ld-photo-link');
    if(data.photo && data.photo.includes('http')) { photoBox.classList.remove('hidden'); photoLink.href = data.photo; } else { photoBox.classList.add('hidden'); }
    document.getElementById('logDetailModal').classList.remove('hidden');
}
