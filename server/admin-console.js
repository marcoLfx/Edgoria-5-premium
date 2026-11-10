// EDGORIA 5.7 — admin-only read model. No MT5 trades, journals or passwords.
import {json,rest} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';

const PAGE=500, MAX=10000;
async function paged(table,select,order='created_at.desc'){
  const out=[];
  for(let offset=0;offset<MAX;offset+=PAGE){
    const result=await rest(table,{query:`select=${select}&order=${order}&limit=${PAGE}&offset=${offset}`});
    if(!Array.isArray(result))throw Error('Respuesta de datos inválida');
    out.push(...result);
    if(result.length<PAGE)break;
  }
  return out;
}
export default {async fetch(req){
  if(req.method!=='GET')return json({error:'Método no permitido'},405);
  try{
    const actor=await requireAdmin(req);
    const [profiles,grants,roles]=await Promise.all([
      paged('edgoria_v4_profiles','user_id,full_name,email,email_confirmed_at,country,created_at'),
      paged('edgoria_v4_access_grants','user_id,access_status,trial_ends_at,updated_at','updated_at.desc'),
      paged('edgoria_v4_roles','user_id,role','user_id.asc')
    ]);
    const roleBy=new Map(roles.map(r=>[r.user_id,r.role]));
    const grantBy=new Map(grants.map(g=>[g.user_id,g]));
    const enabled=process.env.EDGORIA_USDT_MANUAL_ENABLED==='1';
    let subscriptions=[],periods=[],audit=[],calendarReady=false,setupError=null;
    if(enabled){
      try{
        subscriptions=await paged('edgoria_manual_subscriptions','user_id,status,price_usd_cents,starts_at,expires_at,verified_at,updated_at','updated_at.desc');
        audit=await paged('edgoria_manual_payment_audit','id,user_id,admin_id,action,reference,amount_usd_cents,period_end,occurred_at','occurred_at.desc');
        periods=await paged('edgoria_subscription_periods','id,user_id,starts_at,expires_at,amount_usd_cents,payment_reference,verified_by,verified_at,status,revoked_at','starts_at.desc');
        calendarReady=true;
      }catch(e){
        console.error('EDGORIA Admin 5.7 subscription migration:',e?.message||'SCHEMA_MISSING');
        setupError='Falta verificar la migración de suscripciones y calendario en Supabase.';
      }
    }
    const paidBy=new Map(subscriptions.map(s=>[s.user_id,s]));
    const users=profiles.map(p=>{
      const grant=grantBy.get(p.user_id)||{};
      return {
        user_id:p.user_id,full_name:p.full_name||'',email:p.email||'',country:p.country||'',
        email_confirmed:Boolean(p.email_confirmed_at),created_at:p.created_at,
        role:p.user_id===actor.id?'admin':(roleBy.get(p.user_id)||'trader'),
        access_status:grant.access_status||'pending',trial_ends_at:grant.trial_ends_at||null,
        manual_subscription:paidBy.get(p.user_id)||null
      };
    });
    return json({ok:true,admin_user_id:actor.id,manual_enabled:enabled,calendar_ready:calendarReady,setup_error:setupError,
      users,periods,audit,updated_at:new Date().toISOString(),limited_to:MAX});
  }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
