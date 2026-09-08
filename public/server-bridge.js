(() => {
  const api = async (url, options={}) => {
    const opts={credentials:'same-origin',...options};
    if(opts.body && !(opts.body instanceof FormData) && typeof opts.body!=='string'){
      opts.headers={...(opts.headers||{}),'Content-Type':'application/json'};opts.body=JSON.stringify(opts.body);
    }
    const r=await fetch(url,opts);let data={};try{data=await r.json();}catch{}
    if(!r.ok)throw new Error(data.error||`Ошибка ${r.status}`);return data;
  };
  let siteSaveTimer=null;
  const originalSave=save;
  window.__kmMedia=state.__media||{photo:'',video:''};

  function applyProducts(grouped){
    for(const k of Object.keys(PRODUCTS))delete PRODUCTS[k];
    for(const [k,v] of Object.entries(grouped||{}))PRODUCTS[k]=v;
  }
  function applyOrder(order){const i=state.orders.findIndex(x=>x.id===order.id);if(i>=0)state.orders[i]=order;else state.orders.push(order);}
  async function refreshOrders(){
    try{const url=state.adminLogged?'/api/admin/orders':'/api/orders';const d=await api(url);state.orders=d.orders||[];if(state.route==='admin'||state.route==='account')render();}catch{}
  }
  async function persistSiteNow(){
    if(!state.adminLogged)return;
    try{await api('/api/admin/site-state',{method:'PUT',body:{categories:state.categories,content:state.content,menuSettings:state.menuSettings,paymentSettings:state.paymentSettings,media:window.__kmMedia}});}catch(e){showPopup('Не удалось сохранить на сервере: '+e.message);}
  }
  function queueSiteSave(){clearTimeout(siteSaveTimer);siteSaveTimer=setTimeout(persistSiteNow,180);}

  save = function(){
    try{storage.setItem('km_server_cart',JSON.stringify(state.cart));}catch{}
    updateCartCount();
    if(state.adminLogged)queueSiteSave();
    return true;
  };

  bindAuthForms = function(){
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{state.authMode=b.dataset.authMode;renderAuth();});
    document.getElementById('loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api('/api/auth/login',{method:'POST',body:{login:String(f.get('login')||'').trim(),password:String(f.get('password')||'')}});state.currentUser=d.user.login;state.orders=d.orders||[];closeAuth();showPopup('Вы вошли в аккаунт');render();}catch(err){showPopup(err.message);}});
    document.getElementById('registerForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),p=String(f.get('password')||''),p2=String(f.get('password2')||'');if(p!==p2)return showPopup('Пароли не совпадают');try{const d=await api('/api/auth/register',{method:'POST',body:{login:String(f.get('login')||'').trim(),password:p}});state.currentUser=d.user.login;state.orders=d.orders||[];closeAuth();showPopup('Аккаунт создан');render();}catch(err){showPopup(err.message);}});
    document.getElementById('forgotForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api('/api/auth/forgot',{method:'POST',body:{email:String(f.get('email')||'').trim()}});closeAuth();showPopup(d.message||'Проверьте e-mail');}catch(err){showPopup(err.message);}});
  };

  createOrder = async function(){
    if(!state.currentUser){openAuth();showPopup('Перед оформлением войдите или зарегистрируйтесь');return;}
    const form=document.getElementById('checkoutForm');if(!form?.reportValidity())return;const f=new FormData(form),receive=f.get('receive');let address='',receiveText='Самовывоз — Сочи, ул. Тепличная 35А';
    if(receive==='delivery'){
      for(const k of ['recipientFio','city','street','house','receiverPhone'])if(!String(f.get(k)||'').trim())return showPopup('Заполните адрес доставки и телефон получателя');
      address=[f.get('city'),f.get('street'),'д. '+f.get('house'),f.get('building')?('корп./стр. '+f.get('building')):'',f.get('flat')?('кв./офис '+f.get('flat')):'','получатель: '+f.get('recipientFio'),'тел. '+f.get('receiverPhone')].filter(Boolean).join(', ');receiveText='Доставка — '+f.get('deliveryService');
    }
    const payload={items:state.cart.map(x=>({id:x.id,qty:x.qty})),contact:{fio:f.get('fio'),phone:f.get('phone'),telegram:f.get('telegram'),max:f.get('max'),email:f.get('email')},recipientFio:f.get('recipientFio')||'',receive,receiveText,address,comment:f.get('comment')||''};
    try{const d=await api('/api/orders',{method:'POST',body:payload});applyOrder(d.order);state.cart=[];save();routeTo('payment',d.order.id);}catch(err){showPopup(err.message);}
  };

  editAddress = async function(orderId){const o=state.orders.find(x=>x.id===orderId);if(!o)return;const value=prompt('Новый адрес доставки:',o.address||'');if(value!==null&&value.trim()){try{const d=await api('/api/orders/'+encodeURIComponent(orderId)+'/address',{method:'PATCH',body:{address:value.trim()}});applyOrder(d.order);render();showPopup('Адрес обновлён');}catch(err){showPopup(err.message);}}};

  startAutomaticPayment = async function(orderId){try{const d=await api('/api/payments/'+encodeURIComponent(orderId)+'/start',{method:'POST'});if(d.redirectUrl)location.href=d.redirectUrl;else showPopup('Платёж создан');}catch(err){showPopup(err.message);}};

  handleCategoryImageUpload = async function(id,file){if(!file)return;const c=getCategory(id);if(!c)return;const fd=new FormData();fd.append('file',file);fd.append('kind','category');try{const d=await api('/api/admin/upload',{method:'POST',body:fd});c.image=d.url;save();render();showPopup('Картинка категории сохранена на сервере');}catch(err){showPopup(err.message);}};
  handleMediaUpload = async function(type,file){if(!file)return;const fd=new FormData();fd.append('file',file);fd.append('kind',type);try{const d=await api('/api/admin/upload',{method:'POST',body:fd});window.__kmMedia[type]=d.url;runtimeMedia[type]=d.url;save();render();showPopup('Файл сохранён на сервере');}catch(err){showPopup(err.message);}};
  hydrateMedia = async function(){runtimeMedia.photo=window.__kmMedia.photo||null;runtimeMedia.video=window.__kmMedia.video||null;if(state.route==='home')render();};

  const betaBindDynamic=bindDynamic;
  bindDynamic=function(){
    betaBindDynamic();
    const login=document.getElementById('adminLoginForm');if(login){const clone=login.cloneNode(true);login.replaceWith(clone);clone.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api('/api/admin/login',{method:'POST',body:{email:f.get('email'),password:f.get('password')}});state.adminLogged=true;state.orders=d.orders||[];render();}catch(err){showPopup(err.message);}});}
    const logout=document.querySelector("[data-action='logout']");if(logout){const c=logout.cloneNode(true);logout.replaceWith(c);c.addEventListener('click',async()=>{await api('/api/auth/logout',{method:'POST'}).catch(()=>{});state.currentUser=null;state.orders=[];routeTo('home');});}
    const alog=document.querySelector("[data-action='admin-logout']");if(alog){const c=alog.cloneNode(true);alog.replaceWith(c);c.addEventListener('click',async()=>{await persistSiteNow().catch(()=>{});await api('/api/admin/logout',{method:'POST'}).catch(()=>{});state.adminLogged=false;state.adminSelectedOrderId=null;state.orders=[];render();});}

    document.querySelectorAll('[data-admin-cancel]').forEach(btn=>{const c=btn.cloneNode(true);btn.replaceWith(c);c.onclick=async()=>{const o=getOrder(c.dataset.adminCancel);if(!o||!confirm('Отменить заказ '+o.number+'?'))return;const reason=prompt('Причина отмены (необязательно):','')||'';try{const d=await api('/api/admin/orders/'+o.id+'/cancel',{method:'POST',body:{reason}});applyOrder(d.order);showPopup('Заказ отменён');render();}catch(err){showPopup(err.message);}};});
    document.querySelectorAll('[data-admin-delete]').forEach(btn=>{const c=btn.cloneNode(true);btn.replaceWith(c);c.onclick=async()=>{const o=getOrder(c.dataset.adminDelete);if(!o||!confirm('Удалить заказ '+o.number+'? Это действие нельзя отменить.')||!confirm('Подтвердите удаление ещё раз.'))return;try{await api('/api/admin/orders/'+o.id,{method:'DELETE'});state.orders=state.orders.filter(x=>x.id!==o.id);state.adminSelectedOrderId=null;showPopup('Заказ удалён');render();}catch(err){showPopup(err.message);}};});
    document.querySelectorAll('[data-order-status]').forEach(sel=>{const c=sel.cloneNode(true);sel.replaceWith(c);c.onchange=async()=>{try{const d=await api('/api/admin/orders/'+c.dataset.orderStatus+'/status',{method:'PATCH',body:{status:c.value}});applyOrder(d.order);showPopup('Статус обновлён');render();}catch(err){showPopup(err.message);render();}};});
    document.querySelectorAll('[data-admin-confirm-payment]').forEach(btn=>{const c=btn.cloneNode(true);btn.replaceWith(c);c.onclick=async()=>{const o=getOrder(c.dataset.adminConfirmPayment);if(!o||!confirm('Подтвердить получение оплаты по заказу '+o.number+'?'))return;try{const d=await api('/api/admin/orders/'+o.id+'/confirm-payment',{method:'POST'});applyOrder(d.order);showPopup('Оплата подтверждена');render();}catch(err){showPopup(err.message);}};});

    document.querySelectorAll('[data-xlsx]').forEach(inp=>{inp.onchange=async()=>{const file=inp.files?.[0];if(!file)return;const fd=new FormData();fd.append('file',file);const el=document.getElementById('xlsx-'+inp.dataset.xlsx);if(el)el.textContent='Импорт...';try{const d=await api('/api/admin/import-xlsx/'+encodeURIComponent(inp.dataset.xlsx),{method:'POST',body:fd});applyProducts(d.products);if(el)el.textContent=`Импортировано: ${d.count} позиций`;showPopup('XLSX импортирован');render();}catch(err){if(el)el.textContent=err.message;showPopup(err.message);}};});

    const pw=document.getElementById('adminPasswordForm');if(pw){const c=pw.cloneNode(true);pw.replaceWith(c);c.addEventListener('submit',async e=>{e.preventDefault();const password=new FormData(e.target).get('password');try{await api('/api/admin/change-password',{method:'POST',body:{password}});e.target.reset();showPopup('Пароль администратора изменён');}catch(err){showPopup(err.message);}});}

    document.querySelectorAll('[data-cat-sheet]').forEach(inp=>{if(!inp.parentElement.querySelector('.server-sync-btn')){const b=document.createElement('button');b.type='button';b.className='outline-btn admin-small-btn server-sync-btn';b.style.marginTop='8px';b.textContent='Синхронизировать Google Sheets';b.onclick=async()=>{const c=getCategory(inp.dataset.catSheet);if(!c)return;try{await persistSiteNow();const d=await api('/api/admin/sync-sheet/'+encodeURIComponent(c.id),{method:'POST'});applyProducts(d.products);state.categories=d.categories||state.categories;showPopup(`Загружено ${d.count} позиций`);render();}catch(err){showPopup(err.message);}};inp.parentElement.appendChild(b);}});
  };

  async function maybeResetPassword(){const token=new URLSearchParams(location.search).get('reset');if(!token)return;const p1=prompt('Введите новый пароль (минимум 6 символов):');if(!p1)return;const p2=prompt('Повторите новый пароль:');if(p1!==p2)return showPopup('Пароли не совпадают');try{await api('/api/auth/reset',{method:'POST',body:{token,password:p1}});history.replaceState({},'',location.pathname+location.hash);showPopup('Пароль изменён. Теперь можно войти.');}catch(err){showPopup(err.message);}}

  async function bootstrap(){
    try{const d=await api('/api/bootstrap');if(d.site){state.categories=normalizeCategories(d.site.categories);state.content={...state.content,...d.site.content};state.menuSettings=normalizeMenuSettings(d.site.menuSettings);state.paymentSettings=normalizePaymentSettings(d.site.paymentSettings);window.__kmMedia=d.site.media||{photo:'',video:''};runtimeMedia.photo=window.__kmMedia.photo||null;runtimeMedia.video=window.__kmMedia.video||null;}applyProducts(d.products);state.currentUser=d.user?.login||null;state.adminLogged=!!d.admin;state.orders=d.orders||[];try{state.cart=safeJSON(storage.getItem('km_server_cart'),state.cart)||[];}catch{}render();setTimeout(hydrateMedia,80);setTimeout(maybeResetPassword,150);}catch(err){console.error(err);document.getElementById('app').innerHTML=`<div class="page"><div class="shell"><div class="empty-state"><b>Не удалось подключиться к серверу.</b><br><br>${esc(err.message)}<br><br>Проверьте /api/health и настройки базы данных.</div></div></div>`;}}
  setInterval(()=>{if(state.currentUser||state.adminLogged)refreshOrders();},60000);
  bootstrap();
})();
