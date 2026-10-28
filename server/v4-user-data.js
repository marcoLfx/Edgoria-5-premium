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
export async function userContext(req){
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
  const grants=await rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status&limit=1`});
  if(grants?.[0]?.access_status==='suspended')throw bad('Esta cuenta está suspendida. Contacta al administrador.',403,'ACCESS_DISABLED');
  if(grants?.[0]?.access_status!=='active')throw bad('Tu correo está confirmado. Falta la aprobación del administrador.',403,'ACCESS_PENDING');
  return {user,rest};
}
