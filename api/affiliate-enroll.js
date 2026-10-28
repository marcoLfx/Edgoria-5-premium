import {json,rest,signedIn,filter} from '../server/supabase.js';
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const user=await signedIn(req);if(!user)return json({error:'Inicia sesión'},401);
  const existing=await rest('edgoria_affiliates',{query:`user_id=eq.${filter(user.id)}&select=id,code,status`});
  if(existing.length)return json({ok:true,affiliate:existing[0]});
  const code=`edg-${user.id.replaceAll('-','').slice(0,12)}`;
  const out=await rest('edgoria_affiliates',{method:'POST',prefer:'return=representation',body:{user_id:user.id,code,status:'pending',rate_basis_points:1500}});
  return json({ok:true,affiliate:out[0],message:'Solicitud recibida. Debe aprobarse antes de recomendar el producto.'});
 }catch{return json({error:'No se pudo inscribir el afiliado'},500)}
}};
