/* ============================================================
   CES Stock Pro FINAL V6 — UI recovery + BASE_STATUS frontend patch
   Load this AFTER 140-stock-dashboard.js, 150-stock-inventory.js, 160-stock-check.js
   Purpose:
   - Restore card/grid/table design
   - Use base_status final 5 statuses only
   - Keep model cards + accessories approval system
   - CF CAL/PM -> พร้อมส่ง; checkout -> เช่ายืม; checkin -> รอสอบเทียบ
============================================================ */
(function(){
  'use strict';

  const ST = {
    READY:'พร้อมส่ง', RECHECK:'รอสอบเทียบ', RENTED:'เช่ายืม', BROKEN:'ใช้งานไม่ได้', MISSING:'ไม่พบในรายการ'
  };
  const STATUS_LIST = [ST.READY, ST.RECHECK, ST.RENTED, ST.BROKEN, ST.MISSING];
  const STATUS_META = {
    'พร้อมส่ง':{label:'พร้อมส่ง', icon:'fa-circle-check', color:'#059669', bg:'#dcfce7', soft:'#ecfdf5'},
    'รอสอบเทียบ':{label:'รอสอบเทียบ', icon:'fa-screwdriver-wrench', color:'#b45309', bg:'#fef3c7', soft:'#fffbeb'},
    'เช่ายืม':{label:'เช่ายืม', icon:'fa-right-left', color:'#2563eb', bg:'#dbeafe', soft:'#eff6ff'},
    'ใช้งานไม่ได้':{label:'ใช้งานไม่ได้', icon:'fa-triangle-exclamation', color:'#dc2626', bg:'#fee2e2', soft:'#fef2f2'},
    'ไม่พบในรายการ':{label:'ไม่พบในรายการ', icon:'fa-circle-question', color:'#7c3aed', bg:'#ede9fe', soft:'#f5f3ff'}
  };

  function esc(v){ if(typeof spEsc==='function') return spEsc(v); return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function num(v){ if(typeof spNum==='function') return spNum(v); return Number(v||0).toLocaleString(); }
  function val(id, fallback=''){ if(typeof spVal==='function') return spVal(id,fallback); const el=document.getElementById(id); return el?el.value:fallback; }
  function setHtml(id, html){ if(typeof spSetHtml==='function') return spSetHtml(id,html); const el=document.getElementById(id); if(el) el.innerHTML=html; }
  function fmtDate(v){ if(typeof spFmtDate==='function') return spFmtDate(v); if(!v) return '-'; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString('th-TH'); }
  function toast(title, icon='success'){ if(window.Swal) Swal.fire({toast:true,position:'top-end',showConfirmButton:false,timer:1400,icon,title}); }
  function alertBox(title,msg,icon='info'){ if(window.Swal) Swal.fire(title,msg,icon); else alert(title+'\n'+msg); }

  function callBackend(fn,args,onSuccess,onFailure){
    args = args || [];
    const ok = res => {
      // API bridge wraps results in {success:true,data:{result:...}}
      if(res && res.data && Object.prototype.hasOwnProperty.call(res.data,'result')) res = res.data.result;
      onSuccess && onSuccess(res);
    };
    const fail = err => { if(onFailure) onFailure(err); else alertBox('Error', err && err.message ? err.message : String(err), 'error'); };
    try{
      if(window.google && google.script && google.script.run){
        const r = google.script.run.withSuccessHandler(ok).withFailureHandler(fail);
        if(typeof r[fn] === 'function') return r[fn].apply(r,args);
      }
      if(window.cesApiCall) return window.cesApiCall(fn,args).then(ok).catch(fail);
      if(window.CES_CONFIG && CES_CONFIG.GAS_API_URL){
        const cb='cb_'+Math.random().toString(36).slice(2);
        window[cb]=data=>{ try{ delete window[cb]; }catch(e){} ok(data); };
        const s=document.createElement('script');
        s.onerror=()=>fail(new Error('API request failed'));
        s.src=CES_CONFIG.GAS_API_URL+'?api=1&action=call&fn='+encodeURIComponent(fn)+'&args='+encodeURIComponent(JSON.stringify(args))+'&callback='+cb+'&_='+Date.now();
        document.head.appendChild(s);
        setTimeout(()=>{ try{s.remove();}catch(e){} },25000);
        return;
      }
    }catch(e){ fail(e); return; }
    fail(new Error('ไม่พบ google.script.run หรือ CES API bridge'));
  }

  function canonicalStatus(v){
    const s = String(v==null?'':v).trim();
    const u = s.toUpperCase().replace(/[\s\-_]+/g,'');
    if(!s) return ST.RECHECK;
    if(s===ST.READY || /READY|AVAILABLE|PASS|PASSED|CALPASS|พร้อมส่ง/.test(u)) return ST.READY;
    if(s===ST.RECHECK || /RECHECK|CAL|PM|CHECK|STOCK|WAREHOUSE|คลัง|สอบเทียบ|รอสอบเทียบ/.test(u)) return ST.RECHECK;
    if(s===ST.RENTED || /INUSE|RENT|RENTAL|BORROW|ยืม|เช่ายืม/.test(u)) return ST.RENTED;
    if(s===ST.BROKEN || /BROKEN|BREAK|DAMAGED|DEFECT|ชำรุด|เสีย|พัง|ใช้งานไม่ได้/.test(u)) return ST.BROKEN;
    if(s===ST.MISSING || /MISSING|LOST|NOTFOUND|หาไม่พบ|ไม่พบ|หาย/.test(u)) return ST.MISSING;
    return ST.RECHECK;
  }
  window.si_mapStatus = canonicalStatus;
  window.sd_mapStatus = canonicalStatus;
  function deviceStatus(d){ return canonicalStatus(d && (d.status || d.finalStatus || d.baseStatus || d.base_status || d.rentalStatus || d.rental_status)); }
  function badge(s){
    s = canonicalStatus(s);
    const m = STATUS_META[s] || STATUS_META[ST.RECHECK];
    return `<span class="sp-badge status-${s.replace(/\s/g,'')}" style="background:${m.bg};color:${m.color}"><i class="fas ${m.icon}"></i> ${esc(s)}</span>`;
  }
  window.stockV6Badge = badge;

  function installStyle(){
    if(document.getElementById('stock-v6-ui-recover')) return;
    const style=document.createElement('style');
    style.id='stock-v6-ui-recover';
    style.textContent=`
      :root{--ces-blue:#003DA5;--ces-blue2:#2563eb;--ces-grey:#64748b;--ces-light:#f8fafc;--ces-border:#e2e8f0;--ces-red:#E4002B;--ces-green:#059669;--ces-yellow:#f59e0b;}
      .stockpro-page{font-family:Inter,Prompt,Arial,sans-serif!important;color:#0f172a!important;}
      .stockpro-shell{max-width:1220px!important;margin:0 auto!important;padding:28px 24px 36px!important;box-sizing:border-box!important;}
      .stockpro-header-card{background:#fff!important;border:1px solid #dbe7ff!important;border-radius:24px!important;box-shadow:0 18px 45px rgba(15,23,42,.08)!important;padding:24px!important;margin-bottom:18px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;}
      .stockpro-title-wrap{display:flex!important;align-items:center!important;gap:16px!important;}.stockpro-title-wrap h1{font-size:24px!important;color:var(--ces-blue)!important;margin:0!important;font-weight:1000!important;}.stockpro-title-wrap p{margin:4px 0 0!important;font-size:11px!important;color:#64748b!important;letter-spacing:.34em!important;font-weight:900!important;text-transform:uppercase!important;}
      .stockpro-icon,.ces-view-icon{width:54px!important;height:54px!important;border-radius:18px!important;background:linear-gradient(135deg,#eff6ff,#dbeafe)!important;color:var(--ces-blue)!important;box-shadow:0 10px 24px rgba(0,61,165,.12)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;}
      .stockpro-actions{display:flex!important;gap:10px!important;align-items:center!important;flex-wrap:wrap!important;}.sp-btn{border:0!important;border-radius:14px!important;padding:10px 15px!important;font-weight:900!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;cursor:pointer!important;transition:.18s!important;white-space:nowrap!important;}.sp-btn:hover,.sp-icon-btn:hover{transform:translateY(-1px)!important;box-shadow:0 8px 18px rgba(15,23,42,.12)!important;}.sp-btn.primary,.sp-btn.success{background:var(--ces-blue)!important;color:#fff!important;}.sp-btn.warn{background:var(--ces-yellow)!important;color:#fff!important;}.sp-btn.danger{background:var(--ces-red)!important;color:#fff!important;}.sp-btn.ghost,.sp-btn.soft{background:#fff!important;color:#0f172a!important;border:1px solid var(--ces-border)!important;}
      .stockpro-model-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;margin:16px 0 18px!important;}.sp-model-card{position:relative!important;overflow:hidden!important;background:#fff!important;border:1px solid var(--ces-border)!important;border-radius:20px!important;padding:18px!important;box-shadow:0 10px 24px rgba(15,23,42,.06)!important;min-height:150px!important;}.sp-model-card:before{content:"";position:absolute;left:0;top:0;width:100%;height:6px;background:var(--model-color,#003DA5);}.sp-model-icon{width:40px!important;height:40px!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-bottom:10px!important;}.sp-model-brand{font-size:11px!important;font-weight:1000!important;color:#64748b!important;text-transform:uppercase!important;}.sp-model-label{font-size:14px!important;font-weight:900!important;margin-top:2px!important;color:#0f172a!important;}.sp-model-num{font-size:30px!important;font-weight:1000!important;line-height:1!important;margin-top:8px!important;}.sp-model-sub,.sp-model-over{font-size:12px!important;font-weight:900!important;margin-top:5px!important;}
      .stockpro-filter-card{background:#fff!important;border:1px solid var(--ces-border)!important;border-radius:20px!important;padding:14px!important;margin-bottom:16px!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important;display:grid!important;grid-template-columns:2fr 1fr 1fr 1fr!important;gap:10px!important;align-items:center!important;}.stockpro-filter-card input,.stockpro-filter-card select,.stockpro-control{height:44px!important;border:1px solid #cfe0ff!important;border-radius:14px!important;background:#f8fbff!important;padding:0 14px!important;font-size:13px!important;color:#0f172a!important;outline:0!important;box-sizing:border-box!important;}.sp-search{position:relative!important;}.sp-search i{position:absolute!important;left:14px!important;top:50%!important;transform:translateY(-50%)!important;color:#94a3b8!important;}.sp-search input{padding-left:40px!important;}
      .stockpro-kpi-grid{display:grid!important;grid-template-columns:repeat(6,minmax(130px,1fr))!important;gap:14px!important;margin:16px 0 20px!important;}.sp-kpi{background:#fff!important;border:1px solid var(--ces-border)!important;border-radius:20px!important;padding:18px!important;box-shadow:0 10px 26px rgba(15,23,42,.06)!important;min-height:110px!important;text-align:left!important;position:relative!important;overflow:hidden!important;}.sp-kpi:before{content:"";position:absolute;left:0;top:0;height:100%;width:5px;background:var(--kpi-color,#003DA5);}.sp-kpi .ico{width:38px!important;height:38px!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0 0 10px!important;background:var(--kpi-bg,#eff6ff)!important;}.sp-kpi .label{font-size:12px!important;font-weight:1000!important;color:#64748b!important;text-transform:none!important;}.sp-kpi .val{font-size:28px!important;font-weight:1000!important;line-height:1.1!important;margin-top:4px!important;color:var(--kpi-color,#003DA5)!important;}
      .stockpro-two-col{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:18px!important;margin-bottom:18px!important;}.stockpro-card{background:#fff!important;border:1px solid var(--ces-border)!important;border-radius:20px!important;padding:18px!important;box-shadow:0 10px 26px rgba(15,23,42,.06)!important;overflow:hidden!important;}.stockpro-card h3{margin:0 0 12px!important;font-size:16px!important;font-weight:1000!important;color:#0f172a!important;display:flex!important;align-items:center!important;gap:8px!important;}.stockpro-card-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:12px!important;}
      .sp-table-wrap{width:100%!important;overflow:auto!important;border:1px solid #edf2ff!important;border-radius:16px!important;max-height:620px!important;background:#fff!important;}.sp-table{width:100%!important;min-width:980px!important;border-collapse:separate!important;border-spacing:0!important;font-size:12px!important;white-space:normal!important;}.sp-table th{position:sticky!important;top:0!important;background:#f8fafc!important;color:#003DA5!important;text-transform:uppercase!important;font-size:11px!important;font-weight:1000!important;padding:12px 10px!important;border-bottom:1px solid var(--ces-border)!important;z-index:2!important;}.sp-table td{padding:10px!important;border-bottom:1px solid #eef2f7!important;color:#1e293b!important;vertical-align:middle!important;}.sp-table tbody tr:hover td{background:#f8fbff!important;}.sp-id{font-weight:1000!important;color:#0f172a!important;}.sp-sub{display:block!important;font-size:11px!important;color:#64748b!important;margin-top:2px!important;}.sp-muted{color:#64748b!important;font-size:12px!important;}.sp-badge{display:inline-flex!important;align-items:center!important;gap:5px!important;border-radius:999px!important;padding:5px 9px!important;font-size:11px!important;font-weight:1000!important;white-space:nowrap!important;}.sp-pill{background:#f1f5f9!important;color:#475569!important;border-radius:999px!important;padding:5px 10px!important;font-size:11px!important;font-weight:900!important;display:inline-flex!important;align-items:center!important;gap:5px!important;}.sp-action-group{display:flex!important;gap:6px!important;align-items:center!important;justify-content:center!important;flex-wrap:wrap!important;}.sp-icon-btn{width:34px!important;height:34px!important;min-width:34px!important;border-radius:11px!important;border:1px solid #dbe7ff!important;background:#fff!important;color:var(--ces-blue)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;}.sp-icon-btn.green{background:#ecfdf5!important;color:#059669!important;border-color:#bbf7d0!important;}.sp-icon-btn.orange{background:#fffbeb!important;color:#d97706!important;border-color:#fde68a!important;}.sp-icon-btn.red{background:#fef2f2!important;color:#dc2626!important;border-color:#fecaca!important;}.sp-icon-btn.gray{background:#f8fafc!important;color:#64748b!important;border-color:#e2e8f0!important;}.sp-icon-btn:disabled{opacity:.35!important;cursor:not-allowed!important;box-shadow:none!important;transform:none!important;}
      .sp-pagination{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-top:12px!important;flex-wrap:wrap!important;}.sp-page-buttons{display:flex!important;gap:6px!important;align-items:center!important;flex-wrap:wrap!important;}.sp-page-buttons button{border:1px solid var(--ces-border)!important;background:#fff!important;color:#334155!important;border-radius:10px!important;padding:7px 11px!important;font-weight:900!important;cursor:pointer!important;}.sp-page-buttons button.active{background:var(--ces-blue)!important;color:#fff!important;border-color:var(--ces-blue)!important;}.sp-page-buttons button:disabled{opacity:.45!important;cursor:not-allowed!important;}
      .sp-tabs{display:flex!important;gap:10px!important;margin:0 0 12px!important;}.sp-tab{border:1px solid #dbe7ff!important;background:#fff!important;color:#334155!important;border-radius:14px!important;padding:10px 16px!important;font-size:13px!important;font-weight:1000!important;cursor:pointer!important;}.sp-tab.active{background:var(--ces-blue)!important;color:#fff!important;border-color:var(--ces-blue)!important;box-shadow:0 10px 20px rgba(0,61,165,.14)!important;}
      .sp-acc-grid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important;gap:14px!important;}.sp-acc-card{border:1px solid var(--ces-border)!important;background:#fff!important;border-radius:20px!important;padding:16px!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;}.sp-acc-head{display:flex!important;align-items:center!important;gap:12px!important;margin-bottom:12px!important;}.sp-acc-icon{width:42px!important;height:42px!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#eff6ff!important;color:#003DA5!important;}.sp-acc-title{font-weight:1000!important;color:#0f172a!important;line-height:1.25!important;}.sp-acc-meta{font-size:11px!important;color:#64748b!important;margin-top:2px!important;}.sp-acc-stock{font-size:30px!important;font-weight:1000!important;line-height:1.05!important;color:#003DA5!important;}.sp-acc-actions{display:grid!important;grid-template-columns:74px 1fr auto!important;gap:8px!important;margin-top:12px!important;}.sp-acc-actions input{border:1px solid #dbe7ff!important;border-radius:12px!important;text-align:center!important;font-weight:900!important;padding:8px!important;}
      .sp-mode-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;}.sp-mode{background:#fff!important;border:1px solid #dbe7ff!important;border-radius:18px!important;padding:18px!important;text-align:center!important;font-weight:1000!important;cursor:pointer!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important;}.sp-mode.active.in{background:#eff6ff!important;color:#003DA5!important;border-color:#93c5fd!important;}.sp-mode.active.out{background:#eff6ff!important;color:#2563eb!important;border-color:#93c5fd!important;}.sp-mode.active.cf{background:#ecfdf5!important;color:#059669!important;border-color:#86efac!important;}.sp-result-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin-top:12px!important;}.sp-field{background:#f8fafc!important;border:1px solid #eef2ff!important;border-radius:14px!important;padding:10px!important;}.sp-field .k{font-size:10px!important;color:#64748b!important;text-transform:uppercase!important;font-weight:1000!important;}.sp-field .v{font-size:13px!important;color:#0f172a!important;font-weight:900!important;margin-top:3px!important;}
      .cart-item{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;border:1px solid #e2e8f0!important;background:#f8fafc!important;border-radius:14px!important;padding:12px!important;margin-bottom:10px!important;}
      @media(max-width:1100px){.stockpro-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;}.stockpro-two-col{grid-template-columns:1fr!important;}.stockpro-filter-card{grid-template-columns:1fr 1fr!important;}.stockpro-model-grid{grid-template-columns:1fr!important;}}
      @media(max-width:720px){.stockpro-shell{padding:18px 12px 28px!important;}.stockpro-header-card{align-items:flex-start!important;flex-direction:column!important;}.stockpro-filter-card{grid-template-columns:1fr!important;}.stockpro-kpi-grid{grid-template-columns:1fr 1fr!important;}.sp-mode-grid{grid-template-columns:1fr!important;}.sp-result-grid{grid-template-columns:1fr!important;}.sp-acc-actions{grid-template-columns:70px 1fr!important;}.sp-acc-actions .sp-icon-btn{grid-column:1/-1!important;}.sp-table{min-width:880px!important;}}
    `;
    document.head.appendChild(style);
  }

  function normalizeDevice(d){
    d = Object.assign({}, d || {});
    const st = deviceStatus(d);
    d.status = st; d.finalStatus = st; d.baseStatus = st; d.base_status = st;
    if(st !== ST.RENTED){ d.borrower = d.borrower || '-'; if(st !== ST.RENTED){ d.overdueDays = 0; } }
    return d;
  }
  function countKpi(rows, acc){
    rows = rows || []; acc = acc || [];
    return {
      total: rows.length,
      ready: rows.filter(d=>deviceStatus(d)===ST.READY).length,
      stock: rows.filter(d=>deviceStatus(d)===ST.READY).length,
      recheck: rows.filter(d=>deviceStatus(d)===ST.RECHECK).length,
      inUse: rows.filter(d=>deviceStatus(d)===ST.RENTED).length,
      rented: rows.filter(d=>deviceStatus(d)===ST.RENTED).length,
      broken: rows.filter(d=>deviceStatus(d)===ST.BROKEN).length,
      missing: rows.filter(d=>deviceStatus(d)===ST.MISSING).length,
      accTotalStock: acc.reduce((s,a)=>s+Number(a.stockQty||a.stock_qty||a.qty||0),0),
      accLow: acc.filter(a=>Number(a.stockQty||a.stock_qty||a.qty||0)<=Number(a.minStockQty||a.min_stock_qty||a.minStock||0)).length,
      accessories: acc.length
    };
  }
  function kpiCard(label,value,meta){
    return `<div class="sp-kpi" style="--kpi-color:${meta.color};--kpi-bg:${meta.bg}"><div class="ico"><i class="fas ${meta.icon}" style="color:${meta.color}"></i></div><div class="label">${esc(label)}</div><div class="val">${num(value||0)}</div></div>`;
  }
  function renderKpiGrid(target,k){
    const cards = [
      ['อุปกรณ์ทั้งหมด', k.total, {icon:'fa-boxes-stacked', color:'#003DA5', bg:'#dbeafe'}],
      ['พร้อมส่ง', k.ready || k.stock || 0, STATUS_META[ST.READY]],
      ['รอสอบเทียบ', k.recheck || 0, STATUS_META[ST.RECHECK]],
      ['เช่ายืม', k.inUse || k.rented || 0, STATUS_META[ST.RENTED]],
      ['ใช้งานไม่ได้', k.broken || 0, STATUS_META[ST.BROKEN]],
      ['ไม่พบในรายการ', k.missing || 0, STATUS_META[ST.MISSING]]
    ].map(x=>kpiCard(x[0],x[1],x[2])).join('');
    setHtml(target,cards);
  }

  // ========== Dashboard ========== 
  window.initStockDashboardModule = function(force=false){
    installStyle();
    setHtml('sdKpiGrid','<div class="sp-muted">Loading dashboard...</div>');
    callBackend('sd_getStockDashboardData',[force===true],res=>{
      if(!res || !res.success){ alertBox('Dashboard Error',(res&&res.message)||'Cannot load dashboard','error'); return; }
      window.SD_DASH = window.SD_DASH || {loaded:false,raw:null,statusChart:null,rentalChart:null};
      SD_DASH.loaded=true; SD_DASH.raw=res;
      SD_DASH.raw.inventory=(res.inventory||res.devices||[]).map(normalizeDevice);
      SD_DASH.raw.devices=SD_DASH.raw.inventory;
      sd_fillFilters_v6(); sd_renderFiltered();
    },err=>alertBox('Dashboard Error',err.message||String(err),'error'));
  };
  function sd_fillFilters_v6(){
    const rows=(SD_DASH.raw&&SD_DASH.raw.inventory)||[];
    fillSelect('sdBrand',[...new Set(rows.map(d=>d.brand).filter(Boolean))].sort(),'แบรนด์ทั้งหมด');
    fillSelect('sdModel',[...new Set(rows.map(d=>d.model).filter(Boolean))].sort(),'โมเดลทั้งหมด');
    fillSelect('sdStatus',STATUS_LIST,'สถานะทั้งหมด');
  }
  function fillSelect(id,arr,label){ const el=document.getElementById(id); if(!el) return; const cur=el.value||'all'; el.innerHTML=`<option value="all">${esc(label)}</option>`+(arr||[]).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(''); el.value=(arr||[]).includes(cur)?cur:'all'; }
  function sdFilteredRows(){
    const rows=((SD_DASH.raw&&SD_DASH.raw.inventory)||[]).map(normalizeDevice);
    const q=val('sdSearch','').toLowerCase(), b=val('sdBrand','all'), m=val('sdModel','all'), s=val('sdStatus','all');
    return rows.filter(d=>{ const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.borrower,d.status].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&d.model!==m)return false; if(s!=='all'&&deviceStatus(d)!==s)return false; return true; });
  }
  window.sd_renderFiltered = function(){ installStyle(); const rows=sdFilteredRows(); sd_renderModelCards(rows); renderKpiGrid('sdKpiGrid', countKpi(rows)); sd_renderCharts(rows); sd_renderSummaryTables_v6(rows); sd_renderContractSummary_v6(rows); sd_renderAlerts_v6(rows); };
  function sd_modelRows(rows, brand, keyword){ const B=brand.toUpperCase(), K=keyword.toUpperCase(); return rows.filter(d=>String(d.brand||'').toUpperCase().includes(B) && [d.model,d.itemName,d.item_name].join(' ').toUpperCase().includes(K)); }
  window.sd_renderModelCards = function(rows){
    rows = rows || sdFilteredRows();
    const configs=[
      {brand:'B.BRAUN', keyword:'INFUSOMAT', label:'Infusomat Space', color:'#10b981', bg:'#dcfce7'},
      {brand:'B.BRAUN', keyword:'SPACEPLUS', label:'Spaceplus', color:'#f59e0b', bg:'#fef3c7'},
      {brand:'BYOND', keyword:'SUNFUSION', label:'Sunfusion', color:'#2563eb', bg:'#dbeafe'}
    ];
    const html=configs.map(c=>{ const r=sd_modelRows(rows,c.brand,c.keyword); const k=countKpi(r); return `<div class="sp-model-card" style="--model-color:${c.color}"><div class="sp-model-icon" style="background:${c.bg};color:${c.color}"><i class="fas fa-microchip"></i></div><div class="sp-model-brand">${esc(c.brand)}</div><div class="sp-model-label">${esc(c.label)}</div><div class="sp-model-num" style="color:${c.color}">${num(r.length)}</div><div class="sp-model-sub" style="color:#059669">พร้อมส่ง: ${num(k.ready)}</div><div class="sp-model-sub" style="color:#b45309">รอสอบเทียบ: ${num(k.recheck)}</div><div class="sp-model-sub" style="color:#2563eb">เช่ายืม: ${num(k.inUse)}</div></div>`; }).join('');
    setHtml('sdModelCards',html);
  };
  window.sd_renderCharts = function(rows){
    rows=rows||sdFilteredRows(); if(typeof Chart==='undefined') return;
    const statusCounts=STATUS_LIST.map(s=>({name:s,count:rows.filter(d=>deviceStatus(d)===s).length})).filter(x=>x.count>0);
    const labels=statusCounts.map(x=>x.name), data=statusCounts.map(x=>x.count), colors=labels.map(l=>STATUS_META[l].color);
    const statusCanvas=document.getElementById('sdStatusChart');
    if(statusCanvas){ if(SD_DASH.statusChart) SD_DASH.statusChart.destroy(); SD_DASH.statusChart=new Chart(statusCanvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right'}}}}); }
    const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const byond=new Array(12).fill(0), bbraun=new Array(12).fill(0);
    ((SD_DASH.raw&&SD_DASH.raw.rentals)||[]).forEach(r=>{ const d=new Date(r.borrowDate||r.borrow_date||r.expectedReturnDate||r.expected_return_date); if(isNaN(d))return; const m=d.getMonth(); const brand=String(r.brand||'').toUpperCase(); if(brand.includes('BYOND')) byond[m]++; else bbraun[m]++; });
    const rentCanvas=document.getElementById('sdRentalChart');
    if(rentCanvas){ if(SD_DASH.rentalChart) SD_DASH.rentalChart.destroy(); SD_DASH.rentalChart=new Chart(rentCanvas,{type:'bar',data:{labels:months,datasets:[{label:'BYOND',data:byond,backgroundColor:'#93c5fd'},{label:'B.Braun',data:bbraun,backgroundColor:'#86efac'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}}); }
  };
  function smallTable(rows, cols){ if(!rows.length) return '<div class="sp-muted">No data</div>'; return `<div class="sp-table-wrap"><table class="sp-table"><thead><tr>${cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c[0]]??'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
  function sd_renderSummaryTables_v6(rows){
    rows=rows||sdFilteredRows();
    const byModel=[...rows.reduce((m,d)=>{const k=d.model||d.itemName||'Unknown';m.set(k,(m.get(k)||0)+1);return m;},new Map())].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,12);
    const byLocation=[...rows.reduce((m,d)=>{const k=d.location||'Unknown';m.set(k,(m.get(k)||0)+1);return m;},new Map())].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,12);
    setHtml('sdSummaryTable',smallTable(byModel,[['name','Model'],['count','Count']]));
    setHtml('sdLocationTable',smallTable(byLocation,[['name','Location'],['count','Count']]));
  }
  function sd_renderContractSummary_v6(rows){
    rows=(rows||sdFilteredRows()).filter(d=>deviceStatus(d)===ST.RENTED);
    const map={}; rows.forEach(d=>{ const loc=d.location||'Unknown'; if(!map[loc]) map[loc]={location:loc,total:0,models:{},ids:[],borrowDate:'',expectedReturn:''}; const x=map[loc]; x.total++; x.ids.push(d.idCode); const model=d.model||d.itemName||'Unknown'; x.models[model]=(x.models[model]||0)+1; if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate; if(!x.expectedReturn&&d.expectedReturn)x.expectedReturn=d.expectedReturn; });
    const list=Object.values(map).sort((a,b)=>b.total-a.total).map(x=>{x.modelList=Object.keys(x.models).map(m=>`${m} ×${x.models[m]}`).join(', '); return x;});
    setHtml('sdContractCount',`${list.length} locations`);
    if(!list.length){ setHtml('sdContractTable','<div class="sp-muted">No active rental contracts</div>'); return; }
    setHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>Models</th><th>Borrow Date</th><th>Due Date</th></tr></thead><tbody>${list.map(r=>`<tr><td><span class="sp-id">${esc(r.location)}</span></td><td>${num(r.total)}</td><td>${esc(r.modelList)}</td><td>${fmtDate(r.borrowDate)}</td><td>${fmtDate(r.expectedReturn)}</td></tr>`).join('')}</tbody></table></div>`);
  }
  function sd_renderAlerts_v6(rows){
    rows=(rows||sdFilteredRows()).filter(d=>[ST.RECHECK,ST.BROKEN,ST.MISSING].includes(deviceStatus(d)) || d.actionRequired);
    setHtml('sdAlertCount',`${rows.length} alerts`); setHtml('sdAlertHeaderCount',rows.length>99?'99+':rows.length);
    setHtml('sdAlertTable',smallTable(rows.slice(0,8).map(d=>({status:deviceStatus(d),id:d.idCode,location:d.location,action:d.actionRequired||'-'})),[['status','Status'],['id','ID'],['location','Location'],['action','Action']]));
  }

  // ========== Inventory ========== 
  window.initStockInventoryModule = function(force=false){
    installStyle(); window.SI=window.SI||{loaded:false,tab:'equip',raw:null,inv:[],acc:[],filtered:[],accFiltered:[],page:1,accPage:1,pageSize:50,cart:[]};
    const cacheKey='CES_STOCK_BASE_STATUS_V6_CACHE'; const ttl=120000;
    const render=res=>{ if(!res||!res.success){ alertBox('Inventory Error',(res&&res.message)||'Cannot load inventory','error'); return; } SI.loaded=true; SI.raw=res; SI.inv=(res.inventory||res.devices||[]).map(normalizeDevice); SI.acc=(res.accessories||[]); try{localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data:res}));}catch(e){} si_fillFilters(); si_renderKpi(); si_applyFilters(); si_updateCart(); };
    if(!force){ try{ const c=JSON.parse(localStorage.getItem(cacheKey)||'null'); if(c&&c.data&&Date.now()-Number(c.ts||0)<ttl) render(c.data); }catch(e){} }
    setHtml('siTable','<div class="sp-muted">Loading inventory...</div>');
    callBackend('si_getStockInventoryData',[force===true],render,err=>alertBox('Inventory Error',err.message||String(err),'error'));
  };
  window.si_fillFilters = function(){ const rows=SI.inv||[], acc=SI.acc||[]; fillSelect('siBrand',[...new Set(rows.map(d=>d.brand).filter(Boolean))].sort(),'All Brand'); fillSelect('siModel',[...new Set(rows.map(d=>d.model).filter(Boolean))].sort(),'All Model'); fillSelect('siLocation',[...new Set(rows.map(d=>d.location).filter(Boolean))].sort(),'All Location'); fillSelect('siStatus',STATUS_LIST,'All Status'); fillSelect('siAccTeam',[...new Set(acc.map(a=>a.team||a.type).filter(Boolean))].sort(),'All Team'); fillSelect('siAccType',[...new Set(acc.map(a=>a.team||a.type).filter(Boolean))].sort(),'All Type'); fillSelect('siAccItem',[...new Set(acc.map(a=>a.itemName||a.item_name||a.name).filter(Boolean))].sort(),'All Item'); fillSelect('siAccStatus',[...new Set(acc.map(a=>a.status).filter(Boolean))].sort(),'All Status'); };
  window.si_switchTab = function(tab){ SI.tab=tab; ['Equip','Acc'].forEach(x=>{}); document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip'); document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc'); document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc'); document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc'); document.getElementById('siEquipKpiGrid')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccKpiGrid')?.classList.toggle('hidden',tab!=='acc'); si_renderKpi(); si_applyFilters(); };
  window.si_renderKpi = function(){ installStyle(); const k=countKpi(SI.inv||[], SI.acc||[]); renderKpiGrid('siKpiGrid', k); renderKpiGrid('siEquipKpiGrid', k); const accCards=[['Accessories',k.accessories,{icon:'fa-plug',color:'#003DA5',bg:'#dbeafe'}],['Total Stock',k.accTotalStock,{icon:'fa-boxes-stacked',color:'#059669',bg:'#dcfce7'}],['Low Stock',k.accLow,{icon:'fa-bell',color:'#dc2626',bg:'#fee2e2'}]].map(x=>kpiCard(x[0],x[1],x[2])).join(''); setHtml('siAccKpiGrid',accCards); setHtml('siLowStockHeaderCount',k.accLow||0); };
  window.si_applyFilters = function(){
    if(SI.tab==='acc'){
      const q=val('siAccSearch','').toLowerCase(), team=val('siAccTeam',val('siAccType','all')), item=val('siAccItem','all'), st=val('siAccStatus','all');
      SI.accFiltered=(SI.acc||[]).filter(a=>{ const nm=a.itemName||a.item_name||a.name||''; const text=[a.accessoryId,a.idCode,a.team,nm,a.type,a.status,a.actionRequired,a.action_required,a.location,a.remark].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(team!=='all'&&(a.team||a.type)!==team)return false; if(item!=='all'&&nm!==item)return false; if(st!=='all'&&a.status!==st)return false; return true; }); SI.accPage=1; si_renderAccCards(); return;
    }
    const q=val('siSearch','').toLowerCase(), b=val('siBrand','all'), m=val('siModel','all'), l=val('siLocation','all'), s=val('siStatus','all');
    SI.filtered=(SI.inv||[]).filter(d=>{ const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&d.model!==m)return false; if(l!=='all'&&d.location!==l)return false; if(s!=='all'&&deviceStatus(d)!==s)return false; return true; }); SI.page=1; si_renderTable();
  };
  window.si_renderTable = function(){
    const start=(SI.page-1)*SI.pageSize, rows=(SI.filtered||[]).slice(start,start+SI.pageSize); setHtml('siTableCount',`${(SI.filtered||[]).length} items`);
    if(!rows.length){ setHtml('siTable','<div class="sp-muted">No equipment found</div>'); setHtml('siPagination',''); return; }
    const html=`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td>${start+i+1}</td><td><span class="sp-id">${esc(d.idCode)}</span></td><td>${esc(d.sn||'-')}</td><td><b>${esc(d.brand||'-')}</b><span class="sp-sub">${esc(d.model||d.itemName||'-')}</span></td><td>${badge(deviceStatus(d))}</td><td>${esc(d.borrower||'-')}</td><td>${esc(d.location||'-')}</td><td>${fmtDate(d.expectedReturn||d.expectedReturnDate)}</td><td>${esc(d.actionRequired||d.recheckNote||'-')}</td><td>${si_rentButtons(d)}</td><td>${si_equipmentButtons(d)}</td></tr>`).join('')}</tbody></table></div>`;
    setHtml('siTable',html); renderPagination('siPagination',SI.page,Math.ceil((SI.filtered||[]).length/SI.pageSize)||1,p=>{SI.page=p;si_renderTable();});
  };
  function renderPagination(id,page,total,go){ const from=Math.max(1,page-2), to=Math.min(total,page+2); let btns=''; for(let p=from;p<=to;p++)btns+=`<button class="${p===page?'active':''}" data-p="${p}">${p}</button>`; setHtml(id,`<div class="sp-muted">Page ${page} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button data-p="${Math.max(1,page-1)}" ${page<=1?'disabled':''}>Prev</button>${btns}<button data-p="${Math.min(total,page+1)}" ${page>=total?'disabled':''}>Next</button></div>`); const el=document.getElementById(id); if(el) el.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>go(Number(b.dataset.p))); }
  window.si_rentButtons = function(d){ const s=deviceStatus(d); return `<div class="sp-action-group"><button class="sp-icon-btn" title="Add to cart" ${s!==ST.READY?'disabled':''} onclick='si_addEquipmentToCart(${json(d)})'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn orange" title="CF CAL/PM → พร้อมส่ง" ${s!==ST.RECHECK?'disabled':''} onclick='si_cfCalPmPrompt(${json(d)})'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn green" title="รับคืน" ${s!==ST.RENTED?'disabled':''} onclick='si_returnPrompt(${json(d)})'><i class="fas fa-undo"></i></button></div>`; };
  window.si_equipmentButtons = function(d){ return `<div class="sp-action-group"><button class="sp-icon-btn" title="Edit" onclick='si_editPrompt(${json(d)})'><i class="fas fa-pen-to-square"></i></button><button class="sp-icon-btn gray" title="Mark Broken" onclick='si_markBrokenPrompt(${json(d)})'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn red" title="ไม่พบในรายการ" onclick='si_deletePrompt(${json(d)})'><i class="fas fa-trash"></i></button></div>`; };
  function json(o){ return JSON.stringify(o).replace(/'/g,'&#39;').replace(/</g,'&lt;'); }
  window.si_addEquipmentToCart = function(d){ if(!d||!d.idCode)return; const s=deviceStatus(d); if(s!==ST.READY){ alertBox('ไม่สามารถเพิ่มได้',`${d.idCode} สถานะ: ${s}\nต้อง CF CAL/PM ให้เป็น พร้อมส่ง ก่อน`,'warning'); return; } if((SI.cart||[]).find(x=>x.kind==='equipment'&&x.idCode===d.idCode)){ toast('อยู่ในตะกร้าแล้ว','info'); return; } SI.cart=SI.cart||[]; SI.cart.push(Object.assign({kind:'equipment',qty:1},d)); si_updateCart(); toast(`เพิ่ม ${d.idCode}`); };
  window.si_cfCalPmPrompt = function(d){ if(!d||!d.idCode)return; if(deviceStatus(d)!==ST.RECHECK){ alertBox('ไม่สามารถ CF ได้','สถานะปัจจุบัน: '+deviceStatus(d),'warning'); return; } Swal.fire({title:'CF CAL/PM → พร้อมส่ง',html:`<div style="text-align:left"><b>${esc(d.idCode)}</b><br>${esc(d.brand||'')} ${esc(d.model||d.itemName||'')}</div><input id="swNote" class="swal2-input" placeholder="หมายเหตุ" value="CF CAL/PM completed">`,icon:'question',showCancelButton:true,confirmButtonText:'ยืนยันพร้อมส่ง'}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_confirmCalibration',[{idCode:d.idCode,note:val('swNote','CF CAL/PM completed')}],si_afterAction,si_actionError); }); };
  window.si_returnPrompt = function(d){ Swal.fire({title:'รับคืน '+d.idCode+'?',html:`<input id="swReturnLoc" class="swal2-input" placeholder="สถานที่รับคืน" value="Warehouse"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ" value="Return / Check-In">`,icon:'question',showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_returnEquipment',[{idCode:d.idCode,location:val('swReturnLoc','Warehouse'),note:val('swNote','Return / Check-In')}],si_afterAction,si_actionError); }); };
  window.si_editPrompt = function(d){ Swal.fire({title:'Edit Equipment',width:760,html:`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left"><input id="edId" class="swal2-input" placeholder="ID Code" value="${esc(d.idCode)}"><input id="edSn" class="swal2-input" placeholder="SN" value="${esc(d.sn||'')}"><input id="edBrand" class="swal2-input" placeholder="Brand" value="${esc(d.brand||'')}"><input id="edModel" class="swal2-input" placeholder="Model" value="${esc(d.model||'')}"><input id="edItem" class="swal2-input" placeholder="Item Name" value="${esc(d.itemName||'')}"><input id="edCat" class="swal2-input" placeholder="Category" value="${esc(d.category||'')}"><input id="edLoc" class="swal2-input" placeholder="Location" value="${esc(d.location||'')}"><select id="edStatus" class="swal2-input">${STATUS_LIST.map(s=>`<option value="${s}">${s}</option>`).join('')}</select><input id="edAction" class="swal2-input" placeholder="Action Required" value="${esc(d.actionRequired||'')}"><input id="edNote" class="swal2-input" placeholder="Note" value="${esc(d.recheckNote||'')}"></div>`,showCancelButton:true,confirmButtonText:'Save',didOpen:()=>{const el=document.getElementById('edStatus'); if(el) el.value=deviceStatus(d);},preConfirm:()=>({originalIdCode:d.idCode,idCode:val('edId'),serialNumber:val('edSn'),brand:val('edBrand'),model:val('edModel'),itemName:val('edItem'),category:val('edCat'),location:val('edLoc'),baseStatus:val('edStatus'),actionRequired:val('edAction'),recheckNote:val('edNote')})}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_editEquipment',[r.value],si_afterAction,si_actionError); }); };
  window.si_markBrokenPrompt = function(d){ Swal.fire({title:'Mark Broken '+d.idCode,html:`<input id="swReason" class="swal2-input" placeholder="สาเหตุ" value="ใช้งานไม่ได้"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,icon:'warning',showCancelButton:true,confirmButtonText:'Mark Broken'}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_markEquipmentBroken',[{idCode:d.idCode,reason:val('swReason','ใช้งานไม่ได้'),note:val('swNote','')}],si_afterAction,si_actionError); }); };
  window.si_deletePrompt = function(d){ Swal.fire({title:'ไม่พบในรายการ '+d.idCode+'?',text:'ระบบจะเปลี่ยน base_status เป็น ไม่พบในรายการ',icon:'warning',showCancelButton:true,confirmButtonText:'ยืนยัน',confirmButtonColor:'#E4002B'}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_deleteEquipment',[{idCode:d.idCode,reason:'ไม่พบในรายการ'}],si_afterAction,si_actionError); }); };
  window.si_afterAction = function(res){ if(res&&res.success){ Swal.fire('สำเร็จ',res.message||'Completed','success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); } else alertBox('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); };
  window.si_actionError = function(err){ alertBox('Error',err.message||String(err),'error'); };
  window.si_submitCheckout = function(){ if(!SI.cart||!SI.cart.length){ alertBox('ตะกร้าว่าง','','info'); return; } const borrower=val('siBorrower','').trim(), location=val('siCheckoutLocation','').trim(), due=val('siDueDate',''); if(!borrower||!location||!due){ alertBox('ข้อมูลไม่ครบ','กรุณากรอกผู้ยืม สถานที่ และวันคืน','warning'); return; } const equipment=SI.cart.filter(x=>x.kind==='equipment'), accessories=SI.cart.filter(x=>x.kind==='accessory'); Swal.fire({title:'บันทึก Check-Out...',html:`Equipment ${equipment.length} รายการ<br>Accessories ${accessories.length} รายการ`,allowOutsideClick:false,didOpen:()=>Swal.showLoading()}); callBackend('si_checkoutCart',[{equipment,accessories,borrower,location,borrowDate:val('siBorrowDate',''),expectedReturnDate:due,note:val('siNote','')}],res=>{ Swal.close(); if(res&&res.success){ SI.cart=[]; si_updateCart(); si_closeCart&&si_closeCart(); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); Swal.fire('สำเร็จ',res.message,'success'); } else alertBox('ไม่สำเร็จ',(res&&res.message)||'Checkout failed','error'); },err=>{Swal.close(); si_actionError(err);}); };
  window.si_updateCart = function(){ SI.cart=SI.cart||[]; setHtml('siCartCount',SI.cart.length); setHtml('siCartDrawerCount',SI.cart.length); setHtml('siCartFabBadge',SI.cart.length); const list=SI.cart.length?SI.cart.map((d,i)=>`<div class="cart-item"><div><b>${d.kind==='accessory'?'🔌':'⚙️'} ${esc(d.idCode||d.accessoryId||d.name||d.itemName||d.type)}</b><div class="sp-sub">${d.kind==='accessory'?('Qty: '+num(d.qty||d.issueQty||1)):(esc(d.brand||'')+' '+esc(d.model||''))}</div></div><button class="sp-icon-btn red" onclick="SI.cart.splice(${i},1);si_updateCart()"><i class="fas fa-times"></i></button></div>`).join(''):'<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>'; setHtml('siCartItems',list); };

  // accessories
  function accId(a){ return a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name; }
  function accName(a){ return a.itemName||a.item_name||a.name||a.type||'-'; }
  function accQty(a){ return Number(a.stockQty||a.stock_qty||a.qty||0); }
  function accMin(a){ return Number(a.minStockQty||a.min_stock_qty||a.minStock||0); }
  window.si_renderAccCards = function(){ const start=(SI.accPage-1)*SI.pageSize, rows=(SI.accFiltered||[]).slice(start,start+SI.pageSize); setHtml('siAccCount',`${(SI.accFiltered||[]).length} items`); if(!rows.length){ setHtml('siAccCards','<div class="sp-muted">No accessories found</div>'); setHtml('siAccPagination',''); return; } setHtml('siAccCards',`<div class="sp-acc-grid">${rows.map((a,i)=>si_accCard(a,start+i)).join('')}</div>`); renderPagination('siAccPagination',SI.accPage,Math.ceil((SI.accFiltered||[]).length/SI.pageSize)||1,p=>{SI.accPage=p;si_renderAccCards();}); };
  window.si_accCard = function(a,i){ const qty=accQty(a), min=accMin(a), low=qty<=min; const team=a.team||a.type||'-'; return `<div class="sp-acc-card"><div class="sp-acc-head"><div class="sp-acc-icon" style="background:${low?'#fee2e2':'#dbeafe'};color:${low?'#dc2626':'#003DA5'}"><i class="fas ${low?'fa-bell':'fa-plug'}"></i></div><div><div class="sp-acc-title">${esc(accName(a))}</div><div class="sp-acc-meta">${esc(team)} • ${esc(accId(a))}</div></div></div><div class="sp-acc-stock" style="color:${low?'#dc2626':'#003DA5'}">${num(qty)}</div><div class="sp-muted">คงเหลือ / Min ${num(min)}</div><div style="margin-top:8px">${low?'<span class="sp-badge" style="background:#fee2e2;color:#dc2626">LOW STOCK</span>':'<span class="sp-badge" style="background:#dcfce7;color:#059669">STOCK</span>'} <span class="sp-pill">${esc(a.actionRequired||a.action_required||'No action')}</span></div><div class="sp-acc-actions"><input id="siAccQty_${i}" type="number" min="1" max="${qty}" value="1"><button class="sp-btn success" onclick='si_addAccessoryToCart(${json(a)},"siAccQty_${i}")'><i class="fas fa-cart-plus"></i> ใส่ตะกร้า</button><button class="sp-icon-btn orange" onclick='si_restockPrompt(${json(a)})' title="Restock"><i class="fas fa-box-open"></i></button></div></div>`; };
  window.si_addAccessoryToCart = function(a,inputId){ const qty=Math.max(1,Number(val(inputId,'1'))||1), stock=accQty(a); if(qty>stock){ alertBox('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning'); return; } const key=accId(a); const exist=(SI.cart||[]).find(x=>x.kind==='accessory'&&accId(x)===key); if(exist){ exist.qty+=qty; exist.issueQty=exist.qty; } else { SI.cart=SI.cart||[]; SI.cart.push(Object.assign({kind:'accessory',issueQty:qty,qty:qty},a)); } si_updateCart(); toast(`เพิ่ม ${accName(a)} ×${qty}`); };
  window.si_restockPrompt = function(a){ Swal.fire({title:`Restock ${esc(accName(a))}`,html:`<input id="rsQty" class="swal2-input" type="number" min="1" value="1"><input id="rsNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'Restock'}).then(r=>{ if(!r.isConfirmed)return; callBackend('si_restockAccessory',[{accessoryId:accId(a),qty:val('rsQty','1'),note:val('rsNote','')}],res=>{ if(res&&res.success){ Swal.fire('สำเร็จ',`New Qty: ${res.newQty||''}`,'success'); initStockInventoryModule(true); } else alertBox('Error',(res&&res.message)||'Failed','error'); },si_actionError); }); };
  window.si_openAccessoryLowStockAlerts = function(){ callBackend('si_getAccessoryStockAlerts',[{limit:300}],res=>{ const low=(res&&res.lowStock)||((res&&res.data&&res.data.lowStock)||[])||[]; const pending=(res&&res.pending)||((res&&res.data&&res.data.pending)||[])||[]; const html=`<div style="text-align:left"><h3>Low Stock (${low.length})</h3>${low.map(a=>`<div class="cart-item"><b>${esc(accName(a))}</b><span>${esc(a.team||'')} • Stock ${num(accQty(a))}/Min ${num(accMin(a))}</span></div>`).join('')||'<div class="sp-muted">No low stock</div>'}<h3 style="margin-top:14px">Pending Approval (${pending.length})</h3>${pending.map(p=>`<div class="cart-item"><b>${esc(p.requestId||p.request_id)}</b><span>${esc(p.itemName||p.item_name)} ×${num(p.qty)}</span></div>`).join('')||'<div class="sp-muted">No pending approval</div>'}</div>`; Swal.fire({title:'Accessories Alert',html,width:760,confirmButtonText:'Close'}); },si_actionError); };

  // ========== Check Stock ========== 
  window.initStockCheckModule = function(force=false){ installStyle(); ensureCfModeButton(); sc_setMode(window.SC&&SC.mode?SC.mode:'CHECK-IN'); sc_loadLogs&&sc_loadLogs(); sc_loadAccessoryOptions&&sc_loadAccessoryOptions(false); };
  function ensureCfModeButton(){ const grid=document.querySelector('#view-check_stock .sp-mode-grid') || document.querySelector('.sp-mode-grid'); if(!grid || document.getElementById('scModeCf')) return; const div=document.createElement('div'); div.className='sp-mode cf'; div.id='scModeCf'; div.onclick=()=>sc_setMode('CF_CAL_PM'); div.innerHTML='<i class="fas fa-screwdriver-wrench"></i><br/>CF CAL/PM<br/><span class="sp-sub">รอสอบเทียบ → พร้อมส่ง</span>'; grid.appendChild(div); }
  window.sc_setMode = function(mode){ window.SC=window.SC||{mode:'CHECK-IN',logs:[]}; SC.mode=mode; ['In','Out','Cf'].forEach(x=>{ const el=document.getElementById('scMode'+x); if(el){ el.classList.remove('active','in','out','cf'); }}); document.getElementById('scModeIn')?.classList.toggle('active',mode==='CHECK-IN'); document.getElementById('scModeIn')?.classList.toggle('in',mode==='CHECK-IN'); document.getElementById('scModeOut')?.classList.toggle('active',mode==='CHECK-OUT'); document.getElementById('scModeOut')?.classList.toggle('out',mode==='CHECK-OUT'); document.getElementById('scModeCf')?.classList.toggle('active',mode==='CF_CAL_PM'); document.getElementById('scModeCf')?.classList.toggle('cf',mode==='CF_CAL_PM'); const txt=document.getElementById('scModeText'); if(txt){ const map={'CHECK-IN':['#b45309','● โหมด: รับคืนเข้าคลัง (→ รอสอบเทียบ)'],'CHECK-OUT':['#2563eb','● โหมด: ส่งออกเช่ายืม (พร้อมส่ง → เช่ายืม)'],'CF_CAL_PM':['#059669','● โหมด: CF CAL/PM (รอสอบเทียบ → พร้อมส่ง)']}; const m=map[mode]||map['CHECK-IN']; txt.style.color=m[0]; txt.innerHTML=m[1]; }};
  window.sc_lookup = function(){ const q=val('scKeyword','').trim(); if(!q){ alertBox('กรุณากรอกรหัส','','info'); return; } setHtml('scResult','<div class="stockpro-card"><div class="sp-muted">กำลังค้นหา...</div></div>'); callBackend('sc_lookupStockDevice',[q],res=>{ if(!res||!res.success){ alertBox('Check Stock Error',(res&&res.message)||'Lookup failed','error'); return; } sc_renderResult(res.data||[]); sc_loadLogs&&sc_loadLogs(); },err=>alertBox('Check Stock Error',err.message||String(err),'error')); };
  window.sc_renderResult = function(rows){ if(!rows.length){ setHtml('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>'); return; } setHtml('scResult',rows.map(d=>{ const s=deviceStatus(d); return `<div class="stockpro-card"><div class="stockpro-card-head"><h3>${esc(d.idCode)} ${badge(s)}</h3><span class="sp-pill">${esc(d.brand||'-')}</span></div><div class="sp-result-grid">${sc_field('Serial Number',d.sn)}${sc_field('Model',d.model||d.itemName)}${sc_field('Location',d.location)}${sc_field('Borrower',d.borrower||'-')}${sc_field('Due Date',fmtDate(d.expectedReturn||d.expectedReturnDate))}${sc_field('Action Required',d.actionRequired||d.recheckNote||'-')}</div><div class="sp-action-group" style="justify-content:flex-start;margin-top:14px"><button class="sp-btn warn" ${s!==ST.RENTED?'disabled':''} onclick="sc_record('${esc(d.idCode)}','CHECK-IN')"><i class="fas fa-sign-in-alt"></i> Check-In รับคืน</button><button class="sp-btn success" ${s!==ST.RECHECK?'disabled':''} onclick="sc_record('${esc(d.idCode)}','CF_CAL_PM')"><i class="fas fa-screwdriver-wrench"></i> CF CAL/PM</button><button class="sp-btn primary" ${s!==ST.READY?'disabled':''} onclick="sc_checkoutPrompt('${esc(d.idCode)}','${esc(d.brand||'')}','${esc(d.model||'')}','${esc(d.sn||'')}')"><i class="fas fa-sign-out-alt"></i> Check-Out เช่ายืม</button></div></div>`; }).join('')); };
  window.sc_field = function(k,v){ return `<div class="sp-field"><div class="k">${esc(k)}</div><div class="v">${esc(v||'-')}</div></div>`; };
  window.sc_record = function(idCode,action,payload={}){ const p=Object.assign({action,idCode},payload); callBackend('sc_recordCheckAction',[p],res=>{ if(res&&res.success){ Swal.fire('สำเร็จ',res.message,'success'); sc_lookup(); sc_loadLogs&&sc_loadLogs(); } else alertBox('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); },err=>alertBox('Error',err.message||String(err),'error')); };
  window.sc_checkoutPrompt = function(idCode,brand,model,sn){ Swal.fire({title:'Check-Out เช่ายืม',html:`<input id="swBorrower" class="swal2-input" placeholder="ผู้ยืม / Borrower"><input id="swLocation" class="swal2-input" placeholder="สถานที่ / Location"><input id="swDue" class="swal2-input" type="date"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ยืนยัน',preConfirm:()=>({borrower:val('swBorrower'),location:val('swLocation'),expectedReturnDate:val('swDue'),note:val('swNote')})}).then(r=>{ if(!r.isConfirmed)return; const v=r.value; if(!v.borrower||!v.location||!v.expectedReturnDate){ alertBox('ข้อมูลไม่ครบ','','warning'); return; } sc_record(idCode,'CHECK-OUT',Object.assign(v,{brand,model,serialNumber:sn})); }); };

  document.addEventListener('DOMContentLoaded',()=>{ installStyle(); ensureCfModeButton(); });
  window.CES_STOCK_V6 = { installStyle, canonicalStatus, STATUS_LIST, callBackend };
})();
