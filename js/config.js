// ============================================================
// config.js
// CES Hub GitHub Frontend Configuration
// Frontend only. Sheet IDs are checked through Apps Script health API.
// ============================================================

window.CES_CONFIG = {
  // IMPORTANT: After deploying Apps Script backend, paste the latest /exec URL here.
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxg5ns8L_vO4Z1A2OxnqkKDNaHb9_WDHSUdfPXX4FR7ly55yYCty3jROrtknPzkdSzv/exec',

  CSI_SURVEY_URL: 'https://survey.nhealth-asia.com/s/cm1hci0mw00jf45vmps2myg1g',

  APP_NAME: 'CES Hub',

  DEBUG: false,

  EXPECTED_SHEETS: {
    MAIN:  '1w3_j_2T67f9xy_ndGYw9LuuKCPEttw52zwVUxM1zUNE',
    KPI:   '1vNt7qUenxteIV3A0TnQ2QYf0esyOu3NvEjZG8zme5Gk',
    STOCK: '1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk'
  }
};
