/* ============================================================
   CES Stock Pro V3 — Stock_Check_java.html
============================================================ */
let SC = { mode:'CHECK-IN', logs:[] };

function initStockCheckModule(force=false){
  spEnsureStyle();
  sc_loadLogs();
}
function sc_setMode(mode){
  SC.mode=mode;
  document.getElementById('scModeIn')?.classList.toggle('active',mode==='CHECK-IN');
  document.getElementById('scModeIn')?.classList.toggle('in',mode==='CHECK-IN');
  document.getElementById('scModeOut')?.classList.toggle('active',mode==='CHECK-OUT');
  document.getElementById('scModeOut')?.classList.toggle('out',mode==='CHECK-OUT');
  const txt=document.getElementById('scModeText');
  if(txt){txt.style.color=mode==='CHECK-IN'?'#059669':'#dc2626';txt.innerHTML=mode==='CHECK-IN'?'● โหมด: รับเข้าคลัง':'● โหมด: เพิ่มเป็นรายการยืม';}
}
function sc_lookup(){
  const q=spVal('scKeyword','').trim();
  if(!q){Swal.fire('กรุณากรอกรหัส','','info');return;}
  spSetHtml('scResult','<div class="stockpro-card"><div class="sp-muted">กำลังค้นหา...</div></div>');
  google.script.run.withSuccessHandler(res=>{
    if(!res||!res.success){Swal.fire('Check Stock Error',(res&&res.message)||'Lookup failed','error');return;}
    sc_renderResult(res.data||[]);
    sc_loadLogs();
  }).withFailureHandler(err=>Swal.fire('Check Stock Error',err.message||String(err),'error')).sc_lookupStockDevice(q);
}
function sc_renderResult(rows){
  if(!rows.length){spSetHtml('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>');return;}
  spSetHtml('scResult',rows.map(d=>`<div class="stockpro-card">
    <div class="stockpro-card-head"><h3>${spEsc(d.idCode)} ${spBadge(d.status)}</h3><span class="sp-pill">${spEsc(d.brand||'-')}</span></div>
    <div class="sp-result-grid">
      ${sc_field('Serial Number',d.sn)}
      ${sc_field('Model',d.model||d.itemName)}
      ${sc_field('Location',d.location)}
      ${sc_field('Borrower',d.borrower||'-')}
      ${sc_field('Due Date',spFmtDate(d.expectedReturn||d.expectedReturnDate))}
      ${sc_field('Action Required',d.actionRequired||d.recheckNote||'-')}
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="sp-btn success" onclick="sc_record('${spEsc(d.idCode)}','CHECK-IN')"><i class="fas fa-sign-in-alt"></i> Check-In</button>
      <button class="sp-btn danger" onclick="sc_checkoutPrompt('${spEsc(d.idCode)}','${spEsc(d.brand||'')}','${spEsc(d.model||'')}','${spEsc(d.sn||'')}')"><i class="fas fa-sign-out-alt"></i> Check-Out</button>
    </div>
  </div>`).join(''));
}
function sc_field(k,v){return `<div class="sp-field"><div class="k">${spEsc(k)}</div><div class="v">${spEsc(v||'-')}</div></div>`;}
function sc_record(idCode,action,payload={}){
  const p=Object.assign({action,idCode},payload);
  google.script.run.withSuccessHandler(res=>{
    if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');sc_lookup();sc_loadLogs();}
    else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error');
  }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).sc_recordCheckAction(p);
}
function sc_checkoutPrompt(idCode,brand,model,sn){
  Swal.fire({
    title:'Check-Out',
    html:`<input id="swBorrower" class="swal2-input" placeholder="ผู้ยืม / Borrower">
          <input id="swLocation" class="swal2-input" placeholder="สถานที่ / Location">
          <input id="swDue" class="swal2-input" type="date">
          <input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,
    showCancelButton:true,
    confirmButtonText:'ยืนยัน',
    preConfirm:()=>({borrower:document.getElementById('swBorrower').value,location:document.getElementById('swLocation').value,expectedReturnDate:document.getElementById('swDue').value,note:document.getElementById('swNote').value})
  }).then(r=>{
    if(!r.isConfirmed)return;
    const v=r.value;
    if(!v.borrower||!v.location||!v.expectedReturnDate){Swal.fire('ข้อมูลไม่ครบ','','warning');return;}
    sc_record(idCode,'CHECK-OUT',Object.assign(v,{brand,model,serialNumber:sn}));
  });
}
function sc_ocrImage(input){
  const file=input.files&&input.files[0]; if(!file)return;
  if(typeof Tesseract==='undefined'){Swal.fire('OCR Error','Tesseract.js not loaded','error');return;}
  Swal.fire({title:'กำลังอ่านภาพ...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  Tesseract.recognize(file,'eng').then(({data:{text}})=>{
    Swal.close();
    const code=sc_extractCode(text);
    if(code){document.getElementById('scKeyword').value=code;sc_lookup();}
    else Swal.fire('ไม่พบรหัสในภาพ',text.slice(0,300),'warning');
  }).catch(err=>Swal.fire('OCR Error',err.message||String(err),'error'));
}
function sc_extractCode(text){
  const t=String(text||'').toUpperCase().replace(/\s+/g,' ');
  const ces=t.match(/CESR\s*0*\d{1,6}/);
  if(ces) return ces[0].replace(/\s+/g,'').replace(/CESR0*(\d+)/,(_,n)=>'CESR'+String(n).padStart(5,'0'));
  const sn=t.match(/\b\d{8,14}\b/);
  if(sn) return sn[0];
  return '';
}
function sc_loadLogs(){
  google.script.run.withSuccessHandler(res=>{
    SC.logs=res&&res.logs?res.logs:[];
    sc_renderLogs();
  }).sc_getScanLogs(50);
}
function sc_renderLogs(){
  const rows=SC.logs||[];
  if(!rows.length){spSetHtml('scLogTable','<div class="sp-muted">No scan logs</div>');return;}
  spSetHtml('scLogTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Time</th><th>Action</th><th>ID</th><th>Result</th><th>Message</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${spEsc(r.timestamp)}</td><td>${spEsc(r.action)}</td><td><b>${spEsc(r.idCode)}</b></td><td>${spEsc(r.result)}</td><td>${spEsc(r.message)}</td></tr>`).join('')}</tbody></table></div>`);
}
function sc_hideWarning(){document.getElementById('scWarning')?.classList.add('hidden');}


/* ============================================================
   CES Stock Pro V15 — Check Stock Accessories Issue UI
============================================================ */
SC.accessories = SC.accessories || [];
SC.accFiltered = SC.accFiltered || [];

if(typeof window.sc_v15OriginalInit === 'undefined'){
  window.sc_v15OriginalInit = initStockCheckModule;
  initStockCheckModule = function(force=false){ window.sc_v15OriginalInit(force); setTimeout(()=>sc_loadAccessoryOptions(force),250); };
}

function sc_currentRequester_(){
  const u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
  return {id:u.id||'',name:u.name_eng||u.name_th||u.id||'',email:u.email||'',team:u.team||''};
}

function sc_loadAccessoryOptions(force=false){
  google.script.run.withSuccessHandler(res=>{
    if(!res||!res.success)return;
    SC.accessories=res.data||[]; SC.accFiltered=SC.accessories;
    const teams=[...new Set(SC.accessories.map(a=>a.team).filter(Boolean))].sort();
    const teamEl=document.getElementById('scAccTeam'); if(teamEl) teamEl.innerHTML='<option value="all">All Team</option>'+teams.map(t=>`<option value="${spEsc(t)}">${spEsc(t)}</option>`).join('');
    sc_filterAccessoryOptions();
  }).withFailureHandler(err=>console.warn('Accessory options error',err)).sc_getAccessoryLookupOptions();
}

function sc_filterAccessoryOptions(){
  const q=spVal('scAccSearch','').toLowerCase(), team=spVal('scAccTeam','all');
  SC.accFiltered=(SC.accessories||[]).filter(a=>{const text=[a.accessoryId,a.itemName,a.team,a.status,a.actionRequired].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(team!=='all'&&a.team!==team)return false; return true;});
  const sel=document.getElementById('scAccSelect'); if(sel){sel.innerHTML='<option value="">เลือกอุปกรณ์</option>'+SC.accFiltered.map((a,i)=>`<option value="${i}">${spEsc(a.itemName)} (${spEsc(a.team)}) — ${spNum(a.stockQty)} pcs</option>`).join('');}
  sc_previewSelectedAccessory();
}
function sc_previewSelectedAccessory(){
  const i=Number(spVal('scAccSelect','-1')); const a=SC.accFiltered[i];
  if(!a){spSetHtml('scAccPreview','<div class="sp-muted">เลือก accessories เพื่อดูจำนวนคงเหลือ</div>');return;}
  spSetHtml('scAccPreview',`<div class="sp-field"><div class="k">${spEsc(a.team)} • ${spEsc(a.accessoryId)}</div><div class="v">${spEsc(a.itemName)} — คงเหลือ ${spNum(a.stockQty)} / Min ${spNum(a.minStockQty)}</div><div style="margin-top:8px"><input id="scAccQty" type="number" min="1" step="1" value="1" class="stockpro-control" style="max-width:140px;display:inline-block"> <input id="scAccBorrower" class="stockpro-control" style="max-width:240px;display:inline-block" placeholder="ผู้เบิก / requester"> <input id="scAccLocation" class="stockpro-control" style="max-width:240px;display:inline-block" placeholder="แผนก / location"></div></div>`);
}
function sc_issueSelectedAccessory(){
  const i=Number(spVal('scAccSelect','-1')); const a=SC.accFiltered[i]; if(!a){Swal.fire('กรุณาเลือก accessories','','info');return;}
  const qty=Math.max(1,Number(spVal('scAccQty','1'))||1); const stock=Number(a.stockQty||0), min=Number(a.minStockQty||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อนเบิกใช้',`คงเหลือ ${stock} / Min ${min}`,'warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const requester=sc_currentRequester_(); const borrower=spVal('scAccBorrower','').trim()||requester.name||'Accessory Issue'; const location=spVal('scAccLocation','').trim()||requester.team||'Issue';
  Swal.fire({title:'ส่งขออนุมัติเบิก...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{if(res&&res.success){Swal.fire('ส่งขออนุมัติแล้ว',res.message,'success');sc_loadAccessoryOptions(true);sc_loadLogs();}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Request failed','error');}).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).sc_requestAccessoryIssue({accessory:a,qty,borrower,location,requester,note:'Issue from Check Stock'});
}




/* V16 — Check Stock accessory issue UX polish */
if(typeof window.sc_v16OriginalIssueSelectedAccessory==='undefined' && typeof sc_issueSelectedAccessory==='function'){
  window.sc_v16OriginalIssueSelectedAccessory=sc_issueSelectedAccessory;
  sc_issueSelectedAccessory=function(){
    Swal.fire({title:'Sending approval request...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try { window.sc_v16OriginalIssueSelectedAccessory(); } finally { setTimeout(()=>{try{Swal.close();}catch(e){}},1200); }
  };
}
