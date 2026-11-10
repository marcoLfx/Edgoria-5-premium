import {json,rest,filter} from './supabase.js';
import {userContext} from './v4-user-data.js';
import {safeError} from './v4-access.js';
const ADDRESS='TB5UoKnA1zK5AowiiWH8QUT7DMKcCdUphN';
const enabled=()=>process.env.EDGORIA_PAYMENT_PROOFS_ENABLED==='1';
export default {async fetch(req){
 if(req.method!=='GET')return json({error:'Método no permitido'},405);
 try{
  const {user}=await userContext(req,{allowPending:true});
  const [affiliate,proofs]=await Promise.all([
   rest('edgoria_affiliates',{query:`user_id=eq.${filter(user.id)}&select=id,code,status,rate_basis_points&limit=1`}).catch(()=>[]),
   enabled()?rest('edgoria_payment_proofs',{query:`user_id=eq.${filter(user.id)}&select=id,status,amount_cents,created_at,reviewed_at,review_note&order=created_at.desc&limit=10`}):Promise.resolve([])
  ]);
  return json({ok:true,enabled:enabled(),wallet:ADDRESS,network:'TRC20',price_cents:1099,regular_cents:1499,proofs,affiliate:affiliate[0]||null});
 }catch(err){const [body,status]=safeError(err);return json(body,status)}
}};
