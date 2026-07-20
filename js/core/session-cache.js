// ============================================================
// session-cache.js
// CES Hub Frontend Session Cache
//
// Caches API responses in sessionStorage so switching tabs
// doesn't re-fetch data. Each cache entry expires after TTL.
//
// Usage:
//   var data = CES_Cache.get('ot_dashboard');
//   if (data) { renderOT(data); return; }
//   google.script.run.withSuccessHandler(function(result) {
//     CES_Cache.set('ot_dashboard', result, 300);
//     renderOT(result);
//   }).getOTDashboardData();
// ============================================================

(function(window) {
  'use strict';

  var PREFIX = 'CES_CACHE_';
  var DEFAULT_TTL = 300; // 5 minutes

  var CES_Cache = {
    /**
     * Get cached data if not expired
     * @param {string} key - Cache key
     * @returns {*} Parsed data or null if expired/missing
     */
    get: function(key) {
      try {
        var raw = sessionStorage.getItem(PREFIX + key);
        if (!raw) return null;
        var entry = JSON.parse(raw);
        if (Date.now() > entry.exp) {
          sessionStorage.removeItem(PREFIX + key);
          return null;
        }
        return entry.data;
      } catch (e) {
        return null;
      }
    },

    /**
     * Store data with TTL
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {number} ttl - Time to live in seconds (default 300)
     */
    set: function(key, data, ttl) {
      try {
        ttl = ttl || DEFAULT_TTL;
        var entry = {
          data: data,
          exp: Date.now() + (ttl * 1000),
          ts: Date.now()
        };
        sessionStorage.setItem(PREFIX + key, JSON.stringify(entry));
      } catch (e) {
        // sessionStorage full or unavailable — silent fail
      }
    },

    /**
     * Remove a specific cache entry
     * @param {string} key - Cache key
     */
    remove: function(key) {
      try { sessionStorage.removeItem(PREFIX + key); } catch (e) {}
    },

    /**
     * Clear all CES cache entries
     */
    clearAll: function() {
      try {
        var keys = Object.keys(sessionStorage).filter(function(k) {
          return k.indexOf(PREFIX) === 0;
        });
        keys.forEach(function(k) { sessionStorage.removeItem(k); });
      } catch (e) {}
    },

    /**
     * Check if a key has valid (non-expired) cache
     * @param {string} key
     * @returns {boolean}
     */
    has: function(key) {
      return this.get(key) !== null;
    },

    /**
     * Get cache age in seconds (how stale the data is)
     * @param {string} key
     * @returns {number} seconds since cached, or -1 if no cache
     */
    age: function(key) {
      try {
        var raw = sessionStorage.getItem(PREFIX + key);
        if (!raw) return -1;
        var entry = JSON.parse(raw);
        return Math.floor((Date.now() - entry.ts) / 1000);
      } catch (e) { return -1; }
    }
  };

  // Expose globally
  window.CES_Cache = CES_Cache;

  // Cache keys for each module (used by modules)
  window.CES_CACHE_KEYS = {
    HOME: 'home_dashboard',
    JOB: 'job_dashboard',
    REVENUE: 'revenue_dashboard',
    OT: 'ot_dashboard',
    SERVICE: 'service_csi',
    REPORT: 'report_csi',
    CALENDAR: 'calendar',
    CHECKIN: 'checkin',
    WEEKLY: 'weekly_report',
    REPORT_MANAGE: 'report_manage',
    KPI: 'kpi_tracking',
    STOCK_DASH: 'stock_dashboard',
    INVENTORY: 'inventory',
    CHECK_STOCK: 'check_stock',
    USERS: 'users',
    SETTINGS: 'settings'
  };

})(window);
