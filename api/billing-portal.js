import {json,rest,signedIn,filter} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const apiKey=process.env.LEMONSQUEEZY_API_KEY;if(!apiKey)return json({error:'Proveedor de pagos no configurado'},503);
  const subs=await rest('edgoria_subscriptions',{query:`user_id=eq.${filter(user.id)}&provider=eq.lemonsqueezy&select=provider_subscription_id,created_at&order=created_at.desc&limit=1`});
  const id=subs?.[0]?.provider_subscription_id;
  if(!/^\d+$/.test(String(id)))return json({error:'No hay una suscripción administrable'},404);
  const response=await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${id}`,{headers:{'Accept':'application/vnd.api+json',Authorization:`Bearer ${apiKey}`}});
  if(!response.ok)return json({error:'No se pudo consultar la suscripción'},502);
  const data=await response.json(),url=data?.data?.attributes?.urls?.customer_portal;
  if(typeof url!=='string'||!url.startsWith('https://'))return json({error:'Portal no disponible'},502);
  return json({url});
 }catch{return json({error:'No se pudo abrir el portal'},500)}
}};
