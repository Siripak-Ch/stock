/**
 * 000-core-global-helpers.js
 * Shared frontend helpers loaded before every module.
 * Fixes legacy module errors such as: spEsc is not defined.
 */
(function (window, document) {
  'use strict';

  function text(v) { return v === null || v === undefined ? '' : String(v); }

  function esc(v) {
    return text(v).replace(/[&<>"']/g, function (m) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m];
    });
  }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var n = Number(text(v).replace(/[,฿%\s]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function fmt(v, digit) {
    return num(v).toLocaleString('en-US', { maximumFractionDigits: digit == null ? 0 : digit });
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html == null ? '' : String(html);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? '' : String(value);
  }

  function val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : (fallback == null ? '' : fallback);
  }

  function normStatus(input) {
    var s = text(input).replace(/\s+/g, ' ').trim();
    var c = s.replace(/\s+/g, '').toLowerCase();
    if (!s) return '';
    if (/ไม่พบ|missing|notfound|lost/.test(c)) return 'ไม่พบในรายการ';
    if (/ใช้งานไม่ได้|ชำรุด|เสีย|broken|damage|notworking|outofservice/.test(c)) return 'ใช้งานไม่ได้';
    if (/เช่ายืม|เช่า|ยืม|rental|rent|borrow|loan|checkout|check-out/.test(c) && !/คืน|return|returned/.test(c)) return 'เช่ายืม';
    if (/พร้อมส่ง|ready|available|passed|cf|calpm|cal\/pm/.test(c) && !/รอ|pending|wait/.test(c)) return 'พร้อมส่ง';
    if (/รอสอบเทียบ|pending|waiting|calibration|สอบเทียบ|warehouse|คลัง/.test(c)) return 'รอสอบเทียบ';
    return s;
  }

  window.spEsc = window.spEsc || esc;
  window.spNum = window.spNum || fmt;
  window.spSetHtml = window.spSetHtml || setHtml;
  window.spSetText = window.spSetText || setText;
  window.spVal = window.spVal || val;
  window.spNormStatus = window.spNormStatus || normStatus;
  window.CES_SAFE = window.CES_SAFE || { esc: esc, num: num, fmt: fmt, setHtml: setHtml, setText: setText, val: val, normStatus: normStatus };

  window.CES_CORE_HELPERS_RECHECK = function () {
    return {
      ok: true,
      hasSpEsc: typeof window.spEsc === 'function',
      hasSpNum: typeof window.spNum === 'function',
      hasGasApi: !!(window.CES_API && typeof window.CES_API.callFunction === 'function'),
      gasUrl: window.CES_CONFIG && window.CES_CONFIG.GAS_API_URL || ''
    };
  };
})(window, document);
