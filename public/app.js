/* EDGORIA NOVA 4.2 — product-first redesign; preserved Supabase approval, data import and private journal paths. */
import {tradingDay,tradingWeekday,tradingSessionDay,sessionWeekday,dailyRealizedPnL,CALENDAR_PRESETS,TIME_ZONES,DEFAULT_ZONE} from './trading-day.js';
import {nominalCapital,nominalPct,dailyPerformance,realizedCurve,periodSummary,knownLots,periodTrades,isValidDay,dailyRecords} from './performance14.js?v=16.0';
import {closedLossMonitor} from './risk15.js';
const $ = (sel, base=document) => base.querySelector(sel);
const $$ = (sel, base=document) => [...base.querySelectorAll(sel)];
const escapeHTML = (v) => String(v??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = (v)=>String(v??'').trim().toLowerCase();
const usd = (v,sign=true)=>`${v<0?'−':v>0&&sign?'+':''}$${Math.abs(+v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const asPercent=(v)=>`${(Number.isFinite(v)?v:0).toFixed(1)}%`;
const emptyData=()=>({accounts:[],trades:[],journal_entries:[],edgoria_journal_attachments:[],payouts:[],edgoria_v4_cash_movements:[],edgoria_plans:[],edgoria_subscriptions:[],edgoria_invoices:[],edgoria_affiliates:[],edgoria_affiliate_commissions:[],edgoria_risk_rules:[],edgoria_weekly_reviews:[],edgoria_mt5_connections:[],edgoria_strategies:[],edgoria_trade_annotations:[],edgoria_v4_profiles:[],edgoria_v4_roles:[],edgoria_v4_partner_applications:[],edgoria_v4_import_batches:[],edgoria_v4_file_positions:[]});
let sb=null, cloudAvailable=false, cloudError='', busy=false, importing=false;
let uploadResult=null;
const calendarSessionRules={};
const state={adminUserFilter:'all',adminUserQuery:'',role:'trader',personalJournalLoaded:false,profile:null,access:null,accessAdmin:null,v4AdminRoles:null,isAdmin:false,adminData:null,adminIssues:[],timezone:DEFAULT_ZONE,mode:'cloud',user:null,view:'dashboard',account:'all',period:'1',analysisDate:'',data:emptyData(),month:new Date().toISOString().slice(0,7),selectedDay:'',search:'',calendarPreset:'ny_close',};
const sections=[
  {v:'dashboard',i:'▦',n:'Overview'}, {v:'trades',i:'↗',n:'Operaciones'},
  {v:'calendar',i:'▤',n:'Calendario P&L'}, {v:'analytics',i:'◫',n:'Analytics'},
  {v:'mindset',i:'◎',n:'Journal emocional'},
  {v:'prop',i:'▣',n:'Mis cuentas MT5'}, {v:'replay',i:'⏪',n:'Replay Studio'},
  {v:'connect',i:'⌁',n:'MT5 Bridge'}, {v:'risk',i:'◈',n:'Risk Guard'},
  {v:'score',i:'◎',n:'EDGORIA Score'}, {v:'intelligence',i:'◇',n:'Intelligence'}, {v:'membership',i:'◌',n:'Mi suscripción'},
  {v:'affiliates',i:'↗',n:'Partners'}, {v:'admin',i:'⚙',n:'Administración'}, {v:'roles',i:'⚙',n:'Usuarios y roles'}, {v:'settings',i:'⚙',n:'Configuración'}
];
const icon=`<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M12 45 L25 32 L35 39 L52 19" stroke="#56E6AE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="19" r="4" fill="#FFB96A"/></svg>`;
const svgPaths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 trades:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3"/>',
 analytics:'<path d="M4 19V12M10 19V6M16 19V9M22 19V3"/>',
 mindset:'<path d="M12 3C7 3 4 7 4 12s3 9 8 9 8-4 8-9-3-9-8-9z"/><path d="M9 9h.01M15 9h.01M9 15c2 2 4 2 6 0"/>',
 prop:'<path d="M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
 replay:'<path d="M4 6v5h5"/><path d="M5 11a8 8 0 1 1 3 8"/><path d="M11 8l5 4-5 4z"/>',
 connect:'<path d="M9 7v4M15 7v4M7 11h10v3a5 5 0 0 1-10 0zM12 19v3"/>',
 risk:'<path d="M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
 score:'<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 6v6l4 2"/>',
 membership:'<rect x="3" y="5" width="18" height="14" rx="2"/>',
 intelligence:'<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>',
 roles:'<path d="M3 20h18M5 9a4 4 0 1 1 8 0a4 4 0 0 1-8 0M13 7a4 4 0 1 1 8 0"/>',
 admin:'<path d="M4 20h16M6 17h12M12 3v12M8 7l4-4 4 4"/>',
 affiliates:'<path d="M3 12l6-6 4 4 8-8M15 2h6v6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13a7 7 0 0 0 0-2l2-1-2-4-2 1a9 9 0 0 0-2-1V4H9v2a9 9 0 0 0-2 1L5 6l-2 4 2 1a7 7 0 0 0 0 2l-2 1 2 4 2-1a9 9 0 0 0 2 1v2h6v-2a9 9 0 0 0 2-1l2 1 2-4z"/>'
};
const navIcon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPaths[name]||''}</svg>`;

const viewBreadcrumb=()=>`${state.role==='admin'?'ADMINISTRACIÓN':state.role==='partner'?'PARTNERS':'WORKSPACE'} / ${sections.find(x=>x.v===state.view)?.n||'Overview'}`;
const brand=`<div class="brand"><div class="brandname">EDGORIA<small>TRADING INTELLIGENCE</small></div></div>`;
const now=()=>new Date();
const isoLocal=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daysAgo=(n)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-n);return isoLocal(d)};
const today=()=>isoLocal(now());
// Display by the visitor's local calendar day (Supabase stores ISO UTC timestamps).
// Session is labeled by the date when its 16:00 window starts.
// Trading-day profile is a per-account preference, never copied to Supabase and never affects the original MT5 fills.
function calendarStoreKey(){return 'edgoria_calendar_101_'+(state.user?.id||'guest')}
function configuredCalendarPreset(){
  let map={};try{map=JSON.parse(localStorage.getItem(calendarStoreKey())||'{}')||{}}catch{}
  const preset=map[state.account]||calendarSessionRules[state.account]||'ny_close';
  return Object.hasOwn(CALENDAR_PRESETS,preset)?preset:'ny_close';
}
function setCalendarPreset(value){
 if(!Object.hasOwn(CALENDAR_PRESETS,value))return;
 let map={};try{map=JSON.parse(localStorage.getItem(calendarStoreKey())||'{}')||{}}catch{}
 map[state.account]=value;calendarSessionRules[state.account]=value;
 try{localStorage.setItem(calendarStoreKey(),JSON.stringify(map))}catch{/* Privacy mode: keep current choice for this session. */}
 state.selectedDay='';
}
const localDay=(value)=>tradingSessionDay(value,configuredCalendarPreset());
const activeTradingDay=()=>tradingSessionDay(new Date().toISOString(),configuredCalendarPreset());
function calendarConfigUI(){
 const selected=configuredCalendarPreset(),cfg=CALENDAR_PRESETS[selected];
 return `<div class="v101-preset-card"><div class="v101-preset-row"><div><strong>Jornada de reporte</strong><p class="micro">Regla del calendario ${state.account==='all'?'para la vista combinada':'para esta cuenta'} · Horario de verano automático</p></div><select class="field" id="calendar-preset" aria-label="Regla de jornada de trading">${Object.entries(CALENDAR_PRESETS).map(([id,c])=>`<option value="${id}" ${id===selected?'selected':''}>${escapeHTML(c.label)}</option>`).join('')}</select></div><div class="micro">${escapeHTML(cfg.detail)}</div>${state.account==='all'?'<p class="micro v101-warning">Vista de todas las cuentas: se usa una misma regla de comparación. Selecciona cada cuenta arriba para configurar su horario particular. No equivale al cálculo oficial de pérdidas máximas.</p>':''}</div>`;
}

const uuid=()=>globalThis.crypto?.randomUUID?.()||'id_'+Date.now()+'_'+Math.random().toString(16).slice(2);
function notify(message,error=false){$('#toast').innerHTML=`<div class="tost ${error?'error':''}">${escapeHTML(message)}</div>`;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{$('#toast').innerHTML=''},4000)}
function loginPreviewTrades(){
  const vals=[26,18,-12,48,31,44,-20,53,38,49,21,62];
  return vals.map((p,i)=>({id:String(i+1),closed_at:new Date(2026,9,1+i).toISOString(),pnl:p}));
}
function renderSetup(message='Esta instalación necesita conectarse a Supabase antes de recibir registros reales.'){
  $('#root').innerHTML=`<div class="setup-screen"><div class="setup-card">${brand}<div class="setup-icon">⚙</div><div class="section-label">CONFIGURACIÓN DE PRODUCCIÓN</div><h1>Conexión de datos pendiente</h1><p>${escapeHTML(message)}</p><p>Para activar el acceso privado, configura la URL y la clave <strong>publicable</strong> de Supabase en Vercel y ejecuta el esquema SQL incluido. Esta versión no utiliza datos ficticios ni almacenamiento temporal.</p><div class="row wrap"><a class="btn primary" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Abrir Vercel ↗</a><a class="btn" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Abrir Supabase ↗</a></div><div class="micro" style="margin-top:26px">Archivo de instrucciones incluido: <code>README.md</code>. No publiques claves secretas.</div></div></div>`;
}
function renderPending(code='ACCESS_PENDING'){
 const confirmed=code!=='EMAIL_UNCONFIRMED';
 $('#root').innerHTML=`<div class="setup-screen"><div class="setup-card eg31-pending">${brand}<div class="section-label">EDGORIA · CUENTA EN REVISIÓN</div><div class="eg31-pending-symbol">${confirmed?'◷':'✉'}</div><h1>${confirmed?'Tu acceso está pendiente':'Confirma tu correo'}</h1><p>${confirmed?'Tu correo ha sido confirmado. Un administrador debe habilitar tu cuenta antes de entrar al dashboard.':'Revisa el enlace enviado a tu correo. Después podrás esperar la aprobación administrativa.'}</p><div class="row wrap"><button class="btn primary" data-action="check-approval">Comprobar mi acceso</button><button class="btn" data-action="signout">Cerrar sesión</button></div></div></div>`;
}
function renderSuspended(){
 $('#root').innerHTML=`<div class="setup-screen"><div class="setup-card">${brand}<div class="section-label">ACCESO ADMINISTRADO</div><h1>Cuenta desactivada</h1><p>El acceso a EDGORIA está suspendido. Contacta al administrador si necesitas revisar tu estado.</p><button class="btn" data-action="signout">Cerrar sesión</button></div></div>`;
}
// Time-limited startup: an unavailable API or CDN must never leave the loading spinner forever.
function bootStage(label,task,limit=11000){
  if(window.__edgoriaBootState)window.__edgoriaBootState.step=label;
  let timer;
  return Promise.race([
    Promise.resolve().then(task),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tiempo agotado: '+label+'. Comprueba tu conexión o los registros de Vercel.')),limit)})
  ]).finally(()=>clearTimeout(timer));
}
function bootFinished(){if(window.__edgoriaBootState)window.__edgoriaBootState.done=true}
async function importSupabaseClient(){
  try{return await bootStage('Cargando biblioteca de autenticación (servidor 1)',()=>import('https://esm.sh/@supabase/supabase-js@2.57.0'),10000)}
  catch(err){
    console.warn('EDGORIA: primera fuente de la biblioteca no respondió:',err?.message||err);
    return bootStage('Cargando biblioteca de autenticación (servidor alternativo)',()=>import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm'),10000);
  }
}
async function init(){
  try{
    const ref=new URLSearchParams(location.search).get('ref');
    if(ref&&/^edg-[a-f0-9]{12}$/.test(ref))localStorage.setItem('edgoria_ref',JSON.stringify({code:ref,seen:Date.now()}));
    const response=await bootStage('Conectando con /api/config',()=>fetch('/api/config',{cache:'no-store'}),10000);
    if(!response.ok)throw Error('La API de configuración respondió HTTP '+response.status+'.');
    const cfg=await bootStage('Leyendo configuración del servidor',()=>response.json(),3000);
    if(!cfg.configured){bootFinished();renderSetup();return}
    const {createClient}=await importSupabaseClient();
    sb=createClient(cfg.url,cfg.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    cloudAvailable=true;
    const result=await bootStage('Verificando sesión de Supabase',()=>sb.auth.getUser(),11000);
    if(location.hash.includes('type=recovery') && result?.data?.user){state.user=result.data.user;bootFinished();renderNewPassword();return}
    if(result?.data?.user){
      state.user=result.data.user;
      state.timezone=localStorage.getItem('edgoria_trading_tz_'+state.user.id)||DEFAULT_ZONE;
      await bootStage('Cargando perfil',()=>ensureProfile(),11000);
      try{await bootStage('Verificando rol y permisos',()=>loadIdentity(),11000)}catch(e){if(['ACCESS_PENDING','EMAIL_UNCONFIRMED'].includes(e.code)){bootFinished();renderPending(e.code);return;}if(e.code==='ACCESS_DISABLED'){bootFinished();renderSuspended();return;}throw e}
      await bootStage('Revisando invitación',()=>tryClaimReferral(),11000);
      await bootStage('Cargando operaciones y dashboard',()=>loadCloud(),16000);
      await bootStage('Comprobando permisos administrativos',()=>checkAdmin(),11000);
      bootFinished();render();return;
    }
    bootFinished();renderAuth();
  }catch(e){
    if(['ACCESS_PENDING','EMAIL_UNCONFIRMED'].includes(e.code)){bootFinished();renderPending(e.code);return;}if(e.code==='ACCESS_DISABLED'){bootFinished();renderSuspended();return;}
    cloudError=e.message||'Error de conexión';
    console.error('EDGORIA init:',e);
    bootFinished();renderSetup('No se pudo iniciar: '+cloudError);
  }
}

async function loadCloud(){
  if(!sb||!state.user)return;
  // El administrador solo carga SU propio journal si entra a su espacio personal.
  // Todas las consultas de Supabase siguen protegidas por RLS (auth.uid()).
  if(state.role==='admin'&&!state.personalJournalLoaded){state.data=emptyData();return;}
 if(state.role==='partner'){const names=['edgoria_affiliates','edgoria_affiliate_commissions','edgoria_v4_partner_applications'];const rows=await Promise.all(names.map(n=>sb.from(n).select('*').limit(1000)));state.data={...emptyData(),...Object.fromEntries(names.map((n,i)=>[n,rows[i].data||[]]))};return;}
 const tables=['accounts','journal_entries','edgoria_journal_attachments','payouts','edgoria_v4_cash_movements','edgoria_plans','edgoria_subscriptions','edgoria_invoices','edgoria_affiliates','edgoria_affiliate_commissions','edgoria_risk_rules','edgoria_weekly_reviews','edgoria_mt5_connections','edgoria_trade_annotations','edgoria_v4_profiles','edgoria_v4_roles','edgoria_v4_partner_applications','edgoria_v4_import_batches','edgoria_v4_file_positions'];
  const result=await Promise.all(tables.map(x=>sb.from(x).select('*').order(x==='edgoria_v4_import_batches'?'uploaded_at':x==='edgoria_v4_roles'?'assigned_at':x==='edgoria_v4_partner_applications'?'created_at':'created_at',{ascending:false}).limit(1000)));
  // Read every uploaded position, not just the first 1000. Supabase defaults to 1000 rows per call.
  const fileIndex=tables.indexOf('edgoria_v4_file_positions');
  if(!result[fileIndex].error && result[fileIndex].data?.length===1000){
    const all=[...result[fileIndex].data];let offset=1000;
    while(offset<20000){
      const page=await sb.from('edgoria_v4_file_positions').select('*').order('created_at',{ascending:false}).range(offset,offset+999);
      if(page.error){console.warn('EDGORIA: error al paginar posiciones MT5',page.error.code);break;}
      all.push(...page.data);if(page.data.length<1000)break;offset+=1000;
    }
    result[fileIndex].data=all;
  }
  let tr=[],offset=0;
  while(true){const r=await sb.from('trades').select('*').like('external_id','mt5:%').order('closed_at',{ascending:true}).range(offset,offset+999);if(r.error)throw r.error;tr.push(...r.data);if(r.data.length<1000)break;offset+=1000;if(offset>=10000){notify('Se cargaron las primeras 10.000 operaciones. La paginación avanzada está pendiente.');break;}}
  for(let i=0;i<4;i++)if(result[i].error)throw result[i].error;
  for(let i=4;i<tables.length;i++)if(result[i].error)console.warn('EDGORIA v2 módulo todavía no disponible:',tables[i],result[i].error.code);
  state.data={trades:tr,...Object.fromEntries(tables.map((k,i)=>[k,result[i].data||[]]))};
  const notes=new Map(state.data.edgoria_trade_annotations.map(x=>[x.trade_id,x]));
  const bridge=tr.map(t=>{const annotation=notes.get(t.id);return {...t,source:'bridge',source_label:'Bridge MT5',position_id:String(t.external_id||'').split(':').pop(),strategy:'Sin clasificar',notes:annotation?.notes||'',assigned_strategy_id:annotation?.strategy_id||''}});
  const fileRows=state.data.edgoria_v4_file_positions.map(p=>({...p,external_id:'mt5:file:'+p.position_id,source:'file',source_label:'Archivo sin verificar',strategy:'Sin clasificar',session:'Otra',emotion:'',risk:0,notes:'',assigned_strategy_id:''}));
  const bridgeKeys=new Set(bridge.map(t=>t.account_id+'|'+t.position_id));
  const seen=new Set();const merged=[...bridge];
  const newest=[...fileRows].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  for(const p of newest){const key=p.account_id+'|'+p.position_id;if(!bridgeKeys.has(key)&&!seen.has(key)){seen.add(key);merged.push(p)}}
  state.data.trades=merged;
  state.profile=state.data.edgoria_v4_profiles[0]||state.profile;

}
async function refreshData(){await loadCloud();render()}
async function writeData(table,row,method='insert'){
  if(!sb||!state.user)throw Error('Inicia sesión para guardar cambios');
  if(table==='trades'||table==='edgoria_mt5_deals')throw Error('Las operaciones importadas son inmutables desde el navegador');
  let result;
  if(method==='insert')result=table==='accounts'?await sb.from(table).insert({...row,user_id:state.user.id}).select('id').single():await sb.from(table).insert({...row,user_id:state.user.id});
  if(method==='update'){const {id,...patch}=row;result=await sb.from(table).update(patch).eq('id',id).eq('user_id',state.user.id)}
  if(method==='delete')result=await sb.from(table).delete().eq('id',row.id).eq('user_id',state.user.id);
  if(result?.error)throw result.error;
  return result?.data||null;
}
async function guarded(cb){if(busy)return;busy=true;try{await cb()}catch(e){console.error(e);notify(e.message||'Se produjo un error',true)}finally{busy=false}}
function renderAuth(register=false){
  $('#root').innerHTML=`<div class="login"><section class="login-art">${brand}<div class="login-copy"><div class="section-label">TU HISTORIAL. TU PROCESO. TU EVOLUCIÓN.</div><h1>Cada decisión<br>deja una <em>huella.</em></h1><p>Un journal diseñado para aprender de cada sesión. Conecta estadísticas, gestión del riesgo y disciplina en un espacio privado.</p><div class="login-features"><span>◈ Análisis de rendimiento</span><span>◎ Diario de decisiones</span><span>▣ Gestión de cuentas</span></div></div><div class="login-curve"><div class="row spread"><b style="font-size:12px">INTELIGENCIA DE RENDIMIENTO</b><span class="tag positive">Ilustración de producto</span></div>${equityChart(loginPreviewTrades())}</div></section><section class="login-aside"><div class="eyebrow">EDGORIA / SECURE ACCESS</div><h2>${register?'Empieza tu journal':'Tu espacio te espera'}</h2><p>${register?'Crea tu cuenta privada. Tus registros se guardarán en la nube.':'Accede a tus cuentas, operaciones y estadísticas guardadas.'}</p><form id="auth-form" class="auth-form" data-register="${register?'1':'0'}"><label class="control">Correo electrónico<input class="field" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="trader@ejemplo.com"/></label><label class="control">Contraseña<input class="field" name="password" type="password" minlength="10" required autocomplete="${register?'new-password':'current-password'}" placeholder="Mínimo 10 caracteres"/></label>${register?`<div class="v4-registration"><label class="control">Nombre completo<input class="field" name="full_name" maxlength="120" required autocomplete="name" placeholder="Tu nombre y apellido"/></label><label class="control">País<input class="field" name="country" required maxlength="100" autocomplete="country-name" placeholder="Ej. Perú"/></label><label class="control">Teléfono (opcional)<input class="field" name="phone" type="tel" autocomplete="tel" maxlength="24" placeholder="+51 ..."/></label><label class="control">Experiencia<select class="field" name="experience"><option value="prefiero_no_decir">Prefiero no indicar</option><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></label><div class="micro">Primero verificamos tu correo. Después, el administrador revisará y activará tu cuenta. No tendrás acceso al dashboard antes de su aprobación.</div></div>`:''}<button type="submit" class="btn primary">${register?'Crear mi cuenta':'Ingresar a mi journal'} →</button></form><div style="text-align:center;margin-top:26px;font-size:12px;color:var(--muted)">${register?'¿Ya tienes cuenta?':'¿Todavía no tienes cuenta?'} <button class="link" data-action="toggle-auth" data-register="${register?'0':'1'}">${register?'Iniciar sesión':'Registrarme'}</button></div><div style="text-align:center;margin-top:14px"><button class="link" data-action="recover">Olvidé mi contraseña</button></div><div class="eg42-public-link"><a href="/descubre.html" target="_blank" rel="noopener noreferrer">✦ Conoce el nuevo EDGORIA NOVA 4.2 ↗</a></div><div class="auth-footnote">🔒 Acceso con Supabase Auth y políticas de aislamiento por usuario. No conectamos ni ejecutamos órdenes con tu cuenta de broker.<div class="legal-links"><a href="/privacidad.html">Privacidad</a> · <a href="/terminos.html">Términos de uso</a></div></div></section></div>`;
}
function renderRecover(){
 $('#root').innerHTML=`<div class="recover-wrap"><div class="recover-card">${brand}<div class="section-label">SEGURIDAD DE LA CUENTA</div><h1>Recupera tu acceso</h1><p class="hint">Te enviaremos un enlace de recuperación a tu correo, si existe una cuenta asociada.</p><form id="recover-form" class="formstack"><label class="control">Correo electrónico<input class="field" name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label><button class="btn primary" type="submit">Enviar enlace →</button></form><button class="link" style="margin-top:22px" data-action="toggle-auth" data-register="0">← Volver al inicio</button></div></div>`;
}
function renderNewPassword(){
 $('#root').innerHTML=`<div class="recover-wrap"><div class="recover-card">${brand}<div class="section-label">SEGURIDAD DE LA CUENTA</div><h1>Establece una nueva contraseña</h1><form id="password-form" class="formstack"><label class="control">Nueva contraseña<input class="field" name="password" type="password" minlength="10" autocomplete="new-password" required></label><button class="btn primary" type="submit">Actualizar contraseña →</button></form></div></div>`;
}
async function login(form){
  if(!cloudAvailable||!sb)throw Error('El servicio de acceso no está configurado');
  const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
  if(form.dataset.register==='1'){
    const full_name=String(f.get('full_name')||'').trim(),country=String(f.get('country')||'').trim(),phone=String(f.get('phone')||'').trim(),experience=String(f.get('experience')||'prefiero_no_decir');
    if(full_name.length<2||full_name.length>120||country.length<2||country.length>100||phone.length>24||!['principiante','intermedio','avanzado','prefiero_no_decir'].includes(experience))throw Error('Completa correctamente tus datos de registro');
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin,data:{full_name,country,phone,experience}}});if(error)throw error;
    if(data.session){state.user=data.user;state.timezone=localStorage.getItem('edgoria_trading_tz_'+state.user.id)||DEFAULT_ZONE;await ensureProfile();try{await loadIdentity()}catch(e){if(['ACCESS_PENDING','EMAIL_UNCONFIRMED'].includes(e.code)){renderPending(e.code);return;}if(e.code==='ACCESS_DISABLED'){renderSuspended();return;}throw e}await tryClaimReferral();await loadCloud();await checkAdmin();render()}
    else{renderAuth(false);notify('¡Bienvenido! Revisa tu correo: verifica tu dirección y espera la aprobación de EDGORIA.')}
  }else{
    const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
    state.user=data.user;state.timezone=localStorage.getItem('edgoria_trading_tz_'+state.user.id)||DEFAULT_ZONE;await ensureProfile();try{await loadIdentity()}catch(e){if(['ACCESS_PENDING','EMAIL_UNCONFIRMED'].includes(e.code)){renderPending(e.code);return;}if(e.code==='ACCESS_DISABLED'){renderSuspended();return;}throw e}await tryClaimReferral();await loadCloud();await checkAdmin();render();notify('Bienvenido a EDGORIA');
  }
}
async function ensureProfile(){
 if(!sb||!state.user)return;
 const m=state.user.user_metadata||{};
 if(!m.full_name||!m.country)return; // Existing users can complete their profile in Configuración.
 const row={user_id:state.user.id,full_name:String(m.full_name).slice(0,120),country:String(m.country).slice(0,100),phone:String(m.phone||'').trim()||null,experience:['principiante','intermedio','avanzado','prefiero_no_decir'].includes(m.experience)?m.experience:'prefiero_no_decir'};
 const {error}=await sb.from('edgoria_v4_profiles').upsert(row,{onConflict:'user_id',ignoreDuplicates:true});
 if(error)console.warn('EDGORIA V4: perfil pendiente:',error.code);
}
async function loadIdentity(){
 state.role='trader';state.personalJournalLoaded=false;state.profile=null;state.access=null;
 try{const {data:{session}}=await sb.auth.getSession();const res=await fetch('/api/v4-me',{headers:{Authorization:'Bearer '+session.access_token}});if(!res.ok){const detail=await res.json().catch(()=>({}));const err=new Error(detail.error||'No se pudo validar tu acceso.');err.code=detail.code;throw err;}
 const data=await res.json();state.role=data.role||'trader';state.personalJournalLoaded=false;state.profile=data.profile||null;state.access=data.access||null;if(data.access?.access_status!=='active')throw Object.assign(new Error('Acceso pendiente de autorización'),{code:'ACCESS_PENDING'});
 state.view=state.role==='admin'?'admin':state.role==='partner'?'affiliates':'dashboard';
 }catch(e){
  // Preserve structured 403 codes: a confirmed registration MUST see the pending
  // approval screen rather than the generic bootstrap failure.
  if(['ACCESS_PENDING','EMAIL_UNCONFIRMED','ACCESS_DISABLED'].includes(e?.code))throw e;
  console.error('EDGORIA role verification:',e?.code||e?.message||'UNKNOWN');
  throw Object.assign(new Error('No fue posible verificar tu sesión. Pulsa reintentar o revisa el despliegue de Vercel.'),{code:e?.code||'IDENTITY_UNAVAILABLE'});
 }
}
async function logout(){if(sb){const {error}=await sb.auth.signOut();if(error)throw error;} state.user=null;state.role='trader';state.personalJournalLoaded=false;state.profile=null;state.isAdmin=false;state.adminData=null;state.data=emptyData();state.accessAdmin=null;renderAuth()}
// Vistas personales separadas del control de usuarios y partners.
const adminPrivateViews=new Set(['dashboard','trades','calendar','analytics','mindset','prop','connect']);
const adminAllowedViews=new Set([...adminPrivateViews,'admin','roles','settings']);
const partnerAllowedViews=new Set(['affiliates','settings']);
const traderAllowedViews=new Set(sections.map(x=>x.v).filter(v=>!['admin','roles'].includes(v)));
function canOpenView(view){return (state.role==='admin'?adminAllowedViews:state.role==='partner'?partnerAllowedViews:traderAllowedViews).has(view)}
function navGroup(title,names){
  const items=sections.filter(x=>names.includes(x.v)&&canOpenView(x.v));
  if(!items.length)return '';
  return `<div class="navtitle">${escapeHTML(title)}</div>`+items.map(x=>`<button class="navbtn ${state.view===x.v?'active':''}" type="button" data-view="${x.v}"><span class="ico">${navIcon(x.v)}</span>${escapeHTML(x.n)}</button>`).join('');
}
function sidebarNavigation(){
 if(state.role==='admin')return navGroup('CENTRO DE CONTROL',['admin','roles','settings'])+
   navGroup('MI JOURNAL PRIVADO',['dashboard','trades','calendar','analytics','mindset','prop','connect']);
 if(state.role==='partner')return navGroup('PARTNERS',['affiliates','settings']);
 return navGroup('TU ACTIVIDAD',['dashboard','trades','calendar','analytics'])+
   navGroup('REVISIÓN Y DISCIPLINA',['mindset','risk','score'])+
   navGroup('CUENTAS Y DATOS',['prop','connect'])+
   navGroup('TU ESPACIO',['membership','affiliates','settings']);
}
function shell(){
 const showOwnAccounts=state.role==='trader'||(state.role==='admin'&&adminPrivateViews.has(state.view));
 $('#root').innerHTML=`<div class="shell"><aside class="sidebar" id="sidebar"><div class="sidebar-scroll" id="sidebar-scroll">${brand}${sidebarNavigation()}<div class="sidebar-bottom"><div class="tip"><strong>◈ Insight of the day</strong><p>El objetivo del journal es ayudarte a comprender tus decisiones, no predecir el mercado.</p></div><button class="profile" data-action="signout"><span class="avatar">●</span><span class="info"><b>${escapeHTML(state.profile?.full_name||state.user?.user_metadata?.full_name||'Mi cuenta')}</b><small>${escapeHTML(state.user?.email||'')}</small></span><span>↗</span></button></div></div><div class="sidebar-scrollrail" id="sidebar-scrollrail" role="scrollbar" aria-label="Desplazar el menú izquierdo" aria-controls="sidebar-scroll" aria-orientation="vertical" tabindex="0"><div id="sidebar-scrollthumb" class="sidebar-scrollthumb"></div></div></aside><div class="content"><header class="topbar"><div class="row"><button class="btn iconbtn mobilemenu" data-action="menu" aria-label="Abrir menú">☰</button><span class="breadcrumb">${escapeHTML(viewBreadcrumb())}</span></div><div class="top-actions"><span class="eg31-welcome">Hola, <strong>${escapeHTML((state.profile?.full_name||state.user?.user_metadata?.full_name||'Usuario').split(/\s+/)[0])}</strong></span><span class="dot hide-mobile"></span><span class="micro hide-mobile">${escapeHTML(state.role.toUpperCase())}</span>${showOwnAccounts?`<select class="field" id="account-select" aria-label="Filtrar mi cuenta MT5"><option value="all">Todas mis cuentas</option>${state.data.accounts.map(a=>`<option value="${escapeHTML(a.id)}" ${state.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select>`:''}<button class="btn small signout-top" data-action="signout" title="Cerrar sesión" aria-label="Cerrar sesión">↪ Salir</button></div></header><main class="workspace" id="workspace"></main><footer class="footer"><span>© EDGORIA / 5.0</span><span>Los resultados proceden de posiciones cerradas de Bridge y archivos. Tus cuentas permanecen privadas.</span></footer></div></div>`;
 initSidebarScroll();
}
// Una barra visible permite arrastrar con el mouse aun cuando el sistema
// operativo oculte las barras nativas. La rueda también desplaza el menú.
function initSidebarScroll(){
 const list=$('#sidebar-scroll'),rail=$('#sidebar-scrollrail'),thumb=$('#sidebar-scrollthumb');
 if(!list||!rail||!thumb)return;
 const sync=()=>{
  const max=Math.max(0,list.scrollHeight-list.clientHeight),h=rail.clientHeight;
  const th=max?Math.max(36,Math.min(h,h*list.clientHeight/list.scrollHeight)):h;
  thumb.style.height=th+'px';
  thumb.style.transform=`translateY(${max?list.scrollTop/max*Math.max(0,h-th):0}px)`;
  rail.classList.toggle('inactive',max<=1);
  rail.setAttribute('aria-valuemax',String(Math.ceil(max)));
  rail.setAttribute('aria-valuenow',String(Math.round(list.scrollTop)));
 };
 const seek=y=>{
  const h=rail.clientHeight,th=thumb.offsetHeight,max=Math.max(0,list.scrollHeight-list.clientHeight);
  list.scrollTop=max*Math.max(0,Math.min(1,(y-th/2)/Math.max(1,h-th)));
 };
 let dragging=false;
 rail.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;dragging=true;rail.setPointerCapture(ev.pointerId);seek(ev.clientY-rail.getBoundingClientRect().top);ev.preventDefault()});
 rail.addEventListener('pointermove',ev=>{if(dragging)seek(ev.clientY-rail.getBoundingClientRect().top)});
 rail.addEventListener('pointerup',()=>{dragging=false});
 rail.addEventListener('pointercancel',()=>{dragging=false});
 rail.addEventListener('keydown',ev=>{
  const moves={ArrowDown:55,ArrowUp:-55,PageDown:list.clientHeight*.75,PageUp:-list.clientHeight*.75,End:list.scrollHeight,Home:-list.scrollHeight};
  if(!(ev.key in moves))return;list.scrollTop+=moves[ev.key];ev.preventDefault();
 });
 rail.addEventListener('wheel',ev=>{list.scrollTop+=ev.deltaY;ev.preventDefault()},{passive:false});
 list.addEventListener('scroll',sync,{passive:true});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(sync).observe(list);
 if(typeof queueMicrotask==='function')queueMicrotask(sync);else setTimeout(sync,0);
}

function visibleTrades(period=true){
 let arr=state.data.trades.filter(t=>state.account==='all'||t.account_id===state.account);
 if(period)arr=periodTrades(arr,state.period,configuredCalendarPreset(),state.analysisDate);
 return [...arr].sort((a,b)=>Date.parse(a.closed_at)-Date.parse(b.closed_at));
}
function eg14AccountsCapital(){return nominalCapital(state.data.accounts,state.account)}
function eg15FocusDay(){return state.period==='date'&&isValidDay(state.analysisDate)?state.analysisDate:activeTradingDay()}
function eg15Risk(){return closedLossMonitor(visibleTrades(false),eg14AccountsCapital(),configuredCalendarPreset(),eg15FocusDay())}
function eg15Ratio(amount,denom){return denom>0?`${(amount/denom*100).toFixed(2)}%`:'N/D'}
function eg15RiskTile(title,figure,pct,annotation,tone=''){return `<article class="eg15-stat ${tone}"><span class="eg15-stat-name">${escapeHTML(title)}</span><strong class="mono">${escapeHTML(figure)}</strong><b class="eg15-stat-pct">${escapeHTML(pct)}</b><small>${escapeHTML(annotation)}</small></article>`}
function eg15RiskProgress(label,rate,loss,limit,ratio,period){
 const width=ratio===null?0:Math.max(0,Math.min(100,ratio));const exceeded=ratio!==null&&ratio>=100;
 return `<article class="eg15-risk-gauge ${exceeded?'eg15-risk-exceeded':''}"><div class="eg15-gauge-head"><div><span>${escapeHTML(label)}</span><h3>${rate}% <small>de referencia</small></h3></div><strong class="mono">${ratio===null?'N/D':ratio.toFixed(1)+'%'} <small>consumido</small></strong></div><div class="eg15-gauge-track" role="progressbar" aria-label="Consumo del límite ${escapeHTML(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio===null?0:Math.min(100,Math.max(0,ratio)).toFixed(1)}"><div class="eg15-gauge-fill" style="width:${width.toFixed(1)}%"></div></div><p>${limit===null?'Capital nominal no disponible':`Pérdida máxima por cierres desde inicio ${escapeHTML(period)}: ${usd(-loss,false)} de ${usd(limit,false)}. Restante estimado: ${usd(Math.max(0,limit-loss),false)}.`}</p>${exceeded?'<b class="eg15-limit-warning">Umbral superado según cierres registrados · revisar con la firma</b>':''}</article>`;
}
function eg15RiskPanel(isAnalytics=false){
 const r=eg15Risk(),day=eg15FocusDay(),shown=r.daily,
 note=state.account==='all'?'Visión combinada: para revisar límites individualmente, selecciona una sola cuenta MT5 en la barra superior.':'Cuenta seleccionada; consulta sus reglas oficiales y la referencia diaria real de balance/equity.';
 return `<section class="eg15-risk-section" aria-label="Control de resultados y límites de pérdida" data-eg15-risk="true"><div class="eg15-risk-heading"><div><div class="eg15-eyebrow">LOSS MONITOR · CIERRES REALES</div><h2>Resultados y reducción del capital</h2><p>Jornada: <b>${escapeHTML(eg14DayLabel(day))}</b> · ${escapeHTML(CALENDAR_PRESETS[configuredCalendarPreset()].label)}</p></div><span class="eg15-guard-pill">REFERENCIAS 5% / 10%</span></div>
 <div class="eg15-stats-grid">
 ${eg15RiskTile('P&L cerrado · jornada',usd(shown.pnl),r.daily.pct===null?'N/D':`${r.daily.pct>0?'+':''}${r.daily.pct.toFixed(2)}%`,`${shown.count} operaciones cerradas`,shown.pnl<0?'is-loss':'is-gain')}
 ${eg15RiskTile('P&L cerrado · histórico',usd(r.total.pnl),r.total.pct===null?'N/D':`${r.total.pct>0?'+':''}${r.total.pct.toFixed(2)}%`,'Desde el historial MT5 completo',r.total.pnl<0?'is-loss':'is-gain')}
 ${eg15RiskTile('Reducción total máxima por cierres',usd(-r.total.maxBelowInitial,false),r.total.maxBelowInitialPct===null?'N/D':`${r.total.maxBelowInitialPct>0?'−':''}${r.total.maxBelowInitialPct.toFixed(2)}%`,'Mayor descenso del acumulado bajo el nominal', 'is-loss')}
 ${eg15RiskTile('Drawdown máximo realizado',usd(-r.total.maxDrawdown,false),r.total.drawdownPct===null?'N/D':`${r.total.drawdownPct>0?'−':''}${r.total.drawdownPct.toFixed(2)}%`,'Desde el máximo acumulado de cierres','is-loss')}
 </div>
 <div class="eg15-gauges">${eg15RiskProgress('Límite de pérdida diaria',5,r.daily.maxBelowStart,r.limits.dailyUsd,r.limits.dailyUtilization,'del día')}${eg15RiskProgress('Límite de pérdida total',10,r.total.maxBelowInitial,r.limits.totalUsd,r.limits.totalUtilization,'del historial')}</div>
 <p class="eg15-risk-note">${escapeHTML(note)} Estos indicadores son estimaciones basadas exclusivamente en operaciones cerradas y capital nominal; no incorporan posiciones abiertas, pérdidas flotantes, depósitos, retiros ni umbrales dinámicos. No certifican cumplimiento con reglas de prop firms.</p></section>`;
}

function eg14Percent(num,base=eg14AccountsCapital()){const v=nominalPct(num,base);return v===null?'N/D':`${v>0?'+':''}${v.toFixed(2)}%`}
function eg14Amount(num,zero='—'){return num==null?zero:usd(num)}
function eg14DayLabel(day){return day?new Date(day+'T12:00:00Z').toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Sin cierres'}
function eg14LotsCard(arr){const lots=knownLots(arr);return neoMetric('Lotaje promedio',lots.average===null?'N/D':lots.average.toFixed(2)+' lotes',lots.average===null?'Los historiales anteriores no guardaban lotes':`${lots.count} posiciones con volumen MT5`, 'blue',[])}

function stats(arr){
  const wins=arr.filter(t=>Number(t.pnl)>0),losses=arr.filter(t=>Number(t.pnl)<0),total=arr.reduce((s,t)=>s+Number(t.pnl||0),0),grossWin=wins.reduce((s,t)=>s+Number(t.pnl||0),0),grossLoss=-losses.reduce((s,t)=>s+Number(t.pnl||0),0);
  let balance=0,peak=0,maxDd=0;
  for(const t of arr){balance+=Number(t.pnl||0);peak=Math.max(peak,balance);maxDd=Math.max(maxDd,peak-balance)}
  return{total,count:arr.length,win:wins.length,loss:losses.length,wr:arr.length?wins.length/arr.length*100:0,pf:grossLoss?grossWin/grossLoss:grossWin?Infinity:0,grossWin,grossLoss,maxDd,expect:arr.length?total/arr.length:0,avgR:(()=>{const known=arr.filter(t=>Number(t.risk)>0);return known.length?known.reduce((sum,t)=>sum+Number(t.pnl||0)/Number(t.risk),0)/known.length:null})()};
}
function cardMetric(label,value,foot,type='',glyph='↗'){return `<div class="kpi"><div><span>${escapeHTML(label)}</span><span class="circle">${glyph}</span></div><div class="money mono ${type}">${value}</div><div class="micro">${escapeHTML(foot)}</div></div>`}
function pageTitle(over,title,desc,action=''){return `<div class="pageheading"><div><div class="section-label">${escapeHTML(over)}</div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(desc)}</p></div>${action||`<div class="date">${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>`}</div>`}
function equityChart(arr){
  let y=0,nums=[0];const sorted=[...arr].sort((a,b)=>new Date(a.closed_at)-new Date(b.closed_at));for(const x of sorted){y+=Number(x.pnl||0);nums.push(y)}
  if(nums.length<2)nums.push(0);const lo=Math.min(0,...nums),hi=Math.max(0,...nums),r=Math.max(1,hi-lo),w=760;
  const points=nums.map((n,i)=>[25+(i/(nums.length-1))*710,20+((hi-n)/r)*174]);const path=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${w} 228" role="img" aria-label="Curva de rendimiento acumulado"><defs><linearGradient id="gchart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#56E6AE" stop-opacity=".28"/><stop offset="1" stop-color="#56E6AE" stop-opacity="0"/></linearGradient></defs>${[39,82,125,168,207].map(y=>`<line x1="24" x2="744" y1="${y}" y2="${y}" stroke="#31445a" stroke-dasharray="5 7" opacity=".6"/>`).join('')}<path d="${path} L735 210 L25 210 Z" fill="url(#gchart)"/><path d="${path}" fill="none" stroke="#56E6AE" stroke-width="3.3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="5" stroke="#11372f" stroke-width="3" fill="#56E6AE"/><text x="25" y="222" class="chartlabel">INICIO</text><text x="685" y="222" class="chartlabel">ACTUAL</text></svg>`;
}
function distribution(s){
  const win=s.wr;
  return `<div class="row wrap" style="margin:20px 0;gap:25px"><div class="donut" style="background:conic-gradient(var(--teal) 0% ${win}%,var(--red) ${win}% 100%)"><div class="donut-inner">${asPercent(win)}<small>win rate</small></div></div><div style="flex:1;min-width:110px"><div class="statrow"><span><span style="color:var(--teal)">●</span> Ganadas</span><b>${s.win}</b></div><div class="statrow"><span><span style="color:var(--red)">●</span> Perdidas</span><b>${s.loss}</b></div><div class="statrow"><span>Total</span><b>${s.count}</b></div></div></div><div class="statrow"><span>Max. drawdown registrado</span><b class="red">${usd(-s.maxDd,false)}</b></div><div class="statrow"><span>Expectancy / trade</span><b>${usd(s.expect)}</b></div>`;
}
function perfBars(trades,field){
  const sums={};for(const t of trades){const key=t[field]||'Sin clasificar';sums[key]=(sums[key]||0)+Number(t.pnl||0)}
  const vals=Object.entries(sums).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...vals.map(x=>Math.abs(x[1])));
  return vals.length?`<div class="performance-list">${vals.map(([k,v])=>`<div class="barrow"><div class="barlabel">${escapeHTML(k)}</div><div class="bartrack"><div class="bar" style="width:${Math.abs(v)/max*100}%;background:${v>=0?'var(--teal)':'var(--red)'}"></div></div><div class="barval mono ${v>=0?'green':'red'}">${usd(v)}</div></div>`).join('')}</div>`:'<div class="empty">Sin operaciones para analizar.</div>';
}
function tradesTable(arr,includeEdit=false){
  if(!arr.length)return `<div class="empty">Todavía no hay operaciones registradas en este filtro.</div>`;
  return `<div class="tablewrap"><table class="table"><thead><tr><th>FECHA</th><th>ACTIVO</th><th>DIRECCIÓN</th><th>ORIGEN</th><th>SESIÓN</th><th>RIESGO</th><th>LOTES</th><th>NET P&L</th>${includeEdit?'<th>NOTAS</th>':''}</tr></thead><tbody>${[...arr].reverse().map(t=>`<tr><td class="muted mono">${escapeHTML(localDay(t.closed_at))}</td><td><b>${escapeHTML(t.symbol)}</b></td><td><span class="tag ${t.direction==='BUY'?'positive':'negative'}">${escapeHTML(t.direction==='BUY'?'↗ BUY':'↘ SELL')}</span></td><td><span class="micro">${escapeHTML(t.source_label||'Bridge MT5')}</span></td><td class="muted">${escapeHTML(t.session||'—')}</td><td class="mono muted">${usd(t.risk||0,false)}</td><td class="mono muted">${Number(t.volume_lots)>0?Number(t.volume_lots).toFixed(2):'N/D'}</td><td class="mono ${Number(t.pnl)>=0?'green':'red'}"><b>${usd(t.pnl)}</b></td>${includeEdit?`<td>${t.source==='file'?'<span class="micro">Archivo importado</span>':`<button class="btn small" data-action="annotate-trade" data-id="${escapeHTML(t.id)}">Añadir nota</button>`}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
}

// Pure SVG/CSS charts — no external library or per-trade tracking calls.
const nf101=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
function dailyPlot(trades,limit=15){
 const rows=dailyRealizedPnL(trades,configuredCalendarPreset()).slice(-limit),max=Math.max(1,...rows.map(r=>Math.abs(r.pnl)));
 if(!rows.length)return '<div class="empty">Importa un historial MT5 para ver el P&L diario.</div>';
 return `<div class="v101-daily-plot" role="group" aria-label="Resultado neto por jornada">${rows.map(r=>{
  const h=Math.max(4,Math.abs(r.pnl)/max*100);
  return `<button type="button" class="v101-daily-col" data-action="explore-calendar-day" data-date="${r.date}" title="${r.date} · ${usd(r.pnl)} · ${r.count} operaciones" aria-label="${r.date}: ${usd(r.pnl)}; ${r.count} operaciones"><span class="v101-daily-num ${r.pnl>=0?'green':'red'}">${usd(r.pnl)}</span><span class="v101-bar-space"><span class="v101-daily-bar ${r.pnl>=0?'positive':'negative'}" style="height:${h}%"></span></span><span class="v101-daily-caption">${r.date.slice(5)}</span></button>`;
 }).join('')}</div>`;
}
function cumulativeDayChart(trades){
 const rows=dailyRealizedPnL(trades,configuredCalendarPreset());
 if(!rows.length)return '<div class="empty">Sin jornadas cerradas para mostrar.</div>';
 const seq=[0];for(const r of rows)seq.push(seq.at(-1)+r.pnl);
 const lo=Math.min(...seq),hi=Math.max(...seq),spread=Math.max(1,hi-lo),w=720,h=205;
 const pts=seq.map((v,i)=>[22+i/(seq.length-1)*676,18+(hi-v)/spread*155]);
 const path=pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
 const zero=18+(hi/spread)*155;
 return `<svg class="v101-line" viewBox="0 0 ${w} ${h}" role="img" aria-label="P&L realizado acumulado por jornada"><title>P&L acumulado ${usd(seq.at(-1))}; ${rows.length} días con operaciones</title><line x1="22" y1="${zero}" x2="698" y2="${zero}" stroke="currentColor" opacity=".25" stroke-dasharray="6 6"/><path d="${path}" fill="none" stroke="var(--teal)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="4.8" fill="var(--sun)"/><text x="24" y="201" fill="currentColor" font-size="11">${rows[0].date}</text><text x="612" y="201" fill="currentColor" font-size="11">${rows.at(-1).date}</text></svg>`;
}
function realizedDrawdownChart(trades){
 const sorted=[...trades].sort((a,b)=>new Date(a.closed_at)-new Date(b.closed_at));
 if(!sorted.length)return '<div class="empty">Sin datos de drawdown realizado.</div>';
 let running=0,peak=0;const vals=[0];for(const t of sorted){running+=Number(t.pnl)||0;peak=Math.max(peak,running);vals.push(Math.max(0,peak-running))}
 const max=Math.max(1,...vals),pts=vals.map((v,i)=>[22+i/(vals.length-1)*676,20+v/max*155]);
 const path=pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
 return `<svg class="v101-line" viewBox="0 0 720 205" role="img" aria-label="Drawdown calculado sobre cierres, no sobre posiciones abiertas"><title>Máximo retroceso realizado: ${usd(max,false)}. No refleja equity flotante.</title><line x1="22" x2="698" y1="20" y2="20" stroke="currentColor" opacity=".25"/><path d="${path}" stroke="var(--red)" stroke-width="3.2" fill="none" stroke-linejoin="round"/><text x="23" y="200" font-size="11" fill="currentColor">Inicio</text><text x="635" y="200" font-size="11" fill="currentColor">Actual</text></svg>`;
}
function dailySummary(trades){
 const rows=dailyRealizedPnL(trades,configuredCalendarPreset());
 const wins=rows.filter(r=>r.pnl>0),losses=rows.filter(r=>r.pnl<0),flat=rows.filter(r=>r.pnl===0),sum=rows.reduce((s,r)=>s+r.pnl,0);
 return {rows,wins:wins.length,losses:losses.length,flat:flat.length,days:rows.length,avg:rows.length?sum/rows.length:0,best:rows.length?Math.max(...rows.map(r=>r.pnl)):null,worst:rows.length?Math.min(...rows.map(r=>r.pnl)):null};
}
function periodSelect(){return `<div class="eg15-period-control">${neoPeriodControl()}</div>`}

function eg16RecordsPanel(){
 const hist=visibleTrades(false),rec=dailyRecords(hist,configuredCalendarPreset()),base=eg14AccountsCapital();
 const draw=(d,trade,positive)=>`<article class="eg16-record ${positive?'eg16-best':'eg16-worst'}"><div class="eg16-record-top"><span>${positive?'MEJOR DÍA':'PEOR DÍA'}</span><span class="eg16-record-icon">${positive?'↗':'↘'}</span></div><strong class="eg16-record-value mono">${d?usd(d.pnl):'N/D'}</strong><div class="eg16-record-pct">${d?eg14Percent(d.pnl,base):'—'} del capital nominal</div><div class="eg16-record-date">${d?eg14DayLabel(d.date)+' · '+d.count+' operaciones':'Todavía no existe una jornada neta '+(positive?'positiva':'negativa')}</div><div class="eg16-record-sub">Mayor ${positive?'ganancia':'pérdida'} en una sola operación: <b>${trade?usd(trade.pnl):'N/D'}</b></div></article>`;
 return `<section class="eg16-records-wrap" aria-label="Mejor y peor jornada histórica"><div class="eg16-records-head"><div><span class="eg15-eyebrow">RÉCORDS POR JORNADA · HISTORIAL COMPLETO</span><h2>Tu mejor y tu peor día</h2><p>Un solo día neto, no una suma de varios días. Se actualiza cuando importas operaciones.</p></div><span class="eg16-record-count">${rec.days.length} jornadas</span></div><div class="eg16-records-grid">${draw(rec.best,rec.bestTrade,true)}${draw(rec.worst,rec.worstTrade,false)}</div></section>`;
}
function eg16FundedPayouts(){
 // Financial data belongs exclusively in Analytics. MT5 Bridge remains an import/connect workspace.
 const accts=(state.data.accounts||[]).filter(a=>a.account_type==='funded'&&(state.account==='all'||String(state.account)===String(a.id)));
 if(!accts.length)return '';
 const sum=xs=>xs.reduce((n,x)=>n+(Number(x.amount)||0),0);
 const entries=accts.map(a=>{
  const detected=(state.data.edgoria_v4_cash_movements||[]).filter(x=>String(x.account_id)===String(a.id)&&x.event_type==='withdrawal').sort((x,y)=>Date.parse(y.event_time)-Date.parse(x.event_time));
  const manual=(state.data.payouts||[]).filter(x=>String(x.account_id)===String(a.id)).sort((x,y)=>String(y.paid_at).localeCompare(String(x.paid_at)));
  const row=(m,kind)=>`<li class="eg181-event"><div><time>${escapeHTML(eg14DayLabel(String(kind==='mt5'?m.event_time:m.paid_at).slice(0,10)))}</time><span>${escapeHTML(kind==='mt5'?(m.description||'Movimiento identificado en MT5'):(m.note||'Anotación manual'))}</span></div><strong class="mono">${usd(Number(m.amount)||0,false)}</strong></li>`;
  const count=detected.length+manual.length;
  return `<article class="eg181-account-card" aria-label="Historial funded de ${escapeHTML(a.name)}">
    <div class="eg181-account-title"><span class="eg181-funded-dot" aria-hidden="true"></span><div><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.firm||'Cuenta fondeada')} · FUNDED</p></div><span class="eg181-count">${count} movimiento${count===1?'':'s'}</span></div>
    <div class="eg181-summary-grid"><div><span>Retiros detectados en archivos</span><strong class="mono">${usd(sum(detected),false)}</strong><small>${detected.length} registro${detected.length===1?'':'s'} MT5</small></div><div><span>Retiros anotados manualmente</span><strong class="mono">${usd(sum(manual),false)}</strong><small>${manual.length} registro${manual.length===1?'':'s'} manual${manual.length===1?'':'es'}</small></div></div>
    ${count?`<details class="eg181-events"><summary><span>Consultar movimientos <small>${count} registros</small></span><span aria-hidden="true">⌄</span></summary><div class="eg181-events-columns"><div><h4>Detectados en archivo MT5</h4>${detected.length?`<ul>${detected.map(m=>row(m,'mt5')).join('')}</ul>`:'<p class="eg181-empty">Sin movimientos MT5 identificados.</p>'}</div><div><h4>Registrados manualmente</h4>${manual.length?`<ul>${manual.map(m=>row(m,'manual')).join('')}</ul>`:'<p class="eg181-empty">Sin anotaciones manuales.</p>'}</div></div></details>`:'<p class="eg181-empty eg181-account-empty">No se identificaron retiros en los reportes de esta cuenta. Puedes importar un historial actualizado desde MT5 Bridge.</p>'}
  </article>`;
 });
 return `<section class="eg181-funded-section" id="funded-withdrawals" aria-label="Retiros de cuentas funded en Analytics">
  <header class="eg181-section-head"><div><div class="eg181-eyebrow"><span class="eg181-funded-dot"></span> ANALYTICS · CUENTAS FUNDED</div><h2>Retiros de cuentas fondeadas</h2><p>Consulta tus movimientos identificados en archivos y tus anotaciones manuales, sin mezclarlos con las ganancias de operaciones.</p></div><span class="eg181-account-counter">${accts.length} cuenta${accts.length===1?'':'s'}</span></header>
  <div class="eg181-account-list">${entries.join('')}</div>
  <details class="eg181-clarification"><summary>Cómo se interpretan estos importes</summary><p>Solo se detectan movimientos negativos etiquetados explícitamente como retirada, withdrawal, payout u otras variantes reconocidas. Un movimiento en el reporte MT5 no demuestra que se haya completado un pago externo. Los importes detectados y los anotados manualmente se muestran por separado porque podrían corresponder a un mismo retiro. No se restan del P&L de operaciones.</p></details>
 </section>`;
}

/* NEO 17 · Quiet, focused home dashboard; all advanced tools remain in Analytics. */
function eg17CompactRiskItem(label,level,usdLimit,loss,utilization,scope){
 const valid=Number.isFinite(Number(utilization))&&usdLimit>0;
 const usage=valid?Math.max(0,utilization):null;
 const fill=usage===null?0:Math.max(0,Math.min(100,usage));
 const over=usage!==null&&usage>=100;
 return `<div class="eg17-limit ${over?'eg17-limit-over':''}">
 <div class="eg17-limit-top"><div><span class="eg17-limit-caption">${escapeHTML(label)}</span><strong>${level}% <small>límite de referencia</small></strong></div><span class="eg17-limit-used">${usage===null?'N/D':usage.toFixed(1)+'%'} <small>usado</small></span></div>
 <div class="eg17-meter" role="progressbar" aria-label="${escapeHTML(label)} · límite de referencia" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill.toFixed(1)}"><span style="width:${fill.toFixed(1)}%"></span></div>
 <div class="eg17-limit-bottom"><span>${usdLimit==null?'Configura el capital nominal':`Máx. reducción registrada: ${usd(-loss,false)}`}</span><b>${usdLimit==null?'N/D':`Margen ref.: ${usd(Math.max(0,usdLimit-loss),false)}`}</b></div>
 ${over?`<span class="eg17-warning">Umbral de ${escapeHTML(scope)} alcanzado según cierres</span>`:''}</div>`;
}
function eg17RiskAside(r){
 const day=eg15FocusDay();
 return `<section class="eg17-surface eg17-risk" aria-label="Monitor de límites basado en cierres">
 <header class="eg17-panel-heading"><div><div class="eg17-overline">CONTROL DE RIESGO</div><h2>Tu margen de referencia</h2><p>${escapeHTML(eg14DayLabel(day))} · cierres MT5</p></div><span class="eg17-shield" aria-hidden="true">◇</span></header>
 <div class="eg17-limits">
 ${eg17CompactRiskItem('Pérdida diaria',5,r.limits.dailyUsd,r.daily.maxBelowStart,r.limits.dailyUtilization,'5 % diario')}
 ${eg17CompactRiskItem('Pérdida total',10,r.limits.totalUsd,r.total.maxBelowInitial,r.limits.totalUtilization,'10 % total')}
 </div>
 <details class="eg17-risk-more"><summary>¿Cómo se calculan estas cifras?</summary><p>Se usa el capital nominal y únicamente el historial de operaciones cerradas. No incluye flotantes, depósitos, retiros ni condiciones particulares de cada firma. Para evaluar una cuenta, selecciónala arriba; la vista combinada no representa un límite oficial.</p><p>Reducción histórica máxima bajo el capital inicial: <strong>${usd(-r.total.maxBelowInitial,false)}</strong> · Drawdown realizado desde un máximo: <strong>${usd(-r.total.maxDrawdown,false)}</strong>.</p></details>
 </section>`;
}
function eg17SummaryCard(title,value,note,kind='neutral',icon=''){return `<article class="eg17-summary ${kind}"><span class="eg17-summary-label">${escapeHTML(title)} <i aria-hidden="true">${escapeHTML(icon)}</i></span><strong class="mono">${escapeHTML(value)}</strong><span class="eg17-summary-note">${escapeHTML(note)}</span></article>`;}
function eg17RecordMini(day,positive,base){
 const title=positive?'Mejor día':'Peor día';
 return `<div class="eg17-record-mini ${positive?'eg17-best-mini':'eg17-worst-mini'}"><div class="eg17-record-label"><span class="eg17-record-mark" aria-hidden="true">${positive?'↗':'↘'}</span><span>${title}</span></div><strong class="mono">${day?usd(day.pnl):'N/D'}</strong><span class="eg17-record-percent">${day?eg14Percent(day.pnl,base):'Sin registros'}${day?' del capital nominal':''}</span><small>${day?eg14DayLabel(day.date)+' · '+day.count+' cierres':positive?'Aún no hubo una jornada positiva':'Aún no hubo una jornada negativa'}</small></div>`;
}
function eg17RecentTrades(rows){
 const list=rows.slice(-4).reverse();
 return `<section class="eg17-surface eg17-recent"><header class="eg17-panel-heading"><div><div class="eg17-overline">ÚLTIMOS MOVIMIENTOS</div><h2>Operaciones recientes</h2></div><button class="eg17-text-link" data-view="trades" type="button">Ver historial ↗</button></header>
 ${list.length?`<div class="eg17-recent-list">${list.map(x=>`<div class="eg17-recent-row"><div class="eg17-recent-symbol"><strong>${escapeHTML(x.symbol||'Activo')}</strong><small>${escapeHTML(eg14DayLabel(localDay(x.closed_at)))}</small></div><span class="mono ${Number(x.pnl)>=0?'green':'red'}">${usd(Number(x.pnl))}</span></div>`).join('')}</div>`:'<p class="eg17-nodata">Sin operaciones en las fechas seleccionadas.</p>'}</section>`;
}
function eg42DailyReview(){
 const date=state.period==='date'&&isValidDay(state.analysisDate)?state.analysisDate:activeTradingDay();
 const entries=(state.data.journal_entries||[]).filter(e=>e.entry_date===date);
 const last=entries.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
 const reviewing=!!last;
 return `<section class="eg42-review-strip" aria-label="Revisión diaria del proceso">
 <div class="eg42-review-sigil" aria-hidden="true">${reviewing?'✓':'✦'}</div>
 <div class="eg42-review-copy"><div class="eg42-eyebrow">RITUAL DE REVISIÓN · ${escapeHTML(date)}</div>
 <strong>${reviewing?'Jornada documentada':'Cierra la jornada con claridad'}</strong>
 <p>${reviewing?'Tu reflexión está guardada. Puedes revisar el proceso y las capturas en tu diario.':'Registra qué respetaste, qué cambiarías y qué aprendiste. Sin necesidad de predecir resultados.'}</p></div>
 <button type="button" class="eg42-review-cta" data-view="mindset">${reviewing?'Abrir mi diario':'Revisar mi jornada'} <span aria-hidden="true">↗</span></button></section>`;
}
function dashboard(){
 const arr=visibleTrades(),s=stats(arr),base=eg14AccountsCapital(),r=eg15Risk();
 const rec=dailyRecords(visibleTrades(false),configuredCalendarPreset()),pct=eg14Percent(s.total,base);
 return `<div class="eg17-dashboard eg42-dashboard" data-edgoria-version="4.2">
 <header class="eg17-header"><div><span class="eg17-overline">EDGORIA 5.0 · TRADING INTELLIGENCE</span><h1>Tus decisiones, <em>más claras.</em></h1><p>Un resumen útil, sin ruido: rendimiento realizado, disciplina y evolución de tus cuentas.</p></div>${neoPeriodControl()}</header>
 ${!state.data.accounts.length?`<section class="eg17-empty-start"><h3>Comienza con una cuenta MT5</h3><p>Crea tu cuenta y sube el historial desde Bridge para ver indicadores reales.</p><button class="btn primary" data-view="prop" type="button">Crear cuenta MT5 →</button></section>`:''}
 <section class="eg17-overview" aria-label="Principales indicadores del período">
 <article class="eg17-hero ${s.total<0?'eg17-hero-loss':''}"><div class="eg17-hero-top"><span class="eg17-overline">RESULTADO NETO · PERÍODO SELECCIONADO</span><span class="eg17-hero-icon" aria-hidden="true">↗</span></div><strong class="eg17-hero-value mono">${usd(s.total)}</strong><div class="eg17-hero-footer"><span class="eg17-percent ${s.total<0?'red':'green'}">${pct} <small>del capital nominal</small></span><span class="eg17-trades-count">${arr.length} operaciones cerradas</span></div></article>
 ${eg17SummaryCard('Ganancias cerradas',usd(s.grossWin),`${s.win} operaciones positivas`,'eg17-gain','↗')}
 ${eg17SummaryCard('Pérdidas cerradas',usd(-s.grossLoss),`${s.loss} operaciones negativas`,'eg17-loss','↘')}
 ${eg17SummaryCard('Tasa de acierto',asPercent(s.wr),`${s.win} de ${s.count} cierres`,'eg17-winrate','◎')}
 </section>
 ${eg42DailyReview()}
 <div class="eg17-primary-grid">
 <section class="eg17-surface eg17-equity"><header class="eg17-panel-heading"><div><div class="eg17-overline">EVOLUCIÓN</div><h2>Curva de capital</h2><p>Haz clic, pasa el mouse o usa Tab sobre un punto para consultar su jornada.</p></div><span class="eg17-chart-unit">USD · cierres</span></header>${neoEquityChart(arr)}</section>
 ${eg17RiskAside(r)}
 </div>
 <div class="eg17-bottom-grid"><section class="eg17-surface eg17-records"><header class="eg17-panel-heading"><div><div class="eg17-overline">RÉCORDS DEL HISTORIAL</div><h2>Jornadas destacadas</h2><p>El mayor resultado neto de un solo día.</p></div><button class="eg17-text-link" data-view="analytics" type="button">Analizar ↗</button></header><div class="eg17-record-mini-grid">${eg17RecordMini(rec.best,true,base)}${eg17RecordMini(rec.worst,false,base)}</div></section>
 ${eg17RecentTrades(arr)}</div>
 <details class="eg17-extra"><summary><span><strong>Más análisis y configuración</strong><small>Distribución de cierres, resultados por activo, jornadas y horario de la cuenta</small></span><span class="eg17-chevron" aria-hidden="true">⌄</span></summary><div class="eg17-extra-content"><div class="eg17-extra-grid">
 <section class="card"><div class="cardhead"><h3>Distribución de cierres</h3><span class="tag positive">${asPercent(s.wr)} win rate</span></div>${distribution(s)}${eg14LotsCard(arr)}</section>
 <section class="card"><div class="cardhead"><h3>Resultado por jornada</h3><small>Fechas del período</small></div>${dailyPlot(arr,14)}</section>
 <section class="card"><div class="cardhead"><h3>Rendimiento por activo</h3><small>P&L de cada símbolo</small></div>${perfBars(arr,'symbol')}</section>
 <section class="card"><div class="cardhead"><h3>Horario de jornada MT5</h3></div>${calendarConfigUI()}</section></div></div></details>
 <div class="eg17-bottom-note">Los porcentajes usan el capital nominal de las cuentas seleccionadas. La curva representa capital estimado, no equity flotante; el monitor de límites es orientativo y no certifica el cumplimiento con una prop firm.</div>
 </div>`;
}

function tradesView(){
  let arr=visibleTrades().filter(t=>!state.search||[t.symbol,t.session,t.notes].join(' ').toLowerCase().includes(state.search.toLowerCase()));
  const s=stats(arr);
  return pageTitle('MT5 EXECUTION LOG','Operaciones MT5 sincronizadas','Historial de Bridge MT5 y archivos importados, identificados por origen.',periodSelect())+
  `<div class="notice">🔒 Sin operaciones manuales. Las posiciones proceden del Bridge o de archivos MT5 subidos por el usuario. Los archivos NO están certificados por el broker; eliminar un archivo retira sus resultados derivados y recalcula las métricas.</div>
  <div class="kpis">${cardMetric('Operaciones',s.count,'Historial MT5')}${cardMetric('P&L acumulado',usd(s.total),'Neto MT5',s.total>=0?'green':'red')}${cardMetric('Win rate',asPercent(s.wr),'Operaciones cerradas')}${cardMetric('Expectancy',usd(s.expect),'Promedio por operación')}</div>
  <div class="tools"><input class="field" type="search" id="search" value="${escapeHTML(state.search)}" placeholder="Buscar activo o notas..." aria-label="Buscar operaciones"/><button class="btn primary" data-view="connect">⌁ Conectar MT5</button><button class="btn" data-action="export-csv">↓ Exportar</button></div><section class="card">${tradesTable(arr,true)}</section>`;
}
function calendarView(){
 const [year,month]=state.month.split('-').map(Number),maxday=new Date(year,month,0).getDate(),weekday=(new Date(year,month-1,1).getDay()+6)%7;
 const trades=visibleTrades(false),dayRows=dailyRealizedPnL(trades,configuredCalendarPreset()),sums=new Map(dayRows.map(r=>[r.date,r]));
 let cal=['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(x=>`<div class="calname">${x}</div>`).join('');for(let i=0;i<weekday;i++)cal+='<div></div>';
 for(let day=1;day<=maxday;day++){
   const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,item=sums.get(date),val=item?.pnl;
   cal+=`<button class="calday ${val>0?'pos':val<0?'neg':''} ${state.selectedDay===date?'selected':''}" data-action="calendar-day" data-date="${date}" title="${item?`${item.count} operaciones · ${usd(val)}`:'Sin cierres registrados'}"><b>${day}</b>${item?`<em class="mono ${val>=0?'green':'red'}">${usd(val)}</em><small class="v101-tradecount">${item.count} oper.</small>`:''}</button>`;
 }
 const selected=trades.filter(t=>localDay(t.closed_at)===state.selectedDay);
 const monthly=dayRows.filter(r=>r.date.startsWith(state.month)),monthlyNet=monthly.reduce((s,r)=>s+r.pnl,0),weekly=new Map();
 for(const r of monthly){const d=new Date(r.date+'T12:00:00Z'),dow=(d.getUTCDay()+6)%7,weekStart=new Date(d.getTime()-dow*86400000).toISOString().slice(0,10);weekly.set(weekStart,(weekly.get(weekStart)||0)+r.pnl)}
 return pageTitle('JOURNAL / TRADING DAY','Calendario de resultados','Concilia las jornadas por el cierre real de las posiciones MT5; la regla del día varía según la firma.')+
 `${calendarConfigUI()}<div class="kpis v101-kpis">${cardMetric('P&L del mes',usd(monthlyNet),`${monthly.length} jornadas registradas`,monthlyNet>=0?'green':'red')}${cardMetric('Días positivos',String(monthly.filter(r=>r.pnl>0).length),'Sobre cierres realizados')}${cardMetric('Días negativos',String(monthly.filter(r=>r.pnl<0).length),'Sobre cierres realizados')}${cardMetric('Operaciones del mes',String(monthly.reduce((s,r)=>s+r.count,0)),'Origen: MT5')}</div>`+
 `<section class="card"><div class="cardhead"><div class="row"><button class="btn iconbtn small" data-action="month-prev">‹</button><h3 style="min-width:150px;text-align:center;text-transform:capitalize">${new Date(year,month-1,15).toLocaleDateString('es-PE',{month:'long',year:'numeric'})}</h3><button class="btn iconbtn small" data-action="month-next">›</button></div><div class="legend"><span class="green">● Positivo</span><span class="red">● Negativo</span><span class="micro">${escapeHTML(CALENDAR_PRESETS[configuredCalendarPreset()].label)}</span></div></div><div class="calendar">${cal}</div><div class="v101-weekly"><b>Resumen semanal</b>${[...weekly].sort((a,b)=>a[0].localeCompare(b[0])).map(([d,p])=>`<div class="statrow"><span>Semana del ${d}</span><b class="${p>=0?'green':'red'}">${usd(p)}</b></div>`).join('')||'<span class="micro">Sin resultados para este mes.</span>'}</div></section>`+
 `<div class="grid2"><section class="card"><div class="cardhead"><h3>P&L diario</h3><small>Jornadas cerradas</small></div>${dailyPlot(trades.filter(t=>localDay(t.closed_at).startsWith(state.month)),18)}</section><section class="card"><div class="cardhead"><h3>Acumulado</h3><small>Historial visible</small></div>${cumulativeDayChart(trades)}</section></div>`+
 `<section class="card" style="margin-top:14px"><div class="cardhead"><h3>Detalle de jornada · ${escapeHTML(state.selectedDay||'Selecciona un día')}</h3><span class="tag">${selected.length} operaciones</span></div>${tradesTable(selected)}</section><div class="notice">Este calendario es informativo: no verifica límites contractuales de pérdida diaria, reglas de días operados, equity flotante ni pagos de una prop firm. Contrasta siempre con tu panel oficial.</div>`;
}

/* NEO 12: SVG charts are computed locally from CLOSED MT5 positions.
   No demo numbers, no added endpoints and no changes to P&L import logic. */
const neoFmtShort=(value)=>{
 const n=Number(value||0),a=Math.abs(n);
 return (n<0?'−':'')+'$'+(a>=1000000?(a/1000000).toFixed(1)+'M':a>=1000?(a/1000).toFixed(1)+'k':a.toLocaleString('en-US',{maximumFractionDigits:0}));
};
const neoPnl=t=>Number(t.pnl)||0;
function neoPeriodControl(){
 const values=[['1','1 día'],['7','7 días'],['30','30 días'],['90','90 días'],['all','Todo']];
 return `<div class="eg15-period-bar" aria-label="Filtrar resultados de EDGORIA"><div class="neo-period" role="group" aria-label="Rango de resultados"><span class="neo-period-icon" aria-hidden="true">▦</span>${values.map(([v,label])=>`<button class="neo-period-button ${state.period===v?'is-active':''}" type="button" data-action="neo-period" data-period="${v}" aria-pressed="${state.period===v}">${label}</button>`).join('')}</div><label class="eg15-day-selector"><span>Jornada específica</span><input class="field eg14-date" type="date" id="eg14-date" aria-label="Consultar estadísticas de una fecha" value="${escapeHTML(state.period==='date'?state.analysisDate:activeTradingDay())}" /></label>${state.period==='date'?'<span class="eg15-date-active">Fecha seleccionada</span>':''}</div>`;
}

function neoMetric(label,value,caption,kind='neutral',spark=[]){
 let vals=spark.filter(Number.isFinite);if(!vals.length)vals=[0,0];
 const low=Math.min(...vals),high=Math.max(...vals),span=Math.max(.001,high-low);
 const coords=vals.map((v,i)=>[i/(Math.max(1,vals.length-1))*94+3,23-((v-low)/span)*17]);
 const path=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
 return `<div class="neo-metric neo-metric-${kind}"><div class="neo-metric-head"><span class="neo-metric-indicator" aria-hidden="true">${{positive:'↗',negative:'↘',violet:'◈',blue:'◇',neutral:'◇'}[kind]||'◇'}</span><span>${escapeHTML(label)}</span></div><strong class="neo-metric-value mono">${escapeHTML(String(value))}</strong><small>${escapeHTML(caption)}</small><svg class="neo-metric-spark" viewBox="0 0 100 30" aria-hidden="true" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg></div>`;
}
function neoMetricSeries(arr,mode){
 const out=[0];let equity=0,peak=0,acc=0,rTotal=0,rCount=0;
 for(const t of arr){const n=neoPnl(t);equity+=n;peak=Math.max(peak,equity);
  if(mode==='grossWin')acc+=Math.max(0,n);
  else if(mode==='grossLoss')acc+=Math.min(0,n);
  else if(mode==='drawdown')acc=peak-equity;
  else if(mode==='avgR'){if(Number(t.risk)>0){rTotal+=n/Number(t.risk);rCount++}acc=rCount?rTotal/rCount:0;}
  else if(mode==='avgLots'){if(Number(t.volume_lots)>0){rTotal+=Number(t.volume_lots);rCount++}acc=rCount?rTotal/rCount:0;}
  else acc=equity;
  out.push(acc);
 }
 return out;
}
function neoEquityChart(arr){
 const base=eg14AccountsCapital(),rows=realizedCurve(arr,configuredCalendarPreset(),base);
 if(!rows.length)return '<div class="neo-chart-empty">No hay cierres MT5 en este período. El gráfico no inventa movimientos.</div>';
 const values=[base||0,...rows.map(r=>r.capitalEstimate??r.cumulative)],W=840,H=286,L=82,R=30,T=25,B=42;
 let ymin=Math.min(...values),ymax=Math.max(...values);if(ymax===ymin){ymax+=1;ymin-=1}
 const pad=(ymax-ymin)*.13;ymin-=pad;ymax+=pad;
 const xy=values.map((v,i)=>[L+i*(W-L-R)/Math.max(1,values.length-1),T+(ymax-v)/(ymax-ymin)*(H-T-B)]);
 const path=xy.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' '),floor=H-B;
 const axes=Array.from({length:5},(_,i)=>{const v=ymin+(ymax-ymin)*i/4,y=T+(ymax-v)/(ymax-ymin)*(H-T-B);return `<g><line x1="${L}" y1="${y.toFixed(2)}" x2="${W-R}" y2="${y.toFixed(2)}" class="neo-gridline"/><text x="${L-11}" y="${(y+4).toFixed(2)}" text-anchor="end" class="neo-axis-text">${neoFmtShort(v)}</text></g>`}).join('');
 const points=xy.slice(1).map(([x,y],i)=>{
  const r=rows[i],label=`${r.date} · P&L día ${usd(r.pnl)} · P&L acumulado ${usd(r.cumulative)}${r.capitalEstimate===null?'':' · Capital estimado '+usd(r.capitalEstimate)}`;
  return `<g class="eg14-equity-point" tabindex="0" role="img" aria-label="${escapeHTML(label)}" data-day="${r.date}" data-daypnl="${r.pnl}" data-cumulative="${r.cumulative}" data-capital="${r.capitalEstimate===null?'':r.capitalEstimate}"><circle cx="${x}" cy="${y}" r="5" class="eg14-point-dot"/><circle cx="${x}" cy="${y}" r="14" class="eg14-point-hit"/><title>${escapeHTML(label)}</title></g>`;
 }).join('');
 const last=xy.at(-1);
 return `<div class="neo-chart-wrap eg14-equity-host"><svg class="neo-chart neo-equity" viewBox="0 0 ${W} ${H}" role="group" aria-label="Capital estimado por cierres de jornada. Cada punto muestra su importe al pasar el cursor."><defs><linearGradient id="neoEquityArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32e8ea" stop-opacity=".25"/><stop offset="1" stop-color="#32e8ea" stop-opacity="0"/></linearGradient></defs>${axes}<path d="${path} L${last[0]} ${floor} L${L} ${floor} Z" fill="url(#neoEquityArea)"/><path d="${path}" class="neo-equity-path"/>${points}<text x="${L}" y="${H-9}" class="neo-axis-text">${rows[0].date}</text><text x="${W-R}" y="${H-9}" text-anchor="end" class="neo-axis-text">${rows.at(-1).date}</text></svg><div class="eg14-equity-tooltip" role="status" hidden></div><p class="eg14-footnote">Pasa el mouse o usa Tab sobre los puntos. ${base?'Capital estimado = capital nominal de las cuentas + P&L cerrado acumulado. No incluye flotantes, depósitos ni retiros.':'Solo P&L acumulado; configura un capital nominal para estimar el saldo.'}</p></div>`;
}

function neoDrawdownChart(arr){
 const rows=dailyRealizedPnL(arr,configuredCalendarPreset());
 if(!rows.length)return '<div class="neo-chart-empty">Sin operaciones cerradas para calcular el drawdown.</div>';
 let eq=0,top=0;const values=[0];for(const r of rows){eq+=r.pnl;top=Math.max(top,eq);values.push(top-eq)}
 const max=Math.max(1,...values),W=600,H=190,L=62,R=18,T=14,B=30;
 const coords=values.map((v,i)=>[L+i*(W-L-R)/Math.max(1,values.length-1),T+v/max*(H-T-B)]);
 const path=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
 const last=coords.at(-1),axis=[0,.5,1].map(f=>`<g><line x1="${L}" x2="${W-R}" y1="${(T+f*(H-T-B)).toFixed(1)}" y2="${(T+f*(H-T-B)).toFixed(1)}" class="neo-gridline"/><text x="${L-9}" y="${(T+f*(H-T-B)+4).toFixed(1)}" text-anchor="end" class="neo-axis-text">${neoFmtShort(max*f)}</text></g>`).join('');
 return `<div class="neo-chart-wrap"><svg class="neo-chart neo-drawdown" viewBox="0 0 ${W} ${H}" role="img" aria-label="Retroceso realizado desde el máximo acumulado"><title>Drawdown máximo calculado sobre posiciones cerradas: ${usd(max,false)}. No incluye exposición flotante.</title><defs><linearGradient id="neoDdArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fa578e" stop-opacity=".06"/><stop offset="1" stop-color="#fa578e" stop-opacity=".26"/></linearGradient></defs>${axis}<path d="${path} L${last[0]} ${H-B} L${L} ${H-B} Z" fill="url(#neoDdArea)"/><path d="${path}" class="neo-drawdown-path"/><text x="${L}" y="${H-5}" class="neo-axis-text">${rows[0].date}</text><text x="${W-R}" y="${H-5}" text-anchor="end" class="neo-axis-text">${rows.at(-1).date}</text></svg></div>`;
}
function neoGroups(arr,field){
 const groups=new Map();for(const t of arr){const name=String(t[field]||'Sin clasificar').trim()||'Sin clasificar';let v=groups.get(name);if(!v){v={name,pnl:0,count:0};groups.set(name,v)}v.pnl+=neoPnl(t);v.count++}
 return [...groups.values()].sort((a,b)=>Math.abs(b.pnl)-Math.abs(a.pnl));
}
function neoHorizontalBars(entries){
 if(!entries.length)return '<div class="neo-chart-empty">Sin operaciones en este período.</div>';
 const max=Math.max(1,...entries.map(e=>Math.abs(e.pnl)));
 return `<div class="neo-horizontal-bars">${entries.slice(0,6).map(e=>`<div class="neo-hbar" title="${escapeHTML(`${e.name}: ${usd(e.pnl)} · ${e.count} operaciones`)}"><div class="neo-hbar-label">${escapeHTML(e.name)}<small>${e.count} oper.</small></div><div class="neo-hbar-track"><div class="neo-hbar-fill ${e.pnl<0?'neo-neg':''}" style="width:${(Math.abs(e.pnl)/max*100).toFixed(2)}%"></div></div><strong class="mono ${e.pnl<0?'red':'green'}">${usd(e.pnl)}</strong></div>`).join('')}</div>`;
}
function neoSessionPlot(arr){
 const groups=neoGroups(arr,'session');
 const labeled=groups.filter(x=>x.name!=='Sin clasificar'&&x.name!=='Otra'&&x.name!=='—');
 if(!labeled.length)return '<div class="neo-chart-empty">Aún no hay sesiones identificadas en este historial MT5. Los valores no se inventan.</div>';
 return neoVerticalBars(groups.slice(0,6), 'Sesión de trading');
}
function neoVerticalBars(entries,prefix='Período'){
 if(!entries.length)return '<div class="neo-chart-empty">Sin datos en este período.</div>';
 const max=Math.max(1,...entries.map(e=>Math.abs(e.pnl)));
 return `<div class="neo-vbars" role="group" aria-label="${escapeHTML(prefix)}"><div class="neo-vbar-line"></div>${entries.map(e=>{const magnitude=Math.max(2,Math.abs(e.pnl)/max*44);return `<div class="neo-vbar" title="${escapeHTML(`${e.name}: ${usd(e.pnl)} · ${e.count} operaciones`)}"><strong class="neo-vbar-val mono ${e.pnl<0?'red':'green'}">${usd(e.pnl)}</strong><div class="neo-vbar-stage"><div class="neo-vbar-bar ${e.pnl<0?'neo-neg':''}" style="height:${magnitude.toFixed(1)}%"></div></div><span class="neo-vbar-name">${escapeHTML(e.name)}</span></div>`}).join('')}</div>`;
}
function neoWeekPlot(arr){
 const names=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];const entries=names.map(name=>({name,pnl:0,count:0}));
 for(const t of arr){const d=sessionWeekday(t.closed_at,configuredCalendarPreset());if(d===null)continue;entries[d].pnl+=neoPnl(t);entries[d].count++}
 if(!entries.some(e=>e.count))return '<div class="neo-chart-empty">Sin jornadas registradas.</div>';
 return neoVerticalBars(entries,'Resultados netos por día de la semana');
}
function neoMonths(arr){
 const entries=new Map();for(const t of arr){const date=tradingSessionDay(t.closed_at,configuredCalendarPreset());if(!date)continue;const key=date.slice(0,7);let row=entries.get(key);if(!row){row={name:key,pnl:0,count:0};entries.set(key,row)}row.pnl+=neoPnl(t);row.count++}
 return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function neoBridgeShortcut(){return `<section class="neo-bridge-shortcut"><div class="neo-bridge-mark" aria-hidden="true">⌁</div><div class="neo-bridge-copy"><div class="section-label">TU HISTORIAL · UNA SOLA FUENTE</div><h3>MT5 Bridge</h3><p>Gestiona varias cuentas e importa tu historial XLSX/CSV dentro de MT5 Bridge. Sin operaciones ficticias.</p></div><button class="btn primary neo-bridge-button" type="button" data-view="connect">Abrir MT5 Bridge <span aria-hidden="true">↗</span></button></section>`}

function neo13BridgeCTA(){
 return `<section class="neo13-bridge" aria-label="Centro de operaciones MT5"><div class="neo13-bridge-mark" aria-hidden="true">⌁</div><div class="neo13-bridge-copy"><div class="neo13-bridge-eyebrow">IMPORTACIÓN · CONTROL DE CUENTAS</div><h3>MT5 <span>Bridge</span></h3><p>Conecta y administra tus cuentas; importa Excel o CSV y actualiza el journal con tus posiciones cerradas.</p><div class="neo13-bridge-benefits"><span>◇ Historial privado</span><span>◇ Varios MT5</span><span>◇ XLSX / CSV</span></div></div><div class="neo13-bridge-actions"><button class="btn primary" type="button" data-view="connect">↗ &nbsp; Abrir MT5 Bridge</button><button class="btn" type="button" data-action="neo13-import">↓ &nbsp; Importar historial</button></div></section>`;
}
function neo13Panel({eyebrow,title,description,content,extra='',className=''}){
 return `<section class="neo13-panel ${className}"><div class="neo13-panel-header"><div><div class="neo13-overline">${eyebrow}</div><h3>${title}</h3><p>${description}</p></div>${extra}</div>${content}</section>`;
}
function neo13Sessions(arr){
 const groups=neoGroups(arr,'session').filter(x=>x.name!=='Sin clasificar'&&x.name!=='Otra'&&x.name!=='—');
 if(groups.length)return {title:'Rendimiento por sesión',description:'Resultado neto de sesiones identificadas.',markup:neoVerticalBars(groups.slice(0,5),'Sesiones de trading')};
 const directions=new Map();for(const t of arr){const dir=String(t.direction||'').toUpperCase();if(!['BUY','SELL'].includes(dir))continue;let v=directions.get(dir);if(!v){v={name:dir,pnl:0,count:0};directions.set(dir,v)}v.pnl+=neoPnl(t);v.count++}
 if(directions.size)return {title:'Rendimiento por dirección',description:'Tus archivos no incluyen sesiones. Mostramos BUY y SELL reales.',markup:neoVerticalBars([...directions.values()],'Dirección de las operaciones')};
 return {title:'Rendimiento por sesión',description:'Solo cuando MT5 registra una sesión identificable.',markup:'<div class="neo-chart-empty">Aún no hay información de sesiones en estas operaciones.</div>'};
}
function analytics(){
 const arr=visibleTrades(),s=stats(arr),knownRisk=arr.filter(t=>Number(t.risk)>0).length;
 const classified=neoGroups(arr,'strategy');const strategyTagged=classified.some(e=>e.name!=='Sin clasificar'&&e.name!=='—');
 const strategyData=strategyTagged?classified:neoGroups(arr,'symbol');
 const strategyTitle=strategyTagged?'Rendimiento por estrategia':'Rendimiento por activo';
 const strategyInfo=strategyTagged?'P&L neto de tus estrategias registradas.':'Clasificación real por símbolo MT5.';
 const months=neoMonths(arr),session=neo13Sessions(arr),base=eg14AccountsCapital(),summary=periodSummary(arr,configuredCalendarPreset(),base);
 const best=summary.best,worst=summary.worst,dd=summary.drawdownDayMax,lotage=summary.lots;
 return `<div class="neo-analytics neo13-analytics eg15-analytics eg42-analytics" data-release="4.2">
 <header class="neo13-heading"><div class="neo13-heading-copy"><div class="neo13-kicker"><span class="neo-live-dot"></span> PATTERN DISCOVERY <span class="neo13-build">NOVA 4.2</span></div><h1>Analytics <em>sin ruido</em></h1><p>Profundiza en tus jornadas, identifica patrones y documenta decisiones con datos registrados.</p></div>${neoPeriodControl()}</header>
 <div class="neo13-meta"><span class="neo13-meta-pill"><i></i> ${arr.length} operaciones cerradas</span><span>P&L del período <b class="${s.total<0?'red':'green'}">${usd(s.total)}</b> · <b>${eg14Percent(s.total,base)}</b></span><span class="neo13-meta-rule">${escapeHTML(CALENDAR_PRESETS[configuredCalendarPreset()].label)}</span>${(state.data.accounts||[]).some(a=>a.account_type==='funded'&&(state.account==='all'||String(state.account)===String(a.id)))?'<a class="eg181-payout-shortcut" href="#funded-withdrawals">Ver retiros funded ↓</a>':''}</div>
 ${eg16RecordsPanel()}
 <details class="eg42-analytics-risk"><summary>Ver diagnóstico de límites y drawdown <span>↗</span></summary>${eg15RiskPanel(true)}</details>
 <div class="neo-metric-grid neo13-kpis">
 ${neoMetric('Gross profit',usd(s.grossWin),`${s.win} operaciones positivas · ${eg14Percent(s.grossWin,base)} nominal`,'positive',neoMetricSeries(arr,'grossWin'))}
 ${neoMetric('Gross loss',usd(-s.grossLoss),`${s.loss} operaciones negativas · ${eg14Percent(-s.grossLoss,base)} nominal`,'negative',neoMetricSeries(arr,'grossLoss'))}
 ${neoMetric('Max. drawdown',usd(-s.maxDd,false),`${eg14Percent(-s.maxDd,base)} nominal · solo cierres`,'violet',neoMetricSeries(arr,'drawdown'))}
 ${neoMetric('Lotaje promedio MT5',lotage.average===null?'N/D':lotage.average.toFixed(2)+' lotes',lotage.count?`${lotage.count} cierres con volumen`:'Histórico aún sin lotaje','blue',lotage.count?neoMetricSeries(arr,'avgLots'):[])}
 </div>
 <div class="eg42-analytics-context"><span>▦ <strong>${arr.length}</strong> cierres analizados</span><span>Resultado neto <strong class="${s.total<0?'red':'green'}">${usd(s.total)}</strong></span><span>R-multiple promedio <strong>${s.avgR==null?'N/D':s.avgR.toFixed(2)+' R'}</strong></span><small>El promedio R solo incluye cierres con riesgo inicial registrado (${knownRisk}).</small></div>
 <div class="neo13-primary-row">
 ${neo13Panel({eyebrow:'EVOLUCIÓN DE CAPITAL',title:'Curva de capital estimada',description:'Coloca el mouse sobre un punto para ver P&L diario y saldo estimado.',extra:`<div class="neo13-panel-total ${s.total>=0?'green':'red'}">${usd(s.total)}<small>NET P&L</small></div>`,content:neoEquityChart(arr),className:'neo13-equity'})}
 ${neo13Panel({eyebrow:'ANÁLISIS DE MERCADO',title:session.title,description:session.description,extra:'<span class="neo13-unit">USD · Neto</span>',content:session.markup,className:'neo13-session'})}
 </div>
 <div class="neo13-secondary-row">
 ${neo13Panel({eyebrow:'DISTRIBUCIÓN',title:strategyTitle,description:strategyInfo,extra:'<span class="neo13-unit">USD · Neto</span>',content:neoHorizontalBars(strategyData),className:'neo13-strategy'})}
 ${neo13Panel({eyebrow:'PATRONES HISTÓRICOS',title:'P&L por día de la semana',description:'Resultado total por jornada definida.',extra:'<span class="neo13-unit">USD · Neto</span>',content:neoWeekPlot(arr),className:'neo13-weekday'})}
 ${neo13Panel({eyebrow:'VISIÓN MENSUAL',title:'P&L mensual',description:'Resultados de los meses con operaciones.',extra:'<span class="neo13-unit">USD · Neto</span>',content:months.length?neoVerticalBars(months.slice(-7),'Resultado mensual'):'<div class="neo-chart-empty">Aún no hay meses con operaciones cerradas.</div>',className:'neo13-monthly'})}
 </div>
 ${eg16FundedPayouts()}
 ${neo13BridgeCTA()}
 <div class="neo13-disclaimer">Los porcentajes usan el capital nominal de las cuentas seleccionadas, no una tasa de retorno real. El lotaje solo está disponible para importaciones que lo conserven. Los gráficos se calculan con operaciones cerradas de tus cuentas MT5. El drawdown mostrado es realizado, no incluye pérdidas flotantes ni sustituye los límites oficiales de una prop firm. Los valores N/D indican información insuficiente.</div>
 </div>`;
}

function mindset(){
 const entries=(state.data.journal_entries||[]).slice().sort((a,b)=>String(b.entry_date).localeCompare(String(a.entry_date)));
 const withMedia=(state.data.edgoria_journal_attachments||[]).length;
 const thisMonth=entries.filter(e=>String(e.entry_date).slice(0,7)===today().slice(0,7)).length;
 const recent=entries.slice(0,16);
 const entryMarkup=recent.map(n=>`<article class="eg42-entry"><div class="eg42-entry-top"><div><span class="eg42-entry-date">${escapeHTML(n.entry_date)}</span><strong>${escapeHTML(n.mood||'Reflexión')}</strong></div><span class="eg42-entry-chip ${n.discipline?'good':'neutral'}">${n.discipline?'Plan respetado':'Plan por revisar'}</span></div><p class="eg42-entry-note">${escapeHTML(n.note)}</p><div class="eg31-screenshots">${(state.data.edgoria_journal_attachments||[]).filter(a=>a.entry_id===n.id).map(a=>`<button type="button" class="eg31-image-btn" data-action="open-journal-photo" data-id="${escapeHTML(a.id)}" title="Abrir captura privada"><img alt="Captura privada de la sesión" loading="lazy" data-photo-path="${escapeHTML(a.storage_path)}"><span>Ver imagen ↗</span></button>`).join('')}</div><div class="eg42-entry-foot"><span>Reflexión privada</span><button type="button" class="eg42-text-danger" data-action="delete-note" data-id="${escapeHTML(n.id)}">Eliminar</button></div></article>`).join('');
 return `<div class="eg42-journal"><header class="eg42-journal-header"><div><div class="eg42-eyebrow">EDGORIA / SMART JOURNAL</div><h1>Documenta el proceso. <em>Descubre el patrón.</em></h1><p>Tu espacio para reflexionar sobre tus decisiones y adjuntar capturas de la sesión. Solo tú puedes acceder.</p></div><span class="eg42-private-mark">◈ PRIVADO</span></header>
 <div class="eg42-journal-stats"><div><span>Reflexiones guardadas</span><strong>${entries.length}</strong></div><div><span>Este mes</span><strong>${thisMonth}</strong></div><div><span>Capturas vinculadas</span><strong>${withMedia}</strong></div></div>
 <div class="eg42-journal-grid"><section class="eg42-journal-panel eg42-write"><div class="eg42-panel-top"><div><div class="eg42-eyebrow">REVISIÓN DE JORNADA</div><h2>Tu próxima reflexión</h2></div><span>01 / 02</span></div><form id="mindset-form" class="formstack"><div class="eg42-form-row"><label class="control">Fecha<input class="field" type="date" name="entry_date" value="${today()}" required/></label><label class="control">¿Cómo te sentiste?<select class="field" name="mood"><option>Concentrado</option><option>Tranquilo</option><option>Impulsivo</option><option>Ansioso</option><option>Cansado</option><option>Motivado</option></select></label></div>
 <div class="eg42-guidance"><b>Para empezar, responde estas tres preguntas:</b><ol><li>¿Qué decisión respetó tu plan?</li><li>¿Qué harías diferente?</li><li>¿Qué aprendizaje quieres recordar?</li></ol></div>
 <label class="control">Tu revisión de hoy<textarea class="field eg42-journal-textarea" name="note" required maxlength="2500" placeholder="Escribe lo que observaste, sin juicios ni promesas de resultados..."></textarea></label>
 <button class="eg42-template-button" data-action="journal-template" type="button">✦ Insertar plantilla de revisión guiada</button>
 <label class="control eg31-attach">Capturas de sesión (opcional)<input class="field" type="file" name="screenshots" accept="image/png,image/jpeg,image/webp" multiple aria-describedby="eg31-media-help"/><span class="micro" id="eg31-media-help">Máximo 3 imágenes JPG, PNG o WebP · 3 MB por imagen · privadas</span><small id="eg42-file-status" class="eg42-file-status" aria-live="polite">Ninguna imagen seleccionada</small></label>
 <label class="checkitem"><input type="checkbox" name="discipline" checked/> Seguí mis reglas previamente definidas</label><button class="btn primary eg42-save" type="submit">Guardar reflexión y capturas <span>↗</span></button></form></section>
 <section class="eg42-journal-panel eg42-history"><div class="eg42-panel-top"><div><div class="eg42-eyebrow">HISTORIAL PERSONAL</div><h2>Tu memoria de decisiones</h2></div><span>${entries.length} entradas</span></div>${entryMarkup||'<div class="eg42-noentries"><span>◇</span><strong>Tu primera revisión comienza aquí</strong><p>Documentar tus decisiones te permitirá consultar qué aprendiste en distintas jornadas.</p></div>'}${entries.length>16?`<p class="micro">Se muestran las últimas 16 reflexiones. Tus entradas anteriores permanecen guardadas.</p>`:''}</section></div>
 <p class="eg42-journal-footnote">Las reflexiones describen percepciones personales; no demuestran causalidad entre emociones y resultados. Las capturas se almacenan de forma privada.</p></div>`;
}
function replay(){return pageTitle('STUDY LAB','Replay Studio','Módulo reservado para una futura versión de EDGORIA.')+`<section class="card empty" style="padding:60px 24px"><span class="tag amber">PRÓXIMAMENTE</span><h2 style="margin:18px 0 10px">Replay Studio está en desarrollo</h2><p>Por ahora priorizamos la precisión del historial MT5 y las estadísticas del diario. No hace falta cargar velas ni utilizar archivos OHLC.</p><button class="btn primary" data-view="connect" style="margin-top:18px">Ir a MT5 Bridge</button></section>`}
function settings(){return pageTitle('WORKSPACE SETTINGS','Configuración','Administra tu espacio personal y la portabilidad de tus datos.')+`<div class="gridhalf"><div class="card"><h3>Protección de datos</h3><div class="statrow"><span>Entorno activo</span><b class="green">Nube privada</b></div><div class="statrow"><span>Autenticación</span><b>Supabase Auth</b></div><div class="statrow"><span>Acceso a registros</span><b>PostgreSQL + RLS</b></div><div class="statrow"><span>Conexiones MT5</span><b>${state.data.edgoria_mt5_connections.filter(x=>x.status==='active').length}</b></div><div class="notice">Cada operación y nota pertenece a su usuario. La aplicación solo registra información; no ejecuta operaciones.</div></div><div class="card"><h3>Exportar mis datos</h3><p class="hint" style="font-size:12px;margin-top:14px">Descarga las operaciones verificadas mediante MT5. Las antiguas entradas manuales permanecen preservadas en la base de datos, pero no intervienen en las métricas.</p><button class="btn primary" data-action="export-csv">↓ Exportar operaciones</button><div class="statrow" style="margin-top:18px"><span>Operaciones</span><b>${state.data.trades.length}</b></div><div class="statrow"><span>Cuentas</span><b>${state.data.accounts.length}</b></div><div class="statrow"><span>Reflexiones</span><b>${state.data.journal_entries.length}</b></div></div></div>`}

async function apiPost(route,body={}){
 if(!sb||!state.user)throw Error('Inicia sesión');
 const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('La sesión expiró');
 const resp=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
 const data=await resp.json().catch(()=>({}));if(!resp.ok)throw Error((data.error||'Error del servidor')+' ('+(data.code||resp.status)+')');return data;
}
async function apiGet(route){
 if(!sb||!state.user)throw Error('Inicia sesión');const {data:{session}}=await sb.auth.getSession();
 if(!session?.access_token)throw Error('Sesión expirada');
 const response=await fetch('/api/'+route,{headers:{Authorization:'Bearer '+session.access_token}});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error((data.error||'Error de diagnóstico')+' ('+(data.code||response.status)+')');return data;
}
async function checkAdmin(){
 state.isAdmin=false;state.adminData=null;state.accessAdmin=null;state.adminIssues=[];
 if(state.role!=='admin')return;
 // The commercial dashboard may fail independently; NEVER let that hide
 // identity approvals, email verification or registered users.
 const results=await Promise.allSettled([
   fetchAccessAdmin(),
   fetchAdminRoles(),
   apiGet('admin')
 ]);
 const names=['Gestión de usuarios','Roles de usuario','Panel comercial'];
 for(let i=0;i<results.length;i++){
   const r=results[i];
   if(r.status==='fulfilled'){
     state.isAdmin=true;
     if(i===2)state.adminData=r.value;
   }else{
     state.adminIssues.push(names[i]+': '+String(r.reason?.message||'no disponible').slice(0,135));
     console.warn('EDGORIA admin module unavailable:',names[i],r.reason?.code||r.reason?.message||'UNKNOWN');
   }
 }
 if(!state.adminData)state.adminData={affiliates:[],commissions:[],subscriptions:[]};
}
async function fetchAccessAdmin(){
  if(state.role!=='admin')return;
  state.accessAdmin=await apiGet('v4-access-management');
}
async function accessAction(action,user_id){
  if(!state.isAdmin)throw Error('Acceso administrativo no validado');
  const msg={'activate':'¿Activar acceso a EDGORIA para esta cuenta?','suspend':'¿Suspender el acceso de esta cuenta?','grant-month':'¿Conceder un mes calendario de prueba gratuita sin cobrar?','revoke-trial':'¿Quitar la prueba gratuita concedida por el administrador?'}[action];
  if(!msg||!confirm(msg))return;
  await apiPost('v4-access-management',{action,user_id});
  await fetchAccessAdmin();update();notify('Permisos actualizados');
}
async function adminAction(action,id,confirmation){
 await apiPost('admin',{action,id,confirmation});await checkAdmin();update();notify('Acción administrativa registrada');
}
function eg31PendingQueue(){
 const all=state.accessAdmin?.users||[],pending=all.filter(u=>u.access_status==='pending');
 return `<section class="card eg31-approval"><div class="cardhead"><div><div class="section-label">NUEVAS SOLICITUDES</div><h3>Pendientes de aprobación <span class="eg31-count">${pending.length}</span></h3></div><button type="button" class="btn small" data-action="reload-access">↻ Actualizar</button></div>
 ${pending.length?pending.slice(0,8).map(u=>`<div class="eg31-person"><span class="eg31-avatar">${escapeHTML((u.full_name||'U')[0]).toUpperCase()}</span><div class="eg31-person-info"><strong>${escapeHTML(u.full_name||'Usuario')}</strong><span>${escapeHTML(u.email||'Correo no disponible')}</span></div><span class="eg31-verified ${u.email_confirmed?'ok':''}">${u.email_confirmed?'✓ Verificado':'◷ Sin verificar'}</span>${u.email_confirmed?`<button type="button" class="btn small primary" data-action="access-activate" data-id="${escapeHTML(u.user_id)}">Activar</button>`:'<span class="micro">Esperar correo</span>'}</div>`).join(''):'<div class="eg31-empty">✓ No hay solicitudes pendientes.</div>'}
 <button class="btn small eg31-users-open" data-view="roles">Ver todos los usuarios y correos →</button></section>`;
}
function eg311UsersOverview(){
 const users=state.accessAdmin?.users||[];
 return `<section class="card eg311-users-overview"><div class="cardhead"><div><div class="section-label">REGISTROS Y ESTADOS</div><h3>Últimos usuarios registrados</h3></div><button type="button" class="btn small" data-view="roles">Gestionar todos ↗</button></div>
 ${users.length?`<div class="eg311-user-grid">${users.slice(0,6).map(u=>`<div class="eg311-user-row"><div class="eg31-avatar">${escapeHTML((u.full_name||'U')[0]).toUpperCase()}</div><div class="eg311-user-identity"><strong>${escapeHTML(u.full_name||'Nombre pendiente')}</strong><small>${escapeHTML(u.email||'Correo pendiente')}</small></div><span class="eg311-user-state ${u.access_status==='active'?'on':u.access_status==='pending'?'wait':'off'}">${u.access_status==='active'?'Activo':u.access_status==='pending'?'Pendiente':'Suspendido'}</span></div>`).join('')}</div>`:'<p class="micro">No se pudieron cargar registros todavía. Revisa el estado de las APIs o usa Actualizar.</p>'}</section>`;
}
function admin312UserBadge(status){
 const text=status==='active'?'Activo':status==='pending'?'Pendiente':'Suspendido';
 return `<span class="eg312-status ${status==='active'?'is-active':status==='pending'?'is-pending':'is-suspended'}"><i></i>${text}</span>`;
}
function admin312UserCard(u){
 const id=escapeHTML(u.user_id),full=escapeHTML(u.full_name||'Usuario sin nombre'),mail=escapeHTML(u.email||'Correo no disponible');
 const self=u.user_id===state.user?.id,restricted=self||u.role==='admin';
 const certified=!!u.email_confirmed;
 const btn=restricted?'<span class="eg312-protected">Cuenta protegida</span>':(u.access_status==='active'?`<button type="button" class="btn small danger" data-action="access-suspend" data-id="${id}">Suspender acceso</button>`:`<button type="button" class="btn small primary" data-action="access-activate" data-id="${id}" ${certified?'':'disabled title="Primero debe confirmar el correo"'}>Activar acceso</button>`);
 const when=String(u.created_at||'');let date='Fecha no disponible';try{if(when)date=new Date(when).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'})}catch{}
 return `<article class="eg312-user-card" data-eg312-user="${id}"><div class="eg312-user-avatar" aria-hidden="true">${escapeHTML(String(u.full_name||'U').trim().charAt(0).toUpperCase()||'U')}</div><div class="eg312-user-copy"><div class="eg312-user-name">${full}</div><a href="mailto:${mail}" class="eg312-user-mail">${mail}</a><div class="eg312-user-meta"><span>${escapeHTML(u.country||'Sin país')}</span><span>Registrado ${escapeHTML(date)}</span><span>${escapeHTML(u.role||'trader')}</span></div></div><div class="eg312-user-approval">${admin312UserBadge(u.access_status)}<span class="eg312-email-status ${certified?'confirmed':''}">${certified?'✓ Correo confirmado':'Correo sin verificar'}</span></div><div class="eg312-user-actions">${btn}${!restricted&&u.access_status==='active'?`<button type="button" class="btn small" data-action="access-grant-month" data-id="${id}">+ 1 mes</button>`:''}</div></article>`;
}
function admin312List(){
 const d=state.accessAdmin;
 if(!d)return `<div class="eg312-empty-error" role="alert"><b>No pudimos cargar las cuentas.</b><p>El centro de usuarios necesita que la API de aprobación funcione. Revisa los despliegues y los registros de Vercel; los perfiles existentes no se han borrado.</p><button class="btn primary" data-action="reload-access">Reintentar conexión</button></div>`;
 const all=d.users||[],q=String(state.adminUserQuery||'').trim().toLocaleLowerCase('es'),f=state.adminUserFilter||'all';
 const visible=all.filter(u=>(f==='all'||u.access_status===f)&&(!q||[u.full_name,u.email,u.country,u.role].some(v=>String(v||'').toLocaleLowerCase('es').includes(q))));
 const filters=[['all','Todos',all.length],['pending','Pendientes',all.filter(u=>u.access_status==='pending').length],['active','Activos',all.filter(u=>u.access_status==='active').length],['suspended','Suspendidos',all.filter(u=>u.access_status==='suspended').length]];
 return `<div class="eg312-toolbar"><div class="eg312-filters" role="group" aria-label="Estado del usuario">${filters.map(([key,label,count])=>`<button type="button" class="eg312-filter ${f===key?'selected':''}" aria-pressed="${f===key}" data-action="admin-filter" data-filter="${key}">${label}<span>${count}</span></button>`).join('')}</div><label class="eg312-search"><span>⌕</span><input id="admin-users-search" aria-label="Buscar usuario por nombre o correo" autocomplete="off" type="search" maxlength="120" placeholder="Buscar nombre o correo…" value="${escapeHTML(state.adminUserQuery||'')}"/></label></div>
 <div class="eg312-users-list" aria-live="polite">${visible.length?visible.map(admin312UserCard).join(''):`<div class="eg312-empty"><b>No hay usuarios para mostrar</b><p>Cambia el filtro o elimina la búsqueda.</p></div>`}</div><div class="eg312-result-count">${visible.length} de ${all.length} registros mostrados. El administrador puede consultar nombres y correos; nunca contraseñas.</div>`;
}
function adminView(){
 if(state.role!=='admin')return pageTitle('SIN ACCESO','Área administrativa restringida','Solo los administradores pueden consultar registros.');
 const d=state.adminData||{affiliates:[],commissions:[],subscriptions:[]},a=state.accessAdmin,t=a?.totals||{};
 const issues=state.adminIssues||[];
 const msg=issues.length?`<div class="eg312-inline-alert" role="status"><span>⚠</span><div>Algunos módulos aún no responden: ${escapeHTML(issues.join(' · '))}. <button type="button" class="link" data-action="retry-admin">Reintentar</button></div></div>`:'';
 return `<div class="eg312-admin" data-eg312-admin="true"><section class="eg312-admin-hero"><div class="eg312-hero-copy"><span class="eg312-release-pill"><i></i> EDGORIA · ADMIN CENTER 3.1.2</span><h1>Personas primero.<br><em>Control total del acceso.</em></h1><p>Gestiona quién puede entrar a EDGORIA. La confirmación del correo y tu aprobación son pasos independientes.</p><div class="eg312-hero-actions"><button class="btn primary" type="button" data-action="reload-access">↻ Actualizar solicitudes</button><span class="eg312-hero-foot">Solo tú puedes activar cuentas nuevas</span></div></div><div class="eg312-hero-mark" aria-hidden="true">◎<span>ED</span></div></section>
 ${msg}<section class="eg312-metrics" aria-label="Resumen de accesos"><article class="eg312-metric eg312-pending-metric"><span>Por aprobar</span><strong>${a?Number(t.pending||0):'—'}</strong><small>Esperando tu autorización</small></article><article class="eg312-metric"><span>Accesos activos</span><strong>${a?Number(t.active||0):'—'}</strong><small>Autorizados en el sistema</small></article><article class="eg312-metric"><span>Registros totales</span><strong>${a?Number(t.registered||0):'—'}</strong><small>Nombre y correo guardados</small></article><article class="eg312-metric"><span>Por verificar</span><strong>${a?Number(t.unconfirmed||0):'—'}</strong><small>Sin confirmar su email</small></article></section>
 <section class="eg312-admin-panel" id="eg312-users"><div class="eg312-panel-top"><div><span class="eg312-eyebrow">CONTROL DE USUARIOS</span><h2>Solicitudes y accesos</h2><p>Aprueba solo los correos confirmados. Puedes consultar todos los usuarios en esta misma pantalla.</p></div><button type="button" class="btn" data-action="reload-access">Actualizar lista</button></div>${admin312List()}</section>
 <section class="eg312-lower"><article class="eg312-info-tile"><span class="eg312-info-icon">01</span><div><h3>Confirmación por correo</h3><p>Supabase envía la confirmación. Personaliza el mensaje desde su plantilla <strong>Confirm signup</strong>; confirmar no concede acceso.</p></div></article><article class="eg312-info-tile"><span class="eg312-info-icon">02</span><div><h3>Acceso bajo tu control</h3><p>Solo los usuarios que apruebes pueden abrir su dashboard. Al suspenderlos, se bloquea también la consulta de los datos protegidos.</p></div></article><article class="eg312-info-tile"><span class="eg312-info-icon">03</span><div><h3>Espacios privados</h3><p>Las imágenes del journal y los historiales MT5 se almacenan con permisos individuales.</p></div></article></section>
 <details class="eg312-extras"><summary>Gestión secundaria <span>Partners, suscripciones y mi espacio privado</span></summary><div class="eg312-extra-content"><div><h3>Otras herramientas</h3><p class="micro">Esta información se mantiene disponible sin ocupar la vista principal.</p><div class="row wrap"><button type="button" class="btn" data-view="roles">Gestionar roles y partners</button><button type="button" class="btn" data-view="mindset">Mi journal emocional</button><button type="button" class="btn" data-view="dashboard">Mi dashboard</button></div></div><div class="eg312-extra-stats"><span>Afiliados: ${Number(d.affiliates.length)}</span><span>Suscripciones: ${Number(d.subscriptions.length)}</span><span>Comisiones: ${Number(d.commissions.length)}</span></div></div></details>
 <div class="eg312-admin-disclaimer">© EDGORIA 3.1.2 · No se muestran contraseñas, tokens de acceso ni información financiera privada de otros usuarios.</div></div>`;
}
async function tryClaimReferral(){
 try{let raw=localStorage.getItem('edgoria_ref');if(!raw)return;const data=JSON.parse(raw);
 if(Date.now()-data.seen>30*86400000){localStorage.removeItem('edgoria_ref');return;}
 await apiPost('affiliate-claim',{code:data.code});localStorage.removeItem('edgoria_ref');
 }catch(e){console.debug('EDGORIA: atribución no completada',e.message)}
}
function riskGuard(){
 const rules=state.data.edgoria_risk_rules;
 const accounts=state.data.accounts;
 const rows=accounts.map(a=>{
 const r=rules.find(x=>x.account_id===a.id),closed=state.data.trades.filter(t=>t.account_id===a.id&&localDay(t.closed_at)===activeTradingDay());
 const dayPnL=closed.reduce((sum,t)=>sum+Number(t.pnl),0);
 const dayRisk=r?.daily_loss_pct?Number(a.account_size)*Number(r.daily_loss_pct)/100:Number(a.daily_loss_limit||0);
 return `<div class="statrow"><span><b>${escapeHTML(a.name)}</b><small class="micro"> · ${closed.length} cierres hoy · P&L ${usd(dayPnL)}</small></span><span class="tag ${dayRisk&&-dayPnL>=dayRisk?'negative':'amber'}">${dayRisk?'Límite declarado: '+usd(dayRisk,false):'Configurar límites'}</span></div>`
 }).join('');
 return pageTitle('RISK ENGINE','Risk Guard','Límites personales y alertas basadas en operaciones CERRADAS.')+`<div class="grid2"><section class="card"><div class="cardhead"><h3>Reglas por cuenta</h3><span class="tag amber">SIN DATOS FLOTANTES</span></div><form id="risk-form" class="formstack"><label class="control">Cuenta<select class="field" name="account_id" required>${accounts.map(a=>`<option value="${escapeHTML(a.id)}" ${state.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></label><div class="formgrid"><label class="control">Riesgo máximo por trade (%)<input class="field" name="max_risk_per_trade_pct" type="number" min="0" max="100" step="0.01" placeholder="1.00"/></label><label class="control">Riesgo por idea (%)<input class="field" name="max_risk_per_idea_pct" type="number" min="0" max="100" step="0.01" placeholder="2.00"/></label><label class="control">Pérdida diaria (%)<input class="field" name="daily_loss_pct" type="number" min="0" max="100" step="0.01" placeholder="3.00"/></label><label class="control">Drawdown (%)<input class="field" name="max_drawdown_pct" type="number" min="0" max="100" step="0.01" placeholder="6.00"/></label><label class="control">Máx. operaciones / día<input class="field" type="number" name="daily_trade_limit" min="1" max="500" placeholder="5"/></label><label class="control">Pausa entre operaciones (min)<input class="field" type="number" name="cooldown_minutes" min="0" max="1440" value="0"/></label></div><button class="btn primary" type="submit" ${!accounts.length?'disabled':''}>Guardar reglas</button></form><div class="micro">El journal no valida reglas oficiales de una prop firm ni observa pérdidas flotantes. Introduce las condiciones contractuales correctas.</div></section><section class="card"><h3>Monitoreo de cierre diario</h3>${rows||'<div class="empty">Crea primero una cuenta.</div>'}<div class="notice" style="margin-top:18px">Riesgo calculado sobre operaciones registradas, no sobre órdenes abiertas. No sustituye los límites de MT5.</div></section></div>`;
}
function computeScore(){
 const trades=visibleTrades(false),entries=state.data.journal_entries;
 const documented=trades.filter(x=>String(x.notes||'').trim()&&!String(x.notes).startsWith('Sincronizado desde')).length;
 const riskTrades=trades.filter(t=>Number(t.risk)>0&&state.data.accounts.some(a=>a.id===t.account_id&&Number(a.account_size)>0));
 const compliant=riskTrades.filter(t=>{const account=state.data.accounts.find(a=>a.id===t.account_id),rule=state.data.edgoria_risk_rules.find(r=>r.account_id===account.id);return rule?.max_risk_per_trade_pct!=null&&Number(t.risk)/Number(account.account_size)*100<=Number(rule.max_risk_per_trade_pct)});
 const withRule=riskTrades.filter(t=>state.data.edgoria_risk_rules.some(r=>r.account_id===t.account_id&&r.max_risk_per_trade_pct!=null));
 const discipline=entries.filter(x=>x.discipline).length;
 const parts=[{key:'Registro de decisiones',weight:30,value:trades.length?documented/trades.length:null,detail:`${documented}/${trades.length} documentadas`},{key:'Cumplimiento del riesgo',weight:40,value:withRule.length?compliant.length/withRule.length:null,detail:`${compliant.length}/${withRule.length} con regla y riesgo declarado`},{key:'Disciplina declarada',weight:30,value:entries.length?discipline/entries.length:null,detail:`${discipline}/${entries.length} reflexiones`}];
 const valid=parts.filter(p=>p.value!==null);return {parts,coverage:valid.reduce((s,p)=>s+p.weight,0),score:valid.length?Math.round(valid.reduce((s,p)=>s+p.weight*p.value,0)/valid.reduce((s,p)=>s+p.weight,0)*100):null};
}
function scoreView(){
 const x=computeScore();
 return pageTitle('BEHAVIOR INTELLIGENCE','EDGORIA Score','Disciplina medible, independiente de las ganancias.')+`<div class="grid2"><section class="card"><div class="section-label">ÍNDICE DE PROCESO · V1</div><div class="score-hero">${x.score===null?'—':x.score}<span>/ 100</span></div><p class="hint">${x.score===null?'Añade operaciones, reglas y reflexiones para calcular un resultado.':`Cobertura de criterios: ${x.coverage}%. No se supone cumplimiento cuando faltan registros.`}</p><div class="notice">Este indicador NO predice beneficios ni evalúa tu capacidad financiera. Es descriptivo y depende de información declarada por el usuario.</div></section><section class="card"><h3>Cómo se calcula</h3>${x.parts.map(p=>`<div class="score-row"><div class="row spread"><b>${escapeHTML(p.key)}</b><span>${p.value===null?'Sin información':Math.round(p.value*100)+'%'}</span></div><div class="progress"><span style="width:${p.value===null?0:Math.round(p.value*100)}%"></span></div><p class="micro">Ponderación ${p.weight}% · ${escapeHTML(p.detail)}</p></div>`).join('')}</section></div>`;
}
function intelligence(){
 const t=visibleTrades(false),s=stats(t),by={};
 for(const trade of t){const key=trade.symbol;by[key]??={count:0,pnl:0};by[key].count++;by[key].pnl+=Number(trade.pnl)}
 const largest=Object.entries(by).sort((a,b)=>b[1].count-a[1].count)[0];
 return pageTitle('EDGORIA INTELLIGENCE','Revisión inteligente','Patrones verificables del historial. Sin señales de inversión.')+`<div class="grid2"><section class="card"><div class="cardhead"><h3>Resumen del historial</h3><span class="tag positive">ANÁLISIS LOCAL</span></div><div class="statrow"><span>Operaciones registradas</span><b>${t.length}</b></div><div class="statrow"><span>Activos distintos</span><b>${Object.keys(by).length}</b></div><div class="statrow"><span>Activo más operado</span><b>${largest?escapeHTML(largest[0]):'—'}</b></div><div class="statrow"><span>Reflexiones emocionales</span><b>${state.data.journal_entries.length}</b></div><p class="hint">Las observaciones proceden de tus propios registros y no de un modelo de IA externo.</p></section><section class="card"><h3>Antes de analizar con IA</h3><p class="hint">La futura IA Review interpretará datos históricos de forma explicable y con límite de uso por cuenta. No está conectada a un modelo externo en esta versión.</p><div class="notice">La estadística actual no demuestra causalidad entre emociones y resultados. No utilices un patrón aislado como señal de compra o venta.</div></section></div>`;
}
function membership(){
 const sub=state.data.edgoria_subscriptions.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
 const label={active:'Activa',trialing:'Prueba activa',past_due:'Pago pendiente',paused:'Pausada',canceled:'Cancelada',expired:'Expirada',incomplete:'Pendiente'};const courtesy=state.access?.trial_ends_at&&Date.parse(state.access.trial_ends_at)>Date.now();
 return pageTitle('BILLING CENTER','Tu membresía','Herramientas gratuitas del diario y opción de membresía; las cortesías administrativas no generan cargos.')+`<div class="card v101-free-card"><div class="section-label">EDGORIA / FREE JOURNAL</div><h3>Plan gratuito · US$0</h3><p>Incluye importación manual del historial MT5, gráfico diario, calendario de resultados, visualización de operaciones y filtros por cuenta. Las funciones disponibles se apoyan en datos que tú mismo importas.</p><div class="micro">Los límites comerciales y bloqueos automáticos de acceso aún requieren verificación del backend de pagos. Una prueba de un mes otorgada por el administrador es una cortesía distinta del plan gratuito.</div></div><div class="grid2"><section class="card"><div class="section-label">EDGORIA / ALL ACCESS</div><div class="price-hero">US$14.90 <small>/ mes</small></div><p class="hint">Analytics, Risk Guard, Mindset, EDGORIA Score, herramientas de importación y conexión MT5, con política de uso razonable.</p><div class="statrow"><span>Estado</span><b>${courtesy?'Prueba gratis autorizada por administrador':escapeHTML(label[sub?.status]||'Sin suscripción')}</b></div><div class="statrow"><span>Período vigente</span><b>${escapeHTML(sub?.current_period_ends_at?new Date(sub.current_period_ends_at).toLocaleDateString('es-PE'):'—')}</b></div><div class="notice">${courtesy?`Acceso de prueba gratuito hasta ${escapeHTML(new Date(state.access.trial_ends_at).toLocaleDateString('es-PE'))}. No se han creado cargos automáticos.`:'La prueba del proveedor de pagos y las cortesías administrativas se gestionan por separado.'}</div><button class="btn primary" style="margin-top:18px" data-action="start-checkout" ${courtesy||['active','trialing'].includes(sub?.status)?'disabled':''}>${courtesy?'Prueba gratuita vigente':['active','trialing'].includes(sub?.status)?'Membresía vigente':'Activar suscripción segura →'}</button>${sub?.provider_subscription_id?'<button class="btn" style="margin:18px 0 0 10px" data-action="billing-portal">Administrar / cancelar</button>':''}</section><section class="card"><h3>Facturas</h3>${state.data.edgoria_invoices.length?state.data.edgoria_invoices.map(i=>`<div class="statrow"><span>${new Date(i.paid_at||i.created_at).toLocaleDateString('es-PE')} · ${escapeHTML(i.status)}</span><b>US$ ${(i.amount_cents/100).toFixed(2)}</b></div>`).join(''):'<div class="empty">No hay cobros registrados.</div>'}<p class="micro">Los pagos solo quedan confirmados mediante notificaciones firmadas de la pasarela, nunca por el navegador.</p></section></div>`;
}
function affiliatesView(){
 const a=state.data.edgoria_affiliates[0],origin=location.origin;
 const link=a?origin+'/?ref='+encodeURIComponent(a.code):'';
 const commissions=state.data.edgoria_affiliate_commissions;
 return pageTitle('EDGORIA PARTNERS','Programa de afiliados','Recomienda el producto y recibe comisiones por pagos verificados.')+`<div class="grid2"><section class="card"><div class="section-label">EDGORIA PARTNERS</div><div class="price-hero">15% <small>· hasta 12 mensualidades</small></div><div class="statrow"><span>Estado</span><b>${escapeHTML(a?.status||'Sin solicitud')}</b></div>${a?`<label class="control">Enlace de invitación<input readonly class="field" value="${escapeHTML(link)}"/></label><button class="btn" data-action="copy-affiliate">Copiar enlace</button>`:'<p class="hint">Inscríbete para solicitar tu enlace. Activación tras revisión.</p><button class="btn primary" data-action="enroll-affiliate">Solicitar ser afiliado</button>'}<div class="notice" style="margin-top:14px">No existe comisión por invitar afiliados. Se excluyen autorreferidos, reembolsos y pagos fuera del período de elegibilidad.</div></section><section class="card"><h3>Mis comisiones</h3><div class="statrow"><span>Comisiones registradas</span><b>${commissions.length}</b></div><div class="statrow"><span>Pendientes</span><b>${usd(commissions.filter(c=>c.status==='pending').reduce((s,c)=>s+Number(c.commission_cents)/100,0),false)}</b></div><div class="statrow"><span>Pagadas</span><b>${usd(commissions.filter(c=>c.status==='paid').reduce((s,c)=>s+Number(c.commission_cents)/100,0),false)}</b></div><p class="micro">La atribución se registra para cuentas nuevas mediante el enlace de afiliado. Su aprobación y pago requieren controles administrativos.</p></section></div>`;
}
// Este apartado solo crea, edita y elimina fichas de cuentas MT5.
// La conexión de datos (Bridge y Excel) vive exclusivamente en connectV4.
function mt5AccountsManager(){
 const accounts=state.data.accounts||[];
 const items=accounts.map(a=>{
  const id=escapeHTML(a.id),name=escapeHTML(a.name),firm=escapeHTML(a.firm||'Personal'),type=escapeHTML(a.account_type||'personal');
  const files=(state.data.edgoria_v4_import_batches||[]).filter(b=>b.account_id===a.id).length;
  const trades=(state.data.trades||[]).filter(t=>t.account_id===a.id).length;
  const connected=(state.data.edgoria_mt5_connections||[]).some(c=>c.account_id===a.id);
  return `<article class="mt5-account-item"><div class="mt5-account-main"><div class="mt5-account-name">${name}</div><p class="micro">${firm} · ${type} · ${usd(a.account_size||0,false)} nominal</p><p class="micro">${trades} posiciones · ${files} archivos · ${connected?'Bridge configurado':'Sin vincular'}</p></div><div class="mt5-account-actions"><button type="button" class="btn small" data-action="edit-account" data-id="${id}">Editar</button><button type="button" class="btn small danger" data-action="delete-account" data-id="${id}" aria-label="Eliminar cuenta ${name}">Eliminar</button></div></article>`;
 }).join('');
 return `<section class="card mt5-account-manager" id="mt5-accounts-manager"><div class="cardhead"><h3>Mis cuentas MT5 (${accounts.length})</h3><button type="button" class="btn primary" data-action="new-account">+ Crear cuenta</button></div>
 <p class="hint">Aquí únicamente administras las fichas de tus cuentas: crear, editar o eliminar. La conexión MT5 y la importación Excel / CSV se realizan después en <b>MT5 Bridge</b>.</p>
 ${items||'<div class="empty">Todavía no tienes cuentas. Selecciona «Crear cuenta» para registrar la primera.</div>'}
 <div class="notice">Eliminar una cuenta puede borrar también su historial asociado. EDGORIA pedirá confirmación explícita antes de permitirlo.</div>
 </section>`;
}
function accountsView(){
 return pageTitle('GESTIÓN DE CUENTAS','Mis cuentas MT5','Crea, edita o elimina tus cuentas. Conecta y carga los historiales únicamente desde MT5 Bridge.')+mt5AccountsManager();
}
function connectV2(){
 const connections=state.data.edgoria_mt5_connections||[];
 const allAccounts=state.data.accounts||[];
 const list=connections.map(x=>{
  const acc=allAccounts.find(a=>a.id===x.account_id);
  const n=state.data.trades.filter(t=>t.account_id===x.account_id).length;
  return `<div class="v3-connection"><div class="row spread wrap"><div><b>${escapeHTML(acc?.name||'Cuenta MT5')}</b><p class="micro">${escapeHTML(x.server)} · Login ${escapeHTML(x.mt5_login)}</p></div><span class="tag ${x.status==='active'?'positive':'amber'}">${x.status==='active'?'Token activo':'Revocado'}</span></div><div class="statrow"><span>Posiciones reconciliadas</span><b>${n}</b></div><div class="statrow"><span>Última recepción</span><b>${x.last_sync_at?new Date(x.last_sync_at).toLocaleString('es-PE'):'Nunca'}</b></div><div class="actions">${x.status==='active'?`<button class="btn small danger" data-action="mt5-revoke" data-id="${escapeHTML(x.id)}">Revocar token</button>`:`<button class="btn small" data-action="mt5-reconnect" data-id="${escapeHTML(x.id)}">Crear token nuevo</button>`}<button class="btn small" data-action="refresh-sync">Actualizar</button></div></div>`;
 }).join('');
 const available=allAccounts.filter(a=>!connections.some(x=>x.account_id===a.id));
 return pageTitle('MT5 CONNECT','EDGORIA MT5 Bridge','Conecta cuentas existentes e importa historiales de MT5 desde un solo lugar.')+
 `<section class="mt5-bridge-hub" aria-label="Herramientas de MT5 Bridge"><div class="mt5-bridge-hub-content"><div class="section-label">CENTRO DE DATOS · MT5</div><h3>Conecta e importa tu historial</h3><p>Primero registra tus cuentas en «Mis cuentas MT5». Después selecciona aquí la cuenta y vincula el Bridge o carga un Excel / CSV.</p></div><div class="mt5-bridge-hub-actions"><a class="btn primary" href="#mt5-import-section" aria-label="Ir al importador Excel de MT5">Importar Excel / CSV <span aria-hidden="true">↓</span></a><button type="button" class="btn" data-view="prop">Ir a Mis cuentas MT5 <span aria-hidden="true">↗</span></button></div></section>`+
 `<div class="grid2"><section class="card"><div class="cardhead"><h3>1. Vincular cuenta existente</h3><span class="tag amber">SOLO LECTURA</span></div><p class="hint">Selecciona una cuenta que ya creaste en Mis cuentas MT5. Aquí solo se configura su conexión segura; no se crean ni editan fichas.</p><form id="bridge-form" class="formstack" style="margin-top:18px"><label class="control">Cuenta disponible<select class="field" name="account_id" required>${available.map(a=>`<option value="${escapeHTML(a.id)}" ${state.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></label><label class="control">Login numérico MT5<input class="field" name="mt5_login" pattern="[0-9]{1,24}" required placeholder="Ej. 12345678"/></label><label class="control">Servidor exacto MT5<input class="field" name="server" maxlength="150" required placeholder="Broker-Demo"/></label><button class="btn primary" type="submit" ${available.length?'':'disabled'}>Generar token de conexión</button></form>${!allAccounts.length?'<p class="micro">No hay cuentas todavía. Registra una en «Mis cuentas MT5» y regresa a Bridge.</p>':!available.length?'<p class="micro">Todas tus cuentas ya tienen una conexión. Puedes importar un archivo más abajo o gestionar sus tokens.</p>':''}<button type="button" class="btn" data-action="mt5-diagnostics" style="margin-top:12px">◈ Diagnosticar API de MT5</button><div class="notice">El diagnóstico y los archivos Excel funcionan con la sesión de usuario y RLS. El Bridge automático necesita configuración privada adicional. No compartas secretos.</div></section>
 <section class="card"><div class="cardhead"><h3>2. Instalar Bridge en MT5 escritorio</h3><span class="tag">EA de lectura</span></div><p class="hint">Descarga el conector <b>.mq5</b>, compílalo en MetaEditor y autoriza el dominio HTTPS en WebRequest. Introduce el token y endpoint creados para esa cuenta.</p><a class="btn primary" href="/downloads/EDGORIA_ReadOnly_Bridge.mq5" download>↓ Descargar EDGORIA Bridge</a><div class="notice">Recibe operaciones cerradas del historial disponible en MT5 mientras el terminal esté abierto. No se solicita la contraseña de trading.</div><p class="micro">Los movimientos de balance y posiciones abiertas no se contabilizan como P&L realizado.</p></section></div>
 <section class="card" style="margin-top:16px"><div class="cardhead"><h3>3. Conexiones existentes</h3><span class="tag positive">SIN TRADES MANUALES</span></div>${list||'<div class="empty">Sin conexiones todavía. Vincula una cuenta existente o importa un Excel.</div>'}<div class="row wrap" style="margin-top:18px"><button class="btn" data-action="export-csv">↓ Exportar operaciones MT5</button><button class="btn" data-action="refresh-sync">↻ Recargar historial</button></div></section>`;
}
function v4FilePanel(){
 const batches=state.data.edgoria_v4_import_batches||[],accounts=state.data.accounts;
 const receipt=uploadResult?.kind==='success'?`<div class="eg181-import-confirmation" role="status"><span class="eg181-import-check" aria-hidden="true">✓</span><div><strong>Archivo procesado correctamente</strong><p>${uploadResult.reread?'Se revisó el archivo existente sin duplicar posiciones.':'El historial de la cuenta se actualizó.'} Los resultados y movimientos se consultan exclusivamente desde Analytics.</p></div><button type="button" class="btn small eg181-analytics-link" data-view="analytics">Abrir Analytics ↗</button></div>`:'';

 return `<section class="card mt5-import-panel" id="mt5-import-section" style="margin-top:18px"><div class="cardhead"><h3>4. Importar Excel / CSV a una cuenta existente</h3><span class="tag amber">NEO 18.1 · IMPORTADOR</span></div>
 <p class="hint">Selecciona una cuenta ya creada en «Mis cuentas MT5» y sube el reporte completo original de MT5 (XLSX, CSV o HTML). Se reconocen las secciones Posiciones y Deals/Transacciones. Los datos importados se identifican como "archivo aportado", no se verifican contra el broker. El panel se recalcula al subir o eliminar un archivo.</p>
 <form id="v4-upload-form" class="formstack" enctype="multipart/form-data"><label class="control">Cuenta de EDGORIA<select class="field" name="account_id" required>${accounts.map(a=>`<option value="${escapeHTML(a.id)}" ${state.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></label><label class="control">Reporte completo MT5 (.xlsx, .csv, .html; hasta 3 MB)<input type="file" class="field" name="file" accept=".xlsx,.csv,.html,.htm" required /><span class="micro" id="v4-selected-file">Selecciona tu reporte; no se enviará hasta pulsar Importar.</span></label><button type="submit" class="btn primary" ${accounts.length?'':'disabled'}>↑ Importar y actualizar Dashboard</button><div id="v4-upload-status" class="v4-upload-status" role="status" aria-live="polite">${uploadResult?.kind==='error'?`<span class="red">${escapeHTML(uploadResult.message)}</span>`:uploadResult?.kind==='success'?'':'Elige la cuenta y el archivo, y después confirma la importación.'}</div></form>
 ${receipt}
 <div class="notice">Compatibilidad: <b>informe nativo MT5 con Posiciones / Órdenes / Transacciones / Resultados</b> (español e inglés) o tabla de Deals con Position ID. Admite reportes completos y movimientos de balance identificables. No importa órdenes aisladas ni posiciones incompletas. Los registros se clasifican internamente y las estadísticas se consultan en Analytics.</div>
 <p class="micro">Los archivos no se conservan en bruto: solo se guardan las posiciones reconciliadas y el identificador SHA-256. La sincronización automática Bridge funciona por separado.</p>
 <h3 style="margin-top:24px">Archivos importados</h3>
 ${batches.length?batches.map(b=>`<div class="statrow"><span><b>${escapeHTML(b.filename)}</b><br><small class="micro">${escapeHTML(state.data.accounts.find(a=>a.id===b.account_id)?.name||'Cuenta')} · ${Number(b.positions_imported)} posiciones · ${new Date(b.uploaded_at).toLocaleString('es-PE')}</small></span><button class="btn small danger" data-action="delete-import-batch" data-id="${escapeHTML(b.id)}">Eliminar archivo y recalcular</button></div>`).join(''):'<div class="empty">Aún no has importado archivos.</div>'}
 <div class="actions"><button class="btn" data-action="refresh-sync">↻ Refrescar datos y estadísticas</button><a class="btn" download href="/downloads/ejemplo_mt5_deals.csv">↓ CSV de ejemplo</a></div></section>`;
}
const v3ConnectView=connectV2;
function connectV4(){return v3ConnectView()+v4FilePanel()}
function partnerDashboard(){
 const applications=state.data.edgoria_v4_partner_applications||[];
 const app=applications[0];
 return (state.role==='partner'?pageTitle('EDGORIA PARTNERS','Panel del partner','Acceso independiente: comisiones, enlaces de referido y estadísticas.')+affiliatesView():pageTitle('POSTULA COMO PARTNER','Programa de partners','Un administrador deberá aprobar tu solicitud antes de habilitar el acceso independiente.')+
 `<section class="card"><p>El registro estándar no otorga permisos de partner ni administrador automáticamente.</p>${app?`<div class="notice">Solicitud: ${escapeHTML(app.status)}</div>`:`<form id="v4-partner-form" class="formstack"><label class="control">Cuéntanos brevemente cómo recomendarías EDGORIA<textarea name="message" class="field" maxlength="1000" placeholder="Comunidad, actividad y canal" required></textarea></label><button class="btn primary" type="submit">Solicitar acceso Partner</button></form>`}</section>`);
}
function adminRolesView(){
 if(state.role!=='admin')return pageTitle('RESTRINGIDO','Sin autorización','Solo un administrador puede consultar los roles.');
 const d=state.v4AdminRoles||{profiles:[],roles:[],applications:[]},roles=new Map(d.roles.map(x=>[x.user_id,x.role]));
 return pageTitle('CONTROL DE ACCESOS','Usuarios y roles','Cuentas separadas por correo de Supabase Auth. Los roles se verifican en servidor, nunca en el navegador.')+
 `<div class="grid3"><section class="card"><h3>Registros con perfil</h3><div class="price-hero">${d.profiles.length}</div></section><section class="card"><h3>Partners aprobados</h3><div class="price-hero">${d.roles.filter(x=>x.role==='partner').length}</div></section><section class="card"><h3>Solicitudes</h3><div class="price-hero">${d.applications.filter(x=>x.status==='pending').length}</div></section></div>
 <section class="card" style="margin-top:18px"><div class="cardhead"><h3>Solicitudes de Partner</h3><button class="btn small" data-action="reload-roles">↻ Actualizar</button></div>
 ${d.applications.length?d.applications.map(a=>{const p=d.profiles.find(p=>p.user_id===a.user_id);return `<div class="statrow"><span><b>${escapeHTML(p?.full_name||a.user_id)}</b><br><small class="micro">${escapeHTML(p?.country||'—')} · ${escapeHTML(a.status)} · ${escapeHTML(a.message)}</small></span><span>${a.status==='pending'?`<button class="btn small primary" data-action="v4-approve-partner" data-id="${escapeHTML(a.user_id)}">Aprobar</button> <button class="btn small" data-action="v4-reject-partner" data-id="${escapeHTML(a.user_id)}">Rechazar</button>`:`<small class="micro">${escapeHTML(roles.get(a.user_id)||'trader')}</small>`}</span></div>`}).join(''):'<div class="empty">Sin solicitudes.</div>'}</section>
${accessManagementTable()}`;
}
function accessManagementTable(){
 const d=state.accessAdmin||{users:[],totals:{}},users=d.users||[];
 return `<section class="card" style="margin-top:18px"><div class="cardhead"><h3>Usuarios · accesos y pruebas</h3><button class="btn small" data-action="reload-access">↻ Actualizar</button></div>
 <p class="micro">Pendientes: ${Number(d.totals?.pending||0)} · Activos: ${Number(d.totals?.active||0)} · Desactivados: ${Number(d.totals?.suspended||0)} · Pruebas vigentes: ${Number(d.totals?.active_trials||0)}. No se muestran contraseñas.</p>
 <div class="tablewrap"><table class="table"><thead><tr><th>Nombre y correo</th><th>Rol</th><th>Estado y verificación</th><th>Prueba gratuita</th><th>Acciones</th></tr></thead><tbody>${users.map(u=>{
 const id=escapeHTML(u.user_id),isSelf=u.user_id===state.user.id;
 return `<tr><td><b>${escapeHTML(u.full_name||'Sin nombre')}</b><div class="micro eg31-mail">${escapeHTML(u.email||'Correo no disponible')}</div><div class="micro">${escapeHTML(u.country||'—')} · ${id.slice(0,8)}…</div></td><td>${escapeHTML(u.role)}</td><td><span class="tag ${u.access_status==='active'?'positive':u.access_status==='pending'?'amber':'negative'}">${u.access_status==='active'?'Activa':u.access_status==='pending'?'Pendiente':'Suspendida'}</span><div class="micro">${u.email_confirmed?'✓ Correo confirmado':'◷ No confirmado'}</div></td><td>${u.trial_ends_at?escapeHTML(new Date(u.trial_ends_at).toLocaleDateString('es-PE'))+(u.trial_active?' · Vigente':' · Vencida'):'Sin prueba'}</td><td><div class="row wrap">${isSelf||u.role==='admin'?'<span class="micro">Protegida</span>':`${u.access_status==='active'?`<button class="btn small danger" data-action="access-suspend" data-id="${id}">Desactivar</button>`:`<button class="btn small primary" data-action="access-activate" data-id="${id}" ${u.email_confirmed?'':'disabled title="Debe confirmar su correo"'}>Activar</button>`}<button class="btn small" data-action="access-grant-month" data-id="${id}">+ 1 mes gratis</button>${u.trial_ends_at?`<button class="btn small" data-action="access-revoke-trial" data-id="${id}">Quitar prueba</button>`:''}`}</div></td></tr>`}).join('')}</tbody></table></div>
 ${users.length?'':'<p class="micro">Aún no hay usuarios con perfil. El registro requiere nombre y país.</p>'}
 <p class="notice">Estas pruebas son cortesías internas del administrador, no suscripciones del proveedor de pagos. Al vencer, la cortesía caduca; el sistema de suscripciones debe seguir definiendo el acceso de pago.</p></section>`;
}
function v4Settings(){
 const p=state.profile||{},r=state.role;
 return pageTitle('IDENTIDAD Y SEGURIDAD','Mi perfil','Tus datos personales son privados. Los permisos se gestionan por separado.')+
 `<section class="card"><div class="section-label">TIPO DE ACCESO</div><h3>${escapeHTML(({admin:'Administrador',partner:'Partner',trader:'Trader'})[r]||r)}</h3><div class="statrow"><span>Correo de acceso</span><b>${escapeHTML(state.user?.email||'—')}</b></div>
 <form id="v4-profile-form" class="formstack"><label class="control">Nombre completo<input class="field" name="full_name" maxlength="120" minlength="2" value="${escapeHTML(p.full_name||state.user?.user_metadata?.full_name||'')}" required /></label><label class="control">País<input class="field" name="country" maxlength="100" minlength="2" required value="${escapeHTML(p.country||state.user?.user_metadata?.country||'')}"/></label><label class="control">Teléfono opcional<input class="field" name="phone" type="tel" maxlength="24" value="${escapeHTML(p.phone||'')}"/></label><label class="control">Experiencia<select class="field" name="experience">${['prefiero_no_decir','principiante','intermedio','avanzado'].map(x=>`<option value="${x}" ${p.experience===x?'selected':''}>${x.replaceAll('_',' ')}</option>`).join('')}</select></label><button class="btn primary" type="submit">Guardar mi perfil</button></form>
 <div class="notice">Los datos de registro no sirven para asignarte permisos de administrador o partner. No compartas tokens de MT5 o claves privadas.</div></section><section class="card" style="margin-top:16px"><h3>Jornada de cierre de la prop firm</h3><p class="hint">Elige arriba una cuenta MT5 y configura aquí su hora de corte. FTMO, FundedNext y futuros pueden tener jornadas diferentes. El historial original de MT5 no se modifica.</p>${calendarConfigUI()}<div class="notice">Solo son criterios de presentación del P&L realizado. No representan verificación de reglas de prop firm ni vigilan posiciones abiertas.</div></section>
 ${r==='trader'||(r==='admin'&&state.personalJournalLoaded)?`<div style="margin-top:16px">${settings()}</div>`:''}`;
}
async function fetchAdminRoles(){
 if(state.role!=='admin')return;
 const {data:{session}}=await sb.auth.getSession();const resp=await fetch('/api/v4-admin-roles',{headers:{Authorization:'Bearer '+session.access_token}});
 if(!resp.ok)throw Error('No se pudo cargar el panel administrativo');state.v4AdminRoles=await resp.json();
}
const pages={dashboard,trades:tradesView,calendar:calendarView,analytics,mindset,prop:accountsView,replay,connect:connectV4,risk:riskGuard,score:scoreView,membership,affiliates:partnerDashboard,intelligence,admin:adminView,roles:adminRolesView,settings:v4Settings};

async function hydrateJournalPhotos(){
  if(state.view!=='mindset'||!sb)return;
  const imgs=$$('img[data-photo-path]').slice(0,40);
  await Promise.all(imgs.map(async img=>{
    const path=img.dataset.photoPath;
    try{const {data,error}=await sb.storage.from('edgoria-journal').createSignedUrl(path,300);
      if(!error&&data?.signedUrl&&img.isConnected&&img.dataset.photoPath===path)img.src=data.signedUrl;
    }catch{/* Private image preview remains unavailable without exposing its path. */}
  }));
}
function render(){if(!pages[state.view])state.view='dashboard';const menuScroll=$('#sidebar-scroll')?.scrollTop||0;shell();$('#workspace').innerHTML=pages[state.view]();if($('#sidebar-scroll'))$('#sidebar-scroll').scrollTop=menuScroll;hydrateJournalPhotos();}
function update(){if(!$('#workspace'))return render();$('#workspace').innerHTML=pages[state.view]();$('.breadcrumb').textContent=viewBreadcrumb();$$('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));const a=$('#account-select');if(a)a.value=state.account;hydrateJournalPhotos();}
function closeModal(){$('#modal-root')?.remove()}
function modal(content,wide=false){closeModal();const div=document.createElement('div');div.id='modal-root';div.innerHTML=`<div class="overlay" data-action="outside"><div class="dialog ${wide?'wide':''}">${content}</div></div>`;document.body.appendChild(div);$('#modal-root input:not([type="hidden"]),#modal-root select')?.focus()}
function actions(){return `<div class="actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Guardar cambios →</button></div>`}
function accountModal(a){const edit=!!a;modal(`<div class="split-head"><div><div class="section-label">FUNDING MANAGER</div><h2>${edit?'Editar cuenta MT5':'Crear ficha para MT5'}</h2></div><button class="btn iconbtn" data-action="close-modal">×</button></div><p class="desc">La ficha no crea operaciones: debes vincularla después con tu login y servidor MT5. Importaremos solo ejecuciones reales.</p><form id="account-form" data-id="${escapeHTML(a?.id||'')}"><div class="formgrid"><label class="control full">Nombre de cuenta<input class="field" name="name" value="${escapeHTML(a?.name||'')}" placeholder="Ej. Cuenta de práctica 10K" required maxlength="100"/></label><label class="control">Proveedor / tipo<input class="field" name="firm" value="${escapeHTML(a?.firm||'Personal')}" maxlength="100" required/></label><label class="control">Tipo<select class="field" name="account_type">${['personal','demo','challenge','funded'].map(x=>`<option value="${x}" ${a?.account_type===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="control">Capital nominal (USD)<input class="field" type="number" name="account_size" min="1" step=".01" value="${Number(a?.account_size||10000)}" required/></label><label class="control">Objetivo ilustrativo (USD)<input class="field" type="number" name="target" min="0" step=".01" value="${Number(a?.target||500)}" required/></label><label class="control">Límite diario declarado (USD)<input class="field" type="number" name="daily_loss_limit" min="0" step=".01" value="${Number(a?.daily_loss_limit||500)}" required/></label><label class="control">Límite total declarado (USD)<input class="field" type="number" name="max_loss_limit" min="0" step=".01" value="${Number(a?.max_loss_limit||1000)}" required/></label></div>${actions()}</form>`,true)}

function annotationModal(t){
 if(!t)return;
 const a=state.data.edgoria_trade_annotations.find(x=>x.trade_id===t.id);
 modal(`<div class="split-head"><div><div class="section-label">OPERACIÓN MT5</div><h2>Notas de revisión</h2></div><button class="btn iconbtn" data-action="close-modal">×</button></div><div class="notice">${escapeHTML(t.symbol)} · ${usd(t.pnl)}. La operación original nunca se modifica.</div><form id="annotation-form" data-trade="${escapeHTML(t.id)}"><div class="formstack"><label class="control">Mis observaciones<textarea class="field" name="notes" maxlength="3000" placeholder="¿Qué observaste?">${escapeHTML(a?.notes||'')}</textarea></label></div>${actions()}</form>`);
}
function payoutModal(id){modal(`<div class="split-head"><div><div class="section-label">TRACKING</div><h2>Registrar retiro</h2></div><button class="btn iconbtn" data-action="close-modal">×</button></div><form id="payout-form"><input type="hidden" name="account_id" value="${escapeHTML(id)}"/><div class="formstack"><label class="control">Fecha<input class="field" type="date" name="paid_at" required value="${today()}"/></label><label class="control">Importe (USD)<input class="field" type="number" name="amount" min="0.01" step=".01" required placeholder="0.00"/></label><label class="control">Nota opcional<input class="field" name="note" maxlength="300" placeholder="Ej. Payout registrado manualmente"/></label></div>${actions()}</form>`)}
function csvCell(v,field){let text=String(v??'');if(!['pnl','risk','commission','swap'].includes(field)&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
function exportCsv(){const cols=['closed_at','symbol','direction','pnl','risk','strategy','session','account_id','external_id','notes','commission','swap'];const lines=[cols.join(','),...visibleTrades(false).map(t=>cols.map(k=>csvCell(t[k],k)).join(','))].join('\r\n');const blob=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='edgoria-journal.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Exportación preparada');}

async function changeView(next){
 if(!canOpenView(next))return;
 if(state.role==='admin'&&adminPrivateViews.has(next)&&!state.personalJournalLoaded){
  state.personalJournalLoaded=true;
  try{await loadCloud()}catch(e){state.personalJournalLoaded=false;throw e}
 }
 state.view=next;state.search='';render();$('#sidebar')?.classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
}

function showMt5Token(out){modal(`<h2>Conexión MT5 preparada</h2><p class="desc">Guarda el token en el conector de MetaTrader 5. Solo se muestra una vez; no lo compartas.</p><label class="control">Token de sincronización<input class="field" readonly value="${escapeHTML(out.token)}"/></label><label class="control">Endpoint HTTPS<input class="field" readonly value="${escapeHTML(out.endpoint)}"/></label><div class="notice">La vinculación queda pendiente de la primera recepción real de MT5. La ficha no añade resultados por sí sola.</div><button class="btn primary" data-action="close-modal">He guardado el token</button>`,true)}
async function onAction(act,btn){
  const id=btn?.dataset.id;
  switch(act){
    case 'journal-template':{
      const area=$('#mindset-form [name="note"]');if(!area)break;
      const template='DECISIÓN QUE RESPETÉ\n\n\nAJUSTE PARA LA PRÓXIMA REVISIÓN\n\n\nAPRENDIZAJE DEL DÍA\n';
      if(!area.value.trim() || confirm('¿Quieres reemplazar el texto actual por la plantilla guiada?')){area.value=template;area.focus();area.setSelectionRange(21,21);}
      break;
    }
    case 'neo-period':{const v=String(btn?.dataset.period||'');if(['1','today','date','7','30','90','all'].includes(v)){if(v==='date'&&!isValidDay(state.analysisDate))state.analysisDate=activeTradingDay();state.period=v;update()}break;}
    case 'delete-note':{
      const note=state.data.journal_entries.find(n=>String(n.id)===String(id));if(!note)throw Error('Entrada no encontrada');
      if(!confirm('¿Eliminar esta reflexión y todas sus capturas privadas? Esta acción es permanente.'))break;
      const attachments=(state.data.edgoria_journal_attachments||[]).filter(a=>a.entry_id===note.id);
      if(attachments.length){const {error:storageError}=await sb.storage.from('edgoria-journal').remove(attachments.map(a=>a.storage_path));if(storageError)throw Error('No se pudieron borrar las capturas; la reflexión se conserva.');}
      const {error:deleteError}=await sb.from('journal_entries').delete().eq('id',note.id).eq('user_id',state.user.id);
      if(deleteError)throw deleteError;
      await refreshData();notify('Reflexión y capturas eliminadas');break;
    }
    case 'open-journal-photo':{
      const a=(state.data.edgoria_journal_attachments||[]).find(x=>x.id===id);if(!a)throw Error('Captura no encontrada');
      const {data,error}=await sb.storage.from('edgoria-journal').createSignedUrl(a.storage_path,120);
      if(error||!data?.signedUrl)throw Error('No se pudo abrir la captura privada');
      modal(`<div class="split-head"><h2>Captura privada</h2><button class="btn" data-action="close-modal">Cerrar</button></div><img class="eg31-full-image" src="${escapeHTML(data.signedUrl)}" alt="Captura privada de journal"/>`,true);break;
    }
    case 'neo13-import':{await changeView('connect');requestAnimationFrame(()=>document.getElementById('mt5-import-section')?.scrollIntoView({behavior:'smooth',block:'start'}));break;}
    case 'new-account':accountModal(null);break;
    case 'edit-account':{
      const account=state.data.accounts.find(a=>String(a.id)===String(id));
      if(!account)throw Error('No se encontró esta cuenta. Actualiza los datos y vuelve a intentarlo.');
      accountModal(account);break;
    }
    case 'delete-account':{
      const account=state.data.accounts.find(a=>String(a.id)===String(id));
      if(!account)throw Error('No se encontró la cuenta. Actualiza los datos.');
      const positions=(state.data.trades||[]).filter(t=>t.account_id===id).length;
      const batches=(state.data.edgoria_v4_import_batches||[]).filter(b=>b.account_id===id).length;
      const connections=(state.data.edgoria_mt5_connections||[]).filter(c=>c.account_id===id).length;
      const payouts=(state.data.payouts||[]).filter(p=>p.account_id===id).length;
      const related=positions+batches+connections+payouts;
      const message=`¿Eliminar la cuenta «${account.name}»?\n\n${positions} posiciones · ${batches} archivos · ${connections} conexiones · ${payouts} retiros.\n\nEsta acción es permanente. Los registros vinculados pueden eliminarse por cascada en Supabase.`;
      if(!window.confirm(message))break;
      if(related){
        const confirmation=window.prompt('La cuenta contiene datos. Para confirmar su eliminación definitiva, escribe exactamente: ELIMINAR');
        if(confirmation!=='ELIMINAR'){notify('Se canceló la eliminación');break;}
      }
      const {data,error}=await sb.from('accounts').delete().eq('id',account.id).eq('user_id',state.user.id).select('id');
      if(error)throw error;
      if(!data?.length)throw Error('No se pudo eliminar esta cuenta. Verifica los permisos e inténtalo nuevamente.');
      if(state.account===account.id)state.account='all';
      await refreshData();notify('Cuenta MT5 eliminada');break;
    }
    case 'refresh-sync':await refreshData();notify('Cuentas y operaciones actualizadas');break;
    case 'reload-roles':await fetchAdminRoles();update();break;
    case 'admin-filter':{const filter=String(btn.dataset.filter||'all');if(['all','pending','active','suspended'].includes(filter)){state.adminUserFilter=filter;update();}break;}
    case 'reload-access':await fetchAccessAdmin();update();break;
    case 'retry-admin':await checkAdmin();update();notify(state.accessAdmin?'Administración actualizada':'Revisa el estado de las API en Vercel',!state.accessAdmin);break;
    case 'access-activate':case 'access-suspend':case 'access-grant-month':case 'access-revoke-trial':await accessAction(act.slice('access-'.length),id);break;
    case 'mt5-diagnostics':{const result=await apiGet('v4-mt5-diagnostics');modal(`<h2>Diagnóstico MT5 Bridge</h2><div class="notice">${escapeHTML(result.message||'Sin datos')}</div><div class="statrow"><span>Base de datos</span><b>${escapeHTML(result.database||'—')}</b></div><div class="statrow"><span>Autenticación</span><b>${escapeHTML(result.authentication||'—')}</b></div><div class="statrow"><span>Cuentas</span><b>${Number(result.accounts||0)}</b></div><button class="btn primary" data-action="close-modal">Cerrar</button>`);break;}
    case 'v4-approve-partner':case 'v4-reject-partner':await apiPost('v4-admin-roles',{action:act==='v4-approve-partner'?'approve-partner':'reject-partner',user_id:id});await fetchAdminRoles();update();notify('Solicitud procesada');break;
    case 'delete-import-batch':if(confirm('¿Quitar este archivo y todas sus posiciones derivadas del dashboard? El historial del Bridge no se elimina.')){await apiPost('v4-file-delete',{batch_id:id});await refreshData();notify('Archivo eliminado y estadísticas recalculadas')}break;

    case 'recover':renderRecover();break;
    case 'toggle-auth':renderAuth(btn.dataset.register==='1');break;
    case 'check-approval':{try{const {data}=await sb.auth.getUser();state.user=data.user;await loadIdentity();await loadCloud();await checkAdmin();render();notify('Acceso autorizado. Bienvenido a EDGORIA.')}catch(e){if(['ACCESS_PENDING','EMAIL_UNCONFIRMED'].includes(e.code))renderPending(e.code);else throw e}break;}
    case 'signout':await logout();break;
    case 'menu':$('#sidebar')?.classList.toggle('show');break;
    case 'annotate-trade':annotationModal(state.data.trades.find(x=>String(x.id)===id));break;
    case 'month-next':case 'month-prev':{const [y,m]=state.month.split('-').map(Number);const d=new Date(y,m-1+(act==='month-next'?1:-1),1);state.month=isoLocal(d).slice(0,7);state.selectedDay=state.month+'-01';update();break}
    case 'calendar-day':state.selectedDay=btn.dataset.date;update();break;
    case 'explore-calendar-day':state.selectedDay=btn.dataset.date;state.month=btn.dataset.date.slice(0,7);await changeView('calendar');break;
    
    case 'export-csv':exportCsv();break;
    case 'billing-portal':{
      const out=await apiPost('billing-portal');if(!out.url?.startsWith('https://'))throw Error('URL de administración inválida');location.assign(out.url);break;
    }
    case 'start-checkout':{
      const out=await apiPost('checkout');if(!/^https:\/\/[^/]*lemonsqueezy\.com\//i.test(out.url))throw Error('URL de pago inválida');
      location.assign(out.url);break;
    }
    case 'approve-affiliate':await adminAction('approve-affiliate',id);break;
    case 'suspend-affiliate':await adminAction('suspend-affiliate',id);break;
    case 'approve-commission':await adminAction('approve-commission',id);break;
    case 'mark-commission-paid':if(confirm('¿Comprobaste que la transferencia al afiliado fue efectivamente realizada?'))await adminAction('mark-commission-paid',id,'TRANSFER_VERIFIED');break;
    case 'enroll-affiliate':await apiPost('affiliate-enroll');await refreshData();notify('Solicitud de afiliación registrada');break;
    case 'copy-affiliate':{
      const a=state.data.edgoria_affiliates[0];if(!a)throw Error('No hay enlace');await navigator.clipboard.writeText(location.origin+'/?ref='+a.code);notify('Enlace copiado');break;
    }
    case 'mt5-revoke':if(confirm('¿Revocar el acceso del conector MT5?')){await apiPost('mt5-disconnect',{connection_id:id});await refreshData();notify('Token MT5 revocado')}break;
    
    case 'close-modal':closeModal();break;
    case 'outside':closeModal();break;
  }
}
async function formSubmit(form){
  const fd=new FormData(form),values=Object.fromEntries(fd.entries());
  if(form.id==='auth-form')return login(form);
  if(form.id==='v4-profile-form'){
    const full_name=String(values.full_name||'').trim(),country=String(values.country||'').trim(),phone=String(values.phone||'').trim();
    if(full_name.length<2||full_name.length>120||country.length<2||country.length>100||phone.length>24||!/^[+0-9 ()-]*$/.test(phone))throw Error('Verifica nombre, país y teléfono');
    const obj={user_id:state.user.id,full_name,country,phone:phone||null,experience:values.experience};
    const {error}=await sb.from('edgoria_v4_profiles').upsert(obj,{onConflict:'user_id'});if(error)throw error;
    await loadCloud();update();notify('Perfil actualizado');return;
  }
  if(form.id==='v4-partner-form'){
    const message=String(values.message||'').trim();if(message.length>1000||!message)throw Error('Escribe una breve presentación');
    const {error}=await sb.from('edgoria_v4_partner_applications').insert({user_id:state.user.id,message,status:'pending'});if(error)throw error;
    await refreshData();notify('Solicitud de Partner enviada');return;
  }
  if(form.id==='v4-upload-form'){
    const file=fd.get('file');if(!file||!file.name||file.size>3_000_000)throw Error('Selecciona un reporte MT5 XLSX, CSV o HTML de hasta 3 MB');
    const status=$('#v4-upload-status'),button=form.querySelector('button[type=submit]');
    if(button){button.disabled=true;button.textContent='Importando y comprobando resultados…'}
    if(status)status.textContent='Leyendo historial de MT5; comprobando posiciones y comisiones…';
    const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Debes iniciar sesión');
    try{
      const response=await fetch('/api/v4-file-upload',{method:'POST',headers:{Authorization:'Bearer '+session.access_token},body:fd});
      const out=await response.json().catch(()=>({}));
      if(!response.ok)throw Error((out.error||'No se pudo importar. Comprueba la configuración de Vercel y el tipo de informe.')+' ('+(out.code||response.status)+')');
      uploadResult={kind:'success',message:out.reread_existing?'Archivo revisado correctamente, sin duplicados.':'Archivo procesado correctamente.',reread:!!out.reread_existing,positions:Number(out.positions||0)};
      await loadCloud();
      const importedAccount=String(fd.get('account_id')||'');
      if(state.data.accounts.some(a=>String(a.id)===importedAccount))state.account=importedAccount;
      update();notify(out.reread_existing?'Archivo revisado. Datos sincronizados.':'Archivo importado. Consulta las métricas en Analytics.');return;
    }catch(e){
      uploadResult={kind:'error',message:'No se importó ningún dato. '+String(e.message||'Error desconocido')};
      if(status){status.textContent=uploadResult.message;status.classList.add('red')}
      throw e;
    }finally{if(button){button.disabled=false;button.textContent='↑ Importar y actualizar Dashboard'}}
  }
  if(form.id==='recover-form'){
    if(!sb)throw Error('Autenticación no disponible');
    const email=String(values.email||'').trim();
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
    if(error)throw error;
    renderAuth(false);notify('Si el correo está registrado, recibirás el enlace de recuperación.');return;
  }
  if(form.id==='password-form'){
    if(!sb)throw Error('Autenticación no disponible');
    const password=String(values.password||'');if(password.length<10)throw Error('Usa una contraseña más larga');
    const {error}=await sb.auth.updateUser({password});if(error)throw error;
    await sb.auth.signOut();state.user=null;history.replaceState(null,'',location.pathname);
    renderAuth(false);notify('Contraseña actualizada. Inicia sesión nuevamente.');return;
  }
  if(form.id==='risk-form'){
    const account_id=values.account_id;if(!state.data.accounts.some(a=>a.id===account_id))throw Error('Selecciona una cuenta válida');
    const fields=['max_risk_per_trade_pct','max_risk_per_idea_pct','daily_loss_pct','max_drawdown_pct','daily_trade_limit','cooldown_minutes'];
    const obj={account_id,user_id:state.user.id};for(const key of fields){const raw=String(values[key]||'').trim();obj[key]=raw===''?null:Number(raw);if(obj[key]!==null&&!Number.isFinite(obj[key]))throw Error('Regla inválida')}
    obj.cooldown_minutes??=0;
    const {error}=await sb.from('edgoria_risk_rules').upsert(obj,{onConflict:'account_id'});if(error)throw error;
    await refreshData();notify('Reglas de riesgo guardadas');return;
  }
  if(form.id==='bridge-form'){
    const out=await apiPost('mt5-connect',{account_id:values.account_id,mt5_login:values.mt5_login,server:values.server});
    await refreshData();showMt5Token(out);return;
  }
  if(form.id==='annotation-form'){
    const trade_id=form.dataset.trade,t=state.data.trades.find(x=>x.id===trade_id);if(!t)throw Error('Operación MT5 no encontrada');
    const notes=String(values.notes||'').trim();
    if(notes.length>3000)throw Error('Notas demasiado extensas');
    const obj={trade_id,notes,user_id:state.user.id};
    const {error}=await sb.from('edgoria_trade_annotations').upsert(obj,{onConflict:'trade_id'});if(error)throw error;
    closeModal();await refreshData();notify('Notas guardadas sin alterar las operaciones');return;
  }
  if(form.id==='account-form'){
    const obj={name:String(values.name).trim(),firm:String(values.firm).trim(),account_type:values.account_type,account_size:Number(values.account_size),daily_loss_limit:Number(values.daily_loss_limit),max_loss_limit:Number(values.max_loss_limit),target:Number(values.target)};
    if(!obj.name||obj.name.length>100||!obj.firm||obj.firm.length>100)throw Error('Introduce el nombre y proveedor de la cuenta.');
    if(!['personal','demo','challenge','funded'].includes(obj.account_type))throw Error('Tipo de cuenta inválido.');
    if(!Number.isFinite(obj.account_size)||obj.account_size<=0||['daily_loss_limit','max_loss_limit','target'].some(k=>!Number.isFinite(obj[k])||obj[k]<0))throw Error('Revisa los importes: deben ser números válidos y no negativos.');
    const id=form.dataset.id;
    const created=await writeData('accounts',id?{...obj,id}:obj,id?'update':'insert');
    if(created?.id)state.account=created.id;
    closeModal();await refreshData();notify(id?'Cuenta actualizada':'Cuenta MT5 creada. Selecciónala en el importador Excel.');return;
  }

  if(form.id==='payout-form'){const amount=Number(values.amount);if(!Number.isFinite(amount)||amount<=0)throw Error('Importe inválido');await writeData('payouts',{account_id:values.account_id,paid_at:values.paid_at,amount,note:String(values.note||'')});closeModal();await refreshData();notify('Retiro registrado');return}
  if(form.id==='mindset-form'){
   const note=String(values.note||'').trim();if(!note)throw Error('Escribe una reflexión');
   const images=[...form.querySelector('[name="screenshots"]')?.files||[]];
   if(images.length>3||images.some(f=>f.size>3145728||!['image/png','image/jpeg','image/webp'].includes(f.type)))throw Error('Puedes subir hasta 3 imágenes JPG/PNG/WebP de máximo 3 MB cada una.');
   const {data:entry,error:entryError}=await sb.from('journal_entries').insert({user_id:state.user.id,entry_date:values.entry_date,mood:values.mood,discipline:fd.has('discipline'),note}).select('id').single();
   if(entryError)throw entryError;
   let done=0;
   for(const image of images){
     const ext=image.type==='image/png'?'png':image.type==='image/webp'?'webp':'jpg';
     const path=`${state.user.id}/${entry.id}/${uuid()}.${ext}`;
     const {error:upErr}=await sb.storage.from('edgoria-journal').upload(path,image,{contentType:image.type,upsert:false,cacheControl:'600'});
     if(upErr){await refreshData();throw Error(`La reflexión se guardó, pero falló la carga de la captura ${done+1}. Revisa los permisos del almacenamiento privado.`)}
     const {error:metaErr}=await sb.from('edgoria_journal_attachments').insert({user_id:state.user.id,entry_id:entry.id,storage_path:path,mime_type:image.type});
     if(metaErr){await sb.storage.from('edgoria-journal').remove([path]);await refreshData();throw Error('La reflexión se guardó, pero no fue posible registrar una captura.');}
     done++;
   }
   await refreshData();notify(done?`Reflexión guardada con ${done} captura(s) privadas.`:'Reflexión guardada');return;
 }

}
// Event delegation, only interactive UI data is processed through validated handlers.
document.addEventListener('click',async ev=>{
  const nav=ev.target.closest('[data-view]');if(nav){await guarded(()=>changeView(nav.dataset.view));return}
  const btn=ev.target.closest('[data-action]');if(!btn)return;
  const action=btn.dataset.action;if(action==='outside'&&ev.target!==btn)return;
  await guarded(()=>onAction(action,btn));
});
document.addEventListener('change',ev=>{
 if(ev.target?.matches?.('#mindset-form [name="screenshots"]')){
   const n=ev.target.files?.length||0;const label=$('#eg42-file-status');if(label)label.textContent=n?`${n} captura${n===1?'':'s'} seleccionada${n===1?'':'s'} · se guardarán con la reflexión`:'Ninguna imagen seleccionada';
 }

  if(ev.target.matches('#v4-upload-form input[type="file"]')){
    const file=ev.target.files?.[0], label=$('#v4-selected-file');
    if(label)label.textContent=file?`Seleccionado: ${file.name} (${Math.round(file.size/1024)} KB). Pulsa Importar para procesarlo.`:'No hay ningún archivo seleccionado.';
    if(file)uploadResult=null;
  }
  if(ev.target.id==='account-select'){state.account=ev.target.value;update()}
  if(ev.target.id==='period'){state.period=ev.target.value;if(state.period==='date'&&!isValidDay(state.analysisDate))state.analysisDate=activeTradingDay();update()}
  if(ev.target.id==='eg14-date'&&isValidDay(ev.target.value)){state.analysisDate=ev.target.value;state.period='date';update()}
  if(ev.target.id==='calendar-preset'&&Object.hasOwn(CALENDAR_PRESETS,ev.target.value)){setCalendarPreset(ev.target.value);update()}
  if(ev.target.id==='trading-timezone'&&TIME_ZONES.includes(ev.target.value)){state.timezone=ev.target.value;localStorage.setItem('edgoria_trading_tz_'+state.user?.id,state.timezone);update()}

});
document.addEventListener('input',ev=>{
  if(ev.target.id==='admin-users-search'){const pos=ev.target.selectionStart;state.adminUserQuery=ev.target.value;update();const inp=$('#admin-users-search');if(inp){inp.focus();try{inp.setSelectionRange(pos,pos)}catch{}}return;}
  if(ev.target.id==='search'){const pos=ev.target.selectionStart;state.search=ev.target.value;update();const inp=$('#search');if(inp){inp.focus();inp.setSelectionRange(pos,pos)}}
});
function eg14ShowTooltip(node,ev){
 const host=node.closest('.eg14-equity-host'),tip=host?.querySelector('.eg14-equity-tooltip');if(!host||!tip)return;
 tip.innerHTML=`<strong>${escapeHTML(node.dataset.day)}</strong><span>P&L día: ${usd(Number(node.dataset.daypnl))} · ${eg14Percent(Number(node.dataset.daypnl))}</span><span>Acumulado: ${usd(Number(node.dataset.cumulative))} · ${eg14Percent(Number(node.dataset.cumulative))}</span>${node.dataset.capital?`<span>Capital estimado: ${usd(Number(node.dataset.capital))}</span>`:''}`;
 tip.hidden=false;
 const box=host.getBoundingClientRect(),nodeBox=node.getBoundingClientRect();
 const left=ev?.clientX??nodeBox.left+nodeBox.width/2,top=ev?.clientY??nodeBox.top;
 tip.style.left=Math.max(6,Math.min(box.width-190,left-box.left+12))+'px';tip.style.top=Math.max(6,top-box.top-96)+'px';
}
document.addEventListener('pointermove',ev=>{const el=ev.target.closest?.('.eg14-equity-point');if(el)eg14ShowTooltip(el,ev)});
document.addEventListener('pointerout',ev=>{const el=ev.target.closest?.('.eg14-equity-point');if(el&&!el.contains(ev.relatedTarget)){const tip=el.closest('.eg14-equity-host')?.querySelector('.eg14-equity-tooltip');if(tip)tip.hidden=true}});
document.addEventListener('focusin',ev=>{const el=ev.target.closest?.('.eg14-equity-point');if(el)eg14ShowTooltip(el)});
document.addEventListener('focusout',ev=>{const el=ev.target.closest?.('.eg14-equity-point');if(el){const tip=el.closest('.eg14-equity-host')?.querySelector('.eg14-equity-tooltip');if(tip)tip.hidden=true}});
document.addEventListener('submit',async ev=>{ev.preventDefault();const form=ev.target;if(!form.id)return;await guarded(()=>formSubmit(form))});
// Refresh visible dashboard automatically while not editing a form; MT5 EA pushes via server independently.
let v3RefreshPending=false;
async function pollMt5Dashboard(){
 if(!state.user||!sb||(state.role!=='trader'&&!(state.role==='admin'&&state.personalJournalLoaded))||busy||v3RefreshPending||document.hidden||$('#modal-root')||$('#v4-upload-form input[type=file]')?.files?.length||$('#workspace input:focus, #workspace textarea:focus'))return;
 v3RefreshPending=true;
 try{await loadCloud();update()}catch(e){console.warn('EDGORIA: no se pudo actualizar el historial automáticamente',e?.message||e)}finally{v3RefreshPending=false}
}
setInterval(pollMt5Dashboard,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollMt5Dashboard()});
init();
