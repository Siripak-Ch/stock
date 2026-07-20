

/* ============================================================
   CES Stock Pro FINAL FRONTEND — Infusion Pump Status/UI Patch
   New status set: พร้อมส่ง / รอสอบเทียบ / เช่ายืม / ใช้งานไม่ได้ / ไม่พบในรายการ
============================================================ */
(function(){
  if (window.__STOCK_FINAL_INFUSION_COMMON__) return;
  window.__STOCK_FINAL_INFUSION_COMMON__ = true;
  window.STOCK_FINAL_STATUS = { READY:'พร้อมส่ง', RECHECK:'รอสอบเทียบ', RENTED:'เช่ายืม', BROKEN:'ใช้งานไม่ได้', MISSING:'ไม่พบในรายการ' };
  window.stockFinalStatusList = function(){ return [STOCK_FINAL_STATUS.READY, STOCK_FINAL_STATUS.RECHECK, STOCK_FINAL_STATUS.RENTED, STOCK_FINAL_STATUS.BROKEN, STOCK_FINAL_STATUS.MISSING]; };
  window.stockFinalStatus = function(s){
    var raw = String(s == null ? '' : s).trim();
    var t = raw.toUpperCase();
    if(!raw) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.READY || /^(READY|STOCK|AVAILABLE|พร้อมใช้งาน|พร้อมส่ง)$/i.test(raw)) return STOCK_FINAL_STATUS.READY;
    if(raw===STOCK_FINAL_STATUS.RECHECK || /RECHECK|RE-CHECK|CAL|PM|สอบเทียบ|รอสอบเทียบ|ตรวจซ้ำ/.test(raw)) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.RENTED || /IN[_\s-]*USE|BORROW|RENT|OVERDUE|EXPIRED|เช่า|ยืม|เช่ายืม|เกินกำหนด/.test(t)) return STOCK_FINAL_STATUS.RENTED;
    if(raw===STOCK_FINAL_STATUS.BROKEN || /BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|ใช้งานไม่ได้/.test(t)) return STOCK_FINAL_STATUS.BROKEN;
    if(raw===STOCK_FINAL_STATUS.MISSING || /MISSING|LOST|ไม่พบ|สูญหาย|ไม่พบในรายการ/.test(t)) return STOCK_FINAL_STATUS.MISSING;
    return raw;
  };
  window.stockFinalNormalizeDevice = function(d){ d=d||{}; d.status=stockFinalStatus(d.displayStatus||d.display_status||d.status||d.baseStatus||d.base_status||d.rentalStatus||d.rental_status); d.finalStatus=d.status; d.displayStatus=d.status; return d; };
  window.stockFinalCounts = function(rows){
    var c={total:0,ready:0,stock:0,recheck:0,rented:0,inUse:0,broken:0,missing:0,unavailable:0};
    (rows||[]).forEach(function(d){ var s=stockFinalStatus((d||{}).status); c.total++; if(s===STOCK_FINAL_STATUS.READY){c.ready++;c.stock++;} else if(s===STOCK_FINAL_STATUS.RECHECK)c.recheck++; else if(s===STOCK_FINAL_STATUS.RENTED){c.rented++;c.inUse++;} else if(s===STOCK_FINAL_STATUS.BROKEN){c.broken++;c.unavailable++;} else if(s===STOCK_FINAL_STATUS.MISSING){c.missing++;c.unavailable++;} });
    return c;
  };
  window.stockFinalClearLocalCache = function(){
    try{ Object.keys(localStorage).forEach(function(k){ if(/CES_STOCK|STOCK_DASH|STOCK_INVENTORY|STOCK_CHECK/i.test(k)) localStorage.removeItem(k); }); }catch(e){}
  };
  window.stockFinalBadge = function(st){
    var s=stockFinalStatus(st), cls='final-recheck', icon='fa-screwdriver-wrench';
    if(s===STOCK_FINAL_STATUS.READY){cls='final-ready';icon='fa-circle-check';}
    else if(s===STOCK_FINAL_STATUS.RENTED){cls='final-rented';icon='fa-arrow-right-arrow-left';}
    else if(s===STOCK_FINAL_STATUS.BROKEN){cls='final-broken';icon='fa-triangle-exclamation';}
    else if(s===STOCK_FINAL_STATUS.MISSING){cls='final-missing';icon='fa-circle-question';}
    return '<span class="sp-badge '+cls+'"><i class="fas '+icon+'"></i> '+(typeof spEsc==='function'?spEsc(s):s)+'</span>';
  };
  window.spBadge = stockFinalBadge;
  window.sd_mapStatus = window.si_mapStatus = window.sc_mapStatus = stockFinalStatus;
  window.stockFinalStyle = function(){
    if(document.getElementById('stock-final-infusion-style')) return;
    var style=document.createElement('style'); style.id='stock-final-infusion-style';
    style.textContent = `
      .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important;color:#0f172a!important}
      .stockpro-header-card{background:linear-gradient(135deg,#ffffff 0%,#f5f8ff 100%)!important;border:1px solid #dbe7ff!important;border-radius:24px!important;box-shadow:0 14px 38px rgba(0,61,165,.08)!important}
      .stockpro-title-wrap h1{color:#003DA5!important;letter-spacing:-.03em}.stockpro-title-wrap p{color:#64748b!important}
      .stockpro-kpi-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important}
      .sp-kpi{position:relative;overflow:hidden;border:1px solid #e2e8f0!important;border-radius:20px!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;text-align:left!important;padding:16px!important}
      .sp-kpi:before{content:'';position:absolute;inset:0 auto 0 0;width:5px;background:var(--accent,#003DA5)}
      .sp-kpi .ico{margin:0 0 10px!important;width:38px!important;height:38px!important;border-radius:14px!important}.sp-kpi .label{font-size:12px!important;letter-spacing:0!important;text-transform:none!important;color:#64748b!important}.sp-kpi .val{font-size:30px!important;font-weight:1000!important}
      .sp-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:1000;white-space:nowrap}
      .sp-badge.final-ready{background:#dcfce7;color:#047857}.sp-badge.final-recheck{background:#fef3c7;color:#b45309}.sp-badge.final-rented{background:#dbeafe;color:#003DA5}.sp-badge.final-broken{background:#fee2e2;color:#b91c1c}.sp-badge.final-missing{background:#f3e8ff;color:#7e22ce}
      .sp-btn.ready{background:#059669!important;color:#fff!important}.sp-btn.calpm{background:#0f766e!important;color:#fff!important}.sp-btn:disabled,.sp-icon-btn:disabled{opacity:.45!important;cursor:not-allowed!important;filter:grayscale(.2)}
      .sp-status-flow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 0}.sp-status-flow span{font-size:11px;font-weight:900;border-radius:999px;padding:4px 8px;background:#f1f5f9;color:#475569}.sp-status-flow i{color:#94a3b8;font-size:11px}
      .stockpro-filter-card{border-radius:18px!important;border-color:#e2e8f0!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.04)!important}.stockpro-card{border-radius:20px!important;border-color:#e2e8f0!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important}.sp-table-wrap{border-radius:16px!important}.sp-table th{background:#f8fbff!important;color:#003DA5!important}.sp-table td{vertical-align:middle!important}
      @media(max-width:780px){.stockpro-header-card{align-items:flex-start!important}.stockpro-actions{width:100%;justify-content:flex-start}.stockpro-filter-card{grid-template-columns:1fr!important}.sp-result-grid{grid-template-columns:1fr!important}.sp-scan-input-row{grid-template-columns:1fr!important}.sp-mode-grid{grid-template-columns:1fr!important}.sp-kpi .val{font-size:24px!important}}
    `;
    document.head.appendChild(style);
  };
  stockFinalStyle();
})();


/* Dashboard final overrides */
(function(){
  function esc(v){ return (typeof spEsc==='function') ? spEsc(v) : String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function num(v){ return (typeof spNum==='function') ? spNum(v) : Number(v||0).toLocaleString(); }
  function setHtml(id,html){ if(typeof spSetHtml==='function') spSetHtml(id,html); else { var el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function val(id,fb){ return (typeof spVal==='function') ? spVal(id,fb||'') : ((document.getElementById(id)||{}).value || fb || ''); }
  function fmtDate(v){ return (typeof spFmtDate==='function') ? spFmtDate(v) : (v || '-'); }

  window.initStockDashboardModule = function(force){
    stockFinalStyle(); stockFinalClearLocalCache();
    setHtml('sdKpiGrid','<div class="sp-muted">Loading dashboard...</div>');
    google.script.run.withSuccessHandler(function(res){
      if(!res || !res.success){ Swal.fire('Dashboard Error',(res&&res.message)||'Cannot load dashboard','error'); return; }
      SD_DASH.loaded=true; SD_DASH.raw=res; SD_DASH.raw.inventory=(res.inventory||res.devices||[]).map(stockFinalNormalizeDevice); SD_DASH.raw.devices=SD_DASH.raw.inventory;
      sd_fillFilters(); sd_renderAllFinal();
    }).withFailureHandler(function(err){ Swal.fire('Dashboard Error',err.message||String(err),'error'); }).sd_getStockDashboardData(true);
  };
  window.sd_fillFilters = function(){
    var rows=(SD_DASH.raw&&SD_DASH.raw.inventory)||[];
    function uniq(a){ var m={},o=[]; (a||[]).forEach(function(x){ x=String(x||'').trim(); if(x&&!m[x]){m[x]=1;o.push(x);} }); return o.sort(); }
    function fill(id,arr,label){ var el=document.getElementById(id); if(!el)return; var cur=el.value||'all'; el.innerHTML='<option value="all">'+label+'</option>'+arr.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join(''); el.value=arr.indexOf(cur)>=0?cur:'all'; }
    fill('sdBrand',uniq(rows.map(function(d){return d.brand;})),'แบรนด์ทั้งหมด');
    fill('sdModel',uniq(rows.map(function(d){return d.model||d.itemName;})),'โมเดลทั้งหมด');
    fill('sdStatus',stockFinalStatusList(),'สถานะทั้งหมด');
  };
  window.sd_getFilteredDevices = function(){
    var rows=((SD_DASH.raw&&SD_DASH.raw.inventory)||[]).map(stockFinalNormalizeDevice);
    var q=String(val('sdSearch','')).toLowerCase(), b=val('sdBrand','all'), m=val('sdModel','all'), s=val('sdStatus','all');
    return rows.filter(function(d){ var text=[d.idCode,d.sn,d.serialNumber,d.brand,d.model,d.itemName,d.location,d.borrower,d.status,d.actionRequired].join(' ').toLowerCase(); if(q&&text.indexOf(q)<0)return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&(d.model||d.itemName)!==m)return false; if(s!=='all'&&stockFinalStatus(d.status)!==s)return false; return true; });
  };
  window.sd_renderKpis = function(k){
    k = k || stockFinalCounts(sd_getFilteredDevices());
    var items=[
      ['อุปกรณ์ทั้งหมด',k.total,'fa-boxes-stacked','#003DA5','#eef4ff'],['พร้อมส่ง',k.ready||k.stock||0,'fa-circle-check','#059669','#dcfce7'],['รอสอบเทียบ',k.recheck||0,'fa-screwdriver-wrench','#b45309','#fef3c7'],['เช่ายืม',k.rented||k.inUse||0,'fa-arrow-right-arrow-left','#2563eb','#dbeafe'],['ใช้งานไม่ได้',k.broken||0,'fa-triangle-exclamation','#dc2626','#fee2e2'],['ไม่พบในรายการ',k.missing||0,'fa-circle-question','#7e22ce','#f3e8ff']
    ];
    setHtml('sdKpiGrid',items.map(function(i){return '<div class="sp-kpi" style="--accent:'+i[3]+'"><div class="ico" style="background:'+i[4]+'"><i class="fas '+i[2]+'" style="color:'+i[3]+'"></i></div><div class="label">'+i[0]+'</div><div class="val" style="color:'+i[3]+'">'+num(i[1])+'</div></div>';}).join(''));
  };
  window.sd_renderModelCards = function(rows){
    rows=rows||sd_getFilteredDevices();
    var configs=[['B.BRAUN','INFUSOMAT','Infusomat Space','#003DA5','#eef4ff'],['B.BRAUN','SPACEPLUS','Spaceplus','#2563eb','#eff6ff'],['BYOND','SUNFUSION','Sunfusion','#0f766e','#ecfdf5']];
    setHtml('sdModelCards',configs.map(function(c){ var r=rows.filter(function(d){return String(d.brand||'').toUpperCase().indexOf(c[0])>=0 && [d.model,d.itemName].join(' ').toUpperCase().indexOf(c[1])>=0;}); var k=stockFinalCounts(r); return '<div class="sp-model-card" style="background:'+c[4]+';border-color:#dbe7ff"><div class="sp-model-icon" style="background:#fff;color:'+c[3]+'"><i class="fas fa-syringe"></i></div><div class="sp-model-brand">'+esc(c[0])+'</div><div class="sp-model-label">'+esc(c[2])+'</div><div class="sp-model-num" style="color:'+c[3]+'">'+num(r.length)+'</div><div class="sp-model-sub">พร้อมส่ง '+num(k.ready)+' • รอสอบเทียบ '+num(k.recheck)+' • เช่ายืม '+num(k.rented)+'</div></div>'; }).join(''));
  };
  window.sd_renderCharts = function(){
    if(typeof Chart==='undefined') return;
    var rows=sd_getFilteredDevices(); var by={}; rows.forEach(function(d){ var s=stockFinalStatus(d.status); by[s]=(by[s]||0)+1; });
    var labels=stockFinalStatusList(), data=labels.map(function(x){return by[x]||0;});
    var c=document.getElementById('sdStatusChart'); if(c){ if(SD_DASH.statusChart) SD_DASH.statusChart.destroy(); SD_DASH.statusChart=new Chart(c,{type:'doughnut',data:{labels:labels,datasets:[{data:data}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}}); }
    var months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; var counts=new Array(12).fill(0); rows.filter(function(d){return stockFinalStatus(d.status)===STOCK_FINAL_STATUS.RENTED;}).forEach(function(d){ var dt=new Date(d.borrowDate||d.expectedReturn||d.expectedReturnDate||new Date()); if(!isNaN(dt)) counts[dt.getMonth()]++; });
    var r=document.getElementById('sdRentalChart'); if(r){ if(SD_DASH.rentalChart) SD_DASH.rentalChart.destroy(); SD_DASH.rentalChart=new Chart(r,{type:'bar',data:{labels:months,datasets:[{label:'เช่ายืม',data:counts}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}}); }
  };
  window.sd_renderContractSummary = function(){
    var active=sd_getFilteredDevices().filter(function(d){return stockFinalStatus(d.status)===STOCK_FINAL_STATUS.RENTED;}); var map={};
    active.forEach(function(d){ var loc=d.location||'Unknown'; if(!map[loc]) map[loc]={location:loc,total:0,ids:[],models:{},borrowDate:'',expectedReturn:''}; var x=map[loc]; x.total++; x.ids.push(d.idCode); var model=d.model||d.itemName||'Unknown'; x.models[model]=(x.models[model]||0)+1; if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate; if(!x.expectedReturn&&(d.expectedReturn||d.expectedReturnDate))x.expectedReturn=d.expectedReturn||d.expectedReturnDate; });
    var rows=Object.keys(map).sort().map(function(k){ var x=map[k]; x.modelList=Object.keys(x.models).map(function(m){return m+' ×'+x.models[m];}).join(', '); return x; }); setHtml('sdContractCount',rows.length+' locations');
    if(!rows.length){ setHtml('sdContractTable','<div class="sp-muted">ไม่มีรายการเช่ายืมอยู่</div>'); return; }
    setHtml('sdContractTable','<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>จำนวนเครื่องเช่ายืม</th><th>Model</th><th>Borrow Date</th><th>Expected Return</th><th>Action</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><span class="sp-id">'+esc(r.location)+'</span></td><td>'+num(r.total)+'</td><td>'+esc(r.modelList)+'</td><td>'+fmtDate(r.borrowDate)+'</td><td>'+fmtDate(r.expectedReturn)+'</td><td><button class="sp-icon-btn green" title="รับคืนเข้าคลัง" onclick=\'sd_bulkReturn('+JSON.stringify(r.ids)+')\'><i class="fas fa-undo"></i></button></td></tr>';}).join('')+'</tbody></table></div>');
  };
  window.sd_renderSummaryTables = function(){
    var rows=sd_getFilteredDevices();
    function countBy(key){var m={}; rows.forEach(function(d){var x=d[key]||'Unknown';m[x]=(m[x]||0)+1;}); return Object.keys(m).sort().map(function(k){return {name:k,count:m[k]};});}
    window.sd_countBy = function(rows2,key){var m={}; (rows2||rows).forEach(function(d){var x=d[key]||'Unknown';m[x]=(m[x]||0)+1;}); return Object.keys(m).sort().map(function(k){return {name:k,count:m[k]};});};
    function table(arr){return '<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>รายการ</th><th>จำนวน</th></tr></thead><tbody>'+arr.map(function(x){return '<tr><td>'+esc(x.name)+'</td><td>'+num(x.count)+'</td></tr>';}).join('')+'</tbody></table></div>';}
    setHtml('sdSummaryTable',table(countBy('model'))); setHtml('sdLocationTable',table(countBy('location')));
  };
  window.sd_renderAlerts = function(){ var rows=sd_getFilteredDevices().filter(function(d){var s=stockFinalStatus(d.status); return s===STOCK_FINAL_STATUS.RECHECK || s===STOCK_FINAL_STATUS.BROKEN || s===STOCK_FINAL_STATUS.MISSING || d.actionRequired;}).slice(0,150); setHtml('sdAlertCount',rows.length+' alerts'); setHtml('sdAlertHeaderCount',rows.length>99?'99+':rows.length); setHtml('sdAlertTable',sd_table(rows,[['idCode','ID'],['serialNumber','SN'],['model','Model'],['location','Location'],['status','Status'],['actionRequired','Action']])); };
  window.sd_table=function(rows,cols){ if(!rows||!rows.length)return '<div class="sp-muted">No data</div>'; return '<div class="sp-table-wrap"><table class="sp-table"><thead><tr>'+cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+cols.map(function(c){return '<td>'+(c[0]==='status'?stockFinalBadge(r[c[0]]):esc(r[c[0]]||'-'))+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>'; };
  window.sd_renderFiltered = window.sd_renderAllFinal = function(){ var rows=sd_getFilteredDevices(); sd_renderModelCards(rows); sd_renderKpis(stockFinalCounts(rows)); sd_renderCharts(); sd_renderContractSummary(); sd_renderSummaryTables(); sd_renderAlerts(); };
})();



/* ============================================================
   CES Stock Pro FINAL FRONTEND — Infusion Pump Status/UI Patch
   New status set: พร้อมส่ง / รอสอบเทียบ / เช่ายืม / ใช้งานไม่ได้ / ไม่พบในรายการ
============================================================ */
(function(){
  if (window.__STOCK_FINAL_INFUSION_COMMON__) return;
  window.__STOCK_FINAL_INFUSION_COMMON__ = true;
  window.STOCK_FINAL_STATUS = { READY:'พร้อมส่ง', RECHECK:'รอสอบเทียบ', RENTED:'เช่ายืม', BROKEN:'ใช้งานไม่ได้', MISSING:'ไม่พบในรายการ' };
  window.stockFinalStatusList = function(){ return [STOCK_FINAL_STATUS.READY, STOCK_FINAL_STATUS.RECHECK, STOCK_FINAL_STATUS.RENTED, STOCK_FINAL_STATUS.BROKEN, STOCK_FINAL_STATUS.MISSING]; };
  window.stockFinalStatus = function(s){
    var raw = String(s == null ? '' : s).trim();
    var t = raw.toUpperCase();
    if(!raw) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.READY || /^(READY|STOCK|AVAILABLE|พร้อมใช้งาน|พร้อมส่ง)$/i.test(raw)) return STOCK_FINAL_STATUS.READY;
    if(raw===STOCK_FINAL_STATUS.RECHECK || /RECHECK|RE-CHECK|CAL|PM|สอบเทียบ|รอสอบเทียบ|ตรวจซ้ำ/.test(raw)) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.RENTED || /IN[_\s-]*USE|BORROW|RENT|OVERDUE|EXPIRED|เช่า|ยืม|เช่ายืม|เกินกำหนด/.test(t)) return STOCK_FINAL_STATUS.RENTED;
    if(raw===STOCK_FINAL_STATUS.BROKEN || /BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|ใช้งานไม่ได้/.test(t)) return STOCK_FINAL_STATUS.BROKEN;
    if(raw===STOCK_FINAL_STATUS.MISSING || /MISSING|LOST|ไม่พบ|สูญหาย|ไม่พบในรายการ/.test(t)) return STOCK_FINAL_STATUS.MISSING;
    return raw;
  };
  window.stockFinalNormalizeDevice = function(d){ d=d||{}; d.status=stockFinalStatus(d.displayStatus||d.display_status||d.status||d.baseStatus||d.base_status||d.rentalStatus||d.rental_status); d.finalStatus=d.status; d.displayStatus=d.status; return d; };
  window.stockFinalCounts = function(rows){
    var c={total:0,ready:0,stock:0,recheck:0,rented:0,inUse:0,broken:0,missing:0,unavailable:0};
    (rows||[]).forEach(function(d){ var s=stockFinalStatus((d||{}).status); c.total++; if(s===STOCK_FINAL_STATUS.READY){c.ready++;c.stock++;} else if(s===STOCK_FINAL_STATUS.RECHECK)c.recheck++; else if(s===STOCK_FINAL_STATUS.RENTED){c.rented++;c.inUse++;} else if(s===STOCK_FINAL_STATUS.BROKEN){c.broken++;c.unavailable++;} else if(s===STOCK_FINAL_STATUS.MISSING){c.missing++;c.unavailable++;} });
    return c;
  };
  window.stockFinalClearLocalCache = function(){
    try{ Object.keys(localStorage).forEach(function(k){ if(/CES_STOCK|STOCK_DASH|STOCK_INVENTORY|STOCK_CHECK/i.test(k)) localStorage.removeItem(k); }); }catch(e){}
  };
  window.stockFinalBadge = function(st){
    var s=stockFinalStatus(st), cls='final-recheck', icon='fa-screwdriver-wrench';
    if(s===STOCK_FINAL_STATUS.READY){cls='final-ready';icon='fa-circle-check';}
    else if(s===STOCK_FINAL_STATUS.RENTED){cls='final-rented';icon='fa-arrow-right-arrow-left';}
    else if(s===STOCK_FINAL_STATUS.BROKEN){cls='final-broken';icon='fa-triangle-exclamation';}
    else if(s===STOCK_FINAL_STATUS.MISSING){cls='final-missing';icon='fa-circle-question';}
    return '<span class="sp-badge '+cls+'"><i class="fas '+icon+'"></i> '+(typeof spEsc==='function'?spEsc(s):s)+'</span>';
  };
  window.spBadge = stockFinalBadge;
  window.sd_mapStatus = window.si_mapStatus = window.sc_mapStatus = stockFinalStatus;
  window.stockFinalStyle = function(){
    if(document.getElementById('stock-final-infusion-style')) return;
    var style=document.createElement('style'); style.id='stock-final-infusion-style';
    style.textContent = `
      .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important;color:#0f172a!important}
      .stockpro-header-card{background:linear-gradient(135deg,#ffffff 0%,#f5f8ff 100%)!important;border:1px solid #dbe7ff!important;border-radius:24px!important;box-shadow:0 14px 38px rgba(0,61,165,.08)!important}
      .stockpro-title-wrap h1{color:#003DA5!important;letter-spacing:-.03em}.stockpro-title-wrap p{color:#64748b!important}
      .stockpro-kpi-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important}
      .sp-kpi{position:relative;overflow:hidden;border:1px solid #e2e8f0!important;border-radius:20px!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;text-align:left!important;padding:16px!important}
      .sp-kpi:before{content:'';position:absolute;inset:0 auto 0 0;width:5px;background:var(--accent,#003DA5)}
      .sp-kpi .ico{margin:0 0 10px!important;width:38px!important;height:38px!important;border-radius:14px!important}.sp-kpi .label{font-size:12px!important;letter-spacing:0!important;text-transform:none!important;color:#64748b!important}.sp-kpi .val{font-size:30px!important;font-weight:1000!important}
      .sp-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:1000;white-space:nowrap}
      .sp-badge.final-ready{background:#dcfce7;color:#047857}.sp-badge.final-recheck{background:#fef3c7;color:#b45309}.sp-badge.final-rented{background:#dbeafe;color:#003DA5}.sp-badge.final-broken{background:#fee2e2;color:#b91c1c}.sp-badge.final-missing{background:#f3e8ff;color:#7e22ce}
      .sp-btn.ready{background:#059669!important;color:#fff!important}.sp-btn.calpm{background:#0f766e!important;color:#fff!important}.sp-btn:disabled,.sp-icon-btn:disabled{opacity:.45!important;cursor:not-allowed!important;filter:grayscale(.2)}
      .sp-status-flow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 0}.sp-status-flow span{font-size:11px;font-weight:900;border-radius:999px;padding:4px 8px;background:#f1f5f9;color:#475569}.sp-status-flow i{color:#94a3b8;font-size:11px}
      .stockpro-filter-card{border-radius:18px!important;border-color:#e2e8f0!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.04)!important}.stockpro-card{border-radius:20px!important;border-color:#e2e8f0!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important}.sp-table-wrap{border-radius:16px!important}.sp-table th{background:#f8fbff!important;color:#003DA5!important}.sp-table td{vertical-align:middle!important}
      @media(max-width:780px){.stockpro-header-card{align-items:flex-start!important}.stockpro-actions{width:100%;justify-content:flex-start}.stockpro-filter-card{grid-template-columns:1fr!important}.sp-result-grid{grid-template-columns:1fr!important}.sp-scan-input-row{grid-template-columns:1fr!important}.sp-mode-grid{grid-template-columns:1fr!important}.sp-kpi .val{font-size:24px!important}}
    `;
    document.head.appendChild(style);
  };
  stockFinalStyle();
})();


/* Inventory final overrides */
(function(){
  function esc(v){ return (typeof spEsc==='function') ? spEsc(v) : String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function num(v){ return (typeof spNum==='function') ? spNum(v) : Number(v||0).toLocaleString(); }
  function setHtml(id,html){ if(typeof spSetHtml==='function') spSetHtml(id,html); else { var el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function val(id,fb){ return (typeof spVal==='function') ? spVal(id,fb||'') : ((document.getElementById(id)||{}).value || fb || ''); }
  function json(o){ return (typeof si_json==='function') ? si_json(o) : JSON.stringify(o||{}).replace(/'/g,'&#39;').replace(/</g,'&lt;'); }
  function fmtDate(v){ return (typeof spFmtDate==='function') ? spFmtDate(v) : (v || '-'); }
  window.initStockInventoryModule = function(force){
    stockFinalStyle(); stockFinalClearLocalCache();
    var bd=document.getElementById('siBorrowDate'); if(bd&&!bd.value) bd.value=new Date().toISOString().slice(0,10);
    setHtml('siTable','<div class="sp-muted">Loading inventory...</div>');
    google.script.run.withSuccessHandler(function(res){
      if(!res || !res.success){ Swal.fire('Inventory Error',(res&&res.message)||'Cannot load inventory','error'); return; }
      SI.loaded=true; SI.raw=res; SI.inv=(res.inventory||[]).map(stockFinalNormalizeDevice); SI.acc=res.accessories||[]; si_fillFilters(); si_renderKpi(); si_applyFilters();
    }).withFailureHandler(function(err){ Swal.fire('Inventory Error',err.message||String(err),'error'); }).si_getStockInventoryData(true);
  };
  window.si_fillFilters = function(){
    function uniq(a){var m={},o=[];(a||[]).forEach(function(x){x=String(x||'').trim();if(x&&!m[x]){m[x]=1;o.push(x);}});return o.sort();}
    function fill(id,arr,label){var el=document.getElementById(id);if(!el)return;var cur=el.value||'all';el.innerHTML='<option value="all">'+label+'</option>'+arr.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');el.value=arr.indexOf(cur)>=0?cur:'all';}
    fill('siBrand',uniq(SI.inv.map(function(d){return d.brand;})),'All Brand'); fill('siModel',uniq(SI.inv.map(function(d){return d.model||d.itemName;})),'All Model'); fill('siLocation',uniq(SI.inv.map(function(d){return d.location;})),'All Location'); fill('siStatus',stockFinalStatusList(),'All Status');
    fill('siAccTeam',uniq(SI.acc.map(function(a){return a.team;})),'All Team'); fill('siAccItem',uniq(SI.acc.map(function(a){return a.itemName||a.name;})),'All Item'); fill('siAccAction',uniq(SI.acc.map(function(a){return a.actionRequired||a.action_required;})),'All Action'); fill('siAccStatus',uniq(SI.acc.map(function(a){return a.status;})),'All Status');
  };
  window.si_renderKpi = function(){
    var rows=(SI.tab==='equip' ? (SI.filtered&&SI.filtered.length?SI.filtered:SI.inv) : SI.inv); var k=stockFinalCounts(rows);
    var items=[['อุปกรณ์ทั้งหมด',k.total,'fa-boxes-stacked','#003DA5','#eef4ff'],['พร้อมส่ง',k.ready,'fa-circle-check','#059669','#dcfce7'],['รอสอบเทียบ',k.recheck,'fa-screwdriver-wrench','#b45309','#fef3c7'],['เช่ายืม',k.rented,'fa-arrow-right-arrow-left','#2563eb','#dbeafe'],['ใช้งานไม่ได้',k.broken,'fa-triangle-exclamation','#dc2626','#fee2e2'],['ไม่พบในรายการ',k.missing,'fa-circle-question','#7e22ce','#f3e8ff']];
    var html=items.map(function(i){return '<div class="sp-kpi" style="--accent:'+i[3]+'"><div class="ico" style="background:'+i[4]+'"><i class="fas '+i[2]+'" style="color:'+i[3]+'"></i></div><div class="label">'+i[0]+'</div><div class="val" style="color:'+i[3]+'">'+num(i[1])+'</div></div>';}).join('');
    setHtml('siKpiGrid',html); setHtml('siEquipKpiGrid',html);
    if(SI.raw&&SI.raw.kpi){ var ak=SI.raw.kpi; setHtml('siAccKpiGrid','<div class="sp-kpi" style="--accent:#003DA5"><div class="label">Accessories</div><div class="val">'+num(ak.accessories||SI.acc.length)+'</div></div><div class="sp-kpi" style="--accent:#dc2626"><div class="label">Low Stock</div><div class="val">'+num(ak.accLow||0)+'</div></div><div class="sp-kpi" style="--accent:#2563eb"><div class="label">Pending Approval</div><div class="val">'+num(ak.accPending||0)+'</div></div>'); }
  };
  window.si_applyFilters = function(){
    if(SI.tab==='equip'){
      var q=String(val('siSearch','')).toLowerCase(), b=val('siBrand','all'), m=val('siModel','all'), l=val('siLocation','all'), s=val('siStatus','all');
      SI.filtered=SI.inv.filter(function(d){ d=stockFinalNormalizeDevice(d); var text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase(); if(q&&text.indexOf(q)<0)return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&(d.model||d.itemName)!==m)return false; if(l!=='all'&&d.location!==l)return false; if(s!=='all'&&stockFinalStatus(d.status)!==s)return false; return true; }); SI.page=1; si_renderKpi(); si_renderTable();
    } else { if(typeof si_renderAccCards==='function'){ var q2=String(val('siAccSearch','')).toLowerCase(), team=val('siAccTeam','all'), item=val('siAccItem','all'), st=val('siAccStatus','all'), act=val('siAccAction','all'); SI.accFiltered=SI.acc.filter(function(a){var nm=a.itemName||a.name||'', ar=a.actionRequired||a.action_required||'';var text=[a.accessoryId,a.idCode,a.team,nm,a.type,a.status,ar,a.location,a.remark].join(' ').toLowerCase(); if(q2&&text.indexOf(q2)<0)return false; if(team!=='all'&&a.team!==team)return false; if(item!=='all'&&nm!==item)return false; if(st!=='all'&&a.status!==st)return false; if(act!=='all'&&ar!==act)return false; return true;}); SI.accPage=1; si_renderKpi(); si_renderAccCards(); } }
  };
  window.si_renderTable=function(){ var start=(SI.page-1)*SI.pageSize, rows=SI.filtered.slice(start,start+SI.pageSize); setHtml('siTableCount',SI.filtered.length+' items'); if(!rows.length){setHtml('siTable','<div class="sp-muted">No equipment found</div>');setHtml('siPagination','');return;} setHtml('siTable','<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>'+rows.map(function(d,i){d=stockFinalNormalizeDevice(d);return '<tr><td>'+(start+i+1)+'</td><td><span class="sp-id">'+esc(d.idCode)+'</span></td><td>'+esc(d.sn||'-')+'</td><td><b>'+esc(d.brand||'-')+'</b><span class="sp-sub">'+esc(d.model||d.itemName||'-')+'</span></td><td>'+stockFinalBadge(d.status)+'</td><td>'+esc(d.borrower||'-')+'</td><td>'+esc(d.location||'-')+'</td><td>'+fmtDate(d.expectedReturn||d.expectedReturnDate)+'</td><td>'+esc(d.actionRequired||d.recheckNote||'-')+'</td><td>'+si_rentButtons(d)+'</td><td>'+si_equipmentButtons(d)+'</td></tr>';}).join('')+'</tbody></table></div>'); if(typeof si_renderPagination==='function')si_renderPagination(); };
  window.si_rentButtons=function(d){ var s=stockFinalStatus(d.status); var canCheckout=s===STOCK_FINAL_STATUS.READY; var canReturn=s===STOCK_FINAL_STATUS.RENTED; return '<div class="sp-action-group"><button class="sp-icon-btn" '+(canCheckout?'':'disabled')+' title="Add to cart / พร้อมส่งเท่านั้น" onclick=\'si_addEquipmentToCart('+json(d)+')\'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn orange" '+(canReturn?'':'disabled')+' title="ต่อสัญญา" onclick=\'si_extendPrompt('+json(d)+')\'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" '+(canReturn?'':'disabled')+' title="รับคืนเข้าคลัง = รอสอบเทียบ" onclick=\'si_returnPrompt('+json(d)+')\'><i class="fas fa-undo"></i></button></div>'; };
  window.si_equipmentButtons=function(d){ var s=stockFinalStatus(d.status); return '<div class="sp-action-group">'+(s===STOCK_FINAL_STATUS.RECHECK?'<button class="sp-icon-btn green" title="CF CAL/PM → พร้อมส่ง" onclick=\'si_markReadyPrompt('+json(d)+')\'><i class="fas fa-check-double"></i></button>':'')+'<button class="sp-icon-btn" title="Edit Status" onclick=\'si_editPrompt('+json(d)+')\'><i class="fas fa-pen-to-square"></i></button><button class="sp-icon-btn gray" title="ใช้งานไม่ได้" onclick=\'si_markBrokenPrompt('+json(d)+')\'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn red" title="Delete/Hide" onclick=\'si_deletePrompt('+json(d)+')\'><i class="fas fa-trash"></i></button></div>'; };
  window.si_addEquipmentToCart=function(d){ if(!d||!d.idCode)return; var mapped=stockFinalStatus(d.status); if(mapped!==STOCK_FINAL_STATUS.READY){Swal.fire('ไม่สามารถเพิ่มได้',d.idCode+' สถานะ: '+mapped+'\nต้องเป็น พร้อมส่ง ก่อน Check-Out','warning');return;} if(SI.cart.find(function(x){return x.kind==='equipment'&&x.idCode===d.idCode;})){Swal.fire({toast:true,position:'top-end',icon:'info',title:'อยู่ในตะกร้าแล้ว',timer:1200,showConfirmButton:false});return;} SI.cart.push(Object.assign({kind:'equipment',qty:1},d)); si_updateCart(); Swal.fire({toast:true,position:'top-end',icon:'success',title:'เพิ่ม '+d.idCode,timer:1200,showConfirmButton:false}); };
  window.si_markReadyPrompt=function(d){ Swal.fire({title:'CF CAL/PM ผ่านแล้ว?',html:'<div class="sp-status-flow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span></div><input id="swNote" class="swal2-input" placeholder="หมายเหตุ" value="CF CAL/PM completed">',icon:'question',showCancelButton:true,confirmButtonText:'อัปเดตเป็นพร้อมส่ง'}).then(function(r){ if(!r.isConfirmed)return; google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_updateRecheckToReady({idCode:d.idCode,location:d.location||'Warehouse',note:val('swNote','CF CAL/PM completed')}); }); };
  window.si_editPrompt=function(d){ var s=stockFinalStatus(d.status); Swal.fire({title:'Edit Equipment / Status',width:760,html:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left"><input id="edId" class="swal2-input" placeholder="ID Code" value="'+esc(d.idCode)+'"><input id="edSn" class="swal2-input" placeholder="SN" value="'+esc(d.sn||'')+'"><input id="edBrand" class="swal2-input" placeholder="Brand" value="'+esc(d.brand||'')+'"><input id="edModel" class="swal2-input" placeholder="Model" value="'+esc(d.model||'')+'"><input id="edItem" class="swal2-input" placeholder="Item Name" value="'+esc(d.itemName||'')+'"><input id="edCat" class="swal2-input" placeholder="Category" value="'+esc(d.category||'')+'"><input id="edLoc" class="swal2-input" placeholder="Location" value="'+esc(d.location||'')+'"><select id="edStatus" class="swal2-input">'+stockFinalStatusList().map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join('')+'</select><input id="edAction" class="swal2-input" placeholder="Action Required" value="'+esc(d.actionRequired||'')+'"><input id="edNote" class="swal2-input" placeholder="Note" value="'+esc(d.recheckNote||'')+'"></div>',showCancelButton:true,confirmButtonText:'Save',didOpen:function(){document.getElementById('edStatus').value=s;},preConfirm:function(){return {originalIdCode:d.idCode,idCode:val('edId'),serialNumber:val('edSn'),brand:val('edBrand'),model:val('edModel'),itemName:val('edItem'),category:val('edCat'),location:val('edLoc'),displayStatus:val('edStatus'),status:val('edStatus'),actionRequired:val('edAction'),recheckNote:val('edNote')};}}).then(function(r){if(!r.isConfirmed)return; google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_editEquipment(r.value);}); };
  window.si_afterAction=function(res){ if(res&&res.success){stockFinalClearLocalCache(); Swal.fire('สำเร็จ',res.message||'Completed','success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);} else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); };
})();



/* ============================================================
   CES Stock Pro FINAL FRONTEND — Infusion Pump Status/UI Patch
   New status set: พร้อมส่ง / รอสอบเทียบ / เช่ายืม / ใช้งานไม่ได้ / ไม่พบในรายการ
============================================================ */
(function(){
  if (window.__STOCK_FINAL_INFUSION_COMMON__) return;
  window.__STOCK_FINAL_INFUSION_COMMON__ = true;
  window.STOCK_FINAL_STATUS = { READY:'พร้อมส่ง', RECHECK:'รอสอบเทียบ', RENTED:'เช่ายืม', BROKEN:'ใช้งานไม่ได้', MISSING:'ไม่พบในรายการ' };
  window.stockFinalStatusList = function(){ return [STOCK_FINAL_STATUS.READY, STOCK_FINAL_STATUS.RECHECK, STOCK_FINAL_STATUS.RENTED, STOCK_FINAL_STATUS.BROKEN, STOCK_FINAL_STATUS.MISSING]; };
  window.stockFinalStatus = function(s){
    var raw = String(s == null ? '' : s).trim();
    var t = raw.toUpperCase();
    if(!raw) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.READY || /^(READY|STOCK|AVAILABLE|พร้อมใช้งาน|พร้อมส่ง)$/i.test(raw)) return STOCK_FINAL_STATUS.READY;
    if(raw===STOCK_FINAL_STATUS.RECHECK || /RECHECK|RE-CHECK|CAL|PM|สอบเทียบ|รอสอบเทียบ|ตรวจซ้ำ/.test(raw)) return STOCK_FINAL_STATUS.RECHECK;
    if(raw===STOCK_FINAL_STATUS.RENTED || /IN[_\s-]*USE|BORROW|RENT|OVERDUE|EXPIRED|เช่า|ยืม|เช่ายืม|เกินกำหนด/.test(t)) return STOCK_FINAL_STATUS.RENTED;
    if(raw===STOCK_FINAL_STATUS.BROKEN || /BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|ใช้งานไม่ได้/.test(t)) return STOCK_FINAL_STATUS.BROKEN;
    if(raw===STOCK_FINAL_STATUS.MISSING || /MISSING|LOST|ไม่พบ|สูญหาย|ไม่พบในรายการ/.test(t)) return STOCK_FINAL_STATUS.MISSING;
    return raw;
  };
  window.stockFinalNormalizeDevice = function(d){ d=d||{}; d.status=stockFinalStatus(d.displayStatus||d.display_status||d.status||d.baseStatus||d.base_status||d.rentalStatus||d.rental_status); d.finalStatus=d.status; d.displayStatus=d.status; return d; };
  window.stockFinalCounts = function(rows){
    var c={total:0,ready:0,stock:0,recheck:0,rented:0,inUse:0,broken:0,missing:0,unavailable:0};
    (rows||[]).forEach(function(d){ var s=stockFinalStatus((d||{}).status); c.total++; if(s===STOCK_FINAL_STATUS.READY){c.ready++;c.stock++;} else if(s===STOCK_FINAL_STATUS.RECHECK)c.recheck++; else if(s===STOCK_FINAL_STATUS.RENTED){c.rented++;c.inUse++;} else if(s===STOCK_FINAL_STATUS.BROKEN){c.broken++;c.unavailable++;} else if(s===STOCK_FINAL_STATUS.MISSING){c.missing++;c.unavailable++;} });
    return c;
  };
  window.stockFinalClearLocalCache = function(){
    try{ Object.keys(localStorage).forEach(function(k){ if(/CES_STOCK|STOCK_DASH|STOCK_INVENTORY|STOCK_CHECK/i.test(k)) localStorage.removeItem(k); }); }catch(e){}
  };
  window.stockFinalBadge = function(st){
    var s=stockFinalStatus(st), cls='final-recheck', icon='fa-screwdriver-wrench';
    if(s===STOCK_FINAL_STATUS.READY){cls='final-ready';icon='fa-circle-check';}
    else if(s===STOCK_FINAL_STATUS.RENTED){cls='final-rented';icon='fa-arrow-right-arrow-left';}
    else if(s===STOCK_FINAL_STATUS.BROKEN){cls='final-broken';icon='fa-triangle-exclamation';}
    else if(s===STOCK_FINAL_STATUS.MISSING){cls='final-missing';icon='fa-circle-question';}
    return '<span class="sp-badge '+cls+'"><i class="fas '+icon+'"></i> '+(typeof spEsc==='function'?spEsc(s):s)+'</span>';
  };
  window.spBadge = stockFinalBadge;
  window.sd_mapStatus = window.si_mapStatus = window.sc_mapStatus = stockFinalStatus;
  window.stockFinalStyle = function(){
    if(document.getElementById('stock-final-infusion-style')) return;
    var style=document.createElement('style'); style.id='stock-final-infusion-style';
    style.textContent = `
      .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important;color:#0f172a!important}
      .stockpro-header-card{background:linear-gradient(135deg,#ffffff 0%,#f5f8ff 100%)!important;border:1px solid #dbe7ff!important;border-radius:24px!important;box-shadow:0 14px 38px rgba(0,61,165,.08)!important}
      .stockpro-title-wrap h1{color:#003DA5!important;letter-spacing:-.03em}.stockpro-title-wrap p{color:#64748b!important}
      .stockpro-kpi-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important}
      .sp-kpi{position:relative;overflow:hidden;border:1px solid #e2e8f0!important;border-radius:20px!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;text-align:left!important;padding:16px!important}
      .sp-kpi:before{content:'';position:absolute;inset:0 auto 0 0;width:5px;background:var(--accent,#003DA5)}
      .sp-kpi .ico{margin:0 0 10px!important;width:38px!important;height:38px!important;border-radius:14px!important}.sp-kpi .label{font-size:12px!important;letter-spacing:0!important;text-transform:none!important;color:#64748b!important}.sp-kpi .val{font-size:30px!important;font-weight:1000!important}
      .sp-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:1000;white-space:nowrap}
      .sp-badge.final-ready{background:#dcfce7;color:#047857}.sp-badge.final-recheck{background:#fef3c7;color:#b45309}.sp-badge.final-rented{background:#dbeafe;color:#003DA5}.sp-badge.final-broken{background:#fee2e2;color:#b91c1c}.sp-badge.final-missing{background:#f3e8ff;color:#7e22ce}
      .sp-btn.ready{background:#059669!important;color:#fff!important}.sp-btn.calpm{background:#0f766e!important;color:#fff!important}.sp-btn:disabled,.sp-icon-btn:disabled{opacity:.45!important;cursor:not-allowed!important;filter:grayscale(.2)}
      .sp-status-flow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 0}.sp-status-flow span{font-size:11px;font-weight:900;border-radius:999px;padding:4px 8px;background:#f1f5f9;color:#475569}.sp-status-flow i{color:#94a3b8;font-size:11px}
      .stockpro-filter-card{border-radius:18px!important;border-color:#e2e8f0!important;background:#fff!important;box-shadow:0 8px 22px rgba(15,23,42,.04)!important}.stockpro-card{border-radius:20px!important;border-color:#e2e8f0!important;box-shadow:0 8px 22px rgba(15,23,42,.05)!important}.sp-table-wrap{border-radius:16px!important}.sp-table th{background:#f8fbff!important;color:#003DA5!important}.sp-table td{vertical-align:middle!important}
      @media(max-width:780px){.stockpro-header-card{align-items:flex-start!important}.stockpro-actions{width:100%;justify-content:flex-start}.stockpro-filter-card{grid-template-columns:1fr!important}.sp-result-grid{grid-template-columns:1fr!important}.sp-scan-input-row{grid-template-columns:1fr!important}.sp-mode-grid{grid-template-columns:1fr!important}.sp-kpi .val{font-size:24px!important}}
    `;
    document.head.appendChild(style);
  };
  stockFinalStyle();
})();


/* Check Stock final overrides */
(function(){
  function esc(v){ return (typeof spEsc==='function') ? spEsc(v) : String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function setHtml(id,html){ if(typeof spSetHtml==='function') spSetHtml(id,html); else { var el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function val(id,fb){ return (typeof spVal==='function') ? spVal(id,fb||'') : ((document.getElementById(id)||{}).value || fb || ''); }
  function fmtDate(v){ return (typeof spFmtDate==='function') ? spFmtDate(v) : (v || '-'); }
  window.sc_finalEnsureCalMode=function(){
    if(document.getElementById('scModeCal')) return;
    var grid=document.querySelector('#view-check_stock .sp-mode-grid') || document.querySelector('.sp-mode-grid');
    if(grid){ var div=document.createElement('div'); div.className='sp-mode cal'; div.id='scModeCal'; div.onclick=function(){sc_setMode('CF_CAL_PM');}; div.innerHTML='<i class="fas fa-screwdriver-wrench"></i><br/>CF CAL/PM<br/><span class="sp-sub">รอสอบเทียบ → พร้อมส่ง</span>'; grid.appendChild(div); grid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))'; }
  };
  window.initStockCheckModule=function(force){ stockFinalStyle(); sc_finalEnsureCalMode(); sc_loadLogs(); if(typeof sc_loadAccessoryOptions==='function') sc_loadAccessoryOptions(force===true); };
  window.sc_setMode=function(mode){ SC.mode=mode; sc_finalEnsureCalMode(); ['scModeIn','scModeOut','scModeCal'].forEach(function(id){var el=document.getElementById(id); if(el){el.classList.remove('active','in','out','cal-active');}}); var txt=document.getElementById('scModeText'); if(mode==='CHECK-IN'){document.getElementById('scModeIn')&&document.getElementById('scModeIn').classList.add('active','in'); if(txt){txt.style.color='#b45309';txt.innerHTML='● โหมด: Check-In / รับคืนเข้าคลัง (→ รอสอบเทียบ)';}} else if(mode==='CHECK-OUT'){document.getElementById('scModeOut')&&document.getElementById('scModeOut').classList.add('active','out'); if(txt){txt.style.color='#2563eb';txt.innerHTML='● โหมด: Check-Out (พร้อมส่ง → เช่ายืม)';}} else {document.getElementById('scModeCal')&&document.getElementById('scModeCal').classList.add('active','cal-active'); if(txt){txt.style.color='#059669';txt.innerHTML='● โหมด: CF CAL/PM ผ่าน (รอสอบเทียบ → พร้อมส่ง)';}} };
  window.sc_renderResult=function(rows){
    if(!rows.length){setHtml('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>');return;}
    setHtml('scResult',rows.map(function(d){ d=stockFinalNormalizeDevice(d); var s=stockFinalStatus(d.status); var canReady=s===STOCK_FINAL_STATUS.RECHECK, canOut=s===STOCK_FINAL_STATUS.READY, canIn=s===STOCK_FINAL_STATUS.RENTED; return '<div class="stockpro-card"><div class="stockpro-card-head"><h3>'+esc(d.idCode)+' '+stockFinalBadge(s)+'</h3><span class="sp-pill">'+esc(d.brand||'-')+'</span></div><div class="sp-status-flow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span><i class="fas fa-arrow-right"></i><span>เช่ายืม</span><i class="fas fa-arrow-right"></i><span>รับคืน = รอสอบเทียบ</span></div><div class="sp-result-grid">'+sc_field('Serial Number',d.sn)+sc_field('Model',d.model||d.itemName)+sc_field('Location',d.location)+sc_field('Borrower',d.borrower||'-')+sc_field('Due Date',fmtDate(d.expectedReturn||d.expectedReturnDate))+sc_field('Action Required',d.actionRequired||d.recheckNote||'-')+'</div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="sp-btn calpm" '+(canReady?'':'disabled')+' onclick="sc_readyPrompt(\''+esc(d.idCode)+'\')"><i class="fas fa-check-double"></i> CF CAL/PM → พร้อมส่ง</button><button class="sp-btn primary" '+(canOut?'':'disabled')+' onclick="sc_checkoutPrompt(\''+esc(d.idCode)+'\',\''+esc(d.brand||'')+'\',\''+esc(d.model||'')+'\',\''+esc(d.sn||'')+'\')"><i class="fas fa-sign-out-alt"></i> Check-Out เช่ายืม</button><button class="sp-btn success" '+(canIn?'':'')+' onclick="sc_record(\''+esc(d.idCode)+'\',\'CHECK-IN\')"><i class="fas fa-sign-in-alt"></i> Check-In รับคืน</button><button class="sp-btn ghost" onclick="sc_doCurrentMode(\''+esc(d.idCode)+'\',\''+esc(d.brand||'')+'\',\''+esc(d.model||'')+'\',\''+esc(d.sn||'')+'\')"><i class="fas fa-bolt"></i> ดำเนินการตามโหมด</button></div></div>';}).join(''));
  };
  window.sc_doCurrentMode=function(idCode,brand,model,sn){ if(SC.mode==='CHECK-OUT') return sc_checkoutPrompt(idCode,brand,model,sn); if(SC.mode==='CF_CAL_PM') return sc_readyPrompt(idCode); return sc_record(idCode,'CHECK-IN'); };
  window.sc_readyPrompt=function(idCode){ Swal.fire({title:'บันทึก CF CAL/PM ผ่าน?',html:'<div class="sp-status-flow"><span>รอสอบเทียบ</span><i class="fas fa-arrow-right"></i><span>พร้อมส่ง</span></div><input id="swNote" class="swal2-input" placeholder="หมายเหตุ" value="CF CAL/PM completed">',icon:'question',showCancelButton:true,confirmButtonText:'อัปเดตพร้อมส่ง'}).then(function(r){ if(!r.isConfirmed)return; sc_record(idCode,'CF_CAL_PM',{note:val('swNote','CF CAL/PM completed'),location:'Warehouse'}); }); };
  window.sc_record=function(idCode,action,payload){ payload=payload||{}; var p=Object.assign({action:action,idCode:idCode},payload); google.script.run.withSuccessHandler(function(res){ if(res&&res.success){ stockFinalClearLocalCache(); Swal.fire('สำเร็จ',res.message,'success'); sc_lookup(); sc_loadLogs(); if(typeof initStockInventoryModule==='function')initStockInventoryModule(true); if(typeof initStockDashboardModule==='function')initStockDashboardModule(true); } else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error'); }).withFailureHandler(function(err){Swal.fire('Error',err.message||String(err),'error');}).sc_recordCheckAction(p); };
  var oldCheckoutPrompt = window.sc_checkoutPrompt;
  window.sc_checkoutPrompt=function(idCode,brand,model,sn){ Swal.fire({title:'Check-Out / เช่ายืม',html:'<input id="swBorrower" class="swal2-input" placeholder="ผู้ยืม / Borrower"><input id="swLocation" class="swal2-input" placeholder="สถานที่ / Location"><input id="swDue" class="swal2-input" type="date"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">',showCancelButton:true,confirmButtonText:'ยืนยัน Check-Out',preConfirm:function(){return {borrower:document.getElementById('swBorrower').value,location:document.getElementById('swLocation').value,expectedReturnDate:document.getElementById('swDue').value,note:document.getElementById('swNote').value};}}).then(function(r){ if(!r.isConfirmed)return; var v=r.value; if(!v.borrower||!v.location||!v.expectedReturnDate){Swal.fire('ข้อมูลไม่ครบ','','warning');return;} sc_record(idCode,'CHECK-OUT',Object.assign(v,{brand:brand,model:model,serialNumber:sn})); }); };
})();
