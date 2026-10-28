import {json,rest,signedIn,filter,sha256,randomToken} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const {connection_id}=await req.json();if(!/^[a-f\d-]{36}$/i.test(String(connection_id)))return json({error:'Conexión inválida'},400);
  const rows=await rest('edgoria_mt5_connections',{query:`id=eq.${filter(connection_id)}&user_id=eq.${filter(user.id)}&select=id,mt5_login,server,status`});
  if(rows?.length!==1)return json({error:'Conexión no encontrada'},404);
  if(rows[0].status!=='revoked')return json({error:'Primero revoca el token anterior'},409);
  const token=randomToken(),hash=await sha256(token);
  await rest('edgoria_mt5_tokens',{method:'POST',query:'on_conflict=connection_id',prefer:'resolution=merge-duplicates,return=minimal',body:{connection_id,token_sha256:hash}});
  await rest('edgoria_mt5_connections',{method:'PATCH',query:`id=eq.${filter(connection_id)}&user_id=eq.${filter(user.id)}`,body:{status:'active'}});
  return json({token,endpoint:`${new URL(req.url).origin}/api/mt5-ingest`,message:'Token rotado sin perder el historial'});
 }catch(e){console.error('mt5-rotate',String(e?.message||'Error'));return json({error:'No se pudo crear token nuevo. Comprueba la configuración privada de Supabase en Vercel Logs.'},500)}
}};
