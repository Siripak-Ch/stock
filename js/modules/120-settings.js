// ============================================================
// 120-settings.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// --- Setting Module Logic ---
    let isSettingsLoaded = false;

    /**
     * ฟังก์ชันเริ่มต้นเมื่อเข้าหน้า Setting: ทำหน้าที่ดึงข้อมูลจาก Server มาแสดงผล[cite: 12]
     */
    function initSettings() {
        if(isSettingsLoaded) return;
        
        // แสดงสถานะกำลังโหลด (Disable ช่องกรอกข้อมูลชั่วคราว)[cite: 12]
        document.querySelectorAll('#view-setting input').forEach(el => {
            el.disabled = true;
            el.classList.add('opacity-50', 'cursor-wait');
        });

        // เรียกฟังก์ชัน getSystemSettings จากฝั่ง Server เพื่อดึงค่าปัจจุบัน[cite: 12]
        google.script.run.withSuccessHandler(onSettingsLoaded).getSystemSettings();
    }

    /**
     * ฟังก์ชันจัดการข้อมูลที่ได้รับจาก Server เพื่อนำมาเติมในช่อง Input[cite: 12]
     */
    function onSettingsLoaded(data) {
        if(!data) return;
        
        // ฟังก์ชันช่วยเติมค่าลงในช่อง Input ตาม ID ที่กำหนด[cite: 12]
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) {
                el.value = val !== undefined ? val : '';
                el.disabled = false;
                el.classList.remove('opacity-50', 'cursor-wait');
            }
        };

        // 1. ความสามารถของทีม (Capacity)[cite: 12]
        setVal('cfg-cap-med', data.CAPACITY_MED);
        setVal('cfg-cap-lab', data.CAPACITY_LAB);
        setVal('cfg-cap-ehs', data.CAPACITY_EHS);

        // 2. รหัสปฏิทิน (Calendar IDs)[cite: 12]
        setVal('cfg-cal-med', data.CAL_ID_MED);
        setVal('cfg-cal-lab', data.CAL_ID_LAB);
        setVal('cfg-cal-ehs', data.CAL_ID_EHS);

        // 3. เป้าหมายการดำเนินงาน (Operational Targets)[cite: 12]
        setVal('cfg-target-csi', data.TARGET_CSI);
        setVal('cfg-target-sla', data.TARGET_SLA_HRS);
        
        // 4. เป้าหมายรายได้ (Revenue Targets)[cite: 12]
        setVal('cfg-rev-med', data.TARGET_REV_MED);
        setVal('cfg-rev-lab', data.TARGET_REV_LAB);
        setVal('cfg-rev-ehs', data.TARGET_REV_EHS);
    
        // 5. Unified Line Token (รองรับการใช้ค่าเริ่มต้นหากในระบบยังไม่มีค่า)[cite: 12]
        const defaultLineToken = 'ใส่_TOKEN_ถาวร_ของคุณตรงนี้'; 
        setVal('cfg-line-token', data.LINE_TOKEN || defaultLineToken);

        // 6. ข้อมูล Admin และการประกาศ (Admin & Announcement)[cite: 12]
        setVal('cfg-admin-email', data.ADMIN_NOTIFY_EMAIL);
        setVal('cfg-announce-msg', data.ANNOUNCE_MSG);
        
        // ตรรกะสำหรับ Checkbox การเปิด/ปิดประกาศ[cite: 12]
        const chkAnnounce = document.getElementById('cfg-announce-active');
        if(chkAnnounce) {
            chkAnnounce.checked = String(data.ANNOUNCE_ACTIVE).toUpperCase() === 'TRUE';
            chkAnnounce.disabled = false;
            chkAnnounce.classList.remove('opacity-50', 'cursor-wait');
        }

        isSettingsLoaded = true;
    }

    /**
     * ฟังก์ชันรวบรวมข้อมูลทั้งหมดจากหน้าเว็บเพื่อส่งไปบันทึกที่ Server[cite: 12]
     */
    function saveFullSystemConfig() {
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '';
        
        // รวบรวมข้อมูลลงใน Object configData ให้ตรงกับที่ Server ต้องการ[cite: 12]
        const configData = {
            CAPACITY_MED: getVal('cfg-cap-med'),
            CAPACITY_LAB: getVal('cfg-cap-lab'),
            CAPACITY_EHS: getVal('cfg-cap-ehs'),
            
            CAL_ID_MED: getVal('cfg-cal-med'),
            CAL_ID_LAB: getVal('cfg-cal-lab'),
            CAL_ID_EHS: getVal('cfg-cal-ehs'),
            
            TARGET_CSI: getVal('cfg-target-csi'),
            TARGET_SLA_HRS: getVal('cfg-target-sla'),
            
            TARGET_REV_MED: getVal('cfg-rev-med'),
            TARGET_REV_LAB: getVal('cfg-rev-lab'),
            TARGET_REV_EHS: getVal('cfg-rev-ehs'),
            
            // ปรับปรุง: ส่งค่า LINE_TOKEN เพียงค่าเดียว (Unified Token)[cite: 12]
            LINE_TOKEN: getVal('cfg-line-token'),
            
            ADMIN_NOTIFY_EMAIL: getVal('cfg-admin-email'),
            ANNOUNCE_MSG: getVal('cfg-announce-msg'),
            ANNOUNCE_ACTIVE: document.getElementById('cfg-announce-active').checked ? 'TRUE' : 'FALSE'
        };

        // แสดงสถานะกำลังบันทึกที่ปุ่ม[cite: 12]
        const btn = document.querySelector('button[onclick="saveFullSystemConfig()"]');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        // เรียกฟังก์ชันบันทึกข้อมูลฝั่ง Server (saveConfigSettings)[cite: 12]
        google.script.run.withSuccessHandler((res) => {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            
            if(res === "Saved" || (res && res.success)) {
                // อัปเดตค่าในตัวแปร Global Config ทันทีไม่ต้องโหลดใหม่[cite: 12]
                if(typeof globalConfig !== 'undefined') {
                    Object.assign(globalConfig, configData);
                }
                
                Swal.fire({
                    icon: 'success',
                    title: 'Configuration Saved',
                    text: 'System settings have been updated successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', res.message || res, 'error');
            }
        }).saveConfigSettings(configData);
    }
