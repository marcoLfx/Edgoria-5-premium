import {json} from './supabase.js';
import {userContext} from './v4-user-data.js';
import {resolvedRole,safeError} from './v4-access.js';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req,{allowPending:true});
  const role=await resolvedRole(user,req,rest);
  const [profiles,grants,periods]=await Promise.all([
   rest('edgoria_v4_profiles',{query:`user_id=eq.${user.id}&select=user_id,full_name,country,phone,experience&limit=1`}),
   rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status,trial_ends_at&limit=1`}),
   process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'&&role!=='admin'
    ?rest('edgoria_access_periods',{query:`user_id=eq.${user.id}&select=kind,status,starts_at,ends_at&order=starts_at.desc&limit=100`})
    :Promise.resolve([])
  ]);
  const now=Date.now();
  const current=periods.find(p=>p.status==='active'&&Date.parse(p.starts_at)<=now&&Date.parse(p.ends_at)>now)||null;
  const grant=grants[0]||{access_status:'pending',trial_ends_at:null};
  const archivedStatus=role!=='admin'&&grant.access_status==='suspended'?'suspended':null;
  const expiredStatus=role!=='admin'&&process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'&&periods.length>0&&!current?'expired':null;
  const legacyDisabled=role!=='admin'&&process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'&&!periods.length&&process.env.EDGORIA_LEGACY_ACCESS_ALLOWED==='0';
  const allowed=role==='admin'||(!archivedStatus&&!expiredStatus&&!legacyDisabled&&grant.access_status==='active');
  return json({role,allowed,eligibility_status:role==='admin'?'admin':archivedStatus||expiredStatus||(legacyDisabled?'expired':grant.access_status),profile:profiles[0]||null,access:{...grant,current_period:current,manual_subscription:null}});
 }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
