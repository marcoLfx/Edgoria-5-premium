import {json} from './supabase.js';
import {userContext} from './v4-user-data.js';
import {resolvedRole,safeError} from './v4-access.js';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req);
  const [role,profiles,grants,manual]=await Promise.all([
   resolvedRole(user,req),
   rest('edgoria_v4_profiles',{query:`user_id=eq.${user.id}&select=user_id,full_name,country,phone,experience&limit=1`}),
   rest('edgoria_v4_access_grants',{query:`user_id=eq.${user.id}&select=access_status,trial_ends_at&limit=1`}),
   process.env.EDGORIA_USDT_MANUAL_ENABLED==='1'?rest('edgoria_manual_subscriptions',{query:`user_id=eq.${user.id}&select=status,price_usd_cents,expires_at&limit=1`}):Promise.resolve([])
  ]);
  return json({role,profile:profiles[0]||null,access:{...(grants[0]||{access_status:'pending',trial_ends_at:null}),manual_subscription:manual[0]||null}});
 }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
