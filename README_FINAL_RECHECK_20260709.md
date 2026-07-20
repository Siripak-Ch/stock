# CES Hub Final Sync Fix — 2026-07-09

This package was edited from `CES_HUB_BACK_FRONT_SYNCED_FINAL_20260709(1).zip`.

## Main fixes

1. Home
   - Fixed header icon color and page theme.
   - Kept Yearly Revenue Performance and Yearly Job & Capacity working with the current data link.
   - Replaced Home `Yearly OT Performance` section with `Service CSI Summary` table using Service CSI data.

2. Service CSI
   - Changed Service CSI upload to bulk iframe POST first, then fallback chunk upload.
   - Fixed slow `Saving Service CSI data... chunk x/y` behavior.
   - Fixed TES routing and overlap: `TES_Service_Data` is treated as TES only; duplicate Response ID uses TES as priority.
   - Rebuilt PDF export preview/download to capture the current website view without horizontal crop/shift.
   - File name remains `Service_CSI_(team)_(month)_(year).pdf`.

3. Report CSI
   - Fixed upload path to use iframe POST first, then safe fallback.
   - Backend `saveReportDataArray()` now ensures Month/Year columns and returns a structured result.

4. OT Dashboard
   - Removed the sync success/loading popup when entering the OT module.
   - OT data still loads in background and updates charts/tables.

5. Master Calendar
   - Added TES card to Total Job Record section.
   - Added TES to Monthly Capacity Utilization.
   - Added TES filter button.
   - Fixed Plan Comparison 2025 vs 2026 color theme for pending/matched blocks.

6. Backend sync
   - Added final backend override file: `ZZZZZZZZZZZZZ_FINAL_FUNCTIONAL_SYNC_20260709.js`.
   - Added final frontend override file: `999999-final-dashboard-csi-calendar-sync-20260709.js`.
   - Updated API allowlist for new recheck/helper functions.

## Required deploy steps

1. Upload backend files to Apps Script.
2. Make sure there is only one active `doGet(e)` and `doPost(e)`: `API_LIFF_Bridge.js`.
3. Deploy Apps Script as a new version:
   - Deploy > Manage deployments > Edit > New version > Deploy
4. Copy the `/exec` URL into frontend:
   - `frontend/js/config.js`
   - `frontend/config.js` if used
5. Push frontend to GitHub Pages.
6. Open the site with Ctrl+F5 or Incognito.

## Recheck functions

Apps Script editor:

```javascript
CES_FINAL_20260709_RECHECK()
CES_RECHECK_ALL()
CES_FRONTBACK_SYNC_RECHECK()
stockFinalRecheck()
inventoryFinalRecheck()
serviceCSIRecheck()
reportCSIRecheck()
```

Browser console:

```javascript
CES_API_RECHECK()
CES_FRONTEND_RECHECK_ALL()
CES_FINAL_ALL_SYNC_RECHECK()
kpiV39EnvWorkflowRecheck()
```
