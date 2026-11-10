// EDGORIA 5.9 — Admin-issued access is independent of any payment record.
// All writes are executed by protected RPCs; never trust client-submitted time limits.
import {json,rest,filter,deleteAuthUser} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const invalid=(text,status=400)=>Object.assign(new Error(text),{status});
const actions=Object.freeze({
  'grant-trial':'edgoria_grant_manual_access',
  'grant-month':'edgoria_grant_manual_access',
  'suspend':'edgoria_suspend_manual_access',
  'archive-user':'edgoria_archive_user',
  'restore-user':'edgoria_restore_user'
});
export default {async fetch(req){
  if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
  try{
    const actor=await requireAdmin(req);
    if(req.method==='GET')return json({ok:true,admin_user_id:actor.id,manual_access_enabled:process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'});
    const body=await req.json();const action=String(body?.action||'');const userId=String(body?.user_id||'');
    if(action!=='delete-user'&&process.env.EDGORIA_ACCESS_PERIODS_ENABLED!=='1')throw invalid('Activa EDGORIA_ACCESS_PERIODS_ENABLED tras instalar la migración 5.9 en una base de pruebas.',503);
    if(!uuid.test(userId)||userId===actor.id)throw invalid('Cuenta protegida o identificador inválido');
    if(!Object.hasOwn(actions,action)&&action!=='delete-user')throw invalid('Acción no permitida');
    const matches=await rest('edgoria_v4_profiles',{query:`user_id=eq.${filter(userId)}&select=user_id,email,email_confirmed_at&limit=1`});
    if(matches.length!==1)throw invalid('Cuenta no encontrada',404);
    const profile=matches[0];
    const roles=await rest('edgoria_v4_roles',{query:`user_id=eq.${filter(userId)}&select=role&limit=1`});
    if(roles?.[0]?.role==='admin'||userId===String(process.env.EDGORIA_ADMIN_USER_ID||''))throw invalid('No puedes modificar a otro administrador',403);
    if(['grant-trial','grant-month'].includes(action)&&!profile.email_confirmed_at)throw invalid('El usuario primero debe confirmar su correo',409);
    if(action==='archive-user'){
      if(body.confirmation!=='ARCHIVE_USER'||String(body.confirmation_email||'').trim().toLowerCase()!==String(profile.email||'').trim().toLowerCase())
        throw invalid('Para retirar al usuario, confirma su correo exacto',400);
    }
    if(action==='delete-user'){
      if(body.confirmation!=='DELETE_USER'||body.confirmation_phrase!=='ELIMINAR DEFINITIVAMENTE'||String(body.confirmation_email||'').trim().toLowerCase()!==String(profile.email||'').trim().toLowerCase())
        throw invalid('Para eliminar definitivamente, confirma el correo y la frase de seguridad',400);
      // Delete only once Auth admin accepts; never suspend/archive on a failed deletion.
      await deleteAuthUser(userId);
      console.info('EDGORIA ADMIN: user deleted after confirmed request');
      return json({ok:true,action:'delete-user',user_id:userId});
    }
    if(action==='restore-user'&&body.confirmation!=='RESTORE_USER')throw invalid('Confirma la restauración',400);
    const payload=action==='grant-trial'||action==='grant-month'
      ?{p_user_id:userId,p_admin_id:actor.id,p_kind:action==='grant-trial'?'trial':'monthly'}
      :{p_user_id:userId,p_admin_id:actor.id};
    const result=await rest(`rpc/${actions[action]}`,{method:'POST',body:payload});
    return json({ok:true,action,user_id:userId,period_id:action.startsWith('grant-')?result:undefined});
  }catch(e){console.error('EDGORIA 5.9 admin access:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
