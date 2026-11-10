/* EDGORIA 5.10 - dedicated email password recovery, never starts the journal. */
const $=id=>document.getElementById(id);
let sb=null,verified=false;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function clearCredentialsFromAddress(){history.replaceState(null,'','/reset-password')}
function callbackInput(url){
 const q=url.searchParams, hash=new URLSearchParams(url.hash.slice(1));
 if(q.get('error')||hash.get('error'))return {error:'Este enlace de recuperación no es válido o ya venció. Solicita uno nuevo desde EDGORIA.'};
 if(q.get('token_hash')&&q.get('type')==='recovery')return {kind:'token_hash',token_hash:q.get('token_hash')};
 if(hash.get('type')==='recovery'&&hash.get('access_token')&&hash.get('refresh_token'))
   return {kind:'implicit',access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')};
 if(q.get('code'))return {kind:'code',code:q.get('code')};
 return {error:'Abre el enlace de recuperación recibido por correo. Si ya expiró, solicita otro desde el inicio de sesión.'};
}
async function importClient(){try{return await import('https://esm.sh/@supabase/supabase-js@2.57.0')}
 catch{return import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm')}}
async function init(){
 // Parse the one-time credentials before creating a Supabase client or reading stored sessions.
 const callback=callbackInput(new URL(location.href));
 if(callback.error){status(callback.error,true);return}
 try{
  const response=await fetch('/api/config',{cache:'no-store'});if(!response.ok)throw Error('La configuración de EDGORIA no está disponible');
  const cfg=await response.json();if(!cfg?.configured)throw Error('La conexión de EDGORIA no está configurada');
  const {createClient}=await importClient();
  sb=createClient(cfg.url,cfg.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
  let result;
  if(callback.kind==='token_hash')result=await sb.auth.verifyOtp({token_hash:callback.token_hash,type:'recovery'});
  else if(callback.kind==='implicit')result=await sb.auth.setSession({access_token:callback.access_token,refresh_token:callback.refresh_token});
  else result=await sb.auth.exchangeCodeForSession(callback.code);
  if(result?.error)throw result.error;
  const who=await sb.auth.getUser();if(who.error||!who.data?.user)throw Error('El enlace no permitió verificar tu cuenta');
  verified=true;clearCredentialsFromAddress();$('form').hidden=false;
  status('Cuenta verificada. Escribe la contraseña nueva y guárdala.');
 }catch(e){clearCredentialsFromAddress();status('No se pudo validar el enlace. Es posible que haya caducado o ya se haya utilizado. Solicita uno nuevo.',true)}
}
document.addEventListener('submit',async e=>{
 if(e.target?.id!=='form')return;e.preventDefault();if(!verified||!sb)return;
 const password=String(e.target.elements.password.value||'');const repeated=String(e.target.elements.confirm.value||'');
 if(password.length<10){status('La contraseña debe tener al menos 10 caracteres.',true);return}
 if(password!==repeated){status('Las contraseñas no coinciden.',true);return}
 const button=e.target.querySelector('button[type=submit]');button.disabled=true;
 try{const {error}=await sb.auth.updateUser({password});if(error)throw error;
  await sb.auth.signOut();verified=false;button.textContent='Contraseña actualizada';e.target.hidden=true;
  status('Contraseña actualizada correctamente. Ya puedes iniciar sesión en EDGORIA.');
  const link=document.querySelector('.other');link.textContent='Ingresar con mi contraseña nueva →';
 }catch(err){status('No se pudo actualizar la contraseña. Solicita un nuevo enlace o vuelve a intentarlo.',true);button.disabled=false}
});
init();
