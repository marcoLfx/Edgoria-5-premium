import {json,filter} from '../server/supabase.js';
import {userContext} from '../server/v4-user-data.js';
import {safeError} from '../server/v4-access.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req),data=await req.json(),id=String(data.batch_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))throw Object.assign(new Error('Archivo no válido'),{status:400});
  const batch=await rest('edgoria_v4_import_batches',{query:`id=eq.${filter(id)}&user_id=eq.${filter(user.id)}&select=id`});
  if(batch.length!==1)throw Object.assign(new Error('Archivo no encontrado'),{status:403});
  await rest('edgoria_v4_import_batches',{method:'DELETE',query:`id=eq.${filter(id)}&user_id=eq.${filter(user.id)}`});
  return json({ok:true,removed:true,message:'Archivo y posiciones asociadas eliminadas. Las posiciones recibidas por Bridge permanecen intactas.'});
 }catch(e){console.error('v4 file delete:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
