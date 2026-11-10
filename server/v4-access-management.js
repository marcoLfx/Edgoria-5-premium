import {json,rest,filter} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const invalid=(text,status=400)=>Object.assign(new Error(text),{status});
export default {async fetch(req){
  if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
  try{
    const actor=await requireAdmin(req);
    const manualEnabled=process.env.EDGORIA_USDT_MANUAL_ENABLED==='1';
    if(req.method==='GET'){
      const [profiles,grants,roles,applications]=await Promise.all([
        rest('edgoria_v4_profiles',{query:'select=user_id,full_name,email,email_confirmed_at,country,created_at&order=created_at.desc&limit=1000'}),
        rest('edgoria_v4_access_grants',{query:'select=user_id,access_status,trial_ends_at,trial_granted_at,updated_at&limit=1000'}),
        rest('edgoria_v4_roles',{query:'select=user_id,role&limit=1000'}),
        rest('edgoria_v4_partner_applications',{query:'select=id,user_id,status&limit=1000'})
      ]);
      const payments=manualEnabled?await rest('edgoria_manual_subscriptions',{query:'select=user_id,status,price_usd_cents,starts_at,expires_at,verified_at&limit=1000'}):[];
      const payById=new Map(payments.map(p=>[p.user_id,p]));
      const roleById=new Map(roles.map(r=>[r.user_id,r.role]));
      const grantById=new Map(grants.map(g=>[g.user_id,g]));
      const now=Date.now();
      const users=profiles.map(p=>{
        const g=grantById.get(p.user_id);
        return {user_id:p.user_id,full_name:p.full_name,email:p.email||null,email_confirmed:!!p.email_confirmed_at,country:p.country,created_at:p.created_at,role:p.user_id===actor.id?'admin':roleById.get(p.user_id)||'trader',access_status:g?.access_status||'pending',trial_ends_at:g?.trial_ends_at||null,trial_active:!!g?.trial_ends_at&&Date.parse(g.trial_ends_at)>now,manual_subscription:payById.get(p.user_id)||null};
      });
      return json({ok:true,manual_payments_enabled:manualEnabled,users,totals:{paid_active:users.filter(u=>u.manual_subscription?.status==='active'&&Date.parse(u.manual_subscription.expires_at)>now).length,registered:users.length,pending:users.filter(u=>u.access_status==='pending').length,unconfirmed:users.filter(u=>!u.email_confirmed).length,active:users.filter(u=>u.access_status==='active').length,suspended:users.filter(u=>u.access_status==='suspended').length,partners:users.filter(u=>u.role==='partner').length,active_trials:users.filter(u=>u.trial_active&&u.access_status==='active').length,pending_partners:applications.filter(a=>a.status==='pending').length},limited_to:1000});
    }
    const body=await req.json(),userId=String(body.user_id||''),action=String(body.action||'');
    if(!uuid.test(userId)||userId===actor.id)throw invalid('No puedes modificar esta cuenta');
    if(!['activate','suspend','grant-month','revoke-trial','verify-usdt-month','revoke-usdt'].includes(action))throw invalid('Acción no permitida');
    const exists=await rest('edgoria_v4_profiles',{query:`user_id=eq.${filter(userId)}&select=user_id,email_confirmed_at&limit=1`});
    if(exists.length!==1)throw invalid('El usuario no tiene perfil registrado',404);
    if(['activate','grant-month'].includes(action)&&!exists[0].email_confirmed_at)throw invalid('El usuario debe verificar su correo antes de recibir acceso',409);
    const roles=await rest('edgoria_v4_roles',{query:`user_id=eq.${filter(userId)}&select=role&limit=1`});
    if(roles?.[0]?.role==='admin'||userId===process.env.EDGORIA_ADMIN_USER_ID)throw invalid('No se permite administrar a otro administrador',403);
    if(action==='activate'&&manualEnabled){
      const row=await rest('edgoria_manual_subscriptions',{query:`user_id=eq.${filter(userId)}&status=eq.active&select=expires_at&limit=1`});
      if(!row.length||Date.parse(row[0].expires_at)<=Date.now())throw invalid('Verifica primero un pago USDT real desde el panel administrativo.',409);
    }
    if(action==='verify-usdt-month'){
      if(!manualEnabled)throw invalid('Habilita primero el sistema manual USDT en servidor',409);
      if(body.confirmation!=='USDT_RECEIVED_AND_VERIFIED')throw invalid('Confirma el recibo de USDT',400);
      const ref=String(body.payment_reference||'').trim();
      if(!/^[A-Za-z0-9_:/.\-]{8,160}$/.test(ref))throw invalid('Referencia de verificación inválida',400);
      if(!exists[0].email_confirmed_at)throw invalid('Usuario no ha confirmado correo',409);
      const amount=Number(body.amount_cents);
      if(!Number.isInteger(amount)||![1099,1499].includes(amount))throw invalid('Selecciona una tarifa válida para el pago verificado',400);
      // The DB transaction writes an audit entry, activates access and triggers an immutable calendar period.
      await rest('rpc/edgoria_record_usdt_payment',{method:'POST',body:{p_user_id:userId,p_admin_id:actor.id,p_reference:ref,p_amount_cents:amount}});
      return json({ok:true,action,user_id:userId});
    }
    if(action==='revoke-usdt'){
      if(!manualEnabled)throw invalid('Sistema manual USDT no habilitado',409);
      if(body.confirmation!=='REVOKE_MANUAL_PAYMENT')throw invalid('Confirma la revocación',400);
      await rest('rpc/edgoria_revoke_usdt_payment',{method:'POST',body:{p_user_id:userId,p_admin_id:actor.id}});
      return json({ok:true,action,user_id:userId});
    }
    const patch={user_id:userId,updated_by:actor.id,updated_at:new Date().toISOString()};
    if(action==='activate'||action==='suspend')patch.access_status=action==='activate'?'active':'suspended';
    if(action==='grant-month'){
      const start=new Date();const end=new Date(start);const intendedDay=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);const monthLast=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(intendedDay,monthLast));
      patch.trial_granted_at=start.toISOString();patch.trial_ends_at=end.toISOString(); // Do not auto-approve a pending account.
    }
    if(action==='revoke-trial'){patch.trial_ends_at=null;patch.trial_granted_at=null;}
    await rest('edgoria_v4_access_grants',{method:'POST',query:'on_conflict=user_id',prefer:'resolution=merge-duplicates,return=minimal',body:patch});
    return json({ok:true,action,user_id:userId});
  }catch(e){console.error('Access administration:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
