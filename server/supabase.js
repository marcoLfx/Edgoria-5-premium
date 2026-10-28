// Server-only functions. Never import into public/app.js.
export const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function env(){
 // Prefer valid URLs/keys rather than a stale environment variable.
 const urls=[process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_URL]
   .map(value=>String(value||'').trim().replace(/\/$/,''));
 const url=urls.find(value=>/^https:\/\/[-a-z0-9]+\.supabase\.co$/i.test(value));
 const rawKeys=[process.env.SUPABASE_SECRET_KEY,process.env.SUPABASE_SERVICE_ROLE_KEY];
 const keys=rawKeys.map(value=>String(value||'').trim());
 const key=keys.find(value=>/^sb_secret_[A-Za-z0-9_-]{12,}$/.test(value)
   || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value));
 if(!url||!key){
  // Never log actual URLs or credentials. Only diagnostic booleans.
  console.error('EDGORIA_PRIVATE_ENV_CHECK',{
   environment:String(process.env.VERCEL_ENV||'unknown'),
   publicUrlPresent:Boolean(urls[0]),
   alternateUrlPresent:Boolean(urls[1]),
   validUrl:Boolean(url),
   secretKeyPresent:Boolean(keys[0]),
   serviceRoleKeyPresent:Boolean(keys[1]),
   validPrivateKeyFormat:Boolean(key)
  });
  throw new Error('Configuración privada de Supabase incompleta');
 }
 return {url,key};
}

export async function rest(table,{method='GET',query='',body,prefer}={}){
 const {url,key}=env();
 const res=await fetch(`${url}/rest/v1/${table}${query?`?${query}`:''}`,{
  method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)
 });
 if(!res.ok)throw Error(`Error seguro de base de datos (${res.status})`);
 const raw=await res.text();return raw?JSON.parse(raw):null;
}
export async function signedIn(request){
 const bearer=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._~-]{30,}$/.test(bearer)) return null;
 const {url,key}=env();
 const res=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:bearer}});
 if(!res.ok)return null; const user=await res.json();
 return typeof user?.id==='string'&&/^[a-f\d-]{36}$/i.test(user.id)?user:null;
}
export const filter=(v)=>encodeURIComponent(String(v));
export async function sha256(value){const bytes=value instanceof Uint8Array?value:new TextEncoder().encode(String(value));const out=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(out)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function randomToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');}
