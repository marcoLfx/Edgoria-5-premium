// EDGORIA 6.0: Privileged, read-only by default. Never used for access activation.
import {json,rest,filter} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const enabled=()=>process.env.EDGORIA_AFFILIATES_V60_ENABLED==='1';
const paging=async(table,select,order='created_at.desc')=>{
 const out=[];
 for(let offset=0;offset<5000;offset+=500){
  const chunk=await rest(table,{query:`select=${select}&order=${order}&limit=500&offset=${offset}`});
  if(!Array.isArray(chunk))throw fail('No se pudo cargar registros',503);
  out.push(...chunk);if(chunk.length<500)break;
 }
 return out;
};
const report=async()=>{
 const [partners,refs,sales,commissions,profiles,applications]=await Promise.all([
  paging('edgoria_affiliates','id,user_id,code,status,rate_basis_points,created_at'),
  paging('edgoria_referral_attributions','id,affiliate_id,referred_user_id,attributed_at','attributed_at.desc'),
  paging('edgoria_manual_sales','id,buyer_id,amount_cents,verified_at,created_at'),
  paging('edgoria_partner_commissions','id,sale_id,affiliate_id,rate_basis_points,commission_cents,status,created_at,approved_at,paid_at'),
  paging('edgoria_v4_profiles','user_id,email,full_name,created_at'),
  paging('edgoria_partner_requests','id,user_id,display_name,channel,channel_url,audience_size,motivation,status,created_at,reviewed_at')
 ]);
 return {partners,referrals:refs,sales,commissions,profiles,applications};
};
async function audit(actor,event,target,details={}){
 await rest('edgoria_commercial_audit',{method:'POST',body:{actor_id:actor.id,event,target_id:target,details}});
}
export default {async fetch(request){
 if(!['GET','POST'].includes(request.method))return json({error:'Método no permitido'},405);
 try{
  const actor=await requireAdmin(request);
  if(!enabled())return json({ok:false,setup_required:true,error:'El módulo de afiliados requiere la migración 6.0 y la variable EDGORIA_AFFILIATES_V60_ENABLED.'},503);
  if(request.method==='GET')return json({ok:true,...await report()});
  const body=await request.json();const action=String(body?.action||'');const id=String(body?.id||'');
  if(['approve-application','reject-application'].includes(action)){
   if(!uuid.test(id))throw fail('Solicitud no válida');
   const decision=action==='approve-application'?'approved':'rejected';
   const rate=decision==='approved'?Number(body?.rate_basis_points||2500):2500;
   if(![2500,3000].includes(rate))throw fail('Comisión inválida');
   const result=await rest('rpc/edgoria_review_partner_request',{method:'POST',body:{p_request_id:id,p_admin_id:actor.id,p_decision:decision,p_rate_basis_points:rate}});
   return json({ok:true,decision,referral_code:decision==='approved'?result:null,access_granted:false});
  }
  if(action==='verify-sale'){
   const buyer=String(body?.buyer_id||'');const cents=Number(body?.amount_cents);
   const reference=String(body?.payment_reference||'').trim();
   if(!uuid.test(buyer)||buyer===actor.id)throw fail('Comprador inválido');
   if(![1099,1499].includes(cents))throw fail('Precio del plan inválido');
   if(!/^[a-zA-Z0-9_.:-]{10,128}$/.test(reference))throw fail('Referencia de verificación inválida');
   if(body?.confirmation!=='VERIFIQUE_EL_PAGO')throw fail('Confirma que verificaste el pago por separado');
   const saleId=await rest('rpc/edgoria_verify_manual_sale',{method:'POST',body:{p_buyer_id:buyer,p_admin_id:actor.id,p_amount_cents:cents,p_reference:reference}});
   return json({ok:true,sale_id:saleId,access_granted:false});
  }
  if(!uuid.test(id))throw fail('Identificador inválido');
  if(['approve-affiliate','suspend-affiliate','set-rate'].includes(action)){
   const current=await rest('edgoria_affiliates',{query:`id=eq.${filter(id)}&select=id,user_id,status,rate_basis_points&limit=1`});
   if(current.length!==1)throw fail('Afiliado no encontrado',404);
   if(current[0].user_id===actor.id)throw fail('No puedes administrar tu propio programa de referidos',403);
   let update,event;
   if(action==='approve-affiliate'){update={status:'active'};event='affiliate_approved'}
   else if(action==='suspend-affiliate'){update={status:'suspended'};event='affiliate_suspended'}
   else {
    const rate=Number(body?.rate_basis_points);
    if(![2500,3000].includes(rate))throw fail('La comisión debe ser 25% o 30%');
    update={rate_basis_points:rate};event='rate_changed';
   }
   await rest('edgoria_affiliates',{method:'PATCH',query:`id=eq.${filter(id)}`,body:update});
   await audit(actor,event,id,action==='set-rate'?{rate_basis_points:update.rate_basis_points}:{});
   return json({ok:true,action});
  }
  if(['approve-commission','mark-commission-paid','reject-commission'].includes(action)){
   const target=action==='approve-commission'?'pending':'approved';
   const final=action==='approve-commission'?'approved':action==='mark-commission-paid'?'paid':'rejected';
   if(action==='mark-commission-paid'&&body?.confirmation!=='TRANSFER_VERIFIED')throw fail('Confirma que la comisión ya fue enviada externamente');
   const rows=await rest('edgoria_partner_commissions',{query:`id=eq.${filter(id)}&status=eq.${target}&select=id&limit=1`});
   if(rows.length!==1)throw fail('La comisión no está en el estado requerido',409);
   const patch={status:final,...(final==='approved'?{approved_by:actor.id,approved_at:new Date().toISOString()}:{}) ,...(final==='paid'?{paid_by:actor.id,paid_at:new Date().toISOString()}:{})};
   await rest('edgoria_partner_commissions',{method:'PATCH',query:`id=eq.${filter(id)}&status=eq.${target}`,body:patch});
   await audit(actor,final==='approved'?'commission_approved':final==='paid'?'commission_paid':'commission_rejected',id);
   return json({ok:true,action});
  }
  throw fail('Acción no permitida');
 }catch(err){console.error('EDGORIA commercial admin:',err?.code||err?.message||'unknown');const [data,status]=safeError(err);return json(data,status)}
}};
