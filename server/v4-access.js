import {rest} from './supabase.js';
import {userContext} from './v4-user-data.js';
export async function requireUser(request){
 const {user}=await userContext(request);
 return user;
}
export async function resolvedRole(user,request){
 if(process.env.EDGORIA_ADMIN_USER_ID && user.id===process.env.EDGORIA_ADMIN_USER_ID)return 'admin';
 // Reading the user's own role is allowed by RLS; never trust client metadata.
 const {rest:scoped}=await userContext(request);
 const rows=await scoped('edgoria_v4_roles',{query:`user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`});
 return rows?.[0]?.role||'trader';
}
export async function requireAdmin(request){
 const user=await requireUser(request);
 if(await resolvedRole(user,request)!=='admin')throw Object.assign(new Error('Acceso restringido'),{status:403,code:'FORBIDDEN'});
 return user;
}
export function safeError(error){
 const status=error?.status||500;
 if(status===401)return [{error:'Inicia sesión para continuar',code:'AUTH_REQUIRED'},401];
 if(status===403)return [{error: String(error.message||'Acceso restringido').slice(0,180),code:error.code||'FORBIDDEN'},403];
 if(status===404)return [{error:'Registro no encontrado',code:'NOT_FOUND'},404];
 if(status===409)return [{error:String(error?.message||'La operación no puede completarse').slice(0,180),code:error?.code||'CONFLICT'},409];
 if(status===400||status===413||status===422)return [{error:String(error.message).slice(0,200),code:error.code||'INVALID_REQUEST'},status];
 if(error?.code==='PUBLIC_CONFIG')return [{error:'Configuración pública de Supabase pendiente',code:'PUBLIC_CONFIG'},503];
 if(error?.code==='IMPORT_STORAGE')return [{error:'No se pudo guardar el archivo. Verifica los permisos de importación',code:'IMPORT_STORAGE'},503];
 if(String(error?.message||'').includes('Configuración privada de Supabase'))return [{error:'Configuración privada del servidor pendiente. Revisa las variables de Vercel.',code:'SERVER_CONFIG'},503];
 return [{error:'La operación falló. Revisa los registros de Vercel.',code:'INTERNAL_ERROR'},500];
}
