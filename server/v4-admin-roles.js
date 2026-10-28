import {json,rest,filter} from '../server/supabase.js';
import {requireAdmin,safeError} from '../server/v4-access.js';
const validId=x=>/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(String(x));
export default {async fetch(req){
 if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
 try{
  const me=await requireAdmin(req);
  if(req.method==='GET'){
   const [applications,roles,profiles]=await Promise.all([
    rest('edgoria_v4_partner_applications',{query:'select=id,user_id,message,status,created_at&order=created_at.desc&limit=200'}),
    rest('edgoria_v4_roles',{query:'select=user_id,role,assigned_at&order=assigned_at.desc&limit=200'}),
    rest('edgoria_v4_profiles',{query:'select=user_id,full_name,country,created_at&order=created_at.desc&limit=200'})
   ]);
   return json({ok:true,applications,roles,profiles,bootstrap_admin_user:me.id});
  }
  const body=await req.json(),userId=String(body.user_id||''),action=String(body.action||'');
  if(!validId(userId)||userId===me.id)throw Object.assign(new Error('Usuario inválido'),{status:400});
  if(!['approve-partner','reject-partner','set-trader'].includes(action))throw Object.assign(new Error('Acción no permitida'),{status:400});
  const rows=await rest('edgoria_v4_partner_applications',{query:`user_id=eq.${filter(userId)}&select=id,status`});
  if(action!=='set-trader'&&rows.length!==1)throw Object.assign(new Error('No hay solicitud del partner'),{status:400});
  if(action==='approve-partner'){
   await rest('edgoria_v4_roles',{method:'POST',query:'on_conflict=user_id',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:userId,role:'partner'}});
   await rest('edgoria_v4_partner_applications',{method:'PATCH',query:`user_id=eq.${filter(userId)}`,body:{status:'approved',reviewed_at:new Date().toISOString()}});
  }else if(action==='reject-partner')await rest('edgoria_v4_partner_applications',{method:'PATCH',query:`user_id=eq.${filter(userId)}`,body:{status:'rejected',reviewed_at:new Date().toISOString()}});
  else{
   await rest('edgoria_v4_roles',{method:'POST',query:'on_conflict=user_id',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:userId,role:'trader'}});
  }
  return json({ok:true});
 }catch(e){console.error('v4 admin roles:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
