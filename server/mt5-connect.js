import {json,rest,signedIn,filter,sha256,randomToken} from '../server/supabase.js';
import {safeError} from '../server/v4-access.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const body=await req.json();const {account_id,mt5_login,server}=body;
  if(!/^[a-f\d-]{36}$/i.test(String(account_id)) || !/^\d{1,24}$/.test(String(mt5_login)) || typeof server!=='string'||!server.trim()||server.length>150)return json({error:'Datos MT5 inválidos'},400);
  const owner=await rest('accounts',{query:`id=eq.${filter(account_id)}&user_id=eq.${filter(user.id)}&select=id`});
  if(owner?.length!==1)return json({error:'Cuenta no encontrada'},404);
  const existing=await rest('edgoria_mt5_connections',{query:`account_id=eq.${filter(account_id)}&select=id,status`});
  if(existing?.length)return json({error:'Esta ficha ya tiene una vinculación MT5. Si el token fue revocado, utiliza la opción Crear token nuevo. Para otro login MT5 crea otra ficha.'},409);
  const conn=await rest('edgoria_mt5_connections',{method:'POST',prefer:'return=representation',body:{user_id:user.id,account_id,mt5_login:String(mt5_login),server:server.trim()}});
  const token=randomToken();
  try{await rest('edgoria_mt5_tokens',{method:'POST',body:{connection_id:conn[0].id,token_sha256:await sha256(token)}})}catch(e){await rest('edgoria_mt5_connections',{method:'DELETE',query:`id=eq.${filter(conn[0].id)}`});throw e}
  return json({connection_id:conn[0].id,token,endpoint:`${new URL(req.url).origin}/api/mt5-ingest`,message:'Copia el token ahora. No volverá a mostrarse.'},201);
 }catch(e){console.error('MT5 connect error:',e?.code||e?.message||'unknown');const [body,status]=safeError(e);return json(body,status)}
}};
