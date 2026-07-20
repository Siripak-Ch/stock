# CES Hub Sync Final — 2026-07-09

ชุดนี้ recheck และ sync จากไฟล์ที่อัปโหลดล่าสุด:
- Frontend: `Test-main.zip`
- Backend: `download(6).zip`

## สิ่งที่แก้ / รวมให้แล้ว

### Frontend
- เพิ่ม `js/modules/000-core-global-helpers.js` เพื่อแก้ error `spEsc is not defined` และ helper กลางของ Stock/Inventory
- เพิ่ม `js/modules/99999-kpi-env-sync-final.js` เพื่อแก้ KPI ENV Workflow ให้เริ่มจาก SUP Status เท่านั้น
- แก้ `index.html` ให้โหลด helper ก่อน module อื่น และโหลด KPI ENV final sync เป็นตัวสุดท้าย
- Sync `config.js` กับ `js/config.js` และตั้ง `DEBUG:false`
- คง module/function เดิมไว้ ไม่ลบ function หลัก

### Backend
- เพิ่ม `00_Global_Config.js` เพื่อประกาศ Sheet ID และชื่อ sheet ที่ backend ใช้ร่วมกัน
- เพิ่ม `ZZZZZZZZ_STOCK_INVENTORY_FINAL.js` เพื่อให้ Stock/Inventory ใช้ `DB_Devices_Clean` จาก sheet `Stock Inventory (1)` โดยตรง
- เพิ่ม `ZZZZZZZZZZZZ_FINAL_SYNC_ALL_20260709.js` เพื่อรวม recheck/alias สำคัญสำหรับ frontend
- แก้ API allowlist ให้รองรับ function ที่ frontend เรียกจริง เช่น `rd_getRevenueDashboardData`, `si_updateRecheckToReady`, `CES_FRONTBACK_SYNC_RECHECK`
- ตัดไฟล์ recheck duplicate เดิม `ZZZ_FINAL_Stock_CSI_API_Fix.js` ออกจากชุด final เพื่อลด function ซ้ำ

## Data links ที่ตั้งไว้

- MAIN / CSI / Revenue: `1w3_j_2T67f9xy_ndGYw9LuuKCPEttw52zwVUxM1zUNE`
- KPI: `1vNt7qUenxteIV3A0TnQ2QYf0esyOu3NvEjZG8zme5Gk`
- Stock Inventory: `1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk`

## KPI ENV Workflow ที่แก้แล้ว

ENV ไม่ใช้ Engineer Status แล้ว ใช้ flow นี้:

`กำลังตรวจ → ตรวจเสร็จ → รอส่ง Report → ส่ง Report เสร็จแล้ว`

ตำแหน่ง column backend:
- SUP Status: O
- SUP Date: P
- Report Status: S
- Report Date: T

## วิธี deploy

### Backend Apps Script
1. เอาไฟล์ใน folder `backend/` ไปแทนที่ Apps Script project
2. Deploy > Manage deployments > Edit > New version
3. Execute as: Me
4. Who has access: Anyone / Anyone with the link
5. Copy Web App URL ที่ลงท้าย `/exec`

### Frontend GitHub
1. เอาไฟล์ใน folder `frontend/` ไปแทนที่ repo frontend
2. เอา Web App URL `/exec` ไปใส่ใน `frontend/js/config.js` และ `frontend/config.js`
3. Commit/push ขึ้น GitHub Pages
4. เปิดเว็บด้วย Incognito หรือ Ctrl+F5

## Recheck หลัง deploy

### Apps Script editor
รัน function:

```javascript
CES_FRONTBACK_SYNC_RECHECK()
CES_RECHECK_ALL()
stockFinalRecheck()
inventoryFinalRecheck()
kpi_v39TestEnvWorkflow()
```

### Browser console
รัน:

```javascript
CES_API_RECHECK()
CES_FRONTEND_RECHECK_ALL()
CES_CORE_HELPERS_RECHECK()
kpiV39EnvWorkflowRecheck()
```

## Static check ที่ทำแล้ว

- ตรวจ syntax JavaScript ของ frontend ผ่าน
- ตรวจ syntax JavaScript ของ backend ผ่าน
- ตรวจว่า `spEsc` โหลดก่อน Stock/Inventory แล้ว
- ตรวจว่า API allowlist มี function สำคัญที่ frontend เรียกแล้ว
