import {json,rest,filter} from '../server/supabase.js';
import {requireAdmin} from '../server/v4-access.js';
const idRx=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default {async fetch(req){
 if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
 try{
  const user=await requireAdmin(req);
  if(req.method==='GET'){
   const [affiliates,commissions,subscriptions]=await Promise.all([
    rest('edgoria_affiliates',{query:'select=id,code,status,created_at&order=created_at.desc&limit=150'}),
    rest('edgoria_affiliate_commissions',{query:'select=id,affiliate_id,commission_cents,status,created_at&order=created_at.desc&limit=150'}),
    rest('edgoria_subscriptions',{query:'select=id,status,created_at&order=created_at.desc&limit=150'})]);
   return json({ok:true,affiliates,commissions,subscriptions});
  }
  const body=await req.json();
  if(!idRx.test(String(body.id)))return json({error:'Identificador inválido'},400);
  if(body.action==='approve-affiliate'||body.action==='suspend-affiliate'){
   const status=body.action==='approve-affiliate'?'active':'suspended';
   const existing=await rest('edgoria_affiliates',{query:`id=eq.${filter(body.id)}&select=id`});
   if(existing.length!==1)return json({error:'Afiliado no encontrado'},404);
   await rest('edgoria_affiliates',{method:'PATCH',query:`id=eq.${filter(body.id)}`,body:{status}});
   return json({ok:true});
  }
  if(body.action==='approve-commission'){
   const existing=await rest('edgoria_affiliate_commissions',{query:`id=eq.${filter(body.id)}&status=eq.pending&select=id`});
   if(existing.length!==1)return json({error:'Comisión no pendiente'},409);
   await rest('edgoria_affiliate_commissions',{method:'PATCH',query:`id=eq.${filter(body.id)}&status=eq.pending`,body:{status:'approved',approved_at:new Date().toISOString()}});
   return json({ok:true});
  }
  if(body.action==='mark-commission-paid'){
   if(body.confirmation!=='TRANSFER_VERIFIED')return json({error:'Confirma primero el pago externo'},400);
   const existing=await rest('edgoria_affiliate_commissions',{query:`id=eq.${filter(body.id)}&status=eq.approved&select=id`});
   if(existing.length!==1)return json({error:'Comisión no aprobada'},409);
   await rest('edgoria_affiliate_commissions',{method:'PATCH',query:`id=eq.${filter(body.id)}&status=eq.approved`,body:{status:'paid',paid_at:new Date().toISOString()}});
   return json({ok:true});
  }
  return json({error:'Acción desconocida'},400);
 }catch{return json({error:'Error del panel administrativo'},500)}
}};
