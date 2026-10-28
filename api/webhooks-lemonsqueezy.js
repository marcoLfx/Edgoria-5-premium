import {json,rest,sha256,filter} from '../server/supabase.js';
const statuses={active:'active',on_trial:'trialing',past_due:'past_due',paused:'paused',cancelled:'canceled',expired:'expired',unpaid:'past_due'};
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
async function signatureValid(raw,signature,secret){
 if(!/^[0-9a-f]{64}$/i.test(signature||'')||!secret)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const arr=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)));
 const signed=arr.map(x=>x.toString(16).padStart(2,'0')).join('');let bad=0;for(let i=0;i<64;i++)bad|=signed.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);return bad===0;
}
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const secret=process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
 if(!secret)return json({error:'Webhooks no configurados'},503);
 const raw=await req.text();if(raw.length>500000)return json({error:'Límite excedido'},413);
 if(!await signatureValid(raw,req.headers.get('x-signature'),secret))return json({error:'Firma inválida'},401);
 try{
  const event=JSON.parse(raw),type=event.meta?.event_name||'',attrs=event.data?.attributes||{},objId=String(event.data?.id||'');
  const eventId=await sha256(raw);
  const receipt=await rest('edgoria_webhook_receipts',{query:`event_id=eq.${filter(eventId)}&select=processed_at`});
  if(receipt?.[0]?.processed_at)return json({ok:true,duplicate:true});
  if(!receipt?.length)await rest('edgoria_webhook_receipts',{method:'POST',body:{event_id:eventId,event_type:String(type).slice(0,90)}});
  if(!objId||!type.startsWith('subscription_')){
   await rest('edgoria_webhook_receipts',{method:'PATCH',query:`event_id=eq.${filter(eventId)}`,body:{processed_at:new Date().toISOString()}});
   return json({ok:true,ignored:true});
  }
  const requested=event.meta?.custom_data?.user_id;
  const existing=await rest('edgoria_subscriptions',{query:`provider_subscription_id=eq.${filter(type==='subscription_payment_success'||type==='subscription_payment_refunded'?attrs.subscription_id:objId)}&select=id,user_id,last_provider_event_at`});
  const userId=existing[0]?.user_id||requested;
  if(!isUuid(userId))return json({error:'No se ha podido identificar una suscripción local'},422);
  if(type==='subscription_created'||type==='subscription_updated'||type==='subscription_cancelled'||type==='subscription_expired'||type==='subscription_resumed'||type==='subscription_paused'||type==='subscription_unpaused'){
   if(String(attrs.variant_id)!==String(process.env.LEMONSQUEEZY_VARIANT_ID))return json({error:'Variante de plan desconocida'},422);
   const eventAt=attrs.updated_at||attrs.created_at||new Date().toISOString();
   const older=existing[0]?.last_provider_event_at&&Date.parse(eventAt)<Date.parse(existing[0].last_provider_event_at);
   if(!older){
    const ends=attrs.ends_at||attrs.renews_at||null;
    const status=statuses[attrs.status]||'incomplete';
    const record={user_id:userId,plan_code:'edgoria_monthly',provider:'lemonsqueezy',provider_subscription_id:objId,provider_customer_id:String(attrs.customer_id||''),status,
      cancel_at_period_end:status==='canceled',current_period_ends_at:ends,trial_ends_at:attrs.trial_ends_at||null,last_provider_event_at:eventAt};
    await rest('edgoria_subscriptions',{method:'POST',query:'on_conflict=provider_subscription_id',prefer:'resolution=merge-duplicates,return=minimal',body:record});
   }
  }
  if(type==='subscription_payment_success'){
   const subscriptionId=String(attrs.subscription_id||'');
   const subs=await rest('edgoria_subscriptions',{query:`provider_subscription_id=eq.${filter(subscriptionId)}&select=id,user_id`});
   if(subs.length!==1)return json({error:'Suscripción todavía no sincronizada. Reintentar.'},422);
   if(attrs.currency!=='USD'||!Number.isSafeInteger(Number(attrs.total))||Number(attrs.total)<0)return json({error:'Importe o moneda no admitidos'},422);
   const amount=Number(attrs.total);const invoice={user_id:subs[0].user_id,subscription_id:subs[0].id,provider:'lemonsqueezy',provider_transaction_id:objId,amount_cents:amount,currency:'USD',status:'paid',paid_at:attrs.created_at||new Date().toISOString()};
   await rest('edgoria_invoices',{method:'POST',query:'on_conflict=provider,provider_transaction_id',prefer:'resolution=ignore-duplicates,return=minimal',body:invoice});
   const inv=await rest('edgoria_invoices',{query:`provider=eq.lemonsqueezy&provider_transaction_id=eq.${filter(objId)}&select=id`});
   const refer=await rest('edgoria_referral_attributions',{query:`referred_user_id=eq.${filter(subs[0].user_id)}&select=id,affiliate_id,first_paid_at`});
   if(refer.length&&amount>0){
    const affiliate=await rest('edgoria_affiliates',{query:`id=eq.${filter(refer[0].affiliate_id)}&status=eq.active&select=id,user_id`});
    if(affiliate.length&&affiliate[0].user_id!==subs[0].user_id){
     const invoices=await rest('edgoria_invoices',{query:`user_id=eq.${filter(subs[0].user_id)}&status=eq.paid&order=paid_at.asc&limit=20&select=id`});
     const index=invoices.findIndex(x=>x.id===inv[0]?.id)+1;
     if(index>=1&&index<=12){
      await rest('edgoria_affiliate_commissions',{method:'POST',query:'on_conflict=invoice_id',prefer:'resolution=ignore-duplicates,return=minimal',body:{affiliate_id:affiliate[0].id,invoice_id:inv[0].id,commission_cents:Math.round(amount*.15),eligible_payment_number:index,status:'pending'}});
     }
    }
   }
  }
  if(type==='subscription_payment_refunded'){
   const payments=await rest('edgoria_invoices',{query:`provider=eq.lemonsqueezy&provider_transaction_id=eq.${filter(objId)}&select=id`});
   if(payments.length){await rest('edgoria_invoices',{method:'PATCH',query:`id=eq.${filter(payments[0].id)}`,body:{status:'refunded'}});await rest('edgoria_affiliate_commissions',{method:'PATCH',query:`invoice_id=eq.${filter(payments[0].id)}&status=in.(pending,approved)`,body:{status:'reversed'}})}
  }
  await rest('edgoria_webhook_receipts',{method:'PATCH',query:`event_id=eq.${filter(eventId)}`,body:{processed_at:new Date().toISOString()}});
  return json({ok:true});
 }catch{return json({error:'Evento válido recibido pero falló el procesamiento; reintentar.'},500)}
}};
