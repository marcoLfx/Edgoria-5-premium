import {json} from './supabase.js';
import {userContext} from './v4-user-data.js';
import {resolvedRole,safeError} from './v4-access.js';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req);
  const role=await resolvedRole(user,req);
  const [profiles,grants,periods]=await Promise.all([
   rest('edgoria_v4_profiles',{query:`user_id=eq.${user.id}&select=user_id,full_name,country,phone,experience&limit=1`}),
   rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status,trial_ends_at&limit=1`}),
   process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1'&&role!=='admin'
    ?rest('edgoria_access_periods',{query:`user_id=eq.${user.id}&select=kind,status,starts_at,ends_at&order=starts_at.desc&limit=100`})
    :Promise.resolve([])
  ]);
  const now=Date.now();
  const current=periods.find(p=>p.status==='active'&&Date.parse(p.starts_at)<=now&&Date.parse(p.ends_at)>now)||null;
  return json({role,profile:profiles[0]||null,access:{...(grants[0]||{access_status:'pending',trial_ends_at:null}),current_period:current,manual_subscription:null}});
 }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
