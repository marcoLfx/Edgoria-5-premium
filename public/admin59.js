/* EDGORIA 5.9 — isolated administrator client. No wallet, payment or trader journals. */
import {dateKey,longDate,monthName,shiftedMonth,monthCells,calendarSummary,periodState,userDisplay,escapeHtml as e} from './admin57-model.js';
const root=document.querySelector('#app'),notification=document.querySelector('#notifications');
let sb=null,user=null,store={users:[],periods:[],audit:[],calendar_ready:false,access_enabled:false},busy=false;
let view='overview',query='',statusFilter='all',showArchived=false,selectedDate=dateKey(new Date()),month=selectedDate.slice(0,7),selectedUser=null;
let commercial=null,commercialError='';
let paymentQueue=null,paymentError='';
const icons={overview:'▦',calendar:'▣',users:'♙',access:'◇',audit:'≡',payments:'▤',affiliates:'↗'};
const tabs=[['overview','Resumen'],['calendar','Calendario'],['users','Usuarios'],['access','Accesos'],['audit','Auditoría'],['payments','Comprobantes'],['affiliates','Afiliados']];
const validPeriod=p=>({...p,expires_at:p.ends_at});
const live=p=>p?.status==='active'&&Date.parse(p.starts_at)<=Date.now()&&Date.parse(p.ends_at)>Date.now();
const displayStatus=s=>({active:'Activo',expired:'Vencido',pending:'Pendiente',suspended:'Suspendido',archived:'Retirado',legacy:'Legado sin plazo',revoked:'Revocado',admin:'Administrador',scheduled:'Programado'})[s]||'—';
const tag=s=>`<span class="tag ${e(s)}">${e(displayStatus(s))}</span>`;
const kind=k=>k==='trial'?'Prueba gratuita · 7 días':'Mensualidad · 1 mes';
const name=id=>e(userDisplay(store.users.find(u=>u.user_id===id)||{email:'Usuario eliminado'}));
function toast(text){notification.textContent=text;notification.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>notification.classList.remove('show'),5000)}
function rowList(items,cb,empty){return items.length?items.map(cb).join(''):`<div class="empty">${e(empty)}</div>`}
function renderShell(content){
 const headings={overview:['Centro de control','Permisos y vencimientos sin depender de pagos'],calendar:['Calendario de accesos','Inicio y fin de cada periodo de prueba o mensualidad'],users:['Usuarios','Concede accesos, suspende o retira usuarios'],access:['Historial de accesos','Periodos emitidos por el administrador'],audit:['Auditoría','Movimientos administrativos registrados en el servidor'],payments:['Comprobantes','Revisión manual de capturas USDT sin activación automática'],affiliates:['Afiliados','Referidos, primeras ventas y comisiones bajo control administrativo']};
 const [head,sub]=headings[view];
 root.innerHTML=`<div class="admin-layout"><aside class="admin-side" id="admin-side"><div class="brand"><img src="/favicon.svg" alt=""/><div><h1>EDGORIA</h1><small>ADMIN CONSOLE</small></div></div><div class="admin-badge">CONTROL PRIVADO</div><nav class="menu" aria-label="Navegación de administrador">${tabs.map(([id,text])=>`<button type="button" class="side-link ${view===id?'active':''}" data-view="${id}" aria-current="${view===id?'page':'false'}"><span aria-hidden="true">${icons[id]}</span> ${text}</button>`).join('')}</nav><div class="side-footer"><strong>Administrador</strong><small>${e(user?.email||'')}</small><button type="button" data-action="signout">Cerrar sesión</button></div></aside><main class="main"><header class="top"><div style="display:flex;align-items:center;gap:13px"><button class="mobile-toggle btn" data-action="menu" aria-label="Abrir menú">☰</button><div><h2>${e(head)}</h2><p>${e(sub)}</p></div></div><div class="top-right"><span class="chip">● Administrador</span><button type="button" data-action="refresh">↻ Actualizar</button></div></header>${store.setup_error?`<div class="alert" style="margin-top:22px">${e(store.setup_error)}</div>`:''}<section>${view==='overview'&&paymentQueue?.some(p=>p.status==='pending')?`<div class="eg61-admin-alert">◈ Tienes ${paymentQueue.filter(p=>p.status==='pending').length} comprobante(s) pendiente(s) de revisión. <button class="btn small" type="button" data-view="payments">Ver comprobantes →</button></div>`:''}${content}</section><footer>EDGORIA ADMIN · Los pagos externos y las activaciones se administran por separado · Los datos de trading permanecen privados.</footer></main></div>`;
}
function dashboard(){
 const pendingProofs=paymentQueue?.filter(p=>p.status==='pending').length||0;
 const now=Date.now(),all=store.users.filter(u=>u.role!=='admin'),active=all.filter(u=>u.effective_status==='active'),trials=all.filter(u=>u.current_period?.kind==='trial'),expiring=active.filter(u=>Date.parse(u.current_period?.ends_at)>now&&Date.parse(u.current_period?.ends_at)<=now+7*86400000),legacy=all.filter(u=>u.effective_status==='legacy');
 const next=[...active].sort((a,b)=>Date.parse(a.current_period.ends_at)-Date.parse(b.current_period.ends_at)).slice(0,8),recent=[...store.periods].sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)).slice(0,8);
 return `<div class="main-title"><div><div class="section-label">PANEL DE GESTIÓN</div><h3>Accesos bajo tu control</h3><p>Las pruebas y mensualidades empiezan al pulsar activar. No requieren registrar ningún pago.</p></div><button class="btn primary" data-view="users">Gestionar usuarios →</button></div><div class="kpis"><article class="panel kpi"><span>Usuarios registrados</span><strong>${all.length}</strong><small>${all.filter(u=>u.archived).length} retirados</small></article><article class="panel kpi aqua"><span>Accesos vigentes</span><strong>${active.length}</strong><small>Verificados en servidor</small></article><article class="panel kpi"><span>Pruebas activas</span><strong>${trials.length}</strong><small>Duración 7 días</small></article><article class="panel kpi"><span>Vencen en 7 días</span><strong>${expiring.length}</strong><small>${legacy.length} accesos antiguos sin plazo</small></article></div><div class="grid-two"><section class="panel"><div class="panel-top"><h4>Próximos vencimientos</h4><button class="btn small" data-view="calendar">Calendario ↗</button></div>${rowList(next,u=>`<div class="list-item"><div><strong>${e(userDisplay(u))}</strong><small>${e(u.email)} · ${e(kind(u.current_period.kind))} · Vence ${e(longDate(u.current_period.ends_at))}</small></div>${tag('active')}</div>`,'No hay accesos vigentes.')}</section><section class="panel"><div class="panel-top"><h4>Últimas activaciones</h4><button class="btn small" data-view="access">Historial ↗</button></div>${rowList(recent,p=>`<div class="list-item"><div><strong>${name(p.user_id)}</strong><small>${e(kind(p.kind))} · ${e(longDate(p.starts_at))}</small></div>${tag(periodState(validPeriod(p)))}</div>`,'Aún no hay periodos registrados.')}</section></div><div class="panel"><h4>Activaciones independientes</h4><p class="hero-note">La prueba gratuita dura 7 días. El acceso mensual dura un mes calendario desde el instante de activación. Al vencer, el servidor deniega automáticamente los datos protegidos; el calendario conserva la fecha y el historial.</p></div>`;
}
function calendar(){
 const normalized=store.periods.map(validPeriod),cells=monthCells(month),selected=calendarSummary(normalized,selectedDate);
 const show=p=>`<article class="calendar-member"><strong>${name(p.user_id)}</strong> ${tag(periodState(p))}<p>${e(kind(p.kind))}<br>${e(longDate(p.starts_at))} – ${e(longDate(p.ends_at||p.expires_at))}</p></article>`;
 return `<div class="main-title"><div><div class="section-label">AGENDA AUTOMÁTICA</div><h3>Calendario administrativo</h3><p>Cada periodo aparece inmediatamente después de ser autorizado, sin depender de pagos USDT.</p></div><button class="btn" data-action="today">Hoy</button></div><div class="calendar-layout"><section class="panel"><div class="month-header"><h4>${e(monthName(month))}</h4><div><button class="btn small" data-action="prev-month" aria-label="Mes anterior">‹</button> <button class="btn small" data-action="next-month" aria-label="Mes siguiente">›</button></div></div><div class="calendar" role="grid">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="day-label">${x}</div>`).join('')}${cells.map(c=>{const s=calendarSummary(normalized,c.date);return `<button class="day ${c.inside?'':'muted-month'} ${c.date===selectedDate?'selected':''}" type="button" data-day="${c.date}" aria-pressed="${c.date===selectedDate}"><span class="num">${c.day}</span>${s.running.length?`<span class="active-count">${s.running.length} ${s.running.length===1?'acceso':'accesos'}</span>`:''}<span class="flow">${s.starts.length?`+${s.starts.length}`:''} ${s.expires.length?`−${s.expires.length}`:''}</span></button>`}).join('')}</div></section><div class="calendar-info"><section class="panel"><div class="section-label">${e(selectedDate)}</div><h4>Detalle del día</h4><div class="day-stats"><div><strong>${selected.running.length}</strong><span>Accesos del día</span></div><div><strong>${selected.starts.length}</strong><span>Activaciones</span></div></div></section><section class="panel"><h4>Usuarios y periodos</h4>${rowList(selected.running,show,'No hay accesos para este día.')}</section></div></div>`;
}
function users(){
 const q=query.toLowerCase().trim();let all=store.users.filter(u=>u.role!=='admin'&&[u.full_name,u.email,u.country].some(x=>String(x||'').toLowerCase().includes(q)));
 if(!showArchived)all=all.filter(u=>!u.archived);
 if(statusFilter!=='all')all=all.filter(u=>u.effective_status===statusFilter);
 return `<div class="main-title"><div><div class="section-label">DIRECTORIO</div><h3>Control de usuarios</h3><p>Activa una prueba o mensualidad sin comprobar pagos. El vencimiento queda registrado automáticamente.</p></div></div><div class="toolbar"><input class="input" type="search" id="user-search" placeholder="Buscar usuario o correo" value="${e(query)}"/><select class="select" id="user-filter">${[['all','Todos'],['pending','Pendientes'],['active','Vigentes'],['expired','Vencidos'],['suspended','Suspendidos'],['legacy','Sin plazo (legado)'],['archived','Retirados']].map(([v,t])=>`<option value="${v}" ${statusFilter===v?'selected':''}>${t}</option>`).join('')}</select><label class="checkline"><input type="checkbox" id="show-archived" ${showArchived?'checked':''}/> Incluir retirados</label><span class="results">${all.length} usuarios</span></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Estado</th><th>Periodo</th><th>Vencimiento</th><th>Acciones</th></tr></thead><tbody>${all.length?all.map(u=>`<tr><td class="usercell"><strong>${e(userDisplay(u))}</strong><small>${e(u.email)} · ${e(u.country||'')}</small></td><td>${tag(u.effective_status)}${u.email_confirmed?'':'<small> · Correo sin verificar</small>'}</td><td>${u.latest_period?e(kind(u.latest_period.kind)):'—'}</td><td>${u.current_period?e(longDate(u.current_period.ends_at)):u.latest_period?e(longDate(u.latest_period.ends_at)):'—'}</td><td><div class="user-actions">${u.archived?`<button class="btn small" data-restore="${u.user_id}">Restaurar</button><button class="btn small danger" data-delete="${u.user_id}">Eliminar definitivamente</button>`:`<button class="btn small primary" data-grant="${u.user_id}" ${!u.email_confirmed||!store.calendar_ready?'disabled':''}>Dar acceso</button><button class="btn small" data-suspend="${u.user_id}" ${u.access_status==='suspended'?'disabled':''}>Suspender</button><button class="btn small danger" data-delete="${u.user_id}">Eliminar definitivamente</button>`}</div></td></tr>`).join(''):'<tr><td colspan="5" class="empty">No hay usuarios para mostrar.</td></tr>'}</tbody></table></div><p class="notice-text" style="margin-top:12px">«Suspender» bloquea temporalmente el acceso. «Eliminar definitivamente» borra la cuenta de autenticación y puede borrar datos asociados. No es reversible.</p>`;
}
function accesses(){
 const rows=[...store.periods].sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at));
 return `<div class="main-title"><div><div class="section-label">HISTORIAL</div><h3>Pruebas y mensualidades concedidas</h3><p>Este apartado registra permisos de acceso, no pagos ni importes en USDT.</p></div></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead><tbody>${rows.length?rows.map(p=>`<tr><td>${name(p.user_id)}</td><td>${e(kind(p.kind))}</td><td>${e(longDate(p.starts_at))}</td><td>${e(longDate(p.ends_at))}</td><td>${tag(periodState(validPeriod(p)))}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">No hay accesos registrados.</td></tr>'}</tbody></table></div>`;
}
function audit(){const words={trial:'Prueba de 7 días',monthly:'Acceso mensual',suspend:'Suspensión',archive:'Retiro de usuario',restore:'Restauración'};
 const rows=[...store.audit].sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
 return `<div class="main-title"><div><div class="section-label">AUDITORÍA</div><h3>Historial administrativo</h3><p>Registro de concesiones, suspensiones y retiradas efectuadas por administradores.</p></div></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${e(longDate(a.occurred_at))}</td><td>${name(a.user_id)}</td><td>${e(words[a.action]||a.action)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">No hay acciones registradas.</td></tr>'}</tbody></table></div>`;
}

function payments(){
 if(!paymentQueue)return `<section class="panel"><div class="section-label">COMPROBANTES</div><h3>Revisión de pagos</h3><p class="alert">${e(paymentError||'No está habilitada la recepción de comprobantes. Instala la migración 6.1 y configura el flag en Vercel.')}</p></section>`;
 const pending=paymentQueue.filter(x=>x.status==='pending');
 const approved=paymentQueue.filter(x=>x.status==='verified');
 const rejected=paymentQueue.filter(x=>x.status==='rejected');
 return `<div class="main-title"><div><div class="section-label">USDT · TRC20</div><h3>Comprobantes de usuarios</h3><p>La revisión del pago NO activa una mensualidad y NO genera comisiones automáticamente.</p></div></div><div class="kpis"><article class="panel kpi aqua"><span>Pendientes</span><strong>${pending.length}</strong></article><article class="panel kpi"><span>Verificados</span><strong>${approved.length}</strong></article><article class="panel kpi"><span>Rechazados</span><strong>${rejected.length}</strong></article></div><section class="panel"><div class="panel-top"><h4>Bandeja de revisión</h4><button class="btn small" data-action="reload-payments">Actualizar comprobantes</button></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Fecha</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${paymentQueue.length?paymentQueue.map(x=>{
 const u=store.users.find(u=>u.user_id===x.user_id);
 const who=e(u?.email||x.user_id);
 return `<tr><td><strong>${who}</strong><small>${e(x.transaction_reference||'Sin referencia de transacción')}</small></td><td>${e(longDate(x.created_at))}</td><td>US$${(Number(x.amount_cents||0)/100).toFixed(2)}</td><td>${e(({pending:'Pendiente',verified:'Verificado',rejected:'Rechazado'})[x.status]||x.status)}</td><td><div class="user-actions"><button class="btn small" data-proof-view="${e(x.id)}">Ver captura</button>${x.status==='pending'?`<button class="btn small primary" data-proof-action="verify" data-id="${e(x.id)}">Verificar</button><button class="btn small" data-proof-action="reject" data-id="${e(x.id)}">Rechazar</button>`:''}</div></td></tr>`;
 }).join(''):'<tr><td colspan="5" class="empty">Ningún comprobante recibido.</td></tr>'}</tbody></table></div><p class="hero-note">Para habilitar el journal, utiliza por separado Usuarios → Conceder acceso; la verificación del comprobante solo deja constancia de tu revisión.</p></section>`;
}

// Separate commercial administration: verified sales are NOT access grants.
function affiliatesView(){
 if(!commercial)return `<div class="main-title"><div><div class="section-label">PROGRAMA PARTNERS</div><h3>Afiliados de EDGORIA</h3><p>El acceso de los traders se gestiona únicamente en Usuarios.</p></div></div><div class="alert">${e(commercialError||'Cargando información comercial')}</div>`;
 const {partners=[],referrals=[],sales=[],commissions=[],profiles=[],applications=[]}=commercial;
 const profile=id=>profiles.find(p=>p.user_id===id)||{};
 const usd=cents=>`US$${(Number(cents||0)/100).toFixed(2)}`;
 const totals={approved:commissions.filter(x=>x.status==='approved').reduce((n,x)=>n+Number(x.commission_cents||0),0),pending:commissions.filter(x=>x.status==='pending').reduce((n,x)=>n+Number(x.commission_cents||0),0),paid:commissions.filter(x=>x.status==='paid').reduce((n,x)=>n+Number(x.commission_cents||0),0)};
 return `<div class="main-title"><div><div class="section-label">INGRESOS Y ALIANZAS</div><h3>Afiliados y comisiones</h3><p>25% estándar o 30% partner especial, una sola comisión por el primer mes verificado. Ninguna venta activa cuentas.</p></div></div>
 <div class="kpis"><article class="panel kpi"><span>Afiliados registrados</span><strong>${partners.length}</strong><small>${partners.filter(a=>a.status==='active').length} activos</small></article><article class="panel kpi aqua"><span>Referidos atribuidos</span><strong>${referrals.length}</strong><small>Registro por enlace</small></article><article class="panel kpi"><span>Comisiones pendientes</span><strong>${usd(totals.pending)}</strong><small>Aprobar tras verificación</small></article><article class="panel kpi"><span>Comisiones pagadas</span><strong>${usd(totals.paid)}</strong><small>${usd(totals.approved)} aprobadas</small></article></div>
 <section class="panel" style="margin-bottom:20px"><div class="panel-top"><h4>Solicitudes de partners</h4><small>${applications.filter(x=>x.status==='pending').length} pendientes</small></div><div class="table-wrap"><table><thead><tr><th>Solicitante</th><th>Canal</th><th>Propuesta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${applications.length?applications.map(a=>`<tr><td><strong>${e(a.display_name)}</strong><small>${e(profile(a.user_id).email||a.user_id)}</small></td><td>${e(a.channel)}<small>${a.channel_url?`<a href="${e(a.channel_url)}" target="_blank" rel="noopener noreferrer">Ver canal</a>`:'Sin enlace'}</small><small>${Number(a.audience_size||0).toLocaleString('es-PE')} audiencia estimada</small></td><td><div style="max-width:340px;white-space:normal">${e(a.motivation)}</div></td><td>${e(a.status)}</td><td>${a.status==='pending'?`<div class="user-actions"><button class="btn small primary" data-application-action="approve-application" data-id="${e(a.id)}">Aprobar 25 %</button><button class="btn small" data-application-action="reject-application" data-id="${e(a.id)}">Rechazar</button></div>`:'—'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Todavía no hay solicitudes.</td></tr>'}</tbody></table></div></section>
 <section class="panel" style="margin-bottom:20px"><div class="panel-top"><h4>Directorio de afiliados</h4></div>
 <div class="table-wrap"><table><thead><tr><th>Afiliado</th><th>Código y referidos</th><th>Porcentaje</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${partners.length?partners.map(a=>{
  const p=profile(a.user_id),count=referrals.filter(r=>r.affiliate_id===a.id).length;
  return `<tr><td><strong>${e(p.full_name||p.email||a.user_id)}</strong><small>${e(p.email||'')}</small></td><td><code>${e(a.code)}</code><small>${count} referidos</small></td><td>${Number(a.rate_basis_points)/100}%</td><td>${e(a.status)}</td><td><div class="user-actions"><button class="btn small" data-partner-action="approve-affiliate" data-id="${e(a.id)}">Aprobar</button><button class="btn small" data-partner-action="suspend-affiliate" data-id="${e(a.id)}">Pausar</button><button class="btn small" data-partner-action="set-rate" data-rate="2500" data-id="${e(a.id)}">25%</button><button class="btn small" data-partner-action="set-rate" data-rate="3000" data-id="${e(a.id)}">30%</button></div></td></tr>`;
 }).join(''):'<tr><td colspan="5" class="empty">No hay afiliados todavía.</td></tr>'}</tbody></table></div></section>
 <section class="panel" style="margin-bottom:20px"><div class="panel-top"><h4>Registrar una venta previamente verificada</h4></div><p class="hero-note">Primero comprueba el pago fuera de EDGORIA. Este registro crea evidencia comercial y, si corresponde, una comisión. <b>No modifica los accesos.</b></p>
 <form id="affiliate-sale-form" class="eg60-form"><label>Comprador<select name="buyer_id" class="select" required><option value="">Seleccionar usuario</option>${store.users.filter(u=>u.role!=='admin').map(u=>`<option value="${e(u.user_id)}">${e(userDisplay(u))} · ${e(u.email)}</option>`).join('')}</select></label><label>Importe verificado<select name="amount_cents" class="select" required><option value="1099">US$10.99 · lanzamiento</option><option value="1499">US$14.99 · regular</option></select></label><label>Referencia de pago verificada<input class="input" required minlength="10" maxlength="128" pattern="[A-Za-z0-9_.:-]{10,128}" name="payment_reference" placeholder="Referencia única (no claves privadas)"></label><label class="checkline"><input type="checkbox" name="confirmed" required> Confirmo que verifiqué el pago por separado</label><button class="btn primary" type="submit">Registrar venta, no activar acceso</button></form></section>
 <section class="panel" style="margin-bottom:20px"><div class="panel-top"><h4>Compras verificadas (registro comercial)</h4></div><div class="table-wrap"><table><thead><tr><th>Comprador</th><th>Importe</th><th>Referido por</th><th>Verificación</th></tr></thead><tbody>${sales.length?sales.map(s=>{const ref=referrals.find(r=>r.referred_user_id===s.buyer_id);const aff=partners.find(p=>p.id===ref?.affiliate_id);return `<tr><td>${e(profile(s.buyer_id).email||s.buyer_id)}</td><td>${usd(s.amount_cents)}</td><td>${e(aff?.code||'Directa / sin enlace')}</td><td>${e(s.verified_at?new Date(s.verified_at).toLocaleDateString('es-PE'):'—')}</td></tr>`}).join(''):'<tr><td colspan="4" class="empty">Todavía no hay ventas verificadas registradas.</td></tr>'}</tbody></table></div></section>
 <section class="panel"><div class="panel-top"><h4>Comisiones por primera venta</h4></div><div class="table-wrap"><table><thead><tr><th>Afiliado</th><th>Comisión</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${commissions.length?commissions.map(c=>{
 const a=partners.find(x=>x.id===c.affiliate_id),p=profile(a?.user_id);
 return `<tr><td>${e(p.email||a?.code||'Sin referencia')}</td><td>${usd(c.commission_cents)} · ${Number(c.rate_basis_points)/100}%</td><td>${e(c.status)}</td><td><div class="user-actions">${c.status==='pending'?`<button class="btn small" data-commission-action="approve-commission" data-id="${e(c.id)}">Aprobar</button>`:''}${c.status==='approved'?`<button class="btn small primary" data-commission-action="mark-commission-paid" data-id="${e(c.id)}">Marcar pagada</button><button class="btn small" data-commission-action="reject-commission" data-id="${e(c.id)}">Rechazar</button>`:''}</div></td></tr>`;
 }).join(''):'<tr><td colspan="4" class="empty">Aún no hay comisiones registradas.</td></tr>'}</tbody></table></div></section>`;
}

function render(){renderShell(({overview:dashboard,calendar,users,access:accesses,audit,payments,affiliates:affiliatesView}[view]||dashboard)())}
function accessMessage(msg){root.innerHTML=`<section class="login-wrap"><div class="login-card"><div class="brand"><img src="/favicon.svg" alt=""/><div><h1>EDGORIA</h1><small>ADMIN</small></div></div><h1>Acceso unificado</h1><p>${e(msg)}</p><a class="btn primary" href="/app">Iniciar sesión en EDGORIA →</a></div></section>`}
async function getToken(){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('Inicia sesión de nuevo');return session.access_token}
async function api(){const token=await getToken();const r=await fetch('/api/admin?route=console',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`No se pudo cargar administración (${r.status})`);return data}
async function change(action,id,extra={}){const token=await getToken();const r=await fetch('/api/v4-access-management',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,user_id:id,...extra})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'No se pudo ejecutar esta acción');return data}
async function fetchCommercial(){
 try{
  const token=await getToken();const r=await fetch('/api/admin?route=affiliates',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'No se pudo cargar Afiliados');
  commercial=data;commercialError='';
 }catch(err){commercial=null;commercialError=err.message||'Afiliados no disponibles'}
}
async function commercialAction(action,fields={}){
 const token=await getToken();const r=await fetch('/api/admin?route=affiliates',{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({action,...fields})
 });const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`No se pudo completar ${action}`);return data;
}
async function fetchPayments(){
 try{const token=await getToken();const r=await fetch('/api/admin?route=payments',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'No se pudieron cargar comprobantes');paymentQueue=data.proofs||[];paymentError='';}
 catch(e){paymentError=e.message||'Comprobantes no disponibles';paymentQueue=null}
}
async function reviewProof(action,id,note=''){
 const token=await getToken();const r=await fetch('/api/admin?route=payments',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,id,note})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Error de revisión');return data;
}
async function viewProof(id){
 const token=await getToken();const response=await fetch('/api/admin?route=payment-image&id='+encodeURIComponent(id),{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!response.ok)throw Error('No se pudo abrir la imagen privada');
 const blob=await response.blob();const src=URL.createObjectURL(blob);
 const node=document.createElement('div');node.className='overlay';node.id='proof-modal';node.innerHTML=`<section class="modal-card eg61-proof-modal" role="dialog" aria-modal="true"><div class="section-label">COMPROBANTE PRIVADO · USDT TRC20</div><h3>Imagen para revisión</h3><img alt="Captura del comprobante enviado por un usuario" class="eg61-proof-image"><p class="notice">La captura no confirma por sí sola un pago. Comprueba la recepción antes de marcarlo verificado.</p><button type="button" class="btn" data-action="close-proof">Cerrar</button></section>`;
 document.body.appendChild(node);node.querySelector('img').src=src;
 node.querySelector('[data-action="close-proof"]').addEventListener('click',()=>{URL.revokeObjectURL(src);node.remove()});
}
async function refresh(){if(busy)return;busy=true;try{store=await api();await fetchPayments();if(view==='affiliates')await fetchCommercial();render()}finally{busy=false}}

function modal(id){const u=store.users.find(x=>x.user_id===id);if(!u||u.archived||u.role==='admin')return;selectedUser=u;const node=document.createElement('div');node.id='access-modal';node.className='overlay';node.innerHTML=`<section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="access-title"><div class="section-label">CONCEDER ACCESO</div><h3 id="access-title">${e(userDisplay(u))}</h3><p>${e(u.email)} · La activación no depende de pagos externos.</p><form id="access-form"><label>Duración<select class="select" name="kind" required><option value="trial">Prueba gratuita: 7 días</option><option value="monthly">Mensualidad: 1 mes desde la activación</option></select></label><p class="notice">La fecha de vencimiento se calculará en el servidor y aparecerá automáticamente en el calendario. Una prueba gratuita solo puede concederse una vez por usuario.</p><div class="actions"><button class="btn" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Activar acceso</button></div><div class="error" id="access-error" role="alert"></div></form></section>`;document.body.appendChild(node)}
function closeModal(){selectedUser=null;document.querySelector('#access-modal')?.remove()}
root.addEventListener('click',async ev=>{
 const button=ev.target.closest('[data-view],button');if(!button)return;
 if(button.dataset.view){view=button.dataset.view;if(view==='affiliates')await fetchCommercial();if(view==='payments')await fetchPayments();render();document.querySelector('#admin-side')?.classList.remove('open');return}
 try{
  const act=button.dataset.action;
  if(act==='refresh')await refresh();
  else if(act==='menu')document.querySelector('#admin-side')?.classList.toggle('open');
  else if(act==='signout'){await sb.auth.signOut();location.replace('/app')}
  else if(act==='today'){selectedDate=dateKey(new Date());month=selectedDate.slice(0,7);render()}
  else if(act==='prev-month'){month=shiftedMonth(month,-1);selectedDate=month+'-01';render()}
  else if(act==='next-month'){month=shiftedMonth(month,1);selectedDate=month+'-01';render()}
  else if(button.dataset.day){selectedDate=button.dataset.day;render()}
  else if(act==='reload-payments'){await fetchPayments();render();toast('Comprobantes actualizados')}
  else if(button.dataset.proofView){await viewProof(button.dataset.proofView)}
  else if(button.dataset.proofAction){const action=button.dataset.proofAction;const id=button.dataset.id;let note='';if(action==='verify'){if(!confirm('Confirma únicamente si verificaste externamente la recepción de USDT. Esto NO activará el Journal.'))return}else{const reply=prompt('Motivo del rechazo del comprobante:');if(reply===null)return;note=reply.trim();if(note.length<5)throw Error('Especifica el motivo')}await reviewProof(action,id,note);await fetchPayments();render();toast('Comprobante revisado. El acceso sigue bajo tu control.');}
  else if(button.dataset.grant)modal(button.dataset.grant);
  else if(button.dataset.suspend){if(!confirm('¿Suspender al usuario? Se anulará el periodo activo.'))return;await change('suspend',button.dataset.suspend);await refresh();toast('Cuenta suspendida')}
  else if(button.dataset.delete){
    const u=store.users.find(x=>x.user_id===button.dataset.delete);
    if(!u||u.role==='admin')throw Error('No se permite eliminar una cuenta administrativa');
    const confirmed=prompt('ELIMINACIÓN IRREVERSIBLE: la cuenta y sus datos relacionados pueden borrarse. Escribe exactamente el correo del usuario para continuar.');
    if(confirmed===null)return;
    if(confirmed.trim().toLowerCase()!==String(u.email||'').trim().toLowerCase())throw Error('El correo no coincide. No se hizo ningún cambio.');
    const phrase=prompt('Confirma la eliminación definitiva escribiendo: ELIMINAR DEFINITIVAMENTE');
    if(phrase===null)return;
    if(phrase!=='ELIMINAR DEFINITIVAMENTE')throw Error('Confirmación incorrecta. No se eliminó ninguna cuenta.');
    await change('delete-user',u.user_id,{confirmation:'DELETE_USER',confirmation_email:confirmed,confirmation_phrase:phrase});
    await refresh();toast('Cuenta eliminada de forma definitiva');
  }
  else if(button.dataset.restore){if(!confirm('¿Restaurar este usuario en estado suspendido?'))return;await change('restore-user',button.dataset.restore,{confirmation:'RESTORE_USER'});await refresh();toast('Usuario restaurado sin acceso; concede una prueba o mensualidad para habilitarlo')}
  else if(button.dataset.applicationAction){
    const action=button.dataset.applicationAction,id=button.dataset.id;
    if(!confirm(action==='approve-application'?'¿Aprobar esta solicitud de partner y emitir un enlace de referido único?':'¿Rechazar esta solicitud?'))return;
    await commercialAction(action,{id,...(action==='approve-application'?{rate_basis_points:2500}:{})});
    await fetchCommercial();render();toast(action==='approve-application'?'Afiliado aprobado: enlace generado':'Solicitud rechazada');
  }
  else if(button.dataset.partnerAction){
    const action=button.dataset.partnerAction,rate=Number(button.dataset.rate);
    if(action==='set-rate'&&!confirm(`¿Establecer una comisión de ${rate/100}% para futuras ventas?`))return;
    await commercialAction(action,{id:button.dataset.id,...(action==='set-rate'?{rate_basis_points:rate}:{})});
    await fetchCommercial();render();toast('Afiliado actualizado');
  }
  else if(button.dataset.commissionAction){
    const action=button.dataset.commissionAction;
    if(!confirm(action==='mark-commission-paid'?'¿Ya transferiste realmente esta comisión al afiliado?':'¿Confirmas la acción sobre esta comisión?'))return;
    await commercialAction(action,{id:button.dataset.id,...(action==='mark-commission-paid'?{confirmation:'TRANSFER_VERIFIED'}:{})});
    await fetchCommercial();render();toast('Comisión actualizada');
  }
 }catch(err){toast(err.message||'No se pudo completar la acción')}
});
document.addEventListener('click',ev=>{if(ev.target?.id==='access-modal'||ev.target.closest?.('[data-action="close-modal"]'))closeModal()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeModal();document.querySelector('#proof-modal [data-action=close-proof]')?.click()}});
document.addEventListener('submit',async ev=>{if(ev.target.id==='affiliate-sale-form'){
  ev.preventDefault();const f=ev.target;const btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{const d=new FormData(f);if(!d.get('confirmed'))throw Error('Debes confirmar la verificación');
    await commercialAction('verify-sale',{buyer_id:d.get('buyer_id'),amount_cents:Number(d.get('amount_cents')),payment_reference:d.get('payment_reference'),confirmation:'VERIFIQUE_EL_PAGO'});
    await fetchCommercial();render();toast('Venta registrada sin modificar el acceso del usuario');
  }catch(err){toast(err.message||'Error al registrar venta')}finally{btn.disabled=false}return;
 }
 if(ev.target.id!=='access-form')return;ev.preventDefault();const btn=ev.target.querySelector('[type=submit]');btn.disabled=true;try{
 const k=ev.target.elements.kind.value;await change(k==='trial'?'grant-trial':'grant-month',selectedUser.user_id);closeModal();await refresh();selectedDate=dateKey(new Date());month=selectedDate.slice(0,7);view='calendar';render();toast('Acceso registrado en calendario')
 }catch(err){const target=document.querySelector('#access-error');if(target)target.textContent=err.message;toast(err.message)}finally{btn.disabled=false}});
root.addEventListener('input',ev=>{if(ev.target.id==='user-search'){query=ev.target.value;const pos=ev.target.selectionStart;render();const field=document.querySelector('#user-search');field?.focus();try{field?.setSelectionRange(pos,pos)}catch{}}});
root.addEventListener('change',ev=>{if(ev.target.id==='user-filter'){statusFilter=ev.target.value;render()}if(ev.target.id==='show-archived'){showArchived=ev.target.checked;render()}});
async function init(){try{
 const cfg=await fetch('/api/config',{cache:'no-store'}).then(r=>r.json());if(!cfg.configured)throw Error('No está configurada la conexión pública de EDGORIA.');
 let client;try{client=await import('https://esm.sh/@supabase/supabase-js@2.57.0')}catch{client=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm')}
 sb=client.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const who=await sb.auth.getUser();user=who.data?.user||null;if(!user){location.replace('/app');return}await refresh();
 }catch(err){accessMessage(err.message||'No se pudo comprobar el acceso de administrador')}}
init();
