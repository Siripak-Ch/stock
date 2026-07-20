/* ============================================================
   CES Stock Pro FINAL V3 — Frontend Status + UI Patch
   Load this AFTER 140-stock-dashboard.js, 150-stock-inventory.js, 160-stock-check.js

   Fixes:
   - STOCK is treated as รอสอบเทียบ, not พร้อมส่ง
   - KPI cards use final 5 statuses
   - Restores missing CSS/grid styling on Inventory and Check Stock
   - Adds CF CAL/PM workflow: รอสอบเทียบ -> พร้อมส่ง
============================================================ */
(function(){
  if (window.__STOCK_FINAL_INFUSION_V3__) return;
  window.__STOCK_FINAL_INFUSION_V3__ = true;

  window.STOCK_FINAL_STATUS = {
    READY: 'พร้อมส่ง',
    RECHECK: 'รอสอบเทียบ',
    RENTED: 'เช่ายืม',
    BROKEN: 'ใช้งานไม่ได้',
    MISSING: 'ไม่พบในรายการ'
  };

  function esc(v){
    if (typeof spEsc === 'function') return spEsc(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }
  function num(v){ return (typeof spNum === 'function') ? spNum(v) : Number(v || 0).toLocaleString(); }
  function setHtml(id, html){ if (typeof spSetHtml === 'function') spSetHtml(id, html); else { var el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function val(id, fb){ if (typeof spVal === 'function') return spVal(id, fb || ''); var el=document.getElementById(id); return el ? el.value : (fb || ''); }
  function fmtDate(v){ return (typeof spFmtDate === 'function') ? spFmtDate(v) : (v || '-'); }
  function json(o){ return JSON.stringify(o || {}).replace(/'/g,'&#39;').replace(/</g,'&lt;'); }
  function uniq(arr){ var m={}, out=[]; (arr||[]).forEach(function(x){ x=String(x||'').trim(); if(x && !m[x]){ m[x]=1; out.push(x); } }); return out.sort(); }

  window.stockFinalStatusList = function(){
    return [STOCK_FINAL_STATUS.READY, STOCK_FINAL_STATUS.RECHECK, STOCK_FINAL_STATUS.RENTED, STOCK_FINAL_STATUS.BROKEN, STOCK_FINAL_STATUS.MISSING];
  };

  window.stockFinalStatus = function(s){
    var raw = String(s == null ? '' : s).trim();
    var t = raw.toUpperCase();
    if (!raw) return STOCK_FINAL_STATUS.RECHECK;

    // V2: STOCK means in warehouse / not rented => รอสอบเทียบ.
    if (/^(STOCK|RECHECK|RE-CHECK|รอสอบเทียบ)$/i.test(raw) || /สอบเทียบ|ตรวจซ้ำ/.test(raw)) return STOCK_FINAL_STATUS.RECHECK;
    if (raw === STOCK_FINAL_STATUS.READY || /^(READY|AVAILABLE|CAL_PASS|PM_PASS|PASS|พร้อมใช้งาน|พร้อมส่ง)$/i.test(raw)) return STOCK_FINAL_STATUS.READY;
    if (raw === STOCK_FINAL_STATUS.RENTED || /IN[_\s-]*USE|BORROW|RENT|RENTED|OVERDUE|EXPIRED|เช่า|ยืม|เช่ายืม|เกินกำหนด/.test(t)) return STOCK_FINAL_STATUS.RENTED;
    if (raw === STOCK_FINAL_STATUS.BROKEN || /BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง|ใช้งานไม่ได้/.test(t)) return STOCK_FINAL_STATUS.BROKEN;
    if (raw === STOCK_FINAL_STATUS.MISSING || /MISSING|LOST|ไม่พบ|สูญหาย|หาย|ไม่พบในรายการ/.test(t)) return STOCK_FINAL_STATUS.MISSING;
    if (/NO[_\s-]*CONTRACT|ไม่มีสัญญา|ไม่มีการเช่า|RETURNED|CLOSED|COMPLETED|คืนแล้ว/.test(t)) return STOCK_FINAL_STATUS.RECHECK;
    return raw;
  };

  window.stockFinalDeviceStatus = function(d){
    d = d || {};
    var rentalRaw = String(d.rentalStatus || d.rental_status || d.current_rental_status || '').trim();
    var rentalText = rentalRaw.toUpperCase();
    var displayRaw = String(d.displayStatus || d.display_status || d.finalStatus || d.final_status || '').trim();
    var baseRaw = String(d.baseStatus || d.base_status || d.status || d.current_status || '').trim();
    var allText = [displayRaw, baseRaw, rentalRaw, d.actionRequired, d.action_required, d.recheckNote, d.recheck_note].join(' ').toUpperCase();

    if (/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง|ใช้งานไม่ได้/.test(allText)) return STOCK_FINAL_STATUS.BROKEN;
    if (/MISSING|LOST|ไม่พบ|สูญหาย|หาย|ไม่พบในรายการ/.test(allText)) return STOCK_FINAL_STATUS.MISSING;
    if (!/RETURNED|คืนแล้ว|รับคืนแล้ว|CLOSED|DONE|COMPLETED|NO[_\s-]*CONTRACT|ไม่มีสัญญา/.test(rentalText) && /IN[_\s-]*USE|BORROW|RENT|RENTED|OVERDUE|EXPIRED|เช่า|ยืม|เช่ายืม|เกินกำหนด/.test(rentalText)) return STOCK_FINAL_STATUS.RENTED;
    if (/เช่ายืม|IN[_\s-]*USE|BORROW|RENTED|OVERDUE|EXPIRED|เกินกำหนด/.test(displayRaw.toUpperCase())) return STOCK_FINAL_STATUS.RENTED;

    var display = stockFinalStatus(displayRaw);
    var base = stockFinalStatus(baseRaw);
    if (display === STOCK_FINAL_STATUS.READY || base === STOCK_FINAL_STATUS.READY) return STOCK_FINAL_STATUS.READY;
    return STOCK_FINAL_STATUS.RECHECK;
  };

  window.stockFinalNormalizeDevice = function(d){
    d = d || {};
    var s = stockFinalDeviceStatus(d);
    d.status = s;
    d.finalStatus = s;
    d.displayStatus = s;
    d.display_status = s;
    return d;
  };

  window.stockFinalCounts = function(rows){
    var c = { total:0, ready:0, stock:0, recheck:0, rented:0, inUse:0, broken:0, missing:0, unavailable:0, risk:0 };
    (rows || []).forEach(function(d){
      var s = stockFinalDeviceStatus(d);
      c.total++;
      if (s === STOCK_FINAL_STATUS.READY) { c.ready++; c.stock++; }
      else if (s === STOCK_FINAL_STATUS.RECHECK) c.recheck++;
      else if (s === STOCK_FINAL_STATUS.RENTED) { c.rented++; c.inUse++; }
      else if (s === STOCK_FINAL_STATUS.BROKEN) { c.broken++; c.unavailable++; c.risk++; }
      else if (s === STOCK_FINAL_STATUS.MISSING) { c.missing++; c.unavailable++; c.risk++; }
    });
    return c;
  };

  window.stockFinalClearLocalCache = function(){
    try { Object.keys(localStorage).forEach(function(k){ if(/CES_STOCK|STOCK_DASH|STOCK_INVENTORY|STOCK_CHECK/i.test(k)) localStorage.removeItem(k); }); } catch(e) {}
  };

  window.stockFinalBadge = function(st){
    var s = stockFinalStatus(st), cls='final-recheck', icon='fa-screwdriver-wrench';
    if (s === STOCK_FINAL_STATUS.READY) { cls='final-ready'; icon='fa-circle-check'; }
    else if (s === STOCK_FINAL_STATUS.RENTED) { cls='final-rented'; icon='fa-arrow-right-arrow-left'; }
    else if (s === STOCK_FINAL_STATUS.BROKEN) { cls='final-broken'; icon='fa-triangle-exclamation'; }
    else if (s === STOCK_FINAL_STATUS.MISSING) { cls='final-missing'; icon='fa-circle-question'; }
    return '<span class="sp-badge '+cls+'"><i class="fas '+icon+'"></i> '+esc(s)+'</span>';
  };
  window.spBadge = window.stockFinalBadge;
  window.sd_mapStatus = window.si_mapStatus = window.sc_mapStatus = window.stockFinalStatus;

  window.stockFinalStyle = function(){
    var old = document.getElementById('stock-final-infusion-style');
    if (old) old.parentNode.removeChild(old);
    var style = document.createElement('style');
    style.id = 'stock-final-infusion-style';
    style.textContent = `
      .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important;color:#0f172a!important}
      .stockpro-shell{max-width:1280px!important;margin:0 auto!important;padding:0 0 24px!important}
      .stockpro-header-card{background:linear-gradient(135deg,#ffffff 0%,#f5f8ff 100%)!important;border:1px solid #dbe7ff!important;border-radius:24px!important;padding:22px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;box-shadow:0 14px 38px rgba(0,61,165,.08)!important;margin-bottom:16px!important}
      .stockpro-title-wrap{display:flex!important;align-items:center!important;gap:14px!important}.stockpro-title-wrap h1{margin:0!important;font-size:24px!important;font-weight:1000!important;color:#003DA5!important;letter-spacing:-.03em}.stockpro-title-wrap p{margin:4px 0 0!important;font-size:11px!important;letter-spacing:.32em!important;text-transform:uppercase!important;color:#64748b!important;font-weight:900!important}
      .stockpro-icon{width:50px!important;height:50px!important;border-radius:18px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#eef4ff!important;color:#003DA5!important;box-shadow:0 8px 18px rgba(0,61,165,.08)!important}.stockpro-actions{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
      .sp-btn{border:0!important;border-radius:12px!important;padding:10px 16px!important;font-weight:900!important;font-size:13px!important;cursor:pointer!important;display:inline-flex!important;gap:8px!important;align-items:center!important;justify-content:center!important;line-height:1.15!important}.sp-btn.primary,.sp-btn.success{background:#003DA5!important;color:#fff!important}.sp-btn.danger,.sp-btn.warn{background:#E4002B!important;color:#fff!important}.sp-btn.ghost{background:#fff!important;color:#0f172a!important;border:1px solid #dbe7ff!important}.sp-btn.dark{background:#0f172a!important;color:#fff!important}.sp-btn.ready{background:#059669!important;color:#fff!important}.sp-btn.calpm{background:#0f766e!important;color:#fff!important}.sp-btn:disabled,.sp-icon-btn:disabled{opacity:.45!important;cursor:not-allowed!important;filter:grayscale(.25)!important}
      .sp-tabs{display:flex!important;gap:8px!important;margin-bottom:12px!important}.sp-tab{border:1px solid #dbe7ff!important;background:#f8fbff!important;color:#475569!important;border-radius:12px!important;padding:9px 16px!important;font-size:13px!important;font-weight:900!important;cursor:pointer!important}.sp-tab.active{background:#003DA5!important;color:#fff!important;border-color:#003DA5!important}
      .stockpro-filter-card{display:grid!important;grid-template-columns:2fr 1fr 1fr 1fr!important;gap:8px!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:18px!important;padding:12px!important;box-shadow:0 8px 22px rgba(15,23,42,.04)!important;margin-bottom:14px!important}.stockpro-filter-card input,.stockpro-filter-card select,.stockpro-control{width:100%!important;border:1px solid #dbe7ff!important;border-radius:12px!important;background:#f8fbff!important;padding:10px 12px!important;font-size:13px!important;outline:none!important;color:#334155!important}.sp-search{position:relative!important}.sp-search i{position:absolute!important;left:12px!important;top:50%!important;transform:translateY(-50%)!important;color:#94a3b8!important;font-size:12px!important}.sp-search input{padding-left:36px!important}
      .stockpro-kpi-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(155px,1fr))!important;gap:12px!important;margin-bottom:16px!important}.sp-kpi{position:relative!important;overflow:hidden!important;border:1px solid #e2e8f0!important;border-radius:20px!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;text-align:left!important;padding:16px!important;min-height:112px!important}.sp-kpi:before{content:''!important;position:absolute!important;inset:0 auto 0 0!important;width:5px!important;background:var(--accent,#003DA5)!important}.sp-kpi .ico{margin:0 0 10px!important;width:38px!important;height:38px!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important}.sp-kpi .label{font-size:12px!important;letter-spacing:0!important;text-transform:none!important;color:#64748b!important;font-weight:900!important}.sp-kpi .val{font-size:30px!important;font-weight:1000!important;line-height:1.1!important}
      .stockpro-two-col{display:grid!important;grid-template-columns:1fr 1fr!important;gap:16px!important;margin-bottom:16px!important}.stockpro-card,.stockpro-hero{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:20px!important;padding:16px!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important;margin-bottom:14px!important}.stockpro-card-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:10px!important}.stockpro-card h3,.stockpro-card-head h3{font-size:15px!important;font-weight:1000!important;color:#0f172a!important;margin:0!important;display:flex!important;gap:8px!important;align-items:center!important}
      .sp-table-wrap{overflow:auto!important;border:1px solid #edf2f7!important;border-radius:16px!important;max-height:560px!important}.sp-table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;font-size:12px!important;white-space:nowrap!important}.sp-table th{position:sticky!important;top:0!important;background:#f8fbff!important;color:#003DA5!important;text-transform:uppercase!important;font-size:11px!important;font-weight:1000!important;padding:10px 12px!important;border-bottom:1px solid #e2e8f0!important;z-index:1!important}.sp-table td{padding:10px 12px!important;border-bottom:1px solid #f1f5f9!important;color:#334155!important;vertical-align:middle!important}.sp-id{font-weight:1000!important;color:#0f172a!important}.sp-sub{display:block!important;font-size:10px!important;color:#64748b!important;margin-top:2px!important}.sp-muted{color:#64748b!important;font-size:12px!important}.sp-pill{background:#f1f5f9!important;color:#475569!important;border-radius:999px!important;padding:5px 10px!important;font-size:11px!important;font-weight:900!important}
      .sp-badge{display:inline-flex!important;align-items:center!important;gap:5px!important;border-radius:999px!important;padding:5px 10px!important;font-size:11px!important;font-weight:1000!important;white-space:nowrap!important}.sp-badge.final-ready{background:#dcfce7!important;color:#047857!important}.sp-badge.final-recheck{background:#fef3c7!important;color:#b45309!important}.sp-badge.final-rented{background:#dbeafe!important;color:#003DA5!important}.sp-badge.final-broken{background:#fee2e2!important;color:#b91c1c!important}.sp-badge.final-missing{background:#f3e8ff!important;color:#7e22ce!important}
      .sp-action-group{display:flex!important;gap:6px!important;align-items:center!important;justify-content:center!important;flex-wrap:wrap!important}.sp-icon-btn{width:34px!important;height:34px!important;border-radius:10px!important;border:1px solid #dbe7ff!important;background:#f8fbff!important;color:#003DA5!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important}.sp-icon-btn.green{background:#dcfce7!important;border-color:#bbf7d0!important;color:#047857!important}.sp-icon-btn.orange{background:#fef3c7!important;border-color:#fde68a!important;color:#b45309!important}.sp-icon-btn.gray{background:#f1f5f9!important;border-color:#e2e8f0!important;color:#475569!important}.sp-icon-btn.red{background:#fee2e2!important;border-color:#fecaca!important;color:#b91c1c!important}
      .sp-mode-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}.sp-mode{padding:18px!important;border:1px solid #dbe7ff!important;background:#f8fbff!important;border-radius:16px!important;text-align:center!important;font-weight:900!important;cursor:pointer!important;color:#0f172a!important}.sp-mode i{font-size:18px!important;color:#003DA5!important;margin-bottom:6px!important}.sp-mode.active.in{background:#003DA5!important;color:#fff!important}.sp-mode.active.out{background:#E4002B!important;color:#fff!important}.sp-mode.active.ready{background:#059669!important;color:#fff!important}.sp-mode.active i{color:#fff!important}.sp-scan-box{max-width:620px!important;margin:0 auto!important;text-align:center!important}.sp-scan-input-row{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;margin-top:12px!important}.sp-big-btn{width:100%!important;padding:15px!important;border-radius:14px!important;border:0!important;background:#003DA5!important;color:#fff!important;font-weight:1000!important;cursor:pointer!important;margin-top:12px!important}.sp-result-grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:10px!important;margin-top:12px!important}.sp-field{background:#f8fbff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:10px!important}.sp-field .k{font-size:10px!important;color:#64748b!important;text-transform:uppercase!important;font-weight:900!important}.sp-field .v{font-size:13px!important;color:#0f172a!important;font-weight:800!important;margin-top:2px!important}
      .sp-status-flow{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;margin:8px 0!important}.sp-status-flow span{font-size:11px!important;font-weight:900!important;border-radius:999px!important;padding:4px 8px!important;background:#f1f5f9!important;color:#475569!important}.sp-status-flow i{color:#94a3b8!important;font-size:11px!important}
      @media(max-width:980px){.stockpro-two-col{grid-template-columns:1fr!important}.stockpro-filter-card{grid-template-columns:1fr!important}.sp-result-grid{grid-template-columns:1fr!important}.sp-mode-grid{grid-template-columns:1fr!important}.stockpro-header-card{align-items:flex-start!important;flex-direction:column!important}.stockpro-actions{width:100%!important;justify-content:flex-start!important}.sp-scan-input-row{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  };

  stockFinalStyle();

  function kpiCards(k){
    var items = [
      ['อุปกรณ์ทั้งหมด', k.total, 'fa-boxes-stacked', '#003DA5', '#eef4ff'],
      ['พร้อมส่ง', k.ready, 'fa-circle-check', '#059669', '#dcfce7'],
      ['รอสอบเทียบ', k.recheck, 'fa-screwdriver-wrench', '#b45309', '#fef3c7'],
      ['เช่ายืม', k.rented, 'fa-arrow-right-arrow-left', '#2563eb', '#dbeafe'],
      ['ใช้งานไม่ได้', k.broken, 'fa-triangle-exclamation', '#dc2626', '#fee2e2'],
      ['ไม่พบในรายการ', k.missing, 'fa-circle-question', '#7e22ce', '#f3e8ff']
    ];
    return items.map(function(i){ return '<div class="sp-kpi" style="--accent:'+i[3]+'"><div class="ico" style="background:'+i[4]+'"><i class="fas '+i[2]+'" style="color:'+i[3]+'"></i></div><div class="label">'+i[0]+'</div><div class="val" style="color:'+i[3]+'">'+num(i[1])+'</div></div>'; }).join('');
  }

  /* Inventory */
  if (typeof SI !== 'undefined') {
    window.initStockInventoryModule = function(force){
      stockFinalStyle(); stockFinalClearLocalCache();
      var bd = document.getElementById('siBorrowDate'); if (bd && !bd.value) bd.value = new Date().toISOString().slice(0,10);
      setHtml('siTable', '<div class="sp-muted">Loading inventory...</div>');
      google.script.run.withSuccessHandler(function(res){
        if (!res || !res.success) { Swal.fire('Inventory Error', (res && res.message) || 'Cannot load inventory', 'error'); return; }
        SI.loaded = true; SI.raw = res; SI.inv = (res.inventory || []).map(stockFinalNormalizeDevice); SI.acc = res.accessories || [];
        si_fillFilters(); si_renderKpi(); si_applyFilters();
      }).withFailureHandler(function(err){ Swal.fire('Inventory Error', err.message || String(err), 'error'); }).si_getStockInventoryData(true);
    };
    window.si_fillFilters = function(){
      function fill(id, arr, label){ var el=document.getElementById(id); if(!el) return; var cur=el.value||'all'; el.innerHTML='<option value="all">'+label+'</option>'+arr.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join(''); el.value=arr.indexOf(cur)>=0?cur:'all'; }
      fill('siBrand', uniq(SI.inv.map(function(d){return d.brand;})), 'All Brand');
      fill('siModel', uniq(SI.inv.map(function(d){return d.model || d.itemName;})), 'All Model');
      fill('siLocation', uniq(SI.inv.map(function(d){return d.location;})), 'All Location');
      fill('siStatus', stockFinalStatusList(), 'All Status');
      fill('siAccTeam', uniq(SI.acc.map(function(a){return a.team;})), 'All Team');
      fill('siAccItem', uniq(SI.acc.map(function(a){return a.itemName || a.name;})), 'All Item');
      fill('siAccStatus', uniq(SI.acc.map(function(a){return a.status;})), 'All Status');
      fill('siAccAction', uniq(SI.acc.map(function(a){return a.actionRequired || a.action_required;})), 'All Action');
    };
    window.si_switchTab = function(tab){
      SI.tab = tab;
      var ids = [['siTabEquip',tab==='equip'],['siTabAcc',tab==='acc'],['siEquipFilters',tab==='equip'],['siAccFilters',tab==='acc'],['siEquipSection',tab==='equip'],['siAccSection',tab==='acc'],['siEquipKpiGrid',tab==='equip'],['siAccKpiGrid',tab==='acc']];
      ids.forEach(function(x){ var el=document.getElementById(x[0]); if(el) el.classList.toggle('hidden', !x[1]); });
      var e=document.getElementById('siTabEquip'), a=document.getElementById('siTabAcc'); if(e)e.classList.toggle('active',tab==='equip'); if(a)a.classList.toggle('active',tab==='acc');
      si_renderKpi(); si_applyFilters();
    };
    window.si_renderKpi = function(){
      var rows = (SI.tab === 'equip' && SI.filtered && SI.filtered.length) ? SI.filtered : SI.inv;
      var html = kpiCards(stockFinalCounts(rows));
      setHtml('siEquipKpiGrid', html); setHtml('siKpiGrid', html);
      var ak = SI.raw && SI.raw.kpi ? SI.raw.kpi : {};
      setHtml('siAccKpiGrid', '<div class="sp-kpi" style="--accent:#003DA5"><div class="label">Accessories</div><div class="val">'+num(ak.accessories || SI.acc.length)+'</div></div><div class="sp-kpi" style="--accent:#dc2626"><div class="label">Low Stock</div><div class="val">'+num(ak.accLow || 0)+'</div></div><div class="sp-kpi" style="--accent:#2563eb"><div class="label">Pending Approval</div><div class="val">'+num(ak.accPending || 0)+'</div></div>');
    };
    window.si_applyFilters = function(){
      if (SI.tab === 'equip') {
        var q=String(val('siSearch','')).toLowerCase(), b=val('siBrand','all'), m=val('siModel','all'), l=val('siLocation','all'), s=val('siStatus','all');
        SI.filtered = SI.inv.filter(function(d){ d=stockFinalNormalizeDevice(d); var text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase(); if(q && text.indexOf(q)<0) return false; if(b!=='all' && d.brand!==b) return false; if(m!=='all' && (d.model||d.itemName)!==m) return false; if(l!=='all' && d.location!==l) return false; if(s!=='all' && d.status!==s) return false; return true; });
        SI.page=1; si_renderKpi(); si_renderTable();
      } else {
        var q2=String(val('siAccSearch','')).toLowerCase(), team=val('siAccTeam','all'), item=val('siAccItem','all'), st=val('siAccStatus','all'), act=val('siAccAction','all');
        SI.accFiltered = SI.acc.filter(function(a){ var nm=a.itemName||a.name||'', ar=a.actionRequired||a.action_required||''; var text=[a.accessoryId,a.idCode,a.team,nm,a.type,a.status,ar,a.location,a.remark].join(' ').toLowerCase(); if(q2 && text.indexOf(q2)<0) return false; if(team!=='all' && a.team!==team) return false; if(item!=='all' && nm!==item) return false; if(st!=='all' && a.status!==st) return false; if(act!=='all' && ar!==act) return false; return true; });
        SI.accPage=1; si_renderKpi(); if(typeof si_renderAccCards==='function') si_renderAccCards();
      }
    };
    window.si_renderTable = function(){
      var start=(SI.page-1)*SI.pageSize, rows=SI.filtered.slice(start,start+SI.pageSize); setHtml('siTableCount', SI.filtered.length+' items');
      if(!rows.length){ setHtml('siTable','<div class="sp-muted">No equipment found</div>'); setHtml('siPagination',''); return; }
      setHtml('siTable','<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>'+rows.map(function(d,i){ d=stockFinalNormalizeDevice(d); return '<tr><td>'+(start+i+1)+'</td><td><span class="sp-id">'+esc(d.idCode)+'</span></td><td>'+esc(d.sn||d.serialNumber||'-')+'</td><td><b>'+esc(d.brand||'-')+'</b><span class="sp-sub">'+esc(d.model||d.itemName||'-')+'</span></td><td>'+stockFinalBadge(d.status)+'</td><td>'+esc(d.borrower||'-')+'</td><td>'+esc(d.location||'-')+'</td><td>'+fmtDate(d.expectedReturn||d.expectedReturnDate)+'</td><td>'+esc(d.actionRequired||d.recheckNote||'-')+'</td><td>'+si_rentButtons(d)+'</td><td>'+si_equipmentButtons(d)+'</td></tr>'; }).join('')+'</tbody></table></div>');
      if(typeof si_renderPagination==='function') si_renderPagination();
    };
    window.si_rentButtons = function(d){
      var s=stockFinalDeviceStatus(d), canCheckout=s===STOCK_FINAL_STATUS.READY, canReturn=s===STOCK_FINAL_STATUS.RENTED;
      return '<div class="sp-action-group"><button class="sp-icon-btn" '+(canCheckout?'':'disabled')+' title="Add to cart / พร้อมส่งเท่านั้น" onclick=\'si_addEquipmentToCart('+json(d)+')\'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn orange" '+(canReturn?'':'disabled')+' title="ต่อสัญญา" onclick=\'si_extendPrompt('+json(d)+')\'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" '+(canReturn?'':'disabled')+' title="รับคืนเข้าคลัง = รอสอบเทียบ" onclick=\'si_returnPrompt('+json(d)+')\'><i class="fas fa-undo"></i></button></div>';
    };
    window.si_equipmentButtons = function(d){
      var s=stockFinalDeviceStatus(d);
      return '<div class="sp-action-group">'+(s===STOCK_FINAL_STATUS.RECHECK?'<button class="sp-icon-btn green" title="CF CAL/PM → พร้อมส่ง" onclick=\'si_markReadyPrompt('+json(d)+')\'><i class="fas fa-check-double"></i></button>':'')+'<button class="sp-icon-btn" title="Edit Status" onclick=\'si_editPrompt('+json(d)+')\'><i class="fas fa-pen-to-square"></i></button><button class="sp-icon-btn gray" title="ใช้งานไม่ได้" onclick=\'si_markBrokenPrompt('+json(d)+')\'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn red" title="Delete/Hide" onclick=\'si_deletePrompt('+json(d)+')\'><i class="fas fa-trash"></i></button></div>';
    };
    window.si_addEquipmentToCart = function(d){
      if(!d||!d.idCode) return; var mapped=stockFinalDeviceStatus(d);
      if(mapped!==STOCK_FINAL_STATUS.READY){ Swal.fire('ไม่สามารถเพิ่มได้', d.idCode+' สถานะ: '+mapped+'\nต้อง CF CAL/PM เป็น พร้อมส่ง ก่อน Check-Out', 'warning'); return; }
      if(SI.cart.find(function(x){ return x.kind==='equipment' && x.idCode===d.idCode; })){ Swal.fire({toast:true,position:'top-end',icon:'info',title:'อยู่ในตะกร้าแล้ว',timer:1200,showConfirmButton:false}); return; }
      SI.cart.push(Object.assign({kind:'equipment',qty:1},d)); si_updateCart(); Swal.fire({toast:true,position:'top-end',icon:'success',title:'เพิ่ม '+d.idCode,timer:1200,showConfirmButton:false});
    };
    window.si_markReadyPrompt = function(d){
      Swal.fire({title:'CF CAL/PM ผ่านแล้ว?',html:'<div class="sp-status-flow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span></div><input id="swNote" class="swal2-input" placeholder="หมายเหตุ" value="CF CAL/PM completed">',icon:'question',showCancelButton:true,confirmButtonText:'อัปเดตเป็นพร้อมส่ง'}).then(function(r){ if(!r.isConfirmed) return; google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_updateRecheckToReady({idCode:d.idCode,location:d.location||'Warehouse',note:val('swNote','CF CAL/PM completed')}); });
    };
    window.si_editPrompt = function(d){
      var s=stockFinalDeviceStatus(d);
      Swal.fire({title:'Edit Equipment / Status',width:760,html:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left"><input id="edId" class="swal2-input" placeholder="ID Code" value="'+esc(d.idCode)+'"><input id="edSn" class="swal2-input" placeholder="SN" value="'+esc(d.sn||d.serialNumber||'')+'"><input id="edBrand" class="swal2-input" placeholder="Brand" value="'+esc(d.brand||'')+'"><input id="edModel" class="swal2-input" placeholder="Model" value="'+esc(d.model||'')+'"><input id="edItem" class="swal2-input" placeholder="Item Name" value="'+esc(d.itemName||'')+'"><input id="edCat" class="swal2-input" placeholder="Category" value="'+esc(d.category||'')+'"><input id="edLoc" class="swal2-input" placeholder="Location" value="'+esc(d.location||'')+'"><select id="edStatus" class="swal2-input">'+stockFinalStatusList().map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('')+'</select><input id="edAction" class="swal2-input" placeholder="Action Required" value="'+esc(d.actionRequired||'')+'"><input id="edNote" class="swal2-input" placeholder="Note" value="'+esc(d.recheckNote||'')+'"></div>',showCancelButton:true,confirmButtonText:'Save',didOpen:function(){document.getElementById('edStatus').value=s;},preConfirm:function(){return {originalIdCode:d.idCode,idCode:val('edId'),serialNumber:val('edSn'),brand:val('edBrand'),model:val('edModel'),itemName:val('edItem'),category:val('edCat'),location:val('edLoc'),displayStatus:val('edStatus'),status:val('edStatus'),actionRequired:val('edAction'),recheckNote:val('edNote')};}}).then(function(r){ if(!r.isConfirmed) return; google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_editEquipment(r.value); });
    };
    window.si_afterAction = function(res){ if(res&&res.success){ stockFinalClearLocalCache(); Swal.fire('สำเร็จ',res.message||'Completed','success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); } else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); };
  }

  /* Check Stock */
  if (typeof SC !== 'undefined') {
    function ensureCfModeButton(){
      var grid=document.querySelector('#view-check_stock .sp-mode-grid'); if(!grid) return;
      if(!document.getElementById('scModeCF')){
        var div=document.createElement('div'); div.className='sp-mode'; div.id='scModeCF'; div.setAttribute('onclick',"sc_setMode('CF_CAL_PM')"); div.innerHTML='<i class="fas fa-screwdriver-wrench"></i><br>CF CAL/PM<br><span class="sp-sub">รอสอบเทียบ → พร้อมส่ง</span>'; grid.appendChild(div);
      }
    }
    window.initStockCheckModule = function(force){ stockFinalStyle(); ensureCfModeButton(); sc_setMode(SC.mode || 'CHECK-IN'); if(typeof sc_loadLogs==='function') sc_loadLogs(); if(typeof sc_loadAccessoryOptions==='function') setTimeout(function(){sc_loadAccessoryOptions(force);},250); };
    window.sc_setMode = function(mode){
      SC.mode=mode; ensureCfModeButton();
      var inEl=document.getElementById('scModeIn'), outEl=document.getElementById('scModeOut'), cfEl=document.getElementById('scModeCF');
      if(inEl){inEl.classList.toggle('active',mode==='CHECK-IN');inEl.classList.toggle('in',mode==='CHECK-IN');}
      if(outEl){outEl.classList.toggle('active',mode==='CHECK-OUT');outEl.classList.toggle('out',mode==='CHECK-OUT');}
      if(cfEl){cfEl.classList.toggle('active',mode==='CF_CAL_PM');cfEl.classList.toggle('ready',mode==='CF_CAL_PM');}
      var txt=document.getElementById('scModeText'); if(txt){ var color='#003DA5', label='● โหมด: รับเข้าคลัง (เช่ายืม → รอสอบเทียบ)'; if(mode==='CHECK-OUT'){color='#E4002B';label='● โหมด: Check-Out (พร้อมส่ง → เช่ายืม)';} if(mode==='CF_CAL_PM'){color='#059669';label='● โหมด: CF CAL/PM (รอสอบเทียบ → พร้อมส่ง)';} txt.style.color=color; txt.innerHTML=label; }
    };
    window.sc_lookup = function(){
      var q=val('scKeyword','').trim(); if(!q){Swal.fire('กรุณากรอกรหัส','','info');return;}
      setHtml('scResult','<div class="stockpro-card"><div class="sp-muted">กำลังค้นหา...</div></div>');
      google.script.run.withSuccessHandler(function(res){ if(!res||!res.success){Swal.fire('Check Stock Error',(res&&res.message)||'Lookup failed','error');return;} sc_renderResult((res.data||[]).map(stockFinalNormalizeDevice)); if(typeof sc_loadLogs==='function') sc_loadLogs(); }).withFailureHandler(function(err){Swal.fire('Check Stock Error',err.message||String(err),'error');}).sc_lookupStockDevice(q);
    };
    window.sc_renderResult = function(rows){
      if(!rows.length){setHtml('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>');return;}
      setHtml('scResult', rows.map(function(d){ d=stockFinalNormalizeDevice(d); var s=d.status; var canReady=s===STOCK_FINAL_STATUS.RECHECK, canOut=s===STOCK_FINAL_STATUS.READY, canIn=s===STOCK_FINAL_STATUS.RENTED; return '<div class="stockpro-card"><div class="stockpro-card-head"><h3>'+esc(d.idCode)+' '+stockFinalBadge(s)+'</h3><span class="sp-pill">'+esc(d.brand||'-')+'</span></div><div class="sp-result-grid">'+sc_field('Serial Number',d.sn||d.serialNumber)+sc_field('Model',d.model||d.itemName)+sc_field('Location',d.location)+sc_field('Borrower',d.borrower||'-')+sc_field('Due Date',fmtDate(d.expectedReturn||d.expectedReturnDate))+sc_field('Action Required',d.actionRequired||d.recheckNote||'-')+'</div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="sp-btn calpm" '+(canReady?'':'disabled')+' onclick="sc_record(\''+esc(d.idCode)+'\',\'CF_CAL_PM\')"><i class="fas fa-screwdriver-wrench"></i> CF CAL/PM → พร้อมส่ง</button><button class="sp-btn primary" '+(canOut?'':'disabled')+' onclick="sc_checkoutPrompt(\''+esc(d.idCode)+'\',\''+esc(d.brand||'')+'\',\''+esc(d.model||'')+'\',\''+esc(d.sn||d.serialNumber||'')+'\')"><i class="fas fa-sign-out-alt"></i> Check-Out → เช่ายืม</button><button class="sp-btn success" '+(canIn?'':'disabled')+' onclick="sc_record(\''+esc(d.idCode)+'\',\'CHECK-IN\')"><i class="fas fa-sign-in-alt"></i> รับคืนเข้าคลัง → รอสอบเทียบ</button></div></div>'; }).join(''));
    };
    window.sc_record = function(idCode, action, payload){
      payload = payload || {}; var p=Object.assign({action:action,idCode:idCode},payload);
      google.script.run.withSuccessHandler(function(res){ if(res&&res.success){stockFinalClearLocalCache(); Swal.fire('สำเร็จ',res.message,'success'); sc_lookup(); if(typeof sc_loadLogs==='function') sc_loadLogs();} else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); }).withFailureHandler(function(err){Swal.fire('Error',err.message||String(err),'error');}).sc_recordCheckAction(p);
    };
  }

  /* Dashboard */
  if (typeof SD_DASH !== 'undefined') {
    window.initStockDashboardModule = function(force){
      stockFinalStyle(); stockFinalClearLocalCache(); setHtml('sdKpiGrid','<div class="sp-muted">Loading dashboard...</div>');
      google.script.run.withSuccessHandler(function(res){ if(!res||!res.success){Swal.fire('Dashboard Error',(res&&res.message)||'Cannot load dashboard','error');return;} SD_DASH.loaded=true; SD_DASH.raw=res; SD_DASH.raw.inventory=(res.inventory||res.devices||[]).map(stockFinalNormalizeDevice); SD_DASH.raw.devices=SD_DASH.raw.inventory; sd_fillFilters(); sd_renderAllFinal(); }).withFailureHandler(function(err){Swal.fire('Dashboard Error',err.message||String(err),'error');}).sd_getStockDashboardData(true);
    };
    window.sd_fillFilters = function(){
      var rows=(SD_DASH.raw&&SD_DASH.raw.inventory)||[];
      function fill(id,arr,label){ var el=document.getElementById(id); if(!el)return; var cur=el.value||'all'; el.innerHTML='<option value="all">'+label+'</option>'+arr.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join(''); el.value=arr.indexOf(cur)>=0?cur:'all'; }
      fill('sdBrand',uniq(rows.map(function(d){return d.brand;})),'แบรนด์ทั้งหมด'); fill('sdModel',uniq(rows.map(function(d){return d.model||d.itemName;})),'โมเดลทั้งหมด'); fill('sdStatus',stockFinalStatusList(),'สถานะทั้งหมด');
    };
    window.sd_getFilteredDevices = function(){
      var rows=((SD_DASH.raw&&SD_DASH.raw.inventory)||[]).map(stockFinalNormalizeDevice);
      var q=String(val('sdSearch','')).toLowerCase(), b=val('sdBrand','all'), m=val('sdModel','all'), s=val('sdStatus','all');
      return rows.filter(function(d){ var text=[d.idCode,d.sn,d.serialNumber,d.brand,d.model,d.itemName,d.location,d.borrower,d.status,d.actionRequired].join(' ').toLowerCase(); if(q&&text.indexOf(q)<0)return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&(d.model||d.itemName)!==m)return false; if(s!=='all'&&d.status!==s)return false; return true; });
    };
    window.sd_renderKpis = function(k){ setHtml('sdKpiGrid', kpiCards(k || stockFinalCounts(sd_getFilteredDevices()))); };
    window.sd_renderAllFinal = window.sd_renderFiltered = function(){
      var rows=sd_getFilteredDevices(); sd_renderKpis(stockFinalCounts(rows));
      if(typeof sd_renderModelCards==='function') try{sd_renderModelCards(rows);}catch(e){}
      if(typeof sd_renderCharts==='function') try{sd_renderCharts();}catch(e){}
      if(typeof sd_renderSummaryTables==='function') try{sd_renderSummaryTables();}catch(e){}
      if(typeof sd_renderContractSummary==='function') try{sd_renderContractSummary();}catch(e){}
      if(typeof sd_renderAlerts==='function') try{sd_renderAlerts();}catch(e){}
    };
  }

  // Apply styles immediately and again shortly after route render.
  stockFinalStyle();
  setTimeout(stockFinalStyle, 300);
})();


/* FINAL V3 — force clear old localStorage caches used by previous stock versions */
try {
  ['CES_STOCK_INVENTORY_CACHE_V2','CES_STOCK_INVENTORY_FINAL_CACHE_V1','CES_STOCK_DASHBOARD_CACHE_V2','CES_STOCK_DASHBOARD_FINAL_CACHE_V1'].forEach(function(k){ localStorage.removeItem(k); });
} catch(e) {}
