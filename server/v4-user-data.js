// EDGORIA 4.0.3: user-scoped endpoints for importing MT5 files.
// No service_role key is needed. Every REST write is authorized by the user's
// own access token and enforced by Supabase RLS; do not reuse this for admin.
import {json} from './supabase.js';

const bad=(message,status,code)=>Object.assign(new Error(message),{status,code});
function publicConfig(){
  const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,'');
  const key=String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'').trim();
  if(!/^https:\/\/[-a-z0-9]+\.supabase\.co$/i.test(url) || !(/^(sb_publishable_[a-zA-Z0-9_-]{12,}|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/.test(key)))
    throw bad('La configuración pública de Supabase no está completa',503,'PUBLIC_CONFIG');
  return {url,key};
}
export async function userContext(req,{allowPending=false}={}){
  const auth=String(req.headers.get('authorization')||'');
  const match=/^Bearer (eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/.exec(auth);
  if(!match)throw bad('Inicia sesión para continuar',401,'AUTH_REQUIRED');
  const {url,key}=publicConfig();
  const headers={apikey:key,Authorization:auth};
  const response=await fetch(`${url}/auth/v1/user`,{headers,cache:'no-store'});
  if(!response.ok)throw bad('La sesión expiró. Vuelve a iniciar sesión',401,'AUTH_REQUIRED');
  const user=await response.json();
  if(!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(String(user?.id||'')))throw bad('Usuario no válido',401,'AUTH_REQUIRED');
  const rest=async (table,{method='GET',query='',body,prefer}={})=>{
    // Table names are hardcoded by the endpoint. Queries are composed from
    // validated user/account/batch IDs; user rows remain RLS protected.
    const response=await fetch(`${url}/rest/v1/${table}${query?'?'+query:''}`,{
      method,headers:{...headers,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
      body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'
    });
    if(!response.ok){
      if(response.status===401)throw bad('Tu sesión ha expirado',401,'AUTH_REQUIRED');
      if(response.status===403)throw bad('No tienes permiso para esta cuenta',403,'FORBIDDEN');
      if(response.status===409)throw bad('Este archivo ya se importó',409,'DUPLICATE');
      // Do not expose PostgREST details (SQL, table names, schema) to the browser.
      console.error('User-scoped Supabase REST failed:',table,method,response.status);
      throw bad('No se pudieron guardar los datos en Supabase. Comprueba la migración RLS de importación.',503,'IMPORT_STORAGE');
    }
    const raw=await response.text();return raw?JSON.parse(raw):null;
  };
  if(!user.email_confirmed_at)throw bad('Confirma primero tu correo electrónico.',403,'EMAIL_UNCONFIRMED');
  // Identity first: an administrator is NOT a paid trader account.
  // Only the verified auth UUID or a server-readable DB role can grant admin status.
  // Never trust JWT user_metadata, a query string, or client-side role flags.
  const adminByUid=user.id===String(process.env.EDGORIA_ADMIN_USER_ID||'');
  const ownRoles=adminByUid?[]:await rest('edgoria_v4_roles',{query:`user_id=eq.${user.id}&select=role&limit=1`});
  const isAdmin=adminByUid||ownRoles?.[0]?.role==='admin';
  if(!isAdmin&&!allowPending){
    const grants=await rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status,trial_ends_at&limit=1`});
    if(grants?.[0]?.access_status==='suspended')throw bad('Esta cuenta está suspendida. Contacta al administrador.',403,'ACCESS_DISABLED');
    if(grants?.[0]?.access_status!=='active')throw bad('Tu correo está confirmado. Falta la aprobación del administrador.',403,'ACCESS_PENDING');
    // 5.9: Payment receipts NEVER determine trader access. Calendar-issued
    // grants are independently authoritative. No cron job is required for expiry:
    // every protected request compares server time against ends_at.
    if(process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'){
      let periods;
      try{periods=await rest('edgoria_access_periods',{
        query:`user_id=eq.${user.id}&select=kind,status,starts_at,ends_at&order=starts_at.desc&limit=100`
      });}catch(err){throw bad('No se pudo verificar el calendario de acceso. Contacta a soporte.',503,'ACCESS_SETUP_REQUIRED');}
      const now=Date.now();
      const permitted=periods.some(p=>p.status==='active'&&Date.parse(p.starts_at)<=now&&Date.parse(p.ends_at)>now);
      // Backwards compatibility: already approved legacy users with no 5.9 period
      // retain access until an administrator assigns them a timed period. This is
      // intentionally visible in the admin overview as "Sin plazo (legado)".
      if(periods.length&&!permitted)throw bad('Tu periodo de acceso terminó. Solicita una nueva activación.',403,'ACCESS_EXPIRED');
      if(!periods.length&&process.env.EDGORIA_LEGACY_ACCESS_ALLOWED==='0')throw bad('El administrador debe asignar tu periodo de acceso.',403,'ACCESS_EXPIRED');
    }
  }

  return {user,rest};
}
