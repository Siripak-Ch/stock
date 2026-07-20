// ============================================================
// 150-stock-inventory.js — GitHub migrated from Stock_Inventory_java.html
// v14 Inventory migration patch: no HTML <script> wrappers; uses CES gas-polyfill.
// ============================================================

/* ============================================================
   CES Stock Pro V6 — Stock_Inventory_java.html
   Original-based full function: filters, accessories cards, cart,
   rent action, equipment action.
============================================================ */
let SI = { loaded:false, tab:'equip', raw:null, inv:[], acc:[], filtered:[], accFiltered:[], page:1, accPage:1, pageSize:50, cart:[] };

const SI_STATUS_MAP={'Stock':'รอสอบเทียบ','STOCK':'รอสอบเทียบ','AVAILABLE':'รอสอบเทียบ','Available':'รอสอบเทียบ','In-Use':'เช่ายืม','IN_USE':'เช่ายืม','Overdue':'เกินกำหนด','OVERDUE':'เกินกำหนด','Missing':'ไม่พบในรายการ','MISSING':'ไม่พบในรายการ','Broken':'ใช้งานไม่ได้','BROKEN':'ใช้งานไม่ได้','Recheck':'รอสอบเทียบ','RECHECK':'รอสอบเทียบ'};
function si_mapStatus(s){return SI_STATUS_MAP[s]||s;}
function initStockInventoryModule(force=false){
  spEnsureStyle();
  const today=new Date().toISOString().slice(0,10);
  const bd=document.getElementById('siBorrowDate'); if(bd&&!bd.value)bd.value=today;

  const cacheKey='CES_STOCK_INVENTORY_CACHE_V2';
  const cacheTtlMs=15*60*1000;

  function renderInv(res,fromCache){
    if(!res||!res.success){if(!fromCache)Swal.fire('Inventory Error',(res&&res.message)||'Cannot load inventory','error');return;}
    SI.loaded=true;SI.raw=res;SI.inv=res.inventory||[];SI.acc=res.accessories||[];
    try{localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data:res}));}catch(e){}
    si_fillFilters();si_renderKpi();si_applyFilters();
  }

  // Try cache first
  var cacheUsed=false;
  if(!force){
    try{
      const c=JSON.parse(localStorage.getItem(cacheKey)||'null');
      if(c&&c.data){renderInv(c.data,true);cacheUsed=true;if((Date.now()-Number(c.ts||0))<cacheTtlMs)return;}
    }catch(e){}
  }

  if(!cacheUsed) spSetHtml('siTable','<div class="sp-muted">Loading inventory...</div>');
  google.script.run
    .withSuccessHandler(res=>renderInv(res,false))
    .withFailureHandler(err=>{if(!cacheUsed)Swal.fire('Inventory Error',err.message||String(err),'error');})
    .si_getStockInventoryData(force===true);
}
function si_fillFilters(){const f=SI.raw.filters||{};si_fillSelect('siBrand',f.brands,'All Brand');si_fillSelect('siModel',f.models,'All Model');si_fillSelect('siLocation',f.locations,'All Location');si_fillSelect('siStatus',(f.statuses||[]).map(si_mapStatus).filter(function(v,i,a){return a.indexOf(v)===i;}),'All Status');si_fillSelect('siAccType',f.accessoryTypes,'All Type');}
function si_fillSelect(id,arr,label){const el=document.getElementById(id);if(!el)return;const cur=el.value||'all';el.innerHTML=`<option value="all">${label}</option>`+(arr||[]).map(x=>`<option value="${spEsc(x)}">${spEsc(x)}</option>`).join('');el.value=(arr||[]).includes(cur)?cur:'all';}
function si_switchTab(tab){SI.tab=tab;document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip');document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc');document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip');document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc');document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip');document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc');si_applyFilters();}
function si_renderKpi(){const k=SI.raw.kpi||{};const items=[['จำนวนทั้งหมด',k.total,'fa-boxes','#003DA5','#f0f2f5'],['พร้อมส่ง',(k.stock||0),'fa-check-circle','#003DA5','#dbe4ff'],['รอสอบเทียบ',(k.recheck||0),'fa-tools','#5B7F95','#f1f5f9'],['เช่ายืม',(k.inUse||0)+(k.overdue||0),'fa-file-contract','#19a7ce','#e0f7fa']];spSetHtml('siKpiGrid',items.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join(''));}
function si_applyFilters(){if(SI.tab==='equip'){const q=spVal('siSearch','').toLowerCase(),b=spVal('siBrand','all'),m=spVal('siModel','all'),l=spVal('siLocation','all'),s=spVal('siStatus','all');SI.filtered=SI.inv.filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(b!=='all'&&d.brand!==b)return false;if(m!=='all'&&d.model!==m)return false;if(l!=='all'&&d.location!==l)return false;if(s!=='all'&&si_mapStatus(d.status)!==s)return false;return true;});SI.page=1;si_renderTable();}else{const q=spVal('siAccSearch','').toLowerCase(),t=spVal('siAccType','all'),st=spVal('siAccStatus','all');SI.accFiltered=SI.acc.filter(a=>{const text=[a.idCode,a.name,a.type,a.status,a.location,a.remark].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(t!=='all'&&a.type!==t)return false;if(st!=='all'&&a.status!==st)return false;return true;});SI.accPage=1;si_renderAccCards();}}
function si_renderTable(){const start=(SI.page-1)*SI.pageSize,rows=SI.filtered.slice(start,start+SI.pageSize);spSetHtml('siTableCount',`${SI.filtered.length} items`);if(!rows.length){spSetHtml('siTable','<div class="sp-muted">No equipment found</div>');spSetHtml('siPagination','');return;}spSetHtml('siTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td>${start+i+1}</td><td><span class="sp-id">${spEsc(d.idCode)}</span></td><td>${spEsc(d.sn||'-')}</td><td><b>${spEsc(d.brand||'-')}</b><span class="sp-sub">${spEsc(d.model||d.itemName||'-')}</span></td><td>${spBadge(si_mapStatus(d.status))}</td><td>${spEsc(d.borrower||'-')}</td><td>${spEsc(d.location||'-')}</td><td>${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</td><td>${spEsc(d.actionRequired||d.recheckNote||'-')}</td><td>${si_rentButtons(d)}</td><td>${si_equipmentButtons(d)}</td></tr>`).join('')}</tbody></table></div>`);si_renderPagination();}
function si_rentButtons(d){return `<div class="sp-action-group"><button class="sp-icon-btn" title="Add to cart" onclick='si_addEquipmentToCart(${si_json(d)})'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='si_extendPrompt(${si_json(d)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='si_returnPrompt(${si_json(d)})'><i class="fas fa-undo"></i></button></div>`;}
function si_equipmentButtons(d){return `<div class="sp-action-group"><button class="sp-icon-btn" title="Edit" onclick='si_editPrompt(${si_json(d)})'><i class="fas fa-pen-to-square"></i></button><button class="sp-icon-btn gray" title="Mark Broken" onclick='si_markBrokenPrompt(${si_json(d)})'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn red" title="Delete/Hide" onclick='si_deletePrompt(${si_json(d)})'><i class="fas fa-trash"></i></button></div>`;}
function si_json(obj){return JSON.stringify(obj).replace(/'/g,'&#39;').replace(/</g,'&lt;');}
function si_renderPagination(){const total=Math.max(1,Math.ceil(SI.filtered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.page-2),to=Math.min(total,SI.page+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.page?'active':''}" onclick="SI.page=${p};si_renderTable()">${p}</button>`;spSetHtml('siPagination',`<div class="sp-muted">Page ${SI.page} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.page<=1?'disabled':''} onclick="SI.page--;si_renderTable()">Prev</button>${btns}<button ${SI.page>=total?'disabled':''} onclick="SI.page++;si_renderTable()">Next</button></div>`);}
function si_renderAccCards(){const start=(SI.accPage-1)*SI.pageSize,rows=SI.accFiltered.slice(start,start+SI.pageSize);spSetHtml('siAccCount',`${SI.accFiltered.length} items`);if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}spSetHtml('siAccCards',`<div class="sp-acc-grid">${rows.map((a,i)=>si_accCard(a,start+i)).join('')}</div>`);si_renderAccPagination();}
function si_accIcon(type){const t=String(type||'').toLowerCase();if(t.includes('plug'))return 'fa-plug';if(t.includes('clamp'))return 'fa-grip-lines';if(t.includes('battery'))return 'fa-battery-full';if(t.includes('pole'))return 'fa-grip-vertical';return 'fa-puzzle-piece';}
function si_accCard(a,idx){const low=Number(a.qty||0)<=Number(a.minStock||0);const key=a.idCode||a.name||a.type||('ACC'+idx);return `<div class="sp-acc-card"><div class="sp-acc-icon"><i class="fas ${si_accIcon(a.type||a.name)}"></i></div><div class="sp-acc-name">${spEsc(a.name||a.type||'-')}</div><div class="sp-acc-meta">${spEsc(a.type||'-')} • ${spEsc(a.location||'-')}</div><div style="display:flex;align-items:end;justify-content:space-between;margin-top:10px"><div><div class="sp-acc-qty">${spNum(a.qty)}</div><div class="sp-muted">คงเหลือ</div></div><span class="sp-chip ${low?'low':'ok'}">${low?'LOW':'OK'}</span></div><div class="sp-acc-controls"><input id="accQty_${idx}" type="number" min="1" max="${Number(a.qty||0)}" value="1"><button class="sp-btn success" onclick='si_addAccessoryToCart(${si_json(a)},"accQty_${idx}")'><i class="fas fa-cart-plus"></i> ใส่ตะกร้า</button></div><div class="sp-muted" style="margin-top:8px">Min: ${spNum(a.minStock)} • ${spEsc(a.remark||'')}</div></div>`;}
function si_renderAccPagination(){const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.accPage-2),to=Math.min(total,SI.accPage+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 accessories per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);}
function si_addEquipmentToCart(d){if(!d||!d.idCode)return;const mapped=si_mapStatus(d.status);if(mapped!=='รอสอบเทียบ'){Swal.fire('ไม่สามารถเพิ่มได้',`${d.idCode} สถานะ: ${mapped}`,'warning');return;}if(SI.cart.find(x=>x.kind==='equipment'&&x.idCode===d.idCode)){Swal.fire({toast:true,position:'top-end',icon:'info',title:'อยู่ในตะกร้าแล้ว',timer:1200,showConfirmButton:false});return;}SI.cart.push(Object.assign({kind:'equipment',qty:1},d));si_updateCart();Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${d.idCode}`,timer:1200,showConfirmButton:false});}
function si_addAccessoryToCart(a,inputId){const qty=Math.max(1,Number(spVal(inputId,'1'))||1);if(qty>Number(a.qty||0)){Swal.fire('จำนวนไม่พอ',`คงเหลือ ${a.qty}`,'warning');return;}const key=a.idCode||a.name||a.type;const exist=SI.cart.find(x=>x.kind==='accessory'&&(x.idCode||x.name||x.type)===key);if(exist)exist.qty+=qty;else SI.cart.push(Object.assign({kind:'accessory',issueQty:qty,qty:qty},a));si_updateCart();Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.name||a.type} ×${qty}`,timer:1200,showConfirmButton:false});}
function si_updateCart(){spSetHtml('siCartCount',SI.cart.length);spSetHtml('siCartDrawerCount',SI.cart.length);const list=SI.cart.length?SI.cart.map((d,i)=>`<div class="cart-item"><div><b>${d.kind==='accessory'?'🔌 ':'⚙️ '}${spEsc(d.idCode||d.name||d.type)}</b><div class="sp-sub">${d.kind==='accessory'?('Qty: '+spNum(d.qty||d.issueQty||1)):(spEsc(d.brand)+' '+spEsc(d.model))}</div></div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="text-red-500"><i class="fas fa-times-circle"></i></button></div>`).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;spSetHtml('siCartItems',list);}
function si_openCart(){si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';}
function si_closeCart(){document.getElementById('siCartOverlay')?.classList.add('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='-440px';}
function si_submitCheckout(){if(!SI.cart.length){Swal.fire('ตะกร้าว่าง','','info');return;}const borrower=spVal('siBorrower','').trim(),location=spVal('siCheckoutLocation','').trim(),due=spVal('siDueDate','');if(!borrower||!location||!due){Swal.fire('ข้อมูลไม่ครบ','กรุณากรอกผู้ยืม สถานที่ และวันคืน','warning');return;}const equipment=SI.cart.filter(x=>x.kind==='equipment'),accessories=SI.cart.filter(x=>x.kind==='accessory');Swal.fire({title:'บันทึก Check-Out...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});google.script.run.withSuccessHandler(res=>{Swal.close();if(res&&res.success){SI.cart=[];si_updateCart();si_closeCart();initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);Swal.fire('สำเร็จ',res.message,'success');}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Checkout failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_checkoutCart({equipment,accessories,borrower,location,borrowDate:spVal('siBorrowDate',''),expectedReturnDate:due,note:spVal('siNote','')});}
function si_extendPrompt(d){Swal.fire({title:'ต่อสัญญา '+d.idCode,html:`<input id="swDue" class="swal2-input" type="date"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_extendRental({idCode:d.idCode,expectedReturnDate:due,note:spVal('swNote','')});});}
function si_returnPrompt(d){Swal.fire({title:'รับคืน '+d.idCode+'?',html:`<input id="swReturnLoc" class="swal2-input" placeholder="สถานที่รับคืน" value="Warehouse"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,icon:'question',showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_returnEquipment({idCode:d.idCode,location:spVal('swReturnLoc','Warehouse'),note:spVal('swNote','')});});}
function si_editPrompt(d){Swal.fire({title:'Edit Equipment',width:720,html:`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left"><input id="edId" class="swal2-input" placeholder="ID Code" value="${spEsc(d.idCode)}"><input id="edSn" class="swal2-input" placeholder="SN" value="${spEsc(d.sn||'')}"><input id="edBrand" class="swal2-input" placeholder="Brand" value="${spEsc(d.brand||'')}"><input id="edModel" class="swal2-input" placeholder="Model" value="${spEsc(d.model||'')}"><input id="edItem" class="swal2-input" placeholder="Item Name" value="${spEsc(d.itemName||'')}"><input id="edCat" class="swal2-input" placeholder="Category" value="${spEsc(d.category||'')}"><input id="edLoc" class="swal2-input" placeholder="Location" value="${spEsc(d.location||'')}"><select id="edStatus" class="swal2-input"><option value="พร้อมส่ง">พร้อมส่ง</option><option value="เช่ายืม">เช่ายืม</option><option value="รอสอบเทียบ">รอสอบเทียบ</option><option value="ใช้งานไม่ได้">ใช้งานไม่ได้</option><option value="ไม่พบในรายการ">ไม่พบในรายการ</option></select><input id="edAction" class="swal2-input" placeholder="Action Required" value="${spEsc(d.actionRequired||'')}"><input id="edNote" class="swal2-input" placeholder="Recheck Note" value="${spEsc(d.recheckNote||'')}"></div>`,showCancelButton:true,confirmButtonText:'Save',didOpen:()=>{const mapped=si_mapStatus(d.baseStatus||d.status||'พร้อมส่ง');document.getElementById('edStatus').value=mapped;},preConfirm:()=>({originalIdCode:d.idCode,idCode:spVal('edId'),serialNumber:spVal('edSn'),brand:spVal('edBrand'),model:spVal('edModel'),itemName:spVal('edItem'),category:spVal('edCat'),location:spVal('edLoc'),baseStatus:spVal('edStatus'),actionRequired:spVal('edAction'),recheckNote:spVal('edNote')})}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_editEquipment(r.value);});}
function si_markBrokenPrompt(d){Swal.fire({title:'Mark Broken '+d.idCode,html:`<input id="swReason" class="swal2-input" placeholder="สาเหตุ" value="Marked broken"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,icon:'warning',showCancelButton:true,confirmButtonText:'Mark Broken'}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_markEquipmentBroken({idCode:d.idCode,reason:spVal('swReason'),note:spVal('swNote')});});}
function si_deletePrompt(d){Swal.fire({title:'Delete / Hide '+d.idCode+'?',text:'รายการจะถูกซ่อนจาก inventory โดยตั้งสถานะ DELETED',icon:'warning',showCancelButton:true,confirmButtonText:'Delete/Hide',confirmButtonColor:'#E4002B'}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_deleteEquipment({idCode:d.idCode,reason:'Deleted/Hidden from web'});});}
function si_afterAction(res){if(res&&res.success){Swal.fire('สำเร็จ',res.message||'Completed','success');initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error');}
function si_actionError(err){Swal.fire('Error',err.message||String(err),'error');}
function si_exportCurrent(){spDownloadJsonAsExcel(SI.tab==='equip'?SI.filtered:SI.accFiltered,SI.tab==='equip'?'CES_Equipment_List.xlsx':'CES_Accessories_List.xlsx');}



function siEnsureStyleV8(){
  if(document.getElementById('stockpro-inventory-style-v8'))return;
  const style=document.createElement('style');style.id='stockpro-inventory-style-v8';style.textContent=`
    .sp-acc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}.sp-acc-card{border-radius:18px;border:1px solid #e2e8f0;background:#fff;padding:16px;box-shadow:0 4px 16px rgba(30,58,138,.06)}.sp-acc-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}.sp-acc-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:18px}.sp-team-med{background:#f0f2f5;color:#003DA5}.sp-team-lab{background:#f1f5f9;color:#004aad}.sp-team-ehs{background:#e2e8f0;color:#003da5}.sp-team-general{background:#f1f5f9;color:#64748b}.sp-acc-title{font-weight:1000;color:#0f172a;line-height:1.25}.sp-acc-meta{font-size:11px;color:#64748b;margin-top:2px}.sp-acc-stock{font-size:30px;font-weight:1000;line-height:1.1;margin-top:8px}.sp-acc-actions{display:grid;grid-template-columns:72px 1fr auto;gap:8px;margin-top:12px}.sp-acc-actions input{border:1px solid #e2e8f0;border-radius:10px;text-align:center;font-weight:900;padding:8px}.cart-item{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #f0f2f5;background:#f8fafc;border-radius:14px;padding:12px;margin-bottom:10px}.sp-cart-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sp-cart-summary>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px}.sp-cart-summary b{display:block;font-size:11px;color:#64748b}.sp-cart-summary span{font-size:16px;font-weight:1000;color:#0f172a}.sp-action-group{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.sp-icon-btn{width:34px;height:34px;border-radius:10px;border:1px solid #f0f2f5;background:#f5f6f8;color:#003DA5;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-weight:900}.sp-icon-btn.green{background:#f5f6f8;border-color:#bfdbfe;color:#003DA5}.sp-icon-btn.red{background:#fef2f2;border-color:#fecaca;color:#E4002B}.sp-icon-btn.gray{background:#f8fafc;border-color:#e2e8f0;color:#475569}.sp-icon-btn.orange{background:#fef2f2;border-color:#fecaca;color:#e4002b}@media(max-width:780px){.sp-acc-grid{grid-template-columns:1fr}.sp-acc-actions{grid-template-columns:70px 1fr}.sp-acc-actions .sp-btn.warn{grid-column:1/-1}.sp-cart-summary{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
}

/* ============================================================
   CES Stock Pro V8 — ADDITIVE FRONTEND PATCH FROM V6 BASE
   Keeps V6 functions and overrides only UX/rendering for inventory/accessories/cart.
============================================================ */
function si_fillFilters(){
  const f=SI.raw.filters||{};
  si_fillSelect('siBrand',f.brands,'All Brand');
  si_fillSelect('siModel',f.models,'All Model');
  si_fillSelect('siLocation',f.locations,'All Location');
  si_fillSelect('siStatus',(f.statuses||[]).map(si_mapStatus).filter(function(v,i,a){return a.indexOf(v)===i;}),'All Status');
  const teams=[...new Set((SI.acc||[]).map(a=>a.team).filter(Boolean))].sort();
  const items=[...new Set((SI.acc||[]).map(a=>a.itemName||a.name).filter(Boolean))].sort();
  const actions=[...new Set((SI.acc||[]).map(a=>a.actionRequired||a.action_required).filter(Boolean))].sort();
  si_fillSelect('siAccTeam',teams,'All Team');
  si_fillSelect('siAccItem',items,'All Item');
  si_fillSelect('siAccAction',actions,'All Action');
  si_fillSelect('siAccStatus',[...new Set((SI.acc||[]).map(a=>a.status).filter(Boolean))].sort(),'All Status');
}
function si_switchTab(tab){
  SI.tab=tab;
  document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip');
  document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc');
  document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipKpiGrid')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccKpiGrid')?.classList.toggle('hidden',tab!=='acc');
  si_renderKpi();
  si_applyFilters();
}
function si_renderKpi(){
  siEnsureStyleV8();
  const k=SI.raw.kpi||{};
  const eqItems=[['อุปกรณ์หลักทั้งหมด',k.total,'fa-microchip','#003DA5','#f0f2f5'],['พร้อมส่ง', k.stock,'fa-warehouse','#003DA5','#f5f6f8'],['เช่ายืม', k.inUse,'fa-arrow-right-from-bracket','#19a7ce','#e0f7fa'],['เกินกำหนด',k.overdue||0,'fa-clock','#E4002B','#fee2e2'],['ไม่พบในรายการ',k.missing||0,'fa-circle-question','#991b1b','#fee2e2'],['ใช้งานไม่ได้',k.broken||0,'fa-screwdriver-wrench','#64748b','#e2e8f0'],['รอสอบเทียบ',k.recheck||0,'fa-triangle-exclamation','#5B7F95','#f1f5f9'],['RISK',k.risk,'fa-triangle-exclamation','#E4002B','#fee2e2']];
  const accItems=[['Accessories',k.accessories,'fa-plug','#19a7ce','#f1f5f9'],['Total Stock',k.accTotalStock||0,'fa-boxes-stacked','#003DA5','#f5f6f8'],['Low Stock',k.accLow,'fa-battery-quarter','#e4002b','#fef2f2'],['Pending Approval',k.accPending||0,'fa-bell','#003DA5','#f0f2f5'],['Teams',k.accTeams||0,'fa-users','#003DA5','#f0f2f5']];
  const card=i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`;
  spSetHtml('siEquipKpiGrid',eqItems.map(card).join(''));
  spSetHtml('siAccKpiGrid',accItems.map(card).join(''));
  spSetHtml('siKpiGrid',eqItems.concat(accItems).map(card).join(''));
}
function si_applyFilters(){
  if(SI.tab==='equip'){
    const q=spVal('siSearch','').toLowerCase(),b=spVal('siBrand','all'),m=spVal('siModel','all'),l=spVal('siLocation','all'),s=spVal('siStatus','all');
    SI.filtered=SI.inv.filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(b!=='all'&&d.brand!==b)return false;if(m!=='all'&&d.model!==m)return false;if(l!=='all'&&d.location!==l)return false;if(s!=='all'&&si_mapStatus(d.status)!==s)return false;return true;});
    SI.page=1;si_renderTable();
  }else{
    const q=spVal('siAccSearch','').toLowerCase(),team=spVal('siAccTeam','all'),item=spVal('siAccItem','all'),st=spVal('siAccStatus','all'),act=spVal('siAccAction','all');
    SI.accFiltered=SI.acc.filter(a=>{const nm=a.itemName||a.name||'';const ar=a.actionRequired||a.action_required||'';const text=[a.accessoryId,a.idCode,a.team,nm,a.type,a.status,ar,a.location,a.remark].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(team!=='all'&&a.team!==team)return false;if(item!=='all'&&nm!==item)return false;if(st!=='all'&&a.status!==st)return false;if(act!=='all'&&ar!==act)return false;return true;});
    SI.accPage=1;si_renderAccCards();
  }
}
function si_teamClass(team){const t=String(team||'').toUpperCase();if(t.includes('MED'))return 'sp-team-med';if(t.includes('LAB'))return 'sp-team-lab';if(t.includes('EHS'))return 'sp-team-ehs';return 'sp-team-general';}
function si_accIcon(a){const txt=[a.itemName,a.name,a.type].join(' ').toLowerCase();if(txt.includes('battery'))return 'fa-battery-half';if(txt.includes('plug')||txt.includes('cord'))return 'fa-plug';if(txt.includes('cuff'))return 'fa-puzzle-piece';if(txt.includes('pole'))return 'fa-grip-lines-vertical';return 'fa-puzzle-piece';}
function si_renderAccCards(){const start=(SI.accPage-1)*SI.pageSize,rows=SI.accFiltered.slice(start,start+SI.pageSize);spSetHtml('siAccCount',`${SI.accFiltered.length} items`);if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}spSetHtml('siAccCards',`<div class="sp-acc-grid">${rows.map((a,i)=>si_accCard(a,start+i)).join('')}</div>`);const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.accPage-2),to=Math.min(total,SI.accPage+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);}
function si_accCard(a,i){const id=a.accessoryId||a.idCode||a.itemName||a.name;const qty=Number(a.stockQty||a.qty||0),min=Number(a.minStockQty||a.minStock||0);const low=qty<=min;return `<div class="sp-acc-card"><div class="sp-acc-head"><div class="sp-acc-icon ${si_teamClass(a.team)}"><i class="fas ${si_accIcon(a)}"></i></div><div><div class="sp-acc-title">${spEsc(a.itemName||a.name||'-')}</div><div class="sp-acc-meta">${spEsc(a.team||'-')} • ${spEsc(id)}</div></div></div><div><div class="sp-acc-stock" style="color:${low?'#004aad':'#004aad'}">${spNum(qty)}</div><div class="sp-muted">คงเหลือ / Min ${spNum(min)}</div></div><div>${low?'<span class="sp-badge Overdue">LOW</span>':spBadge(a.status||'STOCK')} <span class="sp-pill">${spEsc(a.actionRequired||a.action_required||'No action')}</span></div><div class="sp-acc-actions"><input id="siAccQty_${i}" type="number" min="1" max="${qty}" value="1"><button class="sp-btn success" onclick='si_addAccessoryToCart(${JSON.stringify(a).replace(/'/g,"&#39;")},"siAccQty_${i}")'><i class="fas fa-cart-plus"></i> ใส่ตะกร้า</button><button class="sp-btn warn" onclick='si_restockPrompt(${JSON.stringify(a).replace(/'/g,"&#39;")})'><i class="fas fa-box-open"></i></button></div></div>`;}
function si_addAccessoryToCart(a,inputId){const qty=Math.max(1,Number(spVal(inputId,'1'))||1);const stock=Number(a.stockQty||a.qty||0);if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}const key=a.accessoryId||a.idCode||a.itemName||a.name;const ex=SI.cart.find(x=>x.kind==='accessory'&&(x.accessoryId||x.idCode||x.itemName)===key);if(ex)ex.qty+=qty;else SI.cart.push(Object.assign({kind:'accessory',type:'accessory',qty:qty,accessoryId:key},a));si_updateCart();Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.name} x${qty}`,timer:1400,showConfirmButton:false});}
function si_updateCart(){spSetHtml('siCartCount',SI.cart.length);spSetHtml('siCartDrawerCount',SI.cart.length);const list=SI.cart.length?SI.cart.map((d,i)=>`<div class="cart-item"><div style="min-width:0"><b>${spEsc(d.kind==='accessory'?(d.itemName||d.name):d.idCode)}</b><div class="sp-sub">${d.kind==='accessory'?`Accessory approval • ${spEsc(d.team||'-')} • Qty ${spNum(d.qty)}`:`${spEsc((d.brand||'')+' '+(d.model||''))} • SN:${spEsc(d.sn||'-')} • ${spEsc(d.location||'-')}`}</div></div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="text-red-500"><i class="fas fa-times-circle"></i></button></div>`).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;spSetHtml('siCartItems',list);const eq=SI.cart.filter(x=>x.kind==='equipment').length,acc=SI.cart.filter(x=>x.kind==='accessory').reduce((s,x)=>s+Number(x.qty||1),0);spSetHtml('siCartDetailSummary',`<div class="sp-cart-summary"><div><b>Equipment</b><span>${eq} รายการ</span></div><div><b>Accessories</b><span>${acc} ชิ้น / รออนุมัติ</span></div></div>`);}
function si_submitCheckout(){if(!SI.cart.length){Swal.fire('ตะกร้าว่าง','','info');return;}const borrower=spVal('siBorrower','').trim(),location=spVal('siCheckoutLocation','').trim(),due=spVal('siDueDate','');if(!borrower||!location||!due){Swal.fire('ข้อมูลไม่ครบ','กรุณากรอกผู้ยืม สถานที่ และวันคืน','warning');return;}const equipment=SI.cart.filter(x=>x.kind==='equipment'),accessories=SI.cart.filter(x=>x.kind==='accessory');Swal.fire({title:'บันทึก Check-Out...',html:`Equipment ${equipment.length} รายการ<br>Accessories ${accessories.length} รายการจะส่งขออนุมัติ`,allowOutsideClick:false,didOpen:()=>Swal.showLoading()});google.script.run.withSuccessHandler(res=>{Swal.close();if(res&&res.success){SI.cart=[];si_updateCart();si_closeCart();initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);Swal.fire('สำเร็จ',res.message,'success');}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Checkout failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_checkoutCart({equipment,accessories,borrower,location,borrowDate:spVal('siBorrowDate',''),expectedReturnDate:due,note:spVal('siNote','')});}
function si_extendPrompt(d){const current=d.expectedReturn||d.expectedReturnDate||'';Swal.fire({title:'ต่อสัญญา '+d.idCode,html:`<label class="lbl">วันคืนเดิม</label><input class="swal2-input" value="${spEsc(current||'-')}" disabled><label class="lbl">วันคืนใหม่</label><input id="swDue" class="swal2-input" type="date" value="${spEsc(current)}"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}google.script.run.withSuccessHandler(si_afterAction).withFailureHandler(si_actionError).si_extendRental({idCode:d.idCode,expectedReturnDate:due,note:spVal('swNote','')});});}
function si_restockPrompt(a){Swal.fire({title:`Restock ${spEsc(a.itemName||a.name)}`,html:`<input id="rsQty" class="swal2-input" type="number" min="1" value="1"><input id="rsNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'Restock'}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(res=>{if(res&&res.success){Swal.fire('สำเร็จ',`New Qty: ${res.newQty}`,'success');initStockInventoryModule(true);}else Swal.fire('Error',(res&&res.message)||'Failed','error');}).si_restockAccessory({accessoryId:a.accessoryId||a.idCode||a.itemName,qty:spVal('rsQty','1'),note:spVal('rsNote','')});});}


/* ============================================================
   CES Stock Pro V11 — V8 ORIGINAL ADDITIVE PATCH
   Keeps V8 functions and overrides only final inventory UX layer.
============================================================ */
function si_v11Style(){
  if(document.getElementById('stockpro-inv-v11-style'))return;
  const style=document.createElement('style');style.id='stockpro-inv-v11-style';style.textContent=`
    .sp-cart-fab{position:fixed;right:24px;bottom:28px;width:58px;height:58px;border-radius:999px;border:0;background:#003DA5;color:#fff;z-index:170;box-shadow:0 14px 30px rgba(37,99,235,.34);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:.18s}.sp-cart-fab:hover{transform:translateY(-3px);background:#003DA5}.sp-cart-fab span{position:absolute;right:-5px;top:-5px;background:#E4002B;color:#fff;border-radius:999px;min-width:20px;height:20px;font-size:11px;font-weight:1000;display:flex;align-items:center;justify-content:center;border:2px solid #fff}.sp-compact-table .sp-table th{padding:8px 10px!important;font-size:10px}.sp-compact-table .sp-table td{padding:8px 10px!important;font-size:11px;vertical-align:middle}.sp-compact-table .sp-icon-btn{width:28px;height:28px;border-radius:8px;font-size:11px}.sp-compact-table .sp-action-group{gap:4px;flex-wrap:nowrap}.sp-equip-search-title,.sp-acc-search-title{font-size:16px;font-weight:1000;color:#0f172a;margin:8px 0 8px;display:flex;align-items:center;gap:8px}.sp-acc-grid-v11{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:14px}.sp-acc-card-v11{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px;box-shadow:0 4px 16px rgba(30,58,138,.06);transition:.18s}.sp-acc-card-v11:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(30,58,138,.1)}.sp-acc-card-head-v11{display:flex;gap:12px;align-items:flex-start}.sp-acc-icon-v11{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}.team-med{background:#f0f2f5;color:#003DA5}.team-lab{background:#f1f5f9;color:#004aad}.team-ehs{background:#e2e8f0;color:#003da5}.team-other{background:#f1f5f9;color:#64748b}.sp-acc-name-v11{font-size:15px;font-weight:1000;color:#0f172a;line-height:1.35}.sp-acc-meta-v11{font-size:11px;color:#64748b;margin-top:3px}.sp-acc-stock-v11{display:flex;justify-content:space-between;align-items:flex-end;margin:14px 0 10px}.sp-acc-stock-v11 .num{font-size:30px;font-weight:1000;line-height:1}.sp-acc-control-v11{display:grid;grid-template-columns:72px 1fr 38px;gap:8px;align-items:center}.sp-acc-control-v11 input{border:1px solid #e2e8f0;border-radius:10px;padding:8px;text-align:center;font-weight:900}.sp-acc-control-v11 .sp-btn{padding:8px 10px;font-size:12px}.sp-acc-card-v11.is-low{background:#fef2f2;border-color:#fecaca}.sp-cart-detail-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-bottom:8px}.sp-cart-detail-title{font-weight:1000;color:#0f172a}.sp-cart-detail-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-filter-section-hidden{display:none!important}
    @media(max-width:780px){.sp-cart-fab{right:18px;bottom:18px}.sp-acc-grid-v11{grid-template-columns:1fr}.sp-compact-table .sp-table{font-size:10px}.sp-compact-table .sp-action-group{flex-wrap:wrap}.stockpro-filter-card{grid-template-columns:1fr!important}}
  `;document.head.appendChild(style);
}
function si_fillFilters(){
  const f=SI.raw&&SI.raw.filters||{};
  si_fillSelect('siBrand',f.brands,'All Brand');si_fillSelect('siModel',f.models,'All Model');si_fillSelect('siLocation',f.locations,'All Location');si_fillSelect('siStatus',(f.statuses||[]).map(si_mapStatus).filter(function(v,i,a){return a.indexOf(v)===i;}),'All Status');
  si_fillSelect('siAccTeam',f.accessoryTeams,'All Team');si_fillSelect('siAccItem',f.accessoryItems,'All Item');si_fillSelect('siAccStatus',f.accessoryStatuses,'All Status');si_fillSelect('siAccAction',f.accessoryActions,'All Action');
}
function si_switchTab(tab){
  si_v11Style();SI.tab=tab;
  document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip');
  document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc');
  document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipKpiGrid')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccKpiGrid')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc');
  si_applyFilters();
}
function si_renderKpi(){
  const k=SI.raw&&SI.raw.kpi||{};
  const equip=[['อุปกรณ์หลักทั้งหมด',k.total,'fa-microchip','#003DA5','#f0f2f5'],['พร้อมส่ง', k.stock,'fa-warehouse','#003DA5','#f0f2f5'],['เช่ายืม', k.inUse,'fa-arrow-right-from-bracket','#c7001f','#fee2e2'],['ไม่พร้อมใช้งาน',k.risk,'fa-triangle-exclamation','#E4002B','#fee2e2']];
  const accTotal=SI.acc.length, accStock=SI.acc.reduce((s,a)=>s+Number(a.stockQty||a.qty||0),0), low=SI.acc.filter(a=>Number(a.stockQty||a.qty||0)<=Number(a.minStockQty||a.minStock||0)).length, pending=SI.acc.filter(a=>String(a.status||'').toUpperCase().includes('PENDING')).length;
  const acc=[['ACCESSORIES',accTotal,'fa-plug','#19a7ce','#f1f5f9'],['TOTAL STOCK',accStock,'fa-boxes-stacked','#003DA5','#f0f2f5'],['LOW STOCK',low,'fa-battery-quarter','#e4002b','#fef2f2'],['PENDING APPROVAL',pending,'fa-bell','#003DA5','#f0f2f5']];
  const html=arr=>arr.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join('');
  spSetHtml('siEquipKpiGrid',html(equip));spSetHtml('siAccKpiGrid',html(acc));
}
function si_applyFilters(){
  si_v11Style();
  if(SI.tab==='equip'){
    const q=spVal('siSearch','').toLowerCase(),b=spVal('siBrand','all'),m=spVal('siModel','all'),l=spVal('siLocation','all'),s=spVal('siStatus','all');
    SI.filtered=(SI.inv||[]).filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(b!=='all'&&d.brand!==b)return false;if(m!=='all'&&d.model!==m)return false;if(l!=='all'&&d.location!==l)return false;if(s!=='all'&&si_mapStatus(d.status)!==s)return false;return true;});
    SI.page=1;si_renderTable();
  }else{
    const q=spVal('siAccSearch','').toLowerCase(),team=spVal('siAccTeam','all'),item=spVal('siAccItem','all'),st=spVal('siAccStatus','all'),act=spVal('siAccAction','all');
    SI.accFiltered=(SI.acc||[]).filter(a=>{const name=a.itemName||a.name||'';const text=[a.accessoryId,a.idCode,a.team,name,a.status,a.actionRequired,a.remark].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(team!=='all'&&a.team!==team)return false;if(item!=='all'&&name!==item)return false;if(st!=='all'&&a.status!==st)return false;if(act!=='all'&&(a.actionRequired||'')!==act)return false;return true;});
    SI.accPage=1;si_renderAccCards();
  }
}
function si_renderTable(){
  si_v11Style();const start=(SI.page-1)*SI.pageSize,rows=SI.filtered.slice(start,start+SI.pageSize);spSetHtml('siTableCount',`${SI.filtered.length} items`);
  if(!rows.length){spSetHtml('siTable','<div class="sp-muted">No equipment found</div>');spSetHtml('siPagination','');return;}
  spSetHtml('siTable',`<div class="sp-table-wrap sp-compact-table"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td>${start+i+1}</td><td><span class="sp-id">${spEsc(d.idCode)}</span></td><td>${spEsc(d.sn||'-')}</td><td><b>${spEsc(d.brand||'-')}</b><span class="sp-sub">${spEsc(d.model||d.itemName||'-')}</span></td><td>${spBadge(si_mapStatus(d.status))}</td><td>${spEsc(d.borrower||'-')}</td><td>${spEsc(d.location||'-')}</td><td>${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</td><td>${spEsc(d.actionRequired||d.recheckNote||'-')}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="Add to cart" onclick='si_addEquipmentToCart(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='si_extendPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='si_returnPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-undo"></i></button></div></td><td><div class="sp-action-group"><button class="sp-icon-btn" title="Edit" onclick='si_editPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-edit"></i></button><button class="sp-icon-btn gray" title="Mark broken" onclick='si_markBrokenPrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-tools"></i></button><button class="sp-icon-btn red" title="Delete / Hide" onclick='si_deletePrompt(${JSON.stringify(d).replace(/'/g,"&#39;")})'><i class="fas fa-trash"></i></button></div></td></tr>`).join('')}</tbody></table></div>`);
  si_renderPagination();
}
function si_teamClass(team){const t=String(team||'').toUpperCase();if(t.includes('MED'))return 'team-med';if(t.includes('LAB'))return 'team-lab';if(t.includes('EHS'))return 'team-ehs';return 'team-other';}
function si_accIcon(a){const txt=[a.itemName,a.name,a.type].join(' ').toLowerCase();if(txt.includes('battery'))return 'fa-battery-half';if(txt.includes('plug')||txt.includes('cord'))return 'fa-plug';if(txt.includes('cuff'))return 'fa-puzzle-piece';if(txt.includes('pole'))return 'fa-grip-lines-vertical';if(txt.includes('sensor'))return 'fa-wave-square';return 'fa-puzzle-piece';}
function si_renderAccCards(){
  si_v11Style();const start=(SI.accPage-1)*SI.pageSize,rows=SI.accFiltered.slice(start,start+SI.pageSize);spSetHtml('siAccCount',`${SI.accFiltered.length} items`);
  if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}
  spSetHtml('siAccCards',`<div class="sp-acc-grid-v11">${rows.map((a,i)=>si_accCard(a,start+i)).join('')}</div>`);
  const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.accPage-2),to=Math.min(total,SI.accPage+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;
  spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);
}
function si_accCard(a,i){
  const id=a.accessoryId||a.idCode||a.itemName||a.name;const qty=Number(a.stockQty||a.qty||0),min=Number(a.minStockQty||a.minStock||0);const low=qty<=min;
  return `<div class="sp-acc-card-v11 ${low?'is-low':''}"><div class="sp-acc-card-head-v11"><div class="sp-acc-icon-v11 ${si_teamClass(a.team)}"><i class="fas ${si_accIcon(a)}"></i></div><div><div class="sp-acc-name-v11">${spEsc(a.itemName||a.name||'-')}</div><div class="sp-acc-meta-v11">${spEsc(a.team||'-')} • ${spEsc(id||'-')}</div></div></div><div class="sp-acc-stock-v11"><div><div class="num" style="color:${low?'#E4002B':'#003DA5'}">${spNum(qty)}</div><div class="sp-muted">คงเหลือ / Min ${spNum(min)}</div></div><div>${low?'<span class="sp-chip low">LOW STOCK</span>':spBadge(a.status||'STOCK')}</div></div><div class="sp-muted" style="min-height:18px">${spEsc(a.actionRequired||a.action_required||'No action')}</div><div class="sp-acc-control-v11"><input id="siAccQty_${i}" type="number" min="1" max="${Math.max(1,qty)}" value="1"><button class="sp-btn success" ${low?'disabled style="opacity:.5;cursor:not-allowed"':''} onclick='si_addAccessoryToCart(${JSON.stringify(a).replace(/'/g,"&#39;")},"siAccQty_${i}")'><i class="fas fa-cart-plus"></i> ใส่ตะกร้า</button><button class="sp-btn warn" title="Restock" onclick='si_restockPrompt(${JSON.stringify(a).replace(/'/g,"&#39;")})'><i class="fas fa-box-open"></i></button></div>${low?'<div class="sp-muted" style="color:#c7001f;margin-top:8px;font-weight:900">ต้อง Restock ก่อนเบิกใช้</div>':''}</div>`;
}
function si_addAccessoryToCart(a,inputId){
  const qty=Math.max(1,Number(spVal(inputId,'1'))||1);const stock=Number(a.stockQty||a.qty||0),min=Number(a.minStockQty||a.minStock||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อน','จำนวนคงเหลือน้อยกว่าหรือเท่ากับ Minimum Stock','warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const key=a.accessoryId||a.idCode||a.itemName||a.name;const ex=SI.cart.find(x=>x.kind==='accessory'&&(x.accessoryId||x.idCode||x.itemName)===key);
  if(ex)ex.qty+=qty;else SI.cart.push(Object.assign({kind:'accessory',type:'accessory',qty:qty,accessoryId:key},a));
  si_updateCart();Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.name} x${qty}`,timer:1400,showConfirmButton:false});
}
function si_updateCart(){
  const n=SI.cart.length;spSetHtml('siCartCount',n);spSetHtml('siCartDrawerCount',n);spSetHtml('siCartFabBadge',n);
  const list=n?SI.cart.map((d,i)=>`<div class="sp-cart-detail-card"><div class="sp-cart-detail-title">${d.kind==='accessory'?'🔌 ':'⚙️ '}${spEsc(d.idCode||d.accessoryId||d.itemName||d.name||'-')}</div><div class="sp-cart-detail-sub">${d.kind==='accessory'?`Accessory • ${spEsc(d.team||'-')} • Qty: ${spNum(d.qty||1)}`:`${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')}`}</div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="sp-btn ghost" style="margin-top:8px;padding:6px 10px"><i class="fas fa-times"></i> Remove</button></div>`).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;
  spSetHtml('siCartItems',list);
  const eq=SI.cart.filter(x=>x.kind!=='accessory').length, acc=SI.cart.filter(x=>x.kind==='accessory').reduce((s,x)=>s+Number(x.qty||1),0);
  spSetHtml('siCartDetailSummary',`<div class="sp-cart-detail-card"><b>Summary</b><div class="sp-cart-detail-sub">Equipment: ${spNum(eq)} รายการ • Accessories: ${spNum(acc)} ชิ้น</div></div>`);
}
function si_openCart(){si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';}



/* ============================================================
   CES Stock Pro V12 — Inventory additive UI patch
   Requirement:
   1) Checkout cart floating circular icon at bottom-left and click again to hide.
   2) Equipment tab shows only equipment filter/KPI/list; Accessories tab shows only accessories filter/KPI/list.
   3) Equipment table is compact, single-line, with smaller icons.
   4) Accessories quantity step = 1, default = 1, blocked when stock <= min stock.
   5) Edit min stock directly from accessory card.
   Additive only: overrides public functions by same name; no V8/V11 function is deleted.
============================================================ */
function si_v12Style(){
  if(document.getElementById('stockpro-inventory-v12-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v12-style';
  st.textContent=`
    #view-inventory .sp-cart-fab{left:24px!important;right:auto!important;bottom:28px!important;width:60px!important;height:60px!important;z-index:190!important;background:rgba(0,61,165,0.1)!important;box-shadow:0 16px 34px rgba(37,99,235,.38)!important}
    #view-inventory .sp-cart-fab.is-open{background:rgba(0,61,165,0.1)!important}
    #view-inventory #siCartDrawer{right:-520px;transition:right .28s cubic-bezier(.4,0,.2,1)}
    #view-inventory .sp-tab-hidden{display:none!important}
    #view-inventory .sp-compact-table .sp-table{font-size:11px!important;table-layout:auto}
    #view-inventory .sp-compact-table .sp-table th{padding:7px 8px!important;font-size:10px!important;white-space:nowrap}
    #view-inventory .sp-compact-table .sp-table td{padding:7px 8px!important;line-height:1.25!important;vertical-align:middle!important;white-space:nowrap}
    #view-inventory .sp-compact-table .sp-id{font-size:12px!important;line-height:1!important}
    #view-inventory .sp-compact-table .sp-sub{font-size:9.5px!important;line-height:1.15!important;margin-top:1px!important}
    #view-inventory .sp-compact-table .sp-badge{font-size:10px!important;padding:3px 7px!important}
    #view-inventory .sp-action-group{display:flex;gap:4px!important;align-items:center;justify-content:flex-start;flex-wrap:nowrap!important}
    #view-inventory .sp-icon-btn{width:27px!important;height:27px!important;border-radius:8px!important;font-size:11px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid #bfdbfe;background:#f5f6f8;color:#003DA5;cursor:pointer;transition:.16s}
    #view-inventory .sp-icon-btn:hover{transform:translateY(-1px);filter:brightness(.98)}
    #view-inventory .sp-icon-btn.orange{background:#fef2f2!important;border-color:#fecaca!important;color:#e4002b!important}
    #view-inventory .sp-icon-btn.green{background:#f5f6f8!important;border-color:#bfdbfe!important;color:#003DA5!important}
    #view-inventory .sp-icon-btn.gray{background:#f8fafc!important;border-color:#e2e8f0!important;color:#475569!important}
    #view-inventory .sp-icon-btn.red{background:#fef2f2!important;border-color:#fecaca!important;color:#e4002b!important}
    #view-inventory .sp-acc-grid-v12{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
    #view-inventory .sp-acc-card-v12{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px;box-shadow:0 4px 16px rgba(30,58,138,.06);transition:.18s;position:relative;overflow:hidden}
    #view-inventory .sp-acc-card-v12:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(30,58,138,.1)}
    #view-inventory .sp-acc-card-v12.is-low{background:#fef2f2;border-color:#fecaca}
    #view-inventory .sp-acc-head-v12{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
    #view-inventory .sp-acc-icon-v12{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}
    #view-inventory .team-med{background:#f0f2f5;color:#003DA5}.team-lab{background:#f1f5f9;color:#004aad}.team-ehs{background:#e2e8f0;color:#003da5}.team-other{background:#f1f5f9;color:#64748b}
    #view-inventory .sp-acc-name-v12{font-size:15px;font-weight:1000;color:#0f172a;line-height:1.35}.sp-acc-meta-v12{font-size:11px;color:#64748b;margin-top:3px}
    #view-inventory .sp-acc-stock-v12{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:10px 0 10px}.sp-acc-stock-v12 .num{font-size:30px;font-weight:1000;line-height:1}
    #view-inventory .sp-acc-stepper-v12{display:grid;grid-template-columns:34px 58px 34px 1fr 38px 38px;gap:7px;align-items:center;margin-top:10px}.sp-acc-stepper-v12 input{height:34px;border:1px solid #e2e8f0;border-radius:10px;text-align:center;font-weight:1000;color:#0f172a}.sp-qty-btn{height:34px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;font-weight:1000;cursor:pointer}.sp-qty-btn:hover{background:#f5f6f8}.sp-acc-stepper-v12 .sp-btn{height:34px;padding:0 10px;font-size:12px}.sp-acc-stepper-v12 .sp-mini-btn{height:34px;width:38px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#e4002b;cursor:pointer}.sp-acc-stepper-v12 .sp-mini-btn.blue{border-color:#bfdbfe;background:#f5f6f8;color:#003DA5}
    @media(max-width:780px){#view-inventory .sp-cart-fab{left:16px!important;bottom:16px!important}.sp-acc-grid-v12{grid-template-columns:1fr}.sp-acc-stepper-v12{grid-template-columns:34px 58px 34px 1fr;}.sp-acc-stepper-v12 .sp-mini-btn{width:100%}}
  `;
  document.head.appendChild(st);
}
function si_v12SetVisible(id,show){const el=document.getElementById(id);if(!el)return;el.classList.toggle('hidden',!show);el.classList.toggle('sp-tab-hidden',!show);}
function si_switchTab(tab){
  si_v11Style();si_v12Style();SI.tab=tab;
  document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip');
  document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc');
  si_v12SetVisible('siEquipFilters',tab==='equip');
  si_v12SetVisible('siEquipKpiGrid',tab==='equip');
  si_v12SetVisible('siEquipSection',tab==='equip');
  si_v12SetVisible('siAccFilters',tab==='acc');
  si_v12SetVisible('siAccKpiGrid',tab==='acc');
  si_v12SetVisible('siAccSection',tab==='acc');
  si_applyFilters();
}
function si_applyFilters(){
  si_v11Style();si_v12Style();
  if(SI.tab==='equip'){
    const q=spVal('siSearch','').toLowerCase(),b=spVal('siBrand','all'),m=spVal('siModel','all'),l=spVal('siLocation','all'),s=spVal('siStatus','all');
    SI.filtered=(SI.inv||[]).filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(b!=='all'&&d.brand!==b)return false;if(m!=='all'&&d.model!==m)return false;if(l!=='all'&&d.location!==l)return false;if(s!=='all'&&si_mapStatus(d.status)!==s)return false;return true;});
    SI.page=1;si_renderTable();
  }else{
    const q=spVal('siAccSearch','').toLowerCase(),team=spVal('siAccTeam','all'),item=spVal('siAccItem','all'),st=spVal('siAccStatus','all'),act=spVal('siAccAction','all');
    SI.accFiltered=(SI.acc||[]).filter(a=>{const name=a.itemName||a.name||'';const text=[a.accessoryId,a.idCode,a.team,name,a.status,a.actionRequired,a.remark].join(' ').toLowerCase();if(q&&!text.includes(q))return false;if(team!=='all'&&a.team!==team)return false;if(item!=='all'&&name!==item)return false;if(st!=='all'&&a.status!==st)return false;if(act!=='all'&&(a.actionRequired||'')!==act)return false;return true;});
    SI.accPage=1;si_renderAccCards();
  }
}
function si_renderTable(){
  si_v11Style();si_v12Style();const start=(SI.page-1)*SI.pageSize,rows=SI.filtered.slice(start,start+SI.pageSize);spSetHtml('siTableCount',`${SI.filtered.length} items`);
  if(!rows.length){spSetHtml('siTable','<div class="sp-muted">No equipment found</div>');spSetHtml('siPagination','');return;}
  spSetHtml('siTable',`<div class="sp-table-wrap sp-compact-table"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Rent Action</th><th>Equipment Action</th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td>${start+i+1}</td><td><span class="sp-id">${spEsc(d.idCode)}</span></td><td>${spEsc(d.sn||'-')}</td><td><b>${spEsc(d.brand||'-')}</b><span class="sp-sub">${spEsc(d.model||d.itemName||'-')}</span></td><td>${spBadge(si_mapStatus(d.status))}</td><td>${spEsc(d.borrower||'-')}</td><td>${spEsc(d.location||'-')}</td><td>${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</td><td>${spEsc(d.actionRequired||d.recheckNote||'-')}</td><td>${si_rentButtons(d)}</td><td>${si_equipmentButtons(d)}</td></tr>`).join('')}</tbody></table></div>`);
  si_renderPagination();
}
function si_accQtyChange(inputId,delta,max){
  const el=document.getElementById(inputId);if(!el)return;let v=Math.max(1,Number(el.value||1)+Number(delta||0));if(max)v=Math.min(Number(max),v);el.value=v;
}
function si_renderAccCards(){
  si_v11Style();si_v12Style();const start=(SI.accPage-1)*SI.pageSize,rows=SI.accFiltered.slice(start,start+SI.pageSize);spSetHtml('siAccCount',`${SI.accFiltered.length} items`);
  if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}
  spSetHtml('siAccCards',`<div class="sp-acc-grid-v12">${rows.map((a,i)=>si_accCard(a,start+i)).join('')}</div>`);
  const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.accPage-2),to=Math.min(total,SI.accPage+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;
  spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 accessories per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);
}
function si_accCard(a,i){
  const id=a.accessoryId||a.idCode||a.itemName||a.name;const qty=Number(a.stockQty||a.qty||0),min=Number(a.minStockQty||a.minStock||0);const low=qty<=min;const qid=`siAccQty_${i}`;
  return `<div class="sp-acc-card-v12 ${low?'is-low':''}"><div class="sp-acc-head-v12"><div class="sp-acc-icon-v12 ${si_teamClass(a.team)}"><i class="fas ${si_accIcon(a)}"></i></div><div><div class="sp-acc-name-v12">${spEsc(a.itemName||a.name||'-')}</div><div class="sp-acc-meta-v12">${spEsc(a.team||'-')} • ${spEsc(id||'-')}</div></div></div><div class="sp-acc-stock-v12"><div><div class="num" style="color:${low?'#E4002B':'#003DA5'}">${spNum(qty)}</div><div class="sp-muted">คงเหลือ / Min ${spNum(min)}</div></div><div>${low?'<span class="sp-chip low">LOW STOCK</span>':spBadge(a.status||'STOCK')}</div></div><div class="sp-muted" style="min-height:18px">${spEsc(a.actionRequired||a.action_required||'No action')}</div><div class="sp-acc-stepper-v12"><button class="sp-qty-btn" onclick="si_accQtyChange('${qid}',-1,${Math.max(1,qty)})">−</button><input id="${qid}" type="number" min="1" max="${Math.max(1,qty)}" step="1" value="1" oninput="this.value=Math.max(1,Math.floor(Number(this.value)||1))"><button class="sp-qty-btn" onclick="si_accQtyChange('${qid}',1,${Math.max(1,qty)})">+</button><button class="sp-btn success" ${low?'disabled style="opacity:.5;cursor:not-allowed"':''} onclick='si_addAccessoryToCart(${JSON.stringify(a).replace(/'/g,"&#39;")},"${qid}")'><i class="fas fa-cart-plus"></i> ใส่ตะกร้า</button><button class="sp-mini-btn" title="Restock" onclick='si_restockPrompt(${JSON.stringify(a).replace(/'/g,"&#39;")})'><i class="fas fa-box-open"></i></button><button class="sp-mini-btn blue" title="Edit Min Stock" onclick='si_editMinStockPrompt(${JSON.stringify(a).replace(/'/g,"&#39;")})'><i class="fas fa-sliders"></i></button></div>${low?'<div class="sp-muted" style="color:#c7001f;margin-top:8px;font-weight:900">ต้อง Restock ก่อนเบิกใช้</div>':''}</div>`;
}
function si_addAccessoryToCart(a,inputId){
  const qty=Math.max(1,Math.floor(Number(spVal(inputId,'1'))||1));const stock=Number(a.stockQty||a.qty||0),min=Number(a.minStockQty||a.minStock||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อน','จำนวนคงเหลือน้อยกว่าหรือเท่ากับ Minimum Stock','warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const key=a.accessoryId||a.idCode||a.itemName||a.name;const ex=SI.cart.find(x=>x.kind==='accessory'&&(x.accessoryId||x.idCode||x.itemName)===key);
  if(ex)ex.qty+=qty;else SI.cart.push(Object.assign({kind:'accessory',type:'accessory',qty:qty,issueQty:qty,accessoryId:key},a));
  si_updateCart();Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.name} x${qty}`,timer:1400,showConfirmButton:false});
}
function si_editMinStockPrompt(a){
  const current=Number(a.minStockQty||a.minStock||0);const key=a.accessoryId||a.idCode||a.itemName||a.name;
  Swal.fire({title:'Edit Minimum Stock',html:`<div style="text-align:left"><p style="font-weight:800;margin-bottom:8px">${spEsc(a.itemName||a.name||key)}</p><input id="swMinStock" type="number" min="0" step="1" class="swal2-input" value="${current}" placeholder="Minimum stock"></div>`,showCancelButton:true,confirmButtonText:'Save',preConfirm:()=>({accessoryId:key,minStockQty:Math.max(0,Math.floor(Number(document.getElementById('swMinStock')?.value||0)))})}).then(r=>{if(!r.isConfirmed)return;google.script.run.withSuccessHandler(res=>{if(res&&res.success){Swal.fire('Saved',res.message,'success');initStockInventoryModule(true);}else Swal.fire('Error',(res&&res.message)||'Cannot update min stock','error');}).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryMinStock(r.value);});
}
function si_isCartOpen(){const d=document.getElementById('siCartDrawer');return !!(d&&d.style.right==='0px');}
function si_toggleCart(){si_isCartOpen()?si_closeCart():si_openCart();}
function si_openCart(){si_v12Style();si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';document.getElementById('siCartFab')?.classList.add('is-open');}
function si_closeCart(){document.getElementById('siCartOverlay')?.classList.add('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='-520px';document.getElementById('siCartFab')?.classList.remove('is-open');}
function si_updateCart(){
  const n=SI.cart.length;spSetHtml('siCartCount',n);spSetHtml('siCartDrawerCount',n);spSetHtml('siCartFabBadge',n);
  const list=n?SI.cart.map((d,i)=>`<div class="sp-cart-detail-card"><div class="sp-cart-detail-title">${d.kind==='accessory'?'🔌 ':'⚙️ '}${spEsc(d.idCode||d.accessoryId||d.itemName||d.name||'-')}</div><div class="sp-cart-detail-sub">${d.kind==='accessory'?`Accessory • ${spEsc(d.team||'-')} • Qty: ${spNum(d.qty||d.issueQty||1)} pcs`:`${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')}`}</div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="sp-btn ghost" style="margin-top:8px;padding:6px 10px"><i class="fas fa-times"></i> Remove</button></div>`).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;
  spSetHtml('siCartItems',list);
  const eq=SI.cart.filter(x=>x.kind!=='accessory').length, acc=SI.cart.filter(x=>x.kind==='accessory').reduce((s,x)=>s+Number(x.qty||x.issueQty||1),0);
  spSetHtml('siCartDetailSummary',`<div class="sp-cart-detail-card"><b>Summary</b><div class="sp-cart-detail-sub">Equipment: ${spNum(eq)} รายการ • Accessories: ${spNum(acc)} pcs</div></div>`);
}



/* ============================================================
   CES Stock Pro V13 — Inventory cart + accessory UX patch
   Base: V8/V11/V12. Additive only; old functions remain above.
   Fixes:
   1) Accessory cart quantity uses selected issue quantity, not stock_qty.
   2) Floating cart icon moved to right-bottom; toggles drawer.
   3) Accessory card spacing/grid improved.
   4) Header Setting button for min stock config.
   5) Header History button for activity/history popup.
============================================================ */
function si_v13Style(){
  if(document.getElementById('stockpro-inventory-v13-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v13-style';
  st.textContent=`
    #view-inventory .sp-cart-fab{right:24px!important;left:auto!important;bottom:28px!important;width:62px!important;height:62px!important;border-radius:999px!important;z-index:190!important;background:rgba(0,61,165,0.1)!important;color:#fff!important;box-shadow:0 18px 36px rgba(37,99,235,.42)!important;display:flex!important;align-items:center!important;justify-content:center!important;}
    #view-inventory .sp-cart-fab i{font-size:20px!important;}
    #view-inventory .sp-cart-fab.is-open{background:rgba(0,61,165,0.1)!important;}
    #view-inventory #siCartFabBadge{position:absolute;top:-5px;right:-5px;min-width:22px;height:22px;border-radius:999px;background:#E4002B;color:#fff;font-size:11px;font-weight:1000;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff;}
    #view-inventory #siCartDrawer{right:-520px;transition:right .28s cubic-bezier(.4,0,.2,1);}
    #view-inventory .sp-acc-grid-v12{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(285px,1fr))!important;gap:18px!important;align-items:stretch!important;}
    #view-inventory .sp-acc-card-v12{padding:18px!important;border-radius:20px!important;min-height:230px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;}
    #view-inventory .sp-acc-head-v12{gap:14px!important;margin-bottom:14px!important;}
    #view-inventory .sp-acc-icon-v12{width:50px!important;height:50px!important;border-radius:16px!important;font-size:18px!important;}
    #view-inventory .sp-acc-name-v12{font-size:16px!important;line-height:1.35!important;word-break:break-word!important;}
    #view-inventory .sp-acc-meta-v12{font-size:11px!important;color:#64748b!important;}
    #view-inventory .sp-acc-stepper-v12{grid-template-columns:36px 64px 36px minmax(88px,1fr) 40px 40px!important;gap:8px!important;}
    #view-inventory .sp-acc-stepper-v12 input{height:36px!important;font-size:14px!important;}
    #view-inventory .sp-qty-btn,#view-inventory .sp-acc-stepper-v12 .sp-mini-btn{height:36px!important;}
    #view-inventory .sp-acc-stepper-v12 .sp-btn{height:36px!important;font-size:12px!important;padding:0 10px!important;}
    #view-inventory .sp-cart-detail-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:12px 14px;margin-bottom:10px;}
    #view-inventory .sp-cart-detail-title{font-size:14px;font-weight:1000;color:#0f172a;}
    #view-inventory .sp-cart-detail-sub{font-size:11px;color:#64748b;margin-top:2px;}
    #view-inventory .sp-cart-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    #view-inventory .sp-cart-summary>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;}
    #view-inventory .sp-cart-summary b{font-size:12px;color:#0f172a;display:block;}.sp-cart-summary span{font-size:12px;color:#64748b;}
    .si-history-list{max-height:60vh;overflow:auto;text-align:left}.si-history-item{display:flex;gap:10px;align-items:flex-start;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:10px;margin-bottom:8px}.si-history-dot{width:10px;height:10px;border-radius:50%;background:#003DA5;margin-top:5px;flex:none}.si-history-title{font-weight:900;color:#0f172a;font-size:13px}.si-history-sub{font-size:11px;color:#64748b;margin-top:2px}
    .si-minstock-table{width:100%;border-collapse:collapse;font-size:12px}.si-minstock-table th{background:#f8fafc;text-align:left;color:#475569;font-size:11px;padding:8px;border-bottom:1px solid #e2e8f0}.si-minstock-table td{padding:8px;border-bottom:1px solid #f1f5f9}.si-minstock-table input{width:76px;border:1px solid #e2e8f0;border-radius:10px;padding:6px;text-align:center;font-weight:900;}
    @media(max-width:780px){#view-inventory .sp-cart-fab{right:16px!important;bottom:18px!important;width:56px!important;height:56px!important;}#view-inventory .sp-acc-grid-v12{grid-template-columns:1fr!important;}#view-inventory .sp-acc-stepper-v12{grid-template-columns:36px 64px 36px 1fr!important;}#view-inventory .sp-acc-stepper-v12 .sp-mini-btn{width:100%!important;}}
  `;
  document.head.appendChild(st);
}

function si_addAccessoryToCart(a,inputId){
  si_v13Style();
  const issueQty=Math.max(1,Math.floor(Number(spVal(inputId,'1'))||1));
  const stock=Number(a.stockQty||a.stock_qty||a.qty||0);
  const min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อน','จำนวนคงเหลือน้อยกว่าหรือเท่ากับ Minimum Stock','warning');return;}
  if(issueQty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const key=String(a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name||'').trim();
  if(!key){Swal.fire('ไม่พบรหัสอุปกรณ์เสริม','','warning');return;}
  const existing=SI.cart.find(x=>x.kind==='accessory'&&String(x.accessoryId||x.idCode||x.itemName||x.name)===key);
  if(existing){ existing.issueQty=Number(existing.issueQty||existing.qty||0)+issueQty; existing.qty=existing.issueQty; }
  else{
    const item=Object.assign({},a,{kind:'accessory',type:'accessory',accessoryId:key,issueQty:issueQty,qty:issueQty,stockQty:stock,originalStockQty:stock});
    SI.cart.push(item);
  }
  si_updateCart();
  Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.item_name||a.name||key} x${issueQty}`,timer:1400,showConfirmButton:false});
}

function si_updateCart(){
  si_v13Style();
  const n=SI.cart.length;
  spSetHtml('siCartCount',n);spSetHtml('siCartDrawerCount',n);spSetHtml('siCartFabBadge',n);
  const list=n?SI.cart.map((d,i)=>{
    const isAcc=d.kind==='accessory';
    const qty=Number(d.issueQty||d.qty||1);
    const name=d.itemName||d.item_name||d.name||d.accessoryId||d.idCode||'-';
    const sub=isAcc?`Accessory • ${spEsc(d.team||'-')} • Qty: ${spNum(qty)} pcs`:`${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')} • ${spEsc(d.location||'-')}`;
    return `<div class="sp-cart-detail-card"><div class="sp-cart-detail-title">${isAcc?'🔌 ':'⚙️ '}${spEsc(name)}</div><div class="sp-cart-detail-sub">${sub}</div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="sp-btn ghost" style="margin-top:8px;padding:6px 10px"><i class="fas fa-times"></i> Remove</button></div>`;
  }).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;
  spSetHtml('siCartItems',list);
  const eq=SI.cart.filter(x=>x.kind!=='accessory').length;
  const acc=SI.cart.filter(x=>x.kind==='accessory').reduce((s,x)=>s+Number(x.issueQty||x.qty||1),0);
  spSetHtml('siCartDetailSummary',`<div class="sp-cart-detail-card"><b>Summary</b><div class="sp-cart-detail-sub">Equipment: ${spNum(eq)} รายการ • Accessories: ${spNum(acc)} pcs</div></div>`);
}

function si_openCart(){si_v13Style();si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';document.getElementById('siCartFab')?.classList.add('is-open');}
function si_closeCart(){document.getElementById('siCartOverlay')?.classList.add('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='-520px';document.getElementById('siCartFab')?.classList.remove('is-open');}
function si_toggleCart(){const d=document.getElementById('siCartDrawer');(d&&d.style.right==='0px')?si_closeCart():si_openCart();}

function si_openMinStockConfig(){
  si_v13Style();
  const rows=(SI.accFiltered&&SI.accFiltered.length?SI.accFiltered:SI.acc||[]).slice(0,80);
  if(!rows.length){Swal.fire('ไม่มีข้อมูล Accessories','','info');return;}
  const html=`<div style="text-align:left;max-height:62vh;overflow:auto"><table class="si-minstock-table"><thead><tr><th>Team</th><th>Item</th><th>Stock</th><th>Min Stock</th></tr></thead><tbody>${rows.map((a,i)=>{const key=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name;const min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);const stock=Number(a.stockQty||a.stock_qty||a.qty||0);return `<tr><td>${spEsc(a.team||'-')}</td><td><b>${spEsc(a.itemName||a.item_name||a.name||'-')}</b><div class="sp-sub">${spEsc(key||'-')}</div></td><td>${spNum(stock)}</td><td><input id="siMin_${i}" type="number" min="0" step="1" value="${min}" data-key="${spEsc(key||'')}"></td></tr>`;}).join('')}</tbody></table><div class="sp-muted" style="margin-top:8px">แสดงสูงสุด 80 รายการตาม filter ปัจจุบัน</div></div>`;
  Swal.fire({title:'ตั้งค่า Minimum Stock',html:html,width:820,showCancelButton:true,confirmButtonText:'Save All',preConfirm:()=>rows.map((a,i)=>({accessoryId:a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name,minStockQty:Math.max(0,Math.floor(Number(document.getElementById('siMin_'+i)?.value||0)))}))}).then(r=>{
    if(!r.isConfirmed)return;
    google.script.run.withSuccessHandler(res=>{if(res&&res.success){Swal.fire('Saved',res.message,'success');initStockInventoryModule(true);}else Swal.fire('Error',(res&&res.message)||'Cannot save','error');}).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryMinStockBatch({items:r.value});
  });
}

function si_openInventoryHistory(){
  si_v13Style();
  Swal.fire({title:'กำลังโหลด History...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{
    const rows=(res&&res.success&&res.logs)?res.logs:[];
    const html=rows.length?`<div class="si-history-list">${rows.map(x=>`<div class="si-history-item"><div class="si-history-dot"></div><div><div class="si-history-title">${spEsc(x.action||'-')} ${x.refId?('• '+spEsc(x.refId)):''}</div><div class="si-history-sub">${spEsc(x.detail||x.message||'')}<br>${spEsc(x.timestamp||'')} ${x.user?('• '+spEsc(x.user)):''}</div></div></div>`).join('')}</div>`:'<div class="sp-muted">ไม่พบประวัติย้อนหลัง</div>';
    Swal.fire({title:'Inventory History',html:html,width:760,confirmButtonText:'Close'});
  }).withFailureHandler(err=>Swal.fire('History Error',err.message||String(err),'error')).si_getInventoryHistory(80);
}

// Ensure V13 style is active after module init as well.
try{si_v13Style();}catch(e){}



/* ============================================================
   CES Stock Pro V14 — Inventory UX final patch
   Additive only over V13:
   1) Cart FAB fixed at bottom-right.
   2) Header actions are compact icon-only.
   3) History follows current tab: Equipment or Accessories.
   4) Keeps equipment/accessory tab isolation and cart behavior.
============================================================ */
function si_v14Style(){
  if(document.getElementById('stockpro-inventory-v14-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v14-style';
  st.textContent=`
    #view-inventory .si-header-actions-v14{gap:6px!important;align-items:center!important;flex-wrap:wrap!important;justify-content:flex-end!important;}
    #view-inventory .si-icon-only{width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;border-radius:12px!important;font-size:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:0!important;}
    #view-inventory .si-icon-only i{font-size:14px!important;margin:0!important;}
    #view-inventory .si-icon-only #siCartCount{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:999px;background:#E4002B;color:#fff;font-size:10px!important;line-height:20px;text-align:center;border:2px solid #fff;padding:0 5px;}
    #view-inventory .stockpro-header-card{padding:18px!important;}
    #view-inventory .stockpro-title-wrap h1{font-size:22px!important;}
    #view-inventory .stockpro-title-wrap p{font-size:10px!important;letter-spacing:.32em!important;}
    #view-inventory .sp-tabs{margin-bottom:10px!important;}
    #view-inventory .sp-tab{padding:8px 14px!important;font-size:12px!important;}
    #view-inventory .stockpro-filter-card{margin-bottom:14px!important;}
    #view-inventory .sp-cart-fab{left:auto!important;right:24px!important;bottom:26px!important;width:60px!important;height:60px!important;border-radius:999px!important;z-index:190!important;background:rgba(0,61,165,0.1)!important;color:#fff!important;box-shadow:0 18px 36px rgba(37,99,235,.42)!important;display:flex!important;align-items:center!important;justify-content:center!important;}
    #view-inventory .sp-cart-fab i{font-size:20px!important;}
    #view-inventory .sp-cart-fab.is-open{background:rgba(0,61,165,0.1)!important;}
    #view-inventory #siCartFabBadge{position:absolute!important;top:-6px!important;right:-6px!important;min-width:22px!important;height:22px!important;border-radius:999px!important;background:#E4002B!important;color:#fff!important;font-size:11px!important;font-weight:1000!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0 5px!important;border:2px solid #fff!important;}
    #view-inventory #siCartDrawer{right:-520px;transition:right .28s cubic-bezier(.4,0,.2,1)!important;}
    #view-inventory .sp-acc-grid-v12{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;gap:20px!important;}
    #view-inventory .sp-acc-card-v12{min-height:238px!important;}
    .si-history-scope-pill{display:inline-flex;align-items:center;gap:6px;background:#f5f6f8;color:#003DA5;border:1px solid #bfdbfe;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;margin-bottom:10px;}
    @media(max-width:780px){#view-inventory .sp-cart-fab{right:16px!important;bottom:18px!important;width:56px!important;height:56px!important;}#view-inventory .si-header-actions-v14{justify-content:flex-start!important}.stockpro-actions .si-icon-only{width:36px!important;height:36px!important;min-width:36px!important}}
  `;
  document.head.appendChild(st);
}

function si_toggleCart(){
  si_v14Style();
  const d=document.getElementById('siCartDrawer');
  const isOpen=d && d.style.right==='0px';
  if(isOpen) si_closeCart(); else si_openCart();
}

function si_openCart(){
  si_v13Style();si_v14Style();si_updateCart();
  document.getElementById('siCartOverlay')?.classList.remove('hidden');
  const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';
  document.getElementById('siCartFab')?.classList.add('is-open');
}
function si_closeCart(){
  document.getElementById('siCartOverlay')?.classList.add('hidden');
  const d=document.getElementById('siCartDrawer');if(d)d.style.right='-520px';
  document.getElementById('siCartFab')?.classList.remove('is-open');
}

function si_openInventoryHistory(){
  si_v13Style();si_v14Style();
  const scope = SI.tab === 'acc' ? 'accessories' : 'equipment';
  const label = SI.tab === 'acc' ? 'Accessories History' : 'Equipment History';
  Swal.fire({title:'กำลังโหลด History...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{
    const rows=(res&&res.success&&res.logs)?res.logs:[];
    const html=rows.length?`<div class="si-history-scope-pill"><i class="fas ${scope==='accessories'?'fa-plug':'fa-microchip'}"></i>${label}</div><div class="si-history-list">${rows.map(x=>`<div class="si-history-item"><div class="si-history-dot"></div><div><div class="si-history-title">${spEsc(x.action||'-')} ${x.refId?('• '+spEsc(x.refId)):''}</div><div class="si-history-sub">${spEsc(x.detail||x.message||'')}<br>${spEsc(x.timestamp||'')} ${x.user?('• '+spEsc(x.user)):''}</div></div></div>`).join('')}</div>`:`<div class="si-history-scope-pill"><i class="fas ${scope==='accessories'?'fa-plug':'fa-microchip'}"></i>${label}</div><div class="sp-muted">ไม่พบประวัติย้อนหลังของหน้านี้</div>`;
    Swal.fire({title:label,html:html,width:760,confirmButtonText:'Close'});
  }).withFailureHandler(err=>Swal.fire('History Error',err.message||String(err),'error')).si_getInventoryHistory({scope:scope,limit:80});
}

// Re-wrap init to ensure V14 CSS is always applied after page render.
if(typeof window.si_v14OriginalInitInventory === 'undefined'){
  window.si_v14OriginalInitInventory = initStockInventoryModule;
  initStockInventoryModule = function(force=false){
    si_v14Style();
    window.si_v14OriginalInitInventory(force);
    setTimeout(()=>{try{si_v14Style();si_switchTab(SI.tab||'equip');si_updateCart();}catch(e){}},250);
  };
}
try{si_v14Style();}catch(e){}



/* ============================================================
   CES Stock Pro V15 — Inventory UX/Approval Patch
   Keeps existing public functions, overrides only final behavior.
============================================================ */
function si_v15Style(){
  if(document.getElementById('stockpro-inventory-v15-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v15-style';
  st.textContent=`
    #view-inventory .sp-cart-fab{position:fixed!important;right:24px!important;left:auto!important;bottom:24px!important;top:auto!important;width:60px!important;height:60px!important;border-radius:999px!important;z-index:210!important;background:#003DA5!important;color:#fff!important;box-shadow:0 18px 36px rgba(37,99,235,.38)!important;display:flex!important;align-items:center!important;justify-content:center!important;border:0!important;}
    #view-inventory #siCartFabBadge{position:absolute!important;top:-6px!important;right:-6px!important;min-width:22px!important;height:22px!important;border-radius:999px!important;background:#E4002B!important;color:#fff!important;font-size:11px!important;font-weight:900!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid #fff!important;}
    #view-inventory .si-icon-only{width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;font-size:0!important;border-radius:12px!important;position:relative!important;}
    #view-inventory .si-icon-only i{font-size:14px!important;}
    #view-inventory .si-icon-only #siCartCount,#view-inventory #siLowStockHeaderCount{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:999px;background:#E4002B;color:#fff;font-size:10px!important;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 5px;}
    #view-inventory .sp-acc-list{display:flex;flex-direction:column;gap:10px;}
    #view-inventory .sp-acc-row{display:grid;grid-template-columns:42px 1.7fr .7fr .7fr .7fr 190px 130px;gap:10px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px 14px;box-shadow:0 3px 12px rgba(15,23,42,.04);}
    #view-inventory .sp-acc-row.low{border-color:#fecaca;background:#fef2f2;}
    #view-inventory .sp-acc-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f0f2f5;color:#003DA5;}
    #view-inventory .sp-acc-icon.med{background:#f0f2f5;color:#003DA5}#view-inventory .sp-acc-icon.lab{background:#f0f2f5;color:#003da5}#view-inventory .sp-acc-icon.ehs{background:#f0f2f5;color:#003da5}#view-inventory .sp-acc-icon.tes{background:#fee2e2;color:#c7001f}
    #view-inventory .sp-acc-title{font-weight:900;color:#0f172a;font-size:13px}.sp-acc-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-acc-num{font-weight:1000;font-size:18px}.sp-acc-min{font-size:11px;color:#64748b}.sp-acc-actions{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}.sp-acc-actions input{width:54px;text-align:center;border:1px solid #e2e8f0;border-radius:10px;height:32px;font-weight:900}.sp-mini-btn{width:32px;height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px}.sp-mini-btn.green{background:#003DA5;color:#fff;border-color:#003DA5}.sp-mini-btn.orange{background:#fef2f2;color:#e4002b;border-color:#fecaca}.sp-mini-btn.blue{background:#f5f6f8;color:#003DA5;border-color:#bfdbfe}.sp-mini-btn:disabled{opacity:.45;cursor:not-allowed}
    @media(max-width:980px){#view-inventory .sp-acc-row{grid-template-columns:42px 1fr;align-items:start}#view-inventory .sp-acc-actions{grid-column:1/-1}#view-inventory .sp-cart-fab{right:16px!important;bottom:18px!important;width:56px!important;height:56px!important}}
  `;
  document.head.appendChild(st);
}

function si_v15ApplyCurrentUser_(){
  const u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
  return {id:u.id||'',name:u.name_eng||u.name_th||u.id||'',email:u.email||'',team:u.team||''};
}

function si_v15SyncLowStockCount(){
  const n=(SI.acc||[]).filter(a=>Number(a.stockQty||a.qty||0)<=Number(a.minStockQty||a.minStock||0)).length;
  const el=document.getElementById('siLowStockHeaderCount'); if(el)el.textContent=n>99?'99+':n;
}

function si_renderAccCards(){
  si_v15Style();
  const start=(SI.accPage-1)*SI.pageSize, rows=SI.accFiltered.slice(start,start+SI.pageSize);
  spSetHtml('siAccCount',`${SI.accFiltered.length} items`); si_v15SyncLowStockCount();
  if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}
  spSetHtml('siAccCards',`<div class="sp-acc-list">${rows.map((a,i)=>si_accRow(a,start+i)).join('')}</div>`); si_renderAccPagination();
}
function si_accRow(a,i){
  const key=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name||('acc'+i);
  const team=String(a.team||a.type||'OTHER').toUpperCase(); const stock=Number(a.stockQty||a.stock_qty||a.qty||0); const min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0); const low=stock<=min;
  const inputId='siAccQty_'+i;
  const teamCls=team.includes('MED')?'med':team.includes('LAB')?'lab':team.includes('EHS')?'ehs':team.includes('TES')?'tes':'other';
  return `<div class="sp-acc-row ${low?'low':''}"><div class="sp-acc-icon ${teamCls}"><i class="fas fa-plug"></i></div><div><div class="sp-acc-title">${spEsc(a.itemName||a.item_name||a.name||'-')}</div><div class="sp-acc-sub">${spEsc(team)} • ${spEsc(key)}</div></div><div><div class="sp-acc-sub">Stock</div><div class="sp-acc-num" style="color:${low?'#004aad':'#004aad'}">${spNum(stock)}</div></div><div><div class="sp-acc-sub">Min</div><div class="sp-acc-min">${spNum(min)}</div></div><div>${low?'<span class="sp-chip low">LOW STOCK</span>':'<span class="sp-chip ok">OK</span>'}<div class="sp-acc-sub">${spEsc(a.actionRequired||a.action_required||'')}</div></div><div class="sp-acc-actions"><button class="sp-mini-btn" onclick="si_accQtyChange('${inputId}',-1)">−</button><input id="${inputId}" type="number" min="1" step="1" value="1"><button class="sp-mini-btn" onclick="si_accQtyChange('${inputId}',1)">+</button><button class="sp-mini-btn green" ${low?'disabled':''} title="Add to cart" onclick='si_addAccessoryToCart(${si_json(a)},"${inputId}")'><i class="fas fa-cart-plus"></i></button></div><div class="sp-acc-actions"><button class="sp-mini-btn orange" title="Restock" onclick='si_restockPrompt(${si_json(a)})'><i class="fas fa-box-open"></i></button><button class="sp-mini-btn blue" title="Min Stock" onclick='si_editMinStockPrompt(${si_json(a)})'><i class="fas fa-sliders"></i></button></div></div>`;
}

function si_addAccessoryToCart(a,inputId){
  const qty=Math.max(1,Math.floor(Number(spVal(inputId,'1'))||1));
  const stock=Number(a.stockQty||a.stock_qty||a.qty||0), min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อนเบิกใช้',`คงเหลือ ${stock} / Min ${min}`,'warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const key=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.name;
  const ex=SI.cart.find(x=>x.kind==='accessory'&&(x.accessoryId||x.idCode||x.itemName)===key);
  if(ex){ex.qty+=qty;ex.issueQty=ex.qty;} else SI.cart.push(Object.assign({},a,{kind:'accessory',type:'accessory',accessoryId:key,qty:qty,issueQty:qty,stockQty:stock}));
  si_updateCart(); Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.name} x${qty}`,timer:1200,showConfirmButton:false});
}

function si_openAccessoryLowStockAlerts(){
  const rows=(SI.acc||[]).filter(a=>Number(a.stockQty||a.qty||0)<=Number(a.minStockQty||a.minStock||0));
  const html=rows.length?`<div class="sp-acc-list">${rows.map((a,i)=>si_accRow(a,i)).join('')}</div>`:'<div class="sp-muted">ไม่มีรายการถึง Min Stock</div>';
  Swal.fire({title:'Low Stock Accessories',html:html,width:900,confirmButtonText:'Close'});
}

function si_submitCheckout(){
  if(!SI.cart.length){Swal.fire('ตะกร้าว่าง','','info');return;}
  const borrower=spVal('siBorrower','').trim(),location=spVal('siCheckoutLocation','').trim(),due=spVal('siDueDate','');
  if(!borrower||!location||!due){Swal.fire('ข้อมูลไม่ครบ','กรุณากรอกผู้ยืม สถานที่ และวันคืน','warning');return;}
  const equipment=SI.cart.filter(x=>x.kind==='equipment'), accessories=SI.cart.filter(x=>x.kind==='accessory'); const requester=si_v15ApplyCurrentUser_();
  Swal.fire({title:'บันทึก Check-Out...',html:`Equipment ${equipment.length} รายการ<br>Accessories ${accessories.reduce((s,x)=>s+Number(x.qty||1),0)} pcs จะส่งขออนุมัติก่อนตัด stock`,allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close();if(res&&res.success){SI.cart=[];si_updateCart();si_closeCart();initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);Swal.fire('สำเร็จ',res.message,'success');}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Checkout failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_checkoutCart({equipment,accessories,borrower,location,borrowDate:spVal('siBorrowDate',''),expectedReturnDate:due,note:spVal('siNote',''),requester});
}

function si_openCart(){si_v15Style();si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';document.getElementById('siCartFab')?.classList.add('is-open');}
function si_closeCart(){document.getElementById('siCartOverlay')?.classList.add('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='-520px';document.getElementById('siCartFab')?.classList.remove('is-open');}
function si_toggleCart(){const d=document.getElementById('siCartDrawer');(d&&d.style.right==='0px')?si_closeCart():si_openCart();}

if(typeof window.si_v15OriginalInitInventory==='undefined'){
  window.si_v15OriginalInitInventory=initStockInventoryModule;
  initStockInventoryModule=function(force=false){si_v15Style();window.si_v15OriginalInitInventory(force);setTimeout(()=>{try{si_v15Style();si_v15SyncLowStockCount();si_switchTab(SI.tab||'equip');si_updateCart();}catch(e){}},350);};
}
try{si_v15Style();}catch(e){}




/* ============================================================
   CES Stock Pro V16 — Inventory UI/UX patch
   - Force cart FAB right-bottom.
   - Accessories as readable horizontal list/table.
   - Drawer fields reset after checkout.
   - Loading UX on header actions.
   - Scoped history only current tab.
============================================================ */
function si_v16Style(){
  if(document.getElementById('stockpro-inventory-v16-style')) return;
  const st=document.createElement('style'); st.id='stockpro-inventory-v16-style';
  st.textContent=`
    #view-inventory .sp-cart-fab{position:fixed!important;right:24px!important;left:auto!important;bottom:24px!important;top:auto!important;width:58px!important;height:58px!important;border-radius:999px!important;background:#003DA5!important;color:white!important;z-index:220!important;box-shadow:0 16px 30px rgba(37,99,235,.35)!important;display:flex!important;align-items:center!important;justify-content:center!important;border:none!important;}
    #view-inventory #siCartFabBadge{position:absolute!important;top:-8px!important;right:-8px!important;background:#E4002B!important;color:white!important;border-radius:999px!important;min-width:20px!important;height:20px!important;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;}
    #view-inventory .si-icon-only{width:36px!important;height:36px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:13px!important;border-radius:11px!important;}
    #view-inventory .si-icon-only span:not(#siCartCount):not(#siLowStockHeaderCount){display:none!important;}
    #view-inventory .sp-acc-list{display:flex;flex-direction:column;gap:10px;}
    #view-inventory .sp-acc-row{display:grid;grid-template-columns:46px 1.3fr .8fr .7fr .7fr 1fr 240px;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px 14px;box-shadow:0 2px 8px rgba(15,23,42,.04);}
    #view-inventory .sp-acc-row.low{background:#fef2f2;border-color:#fecaca;}
    #view-inventory .sp-acc-row .acc-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:15px;}
    #view-inventory .team-med{background:#f0f2f5;color:#003DA5}#view-inventory .team-lab{background:#f1f5f9;color:#003da5}#view-inventory .team-ehs{background:#e2e8f0;color:#003da5}#view-inventory .team-tes{background:#f0f2f5;color:#003da5}#view-inventory .team-other{background:#f1f5f9;color:#475569}
    #view-inventory .acc-title{font-weight:900;color:#0f172a;line-height:1.15}.acc-sub{font-size:11px;color:#64748b;margin-top:2px}.acc-stock{font-size:20px;font-weight:900}.acc-min{font-size:11px;color:#64748b}.acc-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}.acc-actions input{width:58px;height:34px;border:1px solid #cbd5e1;border-radius:10px;text-align:center;font-weight:900;background:#f8fafc}.acc-mini{width:34px;height:34px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:900}.acc-mini.green{background:#003DA5;color:white;border-color:#003DA5}.acc-mini.orange{background:#fef2f2;color:#e4002b;border-color:#fecaca}.acc-mini.blue{background:#f5f6f8;color:#003DA5;border-color:#bfdbfe}.acc-mini:disabled{opacity:.45;cursor:not-allowed;background:#e2e8f0;color:#64748b;border-color:#cbd5e1}
    #view-inventory .sp-cart-detail-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:10px}.sp-cart-detail-title{font-weight:900;color:#0f172a}.sp-cart-detail-sub{font-size:12px;color:#64748b;margin-top:3px}
    @media(max-width:900px){#view-inventory .sp-acc-row{grid-template-columns:42px 1fr;align-items:start}#view-inventory .sp-acc-row>div:not(:first-child):not(:nth-child(2)){grid-column:2}.acc-actions{justify-content:flex-start}#view-inventory .sp-cart-fab{right:16px!important;bottom:18px!important}}
  `;
  document.head.appendChild(st);
}
function si_v16ApplyCartPosition(){
  si_v16Style();
  const fab=document.getElementById('siCartFab');
  if(fab){fab.style.position='fixed';fab.style.right='24px';fab.style.left='auto';fab.style.bottom='24px';fab.style.top='auto';}
}
function si_v16TeamClass(team){const t=String(team||'').toUpperCase();if(t.includes('MED'))return'team-med';if(t.includes('LAB'))return'team-lab';if(t.includes('EHS'))return'team-ehs';if(t.includes('TES'))return'team-tes';return'team-other';}
function si_v16AccIcon(a){const txt=[a.itemName,a.name,a.type].join(' ').toLowerCase();if(txt.includes('battery'))return'fa-battery-half';if(txt.includes('plug')||txt.includes('cord'))return'fa-plug';if(txt.includes('cuff'))return'fa-puzzle-piece';if(txt.includes('sensor'))return'fa-wave-square';if(txt.includes('pole'))return'fa-grip-lines-vertical';return'fa-puzzle-piece';}
function si_switchTab(tab){
  si_v16Style(); SI.tab=tab;
  ['siTabEquip','siTabAcc'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
  document.getElementById(tab==='equip'?'siTabEquip':'siTabAcc')?.classList.add('active');
  document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipKpiGrid')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccKpiGrid')?.classList.toggle('hidden',tab!=='acc');
  document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip');
  document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc');
  si_applyFilters(); si_v16ApplyCartPosition();
}
function si_renderAccCards(){
  si_v16Style();
  const start=(SI.accPage-1)*SI.pageSize,rows=SI.accFiltered.slice(start,start+SI.pageSize);
  spSetHtml('siAccCount',`${SI.accFiltered.length} items`);
  if(!rows.length){spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');spSetHtml('siAccPagination','');return;}
  spSetHtml('siAccCards',`<div class="sp-acc-list">${rows.map((a,i)=>si_v16AccRow(a,start+i)).join('')}</div>`);
  const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));let btns='';const from=Math.max(1,SI.accPage-2),to=Math.min(total,SI.accPage+2);for(let p=from;p<=to;p++)btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;
  spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);
}
function si_v16AccRow(a,i){
  const id=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.name||('ACC'+i);
  const name=a.itemName||a.item_name||a.name||'-';
  const qty=Number(a.stockQty||a.stock_qty||a.qty||0), min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  const low=qty<=min, inputId=`siAccQty_${i}`;
  return `<div class="sp-acc-row ${low?'low':''}"><div class="acc-ico ${si_v16TeamClass(a.team)}"><i class="fas ${si_v16AccIcon(a)}"></i></div><div><div class="acc-title">${spEsc(name)}</div><div class="acc-sub">${spEsc(a.team||'-')} • ${spEsc(id)}</div></div><div><div class="acc-stock" style="color:${low?'#E4002B':'#003DA5'}">${spNum(qty)}</div><div class="acc-min">Stock qty</div></div><div><b>${spNum(min)}</b><div class="acc-min">Min stock</div></div><div>${low?'<span class="sp-badge Overdue">LOW STOCK</span>':spBadge(a.status||'STOCK')}</div><div class="acc-sub">${spEsc(a.actionRequired||a.action_required||'No action')}</div><div class="acc-actions"><button class="acc-mini" onclick="si_v16Qty('${inputId}',-1)">−</button><input id="${inputId}" type="number" min="1" step="1" value="1"><button class="acc-mini" onclick="si_v16Qty('${inputId}',1)">+</button><button class="acc-mini green" ${low?'disabled':''} title="Add to cart" onclick='si_addAccessoryToCart(${si_json(a)},"${inputId}")'><i class="fas fa-cart-plus"></i></button><button class="acc-mini orange" title="Restock" onclick='si_restockPrompt(${si_json(a)})'><i class="fas fa-box-open"></i></button><button class="acc-mini blue" title="Min stock" onclick='si_editMinStockPrompt(${si_json(a)})'><i class="fas fa-sliders"></i></button></div></div>`;
}
function si_v16Qty(id,delta){const el=document.getElementById(id);if(!el)return;el.value=Math.max(1,(Number(el.value)||1)+Number(delta||0));}
function si_addAccessoryToCart(a,inputId){
  si_v16Style();
  const qty=Math.max(1,Number(spVal(inputId,'1'))||1);
  const stock=Number(a.stockQty||a.stock_qty||a.qty||0), min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อนเบิกใช้','จำนวนคงเหลือเท่ากับหรือต่ำกว่า minimum stock','warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const key=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.name;
  const ex=SI.cart.find(x=>x.kind==='accessory'&&(x.accessoryId||x.idCode||x.itemName)===key);
  if(ex){ex.issueQty=Number(ex.issueQty||ex.qty||0)+qty;ex.qty=ex.issueQty;} else SI.cart.push(Object.assign({},a,{kind:'accessory',type:'accessory',accessoryId:key,issueQty:qty,qty:qty,stockQty:stock}));
  si_updateCart(); si_v16ApplyCartPosition();
  Swal.fire({toast:true,position:'top-end',icon:'success',title:`เพิ่ม ${a.itemName||a.name||key} x${qty}`,timer:1200,showConfirmButton:false});
}
function si_updateCart(){
  si_v16Style();
  const n=SI.cart.length;spSetHtml('siCartCount',n);spSetHtml('siCartDrawerCount',n);spSetHtml('siCartFabBadge',n);const badge=document.getElementById('siCartFabBadge');if(badge)badge.style.display=n?'flex':'none';
  const list=n?SI.cart.map((d,i)=>{const isAcc=d.kind==='accessory';const qty=Number(d.issueQty||d.qty||1);const name=isAcc?(d.itemName||d.item_name||d.name||d.accessoryId||d.idCode):(d.idCode||d.sn||'-');const sub=isAcc?`Accessory • ${spEsc(d.team||'-')} • Qty: ${spNum(qty)} pcs`:`${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')}`;return `<div class="sp-cart-detail-card"><div class="sp-cart-detail-title">${isAcc?'🔌 ':'⚙️ '}${spEsc(name)}</div><div class="sp-cart-detail-sub">${sub}</div><button onclick="SI.cart.splice(${i},1);si_updateCart()" class="sp-btn ghost" style="margin-top:8px;padding:6px 10px"><i class="fas fa-times"></i> Remove</button></div>`;}).join(''):`<div class="sp-muted text-center py-10">ตะกร้าว่าง</div>`;
  spSetHtml('siCartItems',list);
  const eq=SI.cart.filter(x=>x.kind==='equipment').length, acc=SI.cart.filter(x=>x.kind==='accessory').reduce((s,x)=>s+Number(x.issueQty||x.qty||1),0);
  spSetHtml('siCartDetailSummary',`<div class="sp-cart-detail-card"><b>Summary</b><div class="sp-cart-detail-sub">Equipment: ${spNum(eq)} รายการ • Accessories: ${spNum(acc)} pcs ${acc?'(รออนุมัติ)':''}</div></div>`);
}
function si_openCart(){si_v16Style();si_updateCart();document.getElementById('siCartOverlay')?.classList.remove('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='0';si_v16ApplyCartPosition();}
function si_closeCart(){document.getElementById('siCartOverlay')?.classList.add('hidden');const d=document.getElementById('siCartDrawer');if(d)d.style.right='-520px';si_v16ApplyCartPosition();}
function si_toggleCart(){const d=document.getElementById('siCartDrawer');(d&&d.style.right==='0px')?si_closeCart():si_openCart();}
function si_v16ResetCheckoutFields(){['siBorrower','siCheckoutLocation','siNote'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const bd=document.getElementById('siBorrowDate');if(bd)bd.value=new Date().toISOString().slice(0,10);const due=document.getElementById('siDueDate');if(due)due.value='';}
function si_submitCheckout(){
  if(!SI.cart.length){Swal.fire('ตะกร้าว่าง','','info');return;}
  const borrower=spVal('siBorrower','').trim(),location=spVal('siCheckoutLocation','').trim(),borrowDate=spVal('siBorrowDate',''),due=spVal('siDueDate',''),note=spVal('siNote','');
  const equipment=SI.cart.filter(x=>x.kind==='equipment'), accessories=SI.cart.filter(x=>x.kind==='accessory');
  if(!borrower||!location||!borrowDate){Swal.fire('ข้อมูลไม่ครบ','กรุณากรอกผู้เบิก / สถานที่ / วันที่เบิกออก','warning');return;}
  if(equipment.length && !due){Swal.fire('ข้อมูลไม่ครบ','รายการ Equipment ต้องมีวันคืน','warning');return;}
  const requester=si_v15ApplyCurrentUser_?si_v15ApplyCurrentUser_():{};
  Swal.fire({title:'กำลังส่งรายการ...',html:`Equipment ${equipment.length} รายการ<br>Accessories ${accessories.reduce((s,x)=>s+Number(x.issueQty||x.qty||1),0)} pcs`,allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close();if(res&&res.success){SI.cart=[];si_updateCart();si_closeCart();si_v16ResetCheckoutFields();initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);Swal.fire('สำเร็จ',res.message,'success');}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Checkout failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_checkoutCart({equipment,accessories,borrower,location,borrowDate,expectedReturnDate:due,note,requester});
}
function si_openInventoryHistory(){
  const scope=SI.tab==='acc'?'accessories':'equipment';
  Swal.fire({title:'Loading history...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close();if(!res||!res.success){Swal.fire('History Error',(res&&res.message)||'Cannot load history','error');return;}const logs=res.logs||[];const html=logs.length?`<div class="si-history-list">${logs.map(l=>`<div class="si-history-item"><span class="dot"></span><div><b>${spEsc(l.action||'-')}</b><div>${spEsc(l.refId||'')} ${spEsc(l.detail||'')}</div><small>${spEsc(l.timestamp||'')} • ${spEsc(l.user||'')} • ${spEsc(l.source||'')}</small></div></div>`).join('')}</div>`:'<div class="sp-muted">No history</div>';Swal.fire({title:(scope==='accessories'?'Accessories':'Equipment')+' History',html,width:760,confirmButtonText:'Close'});}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_getInventoryHistory({scope,limit:100});
}
function si_openAccessoryLowStockAlerts(){
  Swal.fire({title:'Loading alerts...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close();const rows=(res&&res.data)||[];const html=rows.length?`<div class="si-history-list">${rows.map(a=>`<div class="si-history-item"><span class="dot warn"></span><div><b>${spEsc(a.itemName||a.name||'-')}</b><div>${spEsc(a.team||'-')} • ${spEsc(a.accessoryId||a.idCode||'')} • Stock ${spNum(a.stockQty||a.qty)} / Min ${spNum(a.minStockQty||a.minStock)}</div><small>${spEsc(a.actionRequired||'Restock required')}</small></div></div>`).join('')}</div>`:'<div class="sp-muted">No low stock items</div>';Swal.fire({title:'Low Stock Accessories',html,width:760,confirmButtonText:'Close'});}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_getAccessoryLowStockAlerts();
}
if(typeof window.si_v16OriginalInitInventory==='undefined'){
  window.si_v16OriginalInitInventory=initStockInventoryModule;
  initStockInventoryModule=function(force=false){ if(force)Swal.fire({title:'Resync inventory...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()}); window.si_v16OriginalInitInventory(force); setTimeout(()=>{if(force)Swal.close();si_v16Style();si_v16ApplyCartPosition();si_switchTab(SI.tab||'equip');},900); };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(si_v16ApplyCartPosition,500));


/* ============================================================
   CES Stock Pro V17 — Inventory final UI/behavior patch
============================================================ */
function si_v17Style(){
  if(document.getElementById('stockpro-inventory-v17-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v17-style';
  st.textContent=`
    #view-inventory .hidden{display:none!important}
    #siCartFab,#view-inventory .sp-cart-fab{position:fixed!important;right:24px!important;left:auto!important;bottom:24px!important;top:auto!important;width:58px!important;height:58px!important;border-radius:999px!important;background:#003DA5!important;color:#fff!important;z-index:9999!important;box-shadow:0 18px 38px rgba(37,99,235,.35)!important;display:flex!important;align-items:center!important;justify-content:center!important;border:0!important}
    #siCartFabBadge{position:absolute!important;top:-7px!important;right:-7px!important;min-width:22px!important;height:22px!important;border-radius:999px!important;background:#E4002B!important;color:#fff!important;font-size:11px!important;font-weight:900!important;border:2px solid #fff!important;display:flex!important;align-items:center!important;justify-content:center!important}
    #view-inventory .si-icon-only{width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;font-size:0!important;border-radius:12px!important;position:relative!important}
    #view-inventory .si-icon-only i{font-size:14px!important}
    #view-inventory #siLowStockHeaderCount,#view-inventory #siCartCount{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;border-radius:999px;background:#E4002B;color:#fff;font-size:10px!important;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 5px}
    #view-inventory .sp-table td{padding:10px 12px!important;font-size:12px!important;vertical-align:middle!important;line-height:1.25!important}
    #view-inventory .sp-table th{padding:10px 12px!important;font-size:11px!important}
    #view-inventory .sp-icon-btn{width:30px!important;height:30px!important;border-radius:9px!important;font-size:12px!important}
    #view-inventory .sp-acc-list-v17{display:flex;flex-direction:column;gap:10px}
    #view-inventory .sp-acc-row-v17{display:grid;grid-template-columns:42px 1.65fr .65fr .65fr .85fr 1.35fr 190px;gap:12px;align-items:center;border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 3px 12px rgba(15,23,42,.04)}
    #view-inventory .sp-acc-row-v17.low{border-color:#fecaca;background:#fef2f2}
    #view-inventory .acc-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f0f2f5;color:#003DA5}
    #view-inventory .acc-ico.med{background:#f0f2f5;color:#003DA5}#view-inventory .acc-ico.lab{background:#f0f2f5;color:#003da5}#view-inventory .acc-ico.ehs{background:#f0f2f5;color:#003da5}#view-inventory .acc-ico.tes{background:#fee2e2;color:#c7001f}
    #view-inventory .acc-title{font-weight:1000;color:#0f172a;font-size:14px;line-height:1.2}
    #view-inventory .acc-sub{font-size:11px;color:#64748b;margin-top:2px}
    #view-inventory .acc-stock{font-size:20px;font-weight:1000;line-height:1}
    #view-inventory .acc-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:nowrap}
    #view-inventory .acc-actions input{width:48px;height:32px;border:1px solid #e2e8f0;border-radius:10px;text-align:center;font-weight:900}
    #view-inventory .acc-mini{width:32px;height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;font-weight:900}
    #view-inventory .acc-mini.green{background:#003DA5;color:#fff;border-color:#003DA5}.acc-mini.orange{background:#fef2f2;color:#e4002b;border-color:#fecaca}.acc-mini.blue{background:#f5f6f8;color:#003DA5;border-color:#bfdbfe}.acc-mini:disabled{opacity:.45;cursor:not-allowed}
    @media(max-width:980px){#view-inventory .sp-acc-row-v17{grid-template-columns:42px 1fr;align-items:start}#view-inventory .acc-actions{grid-column:1/-1;justify-content:flex-start}#siCartFab{right:16px!important;bottom:18px!important}}
  `;
  document.head.appendChild(st);
}

function si_v17ForceCartRight(){
  si_v17Style();
  const fab=document.getElementById('siCartFab');
  if(fab){
    fab.style.setProperty('position','fixed','important');
    fab.style.setProperty('right','24px','important');
    fab.style.setProperty('left','auto','important');
    fab.style.setProperty('bottom','24px','important');
    fab.style.setProperty('top','auto','important');
    fab.style.setProperty('z-index','9999','important');
  }
  document.querySelectorAll('.checkout-cart-fab,.stock-cart-fab,#siFloatingCart,#siFloatingCartFab').forEach(el=>{
    if(el.id!=='siCartFab') el.style.display='none';
  });
}

function si_v17ForceTabLayout(){
  const isAcc = SI && SI.tab === 'acc';
  const pairs = [
    ['siEquipFilters', !isAcc], ['siEquipKpiGrid', !isAcc], ['siEquipSection', !isAcc],
    ['siAccFilters', isAcc], ['siAccKpiGrid', isAcc], ['siAccSection', isAcc]
  ];
  pairs.forEach(([id,show])=>{
    const el=document.getElementById(id);
    if(el){ el.classList.toggle('hidden', !show); el.style.display = show ? '' : 'none'; }
  });
  document.getElementById('siTabEquip')?.classList.toggle('active', !isAcc);
  document.getElementById('siTabAcc')?.classList.toggle('active', isAcc);
}

function si_switchTab(tab){
  SI.tab = tab === 'acc' ? 'acc' : 'equip';
  si_v17Style();
  si_renderKpi();
  si_v17ForceTabLayout();
  si_applyFilters();
  si_v17ForceCartRight();
}

function si_renderAccCards(){
  si_v17Style();
  si_v17ForceTabLayout();
  const start=(SI.accPage-1)*SI.pageSize;
  const rows=SI.accFiltered.slice(start,start+SI.pageSize);
  spSetHtml('siAccCount',`${SI.accFiltered.length} items`);
  if(!rows.length){
    spSetHtml('siAccCards','<div class="sp-muted">No accessories found</div>');
    spSetHtml('siAccPagination','');
    return;
  }
  spSetHtml('siAccCards',`<div class="sp-acc-list-v17">${rows.map((a,i)=>si_v17AccRow(a,start+i)).join('')}</div>`);
  const total=Math.max(1,Math.ceil(SI.accFiltered.length/SI.pageSize));
  let btns='';
  const from=Math.max(1,SI.accPage-2), to=Math.min(total,SI.accPage+2);
  for(let p=from;p<=to;p++) btns+=`<button class="${p===SI.accPage?'active':''}" onclick="SI.accPage=${p};si_renderAccCards()">${p}</button>`;
  spSetHtml('siAccPagination',`<div class="sp-muted">Page ${SI.accPage} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.accPage<=1?'disabled':''} onclick="SI.accPage--;si_renderAccCards()">Prev</button>${btns}<button ${SI.accPage>=total?'disabled':''} onclick="SI.accPage++;si_renderAccCards()">Next</button></div>`);
}

function si_v17AccRow(a,i){
  const id=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.name||('ACC'+i);
  const name=a.itemName||a.item_name||a.name||'-';
  const team=String(a.team||'-').toUpperCase();
  const qty=Number(a.stockQty||a.stock_qty||a.qty||0), min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  const low=qty<=min, inputId=`siAccQty_${i}`;
  const teamCls=team.includes('MED')?'med':team.includes('LAB')?'lab':team.includes('EHS')?'ehs':team.includes('TES')?'tes':'';
  return `<div class="sp-acc-row-v17 ${low?'low':''}">
    <div class="acc-ico ${teamCls}"><i class="fas ${(typeof si_v16AccIcon==='function')?si_v16AccIcon(a):'fa-plug'}"></i></div>
    <div><div class="acc-title">${spEsc(name)}</div><div class="acc-sub">${spEsc(team)} • ${spEsc(id)}</div></div>
    <div><div class="acc-stock" style="color:${low?'#004aad':'#004aad'}">${spNum(qty)}</div><div class="acc-sub">Stock qty</div></div>
    <div><b>${spNum(min)}</b><div class="acc-sub">Min stock</div></div>
    <div>${low?'<span class="sp-badge Overdue">LOW STOCK</span>':spBadge(a.status||'STOCK')}</div>
    <div class="acc-sub">${spEsc(a.actionRequired||a.action_required||'No action')}</div>
    <div class="acc-actions">
      <button class="acc-mini" onclick="si_v16Qty('${inputId}',-1)">−</button>
      <input id="${inputId}" type="number" min="1" step="1" value="1">
      <button class="acc-mini" onclick="si_v16Qty('${inputId}',1)">+</button>
      <button class="acc-mini green" ${low?'disabled':''} title="Add to cart" onclick='si_addAccessoryToCart(${si_json(a)},"${inputId}")'><i class="fas fa-cart-plus"></i></button>
      <button class="acc-mini orange" title="Restock" onclick='si_restockPrompt(${si_json(a)})'><i class="fas fa-box-open"></i></button>
      <button class="acc-mini blue" title="Min stock" onclick='si_editMinStockPrompt(${si_json(a)})'><i class="fas fa-sliders"></i></button>
    </div>
  </div>`;
}

if(!window.__siV17InitPatch){
  window.__siV17InitPatch=true;
  const _baseInit=initStockInventoryModule;
  initStockInventoryModule=function(force=false){
    if(force) Swal.fire({title:'Resync inventory...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    _baseInit(force);
    setTimeout(()=>{ if(force) Swal.close(); si_v17Style(); si_v17ForceTabLayout(); si_v17ForceCartRight(); },900);
    setTimeout(()=>{ si_v17ForceTabLayout(); si_v17ForceCartRight(); },1800);
  };
}
if(!window.__siV17UpdateCartPatch && typeof si_updateCart==='function'){
  window.__siV17UpdateCartPatch=true;
  const _baseUpdateCart=si_updateCart;
  si_updateCart=function(){
    _baseUpdateCart();
    si_v17ForceCartRight();
  };
}
if(!window.__siV17OpenCartPatch && typeof si_openCart==='function'){
  window.__siV17OpenCartPatch=true;
  const _baseOpenCart=si_openCart;
  si_openCart=function(){
    _baseOpenCart();
    si_v17ForceCartRight();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{si_v17Style();si_v17ForceTabLayout();si_v17ForceCartRight();},500));


/* ============================================================
   CES Stock Pro V28 — Inventory frontend stability patch
   Additive only.
   - Cleaner history modal.
   - Better checkout success message.
   - Keeps cart on right-bottom.
============================================================ */
function si_v28HistoryStyle(){
  if(document.getElementById('stockpro-inventory-v28-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v28-style';
  st.textContent=`
    #siCartFab,#view-inventory .sp-cart-fab{
      position:fixed!important;right:24px!important;left:auto!important;bottom:24px!important;top:auto!important;z-index:9999!important;
    }
    .si-v28-history-list{display:flex;flex-direction:column;gap:10px;max-height:560px;overflow:auto;padding-right:4px;text-align:left}
    .si-v28-history-card{display:grid;grid-template-columns:12px 1fr;gap:12px;padding:13px 14px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}
    .si-v28-dot{width:10px;height:10px;border-radius:999px;background:#003DA5;margin-top:5px}
    .si-v28-dot.approved{background:#003DA5}.si-v28-dot.rejected{background:#E4002B}.si-v28-dot.pending{background:#c7001f}
    .si-v28-action{font-weight:900;color:#0f172a;font-size:13px}
    .si-v28-detail{font-size:12px;color:#475569;margin-top:3px;line-height:1.45}
    .si-v28-meta{font-size:11px;color:#C8C9C7;margin-top:5px}
    .si-v28-scope{display:inline-flex;gap:7px;align-items:center;padding:7px 12px;border-radius:999px;background:#f5f6f8;color:#003DA5;font-weight:900;font-size:12px;margin-bottom:12px}
  `;
  document.head.appendChild(st);
}

function si_v28ForceCartRight(){
  const fab=document.getElementById('siCartFab');
  if(fab){
    fab.style.setProperty('position','fixed','important');
    fab.style.setProperty('right','24px','important');
    fab.style.setProperty('left','auto','important');
    fab.style.setProperty('bottom','24px','important');
    fab.style.setProperty('top','auto','important');
    fab.style.setProperty('z-index','9999','important');
  }
  document.querySelectorAll('.checkout-cart-fab,.stock-cart-fab,#siFloatingCart,#siFloatingCartFab').forEach(el=>{
    if(el.id!=='siCartFab') el.style.setProperty('display','none','important');
  });
}

function si_openInventoryHistory(){
  si_v28HistoryStyle();
  si_v28ForceCartRight();
  const scope = SI.tab === 'acc' ? 'accessories' : 'equipment';
  const label = scope === 'accessories' ? 'Accessories History' : 'Equipment History';
  Swal.fire({title:'Loading history...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});

  google.script.run
    .withSuccessHandler(res=>{
      Swal.close();
      if(!res || !res.success){
        Swal.fire('History Error',(res && res.message) || 'Cannot load history','error');
        return;
      }
      const logs = res.logs || [];
      const icon = scope === 'accessories' ? 'fa-plug' : 'fa-microchip';
      const html = `
        <div class="si-v28-scope"><i class="fas ${icon}"></i>${label}</div>
        ${logs.length ? `<div class="si-v28-history-list">${
          logs.map(l=>{
            const action = String(l.action || '-');
            const low = action.toLowerCase();
            const cls = low.includes('approved') ? 'approved' : low.includes('reject') ? 'rejected' : low.includes('pending') || low.includes('approval') ? 'pending' : '';
            return `<div class="si-v28-history-card">
              <span class="si-v28-dot ${cls}"></span>
              <div>
                <div class="si-v28-action">${spEsc(action)} ${l.refId ? '• '+spEsc(l.refId) : ''}</div>
                <div class="si-v28-detail">${spEsc(l.detail || '-')}</div>
                <div class="si-v28-meta">${spEsc(l.timestamp || '')}${l.user ? ' • '+spEsc(l.user) : ''}${l.source ? ' • '+spEsc(l.source) : ''}</div>
              </div>
            </div>`;
          }).join('')
        }</div>` : `<div class="sp-muted">ไม่พบประวัติย้อนหลังของหน้านี้</div>`}
      `;
      Swal.fire({title:label,html:html,width:820,confirmButtonText:'Close'});
    })
    .withFailureHandler(err=>Swal.fire('History Error',err.message || String(err),'error'))
    .si_getInventoryHistory({scope:scope,limit:120});
}

if(!window.__siV28SubmitCheckoutPatch && typeof si_submitCheckout === 'function'){
  window.__siV28SubmitCheckoutPatch = true;
  si_submitCheckout = function(){
    if(!SI.cart.length){Swal.fire('ตะกร้าว่าง','','info');return;}
    const borrower=spVal('siBorrower','').trim();
    const location=spVal('siCheckoutLocation','').trim();
    const borrowDate=spVal('siBorrowDate','');
    const due=spVal('siDueDate','');
    const note=spVal('siNote','');
    const equipment=SI.cart.filter(x=>x.kind==='equipment');
    const accessories=SI.cart.filter(x=>x.kind==='accessory');

    if(!borrower || !location || !borrowDate){
      Swal.fire('ข้อมูลไม่ครบ','กรุณากรอกผู้เบิก / สถานที่ / วันที่เบิกออก','warning');return;
    }
    if(equipment.length && !due){
      Swal.fire('ข้อมูลไม่ครบ','รายการ Equipment ต้องมีวันคืน','warning');return;
    }

    const requester=(typeof si_v15ApplyCurrentUser_ === 'function') ? si_v15ApplyCurrentUser_() : ((typeof currentUser !== 'undefined' && currentUser) ? {
      id: currentUser.id || '',
      name: currentUser.name_eng || currentUser.name_th || currentUser.id || '',
      email: currentUser.email || '',
      team: currentUser.team || ''
    } : {});

    Swal.fire({
      title:'กำลังส่งรายการ...',
      html:`Equipment ${equipment.length} รายการ<br>Accessories ${accessories.reduce((s,x)=>s+Number(x.issueQty||x.qty||1),0)} pcs<br><small>Accessories จะส่งขออนุมัติทางอีเมลก่อนตัด stock</small>`,
      allowOutsideClick:false,
      showConfirmButton:false,
      didOpen:()=>Swal.showLoading()
    });

    google.script.run
      .withSuccessHandler(res=>{
        Swal.close();
        if(res && res.success){
          const accReq = Number(res.accessoryRequests || (res.approvals ? res.approvals.length : 0) || 0);
          SI.cart=[];
          si_updateCart();
          si_closeCart();
          if(typeof si_v16ResetCheckoutFields === 'function') si_v16ResetCheckoutFields();
          else ['siBorrower','siCheckoutLocation','siNote','siDueDate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
          initStockInventoryModule(true);
          if(typeof initStockDashboardModule==='function') initStockDashboardModule(true);
          Swal.fire({
            icon:'success',
            title:'บันทึกสำเร็จ',
            html:`${res.message || 'Checkout completed'}${accReq ? '<br><b>ส่งอีเมลขออนุมัติ Accessories แล้ว '+accReq+' รายการ</b>' : ''}`,
            confirmButtonText:'OK'
          });
        }else{
          Swal.fire('ไม่สำเร็จ',(res && res.message) || 'Checkout failed','error');
        }
      })
      .withFailureHandler(e=>Swal.fire('Error',e.message || String(e),'error'))
      .si_checkoutCart({equipment,accessories,borrower,location,borrowDate,expectedReturnDate:due,note,requester});
  };
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{si_v28HistoryStyle();si_v28ForceCartRight();},600));


/* ============================================================
   CES Stock Pro V30 — Pending Approval UI Patch
   Additive override. Keeps existing Inventory functions.
   - Pending Approval KPI uses backend approval sheet count.
   - Bell/Alert popup shows Low Stock + Pending Approval.
   - Approve/Reject can be processed from the notification popup.
============================================================ */
function si_v30Style(){
  if(document.getElementById('stockpro-inventory-v30-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-inventory-v30-style';
  st.textContent=`
    .si-v30-alert-tabs{display:flex;gap:8px;margin-bottom:14px;justify-content:center;flex-wrap:wrap}
    .si-v30-alert-tabs button{border:1px solid #f0f2f5;background:#fff;color:#003DA5;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;cursor:pointer}
    .si-v30-alert-tabs button.active{background:#003DA5;color:#fff;border-color:#003DA5}
    .si-v30-list{display:flex;flex-direction:column;gap:10px;max-height:62vh;overflow:auto;text-align:left;padding-right:3px}
    .si-v30-row{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:12px}
    .si-v30-dot{width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f5f6f8;color:#003DA5}
    .si-v30-dot.pending{background:#fef2f2;color:#c7001f}.si-v30-dot.low{background:#fee2e2;color:#E4002B}
    .si-v30-title{font-size:13px;font-weight:1000;color:#0f172a}.si-v30-sub{font-size:11px;color:#64748b;margin-top:3px;line-height:1.45}
    .si-v30-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.si-v30-mini{border:0;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:900;cursor:pointer}.si-v30-mini.ok{background:#003DA5;color:#fff}.si-v30-mini.bad{background:#E4002B;color:#fff}.si-v30-mini.soft{background:#f5f6f8;color:#003DA5;border:1px solid #bfdbfe}
    @media(max-width:720px){.si-v30-row{grid-template-columns:30px 1fr}.si-v30-actions{grid-column:1/-1;justify-content:flex-start}}
  `;
  document.head.appendChild(st);
}

function si_v30CurrentUserPayload(){
  try{
    if(typeof si_v15ApplyCurrentUser_ === 'function') return si_v15ApplyCurrentUser_();
    if(typeof currentUser !== 'undefined' && currentUser){
      return {id:currentUser.id||'',name:currentUser.name_eng||currentUser.name_th||currentUser.id||'',email:currentUser.email||'',team:currentUser.team||''};
    }
  }catch(e){}
  return {};
}

function si_v30UpdateHeaderBadges(){
  const low = (SI.acc||[]).filter(a=>Number(a.stockQty||a.stock_qty||a.qty||0)<=Number(a.minStockQty||a.min_stock_qty||a.minStock||0)).length;
  google.script.run.withSuccessHandler(res=>{
    const pending = res && res.success ? Number(res.count||0) : Number((SI.raw&&SI.raw.kpi&&SI.raw.kpi.accPending)||0);
    const total = low + pending;
    const h=document.getElementById('siLowStockHeaderCount');
    if(h){h.textContent=total>99?'99+':String(total);h.style.display=total>0?'flex':'none';}
    const k=SI.raw&&SI.raw.kpi;if(k){k.accPending=pending;k.pendingApproval=pending;}
    si_v30PatchPendingCard(pending);
  }).withFailureHandler(()=>{const h=document.getElementById('siLowStockHeaderCount');if(h){h.textContent=low;h.style.display=low>0?'flex':'none';}}).si_getAccessoryApprovalAlerts({pendingOnly:true,limit:1});
}

function si_v30PatchPendingCard(pending){
  const grid=document.getElementById('siAccKpiGrid'); if(!grid)return;
  const cards=[...grid.querySelectorAll('.sp-kpi')];
  const card=cards.find(c=>(c.textContent||'').toLowerCase().includes('pending'));
  if(card){const val=card.querySelector('.val'); if(val)val.textContent=spNum(pending||0);}
}

if(!window.__siV30RenderKpiPatch && typeof si_renderKpi === 'function'){
  window.__siV30RenderKpiPatch = true;
  const _v30BaseRenderKpi = si_renderKpi;
  si_renderKpi = function(){
    _v30BaseRenderKpi();
    const p = Number((SI.raw&&SI.raw.kpi&&(SI.raw.kpi.accPending||SI.raw.kpi.pendingApproval))||0);
    si_v30PatchPendingCard(p);
    setTimeout(si_v30UpdateHeaderBadges,100);
  };
}

function si_v30LowStockHtml(rows){
  rows = rows || [];
  if(!rows.length) return '<div class="sp-muted">No low stock accessories</div>';
  return `<div class="si-v30-list">${rows.map(a=>{
    const qty=Number(a.stockQty||a.stock_qty||a.qty||0),min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
    return `<div class="si-v30-row"><div class="si-v30-dot low"><i class="fas fa-battery-quarter"></i></div><div><div class="si-v30-title">${spEsc(a.itemName||a.item_name||a.name||'-')}</div><div class="si-v30-sub">${spEsc(a.team||'-')} • ${spEsc(a.accessoryId||a.accessory_id||a.idCode||'-')} • Stock ${spNum(qty)} / Min ${spNum(min)}</div></div><div class="si-v30-actions"><button class="si-v30-mini soft" onclick='si_restockPrompt(${si_json(a)})'><i class="fas fa-box-open"></i> Restock</button></div></div>`;
  }).join('')}</div>`;
}

function si_v30PendingHtml(rows){
  rows = rows || [];
  if(!rows.length) return '<div class="sp-muted">No pending approval requests</div>';
  return `<div class="si-v30-list">${rows.map(r=>`<div class="si-v30-row" id="siReq_${spEsc(r.requestId)}"><div class="si-v30-dot pending"><i class="fas fa-clock"></i></div><div><div class="si-v30-title">${spEsc(r.requestId||'-')} • ${spEsc(r.itemName||r.accessoryId||'-')}</div><div class="si-v30-sub">${spEsc(r.team||'-')} • Qty ${spNum(r.qty||0)} pcs<br>Borrower: ${spEsc(r.borrower||'-')} / ${spEsc(r.location||'-')}<br>Requester: ${spEsc(r.requestedBy||r.requesterEmail||'-')} • ${spEsc(r.timestamp||'')}</div></div><div class="si-v30-actions"><button class="si-v30-mini ok" onclick="si_v30ApproveFromAlert('${spEsc(r.requestId)}')"><i class="fas fa-check"></i> Approve</button><button class="si-v30-mini bad" onclick="si_v30RejectFromAlert('${spEsc(r.requestId)}')"><i class="fas fa-times"></i> Reject</button></div></div>`).join('')}</div>`;
}

function si_openAccessoryLowStockAlerts(){
  si_v30Style();
  const low=(SI.acc||[]).filter(a=>Number(a.stockQty||a.stock_qty||a.qty||0)<=Number(a.minStockQty||a.min_stock_qty||a.minStock||0));
  Swal.fire({title:'Loading alerts...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{
    Swal.close();
    const pending=(res&&res.success)?(res.data||res.approvals||[]):[];
    window.si_v30AlertTab=function(tab){
      document.querySelectorAll('.si-v30-alert-tabs button').forEach(b=>b.classList.remove('active'));
      const btn=document.getElementById('siV30Tab_'+tab); if(btn)btn.classList.add('active');
      const body=document.getElementById('siV30AlertBody'); if(!body)return;
      body.innerHTML = tab==='pending' ? si_v30PendingHtml(pending) : si_v30LowStockHtml(low);
    };
    const html=`<div class="si-v30-alert-tabs"><button id="siV30Tab_pending" class="active" onclick="si_v30AlertTab('pending')"><i class="fas fa-clock"></i> Pending Approval (${pending.length})</button><button id="siV30Tab_low" onclick="si_v30AlertTab('low')"><i class="fas fa-battery-quarter"></i> Low Stock (${low.length})</button></div><div id="siV30AlertBody">${si_v30PendingHtml(pending)}</div>`;
    Swal.fire({title:'Inventory Alerts',width:980,html,confirmButtonText:'Close'});
  }).withFailureHandler(err=>Swal.fire('Alert Error',err.message||String(err),'error')).si_getAccessoryApprovalAlerts({pendingOnly:true,limit:200});
}

function si_v30ApproveFromAlert(requestId){
  const user=si_v30CurrentUserPayload();
  Swal.fire({title:'Approve request?',text:requestId,icon:'question',showCancelButton:true,confirmButtonText:'Approve',confirmButtonColor:'#003DA5'}).then(r=>{
    if(!r.isConfirmed)return;
    Swal.fire({title:'Approving...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{
      if(res&&res.success){Swal.fire('Approved',res.message||'Stock deducted and requester notified','success');initStockInventoryModule(true);if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);}else Swal.fire('Approve Error',(res&&res.message)||'Failed','error');
    }).withFailureHandler(e=>Swal.fire('Approve Error',e.message||String(e),'error')).si_approveAccessoryRequestFromWeb({requestId,approverEmail:user.email,approver:user.name});
  });
}

function si_v30RejectFromAlert(requestId){
  const user=si_v30CurrentUserPayload();
  Swal.fire({title:'Reject request?',html:`<input id="siV30RejectNote" class="swal2-input" placeholder="Reason / note">`,icon:'warning',showCancelButton:true,confirmButtonText:'Reject',confirmButtonColor:'#E4002B'}).then(r=>{
    if(!r.isConfirmed)return;
    Swal.fire({title:'Rejecting...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{
      if(res&&res.success){Swal.fire('Rejected',res.message||'Requester notified','success');initStockInventoryModule(true);}else Swal.fire('Reject Error',(res&&res.message)||'Failed','error');
    }).withFailureHandler(e=>Swal.fire('Reject Error',e.message||String(e),'error')).si_rejectAccessoryRequestFromWeb({requestId,note:spVal('siV30RejectNote','Rejected from notification'),approverEmail:user.email,approver:user.name});
  });
}

if(!window.__siV30InitPatch && typeof initStockInventoryModule === 'function'){
  window.__siV30InitPatch=true;
  const _v30BaseInit=initStockInventoryModule;
  initStockInventoryModule=function(force=false){
    _v30BaseInit(force);
    setTimeout(()=>{try{si_v30UpdateHeaderBadges();}catch(e){}},1200);
  };
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{si_v30Style();si_v30UpdateHeaderBadges();}catch(e){}},1200));


/* ============================================================
   CES Stock Pro V31 — Filtered KPI Cards Patch
   Additive override from V30.
   Requirement: KPI cards must recalculate from current filter/search.
   - Equipment KPI uses SI.filtered after equipment filters.
   - Accessories KPI uses SI.accFiltered after accessories filters.
   - Pending Approval card is refreshed from approval sheet and matched
     with current Accessories search/team/item/status/action filters.
============================================================ */
function si_v31StatusOf(d){
  d = d || {};
  const text = [d.status,d.baseStatus,d.base_status,d.rentalStatus,d.rental_status,d.dqStatus,d.dq_status,d.actionRequired,d.action_required,d.recheckNote,d.recheck_note].join(' ').toUpperCase();
  if(/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง/.test(text)) return 'Broken';
  if(/MISSING|LOST|สูญหาย|หาย|หาไม่พบ/.test(text)) return 'Missing';
  if(/RECHECK|RE-CHECK|ตรวจซ้ำ|ตรวจสอบซ้ำ/.test(text)) return 'Recheck';
  if(/OVERDUE|EXPIRED|เลยกำหนด|เกินกำหนด/.test(text)||Number(d.overdueDays||d.overdue_days||0)>0) return 'Overdue';
  if(/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) return 'In-Use';
  return 'Stock';
}

function si_v31EquipmentKpi(rows){
  rows = rows || [];
  const stRows = rows.map(d => Object.assign({}, d, {status: si_v31StatusOf(d)}));
  const overdue = stRows.filter(d => d.status === 'Overdue').length;
  const missing  = stRows.filter(d => d.status === 'Missing').length;
  const broken   = stRows.filter(d => d.status === 'Broken').length;
  const recheck  = stRows.filter(d => d.status === 'Recheck').length;
  return {
    total: stRows.length,
    stock: stRows.filter(d => d.status === 'Stock').length,
    inUse: stRows.filter(d => d.status === 'In-Use').length,
    overdue,
    missing,
    broken,
    recheck,
    risk: overdue + missing + broken + recheck
  };
}

function si_v31AccessoryKpi(rows){
  rows = rows || [];
  const stockOf = a => Number(a.stockQty||a.stock_qty||a.qty||0);
  const minOf = a => Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
  return {
    accessories: rows.length,
    accTotalStock: rows.reduce((s,a)=>s+stockOf(a),0),
    accLow: rows.filter(a=>stockOf(a)<=minOf(a)).length,
    accPendingLocal: rows.filter(a=>String([a.status,a.actionRequired,a.action_required].join(' ')).toUpperCase().indexOf('PENDING')>=0).length,
    accTeams: [...new Set(rows.map(a=>a.team).filter(Boolean))].length
  };
}

function si_v31KpiCard(i){
  return `<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`;
}

function si_v31RenderEquipmentKpi(rows){
  const k = si_v31EquipmentKpi(rows || SI.filtered || []);
  const eqItems = [
    ['อุปกรณ์หลักทั้งหมด', k.total, 'fa-microchip', '#003DA5', '#f0f2f5'],
    ['พร้อมส่ง', k.stock, 'fa-warehouse', '#003DA5', '#f5f6f8'],
    ['เช่ายืม', k.inUse, 'fa-arrow-right-from-bracket', '#c7001f', '#fee2e2'],
    ['ไม่พร้อมใช้งาน', k.risk, 'fa-triangle-exclamation', '#E4002B', '#fee2e2']
  ];
  spSetHtml('siEquipKpiGrid', eqItems.map(si_v31KpiCard).join(''));
}

function si_v31RenderAccessoryKpi(rows, pendingOverride){
  const k = si_v31AccessoryKpi(rows || SI.accFiltered || []);
  const pending = pendingOverride !== undefined ? Number(pendingOverride||0) : Number(k.accPendingLocal||0);
  const accItems = [
    ['Accessories', k.accessories, 'fa-plug', '#19a7ce', '#f1f5f9'],
    ['Total Stock', k.accTotalStock, 'fa-boxes-stacked', '#003DA5', '#f5f6f8'],
    ['Low Stock', k.accLow, 'fa-battery-quarter', '#e4002b', '#fef2f2'],
    ['Pending Approval', pending, 'fa-bell', '#003DA5', '#f0f2f5']
  ];
  spSetHtml('siAccKpiGrid', accItems.map(si_v31KpiCard).join(''));
}

function si_v31RenderFilteredKpi(){
  if(SI.tab === 'equip') {
    si_v31RenderEquipmentKpi(SI.filtered || []);
  } else {
    si_v31RenderAccessoryKpi(SI.accFiltered || []);
    si_v31UpdatePendingKpiFromApprovalSheet();
  }
}

function si_v31ApprovalMatchesCurrentAccFilter(r){
  r = r || {};
  const q = spVal('siAccSearch','').toLowerCase();
  const team = spVal('siAccTeam','all');
  const item = spVal('siAccItem','all');
  const st = spVal('siAccStatus','all');
  const act = spVal('siAccAction','all');
  const name = r.itemName || r.item_name || r.name || r.accessoryId || r.accessory_id || '';
  const action = r.actionRequired || r.action_required || 'Approval';
  const text = [r.requestId,r.accessoryId,r.accessory_id,r.team,name,r.status,action,r.borrower,r.location,r.requestedBy,r.requesterEmail].join(' ').toLowerCase();
  if(q && !text.includes(q)) return false;
  if(team !== 'all' && String(r.team||'') !== team) return false;
  if(item !== 'all' && String(name||'') !== item) return false;
  if(st !== 'all' && st !== 'PENDING_APPROVAL') return false;
  if(act !== 'all' && String(action||'') !== act) return false;
  return true;
}

function si_v31UpdatePendingKpiFromApprovalSheet(){
  if(typeof google === 'undefined' || !google.script || !google.script.run || typeof google.script.run.si_getAccessoryApprovalAlerts !== 'function') return;
  google.script.run
    .withSuccessHandler(res=>{
      const pendingRows = (res && res.success) ? (res.data || res.approvals || []) : [];
      const filteredPending = pendingRows.filter(si_v31ApprovalMatchesCurrentAccFilter).length;
      si_v31RenderAccessoryKpi(SI.accFiltered || [], filteredPending);
      const k = SI.raw && SI.raw.kpi;
      if(k){ k.accPending = filteredPending; k.pendingApproval = filteredPending; }
      if(typeof si_v30PatchPendingCard === 'function') si_v30PatchPendingCard(filteredPending);
    })
    .withFailureHandler(()=>{})
    .si_getAccessoryApprovalAlerts({pendingOnly:true,limit:500});
}

if(!window.__siV31RenderKpiPatch){
  window.__siV31RenderKpiPatch = true;
  si_renderKpi = function(){
    const eqRows = (SI.filtered && SI.filtered.length) ? SI.filtered : (SI.inv || []);
    const accRows = (SI.accFiltered && SI.accFiltered.length) ? SI.accFiltered : (SI.acc || []);
    si_v31RenderEquipmentKpi(eqRows);
    si_v31RenderAccessoryKpi(accRows, (SI.raw&&SI.raw.kpi&&(SI.raw.kpi.accPending||SI.raw.kpi.pendingApproval))||0);
  };
}

if(!window.__siV31ApplyFilterPatch){
  window.__siV31ApplyFilterPatch = true;
  si_applyFilters = function(){
    if(typeof si_v11Style === 'function') si_v11Style();
    if(typeof si_v12Style === 'function') si_v12Style();
    if(SI.tab === 'equip'){
      const q=spVal('siSearch','').toLowerCase(), b=spVal('siBrand','all'), m=spVal('siModel','all'), l=spVal('siLocation','all'), s=spVal('siStatus','all');
      SI.filtered=(SI.inv||[]).filter(d=>{
        const status = si_v31StatusOf(d);
        const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,status,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase();
        if(q && !text.includes(q)) return false;
        if(b !== 'all' && d.brand !== b) return false;
        if(m !== 'all' && d.model !== m) return false;
        if(l !== 'all' && d.location !== l) return false;
        if(s !== 'all' && status !== s && d.status !== s) return false;
        return true;
      }).map(d=>Object.assign({}, d, {status: si_v31StatusOf(d)}));
      SI.page=1;
      si_renderTable();
      si_v31RenderEquipmentKpi(SI.filtered);
    } else {
      const q=spVal('siAccSearch','').toLowerCase(), team=spVal('siAccTeam','all'), item=spVal('siAccItem','all'), st=spVal('siAccStatus','all'), act=spVal('siAccAction','all');
      SI.accFiltered=(SI.acc||[]).filter(a=>{
        const name=a.itemName||a.name||'';
        const stock=Number(a.stockQty||a.stock_qty||a.qty||0);
        const min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
        const statusRaw=String(a.status||'');
        const statusCalc = stock <= min ? 'LOW_STOCK' : (statusRaw || 'STOCK');
        const action=a.actionRequired||a.action_required||'';
        const text=[a.accessoryId,a.accessory_id,a.idCode,a.team,name,a.type,statusRaw,statusCalc,action,a.location,a.remark].join(' ').toLowerCase();
        if(q && !text.includes(q)) return false;
        if(team !== 'all' && a.team !== team) return false;
        if(item !== 'all' && name !== item) return false;
        if(st !== 'all'){
          if(st === 'LOW_STOCK' && stock > min) return false;
          else if(st !== 'LOW_STOCK' && statusRaw !== st && statusCalc !== st) return false;
        }
        if(act !== 'all' && action !== act) return false;
        return true;
      });
      SI.accPage=1;
      si_renderAccCards();
      si_v31RenderAccessoryKpi(SI.accFiltered);
      si_v31UpdatePendingKpiFromApprovalSheet();
    }
  };
}
/* ============================================================
   CES Stock Pro — Accessories Check Interval Frontend Patch
   Paste this at the END of Stock_Inventory_java.html
============================================================ */
(function(){
  const oldFillFilters = window.si_fillFilters;
  const oldRenderKpi = window.si_renderKpi;
  const oldApplyFilters = window.si_applyFilters;
  const oldAccCard = window.si_accCard;

  function esc(v){ return (typeof spEsc === 'function') ? spEsc(v) : String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
  function num(v){ return (typeof spNum === 'function') ? spNum(v) : (Number(v||0)).toLocaleString(); }
  function val(id,def=''){ return (typeof spVal === 'function') ? spVal(id,def) : (document.getElementById(id)?.value ?? def); }
  function setHtml(id,html){ if(typeof spSetHtml === 'function') spSetHtml(id,html); else { const el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function json(o){ return (typeof si_json === 'function') ? si_json(o) : JSON.stringify(o).replace(/'/g,'&#39;').replace(/</g,'&lt;'); }

  function ensureStyle(){
    if(document.getElementById('si-check-interval-style')) return;
    const st=document.createElement('style');
    st.id='si-check-interval-style';
    st.textContent=`
      .si-ci-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;border:1px solid #e2e8f0;background:#f8fafc;color:#334155}
      .si-ci-chip.monthly{background:#fee2e2;color:#991b1b;border-color:#fecaca}.si-ci-chip.quarterly{background:#fee2e2;color:#991b1b;border-color:#fecaca}.si-ci-chip.half{background:#f1f5f9;color:#003da5;border-color:#bfdbfe}
      .si-ci-due{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}.si-ci-soon{background:#fef2f2!important;color:#991b1b!important;border-color:#fecaca!important}.si-ci-ok{background:#f5f6f8!important;color:#002d7a!important;border-color:#bfdbfe!important}
      .si-ci-meta{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.si-ci-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;max-height:560px;overflow:auto;text-align:left}.si-ci-row{border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#fff}.si-ci-title{font-weight:1000;color:#0f172a}.si-ci-sub{font-size:12px;color:#64748b;margin-top:4px;line-height:1.45}.si-ci-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}.si-ci-mini{border:0;border-radius:10px;padding:7px 10px;font-size:11px;font-weight:900;cursor:pointer}.si-ci-mini.primary{background:#003DA5;color:white}.si-ci-mini.warn{background:#fef2f2;color:#c7001f}.si-ci-mini.green{background:#f5f6f8;color:#002d7a}.si-ci-mini.gray{background:#f1f5f9;color:#334155}
    `;
    document.head.appendChild(st);
  }

  function intervalClass(code){
    code=String(code||'').toUpperCase();
    if(code==='MONTHLY') return 'monthly';
    if(code==='QUARTERLY') return 'quarterly';
    return 'half';
  }
  function checkChip(a){
    const st=String(a.checkStatus||a.check_status||'OK').toUpperCase();
    const next=a.nextCheckDate||a.next_check_date||'-';
    if(st==='OVERDUE' || st==='DUE') return `<span class="si-ci-chip si-ci-due"><i class="fas fa-calendar-times"></i> Check due: ${esc(next)}</span>`;
    if(st==='DUE_SOON') return `<span class="si-ci-chip si-ci-soon"><i class="fas fa-clock"></i> Due soon: ${esc(next)}</span>`;
    return `<span class="si-ci-chip si-ci-ok"><i class="fas fa-check"></i> Next: ${esc(next)}</span>`;
  }
  function intervalChip(a){
    const code=a.checkIntervalCode||a.check_interval_code||'HALF_YEARLY';
    const days=a.checkIntervalDays||a.check_interval_days||180;
    return `<span class="si-ci-chip ${intervalClass(code)}"><i class="fas fa-repeat"></i> ${esc(code)} / ${esc(days)}d</span>`;
  }
  function stockChip(a){
    const qty=Number(a.stockQty||a.stock_qty||a.qty||0), min=Number(a.minStockQty||a.min_stock_qty||a.minStock||0);
    return qty<=min ? `<span class="si-ci-chip si-ci-due"><i class="fas fa-battery-quarter"></i> LOW ${num(qty)}/${num(min)}</span>` : `<span class="si-ci-chip si-ci-ok"><i class="fas fa-box"></i> Stock ${num(qty)}/${num(min)}</span>`;
  }

  function ensureIntervalFilter(){
    const box=document.getElementById('siAccFilters');
    if(!box || document.getElementById('siAccInterval')) return;
    const sel=document.createElement('select');
    sel.id='siAccInterval';
    sel.onchange=function(){ window.si_applyFilters(); };
    sel.innerHTML='<option value="all">All Interval</option><option value="MONTHLY">MONTHLY / 30d</option><option value="QUARTERLY">QUARTERLY / 90d</option><option value="HALF_YEARLY">HALF_YEARLY / 180d</option><option value="DUE">Check Due</option><option value="LOW_STOCK">Low Stock</option>';
    box.appendChild(sel);
  }

  window.si_fillFilters=function(){
    if(oldFillFilters) oldFillFilters();
    ensureIntervalFilter();
  };

  window.si_renderKpi=function(){
    ensureStyle();
    if(oldRenderKpi) oldRenderKpi();
    const k=(window.SI&&SI.raw&&SI.raw.kpi)||{};
    const alertCount=Number(k.accLow||0)+Number(k.accCheckDue||0)+Number(k.accPending||k.pendingApproval||0);
    setHtml('siLowStockHeaderCount', alertCount);
    const grid=document.getElementById('siAccKpiGrid');
    if(grid && !document.getElementById('siCiKpiPatch')){
      grid.insertAdjacentHTML('beforeend', `<div id="siCiKpiPatch" style="display:contents">
        <div class="sp-kpi"><div class="ico" style="background:#fee2e2"><i class="fas fa-calendar-times" style="color:#E4002B"></i></div><div class="label">Check Due</div><div class="val" style="color:#E4002B">${num(k.accCheckDue||0)}</div></div>
        <div class="sp-kpi"><div class="ico" style="background:#fee2e2"><i class="fas fa-clock" style="color:#c7001f"></i></div><div class="label">Due Soon</div><div class="val" style="color:#c7001f">${num(k.accCheckSoon||0)}</div></div>
        <div class="sp-kpi"><div class="ico" style="background:#f1f5f9"><i class="fas fa-repeat" style="color:#004aad"></i></div><div class="label">M / Q / H</div><div class="val" style="color:#004aad;font-size:18px">${num(k.accMonthly||0)} / ${num(k.accQuarterly||0)} / ${num(k.accHalfYearly||0)}</div></div>
      </div>`);
    }
  };

  window.si_applyFilters=function(){
    ensureIntervalFilter();
    if(!window.SI || SI.tab!=='acc') return oldApplyFilters ? oldApplyFilters() : undefined;
    const q=val('siAccSearch','').toLowerCase(), team=val('siAccTeam','all'), item=val('siAccItem','all'), st=val('siAccStatus','all'), act=val('siAccAction','all'), interval=val('siAccInterval','all');
    SI.accFiltered=(SI.acc||[]).filter(a=>{
      const nm=a.itemName||a.item_name||a.name||'';
      const ar=a.actionRequired||a.action_required||'';
      const text=[a.accessoryId,a.accessory_id,a.idCode,a.id_code,a.team,nm,a.type,a.status,ar,a.location,a.remark,a.checkIntervalCode,a.check_interval_code,a.checkStatus,a.check_status].join(' ').toLowerCase();
      if(q && !text.includes(q)) return false;
      if(team!=='all' && a.team!==team) return false;
      if(item!=='all' && nm!==item) return false;
      if(st!=='all' && a.status!==st) return false;
      if(act!=='all' && ar!==act) return false;
      if(interval==='LOW_STOCK' && String(a.stockStatus||a.stock_status)!=='LOW_STOCK') return false;
      if(interval==='DUE' && !['DUE','OVERDUE'].includes(String(a.checkStatus||a.check_status).toUpperCase())) return false;
      if(!['all','LOW_STOCK','DUE'].includes(interval) && String(a.checkIntervalCode||a.check_interval_code)!==interval) return false;
      return true;
    });
    SI.accPage=1;
    window.si_renderAccCards();
  };

  window.si_accCard=function(a,i){
    ensureStyle();
    const base=oldAccCard ? oldAccCard(a,i) : '';
    const panel=`<div class="si-ci-meta">${intervalChip(a)}${checkChip(a)}${stockChip(a)}</div><div class="si-ci-actions"><button class="si-ci-mini primary" onclick='si_markAccessoryCheckedPrompt(${json(a)})'><i class="fas fa-clipboard-check"></i> Check Done</button></div>`;
    if(base && base.includes('</div>')) return base.replace('</div>', panel+'</div>');
    return `<div class="sp-acc-card"><div class="sp-acc-title">${esc(a.itemName||a.item_name||a.name||'-')}</div>${panel}</div>`;
  };

  function renderAlertList(rows,type){
    rows=rows||[];
    if(!rows.length) return '<div class="sp-muted">No items</div>';
    return `<div class="si-ci-grid">${rows.map(a=>{
      const name=a.itemName||a.item_name||a.name||a.accessoryId||a.accessory_id||'-';
      const id=a.accessoryId||a.accessory_id||a.idCode||a.id_code||'-';
      return `<div class="si-ci-row"><div class="si-ci-title">${esc(name)}</div><div class="si-ci-sub">${esc(a.team||'-')} • ${esc(id)}<br>${intervalChip(a)} ${checkChip(a)} ${stockChip(a)}</div><div class="si-ci-actions"><button class="si-ci-mini primary" onclick='si_markAccessoryCheckedPrompt(${json(a)})'>Check Done</button>${type==='low'?`<button class="si-ci-mini warn" onclick='si_restockPrompt(${json(a)})'>Restock</button>`:''}</div></div>`;
    }).join('')}</div>`;
  }

  window.si_openAccessoryLowStockAlerts=function(){
    ensureStyle();
    Swal.fire({title:'Loading alerts...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{
      Swal.close();
      if(!res || !res.success){ Swal.fire('Alert Error',(res&&res.message)||'Cannot load alerts','error'); return; }
      const pending=res.pending||[], low=res.lowStock||[], due=res.checkDue||[], soon=res.checkSoon||[];
      window.siCiAlertTab=function(tab){
        document.querySelectorAll('.si-v30-alert-tabs button').forEach(b=>b.classList.remove('active'));
        const btn=document.getElementById('siCiTab_'+tab); if(btn) btn.classList.add('active');
        const body=document.getElementById('siCiAlertBody'); if(!body) return;
        if(tab==='pending' && typeof si_v30PendingHtml==='function') body.innerHTML=si_v30PendingHtml(pending);
        else if(tab==='low') body.innerHTML=renderAlertList(low,'low');
        else if(tab==='soon') body.innerHTML=renderAlertList(soon,'soon');
        else body.innerHTML=renderAlertList(due,'due');
      };
      const html=`<div class="si-v30-alert-tabs"><button id="siCiTab_due" class="active" onclick="siCiAlertTab('due')"><i class="fas fa-calendar-times"></i> Check Due (${due.length})</button><button id="siCiTab_low" onclick="siCiAlertTab('low')"><i class="fas fa-battery-quarter"></i> Low Stock (${low.length})</button><button id="siCiTab_pending" onclick="siCiAlertTab('pending')"><i class="fas fa-clock"></i> Pending (${pending.length})</button><button id="siCiTab_soon" onclick="siCiAlertTab('soon')"><i class="fas fa-hourglass-half"></i> Due Soon (${soon.length})</button></div><div id="siCiAlertBody">${renderAlertList(due,'due')}</div>`;
      Swal.fire({title:'Accessories Alerts',width:1040,html,confirmButtonText:'Close'});
      setHtml('siLowStockHeaderCount', due.length+low.length+pending.length);
    }).withFailureHandler(err=>Swal.fire('Alert Error',err.message||String(err),'error')).si_getAccessoryStockAlerts({limit:200});
  };

  window.si_markAccessoryCheckedPrompt=function(a){
    ensureStyle();
    const key=a.accessoryId||a.accessory_id||a.idCode||a.id_code||a.itemName||a.item_name||a.name;
    const stock=Number(a.stockQty||a.stock_qty||a.qty||0);
    const code=a.checkIntervalCode||a.check_interval_code||'HALF_YEARLY';
    const days=Number(a.checkIntervalDays||a.check_interval_days||180);
    Swal.fire({
      title:'Stock Check Done',
      width:640,
      html:`<div style="text-align:left"><b>${esc(a.itemName||a.item_name||a.name||key)}</b><div class="si-ci-meta">${intervalChip(a)}${checkChip(a)}${stockChip(a)}</div><label>Physical count</label><input id="ciPhysicalQty" class="swal2-input" type="number" min="0" step="1" value="${stock}"><label>Interval</label><select id="ciInterval" class="swal2-input"><option value="MONTHLY|30" ${code==='MONTHLY'?'selected':''}>MONTHLY / 30 days</option><option value="QUARTERLY|90" ${code==='QUARTERLY'?'selected':''}>QUARTERLY / 90 days</option><option value="HALF_YEARLY|180" ${code==='HALF_YEARLY'?'selected':''}>HALF_YEARLY / 180 days</option></select><input id="ciNote" class="swal2-input" placeholder="Note / mismatch reason"><label style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="ciUpdateStock" type="checkbox"> Update system stock to physical count</label></div>`,
      showCancelButton:true,
      confirmButtonText:'Save Check',
      preConfirm:()=>{
        const p=(document.getElementById('ciInterval')?.value||'HALF_YEARLY|180').split('|');
        return {accessoryId:key,physicalQty:Number(document.getElementById('ciPhysicalQty')?.value||0),checkIntervalCode:p[0],checkIntervalDays:Number(p[1]),note:document.getElementById('ciNote')?.value||'',updateStock:document.getElementById('ciUpdateStock')?.checked===true};
      }
    }).then(r=>{
      if(!r.isConfirmed) return;
      Swal.fire({title:'Saving...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
      google.script.run.withSuccessHandler(res=>{
        Swal.close();
        if(res&&res.success){ Swal.fire('Saved',`Next check: ${res.nextCheckDate}`,'success'); initStockInventoryModule(true); }
        else Swal.fire('Error',(res&&res.message)||'Cannot save check','error');
      }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryCheckResult(r.value);
    });
  };
})();
/* ============================================================
   CES Stock Pro V31 — UI fix: interval filter + table alerts + faster recheck
   Paste at the END of Stock_Inventory_java.html.
============================================================ */
(function(){
  const oldFillFilters = window.si_fillFilters;
  const oldRenderKpi = window.si_renderKpi;
  const oldApplyFilters = window.si_applyFilters;
  const oldAccCard = window.si_accCard;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function num(n){return Number(n||0).toLocaleString();}
  function val(id,fb=''){const el=document.getElementById(id);return el?el.value:fb;}
  function setHtml(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
  function get(a,keys,fb=''){
    keys=Array.isArray(keys)?keys:[keys];
    for(const k of keys){ if(a && a[k]!==undefined && a[k]!==null && a[k]!=='') return a[k]; }
    return fb;
  }
  function normInterval(a){
    let code=String(get(a,['checkIntervalCode','check_interval_code','intervalCode','interval_code'],'')).toUpperCase().trim();
    let days=Number(get(a,['checkIntervalDays','check_interval_days','intervalDays','interval_days'],0));
    if(!code && days) code=days<=30?'MONTHLY':(days<=90?'QUARTERLY':'HALF_YEARLY');
    if(!days && code) days=code==='MONTHLY'?30:(code==='QUARTERLY'?90:180);
    if(!code){code='HALF_YEARLY';days=180;}
    return {code,days};
  }
  function stockQty(a){return Number(get(a,['stockQty','stock_qty','qty','stockqty'],0));}
  function minQty(a){return Number(get(a,['minStockQty','min_stock_qty','minStock','minstockqty'],0));}
  function checkStatus(a){return String(get(a,['checkStatus','check_status'],'OK')).toUpperCase();}
  function stockStatus(a){
    const explicit=String(get(a,['stockStatus','stock_status'],'')).toUpperCase();
    if(explicit) return explicit;
    return stockQty(a)<=minQty(a)?'LOW_STOCK':'STOCK_OK';
  }
  function itemName(a){return get(a,['itemName','item_name','name','itemname','accessoryId','accessory_id'],'-');}
  function itemId(a){return get(a,['accessoryId','accessory_id','idCode','id_code','idcode','itemName','item_name','name'],'-');}
  function js(a){return JSON.stringify(a).replace(/'/g,'&#39;').replace(/</g,'&lt;');}
  function ensureStyle(){
    if(document.getElementById('si-v31-style')) return;
    const s=document.createElement('style'); s.id='si-v31-style';
    s.textContent=`
      #siAccInterval{min-width:150px!important}
      .si-v31-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;border:1px solid #e2e8f0;background:#f8fafc;color:#334155;margin:2px;white-space:nowrap}
      .si-v31-monthly{background:#f5f6f8;color:#003DA5;border-color:#bfdbfe}.si-v31-quarterly{background:#fef2f2;color:#991b1b;border-color:#fecaca}.si-v31-half{background:#f8fafc;color:#475569;border-color:#e2e8f0}.si-v31-due{background:#fef2f2;color:#E4002B;border-color:#fecaca}.si-v31-soon{background:#fef2f2;color:#e4002b;border-color:#fecaca}.si-v31-ok{background:#f5f6f8;color:#003DA5;border-color:#bfdbfe}
      .si-v31-alert-wrap{max-height:560px;overflow:auto;border:1px solid #e2e8f0;border-radius:14px}.si-v31-alert-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}.si-v31-alert-table th{position:sticky;top:0;background:#f8fafc;color:#475569;text-align:left;padding:10px;border-bottom:1px solid #e2e8f0;z-index:1}.si-v31-alert-table td{padding:9px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.si-v31-alert-table tr:hover{background:#f8fafc}.si-v31-alert-table .num{text-align:right;font-weight:900}.si-v31-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}.si-v31-btn{border:0;border-radius:9px;padding:7px 9px;font-size:11px;font-weight:900;cursor:pointer}.si-v31-btn.primary{background:#003DA5;color:#fff}.si-v31-btn.warn{background:#E4002B;color:#fff}.si-v31-btn.ghost{background:#f1f5f9;color:#002d7a}.si-v31-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}.si-v31-tabs button{border:1px solid #e2e8f0;border-radius:999px;background:#fff;padding:8px 12px;font-weight:900;font-size:12px;color:#475569}.si-v31-tabs button.active{background:#003DA5;color:#fff;border-color:#003DA5}.si-v31-note{font-size:11px;color:#64748b;margin:4px 0 10px;text-align:center}.si-v31-checkbox{display:flex!important;align-items:center!important;gap:8px!important;margin-top:10px!important;font-size:13px!important;color:#334155!important}
    `;
    document.head.appendChild(s);
  }
  function intervalChip(a){const it=normInterval(a);const cls=it.code==='MONTHLY'?'si-v31-monthly':(it.code==='QUARTERLY'?'si-v31-quarterly':'si-v31-half');return `<span class="si-v31-chip ${cls}"><i class="fas fa-repeat"></i>${esc(it.code)} / ${it.days}d</span>`;}
  function dueChip(a){const st=checkStatus(a), days=get(a,['daysUntilCheck','days_until_check'],'');let cls=st==='OK'?'si-v31-ok':(st==='DUE_SOON'?'si-v31-soon':'si-v31-due');return `<span class="si-v31-chip ${cls}"><i class="fas fa-calendar-check"></i>${esc(st)}${days!==''?' '+esc(days)+'d':''}</span>`;}
  function stockChip(a){const q=stockQty(a), m=minQty(a), low=stockStatus(a)==='LOW_STOCK';return `<span class="si-v31-chip ${low?'si-v31-due':'si-v31-ok'}"><i class="fas fa-box"></i>${low?'LOW':'STOCK'} ${num(q)}/${num(m)}</span>`;}

  function ensureIntervalFilter(){
    const box=document.getElementById('siAccFilters'); if(!box) return;
    let sel=document.getElementById('siAccInterval');
    if(!sel){ sel=document.createElement('select'); sel.id='siAccInterval'; box.appendChild(sel); }
    const current=sel.value || 'all';
    sel.innerHTML='<option value="all">All Interval</option><option value="MONTHLY">MONTHLY / 30d</option><option value="QUARTERLY">QUARTERLY / 90d</option><option value="HALF_YEARLY">HALF_YEARLY / 180d</option><option value="DUE">Check Due / Overdue</option><option value="DUE_SOON">Due Soon</option><option value="LOW_STOCK">Low Stock</option>';
    sel.value=[...sel.options].some(o=>o.value===current)?current:'all';
    sel.onchange=function(){ window.si_applyFilters(); };
  }

  window.si_fillFilters=function(){ if(oldFillFilters) oldFillFilters(); ensureStyle(); ensureIntervalFilter(); };

  window.si_renderKpi=function(){
    ensureStyle(); if(oldRenderKpi) oldRenderKpi();
    const k=(window.SI&&SI.raw&&SI.raw.kpi)||{};
    setHtml('siLowStockHeaderCount', Number(k.accLow||0)+Number(k.accCheckDue||0)+Number(k.accPending||k.pendingApproval||0));
    const grid=document.getElementById('siAccKpiGrid');
    if(grid){
      const old=document.getElementById('siV31KpiPatch'); if(old) old.remove();
      grid.insertAdjacentHTML('beforeend', `<div id="siV31KpiPatch" style="display:contents"><div class="sp-kpi"><div class="ico" style="background:#fee2e2"><i class="fas fa-calendar-times" style="color:#E4002B"></i></div><div class="label">Check Due</div><div class="val" style="color:#E4002B">${num(k.accCheckDue||0)}</div></div><div class="sp-kpi"><div class="ico" style="background:#fee2e2"><i class="fas fa-clock" style="color:#c7001f"></i></div><div class="label">Due Soon</div><div class="val" style="color:#c7001f">${num(k.accCheckSoon||0)}</div></div><div class="sp-kpi"><div class="ico" style="background:#f1f5f9"><i class="fas fa-repeat" style="color:#004aad"></i></div><div class="label">M / Q / H</div><div class="val" style="color:#004aad;font-size:18px">${num(k.accMonthly||0)} / ${num(k.accQuarterly||0)} / ${num(k.accHalfYearly||0)}</div></div></div>`);
    }
  };

  window.si_applyFilters=function(){
    ensureStyle(); ensureIntervalFilter();
    if(!window.SI || SI.tab!=='acc') return oldApplyFilters ? oldApplyFilters() : undefined;
    const q=val('siAccSearch','').toLowerCase(), team=val('siAccTeam','all'), item=val('siAccItem','all'), st=val('siAccStatus','all'), act=val('siAccAction','all'), interval=val('siAccInterval','all');
    SI.accFiltered=(SI.acc||[]).filter(a=>{
      const nm=itemName(a), ar=get(a,['actionRequired','action_required','actionrequired'],'');
      const it=normInterval(a), cst=checkStatus(a), sst=stockStatus(a);
      const text=[itemId(a),nm,get(a,['team'],''),get(a,['type'],''),get(a,['status'],''),ar,get(a,['location'],''),get(a,['remark'],''),it.code,cst,sst].join(' ').toLowerCase();
      if(q && !text.includes(q)) return false;
      if(team!=='all' && get(a,['team'],'')!==team) return false;
      if(item!=='all' && nm!==item) return false;
      if(st!=='all' && get(a,['status'],'')!==st) return false;
      if(act!=='all' && ar!==act) return false;
      if(interval==='LOW_STOCK') return sst==='LOW_STOCK';
      if(interval==='DUE') return cst==='DUE' || cst==='OVERDUE';
      if(interval==='DUE_SOON') return cst==='DUE_SOON';
      if(interval!=='all') return it.code===interval;
      return true;
    });
    SI.accPage=1;
    if(typeof window.si_renderAccCards==='function') window.si_renderAccCards();
  };

  window.si_accCard=function(a,i){
    ensureStyle();
    const base=oldAccCard ? oldAccCard(a,i) : '';
    const panel=`<div class="si-ci-meta" style="margin-top:8px">${intervalChip(a)}${dueChip(a)}${stockChip(a)}</div><div class="si-ci-actions" style="margin-top:8px"><button class="si-v31-btn primary" onclick='si_markAccessoryCheckedPrompt(${js(a)})'><i class="fas fa-clipboard-check"></i> Recheck Stock</button></div>`;
    if(base && base.includes('</div>')) return base.replace(/<div class="si-ci-meta[\s\S]*?<\/div><div class="si-ci-actions[\s\S]*?<\/div>/,'').replace('</div>', panel+'</div>');
    return `<div class="sp-acc-card"><b>${esc(itemName(a))}</b>${panel}</div>`;
  };

  function renderAlertTable(rows,type){
    rows=rows||[];
    if(!rows.length) return '<div class="sp-muted" style="padding:24px;text-align:center">No items</div>';
    return `<div class="si-v31-alert-wrap"><table class="si-v31-alert-table"><thead><tr><th>Item</th><th>Team</th><th>Interval</th><th>Last Checked</th><th>Next Due</th><th>Status</th><th class="num">Stock</th><th class="num">Min</th><th>Action</th></tr></thead><tbody>${rows.map(a=>`<tr><td><b>${esc(itemName(a))}</b><div class="sp-muted">${esc(itemId(a))}</div></td><td>${esc(get(a,['team'],''))}</td><td>${intervalChip(a)}</td><td>${esc(get(a,['lastCheckDate','last_check_date'],'-'))}</td><td>${esc(get(a,['nextCheckDate','next_check_date'],'-'))}</td><td>${dueChip(a)}${stockChip(a)}</td><td class="num">${num(stockQty(a))}</td><td class="num">${num(minQty(a))}</td><td><div class="si-v31-actions"><button class="si-v31-btn primary" onclick='si_markAccessoryCheckedPrompt(${js(a)})'>Recheck</button>${type==='low'?`<button class="si-v31-btn warn" onclick='si_restockPrompt(${js(a)})'>Restock</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;
  }

  window.si_openAccessoryLowStockAlerts=function(){
    ensureStyle();
    Swal.fire({title:'Loading alerts...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{
      Swal.close();
      if(!res || !res.success){ Swal.fire('Alert Error',(res&&res.message)||'Cannot load alerts','error'); return; }
      const pending=res.pending||[], low=res.lowStock||[], due=res.checkDue||[], soon=res.checkSoon||[];
      window.siV31AlertTab=function(tab){
        document.querySelectorAll('.si-v31-tabs button').forEach(b=>b.classList.remove('active'));
        const btn=document.getElementById('siV31Tab_'+tab); if(btn) btn.classList.add('active');
        const body=document.getElementById('siV31AlertBody'); if(!body) return;
        if(tab==='pending' && typeof si_v30PendingHtml==='function') body.innerHTML=si_v30PendingHtml(pending);
        else if(tab==='low') body.innerHTML=renderAlertTable(low,'low');
        else if(tab==='soon') body.innerHTML=renderAlertTable(soon,'soon');
        else body.innerHTML=renderAlertTable(due,'due');
      };
      const html=`<div class="si-v31-note">Alert แสดงแบบ table เพื่อลด DOM/card จำนวนมากและทำงานเร็วขึ้น</div><div class="si-v31-tabs"><button id="siV31Tab_due" class="active" onclick="siV31AlertTab('due')"><i class="fas fa-calendar-times"></i> Check Due (${due.length})</button><button id="siV31Tab_low" onclick="siV31AlertTab('low')"><i class="fas fa-battery-quarter"></i> Restock / Low (${low.length})</button><button id="siV31Tab_pending" onclick="siV31AlertTab('pending')"><i class="fas fa-clock"></i> Pending (${pending.length})</button><button id="siV31Tab_soon" onclick="siV31AlertTab('soon')"><i class="fas fa-hourglass-half"></i> Due Soon (${soon.length})</button></div><div id="siV31AlertBody">${renderAlertTable(due,'due')}</div>`;
      Swal.fire({title:'Accessories Alerts',width:1180,html,confirmButtonText:'Close'});
      setHtml('siLowStockHeaderCount', due.length+low.length+pending.length);
    }).withFailureHandler(err=>Swal.fire('Alert Error',err.message||String(err),'error')).si_getAccessoryStockAlerts({limit:300});
  };

  window.si_markAccessoryCheckedPrompt=function(a){
    ensureStyle();
    const key=itemId(a), q=stockQty(a), it=normInterval(a);
    Swal.fire({
      title:'Recheck Stock', width:620,
      html:`<div style="text-align:left"><b>${esc(itemName(a))}</b><div style="margin:8px 0">${intervalChip(a)}${dueChip(a)}${stockChip(a)}</div><label>Physical count</label><input id="ciPhysicalQty" class="swal2-input" type="number" min="0" step="1" value="${q}"><label>Interval</label><select id="ciInterval" class="swal2-input"><option value="MONTHLY|30" ${it.code==='MONTHLY'?'selected':''}>MONTHLY / 30 days</option><option value="QUARTERLY|90" ${it.code==='QUARTERLY'?'selected':''}>QUARTERLY / 90 days</option><option value="HALF_YEARLY|180" ${it.code==='HALF_YEARLY'?'selected':''}>HALF_YEARLY / 180 days</option></select><input id="ciNote" class="swal2-input" placeholder="Note / mismatch reason"><label class="si-v31-checkbox"><input checked disabled type="checkbox"> Update inventory quantity and last checked date automatically</label></div>`,
      showCancelButton:true, confirmButtonText:'Save Recheck',
      preConfirm:()=>{ const p=(document.getElementById('ciInterval')?.value||'HALF_YEARLY|180').split('|'); return {accessoryId:key,physicalQty:Number(document.getElementById('ciPhysicalQty')?.value||0),checkIntervalCode:p[0],checkIntervalDays:Number(p[1]),note:document.getElementById('ciNote')?.value||'',updateStock:true}; }
    }).then(r=>{
      if(!r.isConfirmed) return;
      Swal.fire({title:'Saving recheck...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
      google.script.run.withSuccessHandler(res=>{
        Swal.close();
        if(res&&res.success){ Swal.fire('Saved',`Stock updated: ${num(res.stockQty)}<br>Last checked: ${esc(res.lastCheckDate)}<br>Next check: ${esc(res.nextCheckDate)}`,'success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); }
        else Swal.fire('Error',(res&&res.message)||'Cannot save recheck','error');
      }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryCheckResult(r.value);
    });
  };
})();
/* ============================================================
   CES Stock Pro V32 — Simplified Accessories UX Patch
   Paste at the END of Stock_Inventory_java.html.
   - Removes interval filter from UI.
   - Merges Check Due + Restock/Low into one Action Required tab.
   - Adds batch-select recheck stock from alert table.
   - Restock date defaults to current day and is submitted automatically.
   - Uses preloaded alerts/history from the last inventory load when available.
============================================================ */
(function(){
  const oldFillFilters = window.si_fillFilters;
  const oldApplyFilters = window.si_applyFilters;
  const oldRenderKpi = window.si_renderKpi;
  const oldInit = window.initStockInventoryModule;

  function esc(x){
    if(typeof spEsc === 'function') return spEsc(x);
    return String(x ?? '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  }
  function num(x){ return typeof spNum === 'function' ? spNum(x) : (Number(x || 0).toLocaleString()); }
  function val(id, fallback=''){ return typeof spVal === 'function' ? spVal(id, fallback) : ((document.getElementById(id)||{}).value || fallback); }
  function setHtml(id, html){ if(typeof spSetHtml === 'function') spSetHtml(id, html); else { const el=document.getElementById(id); if(el) el.innerHTML=html; } }
  function today(){ return new Date().toISOString().slice(0,10); }
  function js(o){ return JSON.stringify(o || {}).replace(/'/g,'&#39;').replace(/</g,'&lt;'); }
  function get(o, keys, fallback=''){
    keys = Array.isArray(keys) ? keys : [keys];
    for(const k of keys){ if(o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; }
    return fallback;
  }
  function idOf(a){ return get(a, ['accessoryId','accessory_id','idCode','id_code','idcode','itemName','item_name','name'], ''); }
  function nameOf(a){ return get(a, ['itemName','item_name','name','itemname','accessoryId','accessory_id'], '-'); }
  function stockQty(a){ return Number(get(a, ['stockQty','stock_qty','qty','stockqty'], 0)); }
  function minQty(a){ return Number(get(a, ['minStockQty','min_stock_qty','minStock','min_stock','minstockqty'], 0)); }
  function checkStatus(a){
    const raw = String(get(a, ['checkStatus','check_status'], '')).toUpperCase();
    if(raw) return raw;
    const next = String(get(a, ['nextCheckDate','next_check_date'], ''));
    if(!next) return 'DUE';
    const d = Math.ceil((new Date(next + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
    if(d < 0) return 'OVERDUE';
    if(d === 0) return 'DUE';
    if(d <= 7) return 'DUE_SOON';
    return 'OK';
  }
  function intervalOf(a){
    const code = String(get(a, ['checkIntervalCode','check_interval_code'], '')).toUpperCase() || 'HALF_YEARLY';
    const days = Number(get(a, ['checkIntervalDays','check_interval_days'], code==='MONTHLY'?30:(code==='QUARTERLY'?90:180)));
    return { code, days };
  }
  function isLow(a){
    const st = String(get(a, ['stockStatus','stock_status'], '')).toUpperCase();
    return st === 'LOW_STOCK' || stockQty(a) <= minQty(a);
  }
  function isAction(a){ const cs = checkStatus(a); return isLow(a) || cs === 'DUE' || cs === 'OVERDUE'; }
  function intervalChip(a){ const it=intervalOf(a); return `<span class="si-v32-chip neutral"><i class="fas fa-repeat"></i>${esc(it.code)} / ${esc(it.days)}d</span>`; }
  function dueChip(a){
    const cs=checkStatus(a), next=get(a,['nextCheckDate','next_check_date'],'-');
    if(cs==='OVERDUE' || cs==='DUE') return `<span class="si-v32-chip danger"><i class="fas fa-calendar-times"></i>DUE ${esc(next)}</span>`;
    if(cs==='DUE_SOON') return `<span class="si-v32-chip warn"><i class="fas fa-clock"></i>SOON ${esc(next)}</span>`;
    return `<span class="si-v32-chip ok"><i class="fas fa-check"></i>OK ${esc(next)}</span>`;
  }
  function stockChip(a){ return `<span class="si-v32-chip ${isLow(a)?'danger':'ok'}"><i class="fas fa-box"></i>${isLow(a)?'LOW':'STOCK'} ${num(stockQty(a))}/${num(minQty(a))}</span>`; }

  function style(){
    if(document.getElementById('stockpro-v32-style')) return;
    const st=document.createElement('style'); st.id='stockpro-v32-style';
    st.textContent=`
      #siAccInterval{display:none!important}
      .si-v32-note{font-size:12px;color:#64748b;margin:0 0 10px;text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px}
      .si-v32-tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:12px}.si-v32-tabs button{border:1px solid #f0f2f5;background:#fff;color:#334155;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;cursor:pointer}.si-v32-tabs button.active{background:#003DA5;color:#fff;border-color:#003DA5}
      .si-v32-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 10px;flex-wrap:wrap}.si-v32-toolbar-left{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.si-v32-btn{border:0;border-radius:9px;padding:7px 10px;font-weight:900;font-size:11px;cursor:pointer}.si-v32-btn.primary{background:#003DA5;color:#fff}.si-v32-btn.warn{background:#E4002B;color:#fff}.si-v32-btn.soft{background:#f5f6f8;color:#003DA5}.si-v32-btn.bad{background:#fee2e2;color:#c7001f}.si-v32-btn.ok{background:#f5f6f8;color:#002d7a}.si-v32-btn.gray{background:#f1f5f9;color:#334155}
      .si-v32-table-wrap{max-height:540px;overflow:auto;border:1px solid #e2e8f0;border-radius:14px;background:white}.si-v32-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}.si-v32-table th{position:sticky;top:0;background:#f8fafc;color:#334155;text-align:left;padding:10px 8px;border-bottom:1px solid #e2e8f0;z-index:2}.si-v32-table td{padding:9px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.si-v32-table tr:hover td{background:#f8fafc}.si-v32-table .num{text-align:right;font-variant-numeric:tabular-nums}.si-v32-table .chk{text-align:center;width:34px}.si-v32-qty{width:74px!important;border:1px solid #cbd5e1!important;border-radius:8px!important;padding:6px!important;text-align:center!important;font-weight:900!important}.si-v32-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900;margin:2px;border:1px solid}.si-v32-chip.neutral{background:#f8fafc;color:#334155;border-color:#e2e8f0}.si-v32-chip.danger{background:#fee2e2;color:#c7001f;border-color:#fecaca}.si-v32-chip.warn{background:#fef2f2;color:#c7001f;border-color:#fecaca}.si-v32-chip.ok{background:#f5f6f8;color:#002d7a;border-color:#bfdbfe}.si-v32-empty{padding:28px;text-align:center;color:#64748b}.si-v32-kpi-action .val{font-size:24px!important}.swal2-popup .si-v32-table-wrap{text-align:left}
    `;
    document.head.appendChild(st);
  }

  function removeIntervalFilter(){ const el=document.getElementById('siAccInterval'); if(el) el.remove(); }

  window.si_fillFilters = function(){ if(oldFillFilters) oldFillFilters(); style(); removeIntervalFilter(); };

  window.si_applyFilters = function(){
    style(); removeIntervalFilter();
    if(!window.SI || SI.tab !== 'acc') return oldApplyFilters ? oldApplyFilters() : undefined;
    const q=val('siAccSearch','').toLowerCase(), team=val('siAccTeam','all'), item=val('siAccItem','all'), st=val('siAccStatus','all'), act=val('siAccAction','all');
    SI.accFiltered=(SI.acc||[]).filter(a=>{
      const nm=nameOf(a), ar=get(a,['actionRequired','action_required','actionrequired'],'');
      const text=[idOf(a),nm,get(a,['team'],''),get(a,['type'],''),get(a,['status'],''),ar,get(a,['location'],''),get(a,['remark'],''),checkStatus(a),isLow(a)?'low_stock':'stock'].join(' ').toLowerCase();
      if(q && !text.includes(q)) return false;
      if(team !== 'all' && get(a,['team'],'') !== team) return false;
      if(item !== 'all' && nm !== item) return false;
      if(st !== 'all' && get(a,['status'],'') !== st) return false;
      if(act !== 'all' && ar !== act) return false;
      return true;
    });
    SI.accPage=1;
    if(typeof window.si_renderAccCards === 'function') window.si_renderAccCards();
  };

  window.si_renderKpi = function(){
    style(); if(oldRenderKpi) oldRenderKpi(); removeIntervalFilter();
    const alerts = getPreloadedAlerts();
    const k=(window.SI&&SI.raw&&SI.raw.kpi)||{};
    const actionCount = (alerts.actionRequired||[]).length || Number(k.accActionRequired||0);
    const pendingCount = (alerts.pending||[]).length || Number(k.accPending||k.pendingApproval||0);
    setHtml('siLowStockHeaderCount', actionCount + pendingCount);
    const grid=document.getElementById('siAccKpiGrid');
    if(grid){
      const old=document.getElementById('siV32KpiPatch'); if(old) old.remove();
      grid.insertAdjacentHTML('beforeend', `<div id="siV32KpiPatch" style="display:contents"><div class="sp-kpi si-v32-kpi-action"><div class="ico" style="background:#fee2e2"><i class="fas fa-triangle-exclamation" style="color:#E4002B"></i></div><div class="label">Action Required</div><div class="val" style="color:#E4002B">${num(actionCount)}</div></div><div class="sp-kpi"><div class="ico" style="background:#fee2e2"><i class="fas fa-clock" style="color:#c7001f"></i></div><div class="label">Due Soon</div><div class="val" style="color:#c7001f">${num((alerts.checkSoon||[]).length || k.accCheckSoon || 0)}</div></div></div>`);
    }
  };

  function buildLocalAlerts(){
    const acc = (window.SI && SI.acc) ? SI.acc : [];
    const action = acc.filter(isAction).sort((a,b)=> (isLow(b)-isLow(a)) || String(get(a,['team'],'')).localeCompare(String(get(b,['team'],''))));
    return { success:true, actionRequired:action, lowStock:acc.filter(isLow), checkDue:acc.filter(a=>['DUE','OVERDUE'].includes(checkStatus(a))), checkSoon:acc.filter(a=>checkStatus(a)==='DUE_SOON'), pending:[], counts:{actionRequired:action.length} };
  }
  function getPreloadedAlerts(){
    const raw = window.SI && SI.raw ? SI.raw : {};
    const a = raw.preloadedAlerts || raw.alerts || null;
    if(a && a.success !== false) return Object.assign(buildLocalAlerts(), a);
    return buildLocalAlerts();
  }
  function setPreloadedAlerts(a){ if(window.SI){ SI.raw = SI.raw || {}; SI.raw.preloadedAlerts = a; SI.raw.alerts = a; } }

  function renderActionTable(rows, mode){
    rows = rows || [];
    window.siV32AlertRows = rows;
    if(!rows.length) return '<div class="si-v32-empty">No items</div>';
    const canBatch = mode !== 'pending';
    const toolbar = canBatch ? `<div class="si-v32-toolbar"><div class="si-v32-toolbar-left"><button class="si-v32-btn soft" onclick="si_v32ToggleAllAlertRows(true)">Select all</button><button class="si-v32-btn gray" onclick="si_v32ToggleAllAlertRows(false)">Clear</button></div><button class="si-v32-btn primary" onclick="si_v32BatchRecheckFromModal()"><i class="fas fa-clipboard-check"></i> Batch Recheck Selected</button></div>` : '';
    const headChk = canBatch ? '<th class="chk"><input type="checkbox" onchange="si_v32ToggleAllAlertRows(this.checked)"></th>' : '';
    const body = rows.map((a,i)=>{
      const low=isLow(a), cs=checkStatus(a), id=idOf(a);
      const chk = canBatch ? `<td class="chk"><input type="checkbox" class="siV32Chk" data-idx="${i}" ${mode==='action'?'checked':''}></td>` : '';
      const qtyInput = canBatch ? `<input class="si-v32-qty siV32Qty" data-idx="${i}" type="number" min="0" step="1" value="${stockQty(a)}">` : num(stockQty(a));
      return `<tr>${chk}<td><b>${esc(nameOf(a))}</b><div class="sp-muted">${esc(id)}</div></td><td>${esc(get(a,['team'],''))}</td><td>${intervalChip(a)}</td><td>${esc(get(a,['lastCheckDate','last_check_date'],'-'))}</td><td>${esc(get(a,['nextCheckDate','next_check_date'],'-'))}</td><td>${dueChip(a)}${stockChip(a)}</td><td class="num">${qtyInput}</td><td class="num">${num(minQty(a))}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="si-v32-btn primary" onclick='si_markAccessoryCheckedPrompt(${js(a)})'>Recheck</button>${low?`<button class="si-v32-btn warn" onclick='si_restockPrompt(${js(a)})'>Restock</button>`:''}</div></td></tr>`;
    }).join('');
    return `${toolbar}<div class="si-v32-table-wrap"><table class="si-v32-table"><thead><tr>${headChk}<th>Item</th><th>Team</th><th>Interval</th><th>Last Checked</th><th>Next Due</th><th>Status</th><th class="num">Physical</th><th class="num">Min</th><th>Action</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderPendingTable(rows){
    rows = rows || [];
    if(!rows.length) return '<div class="si-v32-empty">No pending approval requests</div>';
    return `<div class="si-v32-table-wrap"><table class="si-v32-table"><thead><tr><th>Request</th><th>Item</th><th>Team</th><th class="num">Qty</th><th>Borrower / Location</th><th>Requester</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.requestId||'-')}</b><div class="sp-muted">${esc(r.timestamp||'')}</div></td><td>${esc(r.itemName||r.accessoryId||'-')}<div class="sp-muted">${esc(r.accessoryId||'')}</div></td><td>${esc(r.team||'-')}</td><td class="num">${num(r.qty||0)}</td><td>${esc(r.borrower||'-')}<div class="sp-muted">${esc(r.location||'-')}</div></td><td>${esc(r.requestedBy||r.requesterEmail||'-')}</td><td><span class="si-v32-chip warn">${esc(r.status||'PENDING')}</span></td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="si-v32-btn ok" onclick="si_v32Approve('${esc(r.requestId||'')}')">Approve</button><button class="si-v32-btn bad" onclick="si_v32Reject('${esc(r.requestId||'')}')">Reject</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }

  window.si_v32ToggleAllAlertRows = function(checked){ document.querySelectorAll('.siV32Chk').forEach(x=>{ x.checked=!!checked; }); };

  window.si_v32BatchRecheckFromModal = function(){
    const rows = window.siV32AlertRows || [];
    const items = [];
    document.querySelectorAll('.siV32Chk:checked').forEach(chk=>{
      const i = Number(chk.getAttribute('data-idx'));
      const a = rows[i]; if(!a) return;
      const qtyEl = document.querySelector(`.siV32Qty[data-idx="${i}"]`);
      const it=intervalOf(a);
      items.push({ accessoryId:idOf(a), physicalQty:Number(qtyEl ? qtyEl.value : stockQty(a)), checkIntervalCode:it.code, checkIntervalDays:it.days, note:'Batch recheck from alert table' });
    });
    if(!items.length){ Swal.fire('No item selected','','info'); return; }
    Swal.fire({title:'Confirm Batch Recheck',html:`Update inventory quantity and last checked date for <b>${items.length}</b> item(s).<br>Check date: <b>${today()}</b>`,icon:'question',showCancelButton:true,confirmButtonText:'Save Batch'}).then(r=>{
      if(!r.isConfirmed) return;
      Swal.fire({title:'Saving batch recheck...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
      google.script.run.withSuccessHandler(res=>{
        Swal.close();
        if(res && res.success){ Swal.fire('Saved',res.message || 'Batch recheck saved','success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); }
        else Swal.fire('Error',(res&&res.message)||'Batch recheck failed','error');
      }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryCheckResultBatch({items, checkDate:today()});
    });
  };

  function showAlerts(alerts){
    alerts = alerts || getPreloadedAlerts();
    const action = alerts.actionRequired || [];
    const pending = alerts.pending || [];
    const soon = alerts.checkSoon || [];
    window.siV32AlertTab = function(tab){
      document.querySelectorAll('.si-v32-tabs button').forEach(b=>b.classList.remove('active'));
      const btn=document.getElementById('siV32Tab_'+tab); if(btn) btn.classList.add('active');
      const body=document.getElementById('siV32AlertBody'); if(!body) return;
      if(tab==='pending') body.innerHTML=renderPendingTable(pending);
      else if(tab==='soon') body.innerHTML=renderActionTable(soon,'soon');
      else body.innerHTML=renderActionTable(action,'action');
    };
    const html=`<div class="si-v32-note">รวม Check due + Restock/Low ไว้ในแท็บเดียว ลดความซ้ำซ้อน และเลือกหลายรายการเพื่อ Recheck พร้อมกันได้</div><div class="si-v32-tabs"><button id="siV32Tab_action" class="active" onclick="siV32AlertTab('action')"><i class="fas fa-triangle-exclamation"></i> Action Required (${action.length})</button><button id="siV32Tab_pending" onclick="siV32AlertTab('pending')"><i class="fas fa-clock"></i> Pending Approval (${pending.length})</button><button id="siV32Tab_soon" onclick="siV32AlertTab('soon')"><i class="fas fa-hourglass-half"></i> Due Soon (${soon.length})</button></div><div id="siV32AlertBody">${renderActionTable(action,'action')}</div>`;
    Swal.fire({title:'Accessories Alerts',width:1200,html,confirmButtonText:'Close'});
    setHtml('siLowStockHeaderCount', action.length + pending.length);
  }

  window.si_openAccessoryLowStockAlerts = function(){
    style(); removeIntervalFilter();
    const cached = getPreloadedAlerts();
    if((cached.actionRequired && cached.actionRequired.length) || (cached.pending && cached.pending.length) || (cached.checkSoon && cached.checkSoon.length)){
      showAlerts(cached);
      // Background refresh only, no blocking.
      try{ google.script.run.withSuccessHandler(res=>{ if(res&&res.success){ setPreloadedAlerts(res); setHtml('siLowStockHeaderCount',(res.actionRequired||[]).length+(res.pending||[]).length); } }).si_getAccessoryStockAlerts({limit:300}); }catch(e){}
      return;
    }
    Swal.fire({title:'Loading alerts...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{ Swal.close(); if(res&&res.success){ setPreloadedAlerts(res); showAlerts(res); } else Swal.fire('Alert Error',(res&&res.message)||'Cannot load alerts','error'); }).withFailureHandler(err=>Swal.fire('Alert Error',err.message||String(err),'error')).si_getAccessoryStockAlerts({limit:300});
  };

  window.si_restockPrompt = function(a){
    style();
    const d=today(), q=stockQty(a), m=minQty(a);
    Swal.fire({
      title:`Restock ${esc(nameOf(a))}`,
      width:600,
      html:`<div style="text-align:left"><div style="margin-bottom:10px">${stockChip(a)}</div><label>Restock date</label><input id="rsDate" class="swal2-input" type="date" value="${d}" readonly><label>Restock quantity</label><input id="rsQty" class="swal2-input" type="number" min="1" value="1"><input id="rsNote" class="swal2-input" placeholder="Note"><div class="si-v32-note">ระบบจะใช้วันที่ปัจจุบันเป็นวันที่รับเข้า stock อัตโนมัติ</div></div>`,
      showCancelButton:true,
      confirmButtonText:'Save Restock'
    }).then(r=>{
      if(!r.isConfirmed) return;
      Swal.fire({title:'Saving restock...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
      google.script.run.withSuccessHandler(res=>{
        Swal.close();
        if(res&&res.success){ Swal.fire('Saved',`Restock date: ${esc(res.restockDate||d)}<br>New Qty: ${num(res.newQty||res.stockQty||0)}`,'success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); }
        else Swal.fire('Error',(res&&res.message)||'Restock failed','error');
      }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_restockAccessory({accessoryId:idOf(a),qty:val('rsQty','1'),restockDate:d,note:val('rsNote','')});
    });
  };

  window.si_markAccessoryCheckedPrompt = function(a){
    style();
    const key=idOf(a), q=stockQty(a), it=intervalOf(a), d=today();
    Swal.fire({
      title:'Recheck Stock', width:620,
      html:`<div style="text-align:left"><b>${esc(nameOf(a))}</b><div style="margin:8px 0">${intervalChip(a)}${dueChip(a)}${stockChip(a)}</div><label>Check date</label><input id="ciCheckDate" class="swal2-input" type="date" value="${d}" readonly><label>Physical count</label><input id="ciPhysicalQty" class="swal2-input" type="number" min="0" step="1" value="${q}"><input id="ciNote" class="swal2-input" placeholder="Note / mismatch reason"><div class="si-v32-note">ระบบจะอัปเดต stock_qty และ last_check_date ด้วยวันที่ปัจจุบันอัตโนมัติ</div></div>`,
      showCancelButton:true, confirmButtonText:'Save Recheck',
      preConfirm:()=>({accessoryId:key, physicalQty:Number(val('ciPhysicalQty','0')), checkIntervalCode:it.code, checkIntervalDays:it.days, checkDate:d, note:val('ciNote','')})
    }).then(r=>{
      if(!r.isConfirmed) return;
      Swal.fire({title:'Saving recheck...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
      google.script.run.withSuccessHandler(res=>{
        Swal.close();
        if(res&&res.success){ Swal.fire('Saved',`Stock updated: ${num(res.stockQty)}<br>Last checked: ${esc(res.lastCheckDate)}<br>Next check: ${esc(res.nextCheckDate)}`,'success'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function') initStockDashboardModule(true); }
        else Swal.fire('Error',(res&&res.message)||'Cannot save recheck','error');
      }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).si_updateAccessoryCheckResult(r.value);
    });
  };

  window.si_v32Approve = function(requestId){
    if(!requestId) return;
    const fn = (typeof si_v30ApproveFromAlert === 'function') ? si_v30ApproveFromAlert : null;
    if(fn) return fn(requestId);
    Swal.fire({title:'Approve request?',text:requestId,icon:'question',showCancelButton:true,confirmButtonText:'Approve'}).then(r=>{ if(!r.isConfirmed) return; google.script.run.withSuccessHandler(res=>{ if(res&&res.success){ Swal.fire('Approved',res.message||'Done','success'); initStockInventoryModule(true); } else Swal.fire('Error',(res&&res.message)||'Failed','error'); }).si_approveAccessoryRequestFromWeb({requestId}); });
  };
  window.si_v32Reject = function(requestId){
    if(!requestId) return;
    const fn = (typeof si_v30RejectFromAlert === 'function') ? si_v30RejectFromAlert : null;
    if(fn) return fn(requestId);
    Swal.fire({title:'Reject request?',text:requestId,icon:'warning',showCancelButton:true,confirmButtonText:'Reject'}).then(r=>{ if(!r.isConfirmed) return; google.script.run.withSuccessHandler(res=>{ if(res&&res.success){ Swal.fire('Rejected',res.message||'Done','success'); initStockInventoryModule(true); } else Swal.fire('Error',(res&&res.message)||'Failed','error'); }).si_rejectAccessoryRequestFromWeb({requestId}); });
  };

  window.si_openInventoryHistory = function(){
    style();
    const scope = (window.SI && SI.tab === 'acc') ? 'accessories' : 'equipment';
    const label = scope === 'accessories' ? 'Accessories History' : 'Equipment History';
    const pre = window.SI && SI.raw && SI.raw.preloadedHistory && SI.raw.preloadedHistory[scope];
    const show = (res) => {
      const rows=(res&&res.success&&res.logs)?res.logs:[];
      const html=rows.length?`<div class="si-history-scope-pill"><i class="fas ${scope==='accessories'?'fa-plug':'fa-microchip'}"></i>${label} • from last loaded data</div><div class="si-history-list">${rows.map(x=>`<div class="si-history-item"><div class="si-history-dot"></div><div><div class="si-history-title">${esc(x.action||'-')} ${x.refId?('• '+esc(x.refId)):''}</div><div class="si-history-sub">${esc(x.detail||x.message||'')}<br>${esc(x.timestamp||'')} ${x.user?('• '+esc(x.user)):''}</div></div></div>`).join('')}</div>`:`<div class="si-history-scope-pill"><i class="fas ${scope==='accessories'?'fa-plug':'fa-microchip'}"></i>${label}</div><div class="sp-muted">No recent history from last loaded data</div>`;
      Swal.fire({title:label,html,width:820,confirmButtonText:'Close'});
    };
    if(pre && pre.success !== false && Array.isArray(pre.logs) && pre.logs.length) return show(pre);
    Swal.fire({title:'Loading History...',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    google.script.run.withSuccessHandler(res=>{ Swal.close(); if(window.SI){ SI.raw=SI.raw||{}; SI.raw.preloadedHistory=SI.raw.preloadedHistory||{}; SI.raw.preloadedHistory[scope]=res; } show(res); }).withFailureHandler(err=>Swal.fire('History Error',err.message||String(err),'error')).si_getInventoryHistory({scope,limit:80});
  };

  if(typeof oldInit === 'function'){
    window.initStockInventoryModule = function(force=false){
      style();
      oldInit(force);
      setTimeout(()=>{ try{ removeIntervalFilter(); if(window.SI&&SI.raw&&SI.raw.preloadedAlerts){ setHtml('siLowStockHeaderCount', (SI.raw.preloadedAlerts.actionRequired||[]).length + (SI.raw.preloadedAlerts.pending||[]).length); } }catch(e){} }, 700);
    };
  }

  style();
  setTimeout(removeIntervalFilter, 100);
})();


/* ============================================================
   CES Stock Pro FINAL V5 — Frontend module for base_status only
   Drop-in patch for Stock Dashboard / Inventory / Check Stock.
   Load after 140,150,160 modules or use full patched files.
============================================================ */
(function(){
  const ST = { READY:'พร้อมส่ง', RECHECK:'รอสอบเทียบ', RENTED:'เช่ายืม', BROKEN:'ใช้งานไม่ได้', MISSING:'ไม่พบในรายการ' };
  const ORDER = [ST.READY, ST.RECHECK, ST.RENTED, ST.BROKEN, ST.MISSING];
  const STATUS_MAP = {
    'Stock':ST.RECHECK, 'STOCK':ST.RECHECK, 'Available':ST.READY, 'AVAILABLE':ST.READY, 'Ready':ST.READY, 'READY':ST.READY,
    'Recheck':ST.RECHECK, 'RECHECK':ST.RECHECK, 'In-Use':ST.RENTED, 'IN_USE':ST.RENTED, 'IN-USE':ST.RENTED,
    'Rented':ST.RENTED, 'RENTED':ST.RENTED, 'Overdue':ST.RENTED, 'OVERDUE':ST.RENTED,
    'Broken':ST.BROKEN, 'BROKEN':ST.BROKEN, 'Missing':ST.MISSING, 'MISSING':ST.MISSING,
    'พร้อมส่ง':ST.READY, 'รอสอบเทียบ':ST.RECHECK, 'เช่ายืม':ST.RENTED, 'ใช้งานไม่ได้':ST.BROKEN, 'ไม่พบในรายการ':ST.MISSING
  };
  window.CES_STOCK_STATUS = ST;
  window.CES_STOCK_STATUS_ORDER = ORDER;

  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function html(id,v){const el=document.getElementById(id); if(el) el.innerHTML=v;}
  function val(id,def=''){const el=document.getElementById(id); return el ? el.value : def;}
  function num(v){return Number(v||0).toLocaleString('th-TH');}
  function status(s){return STATUS_MAP[s] || s || ST.RECHECK;}
  function toast(icon,title){ if(window.Swal) Swal.fire({toast:true,position:'top-end',icon,title,timer:1400,showConfirmButton:false}); }
  function alertBox(title,text,icon='info'){ if(window.Swal) Swal.fire(title,text,icon); else alert(title+'\n'+(text||'')); }
  function fmtDate(v){ if(!v) return '-'; const d=new Date(v); if(isNaN(d)) return esc(v); return d.toLocaleDateString('th-TH'); }
  function badge(s){
    s=status(s); const cls = s===ST.READY?'ready':s===ST.RECHECK?'recheck':s===ST.RENTED?'rented':s===ST.BROKEN?'broken':'missing';
    return `<span class="sp-inf-badge ${cls}">${esc(s)}</span>`;
  }
  function json(obj){return JSON.stringify(obj||{}).replace(/'/g,'&#39;').replace(/</g,'&lt;');}
  function run(fn,args,onSuccess,onFailure){
    args = args || [];
    if(window.google && google.script && google.script.run){
      const r = google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFailure || (e=>alertBox('Error', e.message || String(e),'error')));
      if(typeof r[fn] === 'function') return r[fn].apply(r,args);
    }
    if(window.cesApiCall){ return window.cesApiCall(fn, args).then(onSuccess).catch(onFailure || console.error); }
    if(window.CES_CONFIG && window.CES_CONFIG.GAS_API_URL){
      const cb='jsonp_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      window[cb]=function(res){ try{ onSuccess(res && res.data && res.data.result ? res.data.result : res); } finally{ delete window[cb]; script.remove(); } };
      const url=window.CES_CONFIG.GAS_API_URL+'?callback='+cb+'&action=call&fn='+encodeURIComponent(fn)+'&args='+encodeURIComponent(JSON.stringify(args));
      const script=document.createElement('script'); script.src=url; script.onerror=()=>{delete window[cb]; onFailure&&onFailure(new Error('API error'));}; document.body.appendChild(script); return;
    }
    alertBox('Connection Error','ไม่พบ google.script.run หรือ API bridge','error');
  }
  function ensureStyle(){
    if(document.getElementById('ces-stock-base-status-v5-style')) return;
    const css=`
    .stockpro-filter-card{display:grid!important;grid-template-columns:minmax(250px,2fr) repeat(3,minmax(140px,1fr))!important;gap:10px!important;align-items:center!important}
    .stockpro-kpi-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important;margin:14px 0!important}
    .sp-kpi{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:18px!important;padding:16px!important;box-shadow:0 8px 22px rgba(15,23,42,.06)!important;min-height:118px!important}
    .sp-kpi .label{font-size:12px!important;color:#64748b!important;font-weight:900!important}.sp-kpi .val{font-size:28px!important;font-weight:1000!important;color:#003DA5!important}.sp-kpi .ico{width:38px!important;height:38px!important;border-radius:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-bottom:8px!important}
    .sp-inf-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:1000;white-space:nowrap}.sp-inf-badge.ready{background:#dcfce7;color:#047857}.sp-inf-badge.recheck{background:#fef3c7;color:#b45309}.sp-inf-badge.rented{background:#dbeafe;color:#1d4ed8}.sp-inf-badge.broken{background:#fee2e2;color:#b91c1c}.sp-inf-badge.missing{background:#ede9fe;color:#6d28d9}
    .sp-action-group{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.sp-icon-btn{width:34px;height:34px;border-radius:10px;border:1px solid #dbeafe;background:#fff;color:#003DA5;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.sp-icon-btn.green{background:#ecfdf5;color:#047857;border-color:#bbf7d0}.sp-icon-btn.orange{background:#fff7ed;color:#c2410c;border-color:#fed7aa}.sp-icon-btn.red{background:#fef2f2;color:#dc2626;border-color:#fecaca}.sp-icon-btn.gray{background:#f8fafc;color:#475569;border-color:#e2e8f0}.sp-icon-btn:disabled{opacity:.45;cursor:not-allowed}
    .sp-mode-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:12px!important}.sp-mode{border:1px solid #dbeafe!important;border-radius:16px!important;padding:16px!important;text-align:center!important;background:#fff!important;cursor:pointer!important;font-weight:900!important}.sp-mode.active{background:#003DA5!important;color:#fff!important;border-color:#003DA5!important}.sp-mode.cf.active{background:#059669!important;border-color:#059669!important}
    .sp-table-wrap{overflow:auto!important}.sp-table{width:100%!important;border-collapse:collapse!important;font-size:12px!important}.sp-table th{position:sticky;top:0;background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:11px;padding:10px;border-bottom:1px solid #e2e8f0}.sp-table td{padding:10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.sp-id{font-weight:1000;color:#0f172a}.sp-sub{display:block;font-size:10px;color:#64748b;margin-top:2px}.sp-muted{color:#64748b;font-size:12px}.sp-pill{background:#f1f5f9;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900;color:#475569}
    @media(max-width:800px){.stockpro-filter-card{grid-template-columns:1fr!important}.stockpro-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.stockpro-two-col{grid-template-columns:1fr!important}}
    `;
    const style=document.createElement('style'); style.id='ces-stock-base-status-v5-style'; style.textContent=css; document.head.appendChild(style);
  }
  function kpiItems(k){return [
    ['อุปกรณ์ทั้งหมด', k.total||0, 'fa-boxes-stacked', '#003DA5', '#eaf2ff'],
    ['พร้อมส่ง', k.ready||k.stock||0, 'fa-check-circle', '#059669', '#dcfce7'],
    ['รอสอบเทียบ', k.recheck||0, 'fa-screwdriver-wrench', '#c05600', '#fef3c7'],
    ['เช่ายืม', k.rented||k.inUse||0, 'fa-arrow-right-arrow-left', '#2563eb', '#dbeafe'],
    ['ใช้งานไม่ได้', k.broken||0, 'fa-triangle-exclamation', '#dc2626', '#fee2e2'],
    ['ไม่พบในรายการ', k.missing||0, 'fa-circle-question', '#7c3aed', '#ede9fe']
  ];}
  function renderKpi(target,k){html(target,kpiItems(k||{}).map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${num(i[1])}</div></div>`).join(''));}
  function fillSelect(id,arr,label){const el=document.getElementById(id); if(!el) return; const cur=el.value||'all'; el.innerHTML=`<option value="all">${esc(label)}</option>`+(arr||[]).filter(Boolean).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(''); el.value=(arr||[]).includes(cur)?cur:'all';}
  function normalizeRows(rows){return (rows||[]).map(d=>{d.status=status(d.status||d.baseStatus||d.base_status);d.baseStatus=d.status;d.base_status=d.status;return d;});}

  // ---------- Dashboard ----------
  window.initStockDashboardModule=function(force=false){
    ensureStyle(); html('sdKpiGrid','<div class="sp-muted">Loading dashboard...</div>');
    run('sd_getStockDashboardData',[force===true],res=>{ if(!res||!res.success){alertBox('Dashboard Error',(res&&res.message)||'Cannot load','error');return;} window.SD_DASH=window.SD_DASH||{}; SD_DASH.raw=res; SD_DASH.loaded=true; SD_DASH.filtered=normalizeRows(res.inventory||res.devices||[]); sd_fillFilters(); sd_renderModelCards(); sd_renderKpi(); sd_renderFiltered(); },e=>alertBox('Dashboard Error',e.message||String(e),'error'));
  };
  window.sd_fillFilters=function(){const f=(SD_DASH.raw&&SD_DASH.raw.filters)||{}; fillSelect('sdBrand',f.brands||[], 'แบรนด์ทั้งหมด'); fillSelect('sdModel',f.models||[], 'โมเดลทั้งหมด'); fillSelect('sdStatus',ORDER,'สถานะทั้งหมด');};
  window.sd_renderKpi=function(){renderKpi('sdKpiGrid',(SD_DASH.raw&&SD_DASH.raw.kpi)||{}); const alerts=((SD_DASH.raw&&SD_DASH.raw.alerts)||[]).length; html('sdAlertHeaderCount',alerts); html('sdAlertCount',alerts+' alerts');};
  window.sd_renderModelCards=function(){const cards=((SD_DASH.raw&&SD_DASH.raw.modelCards)||[]); html('sdModelCards',cards.map(c=>`<div class="sp-model-card" style="border-color:${c.color||'#bfdbfe'}"><div class="sp-model-icon" style="background:${c.bg||'#dbeafe'};color:${c.color||'#003DA5'}"><i class="fas fa-microchip"></i></div><div class="sp-model-brand">${esc(c.brand)}</div><div class="sp-model-label">${esc(c.label)}</div><div class="sp-model-num" style="color:${c.color||'#003DA5'}">${num(c.total)}</div><div class="sp-model-sub">พร้อมส่ง ${num(c.ready||0)} • รอสอบเทียบ ${num(c.recheck||0)} • เช่ายืม ${num(c.inUse||c.rented||0)}</div></div>`).join(''));};
  window.sd_renderFiltered=function(){
    const q=val('sdSearch','').toLowerCase(), b=val('sdBrand','all'), m=val('sdModel','all'), s=val('sdStatus','all');
    const rows=normalizeRows((SD_DASH.raw&&SD_DASH.raw.inventory)||[]).filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.borrower,d.status].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&d.model!==m)return false; if(s!=='all'&&status(d.status)!==s)return false; return true;});
    const byModel={}; rows.forEach(d=>{const key=(d.brand||'-')+' / '+(d.model||d.itemName||'-'); byModel[key]=byModel[key]||{name:key,total:0,ready:0,recheck:0,rented:0,broken:0,missing:0}; byModel[key].total++; const st=status(d.status); if(st===ST.READY)byModel[key].ready++; else if(st===ST.RECHECK)byModel[key].recheck++; else if(st===ST.RENTED)byModel[key].rented++; else if(st===ST.BROKEN)byModel[key].broken++; else if(st===ST.MISSING)byModel[key].missing++;});
    html('sdSummaryTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Model</th><th>Total</th><th>พร้อมส่ง</th><th>รอสอบเทียบ</th><th>เช่ายืม</th><th>ใช้งานไม่ได้</th><th>ไม่พบ</th></tr></thead><tbody>${Object.values(byModel).map(x=>`<tr><td>${esc(x.name)}</td><td>${num(x.total)}</td><td>${num(x.ready)}</td><td>${num(x.recheck)}</td><td>${num(x.rented)}</td><td>${num(x.broken)}</td><td>${num(x.missing)}</td></tr>`).join('')}</tbody></table></div>`);
    const byLoc={}; rows.forEach(d=>{const key=d.location||'-'; byLoc[key]=(byLoc[key]||0)+1;}); html('sdLocationTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Count</th></tr></thead><tbody>${Object.keys(byLoc).sort().map(k=>`<tr><td>${esc(k)}</td><td>${num(byLoc[k])}</td></tr>`).join('')}</tbody></table></div>`);
    const alertRows=rows.filter(d=>[ST.RECHECK,ST.BROKEN,ST.MISSING].includes(status(d.status))).slice(0,80); html('sdAlertTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>ID</th><th>SN</th><th>Model</th><th>Status</th><th>Location</th></tr></thead><tbody>${alertRows.map(d=>`<tr><td>${esc(d.idCode)}</td><td>${esc(d.sn)}</td><td>${esc(d.model||d.itemName)}</td><td>${badge(d.status)}</td><td>${esc(d.location)}</td></tr>`).join('')}</tbody></table></div>`);
  };

  // ---------- Inventory ----------
  window.SI=window.SI||{loaded:false,tab:'equip',raw:null,inv:[],acc:[],filtered:[],accFiltered:[],page:1,accPage:1,pageSize:50,cart:[]};
  window.initStockInventoryModule=function(force=false){
    ensureStyle(); const bd=document.getElementById('siBorrowDate'); if(bd&&!bd.value)bd.value=new Date().toISOString().slice(0,10); html('siTable','<div class="sp-muted">Loading inventory...</div>');
    run('si_getStockInventoryData',[force===true],res=>{ if(!res||!res.success){alertBox('Inventory Error',(res&&res.message)||'Cannot load','error');return;} SI.loaded=true; SI.raw=res; SI.inv=normalizeRows(res.inventory||[]); SI.acc=res.accessories||[]; si_fillFilters(); si_renderKpi(); si_applyFilters(); },e=>alertBox('Inventory Error',e.message||String(e),'error'));
  };
  window.si_fillFilters=function(){const f=(SI.raw&&SI.raw.filters)||{}; fillSelect('siBrand',f.brands||[], 'All Brand'); fillSelect('siModel',f.models||[], 'All Model'); fillSelect('siLocation',f.locations||[], 'All Location'); fillSelect('siStatus',ORDER,'All Status'); fillSelect('siAccTeam',[...new Set((SI.acc||[]).map(a=>a.team).filter(Boolean))].sort(),'All Team'); fillSelect('siAccItem',[...new Set((SI.acc||[]).map(a=>a.itemName||a.name).filter(Boolean))].sort(),'All Item'); fillSelect('siAccStatus',[...new Set((SI.acc||[]).map(a=>a.status).filter(Boolean))].sort(),'All Status');};
  window.si_switchTab=function(tab){SI.tab=tab; document.getElementById('siTabEquip')?.classList.toggle('active',tab==='equip'); document.getElementById('siTabAcc')?.classList.toggle('active',tab==='acc'); document.getElementById('siEquipFilters')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccFilters')?.classList.toggle('hidden',tab!=='acc'); document.getElementById('siEquipSection')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccSection')?.classList.toggle('hidden',tab!=='acc'); document.getElementById('siEquipKpiGrid')?.classList.toggle('hidden',tab!=='equip'); document.getElementById('siAccKpiGrid')?.classList.toggle('hidden',tab!=='acc'); si_applyFilters();};
  window.si_renderKpi=function(){renderKpi('siEquipKpiGrid',(SI.raw&&SI.raw.kpi)||{}); renderKpi('siKpiGrid',(SI.raw&&SI.raw.kpi)||{}); const k=(SI.raw&&SI.raw.kpi)||{}; html('siAccKpiGrid',`<div class="sp-kpi"><div class="label">Accessories</div><div class="val">${num(k.accessories||0)}</div></div><div class="sp-kpi"><div class="label">Low Stock</div><div class="val">${num(k.accLow||0)}</div></div>`);};
  window.si_applyFilters=function(){
    if(SI.tab==='acc'){return si_renderAccCards ? si_renderAccCards() : null;}
    const q=val('siSearch','').toLowerCase(), b=val('siBrand','all'), m=val('siModel','all'), l=val('siLocation','all'), s=val('siStatus','all');
    SI.filtered=normalizeRows(SI.inv).filter(d=>{const text=[d.idCode,d.sn,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(b!=='all'&&d.brand!==b)return false; if(m!=='all'&&d.model!==m)return false; if(l!=='all'&&d.location!==l)return false; if(s!=='all'&&status(d.status)!==s)return false; return true;}); SI.page=1; si_renderTable();
  };
  window.si_renderTable=function(){const start=(SI.page-1)*SI.pageSize, rows=SI.filtered.slice(start,start+SI.pageSize); html('siTableCount',`${SI.filtered.length} items`); if(!rows.length){html('siTable','<div class="sp-muted">No equipment found</div>'); html('siPagination',''); return;} html('siTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>Brand / Model</th><th>Status</th><th>Borrower</th><th>Location</th><th>Due Date</th><th>Action Required</th><th>Action</th></tr></thead><tbody>${rows.map((d,i)=>`<tr><td>${start+i+1}</td><td><span class="sp-id">${esc(d.idCode)}</span></td><td>${esc(d.sn||'-')}</td><td><b>${esc(d.brand||'-')}</b><span class="sp-sub">${esc(d.model||d.itemName||'-')}</span></td><td>${badge(d.status)}</td><td>${esc(d.borrower||'-')}</td><td>${esc(d.location||'-')}</td><td>${fmtDate(d.expectedReturn||d.expectedReturnDate)}</td><td>${esc(d.actionRequired||d.recheckNote||'-')}</td><td>${si_actionButtons(d)}</td></tr>`).join('')}</tbody></table></div>`); si_renderPagination();};
  window.si_actionButtons=function(d){const st=status(d.status); return `<div class="sp-action-group"><button class="sp-icon-btn" title="Add to cart" ${st!==ST.READY?'disabled':''} onclick='si_addEquipmentToCart(${json(d)})'><i class="fas fa-cart-plus"></i></button><button class="sp-icon-btn green" title="CF CAL/PM → พร้อมส่ง" ${st!==ST.RECHECK?'disabled':''} onclick='si_confirmCalPm(${json(d)})'><i class="fas fa-screwdriver-wrench"></i></button><button class="sp-icon-btn orange" title="รับคืน → รอสอบเทียบ" ${st!==ST.RENTED?'disabled':''} onclick='si_returnPrompt(${json(d)})'><i class="fas fa-undo"></i></button><button class="sp-icon-btn gray" title="Edit" onclick='si_editPrompt(${json(d)})'><i class="fas fa-pen-to-square"></i></button><button class="sp-icon-btn red" title="ใช้งานไม่ได้" onclick='si_markBrokenPrompt(${json(d)})'><i class="fas fa-triangle-exclamation"></i></button></div>`;};
  window.si_renderPagination=function(){const total=Math.max(1,Math.ceil((SI.filtered||[]).length/SI.pageSize)); let btns=''; for(let p=Math.max(1,SI.page-2);p<=Math.min(total,SI.page+2);p++) btns+=`<button class="${p===SI.page?'active':''}" onclick="SI.page=${p};si_renderTable()">${p}</button>`; html('siPagination',`<div class="sp-muted">Page ${SI.page} / ${total} • 50 rows per page</div><div class="sp-page-buttons"><button ${SI.page<=1?'disabled':''} onclick="SI.page--;si_renderTable()">Prev</button>${btns}<button ${SI.page>=total?'disabled':''} onclick="SI.page++;si_renderTable()">Next</button></div>`);};
  window.si_addEquipmentToCart=function(d){if(!d||!d.idCode)return; if(status(d.status)!==ST.READY){alertBox('ไม่สามารถเพิ่มได้',`${d.idCode} สถานะ: ${status(d.status)}\nต้อง CF CAL/PM เป็นพร้อมส่งก่อน`,'warning');return;} if(SI.cart.find(x=>x.kind==='equipment'&&x.idCode===d.idCode)){toast('info','อยู่ในตะกร้าแล้ว');return;} SI.cart.push(Object.assign({kind:'equipment',qty:1},d)); if(window.si_updateCart) si_updateCart(); toast('success',`เพิ่ม ${d.idCode}`);};
  window.si_confirmCalPm=function(d){ if(!d||!d.idCode)return; if(window.Swal){Swal.fire({title:'CF CAL/PM ผ่าน?',text:`${d.idCode} จะเปลี่ยนจาก รอสอบเทียบ เป็น พร้อมส่ง`,icon:'question',showCancelButton:true,confirmButtonText:'ยืนยัน'}).then(r=>{if(r.isConfirmed) si_callAction('CF_CAL_PM',d);});} else si_callAction('CF_CAL_PM',d); };
  window.si_callAction=function(action,d,payload={}){run('sc_recordCheckAction',[Object.assign({action,idCode:d.idCode,brand:d.brand,model:d.model,serialNumber:d.sn},payload)],res=>{if(res&&res.success){toast('success',res.message||'Completed'); initStockInventoryModule(true); if(typeof initStockDashboardModule==='function')initStockDashboardModule(true);} else alertBox('ไม่สำเร็จ',(res&&res.message)||'Action failed','error');});};
  window.si_returnPrompt=function(d){ if(window.Swal){Swal.fire({title:'รับคืน '+d.idCode,html:`<input id="swReturnLoc" class="swal2-input" placeholder="สถานที่รับคืน" value="Warehouse"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{if(r.isConfirmed) si_callAction('CHECK-IN',d,{location:val('swReturnLoc','Warehouse'),note:val('swNote','')});});} else si_callAction('CHECK-IN',d,{location:'Warehouse'}); };
  window.si_editPrompt=function(d){ const st=status(d.status); if(!window.Swal){return;} Swal.fire({title:'Edit Equipment',width:720,html:`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left"><input id="edId" class="swal2-input" placeholder="ID Code" value="${esc(d.idCode)}"><input id="edSn" class="swal2-input" placeholder="SN" value="${esc(d.sn||'')}"><input id="edBrand" class="swal2-input" placeholder="Brand" value="${esc(d.brand||'')}"><input id="edModel" class="swal2-input" placeholder="Model" value="${esc(d.model||'')}"><input id="edLoc" class="swal2-input" placeholder="Location" value="${esc(d.location||'')}"><select id="edStatus" class="swal2-input">${ORDER.map(x=>`<option value="${x}">${x}</option>`).join('')}</select><input id="edAction" class="swal2-input" placeholder="Action Required" value="${esc(d.actionRequired||'')}"><input id="edNote" class="swal2-input" placeholder="Note" value="${esc(d.recheckNote||'')}"></div>`,showCancelButton:true,confirmButtonText:'Save',didOpen:()=>{document.getElementById('edStatus').value=st;},preConfirm:()=>({originalIdCode:d.idCode,idCode:val('edId'),serialNumber:val('edSn'),brand:val('edBrand'),model:val('edModel'),location:val('edLoc'),baseStatus:val('edStatus'),actionRequired:val('edAction'),recheckNote:val('edNote')})}).then(r=>{if(!r.isConfirmed)return; run('si_editEquipment',[r.value],res=>{if(res&&res.success){toast('success','บันทึกแล้ว'); initStockInventoryModule(true);} else alertBox('ไม่สำเร็จ',(res&&res.message)||'Save failed','error');});}); };
  window.si_markBrokenPrompt=function(d){ if(window.Swal){Swal.fire({title:'ตั้งเป็นใช้งานไม่ได้?',text:d.idCode,icon:'warning',showCancelButton:true,confirmButtonText:'ยืนยัน'}).then(r=>{if(r.isConfirmed) run('si_editEquipment',[{originalIdCode:d.idCode,baseStatus:ST.BROKEN,actionRequired:'ใช้งานไม่ได้'}],res=>{if(res&&res.success){toast('success','อัปเดตแล้ว');initStockInventoryModule(true);}else alertBox('ไม่สำเร็จ',res.message,'error');});});}};

  // ---------- Check Stock ----------
  window.SC=window.SC||{mode:'CHECK-IN',logs:[]};
  window.initStockCheckModule=function(force=false){ensureStyle(); sc_ensureCfMode(); sc_setMode(SC.mode||'CHECK-IN'); if(typeof sc_loadLogs==='function') sc_loadLogs();};
  window.sc_ensureCfMode=function(){ if(document.getElementById('scModeCf')) return; const grid=document.querySelector('#view-check_stock .sp-mode-grid'); if(!grid) return; const div=document.createElement('div'); div.className='sp-mode cf'; div.id='scModeCf'; div.onclick=()=>sc_setMode('CF_CAL_PM'); div.innerHTML='<i class="fas fa-screwdriver-wrench"></i><br/>CF CAL/PM<br/><span class="sp-sub">รอสอบเทียบ → พร้อมส่ง</span>'; grid.appendChild(div); };
  window.sc_setMode=function(mode){SC.mode=mode; ['scModeIn','scModeOut','scModeCf'].forEach(id=>document.getElementById(id)?.classList.remove('active','in','out')); document.getElementById('scModeIn')?.classList.toggle('active',mode==='CHECK-IN'); document.getElementById('scModeOut')?.classList.toggle('active',mode==='CHECK-OUT'); document.getElementById('scModeCf')?.classList.toggle('active',mode==='CF_CAL_PM'); const txt=document.getElementById('scModeText'); if(txt){txt.style.color=mode==='CF_CAL_PM'?'#059669':mode==='CHECK-OUT'?'#2563eb':'#c05600'; txt.innerHTML=mode==='CF_CAL_PM'?'● โหมด: CF CAL/PM (รอสอบเทียบ → พร้อมส่ง)':mode==='CHECK-OUT'?'● โหมด: ส่งออกเช่ายืม (พร้อมส่ง → เช่ายืม)':'● โหมด: รับคืนเข้าคลัง (เช่ายืม → รอสอบเทียบ)';}};
  window.sc_lookup=function(){const q=val('scKeyword','').trim(); if(!q){alertBox('กรุณากรอกรหัส','','info');return;} html('scResult','<div class="stockpro-card"><div class="sp-muted">กำลังค้นหา...</div></div>'); run('sc_lookupStockDevice',[q],res=>{if(!res||!res.success){alertBox('Check Stock Error',(res&&res.message)||'Lookup failed','error');return;} sc_renderResult(normalizeRows(res.data||[])); if(typeof sc_loadLogs==='function') sc_loadLogs();});};
  window.sc_renderResult=function(rows){ if(!rows.length){html('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>');return;} html('scResult',rows.map(d=>{const st=status(d.status); return `<div class="stockpro-card"><div class="stockpro-card-head"><h3>${esc(d.idCode)} ${badge(st)}</h3><span class="sp-pill">${esc(d.brand||'-')}</span></div><div class="sp-result-grid"><div class="sp-field"><div class="k">Serial Number</div><div class="v">${esc(d.sn||'-')}</div></div><div class="sp-field"><div class="k">Model</div><div class="v">${esc(d.model||d.itemName||'-')}</div></div><div class="sp-field"><div class="k">Location</div><div class="v">${esc(d.location||'-')}</div></div><div class="sp-field"><div class="k">Borrower</div><div class="v">${esc(d.borrower||'-')}</div></div><div class="sp-field"><div class="k">Due Date</div><div class="v">${fmtDate(d.expectedReturn||d.expectedReturnDate)}</div></div><div class="sp-field"><div class="k">Action Required</div><div class="v">${esc(d.actionRequired||'-')}</div></div></div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="sp-btn success" ${st!==ST.RENTED?'disabled':''} onclick="sc_record('${esc(d.idCode)}','CHECK-IN')"><i class="fas fa-sign-in-alt"></i> Check-In → รอสอบเทียบ</button><button class="sp-btn primary" ${st!==ST.READY?'disabled':''} onclick="sc_checkoutPrompt('${esc(d.idCode)}','${esc(d.brand||'')}','${esc(d.model||'')}','${esc(d.sn||'')}')"><i class="fas fa-sign-out-alt"></i> Check-Out</button><button class="sp-btn success" ${st!==ST.RECHECK?'disabled':''} onclick="sc_record('${esc(d.idCode)}','CF_CAL_PM')"><i class="fas fa-screwdriver-wrench"></i> CF CAL/PM → พร้อมส่ง</button></div></div>`;}).join('')); };
  window.sc_record=function(idCode,action,payload={}){run('sc_recordCheckAction',[Object.assign({action,idCode},payload)],res=>{if(res&&res.success){toast('success',res.message||'สำเร็จ'); sc_lookup(); if(typeof sc_loadLogs==='function') sc_loadLogs();} else alertBox('ไม่สำเร็จ',(res&&res.message)||'Action failed','error');});};
  window.sc_checkoutPrompt=function(idCode,brand,model,sn){ if(!window.Swal){return sc_record(idCode,'CHECK-OUT');} Swal.fire({title:'Check-Out',html:`<input id="swBorrower" class="swal2-input" placeholder="ผู้ยืม / Borrower"><input id="swLocation" class="swal2-input" placeholder="สถานที่ / Location"><input id="swDue" class="swal2-input" type="date"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ยืนยัน',preConfirm:()=>({borrower:val('swBorrower'),location:val('swLocation'),expectedReturnDate:val('swDue'),note:val('swNote')})}).then(r=>{if(!r.isConfirmed)return; const v=r.value; if(!v.borrower||!v.location||!v.expectedReturnDate){alertBox('ข้อมูลไม่ครบ','','warning');return;} sc_record(idCode,'CHECK-OUT',Object.assign(v,{brand,model,serialNumber:sn}));}); };
})();
