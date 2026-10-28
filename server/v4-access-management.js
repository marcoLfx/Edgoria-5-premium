import {json,rest,filter} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const invalid=(text,status=400)=>Object.assign(new Error(text),{status});
export default {async fetch(req){
  if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
  try{
    const actor=await requireAdmin(req);
    if(req.method==='GET'){
      const [profiles,grants,roles,applications]=await Promise.all([
        rest('edgoria_v4_profiles',{query:'select=user_id,full_name,email,email_confirmed_at,country,created_at&order=created_at.desc&limit=1000'}),
        rest('edgoria_v4_access_grants',{query:'select=user_id,access_status,trial_ends_at,trial_granted_at,updated_at&limit=1000'}),
        rest('edgoria_v4_roles',{query:'select=user_id,role&limit=1000'}),
        rest('edgoria_v4_partner_applications',{query:'select=id,user_id,status&limit=1000'})
      ]);
      const roleById=new Map(roles.map(r=>[r.user_id,r.role]));
      const grantById=new Map(grants.map(g=>[g.user_id,g]));
      const now=Date.now();
      const users=profiles.map(p=>{
        const g=grantById.get(p.user_id);
        return {user_id:p.user_id,full_name:p.full_name,email:p.email||null,email_confirmed:!!p.email_confirmed_at,country:p.country,created_at:p.created_at,role:p.user_id===actor.id?'admin':roleById.get(p.user_id)||'trader',access_status:g?.access_status||'pending',trial_ends_at:g?.trial_ends_at||null,trial_active:!!g?.trial_ends_at&&Date.parse(g.trial_ends_at)>now};
      });
      return json({ok:true,users,totals:{registered:users.length,pending:users.filter(u=>u.access_status==='pending').length,unconfirmed:users.filter(u=>!u.email_confirmed).length,active:users.filter(u=>u.access_status==='active').length,suspended:users.filter(u=>u.access_status==='suspended').length,partners:users.filter(u=>u.role==='partner').length,active_trials:users.filter(u=>u.trial_active&&u.access_status==='active').length,pending_partners:applications.filter(a=>a.status==='pending').length},limited_to:1000});
    }
    const body=await req.json(),userId=String(body.user_id||''),action=String(body.action||'');
    if(!uuid.test(userId)||userId===actor.id)throw invalid('No puedes modificar esta cuenta');
    if(!['activate','suspend','grant-month','revoke-trial'].includes(action))throw invalid('Acción no permitida');
    const exists=await rest('edgoria_v4_profiles',{query:`user_id=eq.${filter(userId)}&select=user_id,email_confirmed_at&limit=1`});
    if(exists.length!==1)throw invalid('El usuario no tiene perfil registrado',404);
    if(['activate','grant-month'].includes(action)&&!exists[0].email_confirmed_at)throw invalid('El usuario debe verificar su correo antes de recibir acceso',409);
    const roles=await rest('edgoria_v4_roles',{query:`user_id=eq.${filter(userId)}&select=role&limit=1`});
    if(roles?.[0]?.role==='admin'||userId===process.env.EDGORIA_ADMIN_USER_ID)throw invalid('No se permite administrar a otro administrador',403);
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
