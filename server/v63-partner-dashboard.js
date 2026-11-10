// EDGORIA 6.3 — Partner portal. Only authenticated user's own aggregate data.
// Uses server-only Supabase credentials. Never returns referrals' identities.
import {json,rest,signedIn,filter} from './supabase.js';
import {safeError} from './v4-access.js';

const enabled=()=>process.env.EDGORIA_AFFILIATES_V60_ENABLED==='1';
const paginationLimit=5000;
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

async function rows(table,query,sort='created_at.desc'){
 const all=[];
 for(let offset=0;offset<paginationLimit;offset+=250){
  const current=await rest(table,{query:`${query}&order=${sort}&limit=250&offset=${offset}`});
  if(!Array.isArray(current))throw new Error('Respuesta no válida de la base de datos');
  all.push(...current);
  if(current.length<250)break;
 }
 return {data:all,truncated:all.length>=paginationLimit};
}

export function summarizeAffiliateData(affiliate,referrals,commissions){
 const sums={pending:0,approved:0,paid:0,rejected:0};
 const counts={pending:0,approved:0,paid:0,rejected:0};
 const events=new Map();
 for(const r of referrals){
  const day=String(r.attributed_at||'').slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(day))events.set(day,(events.get(day)||0)+1);
 }
 for(const c of commissions){
  const status=String(c.status||'');
  if(!Object.hasOwn(sums,status))continue;
  const cents=Number(c.commission_cents);
  if(!Number.isSafeInteger(cents)||cents<0)continue;
  sums[status]+=cents;counts[status]++;
 }
 const total=sums.pending+sums.approved+sums.paid;
 return {
  approved:affiliate?.status==='active',
  code:affiliate?.status==='active'?affiliate.code:null,
  rate_basis_points:affiliate?.rate_basis_points||0,
  referrals_total:referrals.length,
  first_sales_verified:commissions.length,
  conversion_pct:referrals.length?Math.round(commissions.length/referrals.length*1000)/10:0,
  commission_cents:sums,
  commission_counts:counts,
  total_commission_cents:total,
  referral_days:[...events].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30).map(([day,count])=>({day,count})),
  commission_history:[...commissions]
    .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))
    .slice(0,40)
    .map(c=>({id:c.id,status:c.status,commission_cents:c.commission_cents,
      created_at:c.created_at,approved_at:c.approved_at,paid_at:c.paid_at}))
 };
}

export default {async fetch(request){
 if(request.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(request);
  if(!user||!uuid.test(user.id))return json({error:'Inicia sesión'},401);
  if(!enabled())return json({error:'El programa de afiliados no está configurado',code:'AFFILIATE_SETUP'},503);
  const affiliated=await rest('edgoria_affiliates',{
   query:`user_id=eq.${filter(user.id)}&select=id,code,status,rate_basis_points&limit=1`
  });
  if(!Array.isArray(affiliated)||affiliated.length===0){
   return json({ok:true,approved:false,referrals_total:0,first_sales_verified:0,
     commission_cents:{pending:0,approved:0,paid:0,rejected:0},commission_history:[],referral_days:[]});
  }
  const affiliate=affiliated[0];
  if(!uuid.test(affiliate.id))throw new Error('Identificador inválido');
  // Even suspended partners retain access to their own historical figures,
  // but their referral link is only active when the partner is approved.
  const [referrals,commissions]=await Promise.all([
   rows('edgoria_referral_attributions',`affiliate_id=eq.${filter(affiliate.id)}&select=attributed_at`,'attributed_at.desc'),
   rows('edgoria_partner_commissions',
    `affiliate_id=eq.${filter(affiliate.id)}&select=id,status,commission_cents,created_at,approved_at,paid_at`)
  ]);
  return json({ok:true,...summarizeAffiliateData(affiliate,referrals.data,commissions.data),
    historical_limit_reached:referrals.truncated||commissions.truncated});
 }catch(error){
  console.error('EDGORIA_PARTNER_DASHBOARD',String(error?.code||'READ_ERROR').slice(0,40));
  const [message,status]=safeError(error);
  return json(message,status);
 }
}};
