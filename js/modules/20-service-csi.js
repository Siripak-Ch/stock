// ============================================================
// 20-service-csi.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

let serviceRawData = [];
let serviceFilteredData = [];
let customerRawData = []; 
let custSortCol = null; 
let custSortAsc = false;

// เริ่มต้นหน้าเว็บที่ปี 2026
let sFilters = { team: 'All', year: '2026', month: 'All', customer: 'All', status: 'All' };
const S_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Target Config
const TEAM_TARGET_CONFIG = {
  'MED': 60,
  'LAB': 30,
  'EHS': 30,
  'TES': 30,
  'All': 150 
};

// Team Mapping
const S_TEAM_MAP = { 
  'Medical Equipment': 'MED', 
  'Lab & Testing': 'LAB', 
  'Environmental Health': 'EHS',
  'TES': 'TES',
  'Technical': 'TES',
  'Technical Engineering Service': 'TES'
};

// Colors
const COLORS = { 
  'MED': '#004aad', 
  'LAB': '#19a7ce', 
  'EHS': '#0fc1a1',
  'TES': '#ffc000', 
  'Other': '#004aad' 
};

const YEARLY_COLORS = {
  'Grand Total': '#ffc000',
  'Commercial': '#E4002B',
  'Network': '#64748b',
};

let serviceCharts = {};

function initService(data) {
    serviceRawData = data || [];
    
    // [ADDED] ดึงข้อมูลรายชื่อลูกค้าจาก Google Apps Script ทันทีที่โหลด
    google.script.run.withSuccessHandler(custData => {
        customerRawData = custData || [];
        renderCustomerList(); 
    }).getCustomerListData();

    populateServiceDropdowns();
    populateCompareDropdowns(); 
    applyServiceFilters();
}

function refreshServiceFilters() {
    sFilters = { team: 'All', year: '2026', month: 'All', customer: 'All', status: 'All' };
    if(document.getElementById('s-filter-year')) document.getElementById('s-filter-year').value = '2026';
    if(document.getElementById('s-filter-month')) document.getElementById('s-filter-month').value = 'All';
    if(document.getElementById('s-filter-customer')) document.getElementById('s-filter-customer').value = 'All';
    if(document.getElementById('s-filter-status')) document.getElementById('s-filter-status').value = 'All';
    applyServiceFilters();
}

function applyServiceFilters() {
    serviceFilteredData = serviceRawData.filter(d => {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
        (sFilters.year === 'All' || String(d.year) === String(sFilters.year)) &&
        (sFilters.month === 'All' || d.monthOnly === sFilters.month) &&
        (sFilters.customer === 'All' || d.customer === sFilters.customer) &&
        (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(d.finished).toLowerCase() === 'yes' : String(d.finished).toLowerCase() !== 'yes'))
    });

    ['All','MED','LAB','EHS','TES'].forEach(t => {
        const idMap = {All:'All', MED:'Med', LAB:'Lab', EHS:'Env', TES:'Tes'};
        const btn = document.getElementById('btn-team-' + idMap[t]);
        if(btn) {
            if(sFilters.team === t) {
                btn.className = "px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#003DA5] shadow-md transform scale-105 transition-all";
            } else {
                btn.className = "px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:bg-white hover:text-indigo-600 transition-all";
            }
        }
    });
    
    // [ADDED] สั่งอัปเดตตาราง Customer List เมื่อเปลี่ยน Filter
    renderCustomerList(); 
    updateServiceUI(serviceFilteredData);
}

// ============================================================== //
// [NEW] ระบบ Customer List & Sorting
// ============================================================== //
function sortCustomerList(col) {
    if (custSortCol === col) custSortAsc = !custSortAsc; 
    else { custSortCol = col; custSortAsc = false; }
    renderCustomerList(); 
}
function renderCustomerList() {
    const tbody = document.getElementById('customer-list-body');
    const badge = document.getElementById('customer-count-badge');
    if (!tbody) return;

    let filteredCustomers = customerRawData.filter(c => {
        const teamShort = S_TEAM_MAP[c.team] || c.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
        (sFilters.year === 'All' || String(c.year) === String(sFilters.year)) &&
        (sFilters.month === 'All' || c.monthOnly === sFilters.month) &&
        (sFilters.customer === 'All' || c.customerType === sFilters.customer) &&
        (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(c.finished).toLowerCase() === 'yes' : String(c.finished).toLowerCase() !== 'yes'));
    });

    if (custSortCol) {
        filteredCustomers.sort((a, b) => {
            let valA = parseFloat(a[custSortCol]) || 0;
            let valB = parseFloat(b[custSortCol]) || 0;
            return custSortAsc ? (valA - valB) : (valB - valA);
        });
    }

    ['s1','s2','s3','s4','s5'].forEach(col => {
        let icon = document.getElementById('icon-sort-' + col);
        if(icon) {
            icon.className = (custSortCol === col) 
                ? (custSortAsc ? "fas fa-sort-up ml-1 text-indigo-500" : "fas fa-sort-down ml-1 text-indigo-500") 
                : "fas fa-sort ml-1 opacity-50 hover:opacity-100";
        }
    });

    let html = '';
    filteredCustomers.forEach(c => {
        const teamShort = S_TEAM_MAP[c.team] || c.team;
        const teamColor = COLORS[teamShort] || '#C8C9C7';
        const formatScore = (val) => { const num = parseFloat(val); return (!isNaN(num) && num > 0) ? num.toFixed(2) : '-'; };
        const getBg = (col) => custSortCol === col ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-gray-600';

        // --- การแก้ไขขั้นเด็ดขาด: ใช้ Flexbox ควบคุมกล่อง และใช้ Span + padding-top เพื่อชดเชย Baseline ของฟอนต์ไทย ---
        html += `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <td class="p-3 align-middle whitespace-nowrap">
                    <div style="background-color: ${teamColor}; color: white; border-radius: 4px; width: 45px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 10px; font-weight: bold; line-height: 1; padding-top: 1.5px;">${teamShort}</span>
                    </div>
                </td>
                <td class="p-3 align-middle text-sm font-semibold text-gray-800 truncate max-w-[200px]" title="${c.customer}">${c.customer}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s1')}">${formatScore(c.s1)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s2')}">${formatScore(c.s2)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s3')}">${formatScore(c.s3)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s4')}">${formatScore(c.s4)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s5')}">${formatScore(c.s5)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="7" class="p-10 text-center text-gray-400">No data available for selected filters</td></tr>';
    if(badge) badge.innerText = `${filteredCustomers.length} Items`;
}
// ============================================================== //

function updateServiceUI(data) {
    const total = data.length;
    const yes = data.filter(d => String(d.finished).toLowerCase() === 'yes').length;
    
    const notFinished = total - yes;
    const finishPct = total > 0 ? ((yes / total) * 100).toFixed(1) + '%' : '0%';
    const notFinishPct = total > 0 ? ((notFinished / total) * 100).toFixed(1) + '%' : '0%';

    let gSum=0, gCnt=0;
    data.forEach(d => { [d.s1, d.s2, d.s3, d.s4, d.s5].forEach(v => { if(v > 0) { gSum += v; gCnt++; } }); });
    const avg = gCnt > 0 ? (gSum / gCnt).toFixed(2) : "0.00";

    if(document.getElementById('s-total')) document.getElementById('s-total').innerText = total;
    if(document.getElementById('s-finish')) document.getElementById('s-finish').innerText = yes;
    if(document.getElementById('s-finish-pct')) document.getElementById('s-finish-pct').innerText = finishPct;
    if(document.getElementById('s-notfinish')) document.getElementById('s-notfinish').innerText = notFinished;
    if(document.getElementById('s-notfinish-pct')) document.getElementById('s-notfinish-pct').innerText = notFinishPct;
    if(document.getElementById('s-avg')) document.getElementById('s-avg').innerText = avg;
    if(document.getElementById('s-pct')) document.getElementById('s-pct').innerText = ((avg / 5) * 100).toFixed(1) + '%';

    const targetTeams = sFilters.team === 'All' ? ['MED', 'LAB', 'EHS', 'TES'] : [sFilters.team];
    const yearTarget = targetTeams.reduce((sum, t) => sum + ((TEAM_TARGET_CONFIG[t] || 0) * 12), 0);
    const achievedPct = yearTarget > 0 ? ((yes / yearTarget) * 100).toFixed(1) : 0;
    
    if(document.getElementById('s-achieved')) document.getElementById('s-achieved').innerText = achievedPct + '%';
    if(document.getElementById('s-target-desc')) document.getElementById('s-target-desc').innerText = `Target: ${yearTarget}/yr`;

    updateAnalysisSection();
    renderServiceCharts(data);
    renderSummaryPage();
    renderServiceComments(data);
}

function renderServiceCharts(data) {
    const activeTeams = (sFilters.team && sFilters.team !== 'All') ? [sFilters.team] : ['MED', 'LAB', 'EHS', 'TES'];
    const months = S_MONTHS;
    const countByTeamMonth = {};
    const targetByTeamMonth = {};

    activeTeams.forEach(t => {
        countByTeamMonth[t] = {};
        targetByTeamMonth[t] = {};
        months.forEach(m => {
            const count = data.filter(d => (S_TEAM_MAP[d.team] || d.team) === t && d.monthOnly === m).length;
            countByTeamMonth[t][m] = count;
            // Show target only where this team has records. This keeps TES from showing Jan-Dec bars
            // when TES_Service_Data only contains May/Jun data.
            targetByTeamMonth[t][m] = count > 0 ? (TEAM_TARGET_CONFIG[t] || 0) : 0;
        });
    });

    const ctxM = document.getElementById('monthlyChart');
    if(ctxM) {
        if(serviceCharts.monthly) serviceCharts.monthly.destroy();

        function drawRoundedBar(ctx, x, y, width, height, radius) {
            if (!height || height < 0) return;
            const r = Math.max(0, Math.min(radius || 4, width / 2, height / 2));
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, r);
                ctx.fill();
                return;
            }
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        }

        const targetBackBarPlugin = {
            id: 'cesServiceTargetBackBar',
            beforeDatasetsDraw(chart) {
                const yScale = chart.scales && chart.scales.y;
                if (!yScale) return;
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
                ctx.strokeStyle = 'rgba(203, 213, 225, 0.95)';
                ctx.lineWidth = 1;

                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const team = String(dataset.label || '').replace(/\s*Actual$/i, '');
                    if (!targetByTeamMonth[team]) return;
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (!meta || meta.hidden) return;
                    (meta.data || []).forEach((bar, index) => {
                        const month = chart.data.labels[index];
                        const target = Number(targetByTeamMonth[team][month] || 0);
                        if (!target) return;
                        const props = bar.getProps ? bar.getProps(['x', 'width'], true) : bar;
                        const base = yScale.getPixelForValue(0);
                        const top = yScale.getPixelForValue(target);
                        const height = Math.max(0, base - top);
                        const width = Math.max(10, (props.width || 12) * 1.65);
                        const x = (props.x || bar.x) - width / 2;
                        drawRoundedBar(ctx, x, top, width, height, 5);
                    });
                });
                ctx.restore();
            }
        };

        const actualDatasets = activeTeams.map(t => ({
            label: t,
            data: months.map(m => countByTeamMonth[t][m]),
            backgroundColor: COLORS[t],
            borderColor: COLORS[t],
            borderWidth: 0,
            borderRadius: 5,
            categoryPercentage: activeTeams.length === 1 ? 0.56 : 0.82,
            barPercentage: activeTeams.length === 1 ? 0.45 : 0.58,
            maxBarThickness: 32,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: -2,
                font: { weight: 'bold', size: 9 },
                color: '#475569',
                formatter: (val) => val > 0 ? val : ''
            }
        }));

        const maxActual = Math.max(0, ...activeTeams.flatMap(t => months.map(m => Number(countByTeamMonth[t][m]) || 0)));
        const maxTarget = Math.max(0, ...activeTeams.flatMap(t => months.map(m => Number(targetByTeamMonth[t][m]) || 0)));
        const maxVal = Math.max(1, maxActual, maxTarget);

        serviceCharts.monthly = new Chart(ctxM, {
            type: 'bar',
            data: { labels: months, datasets: actualDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: false, grid: { display: false }, ticks: { font: { family: 'Prompt', size: 10 } } },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        suggestedMax: Math.ceil(maxVal * 1.18),
                        grid: { color: '#f1f5f9', borderDash: [2, 2] },
                        ticks: { precision: 0, font: { family: 'Prompt', size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: c => {
                                const team = c.dataset.label;
                                const month = c.label;
                                const actual = Number(c.raw || 0);
                                const target = Number((targetByTeamMonth[team] || {})[month] || 0);
                                return ` ${team}: ${actual}${target ? ' / Target ' + target : ''}`;
                            },
                            afterBody: items => {
                                if (!items || !items.length) return '';
                                return 'Grey bar = Monthly target';
                            }
                        }
                    }
                }
            },
            plugins: (typeof ChartDataLabels !== 'undefined') ? [targetBackBarPlugin, ChartDataLabels] : [targetBackBarPlugin]
        });
    }

    const ctxP = document.getElementById('teamPieChart');
    if(ctxP) {
        if(serviceCharts.pie) serviceCharts.pie.destroy();
        const pieTeams = activeTeams;
        serviceCharts.pie = new Chart(ctxP, {
            type: 'doughnut',
            data: {
                labels: pieTeams,
                datasets: [{
                    data: pieTeams.map(t => data.filter(d => (S_TEAM_MAP[d.team]||d.team) === t).length),
                    backgroundColor: pieTeams.map(t => COLORS[t]),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: {size: 11} } },
                    datalabels: {
                        color: '#fff', font: { weight: 'bold', size: 10 },
                        formatter: (v, ctx) => {
                            let sum = 0; ctx.chart.data.datasets[0].data.forEach(d => sum += d);
                            return sum > 0 && v > 0 ? ((v * 100) / sum).toFixed(0) + "%" : '';
                        }
                    }
                }
            },
            plugins: (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : []
        });
    }
}

function renderSummaryPage() {
    if(!serviceRawData.length) return;
    const t = sFilters.team;
    const sumData = serviceRawData.filter(d => {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
               (sFilters.year === 'All' || String(d.year) === String(sFilters.year)) &&
               (sFilters.customer === 'All' || d.customer === sFilters.customer) &&
               (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(d.finished).toLowerCase() === 'yes' : String(d.finished).toLowerCase() !== 'yes'));
    });

    const configRows = (t === 'All') ?
        [{label:'Grand Total', color:YEARLY_COLORS['Grand Total'], filter:()=>true, type:'Total'}, {label:'Commercial', color:YEARLY_COLORS['Commercial'], filter:d=>d.customer==='Commercial', type:'Com'}, {label:'Network', color:YEARLY_COLORS['Network'], filter:d=>d.customer==='Network', type:'Net'}] :
        [{label:t, color:COLORS[t]||YEARLY_COLORS['Grand Total'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t, type:'Total'}, {label:'Commercial', color:YEARLY_COLORS['Commercial'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t && d.customer==='Commercial', type:'Com'}, {label:'Network', color:YEARLY_COLORS['Network'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t && d.customer==='Network', type:'Net'}];
        
    let matrix = {};
    configRows.forEach(r => {
        matrix[r.label] = S_MONTHS.map(m => {
            let subData = sumData.filter(d => d.monthOnly === m && r.filter(d));
            let s=0, c=0;
            subData.forEach(d => { [d.s1, d.s2, d.s3, d.s4, d.s5].forEach(v=>{if(v>0){s+=v;c++}}) });
            return c>0 ? (s/c) : 0;
        });
    });

    const tbody = document.getElementById('summaryTableBody');
    if(tbody) {
        let html = '';
        configRows.forEach(r => {
            let ySum=0, yCnt=0;
            const rowBgColor = r.type === 'Total' ? 'bg-gray-50/50' : (r.type === 'Com' ? 'bg-blue-50/30' : 'bg-blue-50/30');
            let scoreCells = matrix[r.label].map(v => {
                if(v > 0) { ySum+=v; yCnt++; return `<td class="p-2 text-center font-medium text-gray-500 text-xs border-r border-white">${v.toFixed(2)}</td>`; }
                return `<td class="p-2 text-center text-gray-200 border-r border-white">-</td>`;
            }).join('');
            const pctColorClass = r.type === 'Com' ? 'text-blue-400' : (r.type === 'Net' ? 'text-[#003DA5]' : 'text-gray-400');
            let pctCells = matrix[r.label].map(v => {
                if(v > 0) return `<td class="p-1 text-center font-semibold ${pctColorClass} text-[10px] opacity-80 border-r border-white">${(v/5*100).toFixed(0)}%</td>`;
                return `<td class="p-1 text-center text-gray-200 border-r border-white">-</td>`;
            }).join('');
            const yAvg = yCnt > 0 ? (ySum/yCnt) : 0;
            html += `<tr class="border-t border-white ${rowBgColor}"><td rowspan="2" class="p-3 font-bold border-r border-white text-sm" style="color:${r.color}">${r.label}</td>${scoreCells}<td class="p-2 text-center font-bold bg-gray-50 text-gray-700 text-xs">${yAvg > 0 ? yAvg.toFixed(2) : '-'}</td></tr><tr class="border-b border-gray-100 ${rowBgColor}">${pctCells}<td class="p-1 text-center font-bold ${pctColorClass} text-[10px] bg-gray-50/50">${yAvg > 0 ? (yAvg/5*100).toFixed(1)+'%' : '-'}</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    const ctxSum = document.getElementById('summaryLineChart');
    if(ctxSum) {
        if(serviceCharts.summary) serviceCharts.summary.destroy();
        serviceCharts.summary = new Chart(ctxSum, {
            type: 'line',
            data: { 
                labels: S_MONTHS, 
                datasets: [
                    ...configRows.map(r => ({
                        label: r.label, 
                        data: matrix[r.label].map(v => v>0?(v/5)*100:null), 
                        borderColor: r.color, 
                        backgroundColor: r.color, 
                        borderWidth: 2.5, 
                        tension: 0.3, 
                        spanGaps: true, 
                        pointBackgroundColor: '#fff', 
                        pointRadius: 3
                    })),
                    {
                        label: 'Target 95%',
                        data: Array(12).fill(95),
                        borderColor: '#E4002B', 
                        borderWidth: 2,
                        borderDash: [5, 5], 
                        pointRadius: 0,
                        fill: false,
                        order: 0
                    }
                ] 
            },
            options: { 
                responsive:true, 
                maintainAspectRatio:false, 
                scales:{ 
                    y:{ 
                        min:60, max:105, 
                        ticks:{ stepSize: 10, callback: v => v <= 100 ? v+'%' : '', font:{size:10} }, 
                        grid:{color:'#f1f5f9'} 
                    }, 
                    x:{ grid:{display:false}, ticks:{font:{size:10}} } 
                }, 
                plugins: { 
                    legend:{ labels:{boxWidth:12, font:{size:11}} }, 
                    tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.parsed.y ? c.parsed.y.toFixed(1) + '%' : '-') } },
                    datalabels: { display: false }
                } 
            }
        });
    }
}

function renderServiceComments(filteredData) {
    const boxes = {'MED': 'comm-med', 'LAB': 'comm-lab', 'EHS': 'comm-env', 'TES': 'comm-tes'};
    Object.values(boxes).forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = ''; });
    const dataToRender = filteredData || serviceFilteredData;
    dataToRender.forEach(d => {
        try {
            const team = S_TEAM_MAP[d.team] || d.team;
            const comms = JSON.parse(d.comments || "[]");
            if(comms.length && boxes[team]) {
                const styleClass = team === 'MED' ? 'border-l-blue-600' : (team === 'LAB' ? 'border-l-cyan-500' : (team === 'EHS' ? 'border-l-[#0fc1a1]' : 'border-l-[#ffc000]'));
                comms.forEach(c => {
                    const html = `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 border-l-4 ${styleClass} mb-2 transition-all hover:shadow-md">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${d.monthOnly} • ${d.year}</span>
                            <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">${c.topic}</span>
                        </div>
                        <p class="text-xs text-gray-700 italic leading-relaxed">"${c.text}"</p>
                        <div class="text-[10px] text-right text-gray-400 mt-2 border-t border-gray-50 pt-1 font-medium truncate">
                            <i class="fas fa-user-tag mr-1 opacity-50"></i>${c.customer}
                        </div>
                    </div>`;
                    document.getElementById(boxes[team]).innerHTML += html;
                });
            }
        } catch(e) { console.error('Comment Parse Error', e); }
    });
}

function populateServiceDropdowns() {
    const years = [...new Set(serviceRawData.map(d=>d.year))].filter(y=>y!=='Unknown' && y!==null).sort();
    
    const fill = (id, arr, hasAll=true) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = (hasAll ? '<option value="All">All</option>' : '') + arr.map(x => `<option value="${x}">${x}</option>`).join('');
    };

    fill('s-filter-year', years);
    fill('s-filter-month', S_MONTHS);
    
    const yearEl = document.getElementById('s-filter-year');
    if (yearEl) yearEl.value = sFilters.year; 
}


async function saveServiceRowsStableForGithub(rows, meta, loadingText) {
    rows = Array.isArray(rows) ? rows : [];
    meta = meta || {};
    if (!rows.length) return { total: 0, main: 0, tes: 0, duplicate: 0 };
    if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
        return await window.CES_API.chunkedRows('saveServiceDataArray', rows, meta, {
            maxUrlLength: 5600,
            timeoutMs: 120000,
            onProgress: function (current, total, rowsInChunk) {
                if (loadingText) loadingText.innerText = `Saving Service CSI data... chunk ${current}/${total} (${rowsInChunk} rows)`;
            }
        });
    }
    if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
        return await window.CES_API.callFunction('saveServiceDataArray', [rows, meta], { transport: 'iframe', timeoutMs: 150000 });
    }
    return await new Promise((resolve, reject) => {
        google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .saveServiceDataArray(rows, meta);
    });
}

function handleServiceUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').innerText = "Processing Service File...";
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, {defval: ""}) : [];
            if (!jsonData.length) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
            processServiceUpload(jsonData, { fileName: file.name || '' });
        } catch (err) {
            alert("Error: " + err.message);
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    };
    reader.readAsArrayBuffer(file);
}

function processServiceUpload(jsonData, meta) {
    meta = meta || {};
    const uploadFileName = meta.fileName || '';
    const forceTESByFile = /(^|[^a-z])(tes|technical)([^a-z]|$)/i.test(uploadFileName) || String(uploadFileName).toLowerCase().includes('export-tes_tes');
    if(!jsonData || jsonData.length === 0) { 
        document.getElementById('loadingOverlay').classList.add('hidden');
        return; 
    }
    const headers = Object.keys(jsonData[0]);
    const findKey = (k) => headers.find(h => h.toLowerCase().includes(k.toLowerCase()));
    const K = {
        id: findKey('response id') || 'Response ID',
        ts: findKey('timestamp') || findKey('วันที่'),
        fin: findKey('finished'),
        place: findKey('สถานที่') || findKey('customer') || '2.',
        service: findKey('services') || '4.',
        s1: headers.filter(h => h.includes('ส่วนที่ 1') && !h.includes('แนะนำ')),
        s2: headers.filter(h => h.includes('ส่วนที่ 2') && !h.includes('แนะนำ')),
        s3: headers.filter(h => h.includes('ส่วนที่ 3') && !h.includes('แนะนำ')),
        s4: headers.filter(h => h.includes('ส่วนที่ 4') && !h.includes('แนะนำ')),
        s5: headers.filter(h => h.includes('ความประทับใจ') || h.includes('ส่วนที่ 5')),
        comments: headers.filter(h => h.includes('ข้อเสนอแนะ') || h.includes('เพิ่มเติม') || h.includes('suggestion'))
    };
    const dataArray = jsonData.map(row => {
        const idVal = row[K.id]; if(!idVal) return null;
        const custName = String(row[K.place]||"");
        if (custName.toLowerCase().includes('test') || custName.includes('Aa')) return null;
        const tsVal = row[K.ts];
        let dateObj = null;
        if(tsVal && !isNaN(tsVal) && tsVal > 20000) dateObj = new Date((tsVal - 25569) * 86400 * 1000); 
        else if(tsVal) dateObj = new Date(tsVal);
        let mStr = "Unknown", yStr = "Unknown";
        if(dateObj && !isNaN(dateObj.getTime())) { 
            mStr = S_MONTHS[dateObj.getMonth()]; 
            yStr = String(dateObj.getFullYear()); 
        }
        let team = 'Other';
        let sRaw = String(row[K.service]||"").toLowerCase();
        if(sRaw.includes('medical')) team = 'Medical Equipment';
        else if(sRaw.includes('lab')) team = 'Lab & Testing';
        else if(sRaw.includes('environmental') || sRaw.includes('health')) team = 'Environmental Health';
        else if(sRaw.includes('tes') || sRaw.includes('technical') || forceTESByFile || sFilters.team === 'TES') team = 'TES';
        if(forceTESByFile || sFilters.team === 'TES') team = 'TES';
        const calcAvg = (keys) => { 
            let s=0,c=0;
            keys.forEach(k=>{ const v=parseFloat(row[k]); if(!isNaN(v)){s+=v;c++} });
            return c>0?s/c:0; 
        };
        let comms = [];
        K.comments.forEach(k => { 
            const txt = String(row[k] || "").trim();
            if(txt.length > 2 && txt !== '-') comms.push({topic:"Feedback", text:txt.substring(0, 900), customer:(custName||"Unknown").substring(0, 180)}); 
        });
        return [
            idVal, 
            dateObj ? dateObj.toLocaleString('en-US',{month:'long'}) : mStr, 
            mStr, 
            yStr, 
            String(row[K.fin] || "No").trim(), 
            team, 
            String(row[findKey('ประเภท')]||"").toLowerCase().includes('network') ? 'Network' : 'Commercial', 
            calcAvg(K.s1), 
            calcAvg(K.s2), 
            calcAvg(K.s3), 
            calcAvg(K.s4), 
            calcAvg(K.s5), 
            JSON.stringify(comms), 
            row[K.service]||"General",
            custName 
        ];
    }).filter(d=>d!==null);

    const uploadMeta = { fileName: uploadFileName, forceTeam: (forceTESByFile || sFilters.team === 'TES') ? 'TES' : '' };
    const loader = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    (async () => {
        try {
            let result;
            if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
                result = await window.CES_API.chunkedRows('saveServiceDataArray', dataArray, uploadMeta, {
                    maxUrlLength: 5600,
                    timeoutMs: 120000,
                    onProgress: (done, total, rowsInChunk) => {
                        if (loadingText) loadingText.innerText = `Uploading Service CSI... ${done}/${total} batches (${rowsInChunk} rows)`;
                    }
                });
            } else {
                result = await new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .saveServiceDataArray(dataArray, uploadMeta);
                });
            }

            if (loader) loader.classList.add('hidden');
            const summary = (typeof result === 'object')
                ? `Processed ${result.total || 0} records. TES: ${result.tes || 0}, Main: ${result.main || 0}. Batches: ${result.chunks || 1}`
                : `Processed ${result} records.`;
            Swal.fire('Success', summary, 'success');
            if (typeof loadServiceCSIOnly === 'function') loadServiceCSIOnly(true); else loadAllData();
        } catch (err) {
            if (loader) loader.classList.add('hidden');
            Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
    })();
}

window.setSFilter = (k, v) => { sFilters[k] = v; applyServiceFilters(); };

// ============================================================== //
// วางโค้ดส่วน Compare แบบใหม่ (รองรับ Default 2025 vs 2026)
// ============================================================== //
let manualCompareEnabled = false;

function populateCompareDropdowns() {
    let y1 = document.getElementById("compare-p1-year");
    let m1 = document.getElementById("compare-p1-month");
    let y2 = document.getElementById("compare-p2-year");
    let m2 = document.getElementById("compare-p2-month");
    if(!y1 || !m1 || !y2 || !m2) return;
    
    let years = [...new Set(serviceRawData.map(d=>d.year))].filter(y=>y!=='Unknown' && y!==null).sort();
    
    let yearHtml = '<option value="All">Year</option>';
    years.forEach(y => yearHtml += `<option value="${y}">${y}</option>`);
    
    let monthHtml = '<option value="All">Month</option>';
    S_MONTHS.forEach(m => monthHtml += `<option value="${m}">${m}</option>`);
    
    y1.innerHTML = yearHtml;
    y2.innerHTML = yearHtml;
    m1.innerHTML = monthHtml;
    m2.innerHTML = monthHtml;

    if(!manualCompareEnabled) {
        const currentMonth = S_MONTHS[new Date().getMonth()];
        y1.value = "2025";
        m1.value = currentMonth;
        y2.value = "2026";
        m2.value = currentMonth;
    }
}

function runCustomCompare() {
    manualCompareEnabled = true;
    updateAnalysisSection();
}

function updateAnalysisSection() {
    let p1Year = "All", p1Month = "All";
    let p2Year = "All", p2Month = "All";
    
    let y1 = document.getElementById("compare-p1-year");
    let m1 = document.getElementById("compare-p1-month");
    let y2 = document.getElementById("compare-p2-year");
    let m2 = document.getElementById("compare-p2-month");
    
    const currentMonthName = S_MONTHS[new Date().getMonth()];

    if(!manualCompareEnabled && sFilters.year === 'All') {
        p1Year = "2025"; p2Year = "2026"; p1Month = currentMonthName; p2Month = currentMonthName;
        if(y1) y1.value = p1Year; if(m1) m1.value = p1Month; if(y2) y2.value = p2Year; if(m2) m2.value = p2Month;
    } 
    else if (manualCompareEnabled) {
        p1Year = y1.value; p1Month = m1.value; p2Year = y2.value; p2Month = m2.value;
    }
    else {
        p2Year = String(sFilters.year); p2Month = sFilters.month;
        if (sFilters.year === 'All') {
            p1Year = "All"; p1Month = "All";
        } else {
            if (sFilters.month === 'All') {
                p1Year = String(parseInt(sFilters.year) - 1); p1Month = "All";
            } else {
                let mIdx = S_MONTHS.indexOf(sFilters.month);
                if(mIdx === 0) { p1Month = "Dec"; p1Year = String(parseInt(sFilters.year) - 1); }
                else { p1Month = S_MONTHS[mIdx - 1]; p1Year = sFilters.year; }
            }
        }
        if(y1 && p1Year !== 'All') y1.value = p1Year;
        if(m1 && p1Month !== 'All') m1.value = p1Month;
        if(y2 && p2Year !== 'All') y2.value = p2Year;
        if(m2 && p2Month !== 'All') m2.value = p2Month;
    }

    let lbl1 = (p1Year === "All" && p1Month === "All") ? "All Time" : `${p1Month === "All" ? "" : p1Month + " "}${p1Year}`;
    let lbl2 = (p2Year === "All" && p2Month === "All") ? "All Time" : `${p2Month === "All" ? "" : p2Month + " "}${p2Year}`;

    function filterByPeriod(year, month) {
        if(year === "All" && month === "All") return serviceRawData.filter(d => checkMainFilters(d));
        return serviceRawData.filter(d => {
            if(!checkMainFilters(d)) return false;
            if(year !== 'All' && String(d.year) !== year) return false;
            if(month !== 'All' && d.monthOnly !== month) return false;
            return true;
        });
    }

    function checkMainFilters(d) {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        if(sFilters.team !== 'All' && teamShort !== sFilters.team) return false;
        if(sFilters.customer !== 'All' && d.customer !== sFilters.customer) return false;
        if(sFilters.status !== 'All') {
           const isYes = String(d.finished).toLowerCase() === 'yes';
           if (sFilters.status === 'Yes' && !isYes) return false;
           if (sFilters.status === 'No' && isYes) return false;
        }
        return true;
    }

    let data1 = filterByPeriod(p1Year, p1Month);
    let data2 = filterByPeriod(p2Year, p2Month);

    function getScoreAvg(dataArr, field) {
        let sum = 0, count = 0;
        dataArr.forEach(d => { let v = parseFloat(d[field]); if(!isNaN(v) && v>0){sum+=v; count++;} });
        return count > 0 ? (sum / count) : 0;
    }

    let fields = ['s1', 's2', 's3', 's4', 's5'];
    let scores1 = fields.map(f => getScoreAvg(data1, f));
    let scores2 = fields.map(f => getScoreAvg(data2, f));
    
    let criteriaLabels = ["Service Staff", "Process", "Quality", "Product", "Overall Satisfy"];
    let shortLabels = ["Staff", "Process", "Quality", "Product", "Overall"];
    
    let tbodyHtml = "";
    for(let i = 0; i < 5; i++) {
        let c = scores2[i];
        let p = scores1[i];
        let diff = c - p;
        let colorClass = "text-gray-500 bg-gray-50";
        let diffText = "-";
        
        if(p !== 0 && c !== 0) {
            let pct = (diff / p) * 100; // สูตรคำนวณ % Growth
            diffText = (diff > 0 ? '+' : '') + diff.toFixed(2) + " (" + (pct > 0 ? '+' : '') + pct.toFixed(1) + "%)";
            if(diff > 0) colorClass = "text-[#003DA5] bg-blue-50";
            else if(diff < 0) colorClass = "text-[#E4002B] bg-red-50";
        }

        tbodyHtml += `
        <tr class="hover:bg-blue-50/20 transition-colors border-b border-gray-100 last:border-0">
            <td class="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">${criteriaLabels[i]}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-500">${p===0 ? '-' : p.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-800">${c===0 ? '-' : c.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-bold">
                <span class="px-2 py-1 rounded text-[10px] ${colorClass}">${diffText}</span>
            </td>
        </tr>`;
    }
    
    const tBodyEl = document.getElementById("growth-table-body");
    if(tBodyEl) tBodyEl.innerHTML = tbodyHtml;
    if(document.getElementById("th-prev-period")) document.getElementById("th-prev-period").innerText = lbl1;
    if(document.getElementById("th-curr-period")) document.getElementById("th-curr-period").innerText = lbl2;

    const canvas = document.getElementById('scoreAnalysisChart');
    if(!canvas) return;
    if(serviceCharts.analysis) serviceCharts.analysis.destroy();
    
    let allValidScores = [...scores1, ...scores2].filter(v => v > 0);
    let minScore = 0;
    if(allValidScores.length > 0) {
        minScore = Math.floor(Math.min(...allValidScores) * 10) / 10;
        minScore = Math.max(0, Math.min(3.5, minScore - 0.2)); 
    }

    serviceCharts.analysis = new Chart(canvas.getContext('2d'), {
        data: {
            labels: shortLabels,
            datasets: [
                {
                    type: 'line',
                    label: lbl2 + ' (Trend)',
                    data: scores2,
                    borderColor: '#E4002B',
                    backgroundColor: '#E4002B',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2,
                    datalabels: { display: false },
                    order: 0
                },
                {
                    type: 'bar',
                    label: lbl1, 
                    data: scores1,
                    backgroundColor: '#cbd5e1', 
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    order: 1
                },
                {
                    type: 'bar',
                    label: lbl2, 
                    data: scores2,
                    backgroundColor: ['#003da5', '#003DA5', '#004aad', '#5B7F95', '#C8C9C7'],
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { 
                        boxWidth: 12, 
                        usePointStyle: true, 
                        font: {family: 'Prompt'},
                        generateLabels: function(chart) {
                            return [
                                { text: lbl1, fillStyle: '#cbd5e1', strokeStyle: '#cbd5e1' },
                                { text: lbl2, fillStyle: '#004aad', strokeStyle: '#004aad' },
                                { text: 'Trend', fillStyle: '#E4002B', strokeStyle: '#E4002B'}
                            ];
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: val => val > 0 ? val.toFixed(2) : '', 
                    font: { size: 10, family: 'Prompt', weight: 'bold' },
                    color: '#475569'
                }
            },
            scales: {
                y: { 
                    min: minScore, 
                    max: 5.1, 
                    ticks: { 
                        font: {family: 'Prompt'},
                        stepSize: 0.2
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: {family: 'Prompt', size: 10} },
                    grid: { display: false }
                }
            }
        }
    });
}
/**
 * ฟังก์ชันสำหรับ Export ข้อมูล Service CSI ทั้งหมดเป็น Excel
 * ดึงข้อมูลจากตัวแปร serviceFilteredData ที่ผ่านการกรองแล้ว
 */
function exportServiceToExcel() {
    if (!serviceFilteredData || serviceFilteredData.length === 0) {
        Swal.fire('No Data', 'ไม่พบข้อมูลที่ต้องการส่งออก', 'warning');
        return;
    }

    // เตรียมข้อมูลสำหรับไฟล์ Excel
    const exportData = serviceFilteredData.map(row => ({
        'Timestamp': row.timestamp || '',
        'Month': row.monthOnly || '',
        'Year': row.year || '',
        'Finished': row.finished || '',
        'Team': row.team || '',
        'Customer Type': row.customer || '',
        'Customer Name': row.customerName || '',
        'S1 (Staff)': row.s1 || 0,
        'S2 (Process)': row.s2 || 0,
        'S3 (Quality)': row.s3 || 0,
        'S4 (Product)': row.s4 || 0,
        'S5 (Overall)': row.s5 || 0,
        'Comments': row.comment || ''
    }));

    // สร้าง Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service_CSI_Data");

    // กำหนดชื่อไฟล์ตาม Filter ปัจจุบัน
    const fileName = `Service_CSI_${sFilters.team}_${sFilters.month}_${sFilters.year}.xlsx`;

    // ดาวน์โหลดไฟล์
    XLSX.writeFile(workbook, fileName);
}

// แก้ไขฟังก์ชัน applySFilters เดิมให้รองรับการเปลี่ยนสีปุ่มธีมเดียวกันทั้งหมด (ถ้ามี)
// หรือตรวจสอบว่า CSS/Class ของปุ่ม Team มีการเรียกใช้ธีมสีฟ้าอย่างถูกต้อง
function updateTeamButtonUI() {
    const teams = ['All', 'Med', 'Lab', 'Env', 'Tes'];
    teams.forEach(t => {
        const btn = document.getElementById('btn-team-' + t);
        if(!btn) return;
        const isActive = (sFilters.team === (t==='Med'?'MED':t==='Lab'?'LAB':t==='Env'?'EHS':t==='Tes'?'TES':'All'));
        
        if(isActive) {
            btn.className = "px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 shadow-md transform scale-105 transition-all";
        } else {
            btn.className = "px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:bg-white hover:text-blue-600 transition-all";
        }
    });
}

async function exportServiceToPDF() {
    // --- 0. Guard: libraries must be loaded ---
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        Swal.fire('Missing Library', 'html2canvas or jsPDF did not load. Check your CDN scripts.', 'error');
        return;
    }
    const { jsPDF } = window.jspdf;

    // --- 1. แสดง Loading ---
    Swal.fire({
        title: 'กำลังเตรียมหน้า Preview...',
        html: 'ระบบกำลังประมวลผลและจัดหน้ากระดาษ กรุณารอสักครู่...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const target = document.getElementById('view-service');

    // --- 2. จัดการ CSS ชั่วคราวเพื่อ Capture ---
    const scrollWrappers = target.querySelectorAll('.pdf-expand');
    const originalStyles = [];
    scrollWrappers.forEach(el => {
        originalStyles.push({
            el,
            height:    el.style.height,
            maxHeight: el.style.maxHeight,
            overflow:  el.style.overflow
        });
        el.style.height    = 'auto';
        el.style.maxHeight = 'none';
        el.style.overflow  = 'visible';
    });

    // แก้ไข fixed-height ของ Card ที่ครอบอยู่
    const fixedCards = [
        target.querySelector('.h-\\[420px\\]'),  // customer list card
        ...target.querySelectorAll('.h-80')        // feedback panels & chart cards
    ].filter(Boolean);
    const cardOriginal = [];
    fixedCards.forEach(el => {
        cardOriginal.push({ el, height: el.style.height });
        el.style.height = 'auto';
    });

    target.classList.add('pdf-capture-mode');

    // ★ ส่วนสำคัญ: บังคับความกว้างให้คงที่ (1400px) เพื่อให้ Layout สมมาตร ไม่ขาด ไม่ล้น
    const originalWidth = target.style.width;
    target.style.width = '1400px';

    // รอให้ DOM จัดเรียงตัวให้เสร็จ
    await new Promise(r => setTimeout(r, 400));

    try {
        // --- 3. Capture หน้าจอ ---
        const canvas = await html2canvas(target, {
            scale:           1.5,          // ใช้ 1.5 เพื่อให้ภาพคมชัดแต่ไฟล์ไม่หนักเกินตอนโหลด Preview
            useCORS:         true,
            allowTaint:      true,
            backgroundColor: '#f8fafc',    
            logging:         false,
            windowWidth:     1400,         // ล็อคให้ตรงกับความกว้างที่เซ็ตไว้
            width:           1400,
            height:          target.scrollHeight,
            scrollX:         0,
            scrollY:         -window.scrollY
        });

        // --- 4. คืนค่า CSS ทันที (เพื่อให้ฉากหลังไม่เพี้ยนตอนแสดง Preview) ---
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        originalStyles.forEach(s => {
            s.el.style.height    = s.height;
            s.el.style.maxHeight = s.maxHeight;
            s.el.style.overflow  = s.overflow;
        });
        cardOriginal.forEach(s => {
            s.el.style.height = s.height;
        });

        // --- 5. สร้าง PDF (A4 Landscape) ---
        const PDF_W   = 297;   
        const PDF_H   = 210;   
        const MARGIN  = 10;    
        const CONTENT_W = PDF_W - (MARGIN * 2);
        const CONTENT_H = PDF_H - (MARGIN * 2);

        const imgW  = canvas.width;
        const imgH  = canvas.height;

        // คำนวณสัดส่วนให้พอดีกับความกว้างของหน้ากระดาษ
        const ratio     = CONTENT_W / imgW;
        const scaledH   = imgH * ratio;   
        const scaledW   = imgW * ratio;
        
        // จัดให้อยู่กึ่งกลางหน้ากระดาษพอดี
        const xOffset = MARGIN + ((CONTENT_W - scaledW) / 2);

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const filterLabel = [
            'Team: ' + sFilters.team,
            'Year: ' + sFilters.year,
            'Month: ' + sFilters.month,
            'Customer: ' + sFilters.customer
        ].join('  |  ');
        const exportDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const pxPerPage = (CONTENT_H / ratio);   
        const totalPages = Math.ceil(imgH / pxPerPage);

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();

            const srcY = Math.round(page * pxPerPage);
            const srcH = Math.min(pxPerPage, imgH - srcY);

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width  = imgW;
            sliceCanvas.height = Math.round(srcH);
            
            // เติมพื้นหลังสีขาวกันภาพโปร่งใส
            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, imgW, Math.round(srcH));
            ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, Math.round(srcH));
            
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
            const sliceHmm  = srcH * ratio;     

            // แปะรูปลง PDF
            pdf.addImage(sliceData, 'JPEG', xOffset, MARGIN, scaledW, sliceHmm, '', 'FAST');

            // ใส่ Header สีน้ำเงิน
            pdf.setFillColor(30, 58, 138);   
            pdf.rect(0, 0, PDF_W, 7, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Service CSI Dashboard', MARGIN, 5);
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

       // --- 6. แสดง Preview ด้วย SweetAlert2 (เปลี่ยนเป็น Image เพื่อป้องกัน Chrome Block) ---
        // แปลงภาพ canvas ที่ได้จากการแคปหน้าจอมาแสดงเป็น Preview 
        const previewImg = canvas.toDataURL('image/jpeg', 0.8);

        Swal.fire({
            title: 'ตรวจสอบความถูกต้อง (Preview)',
            html: `
                <p class="text-sm mb-3 text-gray-500">กรุณาตรวจสอบรายละเอียดความเรียบร้อยก่อนดาวน์โหลดเอกสาร (ภาพจำลองโครงสร้าง)</p>
                <div style="width:100%; height:500px; overflow-y:auto; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:20px; text-align:center;">
                    <img src="${previewImg}" style="max-width:100%; height:auto; box-shadow:0 4px 10px rgba(0,0,0,0.15); background:#fff;">
                </div>
            `,
            width: '1000px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download mr-1"></i> ยืนยันการดาวน์โหลด PDF',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#004aad', 
            cancelButtonColor: '#C8C9C7',
            customClass: {
                confirmButton: 'font-bold rounded-xl px-5',
                cancelButton: 'font-bold rounded-xl px-5'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // หากกดยืนยัน ให้ดาวน์โหลดไฟล์ PDF ตัวจริง
                const fileName = `Service_CSI_${sFilters.team}_${sFilters.month}_${sFilters.year}.pdf`;
                pdf.save(fileName);
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ!',
                    text: 'เอกสารถูกดาวน์โหลดเรียบร้อยแล้ว',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });

    } catch (err) {
        console.error('PDF export error:', err);
        Swal.fire('Export Failed', err.message || 'เกิดข้อผิดพลาดขณะสร้าง PDF', 'error');
        
        // คืนค่า CSS ในกรณีที่มี Error เกิดขึ้นระหว่างทาง
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        originalStyles.forEach(s => { s.el.style.height = s.height; s.el.style.maxHeight = s.maxHeight; s.el.style.overflow = s.overflow; });
        cardOriginal.forEach(s => { s.el.style.height = s.height; });
    }
}


/* ============================================================
   V23 Recovery Guard — ensure Service CSI reloads data if V22 stale JS cached
============================================================ */
function serviceV23ReloadData() {
  Swal.fire({title:'Reloading Service CSI...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()});
  google.script.run
    .withSuccessHandler(data => {
      serviceRawData = data || [];
      google.script.run.withSuccessHandler(cust => {
        customerRawData = cust || [];
        populateServiceDropdowns();
        populateCompareDropdowns();
        applyServiceFilters();
        Swal.close();
      }).getCustomerListData();
    })
    .withFailureHandler(err => Swal.fire('Service Load Error', err.message, 'error'))
    .getServiceDataOnly();
}

// ==============================================================
// V8 override: Service CSI Excel upload
// Fixes blank Formbricks rows being saved as Team = Other and uses
// a single fast backend POST instead of many small JSONP chunks.
// ==============================================================
function processServiceUpload(jsonData, meta) {
    meta = meta || {};
    const uploadFileName = meta.fileName || '';
    const lowerFile = String(uploadFileName || '').toLowerCase();
    const activeTeam = String((typeof sFilters !== 'undefined' && sFilters.team) ? sFilters.team : 'All').toUpperCase();
    const forceTESByFile = /(^|[^a-z])(tes|technical)([^a-z]|$)/i.test(uploadFileName) || lowerFile.includes('export-tes_tes');
    const forceTeam = (forceTESByFile || activeTeam === 'TES') ? 'TES' : '';

    const loader = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (!jsonData || !jsonData.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('Upload failed', 'ไม่พบข้อมูลในไฟล์ Excel', 'error');
        return;
    }

    const headers = Object.keys(jsonData[0] || {});
    const norm = v => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const hasHeader = (h, words) => words.every(w => norm(h).includes(norm(w)));
    const findHeader = (...checks) => headers.find(h => checks.some(c => {
        if (c instanceof RegExp) return c.test(String(h || ''));
        if (Array.isArray(c)) return hasHeader(h, c);
        return norm(h).includes(norm(c));
    }));
    const findNotOption = (...checks) => headers.find(h => {
        const hn = norm(h);
        if (hn.includes('option id') || hn.includes('internal')) return false;
        return checks.some(c => c instanceof RegExp ? c.test(String(h || '')) : hn.includes(norm(c)));
    });

    const K = {
        id: findNotOption('response id') || 'Response ID',
        // Service date must be used for KPI month; Timestamp is only fallback.
        serviceDate: findNotOption(/วันที่เข้ารับบริการ/i, 'service date', 'date of service', 'วันที่รับบริการ'),
        timestamp: findNotOption('timestamp'),
        fin: findNotOption('finished') || 'Finished',
        place: findNotOption(/สถานที่รับบริการ/i, 'customer name', 'site', 'hospital', 'สถานที่'),
        customerType: findNotOption(/ประเภทลูกค้า/i, 'customer type'),
        service: findNotOption(/services\s*ที่ใช้บริการ/i, /service\s*used/i, 'services ที่ใช้บริการ', 'services'),
        s1: headers.filter(h => String(h).includes('ส่วนที่ 1') && !String(h).includes('แนะนำ') && !norm(h).includes('option id')),
        s2: headers.filter(h => String(h).includes('ส่วนที่ 2') && !String(h).includes('แนะนำ') && !norm(h).includes('option id')),
        s3: headers.filter(h => String(h).includes('ส่วนที่ 3') && !String(h).includes('แนะนำ') && !norm(h).includes('option id')),
        s4: headers.filter(h => String(h).includes('ส่วนที่ 4') && !String(h).includes('แนะนำ') && !norm(h).includes('option id')),
        s5: headers.filter(h => (String(h).includes('ความประทับใจ') || String(h).includes('ส่วนที่ 5')) && !String(h).includes('แนะนำ') && !norm(h).includes('option id')),
        comments: headers.filter(h => (String(h).includes('ข้อเสนอแนะ') || String(h).includes('เพิ่มเติม') || norm(h).includes('suggestion') || norm(h).includes('comment')) && !norm(h).includes('option id'))
    };

    function parseExcelDate(v) {
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        if (typeof v === 'number' || (/^\d+(\.\d+)?$/.test(String(v || '').trim()))) {
            const n = Number(v);
            if (n > 20000) return new Date(Math.round((n - 25569) * 86400 * 1000));
        }
        const s = String(v || '').trim();
        if (!s) return null;
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d;
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
            let y = Number(m[3]);
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            const dd = new Date(y, Number(m[2]) - 1, Number(m[1]));
            return isNaN(dd.getTime()) ? null : dd;
        }
        return null;
    }

    function scoreAvg(row, keys) {
        let s = 0, c = 0;
        (keys || []).forEach(k => {
            const v = parseFloat(row[k]);
            if (!isNaN(v) && isFinite(v)) { s += v; c += 1; }
        });
        return c ? s / c : 0;
    }

    function hasAnyScore(scores) {
        return scores.some(v => Number(v) > 0);
    }

    function detectTeam(rawService) {
        const s = norm(rawService);
        if (!s && forceTeam) return forceTeam;
        if (s.includes('medical') || s.includes('cal-med') || s.includes('เครื่องมือแพทย์')) return 'MED';
        if (s.includes('lab') || s.includes('testing') || s.includes('ห้องปฏิบัติการ')) return 'LAB';
        if (s.includes('environmental') || s.includes('environment') || s.includes('health') || s.includes('ehs') || s.includes('env') || s.includes('สิ่งแวดล้อม')) return 'EHS';
        if (s.includes('tes') || s.includes('technical') || s.includes('engineering')) return 'TES';
        return forceTeam || '';
    }

    const seenInFile = new Set();
    let skippedBlank = 0;
    let skippedOther = 0;
    let skippedDuplicateInFile = 0;

    const dataArray = jsonData.map(row => {
        const idVal = String(row[K.id] || '').trim();
        if (!idVal) return null;
        if (seenInFile.has(idVal)) { skippedDuplicateInFile++; return null; }
        seenInFile.add(idVal);

        const custName = String((K.place ? row[K.place] : '') || '').trim();
        if (custName.toLowerCase().includes('test') || custName === 'Aa') return null;

        const rawService = String((K.service ? row[K.service] : '') || '').trim();
        const team = detectTeam(rawService);
        const scores = [scoreAvg(row, K.s1), scoreAvg(row, K.s2), scoreAvg(row, K.s3), scoreAvg(row, K.s4), scoreAvg(row, K.s5)];
        const anyScore = hasAnyScore(scores);

        // Blank / partial Formbricks rows have no service answer and no CSI score.
        // Do not save them as Other.
        if (!rawService && !forceTeam && !anyScore) { skippedBlank++; return null; }
        if (!team) { skippedOther++; return null; }

        const dateObj = parseExcelDate(K.serviceDate ? row[K.serviceDate] : '') || parseExcelDate(K.timestamp ? row[K.timestamp] : '');
        let mStr = 'Unknown', yStr = 'Unknown', monthFull = 'Unknown';
        if (dateObj && !isNaN(dateObj.getTime())) {
            mStr = S_MONTHS[dateObj.getMonth()];
            monthFull = dateObj.toLocaleString('en-US', { month: 'long' });
            yStr = String(dateObj.getFullYear());
        }

        const customerRaw = String((K.customerType ? row[K.customerType] : '') || '').toLowerCase();
        const customerType = customerRaw.includes('network') || customerRaw.includes('bdms') ? 'Network' : 'Commercial';
        const comments = [];
        (K.comments || []).forEach(k => {
            const txt = String(row[k] || '').trim();
            if (txt.length > 2 && txt !== '-' && txt !== '[]') {
                comments.push({ topic: 'Feedback', text: txt.substring(0, 500), customer: (custName || 'Unknown').substring(0, 120) });
            }
        });

        return [
            idVal,
            monthFull,
            mStr,
            yStr,
            String(row[K.fin] || 'No').trim(),
            team,
            customerType,
            scores[0], scores[1], scores[2], scores[3], scores[4],
            JSON.stringify(comments),
            rawService || team,
            custName
        ];
    }).filter(Boolean);

    if (!dataArray.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No valid rows', `ไม่พบแถวที่มี Service/คะแนน CSI สำหรับนำเข้า\nSkipped blank: ${skippedBlank}, skipped other: ${skippedOther}`, 'warning');
        return;
    }

    const uploadMeta = {
        fileName: uploadFileName,
        forceTeam: forceTeam,
        cleanupInvalid: true,
        source: 'service-csi-v17-stable-github-upload'
    };

    (async () => {
        try {
            if (loadingText) loadingText.innerText = `Preparing ${dataArray.length} valid Service CSI rows...`;
            let result = await saveServiceRowsStableForGithub(dataArray, uploadMeta, loadingText);

            if (loader) loader.classList.add('hidden');
            const summary = (result && typeof result === 'object')
                ? [
                    `Added ${result.total || 0} records`,
                    `Main: ${result.main || 0}`,
                    `TES: ${result.tes || 0}`,
                    `Duplicate: ${result.duplicate || 0}`,
                    `Skipped blank/Other: ${(result.skippedBlank || 0) + (result.skippedOther || 0)}`,
                    `Cleaned old invalid: ${result.cleanedInvalid || 0}`
                  ].join('<br>')
                : `Processed ${result} records.`;
            Swal.fire({ icon: 'success', title: 'Service CSI uploaded', html: summary });
            if (typeof loadServiceCSIOnly === 'function') loadServiceCSIOnly(true); else loadAllData();
        } catch (err) {
            if (loader) loader.classList.add('hidden');
            // Fallback to previous chunked JSONP only if iframe transport is blocked.
            try {
                if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
                    if (loader) loader.classList.remove('hidden');
                    if (loadingText) loadingText.innerText = 'Retrying with safe chunk upload...';
                    const retry = await window.CES_API.chunkedRows('saveServiceDataArray', dataArray, uploadMeta, {
                        maxUrlLength: 9000,
                        timeoutMs: 180000,
                        onProgress: (done, total, rowsInChunk) => {
                            if (loadingText) loadingText.innerText = `Uploading Service CSI... ${done}/${total} batches (${rowsInChunk} rows)`;
                        }
                    });
                    if (loader) loader.classList.add('hidden');
                    Swal.fire('Service CSI uploaded', `Added ${retry.total || 0} records. Batches: ${retry.chunks || 0}`, 'success');
                    if (typeof loadServiceCSIOnly === 'function') loadServiceCSIOnly(true); else loadAllData();
                    return;
                }
            } catch (retryErr) {
                err = retryErr;
            }
            Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
    })();
}

// ============================================================
// V9 Service CSI Upload Mapper
// Reference format:
// - CES export  -> Service_Data
// - TES export  -> TES_Service_Data
// Exact Formbricks column mapping, skip incomplete/blank responses,
// and avoid saving Team = Other.
// ============================================================
function processServiceUpload(jsonData, meta) {
    meta = meta || {};
    const loader = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const uploadFileName = String(meta.fileName || '').trim();
    if (loader) loader.classList.remove('hidden');
    if (loadingText) loadingText.innerText = 'Mapping Service CSI file...';

    const rows = Array.isArray(jsonData) ? jsonData : [];
    if (!rows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No data', 'ไม่พบข้อมูลในไฟล์ Excel', 'warning');
        return;
    }

    const headers = Object.keys(rows[0] || {});
    const text = v => String(v == null ? '' : v).trim();
    const lower = v => text(v).toLowerCase();
    const cleanHeader = h => text(h).replace(/\s+/g, ' ');
    const hasHeader = keyword => headers.some(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
    const findKey = (...keywords) => {
        for (const keyword of keywords) {
            const k = headers.find(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
            if (k) return k;
        }
        return '';
    };
    const fileLower = lower(uploadFileName);
    const isTESFile = fileLower.includes('export-tes') || fileLower.includes('tes_') || (!hasHeader('Services ที่ใช้บริการ') && hasHeader('ด้านการออกใบรายงาน'));
    const fileType = isTESFile ? 'TES' : 'CES';
    const forceTeam = isTESFile || sFilters.team === 'TES' ? 'TES' : '';

    const K = {
        id: findKey('response id'),
        timestamp: findKey('timestamp'),
        serviceDate: findKey('วันที่เข้ารับบริการ'),
        finished: findKey('finished'),
        place: findKey('สถานที่รับบริการ'),
        customerType: findKey('ประเภทลูกค้า'),
        service: isTESFile ? '' : findKey('services ที่ใช้บริการ', 'services')
    };

    function questionHeaders(sectionNo) {
        const sectionText = 'ส่วนที่ ' + sectionNo;
        return headers.filter(h => {
            const s = cleanHeader(h);
            return s.includes(sectionText) &&
                !s.includes('ความคิดเห็น') &&
                !s.includes('ข้อเสนอแนะ') &&
                !s.includes('แนะนำ') &&
                !s.toLowerCase().includes('option id');
        });
    }

    // CES: S1 staff, S2 process, S3 efficiency/quality, S4 product/service, S5 overall
    // TES: S1 staff, S2 process, S3 product/service, S4 report issuing, S5 overall
    const scoreKeys = {
        s1: questionHeaders(1),
        s2: questionHeaders(2),
        s3: questionHeaders(3),
        s4: questionHeaders(4),
        s5: headers.filter(h => cleanHeader(h).includes('ความประทับใจ') && !cleanHeader(h).includes('ความคิดเห็น') && !cleanHeader(h).includes('แนะนำ'))
    };

    const commentKeys = headers.filter(h => {
        const s = cleanHeader(h);
        return s && (s.includes('ความคิดเห็นเพิ่มเติม') || s.includes('ข้อเสนอแนะ') || s.toLowerCase().includes('suggestion'));
    });

    function parseExcelDate(v) {
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        const raw = text(v);
        if (!raw) return null;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 20000 && n < 80000) {
            const d = new Date(Math.round((n - 25569) * 86400 * 1000));
            return isNaN(d.getTime()) ? null : d;
        }
        let d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
        const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (m) {
            let y = Number(m[3]);
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            d = new Date(y, Number(m[2]) - 1, Number(m[1]));
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function normalizeFinished(v) {
        const s = lower(v);
        if (['yes','y','true','1','finish','finished','complete','completed','done'].includes(s)) return 'Yes';
        if (['no','n','false','0','not finish','not finished','pending'].includes(s)) return 'No';
        return s ? text(v) : 'No';
    }

    function normalizeCustomerType(v) {
        const s = lower(v);
        if (s.includes('network') || s.includes('bdms')) return 'Network';
        return 'Commercial';
    }

    function detectTeam(rawService) {
        if (forceTeam === 'TES') return 'TES';
        const s = lower(rawService);
        if (!s) return '';
        if (s.includes('medical') || s.includes('cal-med') || s.includes('เครื่องมือแพทย์')) return 'MED';
        if (s.includes('lab') || s.includes('testing') || s.includes('ห้องปฏิบัติการ')) return 'LAB';
        if (s.includes('environmental') || s.includes('environment') || s.includes('health') || s.includes('ehs') || s.includes('env') || s.includes('สิ่งแวดล้อม')) return 'EHS';
        if (s.includes('tes') || s.includes('technical') || s.includes('engineering')) return 'TES';
        return '';
    }

    function avgScore(row, keys) {
        let sum = 0, count = 0;
        (keys || []).forEach(k => {
            const raw = text(row[k]);
            if (raw === '') return;
            const n = Number(raw.replace(/,/g, ''));
            if (Number.isFinite(n)) { sum += n; count += 1; }
        });
        return count ? Number((sum / count).toFixed(6)) : 0;
    }

    function isBadCustomerName(name) {
        const s = lower(name);
        if (!s) return true;
        if (['a','aa','.', '-', 'test', 'เทส', 'ทดสอบ'].includes(s)) return true;
        return s.includes('test') || s.includes('ทดสอบ');
    }

    const seen = new Set();
    let skippedBlank = 0;
    let skippedOther = 0;
    let skippedDuplicateInFile = 0;
    let skippedTest = 0;

    const dataArray = rows.map(row => {
        const id = text(row[K.id]);
        if (!id) { skippedBlank++; return null; }
        if (seen.has(id)) { skippedDuplicateInFile++; return null; }
        seen.add(id);

        const customerName = text(row[K.place]);
        const customerBad = isBadCustomerName(customerName);
        if (lower(customerName).includes('test') || ['aa','test','ทดสอบ'].includes(lower(customerName))) {
            skippedTest++;
            return null;
        }

        const rawService = isTESFile ? 'TES' : text(row[K.service]);
        const team = detectTeam(rawService);
        const scores = [
            avgScore(row, scoreKeys.s1),
            avgScore(row, scoreKeys.s2),
            avgScore(row, scoreKeys.s3),
            avgScore(row, scoreKeys.s4),
            avgScore(row, scoreKeys.s5)
        ];
        const hasScore = scores.some(v => Number(v) > 0);

        if (!team) { skippedOther++; return null; }
        if (!hasScore && !rawService) { skippedBlank++; return null; }
        if (!hasScore && customerBad) { skippedBlank++; return null; }

        const dateObj = parseExcelDate(row[K.serviceDate]) || parseExcelDate(row[K.timestamp]);
        const monthOnly = dateObj ? S_MONTHS[dateObj.getMonth()] : 'Unknown';
        const monthFull = dateObj ? dateObj.toLocaleString('en-US', { month: 'long' }) : 'Unknown';
        const year = dateObj ? String(dateObj.getFullYear()) : 'Unknown';

        const comments = [];
        commentKeys.forEach(k => {
            const val = text(row[k]);
            if (val.length > 2 && val !== '-' && val !== '[]' && !/^\d+(\.\d+)?$/.test(val)) {
                comments.push({ topic: 'Feedback', text: val.substring(0, 700), customer: (customerName || 'Unknown').substring(0, 150) });
            }
        });

        return [
            id,
            monthFull,
            monthOnly,
            year,
            normalizeFinished(row[K.finished]),
            team,
            normalizeCustomerType(row[K.customerType]),
            scores[0], scores[1], scores[2], scores[3], scores[4],
            JSON.stringify(comments),
            rawService || team,
            customerName
        ];
    }).filter(Boolean);

    if (!dataArray.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No valid rows', `ไม่พบแถวที่นำเข้าได้จากไฟล์นี้<br>Skipped blank: ${skippedBlank}<br>Skipped other: ${skippedOther}`, 'warning');
        return;
    }

    const uploadMeta = {
        fileName: uploadFileName,
        fileType: fileType,
        forceTeam: forceTeam,
        cleanupInvalid: false,
        source: 'service-csi-v17-stable-github-upload'
    };

    (async () => {
        try {
            if (loadingText) loadingText.innerText = `Uploading ${dataArray.length} mapped ${fileType} rows...`;
            let result = await saveServiceRowsStableForGithub(dataArray, uploadMeta, loadingText);

            if (loader) loader.classList.add('hidden');
            const summary = (result && typeof result === 'object')
                ? [
                    `File type: ${fileType}`,
                    `Mapped rows: ${dataArray.length}`,
                    `Added: ${result.total || 0}`,
                    `Service_Data: ${result.main || 0}`,
                    `TES_Service_Data: ${result.tes || 0}`,
                    `Duplicate: ${result.duplicate || 0}`,
                    `Skipped: ${skippedBlank + skippedOther + skippedDuplicateInFile + skippedTest}`
                  ].join('<br>')
                : `Processed ${result} records.`;
            Swal.fire({ icon: 'success', title: 'Service CSI uploaded', html: summary });
            if (typeof loadServiceCSIOnly === 'function') loadServiceCSIOnly(true); else loadAllData();
        } catch (err) {
            try {
                if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
                    if (loader) loader.classList.remove('hidden');
                    if (loadingText) loadingText.innerText = 'Retrying with safe chunk upload...';
                    const retry = await window.CES_API.chunkedRows('saveServiceDataArray', dataArray, uploadMeta, {
                        maxUrlLength: 9000,
                        timeoutMs: 180000,
                        onProgress: (done, total, rowsInChunk) => {
                            if (loadingText) loadingText.innerText = `Uploading Service CSI... ${done}/${total} batches (${rowsInChunk} rows)`;
                        }
                    });
                    if (loader) loader.classList.add('hidden');
                    Swal.fire('Service CSI uploaded', `Added ${retry.total || 0} records. Batches: ${retry.chunks || 0}`, 'success');
                    if (typeof loadServiceCSIOnly === 'function') loadServiceCSIOnly(true); else loadAllData();
                    return;
                }
            } catch (retryErr) {
                err = retryErr;
            }
            if (loader) loader.classList.add('hidden');
            Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
    })();
}

// ============================================================
// V12 Service CSI upload speed patch
// - Skips Response IDs that are already loaded on the page before calling Apps Script
// - Sends compact TSV payload instead of a large nested JSON array
// - Updates the UI immediately after save instead of forcing a full reload
// ============================================================
function processServiceUpload(jsonData, meta) {
    meta = meta || {};
    const loader = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const uploadFileName = String(meta.fileName || '').trim();
    if (loader) loader.classList.remove('hidden');
    if (loadingText) loadingText.innerText = 'Mapping Service CSI file...';

    const rows = Array.isArray(jsonData) ? jsonData : [];
    if (!rows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No data', 'ไม่พบข้อมูลในไฟล์ Excel', 'warning');
        return;
    }

    const headers = Object.keys(rows[0] || {});
    const text = v => String(v == null ? '' : v).trim();
    const lower = v => text(v).toLowerCase();
    const cleanHeader = h => text(h).replace(/\s+/g, ' ');
    const hasHeader = keyword => headers.some(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
    const findKey = (...keywords) => {
        for (const keyword of keywords) {
            const k = headers.find(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
            if (k) return k;
        }
        return '';
    };

    const fileLower = lower(uploadFileName);
    const activeTeam = String((typeof sFilters !== 'undefined' && sFilters.team) ? sFilters.team : 'All').toUpperCase();
    const isTESFile = fileLower.includes('export-tes') || fileLower.includes('tes_') || (!hasHeader('Services ที่ใช้บริการ') && hasHeader('ด้านการออกใบรายงาน'));
    const fileType = isTESFile ? 'TES' : 'CES';
    const forceTeam = isTESFile || activeTeam === 'TES' ? 'TES' : '';

    const K = {
        id: findKey('response id'),
        timestamp: findKey('timestamp'),
        serviceDate: findKey('วันที่เข้ารับบริการ'),
        finished: findKey('finished'),
        place: findKey('สถานที่รับบริการ'),
        customerType: findKey('ประเภทลูกค้า'),
        service: isTESFile ? '' : findKey('services ที่ใช้บริการ', 'services')
    };

    function questionHeaders(sectionNo) {
        const sectionText = 'ส่วนที่ ' + sectionNo;
        return headers.filter(h => {
            const s = cleanHeader(h);
            return s.includes(sectionText) &&
                !s.includes('ความคิดเห็น') &&
                !s.includes('ข้อเสนอแนะ') &&
                !s.includes('แนะนำ') &&
                !s.toLowerCase().includes('option id');
        });
    }

    const scoreKeys = {
        s1: questionHeaders(1),
        s2: questionHeaders(2),
        s3: questionHeaders(3),
        s4: questionHeaders(4),
        s5: headers.filter(h => cleanHeader(h).includes('ความประทับใจ') && !cleanHeader(h).includes('ความคิดเห็น') && !cleanHeader(h).includes('แนะนำ'))
    };

    const commentKeys = headers.filter(h => {
        const s = cleanHeader(h);
        return s && (s.includes('ความคิดเห็นเพิ่มเติม') || s.includes('ข้อเสนอแนะ') || s.toLowerCase().includes('suggestion'));
    });

    function parseExcelDate(v) {
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        const raw = text(v);
        if (!raw) return null;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 20000 && n < 80000) {
            const d = new Date(Math.round((n - 25569) * 86400 * 1000));
            return isNaN(d.getTime()) ? null : d;
        }
        let d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
        const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (m) {
            let y = Number(m[3]);
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            d = new Date(y, Number(m[2]) - 1, Number(m[1]));
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function normalizeFinished(v) {
        const s = lower(v);
        if (['yes','y','true','1','finish','finished','complete','completed','done'].includes(s)) return 'Yes';
        if (['no','n','false','0','not finish','not finished','pending'].includes(s)) return 'No';
        return s ? text(v) : 'No';
    }

    function normalizeCustomerType(v) {
        const s = lower(v);
        if (s.includes('network') || s.includes('bdms')) return 'Network';
        return 'Commercial';
    }

    function detectTeam(rawService) {
        if (forceTeam === 'TES') return 'TES';
        const s = lower(rawService);
        if (!s) return '';
        if (s.includes('medical') || s.includes('cal-med') || s.includes('เครื่องมือแพทย์')) return 'MED';
        if (s.includes('lab') || s.includes('testing') || s.includes('ห้องปฏิบัติการ')) return 'LAB';
        if (s.includes('environmental') || s.includes('environment') || s.includes('health') || s.includes('ehs') || s.includes('env') || s.includes('สิ่งแวดล้อม')) return 'EHS';
        if (s.includes('tes') || s.includes('technical') || s.includes('engineering')) return 'TES';
        return '';
    }

    function avgScore(row, keys) {
        let sum = 0, count = 0;
        (keys || []).forEach(k => {
            const raw = text(row[k]);
            if (raw === '') return;
            const n = Number(raw.replace(/,/g, ''));
            if (Number.isFinite(n)) { sum += n; count += 1; }
        });
        return count ? Number((sum / count).toFixed(6)) : 0;
    }

    function isBadCustomerName(name) {
        const s = lower(name);
        if (!s) return true;
        if (['a','aa','.', '-', 'test', 'เทส', 'ทดสอบ'].includes(s)) return true;
        return s.includes('test') || s.includes('ทดสอบ');
    }

    function toServiceObject(r) {
        return {
            id: r[0], monthFull: r[1], monthOnly: r[2], year: r[3], finished: r[4],
            team: r[5], customer: r[6], s1: Number(r[7]) || 0, s2: Number(r[8]) || 0,
            s3: Number(r[9]) || 0, s4: Number(r[10]) || 0, s5: Number(r[11]) || 0,
            comments: r[12] || '', raw: r[13] || '', customerName: r[14] || '',
            sourceSheet: r[5] === 'TES' ? 'TES_Service_Data' : 'Service_Data'
        };
    }

    function packRowsForAppsScript(rowsToPack) {
        // TSV payload is much smaller/faster than nested JSON arrays through iframe POST.
        // Strip tabs/newlines from individual cells so split is deterministic.
        return rowsToPack.map(r => r.map(v => String(v == null ? '' : v)
            .replace(/[\t\r\n]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()).join('\t')).join('\n');
    }

    const existingIds = new Set((Array.isArray(serviceRawData) ? serviceRawData : []).map(d => {
        if (Array.isArray(d)) return text(d[0]);
        return text(d && (d.id || d.ID || d.responseId || d['Response ID']));
    }).filter(Boolean));

    const seen = new Set();
    let skippedBlank = 0;
    let skippedOther = 0;
    let skippedDuplicateInFile = 0;
    let skippedDuplicateExisting = 0;
    let skippedTest = 0;

    const mappedRows = [];
    rows.forEach(row => {
        const id = text(row[K.id]);
        if (!id) { skippedBlank++; return; }
        if (seen.has(id)) { skippedDuplicateInFile++; return; }
        seen.add(id);

        const customerName = text(row[K.place]);
        const customerBad = isBadCustomerName(customerName);
        if (lower(customerName).includes('test') || ['aa','test','ทดสอบ'].includes(lower(customerName))) {
            skippedTest++;
            return;
        }

        const rawService = isTESFile ? 'TES' : text(row[K.service]);
        const team = detectTeam(rawService);
        const scores = [
            avgScore(row, scoreKeys.s1),
            avgScore(row, scoreKeys.s2),
            avgScore(row, scoreKeys.s3),
            avgScore(row, scoreKeys.s4),
            avgScore(row, scoreKeys.s5)
        ];
        const hasScore = scores.some(v => Number(v) > 0);

        if (!team) { skippedOther++; return; }
        if (!hasScore && !rawService) { skippedBlank++; return; }
        if (!hasScore && customerBad) { skippedBlank++; return; }

        const dateObj = parseExcelDate(row[K.serviceDate]) || parseExcelDate(row[K.timestamp]);
        const monthOnly = dateObj ? S_MONTHS[dateObj.getMonth()] : 'Unknown';
        const monthFull = dateObj ? dateObj.toLocaleString('en-US', { month: 'long' }) : 'Unknown';
        const year = dateObj ? String(dateObj.getFullYear()) : 'Unknown';

        const comments = [];
        commentKeys.forEach(k => {
            const val = text(row[k]);
            if (val.length > 2 && val !== '-' && val !== '[]' && !/^\d+(\.\d+)?$/.test(val)) {
                comments.push({ topic: 'Feedback', text: val.substring(0, 400), customer: (customerName || 'Unknown').substring(0, 120) });
            }
        });

        mappedRows.push([
            id, monthFull, monthOnly, year, normalizeFinished(row[K.finished]), team,
            normalizeCustomerType(row[K.customerType]), scores[0], scores[1], scores[2], scores[3], scores[4],
            comments.length ? JSON.stringify(comments) : '', rawService || team, customerName
        ]);
    });

    const uploadRows = mappedRows.filter(r => {
        const id = text(r[0]);
        if (existingIds.has(id)) { skippedDuplicateExisting++; return false; }
        return true;
    });

    if (!mappedRows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No valid rows', `ไม่พบแถวที่นำเข้าได้จากไฟล์นี้<br>Skipped blank: ${skippedBlank}<br>Skipped other: ${skippedOther}`, 'warning');
        return;
    }

    if (!uploadRows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire({
            icon: 'info',
            title: 'No new Service CSI rows',
            html: [
                `Mapped rows: ${mappedRows.length}`,
                `Already in dashboard: ${skippedDuplicateExisting}`,
                `Duplicate inside file: ${skippedDuplicateInFile}`,
                `Skipped blank/test/other: ${skippedBlank + skippedOther + skippedTest}`
            ].join('<br>')
        });
        return;
    }

    const uploadMeta = {
        fileName: uploadFileName,
        fileType: fileType,
        forceTeam: forceTeam,
        cleanupInvalid: false,
        packedFormat: 'service-v17-stable-rows',
        crossSheetDedup: false,
        source: 'service-csi-v17-stable-github-upload'
    };

    (async () => {
        try {
            if (loadingText) {
                loadingText.innerText = `Preparing ${uploadRows.length} new Service CSI rows... (${skippedDuplicateExisting} existing skipped)`;
            }

            let result;
            // Stable GitHub mode: use the existing backend function only.
            // Previous builds tried saveServiceDataArrayInstant/saveServiceDataArrayFast (disabled in v17 stable frontend),
            // but many deployed Apps Script versions did not whitelist those new names.
            // This path avoids "Function not allowed or not found" completely.
            if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
                const chunksResult = await window.CES_API.chunkedRows('saveServiceDataArray', uploadRows, uploadMeta, {
                    maxUrlLength: 5600,
                    timeoutMs: 120000,
                    onProgress: function (current, total, rowsInChunk) {
                        if (loadingText) {
                            loadingText.innerText = `Saving Service CSI data... chunk ${current}/${total} (${rowsInChunk} rows)`;
                        }
                    }
                });
                result = chunksResult;
            } else if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
                // Fallback for older gas-polyfill without chunkedRows.
                result = await window.CES_API.callFunction('saveServiceDataArray', [uploadRows, uploadMeta], { transport: 'iframe', timeoutMs: 150000 });
            } else {
                result = await new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .saveServiceDataArray(uploadRows, uploadMeta);
                });
            }

            // Immediate local update. This removes the slow full reload after upload.
            const locallyAdded = uploadRows.map(toServiceObject);
            if (Array.isArray(serviceRawData)) serviceRawData = serviceRawData.concat(locallyAdded);
            if (Array.isArray(customerRawData)) {
                customerRawData = customerRawData.concat(locallyAdded.map(r => ({
                    monthOnly: r.monthOnly, year: r.year, finished: r.finished, team: r.team,
                    customerType: r.customer, customer: r.customerName, s1: r.s1, s2: r.s2, s3: r.s3, s4: r.s4, s5: r.s5
                })));
            }
            if (typeof populateServiceDropdowns === 'function') populateServiceDropdowns();
            if (typeof populateCompareDropdowns === 'function') populateCompareDropdowns();
            if (typeof applyServiceFilters === 'function') applyServiceFilters();

            if (loader) loader.classList.add('hidden');
            const summary = (result && typeof result === 'object')
                ? [
                    `File type: ${fileType}`,
                    `Mapped rows: ${mappedRows.length}`,
                    `Sent new rows: ${uploadRows.length}`,
                    `Added: ${result.total || 0}`,
                    `Service_Data: ${result.main || 0}`,
                    `TES_Service_Data: ${result.tes || 0}`,
                    `Already skipped before upload: ${skippedDuplicateExisting}`,
                    `Backend duplicate: ${result.duplicate || 0}`,
                    result.elapsedMs ? `Backend save: ${result.elapsedMs} ms` : ''
                  ].filter(Boolean).join('<br>')
                : `Processed ${result} records.`;
            Swal.fire({ icon: 'success', title: 'Service CSI uploaded', html: summary });
        } catch (err) {
            if (loader) loader.classList.add('hidden');
            Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
    })();
}
