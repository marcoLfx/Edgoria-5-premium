import {json} from '../server/supabase.js';
import {userContext} from '../server/v4-user-data.js';
import {safeError} from '../server/v4-access.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const channels=new Set(['youtube','tiktok','instagram','community','education','website','other']);
export default {async fetch(req){
 if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req,{allowPending:true});
  const existing=await rest('edgoria_partner_requests',{query:`user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,display_name,channel,channel_url,audience_size,motivation,status,created_at,reviewed_at&limit=1`});
  if(req.method==='GET')return json({ok:true,application:existing?.[0]||null});
  if(existing.length)return json({ok:true,application:existing[0],message:'Tu solicitud ya existe.'});
  const body=await req.json().catch(()=>{throw fail('Formulario inválido')});
  const name=String(body?.display_name||'').trim();
  const channel=String(body?.channel||'').trim().toLowerCase();
  const channelUrl=String(body?.channel_url||'').trim();
  const audience=Number(body?.audience_size);
  const motivation=String(body?.motivation||'').trim();
  if(name.length<3||name.length>120)throw fail('Indica tu nombre o marca (3 a 120 caracteres)');
  if(!channels.has(channel))throw fail('Selecciona tu canal principal');
  if(channelUrl.length>220||channelUrl&&!/^https:\/\/[a-z0-9.-]+(?:[/?#][^\s]*)?$/i.test(channelUrl))throw fail('El enlace de tu canal debe comenzar con https://');
  if(!Number.isSafeInteger(audience)||audience<0||audience>100000000)throw fail('Introduce una audiencia aproximada válida');
  if(motivation.length<40||motivation.length>1500)throw fail('Describe cómo recomendarías EDGORIA (40 a 1500 caracteres)');
  const row={user_id:user.id,display_name:name,channel,channel_url:channelUrl||null,audience_size:audience,motivation,status:'pending'};
  const created=await rest('edgoria_partner_requests',{method:'POST',prefer:'return=representation',body:row});
  return json({ok:true,application:created?.[0]||row,message:'Solicitud enviada. El administrador la revisará.'},201);
 }catch(err){console.error('EDGORIA partner apply',err?.code||err?.status||'unknown');const [data,status]=safeError(err);return json(data,status)}
}};
