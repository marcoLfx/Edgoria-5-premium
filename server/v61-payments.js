// Private payment evidence review. Never grants journal access or pays affiliate commissions.
import {json,rest,filter} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const enabled=()=>process.env.EDGORIA_PAYMENT_PROOFS_ENABLED==='1';
const bad=(message,status=400,code='INVALID_REQUEST')=>Object.assign(new Error(message),{status,code});
function privateEnv(){
 const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
 if(!/^https:\/\/[-a-z0-9]+\.supabase\.co$/i.test(url)||!(/^(sb_secret_|eyJ)/.test(key)))throw bad('Configuración privada pendiente',503,'SERVER_CONFIG');
 return {url,key};
}
export default {async fetch(req){
 const route=new URL(req.url).searchParams.get('route');
 if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido'},405);
 try{
  const admin=await requireAdmin(req);
  if(!enabled())return json({error:'Activa la migración de comprobantes y EDGORIA_PAYMENT_PROOFS_ENABLED',setup_required:true},503);
  if(route==='payment-image'){
   if(req.method!=='GET')throw bad('Método no permitido',405);
   const id=new URL(req.url).searchParams.get('id')||'';
   if(!uuid.test(id))throw bad('Comprobante inválido');
   const rows=await rest('edgoria_payment_proofs',{query:`id=eq.${filter(id)}&select=object_path&limit=1`});
   if(!rows?.[0])throw bad('Comprobante no encontrado',404);
   const {url,key}=privateEnv();const object=rows[0].object_path;
   if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(object))throw bad('Ruta no válida');
   const response=await fetch(`${url}/storage/v1/object/edgoria-payment-proofs/${object}`,{headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})},cache:'no-store'});
   if(!response.ok)throw bad('No se pudo abrir la imagen privada',502,'STORAGE_ERROR');
   const mime=response.headers.get('content-type')||'';
   if(!['image/png','image/jpeg','image/webp'].includes(mime.split(';')[0]))throw bad('Archivo no válido',415,'INVALID_CONTENT');
   const bytes=await response.arrayBuffer();if(bytes.byteLength>3145728)throw bad('Imagen demasiado grande',413);
   return new Response(bytes,{status:200,headers:{'Content-Type':mime,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(req.method==='GET'){
   const proofs=await rest('edgoria_payment_proofs',{query:'select=id,user_id,amount_cents,network,status,created_at,reviewed_at,review_note,transaction_reference&order=created_at.desc&limit=250'});
   return json({ok:true,proofs});
  }
  const body=await req.json();const id=String(body.id||'');const action=String(body.action||'');
  if(!uuid.test(id)||!['verify','reject'].includes(action))throw bad('Acción inválida');
  const next=action==='verify'?'verified':'rejected';
  const note=String(body.note||'').trim().slice(0,400);
  if(action==='reject'&&note.length<5)throw bad('Indica brevemente por qué se rechazó el comprobante');
  await rest('rpc/edgoria_review_payment_proof',{method:'POST',body:{p_proof_id:id,p_admin_id:admin.id,p_status:next,p_note:note||null}});
  return json({ok:true,status:next,access_granted:false,commission_created:false});
 }catch(err){const [body,status]=safeError(err);return json(body,status)}
}};
