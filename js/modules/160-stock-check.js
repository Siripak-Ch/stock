/**
 * 160-stock-check.js
 * CES Stock Check Module — Full rewrite for new data structure
 * 
 * FLOW:
 *   CF CAL/PM scan → รอสอบเทียบ → พร้อมส่ง
 *   CHECK-OUT → เช่ายืม (needs borrower/location/due)
 *   CHECK-IN  → รอสอบเทียบ
 * 
 * Uses display_status (Thai) directly from DB_Devices_Clean
 * NO English status mapping needed
 * 
 * Spreadsheet: 1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk
 */

/* ============================================================
   CONSTANTS & CONFIG
   ============================================================ */
const SC_COLORS = {
  navy: '#003DA5',
  steel: '#5B7F95',
  cyan: '#19a7ce',
  red: '#E4002B',
  green: '#16a34a',
  iconBg: 'rgba(0,61,165,0.1)'
};

const SC_STATUSES = ['พร้อมส่ง', 'รอสอบเทียบ', 'เช่ายืม', 'ใช้งานไม่ได้', 'ไม่พบในรายการ'];

const SC_MODES = {
  CALIBRATE: 'calibrate',   // CF CAL/PM → พร้อมส่ง
  CHECKOUT: 'checkout',     // เช่ายืม
  CHECKIN: 'checkin'        // รับคืน → รอสอบเทียบ
};

let scCurrentMode = SC_MODES.CALIBRATE;
let scScanLog = [];

/* ============================================================
   STYLES
   ============================================================ */
function scEnsureStyle() {
  if (document.getElementById('sc-styles')) return;
  const style = document.createElement('style');
  style.id = 'sc-styles';
  style.textContent = `
    .stockpro-check { padding: 16px; font-family: 'Sarabun', sans-serif; }
    .stockpro-check h2 { color: ${SC_COLORS.navy}; margin-bottom: 16px; font-size: 1.5rem; }

    /* Mode Selector */
    .sc-mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    @media (max-width: 640px) { .sc-mode-grid { grid-template-columns: 1fr; } }
    .sc-mode-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .sc-mode-card:hover { border-color: ${SC_COLORS.navy}; transform: translateY(-2px); }
    .sc-mode-card.active { border-color: ${SC_COLORS.navy}; background: rgba(0,61,165,0.03); box-shadow: 0 4px 12px rgba(0,61,165,0.1); }
    .sc-mode-icon { font-size: 2rem; margin-bottom: 8px; }
    .sc-mode-title { font-weight: 700; color: ${SC_COLORS.navy}; margin-bottom: 4px; }
    .sc-mode-desc { font-size: 0.8rem; color: #64748b; }

    /* Scan Area */
    .sc-scan-area { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
    .sc-scan-area h3 { color: ${SC_COLORS.navy}; margin: 0 0 16px 0; font-size: 1.1rem; }
    .sc-scan-input-row { display: flex; gap: 10px; margin-bottom: 12px; }
    .sc-scan-input { flex: 1; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; }
    .sc-scan-input:focus { outline: none; border-color: ${SC_COLORS.navy}; }
    .sc-scan-btn { padding: 12px 24px; background: ${SC_COLORS.navy}; color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .sc-scan-btn:hover { opacity: 0.9; }
    .sc-ocr-btn { padding: 12px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem; cursor: pointer; }
    .sc-ocr-btn:hover { border-color: ${SC_COLORS.navy}; }

    /* Device Preview */
    .sc-device-preview { background: #f8fafc; border-radius: 10px; padding: 16px; margin-top: 16px; border-left: 4px solid ${SC_COLORS.navy}; }
    .sc-device-preview.hidden { display: none; }
    .sc-device-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; }
    .sc-device-info dt { color: #64748b; }
    .sc-device-info dd { margin: 0; font-weight: 600; color: #1e293b; }

    /* Checkout Form */
    .sc-checkout-form { margin-top: 16px; padding: 16px; background: #fffbeb; border-radius: 10px; border: 1px solid #fde68a; }
    .sc-checkout-form.hidden { display: none; }
    .sc-form-row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
    .sc-form-input { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; flex: 1; min-width: 150px; }
    .sc-confirm-btn { padding: 10px 24px; background: ${SC_COLORS.green}; color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .sc-confirm-btn:hover { opacity: 0.9; }

    /* Scan Log Table */
    .sc-log-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
    .sc-log-section h4 { color: ${SC_COLORS.navy}; margin: 0 0 12px 0; }
    .sc-log-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .sc-log-table th { background: #f8fafc; color: ${SC_COLORS.navy}; padding: 8px; text-align: left; font-weight: 600; }
    .sc-log-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .sc-log-empty { text-align: center; padding: 20px; color: #94a3b8; }

    /* Status Change / Extend */
    .sc-action-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
    .sc-action-section h4 { color: ${SC_COLORS.navy}; margin: 0 0 12px 0; }
    .sc-action-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .sc-action-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; }
    .sc-action-btn { padding: 8px 16px; background: ${SC_COLORS.navy}; color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }

    /* Accessories Issue */
    .sc-acc-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .sc-acc-section h4 { color: ${SC_COLORS.navy}; margin: 0 0 12px 0; }

    /* Badges */
    .sp-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 0.72rem; font-weight: 600; }
    .sp-badge.พร้อมส่ง { background: #dcfce7; color: #16a34a; }
    .sp-badge.รอสอบเทียบ { background: #f1f5f9; color: #5B7F95; }
    .sp-badge.เช่ายืม { background: #e0f7fa; color: #0e7490; }
    .sp-badge.ใช้งานไม่ได้ { background: #e2e8f0; color: #475569; }
    .sp-badge.ไม่พบในรายการ { background: #fee2e2; color: #991b1b; }

    /* Success/Error flash */
    .sc-flash { padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-weight: 500; }
    .sc-flash-success { background: #dcfce7; color: #166534; }
    .sc-flash-error { background: #fee2e2; color: #991b1b; }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
function scLoadCheckStock() {
  scEnsureStyle();
  const el = document.getElementById('view-check_stock') || document.getElementById('view-check_stock') || document.getElementById('stockpro-check') || document.getElementById('main-content');
  if (!el) return;

  let html = `<div class="stockpro-check">`;
  html += `<h2>🔍 Stock Check</h2>`;

  // Mode Selection
  html += `<div class="sc-mode-grid">`;
  html += scModeCard(SC_MODES.CALIBRATE, '🔬', 'CF CAL/PM (สอบเทียบ)', 'สแกน → เปลี่ยนสถานะเป็น "พร้อมส่ง"');
  html += scModeCard(SC_MODES.CHECKOUT, '📤', 'CHECK-OUT (เช่ายืม)', 'สแกน → กรอกผู้ยืม/location → "เช่ายืม"');
  html += scModeCard(SC_MODES.CHECKIN, '📥', 'CHECK-IN (รับคืน)', 'สแกน → เปลี่ยนสถานะเป็น "รอสอบเทียบ"');
  html += `</div>`;

  // Scan Area
  html += `<div class="sc-scan-area">
    <h3 id="sc-scan-title">${scGetModeTitle()}</h3>
    <div class="sc-scan-input-row">
      <input type="text" class="sc-scan-input" id="sc-scan-input" placeholder="สแกนหรือพิมพ์ ID Code / Serial Number" onkeydown="if(event.key==='Enter')scScan()">
      <button class="sc-scan-btn" onclick="scScan()">🔍 สแกน</button>
      <button class="sc-ocr-btn" onclick="scOcrScan()">📷 OCR</button>
    </div>
    <div id="sc-flash"></div>
    <div class="sc-device-preview hidden" id="sc-device-preview"></div>
    <div class="sc-checkout-form hidden" id="sc-checkout-form">
      <p style="font-weight:600;margin:0 0 10px 0;">📋 กรอกข้อมูลเช่ายืม:</p>
      <div class="sc-form-row">
        <input type="text" class="sc-form-input" id="sc-borrower" placeholder="ผู้ยืม / หน่วยงาน">
        <input type="text" class="sc-form-input" id="sc-location" placeholder="Location">
      </div>
      <div class="sc-form-row">
        <input type="date" class="sc-form-input" id="sc-due-date" placeholder="Due Date">
        <input type="number" class="sc-form-input" id="sc-duration" placeholder="ระยะเวลา (เดือน)" min="1" max="36" style="max-width:150px;">
      </div>
      <button class="sc-confirm-btn" onclick="scConfirmCheckout()">✅ ยืนยัน Check-out</button>
    </div>
  </div>`;

  // Scan Log
  html += `<div class="sc-log-section">
    <h4>📝 บันทึกการสแกน (${scScanLog.length} รายการ)</h4>
    <div id="sc-log-table">${scRenderLogTable()}</div>
  </div>`;

  // Manual Status Change
  html += `<div class="sc-action-section">
    <h4>🔄 เปลี่ยนสถานะด้วยตนเอง</h4>
    <div class="sc-action-row">
      <input type="text" class="sc-action-input" id="sc-manual-id" placeholder="ID Code" style="min-width:150px;">
      <select class="sc-action-input" id="sc-manual-status">
        ${SC_STATUSES.map(function(s) { return '<option value="' + spEsc(s) + '">' + spEsc(s) + '</option>'; }).join('')}
      </select>
      <button class="sc-action-btn" onclick="sc_changeStatus()">บันทึก</button>
    </div>
  </div>`;

  // Extend Contract
  html += `<div class="sc-action-section">
    <h4>📅 ขยายสัญญาเช่ายืม</h4>
    <div class="sc-action-row">
      <input type="text" class="sc-action-input" id="sc-extend-id" placeholder="ID Code" style="min-width:150px;">
      <input type="number" class="sc-action-input" id="sc-extend-months" placeholder="เพิ่ม (เดือน)" min="1" max="24" style="width:120px;">
      <input type="date" class="sc-action-input" id="sc-extend-date" placeholder="Due Date ใหม่">
      <button class="sc-action-btn" onclick="sc_extendContract()">ขยายสัญญา</button>
    </div>
  </div>`;

  // Accessories Issue
  html += `<div class="sc-acc-section">
    <h4>🧰 แจ้งปัญหา Accessories</h4>
    <div class="sc-action-row">
      <input type="text" class="sc-action-input" id="sc-acc-id" placeholder="ID Code เครื่อง" style="min-width:150px;">
      <input type="text" class="sc-action-input" id="sc-acc-issue" placeholder="รายละเอียดปัญหา" style="flex:1;">
      <button class="sc-action-btn" onclick="scReportAccIssue()">รายงาน</button>
    </div>
  </div>`;

  html += `</div>`;
  el.innerHTML = html;

  // Focus scan input
  setTimeout(function() {
    const input = document.getElementById('sc-scan-input');
    if (input) input.focus();
  }, 100);
}

/* ============================================================
   MODE HANDLING
   ============================================================ */
function scModeCard(mode, icon, title, desc) {
  const active = scCurrentMode === mode ? 'active' : '';
  return `<div class="sc-mode-card ${active}" onclick="scSetMode('${mode}')">
    <div class="sc-mode-icon">${icon}</div>
    <div class="sc-mode-title">${title}</div>
    <div class="sc-mode-desc">${desc}</div>
  </div>`;
}

function scSetMode(mode) {
  scCurrentMode = mode;
  // Update UI
  document.querySelectorAll('.sc-mode-card').forEach(function(card) {
    card.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  const titleEl = document.getElementById('sc-scan-title');
  if (titleEl) titleEl.textContent = scGetModeTitle();

  // Hide checkout form when not in checkout mode
  const form = document.getElementById('sc-checkout-form');
  if (form) form.classList.add('hidden');

  // Hide device preview
  const preview = document.getElementById('sc-device-preview');
  if (preview) preview.classList.add('hidden');

  // Clear flash
  const flash = document.getElementById('sc-flash');
  if (flash) flash.innerHTML = '';

  // Focus input
  const input = document.getElementById('sc-scan-input');
  if (input) { input.value = ''; input.focus(); }
}

function scGetModeTitle() {
  switch (scCurrentMode) {
    case SC_MODES.CALIBRATE: return '🔬 CF CAL/PM — สแกนเครื่องที่ผ่านสอบเทียบ';
    case SC_MODES.CHECKOUT: return '📤 CHECK-OUT — สแกนเครื่องสำหรับเช่ายืม';
    case SC_MODES.CHECKIN: return '📥 CHECK-IN — สแกนเครื่องรับคืน';
    default: return '🔍 สแกน';
  }
}

/* ============================================================
   SCAN LOGIC
   ============================================================ */
function scScan() {
  const input = document.getElementById('sc-scan-input');
  const val = (input.value || '').trim();
  if (!val) return;

  // Lookup device
  google.script.run
    .withSuccessHandler(function(device) {
      if (!device) {
        scShowFlash('error', '❌ ไม่พบเครื่อง: ' + val);
        return;
      }
      scProcessDevice(device);
    })
    .withFailureHandler(function(err) {
      scShowFlash('error', '❌ Error: ' + (err.message || err));
    })
    .sd_lookupDevice(val);
}

function scProcessDevice(device) {
  // Show device preview
  scShowDevicePreview(device);

  switch (scCurrentMode) {
    case SC_MODES.CALIBRATE:
      scDoCalibrateAction(device);
      break;
    case SC_MODES.CHECKOUT:
      scShowCheckoutForm(device);
      break;
    case SC_MODES.CHECKIN:
      scDoCheckinAction(device);
      break;
  }
}

/* ============================================================
   MODE 1: CF CAL/PM (สอบเทียบ) → พร้อมส่ง
   ============================================================ */
function scDoCalibrateAction(device) {
  if (device.display_status === 'พร้อมส่ง') {
    scShowFlash('success', '✅ เครื่องนี้มีสถานะ "พร้อมส่ง" อยู่แล้ว');
    scAddLog(device, 'CF CAL/PM', 'ไม่มีการเปลี่ยนแปลง (สถานะเดิม: พร้อมส่ง)');
    return;
  }

  google.script.run
    .withSuccessHandler(function() {
      scShowFlash('success', '✅ ' + device.id_code + ' → สถานะเปลี่ยนเป็น "พร้อมส่ง" เรียบร้อย');
      scAddLog(device, 'CF CAL/PM', device.display_status + ' → พร้อมส่ง');
      scClearInput();
    })
    .withFailureHandler(function(err) {
      scShowFlash('error', '❌ บันทึกไม่สำเร็จ: ' + (err.message || err));
    })
    .sd_calibrateDevice(device.id_code);
}

/* ============================================================
   MODE 2: CHECK-OUT (เช่ายืม)
   ============================================================ */
function scShowCheckoutForm(device) {
  const form = document.getElementById('sc-checkout-form');
  if (form) {
    form.classList.remove('hidden');
    form.dataset.idCode = device.id_code;
  }

  if (device.display_status !== 'พร้อมส่ง' && device.display_status !== 'รอสอบเทียบ') {
    scShowFlash('error', '⚠️ เครื่องนี้มีสถานะ "' + device.display_status + '" — ไม่สามารถ Check-out ได้');
    if (form) form.classList.add('hidden');
    return;
  }
}

function scConfirmCheckout() {
  const form = document.getElementById('sc-checkout-form');
  const idCode = form ? form.dataset.idCode : '';
  const borrower = (document.getElementById('sc-borrower').value || '').trim();
  const location = (document.getElementById('sc-location').value || '').trim();
  const dueDate = document.getElementById('sc-due-date').value;
  const duration = document.getElementById('sc-duration').value;

  if (!idCode) { scShowFlash('error', '❌ ไม่มี ID Code'); return; }
  if (!borrower) { scShowFlash('error', '❌ กรุณากรอกผู้ยืม'); return; }
  if (!location) { scShowFlash('error', '❌ กรุณากรอก Location'); return; }
  if (!dueDate) { scShowFlash('error', '❌ กรุณากรอก Due Date'); return; }

  google.script.run
    .withSuccessHandler(function() {
      scShowFlash('success', '✅ Check-out สำเร็จ: ' + idCode + ' → เช่ายืม (' + borrower + ')');
      scAddLog({ id_code: idCode }, 'CHECK-OUT', 'ผู้ยืม: ' + borrower + ', Location: ' + location);
      // Clear form
      document.getElementById('sc-borrower').value = '';
      document.getElementById('sc-location').value = '';
      document.getElementById('sc-due-date').value = '';
      document.getElementById('sc-duration').value = '';
      form.classList.add('hidden');
      scClearInput();
    })
    .withFailureHandler(function(err) {
      scShowFlash('error', '❌ Check-out ไม่สำเร็จ: ' + (err.message || err));
    })
    .sd_checkoutDevice(idCode, borrower, location, dueDate, duration || '');
}

/* ============================================================
   MODE 3: CHECK-IN (รับคืน) → รอสอบเทียบ
   ============================================================ */
function scDoCheckinAction(device) {
  if (device.display_status !== 'เช่ายืม') {
    scShowFlash('error', '⚠️ เครื่องนี้ไม่ได้อยู่ในสถานะ "เช่ายืม" (สถานะปัจจุบัน: ' + device.display_status + ')');
    scAddLog(device, 'CHECK-IN', 'ไม่มีการเปลี่ยนแปลง (สถานะเดิม: ' + device.display_status + ')');
    return;
  }

  google.script.run
    .withSuccessHandler(function() {
      scShowFlash('success', '✅ Check-in สำเร็จ: ' + device.id_code + ' → สถานะเปลี่ยนเป็น "รอสอบเทียบ"');
      scAddLog(device, 'CHECK-IN', 'เช่ายืม → รอสอบเทียบ');
      scClearInput();
    })
    .withFailureHandler(function(err) {
      scShowFlash('error', '❌ Check-in ไม่สำเร็จ: ' + (err.message || err));
    })
    .sd_checkinDevice(device.id_code);
}

/* ============================================================
   OCR SCAN
   ============================================================ */
function scOcrScan() {
  Swal.fire({
    title: '📷 OCR Scan',
    html: `<p style="font-size:0.9rem;">ถ่ายภาพ barcode หรือ serial number</p>
      <input type="file" id="swal-ocr-file" accept="image/*" capture="environment" class="swal2-file">`,
    showCancelButton: true,
    confirmButtonText: 'สแกน',
    confirmButtonColor: SC_COLORS.navy,
    preConfirm: function() {
      const file = document.getElementById('swal-ocr-file').files[0];
      if (!file) { Swal.showValidationMessage('กรุณาเลือกไฟล์ภาพ'); return false; }
      return new Promise(function(resolve) {
        const reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.readAsDataURL(file);
      });
    }
  }).then(function(result) {
    if (result.isConfirmed && result.value) {
      // Send to OCR backend
      google.script.run
        .withSuccessHandler(function(text) {
          if (text) {
            document.getElementById('sc-scan-input').value = text.trim();
            scScan();
          } else {
            scShowFlash('error', '❌ OCR ไม่สามารถอ่านข้อความได้');
          }
        })
        .withFailureHandler(function(err) {
          scShowFlash('error', '❌ OCR Error: ' + (err.message || err));
        })
        .sd_ocrScan(result.value);
    }
  });
}

/* ============================================================
   DEVICE PREVIEW
   ============================================================ */
function scShowDevicePreview(device) {
  const preview = document.getElementById('sc-device-preview');
  if (!preview) return;
  preview.classList.remove('hidden');
  preview.innerHTML = `
    <dl class="sc-device-info">
      <dt>ID Code</dt><dd>${spEsc(device.id_code || '-')}</dd>
      <dt>Serial Number</dt><dd>${spEsc(device.serial_number || '-')}</dd>
      <dt>Brand / Model</dt><dd>${spEsc(device.brand || '')} ${spEsc(device.model || '')}</dd>
      <dt>สถานะ</dt><dd><span class="sp-badge ${spEsc(device.display_status || '')}">${spEsc(device.display_status || '-')}</span></dd>
      <dt>Location</dt><dd>${spEsc(device.location || '-')}</dd>
      <dt>Borrower</dt><dd>${spEsc(device.borrower || '-')}</dd>
      <dt>Due Date</dt><dd>${spFmtDate(device.due_date)}</dd>
      <dt>Action Required</dt><dd>${spEsc(device.action_required || '-')}</dd>
    </dl>`;
}

/* ============================================================
   MANUAL STATUS CHANGE
   ============================================================ */
function sc_changeStatus() {
  const idCode = (document.getElementById('sc-manual-id').value || '').trim();
  const newStatus = document.getElementById('sc-manual-status').value;

  if (!idCode) {
    Swal.fire('กรุณากรอก ID Code', '', 'warning');
    return;
  }

  Swal.fire({
    title: 'ยืนยันเปลี่ยนสถานะ',
    html: `<p>เครื่อง: <strong>${spEsc(idCode)}</strong></p><p>สถานะใหม่: <span class="sp-badge ${spEsc(newStatus)}">${spEsc(newStatus)}</span></p>`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    confirmButtonColor: SC_COLORS.navy
  }).then(function(result) {
    if (result.isConfirmed) {
      google.script.run
        .withSuccessHandler(function() {
          Swal.fire('สำเร็จ!', 'เปลี่ยนสถานะเป็น "' + newStatus + '" เรียบร้อย', 'success');
          scAddLog({ id_code: idCode }, 'Manual', '→ ' + newStatus);
          document.getElementById('sc-manual-id').value = '';
        })
        .withFailureHandler(function(err) {
          Swal.fire('Error', err.message || err, 'error');
        })
        .sd_updateDeviceStatus(idCode, newStatus);
    }
  });
}

/* ============================================================
   EXTEND CONTRACT
   ============================================================ */
function sc_extendContract() {
  const idCode = (document.getElementById('sc-extend-id').value || '').trim();
  const months = document.getElementById('sc-extend-months').value;
  const newDate = document.getElementById('sc-extend-date').value;

  if (!idCode) { Swal.fire('กรุณากรอก ID Code', '', 'warning'); return; }
  if (!months && !newDate) { Swal.fire('กรุณากรอกจำนวนเดือน หรือ Due Date ใหม่', '', 'warning'); return; }

  Swal.fire({
    title: 'ยืนยันขยายสัญญา',
    html: `<p>เครื่อง: <strong>${spEsc(idCode)}</strong></p>
      ${months ? '<p>ขยาย: ' + months + ' เดือน</p>' : ''}
      ${newDate ? '<p>Due Date ใหม่: ' + newDate + '</p>' : ''}`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    confirmButtonColor: SC_COLORS.navy
  }).then(function(result) {
    if (result.isConfirmed) {
      google.script.run
        .withSuccessHandler(function() {
          Swal.fire('สำเร็จ!', 'ขยายสัญญาเรียบร้อย', 'success');
          scAddLog({ id_code: idCode }, 'Extend', 'ขยาย ' + (months || '') + ' เดือน, Due: ' + (newDate || '-'));
          document.getElementById('sc-extend-id').value = '';
          document.getElementById('sc-extend-months').value = '';
          document.getElementById('sc-extend-date').value = '';
        })
        .withFailureHandler(function(err) {
          Swal.fire('Error', err.message || err, 'error');
        })
        .sd_extendContract(idCode, months, newDate);
    }
  });
}

/* ============================================================
   ACCESSORIES ISSUE
   ============================================================ */
function scReportAccIssue() {
  const idCode = (document.getElementById('sc-acc-id').value || '').trim();
  const issue = (document.getElementById('sc-acc-issue').value || '').trim();

  if (!idCode || !issue) {
    Swal.fire('กรุณากรอกข้อมูลให้ครบ', '', 'warning');
    return;
  }

  google.script.run
    .withSuccessHandler(function() {
      Swal.fire('บันทึกแล้ว!', 'รายงานปัญหา Accessories เรียบร้อย', 'success');
      document.getElementById('sc-acc-id').value = '';
      document.getElementById('sc-acc-issue').value = '';
    })
    .withFailureHandler(function(err) {
      Swal.fire('Error', err.message || err, 'error');
    })
    .sd_reportAccessoryIssue(idCode, issue);
}

/* ============================================================
   SCAN LOG
   ============================================================ */
function scAddLog(device, action, detail) {
  scScanLog.unshift({
    time: new Date().toLocaleTimeString('th-TH'),
    id_code: device.id_code || '-',
    action: action,
    detail: detail
  });

  // Update log table
  const logContainer = document.getElementById('sc-log-table');
  if (logContainer) logContainer.innerHTML = scRenderLogTable();

  // Update count in header
  const section = document.querySelector('.sc-log-section h4');
  if (section) section.textContent = '📝 บันทึกการสแกน (' + scScanLog.length + ' รายการ)';
}

function scRenderLogTable() {
  if (scScanLog.length === 0) {
    return '<div class="sc-log-empty">ยังไม่มีบันทึก — เริ่มสแกนเครื่องเพื่อบันทึก</div>';
  }

  let html = `<table class="sc-log-table"><thead><tr><th>เวลา</th><th>ID Code</th><th>Action</th><th>รายละเอียด</th></tr></thead><tbody>`;
  scScanLog.forEach(function(log) {
    html += `<tr>
      <td>${spEsc(log.time)}</td>
      <td><strong>${spEsc(log.id_code)}</strong></td>
      <td>${spEsc(log.action)}</td>
      <td>${spEsc(log.detail)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* ============================================================
   HELPERS
   ============================================================ */
function scShowFlash(type, msg) {
  const flash = document.getElementById('sc-flash');
  if (!flash) return;
  flash.innerHTML = `<div class="sc-flash sc-flash-${type}">${msg}</div>`;
  setTimeout(function() { flash.innerHTML = ''; }, 5000);
}

function scClearInput() {
  const input = document.getElementById('sc-scan-input');
  if (input) { input.value = ''; input.focus(); }
}

/* ============================================================
   INIT
   ============================================================ */
function scInit() {
  scLoadCheckStock();
}

/* ============================================================
   APP CONTROLLER COMPATIBILITY
   ============================================================ */
function initStockCheckModule(force) {
  scLoadCheckStock();
}
