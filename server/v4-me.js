import {json} from './supabase.js';
import {userContext} from './v4-user-data.js';
import {resolvedRole,safeError} from './v4-access.js';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req);
  const [role,profiles,grants]=await Promise.all([
   resolvedRole(user,req),
   rest('edgoria_v4_profiles',{query:`user_id=eq.${user.id}&select=user_id,full_name,country,phone,experience&limit=1`}),
   rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status,trial_ends_at&limit=1`})
  ]);
  return json({role,profile:profiles[0]||null,access:grants[0]||{access_status:'pending',trial_ends_at:null}});
 }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
