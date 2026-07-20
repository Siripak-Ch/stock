// ============================================================
// CES Hub include-loader.js
// Synchronous loader for static GitHub Pages modular HTML/JS.
// It preserves original execution order and keeps DOM ready listeners working.
// ============================================================
(function (window, document) {
  'use strict';

  function cacheBust(url) {
    var hash = window.CES_BUILD_HASH || 'dev';
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(hash);
  }

  function getTextSync(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cacheBust(url), false);
    try {
      xhr.send(null);
    } catch (err) {
      throw new Error('Cannot load ' + url + ': ' + (err && err.message ? err.message : err));
    }
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) return xhr.responseText;
    throw new Error('Cannot load ' + url + ': HTTP ' + xhr.status);
  }

  function showBootError(err) {
    console.error('[CESBoot]', err);
    var box = document.getElementById('ces-boot-error');
    if (!box) return;
    box.className = 'fixed inset-x-4 top-4 z-[9999] rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 shadow-xl font-sans';
    box.innerHTML = '<div class="font-bold mb-1">CES Hub boot error</div><div class="text-sm">' +
      String(err && err.message ? err.message : err).replace(/[<>&]/g, function (ch) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]); }) +
      '</div><div class="text-xs mt-2 text-red-500">ตรวจสอบ path ใน index.html หรือ push ไฟล์ views/js ครบหรือไม่</div>';
  }

  function loadHtml(items) {
    items.forEach(function (item) {
      var target = document.querySelector(item.target || 'body');
      if (!target) throw new Error('Target not found for ' + item.url + ': ' + item.target);
      var html = getTextSync(item.url);
      target.insertAdjacentHTML('beforeend', html);
    });
  }

  function loadScripts(urls) {
    urls.forEach(function (url) {
      var code = getTextSync(url);
      var script = document.createElement('script');
      script.text = code + '\n//# sourceURL=' + url;
      document.head.appendChild(script);
    });
  }

  window.CESBoot = {
    getTextSync: getTextSync,
    loadHtml: function (items) {
      try { loadHtml(items); } catch (err) { showBootError(err); throw err; }
    },
    loadScripts: function (urls) {
      try { loadScripts(urls); } catch (err) { showBootError(err); throw err; }
    }
  };
})(window, document);
