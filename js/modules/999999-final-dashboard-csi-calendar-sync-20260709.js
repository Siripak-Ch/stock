/**
 * 999999-final-dashboard-csi-calendar-sync-20260709.js
 * Load LAST. Frontend compatibility patch for:
 * Home header/theme, Home Revenue/Job/Service CSI summary, Service/Report CSI upload,
 * Service CSI PDF preview/export, OT silent load, Master Calendar TES capacity and tracker color.
 */
(function(){
  'use strict';
  var VERSION = '20260709-dashboard-csi-calendar-sync';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var TEAM_COLORS = { MED:'#003DA5', LAB:'#00A9E0', EHS:'#00A88E', TES:'#FFB800', ALL:'#003DA5', MGT:'#64748B' };
  var pdfLibPromise = null;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(v){ return v == null ? '' : String(v).trim(); }
  function esc(v){ return text(v).replace(/[&<>'"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]; }); }
  function num(v){
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = text(v).replace(/[,฿%\s]/g, '');
    if (!s || s === '-' || /^nan$/i.test(s)) return 0;
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  function pct(a,b){ return b ? (num(a) / num(b) * 100) : 0; }
  function fmt(n, digits){ return num(n).toLocaleString('en-US', { maximumFractionDigits: digits == null ? 1 : digits, minimumFractionDigits: digits == null ? 0 : digits }); }
  function fmtShort(v){ var n=num(v); if(Math.abs(n)>=1000000) return (n/1000000).toFixed(2).replace(/\.00$/,'')+'M'; if(Math.abs(n)>=1000) return (n/1000).toFixed(1).replace(/\.0$/,'')+'K'; return fmt(n,0); }
  function normalizeTeam(v){
    var s = text(v).toUpperCase();
    if (/MED|MEDICAL|เครื่องมือ/.test(s)) return 'MED';
    if (/LAB|TEST|LABORATORY|ห้องปฏิบัติ/.test(s)) return 'LAB';
    if (/EHS|ENV|ENVIRONMENT|HEALTH|สิ่งแวดล้อม/.test(s)) return 'EHS';
    if (/TES|TECH|ENGINEERING/.test(s)) return 'TES';
    return s || '';
  }
  function monthIndex(v){
    var s = text(v); if(!s) return -1;
    var n = Number(s); if(n >= 1 && n <= 12) return n-1;
    var short = s.slice(0,3).toLowerCase();
    for(var i=0;i<MONTHS.length;i++) if(MONTHS[i].toLowerCase() === short) return i;
    var d = new Date(s); if(!isNaN(d.getTime())) return d.getMonth();
    return -1;
  }
  function currentHomeYear(){
    var el = qs('#m-filter-year') || qs('#rev-filter-year') || qs('#yearly-filter-year');
    return text(el && el.value) || String(new Date().getFullYear());
  }
  function readGlobalArray(name){
    try { if (typeof window[name] !== 'undefined' && Array.isArray(window[name])) return window[name]; } catch(e) {}
    try { return eval('typeof '+name+'!=="undefined" && Array.isArray('+name+') ? '+name+' : []'); } catch(e) { return []; }
  }

  function injectFinalCss(){
    if(qs('#ces-final-all-sync-css')) return;
    var style = document.createElement('style');
    style.id = 'ces-final-all-sync-css';
    style.textContent = `
      :root{--ces-blue:#003DA5;--ces-blue2:#0A5BD3;--ces-light:#F3F8FF;--ces-border:#D8E6F7;--ces-cyan:#00A9E0;--ces-teal:#00A88E;--ces-yellow:#FFB800;--ces-navy:#172033;--ces-muted:#64748B;--ces-shadow:0 16px 34px rgba(0,61,165,.08)}
      body,#main-dashboard,#app-main-content,main{background:#F6F9FD!important;color:var(--ces-navy)!important}
      #view-home .p-3.bg-\[\#003DA5\]\/10,#view-home .bg-indigo-100,#view-calendar .p-3.bg-\[\#003DA5\]\/10,.ces-final-icon{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2))!important;color:#fff!important;box-shadow:0 12px 24px rgba(0,61,165,.18)!important}
      #view-home .bg-gradient-to-br.from-slate-700,#view-home [class*="from-slate-700"]{background:linear-gradient(135deg,#003DA5,#0A5BD3)!important;color:#fff!important}
      #view-home h3,#view-calendar h2,#view-calendar h3,#view-service h2,#view-report h2{color:var(--ces-blue)!important}
      #view-home .bg-white,#view-calendar .bg-white,#view-service .bg-white,#view-report .bg-white{border-color:var(--ces-border)!important}
      #home-service-csi-summary-section .ces-csi-table th{background:#F4F8FF;color:#003DA5;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:10px;border-bottom:1px solid var(--ces-border)}
      #home-service-csi-summary-section .ces-csi-table td{padding:10px;border-bottom:1px solid #EEF4FB;font-size:12px;color:#334155;font-weight:700}
      #home-service-csi-summary-section .ces-team-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:900;background:#F2F7FF;color:#003DA5;border:1px solid var(--ces-border)}
      #home-service-csi-summary-section .ces-mini-stat{background:white;border:1px solid var(--ces-border);border-radius:14px;padding:12px;box-shadow:0 8px 20px rgba(0,61,165,.05)}
      .ces-final-calendar-tes{border-left:4px solid var(--ces-yellow)!important}
      #capacity-dashboard-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      @media(max-width:1024px){#capacity-dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:640px){#capacity-dashboard-grid{grid-template-columns:1fr!important}}
      .swal2-popup{border-radius:26px!important;border:1px solid var(--ces-border)!important;box-shadow:0 24px 60px rgba(15,23,42,.20)!important}
      .swal2-title,.swal2-html-container h1,.swal2-html-container h2{color:var(--ces-blue)!important}
      .swal2-confirm{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2))!important;border-radius:14px!important;font-weight:900!important}
      .swal2-cancel{background:#EEF5FF!important;color:var(--ces-blue)!important;border-radius:14px!important;font-weight:900!important}
      #swal2-html-container .tracker-btn.active,#swal2-html-container .tracker-btn.bg-\[\#003DA5\]{background:linear-gradient(135deg,var(--ces-blue),var(--ces-blue2))!important;color:#fff!important}
      #swal2-html-container [class*="border-dashed"][class*="003DA5"],#swal2-html-container [class*="bg-\[\#003DA5\]\/60"]{background:#F2F7FF!important;color:var(--ces-blue)!important;border-color:#9EC5FF!important}
      #swal2-html-container [class*="border-dashed"] .fa-clock{color:var(--ces-blue)!important}
      .ces-pdf-preview-page{background:#fff;border:1px solid #dbe7f6;border-radius:10px;box-shadow:0 8px 22px rgba(15,23,42,.12);margin:0 auto 18px;max-width:100%;display:block}
      .ces-pdf-workbench *{animation:none!important;transition:none!important}
    `;
    document.head.appendChild(style);
  }

  function scoreOf(row){
    var vals = [row.s1,row.s2,row.s3,row.s4,row.s5,row.scoreS1,row.scoreS2,row.scoreS3,row.scoreS4,row.scoreS5].map(num).filter(function(v){ return v>0; });
    if(!vals.length) return 0;
    return vals.reduce(function(a,b){return a+b;},0) / vals.length;
  }
  function isFinished(row){
    var s = text(row.finished || row.Finished || row.status || row.Status).toLowerCase();
    return ['yes','y','true','1','finished','finish','complete','completed','done','สำเร็จ','เสร็จ'].indexOf(s) >= 0;
  }
  function buildServiceSummaryRows(){
    var rows = readGlobalArray('serviceRawData');
    var year = currentHomeYear();
    var filterTeam = text((typeof homeFilterTeam !== 'undefined' ? homeFilterTeam : 'All')).toUpperCase() || 'ALL';
    var teams = filterTeam === 'ALL' ? ['MED','LAB','EHS','TES'] : [filterTeam];
    var summary = {};
    teams.forEach(function(t){ summary[t] = {team:t,total:0,finish:0,notFinish:0,scoreSum:0,scoreCnt:0,comments:0}; });
    rows.forEach(function(r){
      var t = normalizeTeam(r.team || r.Team || r.serviceTeam || r.ServiceTeam || r.raw);
      if(!summary[t]) return;
      var y = text(r.year || r.Year);
      if(year && y && y !== year) return;
      var sc = scoreOf(r);
      summary[t].total += 1;
      if(isFinished(r)) summary[t].finish += 1; else summary[t].notFinish += 1;
      if(sc>0){ summary[t].scoreSum += sc; summary[t].scoreCnt += 1; }
      if(text(r.comments || r.comment).length > 2) summary[t].comments += 1;
    });
    return teams.map(function(t){ var s=summary[t]; s.avg=s.scoreCnt ? s.scoreSum/s.scoreCnt : 0; s.sat=s.avg ? s.avg/5*100 : 0; s.finishPct=s.total ? s.finish/s.total*100 : 0; return s; });
  }

  function ensureHomeServiceCsiSection(){
    var section = qs('#home-service-csi-summary-section');
    if(section) return section;
    var title = qsa('#home-view-yearly h3').find(function(h){ return /Yearly OT Performance|Service CSI Summary/i.test(h.textContent || ''); });
    section = title ? title.closest('.bg-white.p-6.rounded-3xl') || title.closest('.rounded-3xl') : null;
    if(!section){
      var yearly = qs('#home-view-yearly');
      if(!yearly) return null;
      section = document.createElement('div');
      section.className = 'bg-white p-6 rounded-3xl shadow-sm border border-gray-100';
      yearly.appendChild(section);
    }
    section.id = 'home-service-csi-summary-section';
    return section;
  }

  function renderHomeServiceCsiSummary(){
    injectFinalCss();
    var section = ensureHomeServiceCsiSection();
    if(!section) return;
    var rows = buildServiceSummaryRows();
    var total = rows.reduce(function(a,r){ return a + r.total; }, 0);
    var finish = rows.reduce(function(a,r){ return a + r.finish; }, 0);
    var avg = rows.reduce(function(a,r){ return a + r.scoreSum; },0) / Math.max(1, rows.reduce(function(a,r){ return a + r.scoreCnt; },0));
    section.innerHTML = `
      <div class="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
        <div>
          <h3 class="font-bold text-lg flex items-center gap-2"><span class="p-2 rounded-xl ces-final-icon"><i class="fas fa-clipboard-check"></i></span> Service CSI Summary</h3>
          <p class="text-xs text-slate-400 font-bold mt-1">YTD Quality / Satisfaction / Response by team</p>
        </div>
        <span class="text-[11px] font-black px-3 py-1 rounded-full bg-[#F2F7FF] text-[#003DA5] border border-[#D8E6F7]">${esc((typeof homeFilterTeam !== 'undefined' ? homeFilterTeam : 'All'))} · ${esc(currentHomeYear())}</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div class="ces-mini-stat"><div class="text-[10px] uppercase text-slate-400 font-black">Total Response</div><div class="text-2xl font-black text-[#003DA5]">${fmt(total,0)}</div></div>
        <div class="ces-mini-stat"><div class="text-[10px] uppercase text-slate-400 font-black">Finished</div><div class="text-2xl font-black text-[#00A88E]">${fmt(finish,0)}</div></div>
        <div class="ces-mini-stat"><div class="text-[10px] uppercase text-slate-400 font-black">Avg Score</div><div class="text-2xl font-black text-[#003DA5]">${avg ? avg.toFixed(2) : '0.00'}</div></div>
        <div class="ces-mini-stat"><div class="text-[10px] uppercase text-slate-400 font-black">Satisfaction</div><div class="text-2xl font-black text-[#00A9E0]">${avg ? (avg/5*100).toFixed(1) : '0.0'}%</div></div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-[#D8E6F7] bg-white">
        <table class="ces-csi-table w-full text-left">
          <thead><tr><th>Team</th><th>Total</th><th>Finished</th><th>Not Finish</th><th>Finish %</th><th>Avg Score</th><th>Satisfaction</th><th>Feedback</th></tr></thead>
          <tbody>${rows.map(function(r){ var c=TEAM_COLORS[r.team]||'#003DA5'; return `<tr><td><span class="ces-team-pill"><span style="width:8px;height:8px;border-radius:50%;background:${c};display:inline-block"></span>${r.team}</span></td><td>${fmt(r.total,0)}</td><td>${fmt(r.finish,0)}</td><td>${fmt(r.notFinish,0)}</td><td>${r.finishPct.toFixed(1)}%</td><td>${r.avg?r.avg.toFixed(2):'0.00'}</td><td>${r.sat?r.sat.toFixed(1):'0.0'}%</td><td>${fmt(r.comments,0)}</td></tr>`; }).join('')}</tbody>
        </table>
      </div>`;
  }

  function patchHome(){
    injectFinalCss();
    var headerIcon = qs('#view-home .flex.items-center.gap-4 > div:first-child');
    if(headerIcon) headerIcon.classList.add('ces-final-icon');
    try {
      if (typeof renderYearlyOTView === 'function') {
        renderYearlyOTView = function(){ renderHomeServiceCsiSummary(); };
        window.renderYearlyOTView = renderYearlyOTView;
      }
      if (typeof renderYearlyView === 'function' && !renderYearlyView.__cesPatched) {
        var oldYearly = renderYearlyView;
        renderYearlyView = function(){ var out = oldYearly.apply(this, arguments); setTimeout(renderHomeServiceCsiSummary, 80); return out; };
        renderYearlyView.__cesPatched = true;
        window.renderYearlyView = renderYearlyView;
      }
      if (typeof setHomeFilter === 'function' && !setHomeFilter.__cesPatched) {
        var oldSetHome = setHomeFilter;
        setHomeFilter = function(){ var out = oldSetHome.apply(this, arguments); setTimeout(renderHomeServiceCsiSummary, 80); return out; };
        setHomeFilter.__cesPatched = true;
        window.setHomeFilter = setHomeFilter;
      }
      if (typeof initService === 'function' && !initService.__cesHomePatched) {
        var oldInitService = initService;
        initService = function(){ var out = oldInitService.apply(this, arguments); setTimeout(renderHomeServiceCsiSummary, 100); return out; };
        initService.__cesHomePatched = true;
        window.initService = initService;
      }
    } catch(e){ console.warn('[CES Final] home patch warning', e); }
    setTimeout(renderHomeServiceCsiSummary, 120);
  }

  function loadScriptOnce(id, urls, testFn){
    if(testFn && testFn()) return Promise.resolve();
    urls = Array.isArray(urls) ? urls : [urls];
    return new Promise(function(resolve, reject){
      var i=0;
      function next(){
        if(testFn && testFn()) return resolve();
        if(i>=urls.length) return reject(new Error('Cannot load '+id));
        var url = urls[i++];
        var existing = qs('script[data-ces-lib="'+id+'"][src="'+url+'"],script[src="'+url+'"]');
        if(existing){
          existing.addEventListener('load', function(){ setTimeout(function(){ testFn && !testFn() ? next() : resolve(); }, 20); }, {once:true});
          existing.addEventListener('error', next, {once:true});
          setTimeout(function(){ if(testFn && testFn()) resolve(); }, 120);
          return;
        }
        var s=document.createElement('script');
        s.src=url; s.async=false; s.dataset.cesLib=id;
        s.onload=function(){ setTimeout(function(){ testFn && !testFn() ? next() : resolve(); }, 20); };
        s.onerror=next;
        document.head.appendChild(s);
      }
      next();
    });
  }
  function ensurePdfLibs(){
    if(window.html2canvas && window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if(!pdfLibPromise){
      pdfLibPromise = loadScriptOnce('html2canvas', [
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
      ], function(){return !!window.html2canvas;}).then(function(){
        return loadScriptOnce('jspdf', [
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
          'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
          'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ], function(){return !!(window.jspdf && window.jspdf.jsPDF);});
      });
    }
    return pdfLibPromise;
  }

  async function fastSaveRows(fnName, rows, meta, loadingText){
    rows = Array.isArray(rows) ? rows : [];
    meta = meta || {};
    if(!rows.length) return {success:true,total:0,main:0,tes:0};
    if(loadingText) loadingText.innerText = 'Saving data securely...';
    if(window.CES_API && typeof window.CES_API.callFunction === 'function'){
      try { return await window.CES_API.callFunction(fnName, fnName==='saveServiceDataArray' ? [rows, meta] : [rows], { transport:'iframe', timeoutMs:240000 }); }
      catch(e){ console.warn('[CES Final] iframe bulk save failed; fallback chunked', e); }
    }
    if(window.CES_API && typeof window.CES_API.chunkedRows === 'function'){
      return await window.CES_API.chunkedRows(fnName, rows, meta, { maxUrlLength:4200, timeoutMs:180000, onProgress:function(done,total,count){ if(loadingText) loadingText.innerText = 'Saving data... batch '+done+'/'+total+' ('+count+' rows)'; } });
    }
    return await new Promise(function(resolve,reject){
      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      if(fnName === 'saveServiceDataArray') runner.saveServiceDataArray(rows, meta); else runner.saveReportDataArray(rows);
    });
  }

  async function saveServiceRowsStableForGithubFinal(rows, meta, loadingText){
    return fastSaveRows('saveServiceDataArray', rows, meta, loadingText);
  }
  try { window.saveServiceRowsStableForGithub = saveServiceRowsStableForGithubFinal; saveServiceRowsStableForGithub = saveServiceRowsStableForGithubFinal; } catch(e) {}

  function exportServiceToPDFFinal(){
    return (async function(){
      await ensurePdfLibs();
      var target = qs('#view-service');
      if(!target) throw new Error('Service CSI view not found');
      Swal.fire({title:'กำลังเตรียม Preview...',html:'กำลังจัดหน้า PDF ให้ตรงกับหน้าเว็บไซต์',allowOutsideClick:false,didOpen:function(){Swal.showLoading();}});
      await new Promise(function(r){setTimeout(r,250);});
      var rect = target.getBoundingClientRect();
      var exportWidth = Math.max(1120, Math.ceil(rect.width || target.scrollWidth || 1200));
      var clone = target.cloneNode(true);
      clone.id = 'ces-export-service-clone';
      clone.classList.remove('hidden');
      clone.style.cssText = 'position:absolute;left:-12000px;top:0;width:'+exportWidth+'px;max-width:none;background:#f8fafc;padding:24px;z-index:-1;display:block;visibility:visible;';
      clone.classList.add('ces-pdf-workbench');
      qsa('.no-print,button,input[type="file"],.swal2-container', clone).forEach(function(el){ el.remove(); });
      qsa('.overflow-y-auto,.overflow-auto,.overflow-scroll,.custom-scrollbar,.pdf-expand,[style*="overflow"]', clone).forEach(function(el){ el.style.overflow='visible'; el.style.maxHeight='none'; el.style.height='auto'; });
      qsa('[class*="max-h-"],.max-h-\[60vh\],.h-\[420px\]', clone).forEach(function(el){ el.style.maxHeight='none'; el.style.height='auto'; });
      qsa('table', clone).forEach(function(t){ t.style.width='100%'; t.style.borderCollapse='collapse'; });
      document.body.appendChild(clone);
      await new Promise(function(r){setTimeout(r,650);});
      var canvas = await window.html2canvas(clone, { scale:1.65, useCORS:true, allowTaint:true, backgroundColor:'#f8fafc', logging:false, width:exportWidth, height:clone.scrollHeight, windowWidth:exportWidth, windowHeight:clone.scrollHeight, scrollX:0, scrollY:0 });
      clone.remove();
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4', compress:true });
      var PDF_W=297, PDF_H=210, HEADER=8, FOOTER=7, MARGIN=10, CONTENT_W=PDF_W-MARGIN*2, CONTENT_H=PDF_H-HEADER-FOOTER-MARGIN;
      var ratio = CONTENT_W / canvas.width;
      var pxPerPage = Math.floor(CONTENT_H / ratio);
      var totalPages = Math.max(1, Math.ceil(canvas.height / pxPerPage));
      var filterLabel = ['Team: '+(sFilters && sFilters.team || 'All'), 'Year: '+(sFilters && sFilters.year || new Date().getFullYear()), 'Month: '+(sFilters && sFilters.month || 'All'), 'Customer: '+(sFilters && sFilters.customer || 'All')].join('  |  ');
      var exportDate = new Date().toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      var previewPages = [];
      for(var p=0;p<totalPages;p++){
        if(p>0) pdf.addPage();
        var srcY = p * pxPerPage;
        var srcH = Math.min(pxPerPage, canvas.height - srcY);
        var sc = document.createElement('canvas');
        sc.width = canvas.width; sc.height = srcH;
        var ctx = sc.getContext('2d');
        ctx.fillStyle='#f8fafc'; ctx.fillRect(0,0,sc.width,sc.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, sc.width, sc.height);
        var img = sc.toDataURL('image/jpeg', 0.95);
        if(p < 12) previewPages.push(img);
        pdf.setFillColor(0,61,165); pdf.rect(0,0,PDF_W,HEADER,'F');
        pdf.setTextColor(255,255,255); pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.text('Service CSI Dashboard', MARGIN, 5.2);
        pdf.setFont('helvetica','normal'); pdf.text(filterLabel, PDF_W/2, 5.2, {align:'center'}); pdf.text(exportDate, PDF_W-MARGIN, 5.2, {align:'right'});
        pdf.addImage(img, 'JPEG', MARGIN, HEADER+2, CONTENT_W, srcH*ratio, '', 'FAST');
        pdf.setFillColor(248,250,252); pdf.rect(0, PDF_H-FOOTER, PDF_W, FOOTER, 'F');
        pdf.setTextColor(100,116,139); pdf.setFontSize(7); pdf.text('CES Dashboard System — Confidential', MARGIN, PDF_H-2.5); pdf.text('Page '+(p+1)+' of '+totalPages, PDF_W-MARGIN, PDF_H-2.5, {align:'right'});
      }
      var fileName = 'Service_CSI_' + (sFilters && sFilters.team || 'All') + '_' + (sFilters && sFilters.month || 'All') + '_' + (sFilters && sFilters.year || new Date().getFullYear()) + '.pdf';
      Swal.fire({
        title:'ตรวจสอบความถูกต้อง (Preview)',
        html:'<p class="text-sm mb-3 text-slate-500 font-bold">Preview แสดงทุกหน้าตามลำดับก่อนดาวน์โหลด PDF</p><div style="height:560px;overflow:auto;background:#f1f5f9;border:1px solid #dbe7f6;border-radius:12px;padding:18px">'+previewPages.map(function(src,i){return '<div class="text-xs font-black text-[#003DA5] mb-2">Page '+(i+1)+' of '+totalPages+'</div><img class="ces-pdf-preview-page" src="'+src+'">';}).join('')+'</div>',
        width:'1080px', showCancelButton:true, confirmButtonText:'<i class="fas fa-download mr-1"></i> ยืนยันดาวน์โหลด PDF', cancelButtonText:'ยกเลิก'
      }).then(function(res){ if(res.isConfirmed){ pdf.save(fileName); Swal.fire({icon:'success',title:'บันทึกสำเร็จ',timer:1600,showConfirmButton:false}); }});
    })().catch(function(err){ Swal.fire('Export Failed', err && err.message ? err.message : String(err), 'error'); });
  }
  try { window.exportServiceToPDF = exportServiceToPDFFinal; exportServiceToPDF = exportServiceToPDFFinal; } catch(e) {}

  function handleReportUploadFinal(event){
    var file = event && event.target && event.target.files ? event.target.files[0] : null;
    if(!file) return;
    var loader = qs('#loadingOverlay'), loadingText = qs('#loadingText');
    if(loader) loader.classList.remove('hidden');
    if(loadingText) loadingText.innerText = 'Processing Report CSI File...';
    var reader = new FileReader();
    reader.onload = function(e){
      (async function(){
        try{
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, {type:'array'});
          var sheet = workbook.Sheets[workbook.SheetNames[0]];
          var json = sheet ? XLSX.utils.sheet_to_json(sheet, {defval:''}) : [];
          if(!json.length) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
          var headers = Object.keys(json[0] || {});
          var findK = function(list){ return headers.find(function(h){ var n=String(h).toLowerCase(); return list.some(function(k){ return n.indexOf(String(k).toLowerCase()) >= 0; }); }) || ''; };
          var mapped = json.map(function(row){
            var rawId = row[findK(['response id','ลำดับ','id'])];
            var cust = String(row[findK(['ชื่อลูกค้า','customer','1.'])] || '').trim();
            if(!rawId || /test|ทดสอบ|^aa$/i.test(cust)) return null;
            var rawTeam = row[findK(['service','ทีม','2.'])] || '';
            var team = normalizeTeam(rawTeam) || text(rawTeam) || 'Other';
            var ts = row[findK(['timestamp','วันที่'])];
            var dt = ts ? new Date(ts) : null;
            var m = !dt || isNaN(dt.getTime()) ? '' : MONTHS[dt.getMonth()];
            var y = !dt || isNaN(dt.getTime()) ? '' : String(dt.getFullYear());
            return [rawId, ts, row[findK(['finished','สถานะ'])], cust, team, row[findK(['ครบถ้วน','3.'])], row[findK(['ปัญหา','4.'])], row[findK(['ภายใน 14 วัน','5.'])], row[findK(['เกินกำหนด','6.'])], row[findK(['พึงพอใจ','7.'])], row[findK(['ข้อเสนอแนะ','8.'])], m, y];
          }).filter(Boolean);
          if(!mapped.length) throw new Error('ไม่พบแถวที่นำเข้าได้');
          if(loadingText) loadingText.innerText = 'Uploading Report CSI data...';
          var result = await fastSaveRows('saveReportDataArray', mapped, {}, loadingText);
          if(loader) loader.classList.add('hidden');
          var added = typeof result === 'object' ? (result.total || result.added || result.count || 0) : result;
          Swal.fire('สำเร็จ', 'อัปเดตข้อมูล '+added+' รายการ', 'success');
          if(typeof loadReportCSIOnly === 'function') loadReportCSIOnly(true); else if(typeof loadAllData === 'function') loadAllData();
        }catch(err){ if(loader) loader.classList.add('hidden'); Swal.fire('Upload failed', err && err.message ? err.message : String(err), 'error'); }
      })();
    };
    reader.readAsArrayBuffer(file);
  }
  try { window.handleReportUpload = handleReportUploadFinal; handleReportUpload = handleReportUploadFinal; } catch(e) {}

  function patchOTSilentLoad(){
    try {
      if (typeof fetchOTData === 'function' && !fetchOTData.__cesSilent) {
        fetchOTData = function(){
          google.script.run.withSuccessHandler(function(data){ rawOTData = Array.isArray(data) ? data : []; if(typeof applyOTFilters === 'function') applyOTFilters(); }).withFailureHandler(function(err){ console.error('[OT] load failed', err); }).getOTDashboardData();
        };
        fetchOTData.__cesSilent = true;
        window.fetchOTData = fetchOTData;
      }
    } catch(e) {}
  }

  function ensureCalendarTESCard(){
    var statTes = qs('#stat-tes');
    var statEhs = qs('#stat-ehs');
    var ehsCard = statEhs ? statEhs.closest('.kpi-card') : null;
    if(!statTes && ehsCard && ehsCard.parentNode){
      var card = ehsCard.cloneNode(true);
      card.classList.remove('accent-ehs');
      card.classList.add('ces-final-calendar-tes');
      var label = qs('.kpi-label', card); if(label) label.textContent = 'TES Job Record';
      var value = qs('.kpi-value', card); if(value){ value.id = 'stat-tes'; value.textContent = '0'; value.style.color = TEAM_COLORS.TES; }
      ehsCard.parentNode.appendChild(card);
      ehsCard.parentNode.classList.remove('xl:grid-cols-4');
      ehsCard.parentNode.classList.add('xl:grid-cols-5');
    }
    var btnEhs = qs('#btn-cal-ehs');
    if(btnEhs && !qs('#btn-cal-tes')){
      var btn = btnEhs.cloneNode(true);
      btn.id = 'btn-cal-tes'; btn.textContent = 'TES'; btn.setAttribute('onclick', "changeService('TES')");
      btnEhs.parentNode.insertBefore(btn, btnEhs.nextSibling);
    }
  }

  function processCalendarDataFinal(data, targetM, targetY){
    ensureCalendarTESCard();
    data = Array.isArray(data) ? data : [];
    var current = (typeof currentService !== 'undefined') ? currentService : 'ALL';
    var sets = { MED:new Set(), LAB:new Set(), EHS:new Set(), TES:new Set() };
    var man = { MED:0, LAB:0, EHS:0, TES:0 };
    var jobs = [], leave = [];
    data.forEach(function(item){
      var itemM = parseInt(item.month,10), itemY = parseInt(item.year,10);
      if(itemM !== targetM || itemY !== targetY) return;
      var title = text(item.title);
      var team = normalizeTeam(item.team) || text(item.team || '').toUpperCase();
      if(!team || !man.hasOwnProperty(team)) return;
      var parts = text(item.date).split('/');
      var d = parts.length >= 3 ? new Date(parts[2], Number(parts[1])-1, Number(parts[0])) : new Date(item.date);
      var isWeekend = !isNaN(d.getTime()) && (d.getDay()===0 || d.getDay()===6);
      var isLeave = (typeof checkIsLeaveEvent === 'function') ? checkIsLeaveEvent(title) : /leave|off|ลา|หยุด|ป่วย/i.test(title);
      if(isLeave){ if(current === 'ALL' || current === team) leave.push(item); return; }
      if(!title) return;
      var shouldCount = !(team === 'MED' && isWeekend);
      if(shouldCount) man[team] += 1;
      if(item.uniqueKey) sets[team].add(item.uniqueKey); else sets[team].add([team,item.date,title].join('|'));
      if(current === 'ALL' || current === team) jobs.push(Object.assign({}, item, {team:team}));
    });
    var total = ['MED','LAB','EHS','TES'].reduce(function(a,t){ return a + sets[t].size; }, 0);
    var el;
    if((el=qs('#stat-total'))) el.innerText = total;
    if((el=qs('#stat-med'))) el.innerText = sets.MED.size;
    if((el=qs('#stat-lab'))) el.innerText = sets.LAB.size;
    if((el=qs('#stat-ehs'))) el.innerText = sets.EHS.size;
    if((el=qs('#stat-tes'))) el.innerText = sets.TES.size;
    var weekdays = (typeof getWeekdaysInMonth === 'function') ? getWeekdaysInMonth(targetM, targetY) : 0;
    if((el=qs('#capacity-days-display'))) el.innerText = weekdays + ' Weekdays';
    if(typeof renderCapacityBars === 'function') renderCapacityBars(man, weekdays);
    if(typeof renderJobTable === 'function') renderJobTable(jobs);
    if(typeof renderLeaveList === 'function') renderLeaveList(leave);
  }
  function renderCapacityBarsFinal(manDays, weekdays){
    var container = qs('#capacity-dashboard-grid'); if(!container) return;
    var cfg = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig : {};
    var limits = { MED:num(cfg.CAPACITY_MED || cfg.MED || 12)||12, LAB:num(cfg.CAPACITY_LAB || cfg.LAB || 3)||3, EHS:num(cfg.CAPACITY_EHS || cfg.EHS || 3)||3, TES:num(cfg.CAPACITY_TES || cfg.TES || 3)||3 };
    container.innerHTML = ['MED','LAB','EHS','TES'].map(function(t){
      var val = num(manDays && manDays[t]);
      var target = weekdays * limits[t];
      var p = target ? Math.round(val / target * 100) : 0;
      var over = p > 100;
      var color = over ? '#E4002B' : TEAM_COLORS[t];
      return `<div class="bg-white rounded-xl p-4 shadow-sm border border-[#D8E6F7] relative overflow-hidden group hover:shadow-md transition-all">
        <div class="flex justify-between items-end mb-2"><div><span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${t} Team</span><div class="text-xs text-slate-500 font-bold">Limit: ${limits[t]}/day</div></div><div class="text-2xl font-black" style="color:${color}">${p}%</div></div>
        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2"><div style="width:${Math.min(p,100)}%;background:${color}" class="h-full rounded-full transition-all duration-1000"></div></div>
        <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-2"><span>Actual: <b class="text-slate-600">${val}</b></span><span>Capacity: <b class="text-slate-600">${target}</b> MD</span></div>
      </div>`;
    }).join('');
  }
  try { window.processCalendarData = processCalendarDataFinal; processCalendarData = processCalendarDataFinal; window.renderCapacityBars = renderCapacityBarsFinal; renderCapacityBars = renderCapacityBarsFinal; } catch(e) {}

  function patchCalendarAndTracker(){
    injectFinalCss(); ensureCalendarTESCard();
    if(typeof updateCalendarUI === 'function') { try { updateCalendarUI(); } catch(e){} }
  }

  function boot(){
    injectFinalCss();
    patchHome();
    patchOTSilentLoad();
    patchCalendarAndTracker();
    setTimeout(function(){ patchHome(); patchOTSilentLoad(); patchCalendarAndTracker(); }, 600);
    setTimeout(renderHomeServiceCsiSummary, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.CES_FINAL_ALL_SYNC_RECHECK = function(){
    var out = { ok:true, version:VERSION, hasApi:!!(window.CES_API), hasPdfLibs:!!(window.html2canvas && window.jspdf), homeCsiSection:!!qs('#home-service-csi-summary-section'), tesCalendarCard:!!qs('#stat-tes') };
    console.log('[CES_FINAL_ALL_SYNC_RECHECK]', out);
    return out;
  };
})();
