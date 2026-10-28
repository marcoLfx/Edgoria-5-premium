import {json,rest,signedIn,filter} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const key=process.env.LEMONSQUEEZY_API_KEY,store=process.env.LEMONSQUEEZY_STORE_ID,variant=process.env.LEMONSQUEEZY_VARIANT_ID;
  if(!key||!/^\d+$/.test(store||'')||!/^\d+$/.test(variant||''))return json({error:'La pasarela todavía no está habilitada. No se realizó ningún cobro.'},503);
  const existing=await rest('edgoria_subscriptions',{query:`user_id=eq.${filter(user.id)}&status=in.(active,trialing)&select=id,current_period_ends_at`});
  if(existing.length)return json({error:'Ya tienes una suscripción activa o en prueba.'},409);
  const result=await fetch('https://api.lemonsqueezy.com/v1/checkouts',{
   method:'POST',headers:{'Accept':'application/vnd.api+json','Content-Type':'application/vnd.api+json',Authorization:`Bearer ${key}`},
   body:JSON.stringify({data:{type:'checkouts',attributes:{checkout_data:{email:user.email,custom:{user_id:user.id}}},relationships:{store:{data:{type:'stores',id:store}},variant:{data:{type:'variants',id:variant}}}}})
  });
  if(!result.ok)return json({error:'No se pudo generar el checkout'},502);
  const created=await result.json();const url=created?.data?.attributes?.url;
  if(typeof url!=='string'||!/^https:\/\/[^/]*lemonsqueezy\.com\//i.test(url))return json({error:'URL de checkout inválida'},502);
  return json({url});
 }catch{return json({error:'No se pudo iniciar la facturación'},500)}
}};
