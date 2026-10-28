import {json,rest,signedIn,filter} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const {connection_id}=await req.json();if(!/^[a-f\d-]{36}$/i.test(String(connection_id)))return json({error:'Identificador inválido'},400);
  const found=await rest('edgoria_mt5_connections',{query:`id=eq.${filter(connection_id)}&user_id=eq.${filter(user.id)}&select=id`});
  if(found?.length!==1)return json({error:'Conexión no encontrada'},404);
  await rest('edgoria_mt5_connections',{method:'PATCH',query:`id=eq.${filter(connection_id)}&user_id=eq.${filter(user.id)}`,body:{status:'revoked'}});
  await rest('edgoria_mt5_tokens',{method:'DELETE',query:`connection_id=eq.${filter(connection_id)}`});
  return json({ok:true});
 }catch{return json({error:'No se pudo revocar'},500)}
}};
