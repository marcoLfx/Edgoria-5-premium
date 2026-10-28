import {json,rest,signedIn,filter} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const body=await req.json();const code=String(body.code||'').toLowerCase();
  if(!/^edg-[a-f0-9]{12}$/.test(code))return json({error:'Código inválido'},400);
  const age=Date.now()-Date.parse(user.created_at);
  if(!Number.isFinite(age)||age<0||age>30*24*3600*1000)return json({error:'El referido debe ser un registro reciente'},400);
  const affiliate=await rest('edgoria_affiliates',{query:`code=eq.${filter(code)}&status=eq.active&select=id,user_id`});
  if(affiliate.length!==1||affiliate[0].user_id===user.id)return json({error:'No es un referido válido'},400);
  const existing=await rest('edgoria_referral_attributions',{query:`referred_user_id=eq.${filter(user.id)}&select=id`});
  if(existing.length)return json({ok:true,already_attributed:true});
  // Marketing attribution for new registrations only. One code per user for life.
  await rest('edgoria_referral_attributions',{method:'POST',body:{affiliate_id:affiliate[0].id,referred_user_id:user.id}});
  return json({ok:true});
 }catch{return json({error:'No se pudo aplicar el código'},500)}
}};
