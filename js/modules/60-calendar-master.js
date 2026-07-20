// ============================================================
// 60-calendar-master.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ==========================================
    // ส่วนที่ 1: ฟังก์ชันเดิม (Global & Calendar UI)
    // ==========================================
    let currentDisplayDate = new Date();
    let currentService = 'ALL';
    
    const CAL_MAP = {
        'ALL': "https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FBangkok&showTitle=0&showNav=0&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1" +
               "&src=bmecalibration%40gmail.com&color=%23004aad" + 
               "&src=nhealthcallab%40gmail.com&color=%2319a7ce" + 
               "&src=natkanok.8942%40gmail.com&color=%230fc1a1" +
               "&src=chiraphat.env%40gmail.com&color=%230fc1a1", 
        'MED': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=bmecalibration%40gmail.com&ctz=Asia%2FBangkok&color=%23004aad",
        'LAB': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=nhealthcallab%40gmail.com&ctz=Asia%2FBangkok&color=%2319a7ce",
        'EHS': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&ctz=Asia%2FBangkok" +
               "&src=natkanok.8942%40gmail.com&color=%230fc1a1" +
               "&src=chiraphat.env%40gmail.com&color=%230fc1a1",
        'MGT': "https://calendar.google.com/calendar/embed?src=cesmanagement2026%40gmail.com&ctz=Asia%2FBangkok"
    };

    function initCalendar(calData) {
        if (calData) window.globalCalData = calData;
        initCalendarFilters();
        updateCalendarUI();
    }

    function initCalendarFilters() {
        const monthSelect = document.getElementById('cal-filter-month');
        const yearSelect = document.getElementById('cal-filter-year');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if(monthSelect) {
            monthSelect.innerHTML = "";
            monthNames.forEach((m, index) => {
                let option = document.createElement("option");
                option.value = index; option.text = m;
                monthSelect.appendChild(option);
            });
        }
        if(yearSelect) {
            yearSelect.innerHTML = "";
            const currentYear = new Date().getFullYear();
            for(let y = currentYear - 2; y <= currentYear + 5; y++) {
                let option = document.createElement("option");
                option.value = y; option.text = y;
                yearSelect.appendChild(option);
            }
        }
    }

    function jumpToDateFromFilter() {
        const m = parseInt(document.getElementById('cal-filter-month').value);
        const y = parseInt(document.getElementById('cal-filter-year').value);
        currentDisplayDate.setMonth(m);
        currentDisplayDate.setFullYear(y);
        updateCalendarUI();
    }

    function changeCalendarMonth(offset) {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
        updateCalendarUI();
    }

    function updateCalendarUI() {
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth() + 1; 
        const monthIndex = currentDisplayDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const titleEl = document.getElementById('calendar-dynamic-title');
        // เปลี่ยนสีตัวอักษรของเดือนให้เป็นโทนส้ม
        if(titleEl) titleEl.innerHTML = `<span class="text-[#003DA5]">${monthNames[monthIndex]}</span> <span class="text-gray-400 font-light">|</span> ${year}`;

        const mSel = document.getElementById('cal-filter-month');
        const ySel = document.getElementById('cal-filter-year');
        if(mSel) mSel.value = monthIndex;
        if(ySel) ySel.value = year;

        const iframe = document.getElementById('calendar-iframe');
        if (iframe) {
            const dateParam = `&dates=${year}${month.toString().padStart(2, '0')}01/${year}${month.toString().padStart(2, '0')}01`;
            iframe.src = CAL_MAP[currentService] + dateParam;
        }

        if (window.globalCalData) {
            processCalendarData(window.globalCalData, month, year);
        }
    }

    function changeService(service) {
        currentService = service;
        ['all', 'med', 'lab', 'ehs','mgt'].forEach(id => {
            const btn = document.getElementById('btn-cal-' + id);
            if (btn) {
                if (id === service.toLowerCase()) {
                    // ปรับสีให้เป็นส้มเมื่อคลิก (Active State)
                    btn.className = "px-3 py-1 text-xs font-bold rounded bg-[#003DA5]/10 text-[#003DA5] shadow-sm ring-1 ring-[#003DA5] transition-all";
                } else {
                    // ปรับสีปุ่มปกติ (Hover เป็นสีส้มเข้ม)
                    btn.className = "px-3 py-1 text-xs font-bold rounded hover:bg-[#003DA5] hover:text-white transition-all text-gray-500";
                }
            }
        });
        updateCalendarUI();
    }

    // ==========================================
    // ส่วนที่ 2: ฟังก์ชันเดิม (จัดการ Job, Leave, KPI และ Capacity)
    // ==========================================
    function checkIsLeaveEvent(title) {
        if (!title) return false;
        const titleLower = title.toLowerCase();
        const engLeaveRegex = /\b(leave|day off|dayoff|off|vacation|sick|personal|annual)\b/;
        const exactThaiLeaves = ['ลากิจ', 'ลาป่วย', 'ลาพักร้อน', 'ลาพักผ่อน', 'ลาคลอด', 'ลาบวช', 'ลาชดเชย', 'วันหยุด', 'เทศกาล'];

        if (engLeaveRegex.test(titleLower)) return true;
        for (let w of exactThaiLeaves) {
            if (titleLower.includes(w)) return true;
        }

        const checkShortWords = ['ลา', 'หยุด', 'ป่วย'];
        for (let w of checkShortWords) {
            if (titleLower.includes(w)) {
                if (w === 'ลา' && (
                    titleLower.includes('เวลา') || titleLower.includes('ตลาด') || 
                    titleLower.includes('กีฬา') || titleLower.includes('ตุลา') ||
                    titleLower.includes('สงขลา') || titleLower.includes('ลานสกา') ||
                    titleLower.includes('ศาลา') || titleLower.includes('ลาด') ||
                    titleLower.includes('พลาสติก') || titleLower.includes('คลาส') ||
                    titleLower.includes('พารามิเตอร์') || titleLower.includes('พาลามิเตอร์')
                )) continue;
                if (w === 'ป่วย' && titleLower.includes('ผู้ป่วย')) continue;

                return true; 
            }
        }
        return false;
    }

    function processCalendarData(data, targetM, targetY) {
        let teamJobUniqueSet = { MED: new Set(), LAB: new Set(), EHS: new Set() };
        let teamManDays = { MED: 0, LAB: 0, EHS: 0 };
        
        let jobListForTable = [];
        let leaveListForTable = [];
        
        data.forEach(item => {
            const itemM = parseInt(item.month);
            const itemY = parseInt(item.year);

            if (itemM === targetM && itemY === targetY) {
                const title = (item.title || "").trim();
                const team = item.team; 
                
                const dParts = item.date.split('/'); 
                const dObj = new Date(dParts[2], dParts[1]-1, dParts[0]);
                const dayOfWeek = dObj.getDay(); 
                const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

                const isLeave = checkIsLeaveEvent(title);

                if (isLeave) {
                     if (currentService === 'ALL' || currentService === team) {
                        leaveListForTable.push(item);
                     }
                } else if (title !== "") {
                    let shouldCount = true;
                    if (team === 'MED' && isWeekend) shouldCount = false;

                    if (shouldCount) {
                        if (teamManDays[team] !== undefined) teamManDays[team]++;
                    }
                    
                    if (item.uniqueKey && teamJobUniqueSet[team]) teamJobUniqueSet[team].add(item.uniqueKey);
                    if (currentService === 'ALL' || currentService === team) {
                        jobListForTable.push(item);
                    }
                }
            }
        });
       
        // Update KPI
        const totalUnique = teamJobUniqueSet.MED.size + teamJobUniqueSet.LAB.size + teamJobUniqueSet.EHS.size;
        if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalUnique;
        if(document.getElementById('stat-med')) document.getElementById('stat-med').innerText = teamJobUniqueSet.MED.size;
        if(document.getElementById('stat-lab')) document.getElementById('stat-lab').innerText = teamJobUniqueSet.LAB.size;
        if(document.getElementById('stat-ehs')) document.getElementById('stat-ehs').innerText = teamJobUniqueSet.EHS.size;
        
        const weekdays = getWeekdaysInMonth(targetM, targetY);
        if(document.getElementById('capacity-days-display')) {
            document.getElementById('capacity-days-display').innerText = `${weekdays} Weekdays`;
        }
        
        renderCapacityBars(teamManDays, weekdays);
        renderJobTable(jobListForTable);
        renderLeaveList(leaveListForTable);
    }

    function renderCapacityBars(manDays, weekdays) {
        const container = document.getElementById('capacity-dashboard-grid');
        if(!container) return;
        const gConfig = (typeof globalConfig !== 'undefined') ? globalConfig : {};
        const limitMed = parseInt(gConfig.CAPACITY_MED || gConfig.MED || 12);
        const limitLab = parseInt(gConfig.CAPACITY_LAB || gConfig.LAB || 3);
        const limitEhs = parseInt(gConfig.CAPACITY_EHS || gConfig.EHS || 3);
        const teams = [
            { name: 'MED', val: manDays.MED, limit: limitMed, color: '#004aad', bg: 'bg-[#004aad]' },
            { name: 'LAB', val: manDays.LAB, limit: limitLab, color: '#19a7ce', bg: 'bg-[#19a7ce]' },
            { name: 'EHS', val: manDays.EHS, limit: limitEhs, color: '#0fc1a1', bg: 'bg-[#0fc1a1]' }
        ];
        let html = '';
        teams.forEach(t => {
            const targetCapacity = weekdays * t.limit;
            const pct = targetCapacity > 0 ? Math.round((t.val / targetCapacity) * 100) : 0;
            const width = pct > 100 ? 100 : pct; 
            const isOver = pct > 100;
            const barColorClass = isOver ? 'bg-[#E4002B]' : t.bg;
            const textClass = isOver ? 'text-[#E4002B]' : 'text-gray-800';
            const icon = isOver ? '<i class="fas fa-exclamation-circle text-[#E4002B] ml-1"></i>' : '';

            html += `
            <div class="bg-white rounded-xl p-4 shadow-sm border border-indigo-50 relative overflow-hidden group hover:shadow-md transition-all">
                <div class="flex justify-between items-end mb-2">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${t.name} Team</span>
                        <span class="text-xs text-gray-500">Limit: ${t.limit}/day</span>
                    </div>
                    <div class="flex items-center">
                        <span class="text-2xl font-black ${textClass}">${pct}%</span>
                        ${icon}
                    </div>
                </div>
                <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-2 shadow-inner">
                    <div class="${barColorClass} h-full rounded-full transition-all duration-1000 ease-out relative" style="width: ${width}%">
                        <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                </div>
                <div class="flex justify-between items-center text-[10px] font-medium text-gray-400 border-t border-gray-50 pt-2 mt-1">
                    <span>Actual: <b class="text-gray-600">${t.val}</b></span>
                    <span>Capacity: <b class="text-gray-600">${targetCapacity}</b> MD</span>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    function getWeekdaysInMonth(month, year) {
        let count = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        for(let d=1; d<=daysInMonth; d++) {
            const dayOfWeek = new Date(year, month-1, d).getDay();
            if(dayOfWeek !== 0 && dayOfWeek !== 6) count++; 
        }
        return count;
    }

    function renderJobTable(list) {
        const tbody = document.getElementById('table-job-list');
        if (!tbody) return;
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-gray-400 italic bg-gray-50/50">No jobs found for this period.</td></tr>`;
            return;
        }
        list.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            if (dateA - dateB !== 0) return dateA - dateB;
            return a.title.localeCompare(b.title);
        });
        let html = '';
        list.forEach(item => {
            let teamClass = "text-[#19a7ce] bg-[#19a7ce]/5 border-[#19a7ce]/20"; 
            if(item.team === 'MED') teamClass = "text-[#004aad] bg-[#004aad]/5 border-[#004aad]/20";
            if(item.team === 'LAB') teamClass = "text-[#19a7ce] bg-[#19a7ce]/5 border-[#19a7ce]/20";
            if(item.team === 'MGT') teamClass = "text-[#004aad] bg-[#004aad]/5 border-[#004aad]/20";
            html += `
                <tr class="bg-white border-b hover:bg-[#003DA5]/50 transition-colors group">
                    <td class="px-4 py-3 font-medium text-gray-500 whitespace-nowrap align-top text-xs w-24">
                        ${item.date}
                    </td>
                    <td class="px-4 py-3 align-top w-20">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${teamClass} uppercase">
                            ${item.team}
                        </span>
                    </td>
                    <td class="px-4 py-3 align-top">
                        <div class="font-bold text-gray-800 text-sm mb-0.5 group-hover:text-[#003DA5] transition-colors">${item.title}</div>
                        <div class="text-[10px] text-gray-400 flex items-center gap-1">
                            <i class="fas fa-map-marker-alt text-gray-300"></i> ${item.location || '-'}
                        </div>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = html;
    }

    function renderLeaveList(list) {
        const ul = document.getElementById('list-leave');
        if (!ul) return;
        if (list.length === 0) {
            ul.innerHTML = `<li class="text-center text-sm text-gray-400 py-10 italic bg-white/50 rounded-xl border border-dashed border-gray-200">No leave records.</li>`;
            return;
        }
        list.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA - dateB;
        });
        let html = '';
        list.forEach(item => {
            let badgeClass = "bg-[#19a7ce]/10 text-[#19a7ce]";
            if(item.team === 'MED') badgeClass = "bg-[#004aad]/10 text-[#004aad]";
            if(item.team === 'LAB') badgeClass = "bg-[#19a7ce]/10 text-[#19a7ce]";
            if(item.team === 'MGT') badgeClass = "bg-[#004aad]/10 text-[#004aad]";
            html += `
                <li class="bg-white p-3 rounded-xl border border-red-50 shadow-sm flex flex-col hover:shadow-md transition-all group cursor-default">
                    <div class="flex justify-between items-center w-full mb-1">
                        <span class="text-[10px] font-black ${badgeClass} px-1.5 py-0.5 rounded uppercase tracking-wider">${item.team}</span>
                        <span class="text-xs text-gray-400 font-medium font-mono">${item.date}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-700 group-hover:text-red-600 transition-colors line-clamp-2">${item.title}</p>
                </li>`;
        });
        ul.innerHTML = html;
    }

    // ฟังก์ชัน Export ข้อมูล Master Calendar
    function exportMasterCalendarToCSV() {
        if (!window.globalCalData || window.globalCalData.length === 0) {
            Swal.fire('No Data', 'ไม่มีข้อมูลสำหรับ Export', 'info');
            return;
        }

        const targetM = currentDisplayDate.getMonth() + 1;
        const targetY = currentDisplayDate.getFullYear();

        let filteredData = window.globalCalData.filter(item => {
            const itemM = parseInt(item.month);
            const itemY = parseInt(item.year);
            if (itemM !== targetM || itemY !== targetY) return false;
            if (currentService !== 'ALL' && item.team !== currentService) return false;
            return true;
        });

        if (filteredData.length === 0) {
            Swal.fire('No Data', `ไม่มีข้อมูลในเดือน ${targetM}/${targetY} สำหรับทีมที่เลือก`, 'info');
            return;
        }

        let csvContent = "\uFEFF"; 
        csvContent += "Date,Team,Type,Activity Title,Location\n";

        filteredData.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA - dateB;
        }).forEach(item => {
            const isLeave = checkIsLeaveEvent(item.title);
            const type = isLeave ? "Leave/Off" : "Job";
            let safeTitle = `"${(item.title || "").replace(/"/g, '""')}"`;
            let safeLocation = `"${(item.location || "-").replace(/"/g, '""')}"`;
            csvContent += `${item.date},${item.team},${type},${safeTitle},${safeLocation}\n`;
        });

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `MasterCalendar_${currentService}_${targetM}_${targetY}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // ======================================================================
    // ส่วนที่ 3: ระบบใหม่ (2025 Plan Tracker & Export แบบแยก Start/End)
    // ======================================================================
    let trackerMatchedData = [];
    let currentFilteredTrackerData = []; 

    function parseDateStrToObj(ddmmyyyy) {
        let [d,m,y] = ddmmyyyy.split('/');
        return new Date(y, m-1, d);
    }

    function formatDateRangeStr(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let start = dObjs[0];
        let end = dObjs[dObjs.length-1];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        if (start.getTime() === end.getTime()) {
            return `${start.getDate()} ${months[start.getMonth()]}`;
        } else if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]}`;
        } else {
            return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
        }
    }

    // แยก Start Date สำหรับ Export
    function formatExportDateStart(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let start = dObjs[0];
        let d = String(start.getDate()).padStart(2, '0');
        let m = String(start.getMonth() + 1).padStart(2, '0');
        let y = start.getFullYear();
        return `${d}-${m}-${y}`;
    }

    // แยก End Date สำหรับ Export
    function formatExportDateEnd(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let end = dObjs[dObjs.length-1];
        let d = String(end.getDate()).padStart(2, '0');
        let m = String(end.getMonth() + 1).padStart(2, '0');
        let y = end.getFullYear();
        return `${d}-${m}-${y}`;
    }

    function getCalLinkFromDate(dateStr) {
        if(!dateStr || dateStr === '-') return '#';
        let [d,m,y] = dateStr.split('/');
        return `https://calendar.google.com/calendar/u/0/r/month/${y}/${parseInt(m)}/${parseInt(d)}`;
    }

    function groupDataByMonthAndTitle(dataArray) {
        let grouped = {};
        dataArray.forEach(job => {
            let clTitle = job.title.trim().toLowerCase();
            let key = `${job.team}_${clTitle}_${job.month}`;
            if (!grouped[key]) {
                grouped[key] = { ...job, dates: [job.date] };
            } else {
                if (!grouped[key].dates.includes(job.date)) {
                    grouped[key].dates.push(job.date);
                }
            }
        });
        return Object.values(grouped);
    }

    function findMatchIn2026Grouped(title2025, groupedData2026, team) {
        if (!title2025) return null;
        let t25 = title2025.toLowerCase().trim();
        
        const ignoreList = ['โจ', 'ไผ่', 'test', 'เทส', 'ทดสอบ', 'ลา', 'ลาป่วย', 'ป่วย', 'หยุด', 'dayoff', 'day off', 'วันหยุด', 'เทศกาล', 'พี่', 'น้อง', 'ทีม'];
        let clean25 = t25;
        ignoreList.forEach(w => {
            clean25 = clean25.replace(new RegExp(w, 'gi'), ''); 
        });
        clean25 = clean25.trim();
        
        if (clean25.length < 2) return null; 

        const keywordRegex = /(รพ\.|โรงพยาบาล|คลินิก|คลีนิค|clinic|ศูนย์|site|บ\.|บริษัท|ม\.|มหาวิทยาลัย|สถาบัน)\s*[a-zA-Zก-ฮะ-์0-9]+/gi;
        let strongKeywords = t25.match(keywordRegex) || [];

        for (let item of groupedData2026) {
            if (item.team !== team) continue;
            let t26 = (item.title || "").toLowerCase();
            
            if (strongKeywords.length > 0) {
                for (let kw of strongKeywords) {
                    if (t26.includes(kw.toLowerCase())) return item;
                }
            }
            if (t26.includes(clean25) || clean25.includes(t26)) return item;
        }
        return null;
    }

    function openJobTracker2025() {
        if (!globalCalData || globalCalData.length === 0) {
            Swal.fire('No Data', 'กรุณารอให้ระบบโหลดข้อมูลเสร็จสิ้นก่อน', 'warning');
            return;
        }

        const filteredGlobalData = globalCalData.filter(item => !checkIsLeaveEvent(item.title));
        const raw2025 = filteredGlobalData.filter(item => item.year == "2025");
        const raw2026 = filteredGlobalData.filter(item => item.year == "2026");
        
        const unique2025 = groupDataByMonthAndTitle(raw2025);
        const unique2026 = groupDataByMonthAndTitle(raw2026);

        trackerMatchedData = unique2025.map(job25 => {
            const match = findMatchIn2026Grouped(job25.title, unique2026, job25.team);
            return {
                team: job25.team,
                title: job25.title,
                month25: job25.month,
                firstDate25: job25.dates[0], 
                dateRange25: formatDateRangeStr(job25.dates), 
                exportStartDate25: formatExportDateStart(job25.dates),  
                exportEndDate25: formatExportDateEnd(job25.dates),  
                status: match ? 'Matched' : 'Pending',
                matchTitle: match ? match.title : '-',
                matchMonth: match ? match.month : '-',
                matchFirstDate26: match ? match.dates[0] : '-',
                dateRange26: match ? formatDateRangeStr(match.dates) : '-', 
                exportStartDate26: match ? formatExportDateStart(match.dates) : '-',
                exportEndDate26: match ? formatExportDateEnd(match.dates) : '-'
            };
        });

        let containerHtml = `
            <div class="text-left font-prompt">
                <div class="mb-6 space-y-4 bg-[#003DA5]/50 p-4 rounded-2xl border border-[#003DA5] shadow-sm">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex bg-white p-1 rounded-xl border border-[#003DA5] shadow-sm">
                            <button onclick="filterTracker('ALL')" id="btn-tracker-ALL" class="tracker-btn active px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#003DA5] text-white shadow-sm">All</button>
                            <button onclick="filterTracker('MED')" id="btn-tracker-MED" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-[#003DA5] hover:text-[#003DA5]">MED</button>
                            <button onclick="filterTracker('LAB')" id="btn-tracker-LAB" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-[#003DA5] hover:text-[#003DA5]">LAB</button>
                            <button onclick="filterTracker('EHS')" id="btn-tracker-EHS" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-[#003DA5] hover:text-[#003DA5]">EHS</button>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <select id="tracker-status-select" onchange="filterTracker()" class="bg-white border border-[#003DA5] rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#003DA5] cursor-pointer shadow-sm">
                                <option value="ALL">All Status</option>
                                <option value="Matched">Matched</option>
                                <option value="Pending">Pending</option>
                            </select>
                            <select id="tracker-month-select" onchange="filterTracker()" class="bg-white border border-[#003DA5] rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#003DA5] cursor-pointer shadow-sm">
                                <option value="ALL">All Months</option>
                                <option value="1">Jan</option><option value="2">Feb</option><option value="3">Mar</option>
                                <option value="4">Apr</option><option value="5">May</option><option value="6">Jun</option>
                                <option value="7">Jul</option><option value="8">Aug</option><option value="9">Sep</option>
                                <option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option>
                            </select>
                            <button onclick="exportTrackerToCSV()" class="bg-[#059669] hover:bg-[#047857] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                <i class="fas fa-file-excel mr-1"></i> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-y-auto max-h-[60vh] border border-gray-100 rounded-2xl bg-white shadow-sm custom-scrollbar">
                    <table class="w-full text-xs border-collapse">
                        <thead class="bg-gray-50 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                            <tr>
                                <th class="p-4 text-center font-bold text-gray-500 uppercase tracking-wider w-[10%]">Team</th>
                                <th class="p-4 text-center font-bold text-indigo-600 uppercase tracking-wider w-[40%] border-r border-gray-100"><i class="fas fa-history"></i> 2025 Plan (Click to Calendar Month)</th>
                                <th class="p-4 text-center font-bold text-gray-300 uppercase tracking-wider w-[10%]"><i class="fas fa-exchange-alt"></i></th>
                                <th class="p-4 text-center font-bold text-[#003DA5] uppercase tracking-wider w-[40%]"><i class="fas fa-calendar-check"></i> 2026 Status</th>
                            </tr>
                        </thead>
                        <tbody id="tracker-tbody" class="divide-y divide-gray-100 bg-white">
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        Swal.fire({
            title: '<div class="flex items-center gap-3"><i class="fas fa-tasks text-[#003DA5]"></i> Plan Comparision: 2025 vs 2026</div>',
            html: containerHtml,
            width: '1050px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                container: 'font-prompt',
                popup: 'rounded-[2rem]'
            },
            didOpen: () => {
                filterTracker('ALL');
            }
        });
    }

    function filterTracker(team) {
        if (team) currentTrackerTeam = team;
        const month = document.getElementById('tracker-month-select').value;
        const status = document.getElementById('tracker-status-select').value;
        const tbody = document.getElementById('tracker-tbody');

        document.querySelectorAll('.tracker-btn').forEach(btn => {
            btn.classList.remove('bg-[#003DA5]', 'text-white', 'shadow-sm', 'active');
            btn.classList.add('text-gray-500');
        });
        
        const activeBtn = document.getElementById(`btn-tracker-${currentTrackerTeam}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-500');
            activeBtn.classList.add('bg-[#003DA5]', 'text-white', 'shadow-sm', 'active');
        }

        let filtered = trackerMatchedData.filter(item => {
            const teamMatch = (currentTrackerTeam === 'ALL' || item.team === currentTrackerTeam);
            const monthMatch = (month === 'ALL' || item.month25 == month);
            const statusMatch = (status === 'ALL' || item.status === status);
            return teamMatch && monthMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let dateA = parseDateStrToObj(a.firstDate25);
            let dateB = parseDateStrToObj(b.firstDate25);
            return dateA - dateB;
        });

        currentFilteredTrackerData = filtered; 

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-400 italic">No data found for this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            let teamBadge = `<span class="px-2.5 py-1.5 rounded-md text-[10px] font-black bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5] shadow-sm">${r.team}</span>`;
            if (r.team === 'MED') teamBadge = `<span class="px-2.5 py-1.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">${r.team}</span>`;
            if (r.team === 'LAB') teamBadge = `<span class="px-2.5 py-1.5 rounded-md text-[10px] font-black bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm">${r.team}</span>`;

            const calLink25 = getCalLinkFromDate(r.firstDate25);
            const calLink26 = getCalLinkFromDate(r.matchFirstDate26);

            let rightSideUI = '';
            if (r.status === 'Matched') {
                rightSideUI = `
                    <a href="${calLink26}" target="_blank" class="block bg-gradient-to-br from-[#003DA5] to-[#004aad] border border-[#003DA5] rounded-xl p-3 w-full shadow-sm text-left hover:shadow-md hover:border-[#003DA5] transition-all cursor-pointer group/link">
                        <div class="flex items-center gap-1.5 mb-2">
                            <i class="fas fa-check-circle text-[#003DA5] text-sm"></i>
                            <span class="text-[10px] font-extrabold text-[#003DA5] uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">Matched in 2026</span>
                        </div>
                        <div class="text-sm font-bold text-gray-800 leading-snug mb-2 group-hover/link:text-[#003DA5]">${r.matchTitle}</div>
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs text-gray-600 flex items-center gap-2"><i class="far fa-calendar-alt w-3 text-center text-[#003DA5]"></i> <span class="font-medium bg-white px-2 py-0.5 rounded border border-[#003DA5]">${r.dateRange26}</span></div>
                        </div>
                    </a>
                `;
            } else {
                rightSideUI = `
                    <div class="bg-[#003DA5]/60 border-2 border-dashed border-[#003DA5] rounded-xl p-4 w-full h-full flex flex-col items-center justify-center text-center transition-all hover:bg-[#003DA5]">
                        <i class="fas fa-clock text-[#003DA5] text-2xl mb-2 drop-shadow-sm"></i>
                        <span class="text-xs font-extrabold text-[#003DA5] uppercase tracking-wide">Pending</span>
                        <span class="text-[10px] text-[#003DA5] mt-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-[#003DA5]">No similar job found in 2026</span>
                    </div>
                `;
            }

            return `
            <tr class="hover:bg-[#003DA5]/30 border-b border-gray-100 transition-colors group">
                <td class="p-4 align-middle text-center w-[10%]">
                    ${teamBadge}
                </td>
                <td class="p-4 align-top w-[40%] border-r border-gray-100">
                    <a href="${calLink25}" target="_blank" class="block bg-white border border-gray-200 group-hover:border-indigo-300 rounded-xl p-3 w-full shadow-sm transition-all text-left hover:shadow-md cursor-pointer group/link25">
                        <div class="flex justify-between items-center mb-2">
                            <div class="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                <i class="fas fa-history"></i> 2025 Plan
                            </div>
                            <i class="fas fa-external-link-alt text-gray-300 text-[10px] group-hover/link25:text-indigo-400"></i>
                        </div>
                        <div class="text-sm font-bold text-gray-800 leading-snug mb-2 group-hover/link25:text-indigo-600">${r.title}</div>
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs text-gray-600 flex items-center gap-2"><i class="far fa-calendar-alt w-3 text-center text-indigo-400"></i> <span class="font-medium bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">${r.dateRange25}</span></div>
                        </div>
                    </a>
                </td>
                <td class="p-4 align-middle text-center w-[10%] bg-gray-50/30">
                    <div class="flex justify-center items-center h-full">
                        <div class="bg-white text-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 group-hover:text-[#003DA5] group-hover:border-[#003DA5] transition-all">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </td>
                <td class="p-4 align-top w-[40%] bg-gray-50/30">
                    ${rightSideUI}
                </td>
            </tr>
            `;
        }).join('');
    }

    // ฟังก์ชัน Export Excel (2025 Plan Tracker) โดยแยก Start/End Date ออกจากกัน
    function exportTrackerToCSV() {
        if (currentFilteredTrackerData.length === 0) {
            Swal.fire('No Data', 'ไม่มีข้อมูลสำหรับ Export ในตารางปัจจุบัน', 'info');
            return;
        }
        
        let csvContent = "\uFEFF"; 
        csvContent += "Team,2025 Job Title,2025 Start Dates,2025 End Dates,Status,2026 Matched Job,2026 Start Dates,2026 End Dates\n";

        currentFilteredTrackerData.forEach(r => {
            let title25 = `"${r.title.replace(/"/g, '""')}"`;
            let title26 = `"${r.matchTitle.replace(/"/g, '""')}"`;
            
            csvContent += `${r.team},${title25},${r.exportStartDate25},${r.exportEndDate25},${r.status},${title26},${r.exportStartDate26},${r.exportEndDate26}\n`;
        });

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `PlanTracker_Export_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
