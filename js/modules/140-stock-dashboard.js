/* ============================================================
   CES Stock Pro V3 — Stock_Dashboard_java.html
============================================================ */
let SD_DASH = { loaded:false, raw:null, statusChart:null, rentalChart:null };


function spEnsureStyle(){
  if(document.getElementById('stockpro-style-v3')) return;
  const style=document.createElement('style');
  style.id='stockpro-style-v3';
  style.textContent=`
    .stockpro-page{font-family:Inter,Arial,'Prompt',sans-serif;color:#1e293b;}
    .stockpro-shell{max-width:1280px;margin:0 auto;padding:0 0 24px;}
    .stockpro-header-card{background:#fff;border:1px solid #e8eef6;border-radius:22px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 10px 28px rgba(30,58,138,.06);margin-bottom:18px;}
    .stockpro-title-wrap{display:flex;align-items:center;gap:14px;}
    .stockpro-title-wrap h1{font-size:24px;font-weight:900;margin:0;color:#0f172a;letter-spacing:-.02em;}
    .stockpro-title-wrap p{font-size:11px;text-transform:uppercase;letter-spacing:.35em;color:#64748b;font-weight:800;margin:4px 0 0;}
    .stockpro-icon{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 10px 20px rgba(15,23,42,.08);}
    .stockpro-icon.emerald{background:#047857}.stockpro-icon.blue{background:#1d4ed8}.stockpro-icon.orange{background:#ea580c}
    .stockpro-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .sp-btn{border:0;border-radius:12px;padding:10px 16px;font-weight:900;font-size:13px;cursor:pointer;transition:.18s;display:inline-flex;gap:8px;align-items:center;justify-content:center;}
    .sp-btn:hover{transform:translateY(-1px)}
    .sp-btn.dark{background:#0f172a;color:#fff}.sp-btn.primary{background:#2563eb;color:#fff}.sp-btn.success{background:#059669;color:#fff}.sp-btn.danger{background:#dc2626;color:#fff}
    .sp-btn.warn{background:#d97706;color:#fff}.sp-btn.ghost{background:#fff;color:#0f172a;border:1px solid #dbe3ef}.sp-btn.soft{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
    .stockpro-model-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:14px;}
    .sp-model-card{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:16px;text-align:center;box-shadow:0 4px 16px rgba(30,58,138,.05);}
    .sp-model-icon{width:34px;height:34px;border-radius:12px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;}
    .sp-model-brand{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase}.sp-model-label{font-size:12px;font-weight:700;color:#475569}
    .sp-model-num{font-size:28px;font-weight:1000;line-height:1;margin-top:4px}.sp-model-sub{font-size:11px;font-weight:900;margin-top:4px}.sp-model-over{font-size:10px;font-weight:900;color:#ef4444}
    .stockpro-filter-card{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:12px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;box-shadow:0 4px 16px rgba(30,58,138,.05);}
    .sp-search{position:relative}.sp-search i{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;color:#94a3b8}
    .stockpro-filter-card input,.stockpro-filter-card select,.stockpro-control{width:100%;border:1px solid #dbe3ef;border-radius:12px;background:#f8fbff;padding:10px 12px;font-size:13px;outline:none;color:#334155;}
    .stockpro-filter-card input{padding-left:36px}.stockpro-filter-card input:focus,.stockpro-filter-card select:focus,.stockpro-control:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
    .stockpro-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;}
    .sp-kpi{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:18px;text-align:center;box-shadow:0 4px 16px rgba(30,58,138,.05);}
    .sp-kpi .ico{width:34px;height:34px;border-radius:12px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center}.sp-kpi .label{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}.sp-kpi .val{font-size:28px;font-weight:1000;line-height:1.1}
    .stockpro-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
    .stockpro-card{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:16px;box-shadow:0 4px 16px rgba(30,58,138,.05);overflow:hidden;}
    .stockpro-card h3{font-size:15px;font-weight:900;color:#0f172a;margin:0 0 12px;display:flex;align-items:center;gap:8px}
    .stockpro-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.stockpro-card-head h3{margin:0}
    .stockpro-chart-box{height:260px;position:relative}.stockpro-chart-box canvas{max-height:100%}
    .sp-table-wrap{overflow:auto;border:1px solid #edf2f7;border-radius:14px;max-height:560px}
    .sp-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;white-space:nowrap}
    .sp-table th{position:sticky;top:0;background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:11px;font-weight:1000;padding:12px;border-bottom:1px solid #e5e7eb;z-index:1}
    .sp-table td{padding:12px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top}.sp-table tbody tr:hover td{background:#f8fbff}
    .sp-id{font-weight:1000;color:#0f172a}.sp-sub{display:block;font-size:10px;color:#64748b;margin-top:2px}.sp-muted{color:#94a3b8;font-size:12px}
    .sp-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:1000}
    .sp-badge.Stock{background:#d1fae5;color:#065f46}.sp-badge.In-Use{background:#fef3c7;color:#92400e}.sp-badge.Overdue{background:#ef4444;color:#fff}.sp-badge.Missing{background:#fef9c3;color:#854d0e}.sp-badge.Broken{background:#e2e8f0;color:#475569}.sp-badge.Recheck{background:#ede9fe;color:#6d28d9}
    .sp-pill{background:#f1f5f9;color:#475569;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}
    .sp-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0 0;flex-wrap:wrap}
    .sp-page-buttons{display:flex;gap:6px;align-items:center}.sp-page-buttons button{border:1px solid #dbe3ef;background:#fff;color:#334155;border-radius:10px;padding:7px 11px;font-weight:900;cursor:pointer}.sp-page-buttons button.active{background:#2563eb;color:#fff;border-color:#2563eb}.sp-page-buttons button:disabled{opacity:.45;cursor:not-allowed}
    .sp-tabs{display:flex;gap:8px;margin-bottom:12px}.sp-tab{border:1px solid #dbe3ef;background:#f1f5f9;color:#475569;border-radius:12px;padding:9px 16px;font-size:13px;font-weight:900;cursor:pointer}.sp-tab.active{background:#2563eb;color:#fff;border-color:#2563eb}
    .stockpro-hero{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:18px;box-shadow:0 4px 16px rgba(30,58,138,.05);margin-bottom:16px}
    .sp-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sp-mode{padding:18px;border:1px solid #dbe3ef;background:#f8fafc;border-radius:14px;text-align:center;font-weight:900;cursor:pointer}.sp-mode.active.in{background:#059669;color:#fff}.sp-mode.active.out{background:#dc2626;color:#fff}
    .sp-scan-box{max-width:560px;margin:0 auto;text-align:center}.sp-scan-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.sp-big-btn{width:100%;padding:15px;border-radius:14px;border:0;background:#2563eb;color:#fff;font-weight:1000;cursor:pointer}
    .sp-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.sp-field{background:#f8fafc;border:1px solid #edf2f7;border-radius:12px;padding:10px}.sp-field .k{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900}.sp-field .v{font-size:13px;color:#0f172a;font-weight:800;margin-top:2px}
    .sp-action-group{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.sp-icon-btn{width:34px;height:34px;border-radius:10px;border:1px solid #dbeafe;background:#eff6ff;color:#2563eb;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-weight:900}.sp-icon-btn.green{background:#ecfdf5;border-color:#a7f3d0;color:#059669}.sp-icon-btn.red{background:#fef2f2;border-color:#fecaca;color:#dc2626}.sp-icon-btn.gray{background:#f8fafc;border-color:#e2e8f0;color:#475569}.sp-icon-btn.orange{background:#fff7ed;border-color:#fed7aa;color:#ea580c}.sp-icon-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(30,58,138,.12)}
    .sp-acc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.sp-acc-card{background:#fff;border:1px solid #e8eef6;border-radius:18px;padding:16px;box-shadow:0 4px 16px rgba(30,58,138,.05);transition:.18s}.sp-acc-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(30,58,138,.10)}.sp-acc-icon{width:42px;height:42px;border-radius:14px;background:#d1fae5;color:#059669;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.sp-acc-name{font-weight:1000;color:#0f172a}.sp-acc-meta{font-size:11px;color:#64748b;margin-top:2px}.sp-acc-qty{font-size:28px;font-weight:1000;color:#059669;line-height:1.1}.sp-acc-controls{display:grid;grid-template-columns:74px 1fr;gap:8px;margin-top:12px}.sp-acc-controls input{border:1px solid #dbe3ef;border-radius:10px;padding:8px;font-weight:900;text-align:center}.sp-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;background:#f1f5f9;color:#475569}.sp-chip.low{background:#ffedd5;color:#c2410c}.sp-chip.ok{background:#dcfce7;color:#166534}
    @media(max-width:1100px){.stockpro-kpi-grid{grid-template-columns:repeat(2,1fr)}.stockpro-two-col,.stockpro-model-grid{grid-template-columns:1fr}.stockpro-filter-card{grid-template-columns:1fr}.stockpro-header-card{align-items:flex-start;flex-direction:column}.stockpro-actions{width:100%}.stockpro-actions .sp-btn{flex:1}.sp-result-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}
function spEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function spVal(id, fallback=''){const el=document.getElementById(id);return el&&typeof el.value!=='undefined'?String(el.value):fallback;}
function spSetHtml(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
function spNum(n){return Number(n||0).toLocaleString('en-US');}
function spBadge(st){const s=String(st||'Stock'); const safe=s.replace(/\s/g,'-'); return `<span class="sp-badge ${safe}">${spEsc(s)}</span>`;}
function spFmtDate(v){if(!v)return '-';try{return new Date(v).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return '-';}}
function spDownloadJsonAsExcel(rows, name){
  if(typeof XLSX==='undefined'){Swal.fire('Export Error','XLSX library not loaded','error');return;}
  const ws=XLSX.utils.json_to_sheet(rows||[]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data'); XLSX.writeFile(wb,name||'export.xlsx');
}



function initStockDashboardModule(force=false){
  spEnsureStyle();
  if (typeof sd_v17Style === 'function') sd_v17Style();

  const cacheKey = 'CES_STOCK_DASHBOARD_CACHE_V17';
  const cacheTtlMs = 5 * 60 * 1000;

  function renderFromPayload(res, fromCache){
    if(!res || !res.success){
      Swal.fire('Stock Dashboard Error', (res&&res.message)||'Cannot load dashboard', 'error');
      return;
    }
    SD_DASH.loaded=true;
    SD_DASH.raw=res;
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ts:Date.now(), data:res})); } catch(e) {}
    sd_fillFilters();
    sd_renderAll();
    if(!fromCache) Swal.close();
  }

  if(!force){
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if(cached && cached.data && (Date.now() - Number(cached.ts||0) < cacheTtlMs)){
        renderFromPayload(cached.data, true);
        return;
      }
    } catch(e) {}
  }

  Swal.fire({
    title:'Loading page...',
    html:'<div style="font-size:12px;color:#64748b">Preparing Stock Dashboard</div>',
    allowOutsideClick:false,
    showConfirmButton:false,
    didOpen:()=>Swal.showLoading()
  });

  spSetHtml('sdKpiGrid', '<div class="sp-muted">Loading page...</div>');
  google.script.run
    .withSuccessHandler(res=>renderFromPayload(res,false))
    .withFailureHandler(err=>{Swal.close();Swal.fire('Stock Dashboard Error', err.message||String(err), 'error');})
    .sd_getStockDashboardData(force===true);
}
function sd_fillFilters(){
  const f=SD_DASH.raw.filters||{};
  sd_fillSelect('sdBrand',f.brands,'แบรนด์ทั้งหมด');
  sd_fillSelect('sdModel',f.models,'โมเดลทั้งหมด');
  sd_fillSelect('sdStatus',f.statuses,'สถานะทั้งหมด');
}
function sd_fillSelect(id,arr,label){
  const el=document.getElementById(id); if(!el)return;
  const cur=el.value||'all';
  el.innerHTML=`<option value="all">${label}</option>`+(arr||[]).map(x=>`<option value="${spEsc(x)}">${spEsc(x)}</option>`).join('');
  el.value=(arr||[]).includes(cur)?cur:'all';
}
function sd_getFilteredDevices(){
  const raw=SD_DASH.raw||{};
  const q=spVal('sdSearch','').toLowerCase(), b=spVal('sdBrand','all'), m=spVal('sdModel','all'), s=spVal('sdStatus','all');
  return (raw.inventory||raw.devices||[]).filter(d=>{
    const text=[d.idCode,d.sn,d.serialNumber,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired,d.recheckNote].join(' ').toLowerCase();
    if(q&&!text.includes(q))return false;
    if(b!=='all'&&d.brand!==b)return false;
    if(m!=='all'&&d.model!==m)return false;
    if(s!=='all'&&d.status!==s)return false;
    return true;
  });
}
function sd_renderAll(){sd_renderModelCards();sd_renderKpis(SD_DASH.raw.kpi||{});sd_renderCharts();sd_renderFiltered();}
function sd_renderFiltered(){sd_renderSummaryTables();sd_renderContractSummary();sd_renderAlerts();}
function sd_renderModelCards(){
  const rows=SD_DASH.raw.modelCards||[];
  spSetHtml('sdModelCards', rows.map(x=>`<div class="sp-model-card"><div class="sp-model-icon" style="background:${x.bg}"><i class="fas fa-microchip" style="color:${x.color}"></i></div><div class="sp-model-brand">${spEsc(x.brand)}</div><div class="sp-model-label">${spEsc(x.label)}</div><div class="sp-model-num" style="color:${x.color}">${spNum(x.total)}</div><div class="sp-model-sub" style="color:#f59e0b">In-Use: ${spNum(x.inUse)}</div><div class="sp-model-over">Overdue: ${spNum(x.overdue)}</div></div>`).join(''));
}
function sd_renderKpis(k){
  const items=[['ทั้งหมด',k.total,'fa-boxes','#2563eb','#dbeafe'],['อยู่ในคลัง',k.stock,'fa-warehouse','#059669','#d1fae5'],['ถูกยืม',k.inUse,'fa-arrow-right-from-bracket','#d97706','#fef3c7'],['OVERDUE',k.overdue,'fa-clock','#dc2626','#fee2e2'],['Missing',k.missing,'fa-question-circle','#854d0e','#fef9c3'],['Broken',k.broken,'fa-tools','#64748b','#e2e8f0'],['Recheck',k.recheck,'fa-triangle-exclamation','#7c3aed','#ede9fe'],['Rental Rows',k.rentalRows,'fa-file-contract','#0ea5e9','#e0f2fe']];
  spSetHtml('sdKpiGrid',items.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join(''));
}
function sd_renderCharts(){
  if(typeof Chart==='undefined')return;
  const filtered=sd_getFilteredDevices();
  const byStatus={}; filtered.forEach(d=>byStatus[d.status||'Unknown']=(byStatus[d.status||'Unknown']||0)+1);
  const statusRows=Object.keys(byStatus).map(k=>({name:k,count:byStatus[k]}));
  const statusCtx=document.getElementById('sdStatusChart'), rentalCtx=document.getElementById('sdRentalChart');
  if(statusCtx){if(SD_DASH.statusChart)SD_DASH.statusChart.destroy();SD_DASH.statusChart=new Chart(statusCtx,{type:'doughnut',data:{labels:statusRows.map(x=>x.name),datasets:[{data:statusRows.map(x=>x.count)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});}
  if(rentalCtx){if(SD_DASH.rentalChart)SD_DASH.rentalChart.destroy();const rm=SD_DASH.raw.rentalMonth||{labels:[],datasets:[]};SD_DASH.rentalChart=new Chart(rentalCtx,{type:'bar',data:{labels:rm.labels,datasets:rm.datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}});}
}
function sd_countBy(rows,key){const m={};rows.forEach(x=>{const k=x[key]||'Unknown';m[k]=(m[k]||0)+1});return Object.keys(m).sort().map(k=>({name:k,count:m[k]}));}
function sd_renderSummaryTables(){
  const rows=sd_getFilteredDevices();
  const summary=[...sd_countBy(rows,'brand').map(x=>({type:'Brand',name:x.name,count:x.count})),...sd_countBy(rows,'model').slice(0,25).map(x=>({type:'Model',name:x.name,count:x.count})),...sd_countBy(rows,'status').map(x=>({type:'Status',name:x.name,count:x.count}))];
  spSetHtml('sdSummaryTable',sd_table(summary,[['type','Type'],['name','Name'],['count','Count']]));
  spSetHtml('sdLocationTable',sd_table(sd_countBy(rows,'location').slice(0,50),[['name','Location'],['count','Count']]));
  sd_renderCharts();
}
function sd_buildContractRows(){
  const rows=sd_getFilteredDevices().filter(d=>['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0);
  const map={};
  rows.forEach(d=>{const loc=d.location||'Unknown'; if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0}; const x=map[loc];x.total++; if(d.status==='Overdue'||Number(d.overdueDays||0)>0)x.overdue++;else x.inUse++;x.ids.push(d.idCode);const model=d.model||d.itemName||'Unknown';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate;if(!x.expectedReturn&&d.expectedReturn)x.expectedReturn=d.expectedReturn;x.maxOverdue=Math.max(x.maxOverdue,Number(d.overdueDays||0));});
  return Object.values(map).map(x=>{x.modelList=Object.keys(x.modelMap).map(m=>`${m} ×${x.modelMap[m]}`).join(', ');return x;}).sort((a,b)=>b.overdue-a.overdue||b.total-a.total);
}
function sd_renderContractSummary(){
  const rows=sd_buildContractRows();
  spSetHtml('sdContractCount',`${rows.length} locations`);
  if(!rows.length){spSetHtml('sdContractTable','<div class="sp-muted">No active rental contract</div>');return;}
  spSetHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>In-use / Overdue</th><th>Borrow Date</th><th>Expected Return</th><th>Action</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><span class="sp-id">${spEsc(r.location)}</span><span class="sp-sub">${spEsc(r.modelList)}</span></td><td>${spNum(r.total)}</td><td><span class="sp-chip ok">In-Use ${spNum(r.inUse)}</span> <span class="sp-chip low">Overdue ${spNum(r.overdue)}</span></td><td>${spFmtDate(r.borrowDate)}</td><td>${spFmtDate(r.expectedReturn)}${r.maxOverdue?`<span class="sp-sub" style="color:#dc2626">เลย ${r.maxOverdue} วัน</span>`:''}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="รายละเอียด" onclick='sd_showLocationDetail(${JSON.stringify(r.location)})'><i class="fas fa-magnifying-glass-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='sd_extendLocation(${JSON.stringify(r.location)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='sd_returnLocation(${JSON.stringify(r.location)})'><i class="fas fa-undo"></i></button></div></td></tr>`).join('')}</tbody></table></div>`);
}
function sd_showLocationDetail(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  Swal.fire({title:'รายละเอียด: '+location,width:900,html:sd_table(rows,[['idCode','ID'],['sn','SN'],['brand','Brand'],['model','Model'],['status','Status'],['borrower','Borrower'],['expectedReturn','Due']]),confirmButtonText:'Close'});
}
function sd_extendLocation(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  Swal.fire({title:'ต่อสัญญา: '+location,html:`<input id="swDue" class="swal2-input" type="date"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}sd_bulkExtend(rows.map(x=>x.idCode),due,spVal('swNote',''));});
}
function sd_returnLocation(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  Swal.fire({title:'รับคืนทั้งหมด?',text:`${location} / ${rows.length} รายการ`,icon:'question',showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{if(!r.isConfirmed)return;sd_bulkReturn(rows.map(x=>x.idCode));});
}
function sd_bulkExtend(ids,due,note){
  Swal.fire({title:'กำลังต่อสัญญา...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close(); if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');initStockDashboardModule(true); if(typeof initStockInventoryModule==='function')initStockInventoryModule(true);}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_bulkExtendRental({ids:ids,expectedReturnDate:due,note:note});
}
function sd_bulkReturn(ids){
  Swal.fire({title:'กำลังรับคืน...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close(); if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');initStockDashboardModule(true); if(typeof initStockInventoryModule==='function')initStockInventoryModule(true);}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_bulkReturnEquipment({ids:ids});
}
function sd_renderAlerts(){
  const rows=sd_getFilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired).slice(0,150);
  spSetHtml('sdAlertCount',`${rows.length} alerts`);
  spSetHtml('sdAlertTable',sd_table(rows,[['idCode','ID / Code'],['serialNumber','SN'],['brand','Brand'],['model','Model'],['location','Location'],['status','Status'],['actionRequired','Action']]));
}
function sd_table(rows,cols){
  if(!rows||!rows.length)return '<div class="sp-muted">No data</div>';
  return `<div class="sp-table-wrap"><table class="sp-table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0]==='status'?spBadge(r[c[0]]):spEsc(r[c[0]]||'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function sd_exportSummary(){
  const rows=sd_getFilteredDevices();
  const summary=[...sd_countBy(rows,'brand').map(x=>({type:'Brand',name:x.name,count:x.count})),...sd_countBy(rows,'model').map(x=>({type:'Model',name:x.name,count:x.count})),...sd_countBy(rows,'status').map(x=>({type:'Status',name:x.name,count:x.count})),...sd_countBy(rows,'location').map(x=>({type:'Location',name:x.name,count:x.count}))];
  spDownloadJsonAsExcel(summary,'CES_Stock_Summary.xlsx');
}


/* ============================================================
   CES Stock Pro V8 — ADDITIVE FRONTEND PATCH FROM V6 BASE
   Keeps all V6 functions, overrides dashboard render/action functions only.
============================================================ */
function spEnsureStyleV8(){
  if(document.getElementById('stockpro-style-v8'))return;
  const style=document.createElement('style');
  style.id='stockpro-style-v8';
  style.textContent=`
    .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important}
    .sp-mini-badge{background:#fff;color:#b45309;border-radius:999px;padding:2px 7px;margin-left:4px;font-size:10px;font-weight:1000}
    .sp-model-card.byond-sunfusion{border-color:#bfdbfe;background:linear-gradient(180deg,#ffffff,#eff6ff)}
    .sp-model-card.bbraun-infusomat{border-color:#bbf7d0;background:linear-gradient(180deg,#ffffff,#f0fdf4)}
    .sp-model-card.bbraun-spaceplus{border-color:#fde68a;background:linear-gradient(180deg,#ffffff,#fffbeb)}
    .sp-detail-list{display:grid;gap:10px;text-align:left;max-height:62vh;overflow:auto;padding-right:4px}
    .sp-detail-item{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;border:1px solid #e8eef6;background:#f8fbff;border-radius:14px;padding:10px 12px}
    .sp-detail-icon{width:38px;height:38px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center}
    .sp-detail-title{font-weight:1000;color:#0f172a}.sp-detail-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-detail-actions{display:flex;gap:6px;align-items:center}
    .sp-alert-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;max-height:66vh;overflow:auto;text-align:left}.sp-alert-card{border:1px solid #e8eef6;background:#fff;border-radius:14px;padding:12px;box-shadow:0 3px 12px rgba(30,58,138,.06)}
    .sp-contract-title{display:flex;align-items:center;gap:8px}.sp-contract-title .dot{width:10px;height:10px;border-radius:99px;background:#2563eb}.sp-contract-title.overdue .dot{background:#dc2626}
    @media(max-width:780px){.sp-detail-item{grid-template-columns:36px 1fr}.sp-detail-actions{grid-column:1/-1;justify-content:flex-start}.swal2-popup{width:96vw!important}.sp-alert-grid{grid-template-columns:1fr}.stockpro-chart-box{height:220px}}
  `;
  document.head.appendChild(style);
}
function sd_filteredModelCards_(rows){
  const configs=[
    {brand:'B.BRAUN',keyword:'INFUSOMAT',label:'Infusomat Space',color:'#059669',bg:'#dcfce7',accent:'bbraun-infusomat'},
    {brand:'B.BRAUN',keyword:'SPACEPLUS',label:'Spaceplus',color:'#d97706',bg:'#fef3c7',accent:'bbraun-spaceplus'},
    {brand:'BYOND',keyword:'SUNFUSION',label:'Sunfusion',color:'#2563eb',bg:'#dbeafe',accent:'byond-sunfusion'}
  ];
  return configs.map(cfg=>{const matched=(rows||[]).filter(d=>String(d.brand||'').toUpperCase().includes(cfg.brand)&&[d.model,d.itemName,d.item_name].join(' ').toUpperCase().includes(cfg.keyword));return Object.assign({},cfg,{total:matched.length,stock:matched.filter(d=>d.status==='Stock').length,inUse:matched.filter(d=>d.status==='In-Use').length,overdue:matched.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length});});
}
function sd_filteredKpi_(rows){rows=rows||[];return {total:rows.length,stock:rows.filter(d=>d.status==='Stock').length,inUse:rows.filter(d=>d.status==='In-Use').length,overdue:rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length,missing:rows.filter(d=>d.status==='Missing').length,broken:rows.filter(d=>d.status==='Broken').length,recheck:rows.filter(d=>d.status==='Recheck').length,rentalRows:(SD_DASH.raw&&SD_DASH.raw.rentals?SD_DASH.raw.rentals.length:0)};}
function sd_renderAll(){spEnsureStyleV8();sd_renderFiltered();}
function sd_renderFiltered(){spEnsureStyleV8();const rows=sd_getFilteredDevices();sd_renderModelCards(rows);sd_renderKpis(sd_filteredKpi_(rows));sd_renderSummaryTables();sd_renderContractSummary();sd_renderAlerts();}
function sd_renderModelCards(filteredRows){
  const rows=sd_filteredModelCards_(filteredRows||sd_getFilteredDevices());
  spSetHtml('sdModelCards',rows.map(x=>`<div class="sp-model-card ${spEsc(x.accent)}"><div class="sp-model-icon" style="background:${x.bg}"><i class="fas fa-microchip" style="color:${x.color}"></i></div><div class="sp-model-brand">${spEsc(x.brand)}</div><div class="sp-model-label">${spEsc(x.label)}</div><div class="sp-model-num" style="color:${x.color}">${spNum(x.total)}</div><div class="sp-model-sub" style="color:#059669">Stock: ${spNum(x.stock||0)}</div><div class="sp-model-sub" style="color:#f59e0b">In-Use: ${spNum(x.inUse)}</div><div class="sp-model-over">Overdue: ${spNum(x.overdue)}</div></div>`).join(''));
}
function sd_renderKpis(k){
  const items=[['ทั้งหมด',k.total,'fa-boxes','#2563eb','#dbeafe'],['อยู่ในคลัง',k.stock,'fa-warehouse','#059669','#dcfce7'],['ถูกยืม',k.inUse,'fa-arrow-right-from-bracket','#d97706','#fef3c7'],['OVERDUE',k.overdue,'fa-clock','#dc2626','#fee2e2'],['Missing',k.missing,'fa-question-circle','#854d0e','#fef9c3'],['Broken',k.broken,'fa-tools','#64748b','#e2e8f0'],['Recheck',k.recheck,'fa-triangle-exclamation','#7c3aed','#ede9fe'],['Rental Rows',k.rentalRows,'fa-file-contract','#0ea5e9','#e0f2fe']];
  spSetHtml('sdKpiGrid',items.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join(''));
}
function sd_renderAlerts(){
  const rows=sd_getFilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired).slice(0,150);
  spSetHtml('sdAlertCount',`${rows.length} alerts`);spSetHtml('sdAlertHeaderCount',rows.length);
  spSetHtml('sdAlertTable',rows.length?`<div class="sp-muted">กดปุ่ม Alerts ด้านบนเพื่อดูรายละเอียด ${rows.length} รายการ</div>`:'<div class="sp-muted">No alert</div>');
}
function sd_openAlertPopup(){
  spEnsureStyleV8();
  const rows=sd_getFilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired).slice(0,300);
  const html=rows.length?`<div class="sp-alert-grid">${rows.map(d=>`<div class="sp-alert-card"><div class="sp-detail-title">${spEsc(d.idCode)} ${spBadge(d.status)}</div><div class="sp-detail-sub">SN: ${spEsc(d.sn||d.serialNumber||'-')} • ${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'')}</div><div style="margin-top:8px"><b>Location:</b> ${spEsc(d.location||'-')}<br><b>Due:</b> ${spFmtDate(d.expectedReturn||d.expectedReturnDate)}<br><b>Action:</b> ${spEsc(d.actionRequired||d.recheckNote||'-')}</div></div>`).join('')}</div>`:'<div class="sp-muted">No alert</div>';
  Swal.fire({title:`Stock Alerts (${rows.length})`,width:980,html,confirmButtonText:'Close',customClass:{popup:'font-prompt'}});
}
function sd_renderContractSummary(){
  spEnsureStyleV8();
  const rows=sd_buildContractRows();
  spSetHtml('sdContractCount',`${rows.length} locations`);
  if(!rows.length){spSetHtml('sdContractTable','<div class="sp-muted">No active rental contract</div>');return;}
  spSetHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>In-use / Overdue</th><th>Borrow Date</th><th>Expected Return</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="sp-contract-title ${r.overdue?'overdue':''}"><span class="dot"></span><span class="sp-id">${spEsc(r.location)}</span></div><span class="sp-sub">${spEsc(r.modelList)}</span></td><td>${spNum(r.total)}</td><td><span class="sp-chip ok">In-Use ${spNum(r.inUse)}</span> <span class="sp-chip low">Overdue ${spNum(r.overdue)}</span></td><td>${spFmtDate(r.borrowDate)}</td><td>${spFmtDate(r.expectedReturn)}${r.maxOverdue?`<span class="sp-sub" style="color:#dc2626">เลย ${r.maxOverdue} วัน</span>`:''}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="รายละเอียด" onclick='sd_showLocationDetail(${JSON.stringify(r.location)})'><i class="fas fa-magnifying-glass-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='sd_extendLocation(${JSON.stringify(r.location)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='sd_returnLocation(${JSON.stringify(r.location)})'><i class="fas fa-undo"></i></button></div></td></tr>`).join('')}</tbody></table></div>`);
}
function sd_showLocationDetail(location){
  spEnsureStyleV8();
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  const html=rows.length?`<div class="sp-detail-list">${rows.map(d=>`<div class="sp-detail-item"><div class="sp-detail-icon"><i class="fas fa-microchip"></i></div><div><div class="sp-detail-title">${spEsc(d.idCode)} ${spBadge(d.status)}</div><div class="sp-detail-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'')} • SN:${spEsc(d.sn||'-')} • Borrower:${spEsc(d.borrower||'-')} • Due:${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</div></div><div class="sp-detail-actions"><button class="sp-icon-btn orange" onclick='si_extendPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" onclick='si_returnPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-undo"></i></button></div></div>`).join('')}</div>`:'<div class="sp-muted">No equipment</div>';
  Swal.fire({title:'รายละเอียด: '+location,width:980,html,confirmButtonText:'Close',customClass:{popup:'font-prompt'}});
}
function sd_extendLocation(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  const current=(rows.find(x=>x.expectedReturn||x.expectedReturnDate)||{}).expectedReturn || (rows.find(x=>x.expectedReturnDate)||{}).expectedReturnDate || '';
  Swal.fire({title:'ต่อสัญญา: '+location,html:`<label class="lbl">วันคืนเดิม</label><input class="swal2-input" value="${spEsc(current||'-')}" disabled><label class="lbl">วันคืนใหม่</label><input id="swDue" class="swal2-input" type="date" value="${spEsc(current)}"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}sd_bulkExtend(rows.map(x=>x.idCode),due,spVal('swNote',''));});
}
function sd_returnLocation(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  Swal.fire({title:'รับคืนทั้งหมด?',html:`<b>${spEsc(location)}</b><br>${rows.length} รายการ`,icon:'question',showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{if(!r.isConfirmed)return;sd_bulkReturn(rows.map(x=>x.idCode));});
}


/* ============================================================
   CES Stock Pro V11 — V8 ORIGINAL ADDITIVE PATCH
   Keeps V8 functions and overrides only final dashboard render/action layer.
============================================================ */
function sd_v11IsWarehouseLocation(loc){
  const s=String(loc||'').trim().toUpperCase();
  return s==='WAREHOUSE'||s==='STORE'||s==='STOCK ROOM'||s==='STOCKROOM'||s.includes('WAREHOUSE')||s.includes('คลัง')||s.includes('สโตร์');
}
function sd_v11NormalizeDevice(d){
  d=Object.assign({},d||{});
  if(sd_v11IsWarehouseLocation(d.location)){
    d.location='Warehouse';d.status='Stock';d.finalStatus='Stock';d.rentalStatus='STOCK';
    d.borrower='-';d.borrowDate='';d.expectedReturn='';d.expectedReturnDate='';d.dueDate='';d.overdueDays=0;d.daysRemaining='';
  }
  return d;
}
function sd_v11FilteredDevices(){
  const base=(typeof sd_getFilteredDevices==='function'?sd_getFilteredDevices():(SD_DASH.raw&&SD_DASH.raw.inventory)||[]);
  return (base||[]).map(sd_v11NormalizeDevice);
}
function sd_v11FilteredKpi(rows){
  rows=rows||[];
  return {total:rows.length,stock:rows.filter(d=>d.status==='Stock').length,inUse:rows.filter(d=>d.status==='In-Use').length,overdue:rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length,missing:rows.filter(d=>d.status==='Missing').length,broken:rows.filter(d=>d.status==='Broken').length,recheck:rows.filter(d=>d.status==='Recheck').length,rentalRows:(SD_DASH.raw&&SD_DASH.raw.rentals?SD_DASH.raw.rentals.length:0)};
}
function sd_v11ApplyStyle(){
  if(document.getElementById('stockpro-style-v11'))return;
  const style=document.createElement('style');style.id='stockpro-style-v11';style.textContent=`
    .sp-compact-alert-list{display:grid;gap:8px;max-height:60vh;overflow:auto;text-align:left}.sp-alert-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;border:1px solid #e8eef6;border-radius:14px;background:#fff;padding:10px}.sp-alert-ico{width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center}.sp-alert-title{font-weight:1000;color:#0f172a;font-size:13px}.sp-alert-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-contract-row-overdue td{background:#fff1f2!important}.sp-contract-row-completed td{background:#eff6ff!important}.sp-contract-row-active td{background:#fff!important}.sp-contract-filter-card{position:relative;z-index:2}.sp-detail-list-v11{display:grid;gap:8px;max-height:62vh;overflow:auto;text-align:left}.sp-detail-item-v11{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;border:1px solid #e8eef6;border-radius:14px;background:#f8fbff;padding:10px}.sp-detail-icon-v11{width:36px;height:36px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center}.sp-model-card.byond{border-color:#bfdbfe;background:linear-gradient(180deg,#fff,#eff6ff)}.sp-model-card.infusomat{border-color:#bbf7d0;background:linear-gradient(180deg,#fff,#f0fdf4)}.sp-model-card.spaceplus{border-color:#fde68a;background:linear-gradient(180deg,#fff,#fffbeb)}
    @media(max-width:780px){.sp-contract-filter-card{grid-template-columns:1fr!important}.sp-alert-row{grid-template-columns:30px 1fr}.sp-alert-row .sp-btn{grid-column:1/-1}.sp-detail-item-v11{grid-template-columns:34px 1fr}.sp-detail-item-v11 .sp-action-group{grid-column:1/-1;justify-content:flex-start}}
  `;document.head.appendChild(style);
}
function sd_renderFiltered(){
  spEnsureStyle();sd_v11ApplyStyle();
  const rows=sd_v11FilteredDevices();
  sd_renderModelCards(rows);
  sd_renderKpis(sd_v11FilteredKpi(rows));
  sd_renderCharts(rows);
  sd_renderSummaryTables();
  sd_renderContractSummary();
  sd_renderAlerts();
}
function sd_renderAll(){sd_renderFiltered();}
function sd_renderModelCards(filteredRows){
  const rows=filteredRows||sd_v11FilteredDevices();
  const cards=sd_filteredModelCards_?sd_filteredModelCards_(rows):[];
  const html=cards.map(x=>{
    const key=String(x.label||'').toUpperCase();
    const cls=key.includes('SUNFUSION')?'byond':key.includes('INFUSOMAT')?'infusomat':'spaceplus';
    const color=key.includes('SUNFUSION')?'#2563eb':key.includes('INFUSOMAT')?'#059669':'#d97706';
    const bg=key.includes('SUNFUSION')?'#dbeafe':key.includes('INFUSOMAT')?'#dcfce7':'#fef3c7';
    return `<div class="sp-model-card ${cls}"><div class="sp-model-icon" style="background:${bg}"><i class="fas fa-microchip" style="color:${color}"></i></div><div class="sp-model-brand">${spEsc(x.brand)}</div><div class="sp-model-label">${spEsc(x.label)}</div><div class="sp-model-num" style="color:${color}">${spNum(x.total)}</div><div class="sp-model-sub" style="color:#d97706">In-Use: ${spNum(x.inUse)}</div><div class="sp-model-over">Overdue: ${spNum(x.overdue)}</div></div>`;
  }).join('');
  spSetHtml('sdModelCards',html);
}
function sd_renderCharts(filteredRows){
  const rows=filteredRows||sd_v11FilteredDevices();
  if(typeof Chart==='undefined')return;
  const byStatus=sd_countBy(rows,'status');
  const labels=byStatus.map(x=>x.name), data=byStatus.map(x=>x.count);
  const statusCanvas=document.getElementById('sdStatusChart');
  if(statusCanvas){ if(SD_DASH.statusChart)SD_DASH.statusChart.destroy(); SD_DASH.statusChart=new Chart(statusCanvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:labels.map(l=>({Stock:'#34d399','In-Use':'#fbbf24',Overdue:'#fb7185',Missing:'#fb923c',Broken:'#60a5fa',Recheck:'#a78bfa'}[l]||'#cbd5e1'))}]},options:{plugins:{legend:{position:'right'}},cutout:'60%',responsive:true,maintainAspectRatio:false}});}
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const byond=new Array(12).fill(0), bbraun=new Array(12).fill(0);
  (SD_DASH.raw&&SD_DASH.raw.rentals||[]).forEach(r=>{const d=new Date(r.borrowDate||r.borrow_date||r.expectedReturnDate||r.expected_return_date);if(isNaN(d))return;const m=d.getMonth();const brand=String(r.brand||'').toUpperCase();if(brand.includes('BYOND'))byond[m]++;else bbraun[m]++;});
  const rentCanvas=document.getElementById('sdRentalChart');
  if(rentCanvas){ if(SD_DASH.rentalChart)SD_DASH.rentalChart.destroy(); SD_DASH.rentalChart=new Chart(rentCanvas,{type:'bar',data:{labels:months,datasets:[{label:'BYOND',data:byond,backgroundColor:'#93c5fd'},{label:'B.Braun',data:bbraun,backgroundColor:'#86efac'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}});}
}
function sd_v11ResetContractFilter(){
  const f=document.getElementById('sdContractFilter'),s=document.getElementById('sdContractSort');
  if(f)f.value='all'; if(s)s.value='risk'; sd_renderContractSummary();
}
function sd_v11ContractRows(){
  const active=sd_v11FilteredDevices().filter(d=>['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0);
  const map={};
  active.forEach(d=>{const loc=d.location||'Unknown';if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,completed:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0,state:'active'};const x=map[loc];x.total++;if(d.status==='Overdue'||Number(d.overdueDays||0)>0){x.overdue++;x.state='overdue';}else x.inUse++;x.ids.push(d.idCode);const model=d.model||d.itemName||'Unknown';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate;if(!x.expectedReturn&&d.expectedReturn)x.expectedReturn=d.expectedReturn;x.maxOverdue=Math.max(x.maxOverdue,Number(d.overdueDays||0));});
  (SD_DASH.raw&&SD_DASH.raw.rentals||[]).forEach(r=>{const status=String(r.rentalStatus||r.rental_status||'').toUpperCase();const returned=!!(r.returnDate||r.return_date)||status==='RETURNED'||status==='COMPLETED'||status==='DONE';if(!returned)return;const loc=r.location||'Unknown';if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,completed:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0,state:'completed'};const x=map[loc];x.completed++;x.total++;x.state=x.state==='overdue'?'overdue':(x.inUse?'active':'completed');const model=r.model||'Returned';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&r.borrowDate)x.borrowDate=r.borrowDate;if(!x.expectedReturn&&(r.returnDate||r.expectedReturnDate))x.expectedReturn=r.returnDate||r.expectedReturnDate;});
  let rows=Object.values(map).map(x=>{x.modelList=Object.keys(x.modelMap).slice(0,6).map(m=>`${m} ×${x.modelMap[m]}`).join(', ');return x;});
  const filter=spVal('sdContractFilter','all');
  if(filter==='overdue')rows=rows.filter(x=>x.overdue>0||x.state==='overdue');
  if(filter==='active')rows=rows.filter(x=>x.inUse>0&&x.overdue===0);
  if(filter==='completed')rows=rows.filter(x=>x.completed>0&&x.inUse===0&&x.overdue===0);
  const sort=spVal('sdContractSort','risk');
  rows.sort((a,b)=>{if(sort==='location')return String(a.location).localeCompare(String(b.location));if(sort==='due_asc')return new Date(a.expectedReturn||'2999-12-31')-new Date(b.expectedReturn||'2999-12-31');if(sort==='due_desc')return new Date(b.expectedReturn||'1900-01-01')-new Date(a.expectedReturn||'1900-01-01');return (b.overdue-a.overdue)||(b.inUse-a.inUse)||(b.total-a.total);});
  return rows;
}
function sd_renderContractSummary(){
  const rows=sd_v11ContractRows();
  spSetHtml('sdContractCount',`${rows.length} locations`);
  if(!rows.length){spSetHtml('sdContractTable','<div class="sp-muted">No contract records</div>');return;}
  spSetHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>Status</th><th>Borrow Date</th><th>Expected / Return</th><th>Action</th></tr></thead><tbody>${rows.map(r=>{const cls=r.overdue?'sp-contract-row-overdue':(r.completed&&!r.inUse?'sp-contract-row-completed':'sp-contract-row-active');return `<tr class="${cls}"><td><span class="sp-id">${spEsc(r.location)}</span><span class="sp-sub">${spEsc(r.modelList)}</span></td><td>${spNum(r.total)}</td><td><span class="sp-chip ok">In-Use ${spNum(r.inUse)}</span> <span class="sp-chip low">Overdue ${spNum(r.overdue)}</span> <span class="sp-chip">Done ${spNum(r.completed)}</span></td><td>${spFmtDate(r.borrowDate)}</td><td>${spFmtDate(r.expectedReturn)}${r.maxOverdue?`<span class="sp-sub" style="color:#dc2626">เลย ${spNum(r.maxOverdue)} วัน</span>`:''}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="รายละเอียด" onclick='sd_showLocationDetail(${JSON.stringify(r.location)})'><i class="fas fa-magnifying-glass-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='sd_extendLocation(${JSON.stringify(r.location)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='sd_returnLocation(${JSON.stringify(r.location)})'><i class="fas fa-undo"></i></button></div></td></tr>`;}).join('')}</tbody></table></div>`);
}
function sd_showLocationDetail(location){
  const rows=sd_v11FilteredDevices().filter(d=>(d.location||'Unknown')===location);
  const html=`<div class="sp-detail-list-v11">${rows.map(d=>`<div class="sp-detail-item-v11"><div class="sp-detail-icon-v11"><i class="fas fa-microchip"></i></div><div><div class="sp-detail-title">${spEsc(d.idCode||'-')} ${spBadge(d.status)}</div><div class="sp-detail-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')}</div><div class="sp-detail-sub">Borrower: ${spEsc(d.borrower||'-')} • Due: ${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</div></div><div class="sp-action-group"><button class="sp-icon-btn orange" onclick='sd_bulkExtend([${JSON.stringify(d.idCode)}],"${spEsc(d.expectedReturn||'')}","")'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" onclick='sd_bulkReturn([${JSON.stringify(d.idCode)}])'><i class="fas fa-undo"></i></button></div></div>`).join('')}</div>`;
  Swal.fire({title:'รายละเอียด: '+location,width:900,html,confirmButtonText:'Close'});
}
function sd_extendLocation(location){
  const rows=sd_v11FilteredDevices().filter(d=>(d.location||'Unknown')===location&&(['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  const oldDue=(rows.find(x=>x.expectedReturn)||{}).expectedReturn||'';
  Swal.fire({title:'ต่อสัญญา: '+location,html:`<div class="sp-muted" style="margin-bottom:8px">วันคืนเดิม: <b>${spFmtDate(oldDue)}</b></div><input id="swDue" class="swal2-input" type="date" value="${spEsc(oldDue)}"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}sd_bulkExtend(rows.map(x=>x.idCode),due,spVal('swNote',''));});
}
function sd_renderAlerts(){
  const rows=sd_v11FilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired);
  spSetHtml('sdAlertCount',`${rows.length} alerts`);spSetHtml('sdAlertHeaderCount',rows.length>99?'99+':rows.length);
  const shortRows=rows.slice(0,8).map(d=>({type:d.status,id:d.idCode,location:d.location,action:d.actionRequired||'-'}));
  spSetHtml('sdAlertTable',sd_table(shortRows,[['type','Type'],['id','ID'],['location','Location'],['action','Action']]));
}
function sd_openAlertPopup(){
  const rows=sd_v11FilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired);
  const types=['all','Overdue','Missing','Broken','Recheck','Action Required'];
  const build=(type)=>{let list=rows;if(type&&type!=='all'){list=rows.filter(d=>type==='Action Required'?!!d.actionRequired:(d.status===type||(type==='Overdue'&&Number(d.overdueDays||0)>0)));}return `<div style="margin-bottom:10px"><select id="swAlertType" class="swal2-input" style="width:260px;margin:0" onchange="document.getElementById('swAlertList').innerHTML=sd_v11AlertListHtml(this.value)">${types.map(t=>`<option value="${t}">${t==='all'?'ทุกประเภท':t}</option>`).join('')}</select></div><div id="swAlertList">${sd_v11AlertListHtml(type||'all')}</div>`;};
  window.sd_v11AlertListHtml=function(type){let list=rows;if(type&&type!=='all'){list=rows.filter(d=>type==='Action Required'?!!d.actionRequired:(d.status===type||(type==='Overdue'&&Number(d.overdueDays||0)>0)));}return `<div class="sp-compact-alert-list">${list.map(d=>`<div class="sp-alert-row"><div class="sp-alert-ico" style="background:${d.status==='Overdue'?'#fee2e2':'#eff6ff'};color:${d.status==='Overdue'?'#dc2626':'#2563eb'}"><i class="fas fa-bell"></i></div><div><div class="sp-alert-title">${spEsc(d.idCode||'-')} ${spBadge(d.status)}</div><div class="sp-alert-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • ${spEsc(d.location||'-')}</div></div><button class="sp-btn soft" onclick='sd_showAlertDetail(${JSON.stringify(d.idCode)})'>รายละเอียด</button></div>`).join('')||'<div class="sp-muted">No alert</div>'}</div>`;};
  Swal.fire({title:'Stock Alerts',width:900,html:build('all'),confirmButtonText:'Close'});
}
function sd_showAlertDetail(id){
  const d=sd_v11FilteredDevices().find(x=>x.idCode===id)||{};
  Swal.fire({title:'รายละเอียด Alert',html:`<div style="text-align:left"><b>${spEsc(d.idCode||'-')}</b> ${spBadge(d.status)}<br>SN: ${spEsc(d.sn||'-')}<br>Model: ${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')}<br>Location: ${spEsc(d.location||'-')}<br>Borrower: ${spEsc(d.borrower||'-')}<br>Due: ${spFmtDate(d.expectedReturn||d.expectedReturnDate)}<br>Action: ${spEsc(d.actionRequired||d.recheckNote||'-')}</div>`});
}



/* ============================================================
   CES Stock Pro V15 — Dashboard UX + Cache Patch
   Additive only; public function names remain available.
============================================================ */
const SD_CACHE_KEY_V15 = 'CES_STOCK_DASHBOARD_CACHE_V15';
const SD_CACHE_TTL_MS_V15 = 5 * 60 * 1000;

function sd_v15ApplyThemeStyle(){
  if(document.getElementById('stockpro-dashboard-v15-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-dashboard-v15-style';
  st.textContent=`
    #view-stock_dashboard .stockpro-header-card{background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:0 8px 28px rgba(15,23,42,.05)!important;}
    #view-stock_dashboard .sd-icon-only{width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;border-radius:14px!important;font-size:0!important;position:relative!important;}
    #view-stock_dashboard .sd-icon-only i{font-size:14px!important;margin:0!important;}
    #view-stock_dashboard .sp-btn.warn{background:#f59e0b!important;color:#fff!important;}
    #view-stock_dashboard .sp-btn.ghost{background:#fff!important;color:#0f766e!important;border-color:#bfdbfe!important;}
    #view-stock_dashboard .sp-btn.dark{background:#0f172a!important;color:#fff!important;}
    #view-stock_dashboard .sd-head-count{position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px!important;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 5px;}
    #view-stock_dashboard .sp-model-card{background:#fff!important;box-shadow:0 5px 18px rgba(15,23,42,.05)!important;border-width:1px!important;}
    #view-stock_dashboard .sp-model-card.infu,#view-stock_dashboard .sp-model-card.infusomat{border-color:#bbf7d0!important;}
    #view-stock_dashboard .sp-model-card.space,#view-stock_dashboard .sp-model-card.spaceplus{border-color:#fde68a!important;}
    #view-stock_dashboard .sp-model-card.byond{border-color:#bfdbfe!important;}
    #view-stock_dashboard .sp-kpi{background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:0 5px 18px rgba(15,23,42,.04)!important;}
    #view-stock_dashboard .sp-contract-row-overdue td{background:#fff!important}.sp-contract-row-overdue .sp-status-dot{background:#ef4444!important;}
    #view-stock_dashboard .sp-contract-row-completed td{background:#fff!important}.sp-contract-row-completed .sp-status-dot{background:#38bdf8!important;}
    #view-stock_dashboard .sp-contract-row-active td{background:#fff!important}.sp-contract-row-active .sp-status-dot{background:#10b981!important;}
    #view-stock_dashboard .sp-status-dot{width:11px;height:11px;border-radius:50%;display:inline-block;margin-right:8px;box-shadow:0 0 0 4px rgba(148,163,184,.12);vertical-align:middle;}
    .sd-v15-alert-list{max-height:64vh;overflow:auto;text-align:left}.sd-v15-alert-row{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #edf2f7}.sd-v15-alert-dot{width:28px;height:28px;border-radius:12px;display:flex;align-items:center;justify-content:center}.sd-v15-alert-title{font-size:13px;font-weight:900;color:#0f172a}.sd-v15-alert-sub{font-size:11px;color:#64748b;margin-top:2px}
  `;
  document.head.appendChild(st);
}

function sd_v15SaveCache_(res){try{sessionStorage.setItem(SD_CACHE_KEY_V15,JSON.stringify({ts:Date.now(),data:res}));}catch(e){}}
function sd_v15ReadCache_(){try{const x=JSON.parse(sessionStorage.getItem(SD_CACHE_KEY_V15)||'null');if(x&&x.data&&(Date.now()-x.ts)<SD_CACHE_TTL_MS_V15)return x.data;}catch(e){}return null;}

if(typeof window.sd_v15OriginalInit === 'undefined' && typeof initStockDashboardModule === 'function'){
  window.sd_v15OriginalInit = initStockDashboardModule;
  initStockDashboardModule = function(force=false){
    sd_v15ApplyThemeStyle();
    const cached = !force ? sd_v15ReadCache_() : null;
    if(cached){SD_DASH.loaded=true;SD_DASH.raw=cached;try{sd_fillFilters();sd_renderAll();}catch(e){console.warn(e);} }
    google.script.run.withSuccessHandler(res=>{
      if(!res||!res.success){if(!cached)Swal.fire('Stock Dashboard Error',(res&&res.message)||'Cannot load dashboard','error');return;}
      SD_DASH.loaded=true;SD_DASH.raw=res;sd_v15SaveCache_(res);sd_fillFilters();sd_renderAll();
    }).withFailureHandler(err=>{if(!cached)Swal.fire('Stock Dashboard Error',err.message||String(err),'error');}).sd_getStockDashboardData(force===true);
  };
}

if(typeof window.sd_v15OriginalRenderContract === 'undefined' && typeof sd_renderContractSummary === 'function'){
  window.sd_v15OriginalRenderContract = sd_renderContractSummary;
  sd_renderContractSummary = function(){
    window.sd_v15OriginalRenderContract();
    setTimeout(()=>{document.querySelectorAll('#sdContractTable tbody tr').forEach(tr=>{if(!tr.querySelector('.sp-status-dot')){const first=tr.querySelector('td');if(first){const dot=document.createElement('span');dot.className='sp-status-dot';first.prepend(dot);}}});},0);
  };
}

if(typeof window.sd_v15OriginalRenderAlerts === 'undefined' && typeof sd_renderAlerts === 'function'){
  window.sd_v15OriginalRenderAlerts = sd_renderAlerts;
  sd_renderAlerts = function(){
    window.sd_v15OriginalRenderAlerts();
    const text=(document.getElementById('sdAlertCount')||{}).textContent||'0';
    const n=(text.match(/\d+/)||['0'])[0];
    const h=document.getElementById('sdAlertHeaderCount'); if(h)h.textContent=Number(n)>99?'99+':n;
  };
}

function sd_openAlertPopup(){
  sd_v15ApplyThemeStyle();
  const base=(typeof sd_v11FilteredDevices==='function'?sd_v11FilteredDevices():(SD_DASH.raw&&SD_DASH.raw.alerts)||[]);
  const rows=(base||[]).filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired||d.recheckNote);
  const types=['all','Overdue','Missing','Broken','Recheck','Action Required'];
  window.sd_v15AlertList=function(type){
    let list=rows;
    if(type&&type!=='all')list=rows.filter(d=>type==='Action Required'?!!(d.actionRequired||d.recheckNote):(d.status===type||(type==='Overdue'&&Number(d.overdueDays||0)>0)));
    return `<div class="sd-v15-alert-list">${list.map(d=>`<div class="sd-v15-alert-row"><div class="sd-v15-alert-dot" style="background:${d.status==='Overdue'?'#fee2e2':'#eff6ff'};color:${d.status==='Overdue'?'#dc2626':'#2563eb'}"><i class="fas fa-bell"></i></div><div><div class="sd-v15-alert-title">${spEsc(d.idCode||'-')} ${spBadge(d.status)}</div><div class="sd-v15-alert-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • ${spEsc(d.location||'-')}</div></div><button class="sp-btn soft" onclick='sd_showAlertDetail(${JSON.stringify(d.idCode)})'>รายละเอียด</button></div>`).join('')||'<div class="sp-muted">No alert</div>'}</div>`;
  };
  Swal.fire({title:'Stock Alerts',width:900,html:`<select id="sdV15AlertFilter" class="swal2-input" style="width:260px;margin:0 0 14px" onchange="document.getElementById('sdV15AlertList').innerHTML=sd_v15AlertList(this.value)">${types.map(t=>`<option value="${t}">${t==='all'?'ทุกประเภท':t}</option>`).join('')}</select><div id="sdV15AlertList">${sd_v15AlertList('all')}</div>`,confirmButtonText:'Close'});
}

try{sd_v15ApplyThemeStyle();}catch(e){}


/* ============================================================
   CES Stock Pro V17 — Dashboard UX patch
============================================================ */
function sd_v17Style(){
  if(document.getElementById('stock-dashboard-v17-style')) return;
  const style=document.createElement('style');
  style.id='stock-dashboard-v17-style';
  style.textContent=`
    #view-stock_dashboard .sd-icon-only{width:40px!important;height:40px!important;min-width:40px!important;padding:0!important;font-size:0!important;border-radius:12px!important;position:relative!important}
    #view-stock_dashboard .sd-icon-only i{font-size:15px!important}
    #view-stock_dashboard #sdAlertHeaderCount{position:absolute!important;top:-7px!important;right:-7px!important;margin:0!important;min-width:20px!important;height:20px!important;border-radius:999px!important;background:#ef4444!important;color:#fff!important;font-size:10px!important;font-weight:900!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid #fff!important;padding:0 4px!important}
    #view-stock_dashboard .sp-model-card{background:#fff!important;border:1.5px solid #e8eef6!important}
    #view-stock_dashboard .sp-model-card.byond-sunfusion{border-color:#bfdbfe!important;background:#f8fbff!important}
    #view-stock_dashboard .sp-model-card.bbraun-infusomat{border-color:#bbf7d0!important;background:#f8fffb!important}
    #view-stock_dashboard .sp-model-card.bbraun-spaceplus{border-color:#fde68a!important;background:#fffdf5!important}
  `;
  document.head.appendChild(style);
}


/* ============================================================
   CES Stock Pro V30 — Dashboard KPI + Contract Export Patch
   Additive override. Keeps existing dashboard functions.
   - Overdue / Missing / Broken are counted separately and correctly.
   - Rental Contract Summary can be exported as Excel.
   - Contract summary rows stay white and use a status dot.
============================================================ */
function sd_v30StatusOf(d){
  const text=[d.status,d.baseStatus,d.base_status,d.rentalStatus,d.rental_status,d.dqStatus,d.dq_status,d.actionRequired,d.action_required,d.recheckNote,d.recheck_note].join(' ').toUpperCase();
  if(/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง/.test(text)) return 'Broken';
  if(/MISSING|LOST|สูญหาย|หาย|หาไม่พบ/.test(text)) return 'Missing';
  if(/RECHECK|RE-CHECK|ตรวจซ้ำ|ตรวจสอบซ้ำ/.test(text)) return 'Recheck';
  if(/OVERDUE|EXPIRED|เลยกำหนด|เกินกำหนด/.test(text)||Number(d.overdueDays||d.overdue_days||0)>0) return 'Overdue';
  if(/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) return 'In-Use';
  return 'Stock';
}
function sd_v30NormalizedRows(rows){
  return (rows||[]).map(d=>Object.assign({},d,{status:sd_v30StatusOf(d)}));
}
if(typeof sd_v11FilteredDevices === 'function' && !window.__sdV30FilteredPatch){
  window.__sdV30FilteredPatch=true;
  const _baseFiltered=sd_v11FilteredDevices;
  sd_v11FilteredDevices=function(){ return sd_v30NormalizedRows(_baseFiltered()); };
}
function sd_v11FilteredKpi(rows){
  rows = sd_v30NormalizedRows(rows||[]);
  return {
    total: rows.length,
    stock: rows.filter(d=>d.status==='Stock').length,
    inUse: rows.filter(d=>d.status==='In-Use').length,
    overdue: rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||d.overdue_days||0)>0).length,
    missing: rows.filter(d=>d.status==='Missing').length,
    broken: rows.filter(d=>d.status==='Broken').length,
    recheck: rows.filter(d=>d.status==='Recheck').length,
    rentalRows: (SD_DASH.raw&&SD_DASH.raw.rentals||[]).length
  };
}
function sd_renderKpis(k){
  k = k || sd_v11FilteredKpi(typeof sd_v11FilteredDevices==='function'?sd_v11FilteredDevices():[]);
  const items=[
    ['ทั้งหมด',k.total,'fa-boxes','#2563eb','#dbeafe'],
    ['อยู่ในคลัง',k.stock,'fa-warehouse','#059669','#dcfce7'],
    ['ถูกยืม',k.inUse,'fa-arrow-right-from-bracket','#d97706','#fef3c7'],
    ['OVERDUE',k.overdue,'fa-clock','#dc2626','#fee2e2'],
    ['MISSING',k.missing,'fa-question-circle','#854d0e','#fef9c3'],
    ['BROKEN',k.broken,'fa-screwdriver-wrench','#64748b','#e2e8f0'],
    ['RECHECK',k.recheck,'fa-triangle-exclamation','#7c3aed','#ede9fe'],
    ['RENTAL ROWS',k.rentalRows,'fa-file-contract','#0ea5e9','#e0f2fe']
  ];
  spSetHtml('sdKpiGrid',items.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join(''));
}
function sd_v30ContractRowsFlat(){
  const rows = typeof sd_v11ContractRows==='function' ? sd_v11ContractRows() : [];
  return rows.map(r=>({
    Location:r.location,
    Total:r.total,
    In_Use:r.inUse,
    Overdue:r.overdue,
    Completed:r.completed||0,
    Borrow_Date:spFmtDate(r.borrowDate),
    Expected_Return:spFmtDate(r.expectedReturn),
    Max_Overdue_Days:r.maxOverdue||0,
    Models:r.modelList||'',
    Device_IDs:(r.ids||[]).join(', '),
    Status:r.overdue?'OVERDUE':((r.completed&&!r.inUse)?'COMPLETED':'ACTIVE')
  }));
}
function sd_exportContractSummaryExcel(){
  const data = sd_v30ContractRowsFlat();
  if(!data.length){Swal.fire('No contract records','','info');return;}
  if(typeof XLSX === 'undefined'){
    Swal.fire('Export Error','XLSX library not loaded','error');return;
  }
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Rental Contract Summary');
  XLSX.writeFile(wb,'CES_Rental_Contract_Summary.xlsx');
}
function sd_v30EnsureContractExportButton(){
  const head=document.querySelector('#view-stock_dashboard #sdContractTable')?.closest('.stockpro-card')?.querySelector('.stockpro-card-head');
  if(!head || document.getElementById('sdContractExportBtn')) return;
  const btn=document.createElement('button');
  btn.id='sdContractExportBtn';
  btn.className='sp-btn soft';
  btn.style.padding='8px 12px';
  btn.innerHTML='<i class="fas fa-file-excel"></i> Export Contract';
  btn.onclick=sd_exportContractSummaryExcel;
  head.appendChild(btn);
}
function sd_renderContractSummary(){
  const rows=typeof sd_v11ContractRows==='function'?sd_v11ContractRows():[];
  spSetHtml('sdContractCount',`${rows.length} locations`);
  if(!rows.length){spSetHtml('sdContractTable','<div class="sp-muted">No contract records</div>');sd_v30EnsureContractExportButton();return;}
  spSetHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>Status</th><th>Borrow Date</th><th>Expected / Return</th><th>Action</th></tr></thead><tbody>${rows.map(r=>{const cls=r.overdue?'sp-contract-row-overdue':(r.completed&&!r.inUse?'sp-contract-row-completed':'sp-contract-row-active');const state=r.overdue?'OVERDUE':((r.completed&&!r.inUse)?'COMPLETED':'ACTIVE');return `<tr class="${cls}"><td><span class="sp-status-dot"></span><span class="sp-id">${spEsc(r.location)}</span><span class="sp-sub">${spEsc(r.modelList)}</span></td><td>${spNum(r.total)}</td><td><span class="sp-chip ok">In-Use ${spNum(r.inUse)}</span> <span class="sp-chip low">Overdue ${spNum(r.overdue)}</span> <span class="sp-chip">Done ${spNum(r.completed||0)}</span><span class="sp-sub">${state}</span></td><td>${spFmtDate(r.borrowDate)}</td><td>${spFmtDate(r.expectedReturn)}${r.maxOverdue?`<span class="sp-sub" style="color:#dc2626">เลย ${spNum(r.maxOverdue)} วัน</span>`:''}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="รายละเอียด" onclick='sd_showLocationDetail(${JSON.stringify(r.location)})'><i class="fas fa-magnifying-glass-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='sd_extendLocation(${JSON.stringify(r.location)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='sd_returnLocation(${JSON.stringify(r.location)})'><i class="fas fa-undo"></i></button></div></td></tr>`;}).join('')}</tbody></table></div>`);
  sd_v30EnsureContractExportButton();
}
if(!window.__sdV30RenderFilteredPatch && typeof sd_renderFiltered==='function'){
  window.__sdV30RenderFilteredPatch=true;
  const _baseSdRenderFiltered=sd_renderFiltered;
  sd_renderFiltered=function(){
    const rows = typeof sd_v11FilteredDevices==='function'?sd_v11FilteredDevices():sd_getFilteredDevices();
    sd_renderModelCards(rows);
    sd_renderKpis(sd_v11FilteredKpi(rows));
    sd_renderSummaryTables();
    sd_renderContractSummary();
    sd_renderAlerts();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{sd_v30EnsureContractExportButton();}catch(e){}},1000));
