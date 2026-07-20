// ============================================================
// 30-report-csi.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ตั้งค่าเริ่มต้น Default Year เป็น 2026
let reportRawData = [];
let reportFilteredData = [];
let reportTickets = [];
let rFilters = { team: 'All', year: '2026', month: 'All' }; 
let reportCharts = {};
let rSortCol = 0, rSortDir = -1;

// เพิ่มตัวแปรสำหรับ Sorting ตาราง CSI List
let csiSortCol = 0, csiSortDir = -1;

const R_TEAM_MAP = { 'Medical Equipment': 'MED', 'Lab & Testing': 'LAB', 'Environmental Health': 'EHS' };
const R_COLORS = { 'MED': '#004aad', 'LAB': '#19a7ce', 'EHS': '#0fc1a1' };

function initReport(data, tickets) {
  reportRawData = data || [];
  reportTickets = tickets || [];
  populateReportDropdowns(); 
  
  const yEl = document.getElementById('r-filter-year');
  if (yEl) rFilters.year = yEl.value;

  applyReportFilters(); 
}

function handleReportUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById('loadingOverlay').classList.remove('hidden');
  if (document.getElementById('loadingText')) document.getElementById('loadingText').innerText = 'Processing Report CSI File...';
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, {defval: ""}) : [];
      if (!jsonData.length) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
      const headers = Object.keys(jsonData[0]);
      const findK = (kw) => headers.find(h => kw.some(k => h.includes(k))) || "";
      
      const mapped = jsonData.map(row => {
        const rawId = row[findK(['Response ID', 'ลำดับ'])];
        const custName = String(row[findK(['ชื่อลูกค้า', 'Customer', '1.'])] || "");
        if (!rawId || custName.includes('Aa') || custName.toLowerCase().includes('test')) return null;

        let rawTeam = row[findK(['Service', 'ทีม', '2.'])] || "Other";
        return [
          rawId, row[findK(['Timestamp', 'วันที่'])], row[findK(['Finished', 'สถานะ'])],
          custName, R_TEAM_MAP[rawTeam] || rawTeam, row[findK(['ครบถ้วน', '3.'])], row[findK(['ปัญหา', '4.'])],
          row[findK(['ภายใน 14 วัน', '5.'])], row[findK(['เกินกำหนด', '6.'])],
          row[findK(['พึงพอใจ', '7.'])], row[findK(['ข้อเสนอแนะ', '8.'])]
        ];
      }).filter(r => r !== null);
      
      (async () => {
        const loader = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        try {
          let result;
          if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
            result = await window.CES_API.chunkedRows('saveReportDataArray', mapped, {}, {
              maxUrlLength: 5600,
              timeoutMs: 120000,
              onProgress: (done, total, rowsInChunk) => {
                if (loadingText) loadingText.innerText = `Uploading Report CSI... ${done}/${total} batches (${rowsInChunk} rows)`;
              }
            });
          } else {
            result = await new Promise((resolve, reject) => {
              google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler(reject)
                .saveReportDataArray(mapped);
            });
          }
          if (loader) loader.classList.add('hidden');
          const added = (typeof result === 'object') ? (result.total || 0) : result;
          Swal.fire('สำเร็จ', `อัปเดตข้อมูล ${added} รายการ`, 'success');
          if (typeof loadReportCSIOnly === 'function') loadReportCSIOnly(true); else loadAllData();
        } catch (err) {
          if (loader) loader.classList.add('hidden');
          Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
      })();
    } catch (err) { alert(err.message); document.getElementById('loadingOverlay').classList.add('hidden'); }
  };
  reader.readAsArrayBuffer(file);
}

const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

function applyReportFilters() {
  reportFilteredData = reportRawData.filter(d => {
    const dt = new Date(d.timestamp);
    const y = isNaN(dt.getTime()) ? 'Unknown' : String(dt.getFullYear());
    const m = isNaN(dt.getTime()) ? 'Unknown' : (typeof S_MONTHS !== 'undefined' ? S_MONTHS[dt.getMonth()] : dt.getMonth()+1);
    const team = R_TEAM_MAP[d.team] || d.team;
    return (rFilters.team === 'All' || team === rFilters.team) &&
           (rFilters.year === 'All' || y === rFilters.year) &&
           (rFilters.month === 'All' || m === rFilters.month);
  });
  
  // ปรับสีปุ่ม Filter: เขียวอ่อนเมื่อปกติ / เขียวเข้มเมื่อ Active หรือ Hover
  ['All','MED','LAB','EHS'].forEach(t => {
    const btn = document.getElementById('btn-rteam-' + t);
    if(btn) {
      if(rFilters.team === t) {
        // สถานะถูกเลือก (เขียวเข้ม)
        btn.className = "px-4 py-2 rounded-lg text-xs font-bold shadow-sm transform scale-105 transition-all"; btn.style.cssText = "background:rgba(0,61,165,0.1);color:#003DA5;border:1px solid rgba(0,61,165,0.2)";
      } else {
        // สถานะปกติ (เขียวอ่อน)
        btn.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all"; btn.style.cssText = "background:white;color:#64748b;border:none";
      }
    }
  });
  updateReportUI();
}

function updateReportUI() {
  const data = reportFilteredData;
  const total = data.length;
  const finish = data.filter(d => String(d.finished).toLowerCase() === 'yes');
  const finishCnt = finish.length;
  const notFinishCnt = total - finishCnt;
  
  const finPct = total > 0 ? ((finishCnt / total) * 100).toFixed(1) + '%' : '0%';
  const notFinPct = total > 0 ? ((notFinishCnt / total) * 100).toFixed(1) + '%' : '0%';

  const onTimeCnt = finish.filter(d => !String(d.isOnTime).includes('ไม่ใช่') && String(d.isOnTime) !== "").length;
  const completeCnt = finish.filter(d => String(d.isComplete).includes('ใช่')).length;
  const onTimePct = finishCnt > 0 ? ((onTimeCnt / finishCnt) * 100).toFixed(1) + '%' : '0%';
  const completePct = finishCnt > 0 ? ((completeCnt / finishCnt) * 100).toFixed(1) + '%' : '0%';

  const incidents = finish.filter(d => String(d.isOnTime).includes('ไม่ใช่') || (Number(d.satisfaction) > 0 && Number(d.satisfaction) < 3));
  const resolvedCount = incidents.filter(d => reportTickets.some(t => String(t.id) === String(d.id))).length;
  const avgSat = finishCnt > 0 ? (finish.reduce((a,b) => a + (Number(b.satisfaction)||0), 0) / finishCnt).toFixed(1) : "0.0";

  setTxt('r-total', total.toLocaleString());
  setTxt('r-finish', finishCnt.toLocaleString()); setTxt('r-finish-pct', finPct);
  setTxt('r-notfinish', notFinishCnt.toLocaleString()); setTxt('r-notfinish-pct', notFinPct);
  setTxt('r-ontime', onTimeCnt.toLocaleString()); setTxt('r-ontime-pct', onTimePct);
  setTxt('r-complete', completeCnt.toLocaleString()); setTxt('r-complete-pct', completePct);
  setTxt('r-avg-sat', avgSat);
  setTxt('incident-count-badge', incidents.length);
  setTxt('resolved-count-badge', resolvedCount);

  renderReportCharts(data);
  renderCRMTable();
  renderReportComments();
  renderCSITable(); 
}

// --- ฟังก์ชัน Export: ส่งออกข้อมูลทั้งหมดตาม Filter ปัจจุบัน ---
function exportCSIToExcel() {
    // ส่งออกข้อมูลทั้งหมดที่ผ่าน Filter ตามความต้องการ
    const dataToExport = [...reportFilteredData];
    
    if (dataToExport.length === 0) {
        return Swal.fire('No Data', 'ไม่พบข้อมูลสำหรับการส่งออกในขณะนี้', 'warning');
    }

    // ปรับ Satisfaction เอาแค่ตัวเลข (Number) ไม่เอาดาว
    const excelRows = dataToExport.map(d => ({
        'Date': String(d.timestamp).substring(0, 10),
        'Customer': d.customer,
        'Team': R_TEAM_MAP[d.team] || d.team,
        'Satisfaction': Number(d.satisfaction) || 0,
        'Status': String(d.finished).toLowerCase() === 'yes' ? 'Finished' : 'Pending',
        'Late Status': String(d.isOnTime).includes('ไม่ใช่') ? 'Late' : 'On-Time',
        'Issue / Comment': `${d.issue || ''} ${d.comment || ''}`.trim()
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CSI_Report_Full");

    const fileName = `Report_CSI_Export_${rFilters.team}_${rFilters.year}_${rFilters.month}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function renderReportCharts(data) {
  const teams = ['MED', 'LAB', 'EHS'];
  const mLabels = typeof S_MONTHS !== 'undefined' ? S_MONTHS : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  const ctxS = document.getElementById('reportShareChart');
  if(ctxS) {
      if(reportCharts.share) reportCharts.share.destroy();
      reportCharts.share = new Chart(ctxS, {
        type: 'doughnut',
        data: { labels: teams, datasets: [{ data: teams.map(t => data.filter(x => (R_TEAM_MAP[x.team]||x.team) === t).length), backgroundColor: teams.map(t => R_COLORS[t]), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, font: { size: 10 } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 10 }, formatter: (v, ctx) => { let sum = 0; ctx.chart.data.datasets[0].data.forEach(d => sum += d); return sum > 0 ? (v * 100 / sum).toFixed(0) + "%" : ""; }} } },
        plugins: [ChartDataLabels]
      });
  }
  
  const ctxT = document.getElementById('reportTrendChart');
  if(ctxT) {
      if(reportCharts.trend) reportCharts.trend.destroy();
      reportCharts.trend = new Chart(ctxT, {
        type: 'bar',
        data: {
          labels: mLabels,
          datasets: teams.map(t => ({
            label: t, data: mLabels.map(m => data.filter(d => (R_TEAM_MAP[d.team]||d.team) === t && (typeof S_MONTHS !== 'undefined' ? S_MONTHS[new Date(d.timestamp).getMonth()] : new Date(d.timestamp).getMonth()+1) === m).length),
            backgroundColor: R_COLORS[t], borderRadius: 4
          }))
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { beginAtZero: true } }, plugins: { datalabels: { anchor: 'end', align: 'top', offset: -2, font: { weight: 'bold', size: 10 }, formatter: val => val > 0 ? val : '' }, legend: { labels: { usePointStyle: true, font: { size: 10 } } } } },
        plugins: [ChartDataLabels]
      });
  }
}

function renderCRMTable() {
  const tbody = document.getElementById('crmTableBody');
  if(!tbody) return;
  
  const searchEl = document.getElementById('r-inc-search');
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  
  let incidents = reportFilteredData.filter(d => 
    String(d.finished).toLowerCase() === 'yes' && 
    (String(d.isOnTime).includes('ไม่ใช่') || (Number(d.satisfaction) > 0 && Number(d.satisfaction) < 3))
  );
  
  let displayData = incidents.filter(d => d.customer.toLowerCase().includes(search));

  displayData.sort((a,b) => {
    let v1, v2;
    const tA = reportTickets.find(t => String(t.id) === String(a.id));
    const tB = reportTickets.find(t => String(t.id) === String(b.id));
    switch(rSortCol) {
      case 0: v1 = new Date(a.timestamp); v2 = new Date(b.timestamp); break;
      case 1: v1 = a.customer; v2 = b.customer; break;
      case 2: v1 = a.team; v2 = b.team; break;
      case 3: v1 = Number(a.satisfaction) || 0; v2 = Number(b.satisfaction) || 0; break;
      case 4: v1 = a.lateDate || ''; v2 = b.lateDate || ''; break;
      case 5: v1 = (a.issue || a.comment || '').toLowerCase(); v2 = (b.issue || b.comment || '').toLowerCase(); break;
      case 6: v1 = tA ? 1 : 0; v2 = tB ? 1 : 0; break;
      default: v1 = a.id; v2 = b.id;
    }
    return v1 > v2 ? rSortDir : (v1 < v2 ? -rSortDir : 0);
  });

  tbody.innerHTML = displayData.map(d => {
    const ticket = reportTickets.find(t => String(t.id) === String(d.id));
    const late = String(d.isOnTime).includes('ไม่ใช่') ? (d.lateDate || 'Late') : '-';
    const statusBtn = ticket ? '<span class="bg-[#003DA5]/10 text-[#003DA5] px-3 py-1 rounded-full font-bold border border-[#003DA5]">Closed</span>' : '<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold border border-red-200 animate-pulse">On-Going</span>';
    const fullComment = (d.issue || d.comment || '-').trim();
    let commentHtml = fullComment.length > 30 ? `${fullComment.substring(0, 27)}... <button onclick="showFullComment('${encodeURIComponent(fullComment)}')" class="text-blue-500 font-bold hover:underline">Read more</button>` : fullComment;
    
    return `<tr class="hover:bg-gray-50 border-b">
      <td class="p-3 text-gray-500">${String(d.timestamp).substring(0,10)}</td>
      <td class="p-3 font-bold text-gray-700">${d.customer}</td>
      <td class="p-3 text-gray-600 font-medium">${R_TEAM_MAP[d.team] || d.team}</td>
      <td class="p-3 text-center font-bold ${Number(d.satisfaction)<3?'text-red-500':''}">${d.satisfaction || '-'} ★</td>
      <td class="p-3 text-center font-bold text-red-500">${late}</td>
      <td class="p-3 text-gray-400 text-xs">${commentHtml}</td>
      <td class="p-3 text-center">${statusBtn}</td>
      <td class="p-3 text-center">${ticket ? `<button onclick="viewActionNote('${d.id}')" class="text-blue-600 font-bold"><i class="fas fa-eye"></i> View</button>` : `<button onclick="openTicketModal('${d.id}','${d.customer}')" class="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">Reply</button>`}</td>
    </tr>`;
  }).join('');
}

function renderReportComments() {
    const boxes = { 'MED': 'r-comm-med', 'LAB': 'r-comm-lab', 'EHS': 'r-comm-ehs' };
    Object.values(boxes).forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = ''; });
  
    reportFilteredData.filter(d => String(d.finished).toLowerCase() === 'yes').forEach(d => {
        const team = R_TEAM_MAP[d.team] || d.team;
        const el = document.getElementById(boxes[team]);
        
        if(d.comment && d.comment.length > 2 && el) {
            // ดึงเดือนและปีจาก Timestamp เพื่อแสดงบนการ์ด
            const dt = new Date(d.timestamp);
            let mStr = "UNKNOWN", yStr = "YYYY";
            if (!isNaN(dt.getTime())) {
                mStr = (typeof S_MONTHS !== 'undefined' ? S_MONTHS[dt.getMonth()] : dt.toLocaleString('en-US', {month: 'short'})).toUpperCase();
                yStr = dt.getFullYear();
            }

            // เลือกสีแถบซ้ายตามทีม
            const styleClass = team === 'MED' ? 'border-l-blue-600' : (team === 'LAB' ? 'border-l-cyan-500' : 'border-l-emerald-500');
            
            const html = `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 border-l-4 ${styleClass} mb-2 transition-all hover:shadow-md">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${mStr} • ${yStr}</span>
                    <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">Feedback</span>
                </div>
                <p class="text-xs text-gray-700 italic leading-relaxed mt-2">"${d.comment}"</p>
                <div class="text-[10px] text-right text-gray-400 mt-2 border-t border-gray-50 pt-1 font-medium truncate">
                    <i class="fas fa-user-tag mr-1 opacity-50"></i>${d.customer}
                </div>
            </div>`;
            
            el.innerHTML += html;
        }
    });
}

function sortCSITable(col) {
    if(csiSortCol === col) csiSortDir *= -1;
    else { csiSortCol = col; csiSortDir = 1; }
    renderCSITable();
}

function renderCSITable() {
    const tbody = document.getElementById('csi-list-body');
    if (!tbody) return;
    const search = (document.getElementById('csi-list-search')?.value || '').toLowerCase();
    
    // ตารางแสดงเฉพาะรายการที่ Finished (yes) เท่านั้นใน UI เพื่อความสะอาด
    let data = reportFilteredData.filter(d => String(d.finished).toLowerCase() === 'yes');

    if (search) {
        data = data.filter(d => 
            String(d.customer).toLowerCase().includes(search) || 
            String(d.issue).toLowerCase().includes(search) ||
            String(d.comment).toLowerCase().includes(search)
        );
    }

    data.sort((a, b) => {
        let vA, vB;
        switch(csiSortCol) {
            case 0: vA = new Date(a.timestamp).getTime(); vB = new Date(b.timestamp).getTime(); break;
            case 1: vA = a.customer; vB = b.customer; break;
            case 2: vA = Number(a.satisfaction) || 0; vB = Number(b.satisfaction) || 0; break;
            case 3: vA = a.isOnTime; vB = b.isOnTime; break;
            default: vA = a.id; vB = b.id;
        }
        return (vA < vB ? -1 : (vA > vB ? 1 : 0)) * csiSortDir;
    });

    setTxt('csi-count-badge', `${data.length} Records (Finished)`);

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-10 text-center text-gray-400 italic">ไม่พบข้อมูลลูกค้าที่ประเมินสำเร็จ</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(d => {
        const sat = Number(d.satisfaction) || 0;
        let satStyle = sat < 3 ? 'text-red-500 font-bold' : 'text-[#003DA5] font-bold';
        const isLate = String(d.isOnTime).includes('ไม่ใช่');
        const lateHtml = isLate ? '<span class="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">LATE</span>' : '<span class="text-gray-300">-</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b">
                <td class="p-3 text-gray-400 text-xs">${String(d.timestamp).substring(0,10)}</td>
                <td class="p-3 font-bold text-slate-700">${d.customer || '-'}</td>
                <td class="p-3 text-[10px] font-bold text-[#003DA5]">${R_TEAM_MAP[d.team] || d.team}</td>
                <td class="p-3 text-center ${satStyle}">${sat} ★</td>
                <td class="p-3 text-center">${lateHtml}</td>
                <td class="p-3 whitespace-normal">
                    <div class="text-[11px] font-bold text-gray-700">${d.issue || ''}</div>
                    <div class="text-[10px] text-gray-400 italic">${d.comment || ''}</div>
                </td>
            </tr>`;
    }).join('');
}

function showFullComment(encodedTxt) { document.getElementById('fullCommentText').innerText = `"${decodeURIComponent(encodedTxt)}"`; document.getElementById('commentModal').classList.remove('hidden'); }
function closeCommentModal() { document.getElementById('commentModal').classList.add('hidden'); }
function openTicketModal(id, cust) { document.getElementById('ticket-id').value = id; document.getElementById('ticket-customer').innerText = cust; document.getElementById('ticketModal').classList.remove('hidden'); }
function closeTicketModal() { document.getElementById('ticketModal').classList.add('hidden'); document.getElementById('rootCause').value = ''; document.getElementById('solution').value = ''; }

function submitTicket() {
  const data = { id: document.getElementById('ticket-id').value, rootCause: document.getElementById('rootCause').value, solution: document.getElementById('solution').value };
  if(!data.rootCause || !data.solution) return Swal.fire('Error', 'Please fill all fields', 'error');
  document.getElementById('loadingOverlay').classList.remove('hidden');
  google.script.run.withSuccessHandler(() => { 
    document.getElementById('loadingOverlay').classList.add('hidden'); 
    closeTicketModal(); Swal.fire('สำเร็จ', 'บันทึกการแก้ไขเรียบร้อยแล้ว', 'success'); loadAllData(); 
  }).saveTicket(data);
}

function viewActionNote(id) {
  const t = reportTickets.find(x => String(x.id) === String(id));
  if(t) Swal.fire({ 
    title: 'Action Record', 
    html: `
      <div class="text-left text-sm space-y-3">
        <div class="bg-gray-50 p-3 rounded-lg border">
          <p class="font-bold text-gray-400 uppercase text-[10px]">Root Cause:</p>
          <p class="text-gray-700">${t.rootCause}</p>
        </div>
        <div class="bg-[#003DA5]/10 p-3 rounded-lg border border-[#003DA5]/30">
          <p class="font-bold text-[#003DA5] uppercase text-[10px]">Solution:</p>
          <p class="text-[#003DA5]">${t.solution}</p>
        </div>
        <p class="text-right text-[9px] text-gray-300 italic">Resolved: ${t.lastUpdate}</p>
      </div>` 
  });
}

function sortRTable(col) { if(rSortCol === col) rSortDir *= -1; else { rSortCol = col; rSortDir = 1; } renderCRMTable(); }
function setRFilter(k,v) { rFilters[k] = v; applyReportFilters(); }

function populateReportDropdowns() {
  let years = [...new Set(reportRawData.map(d => {
      const dt = new Date(d.timestamp);
      return isNaN(dt.getTime()) ? null : dt.getFullYear();
  }))].filter(y => y !== null);
  if (!years.includes(2026)) years.push(2026);
  years.sort();
  const mLabels = typeof S_MONTHS !== 'undefined' ? S_MONTHS : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fill = (id, arr, defaultVal) => { 
    const el = document.getElementById(id); 
    if(el) { 
      el.innerHTML = '<option value="All">All</option>' + arr.map(x => `<option value="${x}">${x}</option>`).join('');
      if (defaultVal) el.value = defaultVal;
    } 
  };
  fill('r-filter-year', years, '2026');
  fill('r-filter-month', mLabels, 'All');
}
// ============================================================== //
// [NEW] ฟังก์ชัน Export PDF สำหรับหน้า Report CSI (แก้ตารางขาดหาย)
// ============================================================== //
async function exportReportToPDF() {
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        Swal.fire('Missing Library', 'ไม่พบไลบรารี html2canvas หรือ jsPDF กรุณาตรวจสอบ Script CDN', 'error');
        return;
    }
    const { jsPDF } = window.jspdf;

    Swal.fire({
        title: 'กำลังเตรียมหน้า Preview...',
        html: 'ระบบกำลังประมวลผลและกางตารางเอกสาร (อาจใช้เวลาสักครู่)',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const target = document.getElementById('view-report');
    const originalStyles = [];

    // --- 1. ปลดล็อค Layout ทุกจุดที่ขัดขวางการแสดงผลเต็มหน้า ---
    
    // 1.1 ปลดล็อคคลาส overflow-hidden ของกล่องแม่ (ตัวการที่ทำให้ตารางถูกตัด)
    const hiddenWrappers = target.querySelectorAll('.overflow-hidden');
    hiddenWrappers.forEach(el => {
        originalStyles.push({ el: el, action: 'add-class', val: 'overflow-hidden' });
        el.classList.remove('overflow-hidden');
    });

    // 1.2 ปลดล็อค Scrollbar และ Max-height ของตารางทั้งหมด
    const scrollableDivs = target.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .custom-scrollbar');
    scrollableDivs.forEach(div => {
        originalStyles.push({ 
            el: div, action: 'style', 
            maxHeight: div.style.maxHeight, 
            overflow: div.style.overflow,
            height: div.style.height 
        });
        div.style.setProperty('max-height', 'none', 'important');
        div.style.setProperty('overflow', 'visible', 'important');
        div.style.setProperty('height', 'auto', 'important');
    });

    // 1.3 กางกล่อง Customer Feedback จากความสูงคงที่ (h-80) เป็นอิสระ (h-auto)
    const feedbackBoxes = target.querySelectorAll('.h-80.flex-col');
    feedbackBoxes.forEach(box => {
        originalStyles.push({ el: box, action: 'height-class' });
        box.classList.remove('h-80');
        box.classList.add('h-auto');
    });

    // บังคับความกว้างหน้าจอเพื่อ Layout ที่สมมาตร
    target.classList.add('pdf-capture-mode');
    const originalWidth = target.style.width;
    target.style.width = '1400px';

    // สำคัญ: บังคับเลื่อนหน้าจอไปบนสุด ป้องกันบั๊ก html2canvas แคปภาพแหว่ง
    const prevScrollY = window.scrollY;
    window.scrollTo(0, 0);

    // รอให้ Browser วาดหน้าจอใหม่ (Repaint) ให้สมบูรณ์
    await new Promise(r => setTimeout(r, 600));

    try {
        // --- 2. แคปหน้าจอ ---
        const canvas = await html2canvas(target, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8fafc',
            logging: false,
            windowWidth: 1400,
            width: 1400,
            height: target.scrollHeight, // ใช้ความสูงจริงของหน้าเว็บที่กางสุดแล้ว
            scrollX: 0,
            scrollY: 0
        });

        // --- 3. คืนค่าหน้าเว็บทันที ---
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        window.scrollTo(0, prevScrollY); // คืนตำแหน่ง Scroll กลับที่เดิม
        
        originalStyles.forEach(s => { 
            if (s.action === 'add-class') s.el.classList.add(s.val);
            if (s.action === 'style') {
                s.el.style.maxHeight = s.maxHeight;
                s.el.style.overflow = s.overflow;
                s.el.style.height = s.height;
            }
            if (s.action === 'height-class') {
                s.el.classList.remove('h-auto');
                s.el.classList.add('h-80');
            }
        });

        // --- 4. สร้างเอกสาร PDF (แนวตั้ง A4) ---
        const PDF_W = 210;   
        const PDF_H = 297;   
        const MARGIN = 10;    
        const CONTENT_W = PDF_W - (MARGIN * 2);
        const CONTENT_H = PDF_H - (MARGIN * 2);

        const imgW = canvas.width;
        const imgH = canvas.height;
        const ratio = CONTENT_W / imgW;
        const scaledW = imgW * ratio;
        const xOffset = MARGIN + ((CONTENT_W - scaledW) / 2);

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const filterLabel = [
            'Team: ' + rFilters.team,
            'Year: ' + rFilters.year,
            'Month: ' + rFilters.month
        ].join('  |  ');
        const exportDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const pxPerPage = (CONTENT_H / ratio);   
        const totalPages = Math.ceil(imgH / pxPerPage);

        // --- 5. ตัดภาพและแบ่งหน้า ---
        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();

            const srcY = Math.round(page * pxPerPage);
            const srcH = Math.min(pxPerPage, imgH - srcY);

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = imgW;
            sliceCanvas.height = Math.round(srcH);
            
            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, imgW, Math.round(srcH));
            ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, Math.round(srcH));
            
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
            const sliceHmm = srcH * ratio;     

            pdf.addImage(sliceData, 'JPEG', xOffset, MARGIN, scaledW, sliceHmm, '', 'FAST');

            // ใส่ Header สีเขียว
            pdf.setFillColor(5, 150, 105);   // emerald-600
            pdf.rect(0, 0, PDF_W, 7, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CSI & SLA Report Dashboard', MARGIN, 5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(filterLabel, PDF_W / 2, 5, { align: 'center' });
            pdf.text(exportDate, PDF_W - MARGIN, 5, { align: 'right' });

            // ใส่ Footer
            pdf.setFillColor(248, 250, 252);  
            pdf.rect(0, PDF_H - 6, PDF_W, 6, 'F');
            pdf.setTextColor(100, 116, 139);  
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text('CES Dashboard System — Confidential', MARGIN, PDF_H - 2);
            pdf.text(`Page ${page + 1} of ${totalPages}`, PDF_W - MARGIN, PDF_H - 2, { align: 'right' });
        }

        // --- 6. แสดงหน้า Preview ---
        const previewImg = canvas.toDataURL('image/jpeg', 0.8);

        Swal.fire({
            title: 'ตรวจสอบความถูกต้อง (Preview)',
            html: `
                <p class="text-sm mb-3 text-gray-500">ตรวจสอบรายละเอียดรายงาน CSI/SLA ก่อนบันทึก (ภาพจำลองโครงสร้าง)</p>
                <div style="width:100%; height:500px; overflow-y:auto; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:20px; text-align:center;">
                    <img src="${previewImg}" style="max-width:100%; height:auto; box-shadow:0 4px 10px rgba(0,0,0,0.15); background:#fff;">
                </div>
            `,
            width: '1000px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download mr-1"></i> ยืนยันการดาวน์โหลด PDF',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#003DA5', 
            cancelButtonColor: '#C8C9C7',
            customClass: { confirmButton: 'font-bold rounded-xl px-5', cancelButton: 'font-bold rounded-xl px-5' }
        }).then((result) => {
            if (result.isConfirmed) {
                const fileName = `Report_CSI_${rFilters.team}_${rFilters.month}_${rFilters.year}.pdf`;
                pdf.save(fileName);
                Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', text: 'เอกสารถูกดาวน์โหลดเรียบร้อยแล้ว', timer: 2000, showConfirmButton: false });
            }
        });

    } catch (err) {
        console.error('PDF export error:', err);
        Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
        
        // คืนค่า CSS เมื่อเกิด Error (Fallback)
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        window.scrollTo(0, prevScrollY);
        originalStyles.forEach(s => { 
            if (s.action === 'add-class') s.el.classList.add(s.val);
            if (s.action === 'style') { s.el.style.maxHeight = s.maxHeight; s.el.style.overflow = s.overflow; s.el.style.height = s.height; }
            if (s.action === 'height-class') { s.el.classList.remove('h-auto'); s.el.classList.add('h-80'); }
        });
    }
}

// Lightweight reload for Report CSI after chunked upload.
function loadReportCSIOnly(showLoading) {
  const loader = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  if (showLoading && loader) loader.classList.remove('hidden');
  if (showLoading && loadingText) loadingText.innerText = 'Loading Report CSI...';
  google.script.run
    .withSuccessHandler(data => {
      if (loader) loader.classList.add('hidden');
      data = data || { report: [], tickets: [] };
      if (typeof initReport === 'function') initReport(data.report || [], data.tickets || []);
      if (showLoading && window.Swal) Swal.fire({ icon:'success', title:'Report CSI Loaded', text: `${(data.report || []).length} records`, timer:1200, showConfirmButton:false });
    })
    .withFailureHandler(err => {
      if (loader) loader.classList.add('hidden');
      if (window.Swal) Swal.fire('Report CSI Load Error', (err && err.message) ? err.message : String(err), 'error');
    })
    .getReportDataOnly();
}
