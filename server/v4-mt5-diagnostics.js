import {json} from '../server/supabase.js';
import {userContext} from '../server/v4-user-data.js';
import {safeError} from '../server/v4-access.js';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req);
  const [accounts,conn]=await Promise.all([
   rest('accounts',{query:`user_id=eq.${user.id}&select=id&limit=100`}),
   rest('edgoria_mt5_connections',{query:`user_id=eq.${user.id}&select=id&limit=100`})
  ]);
  return json({ok:true,authentication:'Validada',database:'Lectura correcta',accounts:accounts.length,connections:conn.length,message:'La API reconoce tu sesión y consulta Supabase. Si al crear MT5 falla, revisa el código de error devuelto por la función y su línea correspondiente en Vercel Logs.'});
 }catch(e){console.error('v4 MT5 diagnostic:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
