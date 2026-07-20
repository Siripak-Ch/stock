// ============================================================
// gas-polyfill.js
// CES Hub GitHub Frontend → Apps Script API Bridge
//
// Replaces google.script.run on GitHub Pages / LINE LIFF.
// Transport:
// - JSONP GET for read/small calls
// - Hidden iframe POST for save/process/large calls
// Backend expected:
//   /exec?api=1&action=call&fn=getAllData&args=[]&callback=...
//   POST form fields: api, action, fn, args, callback, transport=iframe
// ============================================================

(function () {
  'use strict';

  const JSONP_TIMEOUT_MS = 90000;
  const IFRAME_TIMEOUT_MS = 180000;
  const JSONP_URL_LIMIT = 6500;
  let seq = 0;

  function getGasApiUrl() {
    if (!window.CES_CONFIG || !window.CES_CONFIG.GAS_API_URL) {
      throw new Error('Missing window.CES_CONFIG.GAS_API_URL in js/config.js');
    }
    const url = String(window.CES_CONFIG.GAS_API_URL || '').trim();
    if (!url || url.includes('PASTE_')) {
      throw new Error('GAS_API_URL is not configured correctly in js/config.js');
    }
    return url;
  }

  function nextId(prefix) {
    seq += 1;
    return '__CES_' + prefix + '_' + Date.now() + '_' + seq + '__';
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value == null ? [] : value);
    } catch (err) {
      console.error('[CES API] JSON stringify error:', err);
      return '[]';
    }
  }

  function normalizeError(err) {
    if (!err) return { message: 'Unknown API error', stack: '' };
    if (typeof err === 'string') return { message: err, stack: '' };
    return { message: err.message || String(err), stack: err.stack || '', raw: err };
  }

  function unwrapApiResponse(raw, options) {
    options = options || {};
    if (options.raw === true) return raw;
    if (!raw) throw new Error('Empty API response');
    if (raw.success === false) throw new Error(raw.message || raw.error || 'Apps Script API returned success:false');
    if (raw.ok === false) throw new Error(raw.message || raw.error || 'Apps Script API returned ok:false');

    // Expected API bridge wrapper:
    // { success:true, data:{ functionName, resolvedFunctionName, elapsedMs, result } }
    if (raw.data && typeof raw.data === 'object' && Object.prototype.hasOwnProperty.call(raw.data, 'result')) {
      return raw.data.result;
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'result')) return raw.result;
    if (Object.prototype.hasOwnProperty.call(raw, 'data')) return raw.data;
    return raw;
  }

  function buildJsonpUrl(fnName, args, callbackName) {
    const baseUrl = getGasApiUrl();
    const params = new URLSearchParams();
    params.set('api', '1');
    params.set('action', fnName === 'health' ? 'health' : 'call');
    if (fnName !== 'health') {
      params.set('fn', fnName);
      params.set('functionName', fnName);
      params.set('args', safeStringify(args || []));
      // Compatibility for newer Apps Script routers that read one payload object.
      params.set('payload', safeStringify({ fn: fnName, functionName: fnName, args: args || [] }));
    }
    params.set('callback', callbackName);
    params.set('_ts', String(Date.now()));
    return baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString();
  }

  function jsonpByUrl(url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      let timeoutId = null;
      const script = document.createElement('script');
      const match = url.match(/[?&]callback=([^&]+)/);
      const callbackName = match ? decodeURIComponent(match[1]) : '';
      if (!callbackName) {
        reject(normalizeError(new Error('Missing JSONP callback name')));
        return;
      }

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (response) {
        cleanup();
        try { resolve(unwrapApiResponse(response, options)); }
        catch (err) { reject(normalizeError(err)); }
      };

      script.onerror = function () {
        cleanup();
        reject(normalizeError(new Error('Cannot connect to Apps Script API')));
      };

      timeoutId = setTimeout(function () {
        cleanup();
        reject(normalizeError(new Error('Apps Script API timeout')));
      }, options.timeoutMs || JSONP_TIMEOUT_MS);

      script.async = true;
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function jsonpCall(fnName, args, options) {
    const callbackName = nextId('JSONP_CB');
    const url = buildJsonpUrl(fnName, args || [], callbackName);
    if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.log('[CES API] JSONP', fnName, args || []);
    return jsonpByUrl(url, options || {});
  }

  function iframePostCall(fnName, args, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      const callbackName = nextId('IFRAME_CB');
      const frameName = callbackName + '_frame';
      let timeoutId = null;
      const iframe = document.createElement('iframe');
      const form = document.createElement('form');

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', onMessage);
        setTimeout(function () {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 50);
      }

      function onMessage(event) {
        const msg = event && event.data;
        if (!msg || msg.type !== 'CES_API_IFRAME_RESPONSE' || msg.callback !== callbackName) return;
        cleanup();
        try { resolve(unwrapApiResponse(msg.payload, options)); }
        catch (err) { reject(normalizeError(err)); }
      }

      timeoutId = setTimeout(function () {
        cleanup();
        reject(normalizeError(new Error('Apps Script API iframe timeout: ' + fnName)));
      }, options.timeoutMs || IFRAME_TIMEOUT_MS);

      window.addEventListener('message', onMessage);

      iframe.name = frameName;
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      form.method = 'POST';
      form.action = getGasApiUrl();
      form.target = frameName;
      form.style.display = 'none';
      form.acceptCharset = 'UTF-8';

      const fields = {
        api: '1',
        action: 'call',
        fn: fnName,
        functionName: fnName,
        args: safeStringify(args || []),
        callback: callbackName,
        transport: 'iframe',
        _ts: String(Date.now())
      };

      Object.keys(fields).forEach(function (key) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.log('[CES API] IFRAME POST', fnName, args || []);
      form.submit();
    });
  }

  function isWriteLikeFunction(fnName) {
    return /(save|update|delete|clear|sync|submit|record|process|send|upload|import|bulk|approve|reject|checkout|return|extend|restock|issue|adjust|mark|edit|link|write)/i.test(String(fnName || ''));
  }

  function shouldUseIframe(fnName, args, options) {
    if (options && options.transport === 'jsonp') return false;
    if (options && options.transport === 'iframe') return true;

    const testUrl = buildJsonpUrl(fnName, args || [], 'x');

    // Revenue save payloads are small and previously could hang on hidden iframe POST
    // in GitHub Pages / LIFF. Use JSONP when URL length is safe.
    if (/^(saveRevenueData|saveRevenueTargetData|saveBulkRevenueData)$/i.test(String(fnName || '')) && testUrl.length <= JSONP_URL_LIMIT) {
      return false;
    }


    // Inventory module calls are small but write-like names normally force hidden iframe POST.
    // On GitHub Pages / LIFF, iframe POST can hang; use JSONP when URL length is safe.
    if (/^(?:si_(checkoutCart|submitMixedCheckout|editEquipment|markEquipmentBroken|deleteEquipment|extendRental|returnEquipment|restockAccessory|issueAccessory|adjustAccessory|updateAccessoryMinStock|updateAccessoryMinStockBatch|updateAccessoryCheckResult|updateAccessoryCheckResultBatch|approveAccessoryRequestFromWeb|rejectAccessoryRequestFromWeb)|cesStockV5_(cfCalPm|checkout|checkoutBatch|return|markBroken|markMissing|recover|editEquipment|extendRental))$/i.test(String(fnName || '')) && testUrl.length <= JSONP_URL_LIMIT) {
      return false;
    }

    if (isWriteLikeFunction(fnName)) return true;
    return testUrl.length > JSONP_URL_LIMIT;
  }

  function callFunction(fnName, args, options) {
    options = options || {};
    args = Array.isArray(args) ? args : [];
    if (shouldUseIframe(fnName, args, options)) return iframePostCall(fnName, args, options);
    return jsonpCall(fnName, args, options);
  }


  // Chunk large Excel uploads into safe JSONP requests.
  // This avoids hidden-iframe POST timeouts on GitHub Pages / LIFF while keeping each URL below browser/Apps Script limits.
  function makeRowChunksForJsonp(fnName, rows, meta, options) {
    options = options || {};
    rows = Array.isArray(rows) ? rows : [];
    const maxUrlLength = options.maxUrlLength || 5800;
    const chunks = [];
    let current = [];

    function argsFor(batch) {
      if (/^saveServiceDataArray$/i.test(String(fnName || ''))) return [batch, meta || {}];
      if (typeof meta !== 'undefined' && meta !== null && /^save.*Service/i.test(String(fnName || ''))) return [batch, meta || {}];
      return [batch];
    }

    function urlLen(batch) {
      try { return buildJsonpUrl(fnName, argsFor(batch), 'x').length; }
      catch (e) { return 999999; }
    }

    rows.forEach(function (row) {
      const next = current.concat([row]);
      if (current.length && urlLen(next) > maxUrlLength) {
        chunks.push(current);
        current = [row];
      } else {
        current = next;
      }
    });
    if (current.length) chunks.push(current);
    return chunks;
  }

  function aggregateChunkResults(fnName, chunks, results) {
    const out = { success: true, functionName: fnName, chunks: chunks.length, rowsSent: chunks.reduce(function (a, c) { return a + c.length; }, 0), total: 0, main: 0, tes: 0, results: results || [] };
    (results || []).forEach(function (r) {
      if (typeof r === 'number') {
        out.total += r;
      } else if (r && typeof r === 'object') {
        out.total += Number(r.total || r.added || r.updated || r.count || 0) || 0;
        out.main += Number(r.main || 0) || 0;
        out.tes += Number(r.tes || 0) || 0;
      }
    });
    return out;
  }

  async function chunkedRowsCall(fnName, rows, meta, options) {
    options = options || {};
    rows = Array.isArray(rows) ? rows : [];
    if (!rows.length) return { success: true, functionName: fnName, chunks: 0, rowsSent: 0, total: 0, main: 0, tes: 0, results: [] };

    const chunks = makeRowChunksForJsonp(fnName, rows, meta, options);
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      if (typeof options.onProgress === 'function') {
        try { options.onProgress(i + 1, chunks.length, chunks[i].length); } catch (e) {}
      }
      const args = /^saveServiceDataArray$/i.test(String(fnName || '')) ? [chunks[i], meta || {}] : [chunks[i]];
      const res = await callFunction(fnName, args, { transport: 'jsonp', timeoutMs: options.timeoutMs || 120000 });
      results.push(res);
    }
    return aggregateChunkResults(fnName, chunks, results);
  }

  window.CES_API = {
    callFunction: callFunction,
    call: function (fnName, payload, options) {
      const args = Array.isArray(payload) ? payload : (typeof payload === 'undefined' ? [] : [payload]);
      return callFunction(fnName, args, options || {});
    },
    raw: function (fnName, args, options) {
      options = options || {};
      options.raw = true;
      return callFunction(fnName, Array.isArray(args) ? args : [], options);
    },
    health: function () { return jsonpCall('health', [], { raw: true }); },
    login: function (employeeId) { return callFunction('checkLogin', [employeeId], {}); },
    getAllData: function () { return callFunction('getAllData', [], {}); },
    chunkedRows: function (fnName, rows, meta, options) { return chunkedRowsCall(fnName, rows, meta || {}, options || {}); }
  };

  function createRunner(successHandler, failureHandler, userObject) {
    return new Proxy({}, {
      get: function (target, prop) {
        if (prop === 'withSuccessHandler') {
          return function (handler) { return createRunner(handler, failureHandler, userObject); };
        }
        if (prop === 'withFailureHandler') {
          return function (handler) { return createRunner(successHandler, handler, userObject); };
        }
        if (prop === 'withUserObject') {
          return function (obj) { return createRunner(successHandler, failureHandler, obj); };
        }
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;

        return function () {
          const fnName = String(prop);
          const args = Array.prototype.slice.call(arguments);
          callFunction(fnName, args, {})
            .then(function (result) {
              if (typeof successHandler === 'function') {
                if (typeof userObject !== 'undefined') successHandler(result, userObject);
                else successHandler(result);
              }
            })
            .catch(function (err) {
              const normalized = normalizeError(err);
              if (typeof failureHandler === 'function') {
                if (typeof userObject !== 'undefined') failureHandler(normalized, userObject);
                else failureHandler(normalized);
              } else {
                console.error('[google.script.run polyfill]', fnName, normalized);
              }
            });
          return createRunner(null, null, undefined);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null, undefined);

  window.CES_API_TEST = {
    health: function () { return window.CES_API.health(); },
    checkLogin: function (employeeId) { return window.CES_API.login(employeeId || '51032'); },
    getAllData: function () { return window.CES_API.getAllData(); },
    call: function (fnName, args, options) { return window.CES_API.callFunction(fnName, Array.isArray(args) ? args : [], options || {}); },
    runBasicTest: async function (employeeId) {
      console.group('CES API Basic Test');
      try { console.log('Health OK:', await window.CES_API_TEST.health()); } catch (e) { console.error('Health FAIL:', e); }
      try { console.log('Login OK:', await window.CES_API_TEST.checkLogin(employeeId || '51032')); } catch (e) { console.error('Login FAIL:', e); }
      try {
        const allData = await window.CES_API_TEST.getAllData();
        console.log('getAllData OK:', allData);
        console.log('config:', allData && allData.config);
        console.log('yearlyStats:', allData && allData.yearlyStats ? allData.yearlyStats.length : 0);
        console.log('calSummary:', allData && allData.calSummary ? allData.calSummary.length : 0);
      } catch (e) { console.error('getAllData FAIL:', e); }
      console.groupEnd();
    }
  };


  window.CES_API_RECHECK_GAS_POLYFILL = function () {
    return window.CES_API.health()
      .then(function (res) { console.log('[CES_API_RECHECK_GAS_POLYFILL] connected', res); return { ok: true, result: res }; })
      .catch(function (err) { console.error('[CES_API_RECHECK_GAS_POLYFILL] failed', err); return { ok: false, error: err && err.message ? err.message : String(err) }; });
  };

  console.log('[CES Hub] gas-polyfill.js loaded: JSONP + iframe POST enabled');
})();
