/* ============================================================
   CES Hub Stock Inventory — Contract Summary + Confirm UX V7
   Loaded after V6. Uses the same cached snapshot / backend data.
============================================================ */
(function(){
  'use strict';

  var STATUS = ['พร้อมส่ง','รอสอบเทียบ','เช่ายืม','ใช้งานไม่ได้','ไม่พบในรายการ'];
  var COLORS = {
    'พร้อมส่ง':'#10b981',
    'รอสอบเทียบ':'#94a3b8',
    'เช่ายืม':'#2563eb',
    'ใช้งานไม่ได้':'#475569',
    'ไม่พบในรายการ':'#cbd5e1'
  };
  var MODEL_STYLE = [
    {brand:'B.Braun',model:'Infusomat Space',color:'#10b981',bg:'#d1fae5'},
    {brand:'B.Braun',model:'Spaceplus',color:'#64748b',bg:'#e2e8f0'},
    {brand:'BYOND',model:'Sunfusion 2',color:'#2563eb',bg:'#dbeafe'}
  ];
  var charts = {};
  var contractState = { groups:[], filtered:[] };

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];});}
  function num(v){var n=Number(v);return isNaN(n)?0:n;}
  function el(id){return document.getElementById(id);}
  function value(id,def){var x=el(id);return x?x.value:(def==null?'':def);}
  function setHtml(id,v){var x=el(id);if(x)x.innerHTML=v;}
  function setText(id,v){var x=el(id);if(x)x.textContent=v;}
  function unique(a){return Array.from(new Set((a||[]).filter(Boolean)));}
  function today(){return new Date().toISOString().slice(0,10);}
  function userName(){try{return (window.currentUser&&(currentUser.name_eng||currentUser.name_th||currentUser.id||currentUser.email))||'';}catch(e){return '';}}
  function statusName(v){var s=String(v||'').trim();return STATUS.indexOf(s)>=0?s:'รอสอบเทียบ';}
  function modelName(v){var s=String(v||'').trim();if(/sunfusion/i.test(s))return 'Sunfusion 2';if(/space\s*plus|spaceplus/i.test(s))return 'Spaceplus';if(/infusomat\s+space/i.test(s))return 'Infusomat Space';return s;}
  function normalize(d){d=d||{};return Object.assign({},d,{
    idCode:String(d.idCode||d.id_code||''),
    sn:String(d.sn||d.serialNumber||d.serial_number||''),
    brand:String(d.brand||''),model:modelName(d.model||d.displayModel||d.itemName),
    location:String(d.location||''),status:statusName(d.status||d.baseStatus||d.base_status),
    borrower:String(d.borrower||''),borrowDate:String(d.borrowDate||d.borrow_date||''),
    expectedReturn:String(d.expectedReturn||d.expectedReturnDate||d.expected_return_date||''),
    actionRequired:String(d.actionRequired||d.action_required||''),
    isOverdue:!!d.isOverdue||num(d.overdueDays||d.overdue_days)>0,
    overdueDays:num(d.overdueDays||d.overdue_days)
  });}
  function payload(){
    try{if(typeof SD_DASH!=='undefined'&&SD_DASH.raw)return SD_DASH.raw;}catch(e){}
    try{if(typeof SI!=='undefined'&&SI.raw)return SI.raw;}catch(e){}
    return window.CES_STOCK_BOOTSTRAP_V6||{devices:[]};
  }
  function allRows(){var p=payload()||{};return (p.devices||p.inventory||[]).map(normalize);}
  function dashboardRows(){
    var q=value('sdSearch','').trim().toLowerCase(),b=value('sdBrand','all'),m=value('sdModel','all'),s=value('sdStatus','all'),l=value('sdLocation','all');
    return allRows().filter(function(d){
      var hay=[d.idCode,d.sn,d.brand,d.model,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();
      return (!q||hay.indexOf(q)>=0)&&(b==='all'||d.brand===b)&&(m==='all'||d.model===m)&&(s==='all'||d.status===s)&&(l==='all'||d.location===l);
    });
  }
  function countStatus(rows){var c={};STATUS.forEach(function(s){c[s]=0;});(rows||[]).forEach(function(d){c[statusName(d.status)]++;});return c;}
  function dateIso(v){
    if(!v)return '';
    var s=String(v).trim();
    var iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
    var th=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(th){var y=Number(th[3]);if(y>2400)y-=543;return String(y).padStart(4,'0')+'-'+String(th[2]).padStart(2,'0')+'-'+String(th[1]).padStart(2,'0');}
    var d=new Date(s);return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  function dateValue(v){var iso=dateIso(v);return iso?new Date(iso+'T00:00:00').getTime():Number.MAX_SAFE_INTEGER;}
  function fmtDate(v){var iso=dateIso(v);if(!iso)return '-';try{return new Intl.DateTimeFormat('th-TH',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso+'T00:00:00'));}catch(e){return iso;}}
  function minDate(a,b){if(!a)return b||'';if(!b)return a||'';return dateValue(a)<=dateValue(b)?a:b;}
  function maxDate(a,b){if(!a)return b||'';if(!b)return a||'';return dateValue(a)>=dateValue(b)?a:b;}
  function destroyChart(key,canvasId){
    try{if(charts[key])charts[key].destroy();}catch(e){}
    charts[key]=null;
    try{if(window.Chart&&Chart.getChart){var old=Chart.getChart(canvasId);if(old)old.destroy();}}catch(e){}
  }

  function injectStyle(){
    if(el('ces-stock-contract-v7-style'))return;
    var s=document.createElement('style');s.id='ces-stock-contract-v7-style';s.textContent=`
      .ces-stock-v7-page .csv7-kpi-four{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .ces-stock-v7-page .sp-kpi{border-color:#dbe7f3!important;background:linear-gradient(180deg,#fff,#fbfdff)!important}
      .ces-stock-v7-page .sp-model-card{background:linear-gradient(180deg,#fff,#fbfdff);border-color:#dbe7f3}
      .ces-stock-v7-page .csv7-contract-card{margin-top:16px}
      .ces-stock-v7-page .csv7-contract-head>div:first-child{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .ces-stock-v7-page .csv7-contract-head h3{margin:0}
      .ces-stock-v7-page .csv7-contract-filters{grid-template-columns:minmax(260px,2fr) minmax(150px,.75fr) minmax(180px,.9fr) auto!important;box-shadow:none!important;margin:10px 0 12px!important;background:#f8fbff!important}
      .ces-stock-v7-page .csv7-contract-location{display:flex;gap:8px;align-items:flex-start}.ces-stock-v7-page .csv7-contract-dot{width:10px;height:10px;border-radius:50%;margin-top:4px;flex:none;background:#10b981;box-shadow:0 0 0 4px #d1fae5}.ces-stock-v7-page .csv7-contract-dot.overdue{background:#ef4444;box-shadow:0 0 0 4px #fee2e2}
      .ces-stock-v7-page .csv7-contract-status{display:flex;gap:5px;flex-wrap:wrap}.ces-stock-v7-page .csv7-chip{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900}.ces-stock-v7-page .csv7-chip.active{background:#d1fae5;color:#047857}.ces-stock-v7-page .csv7-chip.overdue{background:#fee2e2;color:#b91c1c}.ces-stock-v7-page .csv7-chip.done{background:#e2e8f0;color:#475569}
      .ces-stock-v7-page .csv7-contract-actions{display:flex;gap:6px}.ces-stock-v7-page .csv7-contract-actions button{width:34px;height:34px;border-radius:10px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;cursor:pointer}.ces-stock-v7-page .csv7-contract-actions button.extend{border-color:#cbd5e1;background:#f8fafc;color:#475569}.ces-stock-v7-page .csv7-contract-actions button.return{border-color:#a7f3d0;background:#ecfdf5;color:#047857}.ces-stock-v7-page .csv7-contract-actions button:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(30,58,138,.12)}
      .ces-stock-v7-page .csv7-summary-grid{margin-top:16px}.ces-stock-v7-page .csv7-summary-table{max-height:420px}
      .ces-stock-v7-page .csv7-three-mode{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;overflow:visible!important}
      .ces-stock-v7-page .csv7-mode-panel{padding:16px!important}.ces-stock-v7-page .csv7-mode-title{text-align:center;font-weight:900;margin:0 0 12px;color:#475569}
      .ces-stock-v7-page .csv7-three-mode .sp-mode{min-width:0;min-height:116px;border-radius:16px!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:14px 10px!important;transition:.18s;cursor:pointer;font-family:inherit}.ces-stock-v7-page .csv7-three-mode .sp-mode strong{font-size:14px}.ces-stock-v7-page .csv7-three-mode .sp-mode>span:last-child{font-size:10px;font-weight:800;opacity:.8}.ces-stock-v7-page .csv7-mode-icon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:16px}
      .ces-stock-v7-page .csv7-mode-return{background:#ecfdf5!important;color:#047857!important;border:1px solid #a7f3d0!important}.ces-stock-v7-page .csv7-mode-return .csv7-mode-icon{background:#d1fae5}.ces-stock-v7-page .csv7-mode-return.active{background:#059669!important;color:#fff!important;border-color:#059669!important;box-shadow:0 10px 25px rgba(5,150,105,.22)}.ces-stock-v7-page .csv7-mode-return.active .csv7-mode-icon{background:rgba(255,255,255,.18)}
      .ces-stock-v7-page .csv7-mode-cal{background:#f8fafc!important;color:#334155!important;border:1px solid #cbd5e1!important}.ces-stock-v7-page .csv7-mode-cal .csv7-mode-icon{background:#e2e8f0}.ces-stock-v7-page .csv7-mode-cal.active,.ces-stock-v7-page .sp-mode.active.cal{background:#475569!important;color:#fff!important;border-color:#475569!important;box-shadow:0 10px 25px rgba(71,85,105,.22)}.ces-stock-v7-page .csv7-mode-cal.active .csv7-mode-icon{background:rgba(255,255,255,.18)}
      .ces-stock-v7-page .csv7-mode-out{background:#eff6ff!important;color:#1d4ed8!important;border:1px solid #bfdbfe!important}.ces-stock-v7-page .csv7-mode-out .csv7-mode-icon{background:#dbeafe}.ces-stock-v7-page .csv7-mode-out.active,.ces-stock-v7-page .sp-mode.active.out{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important;box-shadow:0 10px 25px rgba(37,99,235,.22)}.ces-stock-v7-page .csv7-mode-out.active .csv7-mode-icon{background:rgba(255,255,255,.18)}
      .ces-stock-v7-page .csv7-mode-text{text-align:center;margin-top:12px;font-weight:900}
      @media(max-width:980px){.ces-stock-v7-page .csv7-contract-filters{grid-template-columns:1fr 1fr!important}.ces-stock-v7-page .csv7-contract-filters .sp-search{grid-column:span 2}.ces-stock-v7-page .csv7-kpi-four{grid-template-columns:repeat(2,1fr)!important}}
      @media(max-width:620px){.ces-stock-v7-page .csv7-three-mode{gap:6px!important}.ces-stock-v7-page .csv7-three-mode .sp-mode{padding:10px 4px!important;min-height:105px}.ces-stock-v7-page .csv7-three-mode .sp-mode strong{font-size:11px}.ces-stock-v7-page .csv7-three-mode .sp-mode>span:last-child{font-size:8px}.ces-stock-v7-page .csv7-contract-filters{grid-template-columns:1fr!important}.ces-stock-v7-page .csv7-contract-filters .sp-search{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function renderModelCards(rows){
    setHtml('sdModelCards',MODEL_STYLE.map(function(x){var r=rows.filter(function(d){return d.brand===x.brand&&d.model===x.model;}),c=countStatus(r);return '<div class="sp-model-card" style="--tone:'+x.color+';border-top-color:'+x.color+'"><div class="sp-model-icon" style="background:'+x.bg+'"><i class="fas fa-microchip" style="color:'+x.color+'"></i></div><div class="sp-model-brand">'+esc(x.brand)+'</div><div class="sp-model-label">'+esc(x.model)+'</div><div class="sp-model-num" style="color:'+x.color+'">'+r.length+'</div><div class="csv5-model-status"><span>พร้อมส่ง <b>'+c['พร้อมส่ง']+'</b></span><span>รอสอบเทียบ <b>'+c['รอสอบเทียบ']+'</b></span><span>เช่ายืม <b>'+c['เช่ายืม']+'</b></span></div></div>';}).join(''));
  }
  function renderKpis(rows){
    var c=countStatus(rows),items=[
      ['อุปกรณ์ทั้งหมด',rows.length,'fa-boxes-stacked','#2563eb','#dbeafe'],
      ['พร้อมส่ง',c['พร้อมส่ง'],'fa-circle-check','#10b981','#d1fae5'],
      ['รอสอบเทียบ',c['รอสอบเทียบ'],'fa-screwdriver-wrench','#64748b','#e2e8f0'],
      ['เช่ายืม',c['เช่ายืม'],'fa-arrow-right-from-bracket','#2563eb','#dbeafe']
    ];
    setHtml('sdKpiGrid',items.map(function(i){return '<div class="sp-kpi" style="--tone:'+i[3]+'"><div class="ico" style="background:'+i[4]+'"><i class="fas '+i[2]+'" style="color:'+i[3]+'"></i></div><div class="label">'+esc(i[0])+'</div><div class="val" style="color:'+i[3]+'">'+i[1]+'</div></div>';}).join(''));
  }
  function renderCharts(rows){
    if(typeof Chart==='undefined')return;
    var c=countStatus(rows),labels=STATUS.slice(),colors=labels.map(function(s){return COLORS[s];});
    destroyChart('status','sdStatusChart');destroyChart('model','sdModelStatusChart');destroyChart('brand','sdBrandChart');
    var a=el('sdStatusChart');if(a)charts.status=new Chart(a,{type:'doughnut',data:{labels:labels,datasets:[{data:labels.map(function(s){return c[s];}),backgroundColor:colors,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'bottom'}}}});
    var mc=MODEL_STYLE.map(function(x){var r=rows.filter(function(d){return d.brand===x.brand&&d.model===x.model;});return{label:x.model,c:countStatus(r)};});
    var b=el('sdModelStatusChart');if(b)charts.model=new Chart(b,{type:'bar',data:{labels:mc.map(function(x){return x.label;}),datasets:labels.map(function(s){return{label:s,data:mc.map(function(x){return x.c[s];}),backgroundColor:COLORS[s],borderRadius:5};})},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});
    var brands=['B.Braun','BYOND'],d=el('sdBrandChart');if(d)charts.brand=new Chart(d,{type:'bar',data:{labels:brands,datasets:[{label:'จำนวนอุปกรณ์',data:brands.map(function(x){return rows.filter(function(r){return r.brand===x;}).length;}),backgroundColor:['#10b981','#2563eb'],borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
  }
  function renderTopLocations(rows){
    var map={};rows.forEach(function(d){var l=d.location||'ไม่ระบุ';if(!map[l])map[l]={location:l,total:0,c:countStatus([])};map[l].total++;map[l].c[d.status]++;});
    var list=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.total-a.total;}).slice(0,12);
    setText('sdLocationCount',Object.keys(map).length+' locations');
    setHtml('sdTopLocationTable',list.length?'<div class="csv5-table-wrap"><table class="csv5-table"><thead><tr><th>Location</th><th>Total</th><th>พร้อมส่ง</th><th>รอสอบเทียบ</th><th>เช่ายืม</th></tr></thead><tbody>'+list.map(function(x){return '<tr><td><b>'+esc(x.location)+'</b></td><td>'+x.total+'</td><td>'+x.c['พร้อมส่ง']+'</td><td>'+x.c['รอสอบเทียบ']+'</td><td>'+x.c['เช่ายืม']+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="sp-muted">No location data</div>');
  }

  function buildContractGroups(rows){
    var map={};(rows||[]).filter(function(d){return d.status==='เช่ายืม';}).forEach(function(d){
      var l=d.location||'ไม่ระบุ';if(!map[l])map[l]={location:l,items:[],total:0,active:0,overdue:0,done:0,models:{},borrowDate:'',due:'',maxDue:'',maxOverdue:0};
      var x=map[l];x.items.push(d);x.total++;if(d.isOverdue){x.overdue++;x.maxOverdue=Math.max(x.maxOverdue,d.overdueDays);}else{x.active++;}
      x.models[d.model]=(x.models[d.model]||0)+1;x.borrowDate=minDate(x.borrowDate,d.borrowDate);x.due=minDate(x.due,d.expectedReturn);x.maxDue=maxDate(x.maxDue,d.expectedReturn);
    });
    return Object.keys(map).map(function(k){var x=map[k];x.modelText=Object.keys(x.models).map(function(m){return m+' ×'+x.models[m];}).join(', ');return x;});
  }
  function filteredContracts(){
    var list=buildContractGroups(dashboardRows()),q=value('sdContractSearch','').trim().toLowerCase(),filter=value('sdContractFilter','all'),sort=value('sdContractSort','risk');
    list=list.filter(function(x){var hay=[x.location,x.modelText].concat(x.items.map(function(d){return[d.idCode,d.sn,d.borrower].join(' ');})).join(' ').toLowerCase();if(q&&hay.indexOf(q)<0)return false;if(filter==='active'&&x.active<1)return false;if(filter==='overdue'&&x.overdue<1)return false;return true;});
    list.sort(function(a,b){if(sort==='location')return a.location.localeCompare(b.location,'th');if(sort==='due_asc')return dateValue(a.due)-dateValue(b.due);if(sort==='due_desc')return dateValue(b.due)-dateValue(a.due);return b.overdue-a.overdue||b.maxOverdue-a.maxOverdue||b.total-a.total;});
    contractState.groups=buildContractGroups(dashboardRows());contractState.filtered=list;return list;
  }
  function actionAttr(fn,arg){return "onclick='"+fn+"("+JSON.stringify(arg).replace(/'/g,'&#39;')+")'";}
  window.sd_renderContractSummary=function(){
    var list=filteredContracts();setText('sdContractCount',list.length+' locations');
    setHtml('sdContractTable',list.length?'<div class="csv5-table-wrap" style="max-height:560px"><table class="csv5-table"><thead><tr><th>Location</th><th>Items</th><th>Status</th><th>Borrow Date</th><th>Expected / Return</th><th>Action</th></tr></thead><tbody>'+list.map(function(x){return '<tr><td><div class="csv7-contract-location"><span class="csv7-contract-dot '+(x.overdue?'overdue':'')+'"></span><div><b>'+esc(x.location)+'</b><span class="sp-sub">'+esc(x.modelText||'-')+'</span></div></div></td><td><b>'+x.total+'</b></td><td><div class="csv7-contract-status"><span class="csv7-chip active">In-Use '+x.active+'</span><span class="csv7-chip overdue">Overdue '+x.overdue+'</span><span class="csv7-chip done">Done '+x.done+'</span></div></td><td>'+fmtDate(x.borrowDate)+'</td><td>'+fmtDate(x.due)+(x.maxOverdue?'<span class="csv5-contract-note">เลย '+x.maxOverdue+' วัน</span>':'')+'</td><td><div class="csv7-contract-actions"><button title="ดูรายละเอียด" '+actionAttr('sd_contractDetail',x.location)+'><i class="fas fa-magnifying-glass-plus"></i></button><button class="extend" title="แก้ไขวันที่คืน / ต่อสัญญา" '+actionAttr('sd_contractExtend',x.location)+'><i class="fas fa-calendar-plus"></i></button><button class="return" title="รับคืน" '+actionAttr('sd_contractReturn',x.location)+'><i class="fas fa-rotate-left"></i></button></div></td></tr>';}).join('')+'</tbody></table></div>':'<div class="sp-muted">ไม่พบรายการสัญญาตามตัวกรอง</div>');
  };
  window.sd_resetContractFilter=function(){if(el('sdContractSearch'))el('sdContractSearch').value='';if(el('sdContractFilter'))el('sdContractFilter').value='all';if(el('sdContractSort'))el('sdContractSort').value='risk';window.sd_renderContractSummary();};
  function groupByLocation(location){return buildContractGroups(dashboardRows()).find(function(x){return x.location===location;});}
  function detailTable(items){return '<div class="csv5-table-wrap" style="max-height:480px"><table class="csv5-table"><thead><tr><th>ID</th><th>SN</th><th>Model</th><th>Borrower</th><th>Borrow Date</th><th>Due Date</th><th>Status</th></tr></thead><tbody>'+items.map(function(d){return '<tr><td><b>'+esc(d.idCode)+'</b></td><td>'+esc(d.sn||'-')+'</td><td>'+esc(d.model)+'</td><td>'+esc(d.borrower||'-')+'</td><td>'+fmtDate(d.borrowDate)+'</td><td>'+fmtDate(d.expectedReturn)+(d.isOverdue?'<span class="csv5-contract-note">เลย '+d.overdueDays+' วัน</span>':'')+'</td><td><span class="csv7-chip '+(d.isOverdue?'overdue':'active')+'">'+(d.isOverdue?'Overdue':'In-Use')+'</span></td></tr>';}).join('')+'</tbody></table></div>';}
  window.sd_contractDetail=function(location){var g=groupByLocation(location);if(!g||!window.Swal)return;Swal.fire({title:'รายละเอียดสัญญา · '+location,width:1080,html:detailTable(g.items),confirmButtonText:'ปิด'});};
  function gas(fn,args,timeout){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(!done){done=true;reject(new Error('Request timeout: '+fn));}},timeout||30000);try{var r=google.script.run.withSuccessHandler(function(v){if(done)return;done=true;clearTimeout(t);resolve(v);}).withFailureHandler(function(e){if(done)return;done=true;clearTimeout(t);reject(e);});r[fn].apply(r,args||[]);}catch(e){if(!done){done=true;clearTimeout(t);reject(e);}}});}
  async function gasFirst(calls){var last;for(var i=0;i<calls.length;i++){try{return await gas(calls[i].fn,calls[i].args,calls[i].timeout);}catch(e){last=e;}}throw last||new Error('API unavailable');}
  function loading(title){if(window.Swal)Swal.fire({title:title,allowOutsideClick:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});}
  async function refreshAfterContract(message){if(window.Swal)await Swal.fire('สำเร็จ',message||'บันทึกสำเร็จ','success');if(typeof window.initStockDashboardModule==='function')await window.initStockDashboardModule(true);if(typeof window.initStockInventoryModule==='function')window.initStockInventoryModule(true);}
  window.sd_contractExtend=function(location){
    var g=groupByLocation(location);if(!g||!window.Swal)return;var min=dateIso(g.borrowDate)||today(),current=dateIso(g.due)||min;
    Swal.fire({title:'แก้ไขวันที่คืน / ต่อสัญญา',width:620,html:'<div style="text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px"><b>'+esc(location)+'</b><div style="font-size:12px;color:#64748b;margin-top:4px">วันที่ยืม: '+fmtDate(g.borrowDate)+' · '+g.total+' เครื่อง</div></div><label style="display:block;text-align:left;font-size:12px;font-weight:800;color:#475569">วันที่คืนใหม่</label><input id="csv7ContractDue" class="swal2-input" type="date" min="'+esc(min)+'" value="'+esc(current)+'"><input id="csv7ContractNote" class="swal2-input" placeholder="หมายเหตุ / เหตุผลการต่อสัญญา">',icon:'question',showCancelButton:true,confirmButtonText:'ยืนยันต่อสัญญา',confirmButtonColor:'#475569',preConfirm:function(){var due=el('csv7ContractDue').value;if(!due){Swal.showValidationMessage('กรุณาเลือกวันที่คืนใหม่');return false;}return{due:due,note:el('csv7ContractNote').value};}}).then(async function(r){if(!r.isConfirmed)return;loading('กำลังอัปเดตสัญญา...');try{var ids=g.items.map(function(d){return d.idCode;});var res=await gasFirst([{fn:'cesStockV7_extendRentalBatch',args:[{ids:ids,expectedReturnDate:r.value.due,note:r.value.note,user:userName()}],timeout:180000}]);Swal.close();if(!res)throw new Error('Extend failed');if(res.partial){await Swal.fire('ดำเนินการบางส่วน',esc(res.message)+(res.errors&&res.errors.length?'<br><small>'+esc(res.errors.join(' | '))+'</small>':''),'warning');if(typeof window.initStockDashboardModule==='function')await window.initStockDashboardModule(true);if(typeof window.initStockInventoryModule==='function')window.initStockInventoryModule(true);return;}if(res.success===false)throw new Error(res.message||'Extend failed');await refreshAfterContract(res.message);}catch(e){Swal.close();Swal.fire('ต่อสัญญาไม่สำเร็จ',e&&e.message?e.message:String(e),'error');}});};
  window.sd_contractReturn=function(location){
    var g=groupByLocation(location);if(!g||!window.Swal)return;
    Swal.fire({title:'ยืนยันรับคืนอุปกรณ์',width:620,html:'<div style="text-align:left;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px;margin-bottom:10px"><b>'+esc(location)+'</b><div style="font-size:12px;color:#047857;margin-top:4px">รับคืน '+g.total+' เครื่อง และเปลี่ยนสถานะเป็น รอสอบเทียบ</div></div><input id="csv7ReturnLocation" class="swal2-input" value="Warehouse" placeholder="สถานที่รับคืน"><input id="csv7ReturnNote" class="swal2-input" placeholder="หมายเหตุ">',icon:'question',showCancelButton:true,confirmButtonText:'ยืนยันรับคืน',confirmButtonColor:'#059669',preConfirm:function(){return{location:el('csv7ReturnLocation').value||'Warehouse',note:el('csv7ReturnNote').value};}}).then(async function(r){if(!r.isConfirmed)return;loading('กำลังรับคืนอุปกรณ์...');try{var ids=g.items.map(function(d){return d.idCode;});var res=await gasFirst([{fn:'cesStockV7_returnBatch',args:[{ids:ids,location:r.value.location,note:r.value.note,user:userName()}],timeout:180000}]);Swal.close();if(!res)throw new Error('Return failed');if(res.partial){await Swal.fire('ดำเนินการบางส่วน',esc(res.message)+(res.errors&&res.errors.length?'<br><small>'+esc(res.errors.join(' | '))+'</small>':''),'warning');if(typeof window.initStockDashboardModule==='function')await window.initStockDashboardModule(true);if(typeof window.initStockInventoryModule==='function')window.initStockInventoryModule(true);return;}if(res.success===false)throw new Error(res.message||'Return failed');await refreshAfterContract(res.message);}catch(e){Swal.close();Swal.fire('รับคืนไม่สำเร็จ',e&&e.message?e.message:String(e),'error');}});};
  function csvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
  function downloadCsv(rows,name){if(!rows.length){if(window.Swal)Swal.fire('ไม่มีข้อมูล','','info');return;}var cols=Object.keys(rows[0]),csv=[cols.map(csvCell).join(',')].concat(rows.map(function(r){return cols.map(function(c){return csvCell(r[c]);}).join(',');})).join('\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  window.sd_exportContracts=function(){var groups=filteredContracts(),rows=[];groups.forEach(function(g){g.items.forEach(function(d){rows.push({location:g.location,id_code:d.idCode,serial_number:d.sn,brand:d.brand,model:d.model,borrower:d.borrower,borrow_date:dateIso(d.borrowDate),expected_return:dateIso(d.expectedReturn),contract_status:d.isOverdue?'Overdue':'In-Use',overdue_days:d.overdueDays,action_required:d.actionRequired});});});downloadCsv(rows,'Rental_Contract_Summary_'+today()+'.csv');};

  function renderSummaries(rows){
    var grouped=[];
    function fixed(type,key,names){var map={};rows.forEach(function(d){var k=d[key]||'ไม่ระบุ';map[k]=(map[k]||0)+1;});names.forEach(function(k){grouped.push({type:type,name:k,count:map[k]||0});});Object.keys(map).filter(function(k){return names.indexOf(k)<0;}).sort(function(a,b){return map[b]-map[a];}).forEach(function(k){grouped.push({type:type,name:k,count:map[k]});});}
    fixed('Brand','brand',['B.Braun','BYOND']);fixed('Model','model',['Infusomat Space','Spaceplus','Sunfusion 2']);fixed('Status','status',STATUS);
    setHtml('sdSummaryTable','<div class="csv5-table-wrap csv7-summary-table"><table class="csv5-table"><thead><tr><th>Type</th><th>Name</th><th>Count</th></tr></thead><tbody>'+grouped.map(function(x){return '<tr><td>'+esc(x.type)+'</td><td><b>'+esc(x.name)+'</b></td><td>'+x.count+'</td></tr>';}).join('')+'</tbody></table></div>');
    var map={};rows.forEach(function(d){var l=d.location||'ไม่ระบุ';if(!map[l])map[l]={location:l,total:0,c:countStatus([])};map[l].total++;map[l].c[d.status]++;});var locs=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.total-a.total;});
    setHtml('sdLocationTable','<div class="csv5-table-wrap csv7-summary-table"><table class="csv5-table"><thead><tr><th>Location</th><th>Total</th><th>พร้อมส่ง</th><th>รอสอบเทียบ</th><th>เช่ายืม</th></tr></thead><tbody>'+locs.map(function(x){return '<tr><td><b>'+esc(x.location)+'</b></td><td>'+x.total+'</td><td>'+x.c['พร้อมส่ง']+'</td><td>'+x.c['รอสอบเทียบ']+'</td><td>'+x.c['เช่ายืม']+'</td></tr>';}).join('')+'</tbody></table></div>');
  }

  window.sd_renderFiltered=function(){
    injectStyle();var rows=dashboardRows();renderModelCards(rows);renderKpis(rows);renderTopLocations(rows);window.sd_renderContractSummary();renderSummaries(rows);
    var overdue=rows.filter(function(d){return d.status==='เช่ายืม'&&d.isOverdue;});setText('sdAlertHeaderCount',overdue.length);setText('sdAlertCount',overdue.length);window.CES_STOCK_V7_ALERTS=overdue;
    clearTimeout(window.__cesStockV7ChartTimer);window.__cesStockV7ChartTimer=setTimeout(function(){try{renderCharts(rows);}catch(e){console.warn('[Stock V7 charts]',e);}},60);
  };
  window.sd_renderAll=window.sd_renderFiltered;
  window.sd_openAlertPopup=function(){var rows=window.CES_STOCK_V7_ALERTS||[];if(!window.Swal)return;var body=rows.length?detailTable(rows):'<div class="sp-muted">ไม่มีสัญญาเกินกำหนด</div>';Swal.fire({title:'Rental Alerts',width:1080,html:body,confirmButtonText:'ปิด'});};

  /* Confirm mode selection and every status-changing Check Stock action. */
  var baseSetMode=window.sc_setMode;
  var baseAction=window.sc_action;
  window.sc_requestMode=function(mode){
    var cfg={
      'CHECK-IN':{title:'เลือก Return / Check-In?',text:'ใช้สำหรับรับคืนเครื่องเช่ายืม และเปลี่ยนเป็น รอสอบเทียบ',color:'#059669'},
      'CAL/PM':{title:'เลือก Scan CAL/PM?',text:'ใช้ยืนยันการสอบเทียบ รอสอบเทียบ → พร้อมส่ง',color:'#475569'},
      'CHECK-OUT':{title:'เลือก Check-Out?',text:'ใช้เบิกเครื่องที่ผ่าน CAL/PM แล้ว พร้อมส่ง → เช่ายืม',color:'#2563eb'}
    }[mode];
    if(!cfg||!window.Swal){if(typeof baseSetMode==='function')baseSetMode(mode);return;}
    Swal.fire({title:cfg.title,text:cfg.text,icon:'question',showCancelButton:true,confirmButtonText:'ยืนยันเลือกโหมด',cancelButtonText:'ยกเลิก',confirmButtonColor:cfg.color}).then(function(r){if(!r.isConfirmed)return;if(typeof baseSetMode==='function')baseSetMode(mode);setHtml('scResult','');var k=el('scKeyword');if(k){k.value='';setTimeout(function(){k.focus();},50);}});
  };
  if(typeof baseAction==='function'){
    window.sc_action=function(action,idCode,payload){
      if(action!=='calibrate'&&action!=='recover')return baseAction(action,idCode,payload);
      if(!window.Swal)return baseAction(action,idCode,payload);
      var isCal=action==='calibrate';
      return Swal.fire({title:isCal?'ยืนยันผ่าน Scan CAL/PM?':'ยืนยัน Recover?',html:'<b>'+esc(idCode)+'</b><br><span style="font-size:12px;color:#64748b">'+(isCal?'เปลี่ยนสถานะ รอสอบเทียบ → พร้อมส่ง':'เปลี่ยนสถานะเป็น รอสอบเทียบ')+'</span>',icon:'question',showCancelButton:true,confirmButtonText:'ยืนยัน',confirmButtonColor:isCal?'#475569':'#2563eb'}).then(function(r){if(r.isConfirmed)return baseAction(action,idCode,payload);});
    };
  }

  window.CES_STOCK_V7_RECHECK=function(){var rows=allRows(),contracts=buildContractGroups(rows);var out={version:'V7',total:rows.length,sidebarTitle:Array.from(document.querySelectorAll('#btn-stock_dashboard span')).map(function(x){return x.textContent.trim();}),contractLocations:contracts.length,contractActions:{detail:typeof window.sd_contractDetail==='function',extend:typeof window.sd_contractExtend==='function',return:typeof window.sd_contractReturn==='function',export:typeof window.sd_exportContracts==='function'},checkModeConfirm:typeof window.sc_requestMode==='function',dashboardKpiCards:el('sdKpiGrid')?el('sdKpiGrid').children.length:0};console.log('[CES Stock V7 Recheck]',out);return out;};

  injectStyle();
})();
