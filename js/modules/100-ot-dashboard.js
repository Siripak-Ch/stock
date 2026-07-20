// ============================================================
// 100-ot-dashboard.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// Backward-compatible alias (app-controller calls initOTData via switchTab)
function initOTData() { initOTSystem(); }

let rawOTData = [];
    let currentOTTeam = 'ALL';
    let trendChartInstance = null;
    let teamChartInstance = null;

    /** * 1. Initialize System 
     * ตั้งค่า Default เดือน/ปี ปัจจุบัน และดึงข้อมูล
     */
    function initOTSystem() {
        populateOTDateDropdowns();
        fetchOTData();
    }

    function populateOTDateDropdowns() {
        const d = new Date();
        const curMonth = d.getMonth() + 1;
        const curYear = d.getFullYear();

        // ตั้งค่าเดือน (Default: Current Month)
        const monthSelect = document.getElementById('ot-filter-month');
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthSelect.innerHTML = `<option value="ALL">All Months</option>` + 
            months.map((m, i) => `<option value="${i + 1}" ${curMonth === i + 1 ? 'selected' : ''}>${m}</option>`).join('');

        // ตั้งค่าปี (ตรวจสอบว่ามีปีปัจจุบันใน Option หรือไม่)
        const yearSelect = document.getElementById('ot-filter-year');
        if ([...yearSelect.options].some(opt => opt.value == curYear)) {
            yearSelect.value = curYear;
        }
    }

    /**
     * 2. Sync ข้อมูลพร้อม Pop-up สไตล์ Revenue (Blur + Modern)
     */
    function fetchOTData() {
        Swal.fire({
            title: 'Synchronizing...',
            text: 'ระบบกำลังดึงข้อมูลล่าสุดจากฐานข้อมูล',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: '#ffffff',
            backdrop: `rgba(249, 115, 22, 0.05) blur(10px)`, // Orange tint blur
            didOpen: () => { Swal.showLoading(); }
        });

        google.script.run.withSuccessHandler(data => {
            rawOTData = data;
            applyOTFilters();
            Swal.fire({
                title: 'Success!',
                text: 'อัปเดตข้อมูล OT เรียบร้อยแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: `rgba(0,0,0,0.1) blur(4px)`
            });
        }).getOTDashboardData();
    }

    /**
     * 3. จัดการ Filter ทีม
     */
    function setOTTeamFilter(team) {
        currentOTTeam = team;
        // จัดการ Class Active ให้ปุ่ม (สไตล์ Revenue)
        document.querySelectorAll('.ot-team-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`ot-btn-${team}`);
        if(activeBtn) activeBtn.classList.add('active');
        
        applyOTFilters();
    }

    /**
     * 4. กรองข้อมูลและคำนวณ KPI (ปัดเศษขึ้นตามสั่ง)
     */
    function applyOTFilters() {
        const selectedMonth = document.getElementById('ot-filter-month').value;
        const selectedYear = document.getElementById('ot-filter-year').value;

        let filtered = rawOTData.filter(item => {
            let matchMonth = selectedMonth === 'ALL' || item.month == selectedMonth;
            let matchYear = selectedYear === 'ALL' || item.year == selectedYear;
            let matchTeam = currentOTTeam === 'ALL' || item.team === currentOTTeam;
            return matchMonth && matchYear && matchTeam;
        });

        // คำนวณยอดรวมรายทีม
        let totals = { ALL: 0, MED: 0, LAB: 0, EHS: 0 };
        filtered.forEach(item => {
            let hrs = parseFloat(item.otHours) || 0;
            totals.ALL += hrs;
            if (totals[item.team] !== undefined) totals[item.team] += hrs;
        });

        // แสดงผลบน KPI Cards (Math.ceil ปัดเศษขึ้นเป็นจำนวนเต็ม)
        document.getElementById('card-total-ot').innerText = Math.ceil(totals.ALL).toLocaleString();
        document.getElementById('card-med-ot').innerText = Math.ceil(totals.MED).toLocaleString();
        document.getElementById('card-lab-ot').innerText = Math.ceil(totals.LAB).toLocaleString();
        document.getElementById('card-ehs-ot').innerText = Math.ceil(totals.EHS).toLocaleString();

        renderOTTable(filtered);
        renderCharts(filtered, selectedMonth);
    }

    /**
     * 5. แสดงผลตาราง Staff Summary (ทศนิยม 1 ตำแหน่งสำหรับ Work Hrs)
     */
    function renderOTTable(filteredData) {
        const tbody = document.getElementById('ot-table-body');
        if(filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-16 text-gray-300 italic">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td></tr>`;
            return;
        }

        let staffSummary = {};
        filteredData.forEach(item => {
            if (!staffSummary[item.name]) {
                staffSummary[item.name] = { team: item.team, totalOT: 0, totalWork: 0 };
            }
            staffSummary[item.name].totalOT += item.otHours;
            staffSummary[item.name].totalWork += item.workHours;
        });

        let html = '';
        Object.keys(staffSummary).forEach(name => {
            const staff = staffSummary[name];
            html += `
                <tr class="hover:bg-[#003DA5]/30 transition-colors">
                    <td class="px-8 py-4 font-bold text-gray-700">${name}</td>
                    <td class="px-4 py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 uppercase tracking-tighter">${staff.team}</span>
                    </td>
                    <td class="px-4 py-4 text-center font-bold text-blue-600">${staff.totalWork.toFixed(1)}</td>
                    <td class="px-8 py-4 text-center font-black text-[#003DA5]">${Math.ceil(staff.totalOT)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    /**
     * 6. Render กราฟ (ApexCharts) - ปรับปรุงอ่านง่าย กว้างขึ้น สเกล 50
     * เอา Benchmark ออก
     */
    function renderCharts(filteredData, selectedMonth) {
        const teamTotals = { 'MED': 0, 'LAB': 0, 'EHS': 0 };
        filteredData.forEach(r => { if(teamTotals[r.team] !== undefined) teamTotals[r.team] += r.otHours; });

        // --- Pie Chart (Service Share) --- คงเดิม
        if(teamChartInstance) teamChartInstance.destroy();
        teamChartInstance = new ApexCharts(document.querySelector("#ot-team-chart"), {
            series: [teamTotals.MED, teamTotals.LAB, teamTotals.EHS],
            labels: ['MED', 'LAB', 'EHS'],
            chart: { type: 'donut', height: 300, fontFamily: 'Prompt' },
            colors: ['#004aad', '#5B7F95', '#004aad'],
            plotOptions: { pie: { donut: { size: '70%' } } },
            legend: { position: 'bottom', fontSize: '12px' }
        });
        teamChartInstance.render();

        // --- Bar Chart (OT Monthly Trend) - ปรับปรุงใหม่ ---
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let series = [
            { name: 'MED', data: Array(12).fill(0) },
            { name: 'LAB', data: Array(12).fill(0) },
            { name: 'EHS', data: Array(12).fill(0) }
        ];

        filteredData.forEach(r => {
            let mIdx = parseInt(r.month) - 1;
            if(mIdx >= 0 && mIdx < 12) {
                if(r.team === 'MED') series[0].data[mIdx] += r.otHours;
                else if(r.team === 'LAB') series[1].data[mIdx] += r.otHours;
                else if(r.team === 'EHS') series[2].data[mIdx] += r.otHours;
            }
        });

        // คำนวณหาค่าสูงสุดจากข้อมูลจริง เพื่อตั้งสเกลแกน Y ที่เหมาะสม
        let allValues = [];
        series.forEach(s => allValues = allValues.concat(s.data));
        const maxData = Math.max(...allValues, 10); // อย่างน้อยต้องมีสเกล 10

        // ปัดขึ้นให้เต็มหลัก 50 (เช่น 120 -> 150, 40 -> 50)
        const yAxisMax = Math.ceil(maxData / 50) * 50;
        const ticks = yAxisMax / 50; // จำนวนช่องสเกล

        if(trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new ApexCharts(document.querySelector("#ot-trend-chart"), {
            series: series,
            chart: { 
                type: 'bar', 
                height: 380, // เพิ่มความสูงจาก 300 เป็น 380 เพื่อให้กราฟดู "กว้างและอ่านง่าย" ขึ้น
                fontFamily: 'Prompt', 
                toolbar: { show: false }, 
                stacked: true // ตั้งค่าเป็น Stacked ตามสไตล์ Revenue เดิม
            },
            plotOptions: { 
                bar: { 
                    columnWidth: '40%', // ปรับแท่งให้ผอมลงเล็กน้อยเพื่อให้ดูโปร่งตา
                    borderRadius: 6 
                } 
            },
            colors: ['#004aad', '#5B7F95', '#004aad'],
            xaxis: { 
                categories: months,
                labels: { style: { fontSize: '11px', fontWeight: 500 } }
            },
            yaxis: { 
                min: 0,
                max: yAxisMax > 0 ? yAxisMax : 50, // กำหนดค่าสูงสุดอัตโนมัติ
                tickAmount: ticks > 0 ? ticks : 1, // กำหนดช่องสเกลให้ลงตัวที่หลัก 50
                title: { 
                    text: 'Total OT Hours',
                    style: { fontSize: '12px', fontWeight: 600, color: '#64748b' }
                },
                labels: {
                    style: { fontSize: '11px', color: '#64748b' },
                    formatter: (val) => val.toLocaleString() // ใส่ลูกน้ำหลักพันถ้ามี
                }
            },
            // เอา annotations (Benchmark) ออกเรียบร้อยครับ
            legend: { 
                position: 'top', 
                horizontalAlign: 'right',
                fontSize: '12px',
                fontWeight: 500
            },
            grid: {
                borderColor: '#f1f5f9',
                strokeDashArray: 2
            }
        });
        trendChartInstance.render();
    }
    /**
     * 7. Export CSV พร้อม Pop-up
     */
    function exportOTData() {
        Swal.fire({
            title: 'Exporting...',
            text: 'กำลังเตรียมข้อมูลสำหรับดาวน์โหลด',
            timer: 1000,
            timerProgressBar: true,
            background: '#ffffff',
            backdrop: `rgba(0,0,0,0.1) blur(4px)`,
            didOpen: () => { Swal.showLoading(); }
        }).then(() => {
            const tbodyRows = document.querySelectorAll('#ot-table-body tr');
            if(tbodyRows.length === 0 || tbodyRows[0].innerText.includes('ไม่พบข้อมูล')) return;

            let csv = "\uFEFFStaff Name,Team,Working (Hrs),Total OT (Hrs)\n";
            tbodyRows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if(cols.length >= 4) {
                    csv += `"${cols[0].innerText}","${cols[1].innerText}","${cols[2].innerText}","${cols[3].innerText}"\n`;
                }
            });

            const link = document.createElement("a");
            link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
            link.download = `OT_Report_${new Date().toLocaleDateString()}.csv`;
            link.click();
            
            Swal.fire({
                title: 'Success!',
                text: 'ดาวน์โหลดไฟล์เรียบร้อยแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }
