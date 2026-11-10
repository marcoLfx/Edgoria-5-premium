// EDGORIA 5.9 — Admin calendar and access periods; payment systems are intentionally separate.
import {json,rest} from './supabase.js';
import {requireAdmin,safeError} from './v4-access.js';
const PAGE=500,MAX=10000;
async function paged(table,select,order='created_at.desc'){
  const out=[];
  for(let offset=0;offset<MAX;offset+=PAGE){
    const chunk=await rest(table,{query:`select=${select}&order=${order}&limit=${PAGE}&offset=${offset}`});
    if(!Array.isArray(chunk))throw Error('Respuesta de datos inválida');
    out.push(...chunk);if(chunk.length<PAGE)break;
  }
  return out;
}
export default {async fetch(req){
  if(req.method!=='GET')return json({error:'Método no permitido'},405);
  try{
    const actor=await requireAdmin(req);
    const [profiles,grants,roles]=await Promise.all([
      paged('edgoria_v4_profiles','user_id,full_name,email,email_confirmed_at,country,created_at'),
      paged('edgoria_v4_access_grants','user_id,access_status,updated_at','updated_at.desc'),
      paged('edgoria_v4_roles','user_id,role','user_id.asc')
    ]);
    let periods=[],audit=[],archived=[],calendarReady=false,setupError=null;
    const configured=process.env.EDGORIA_ACCESS_PERIODS_ENABLED==='1';
    if(configured){
      try{
        [periods,audit,archived]=await Promise.all([
          paged('edgoria_access_periods','id,user_id,kind,starts_at,ends_at,status,granted_by,revoked_at,created_at','starts_at.desc'),
          paged('edgoria_admin_access_audit','id,user_id,admin_id,action,access_period_id,occurred_at','occurred_at.desc'),
          paged('edgoria_archived_users','user_id,archived_at,archived_by','archived_at.desc')
        ]);calendarReady=true;
      }catch(err){console.error('EDGORIA 5.9 migration check:',err?.message||'NOT_READY');setupError='Falta instalar o verificar la migración 5.9. Las activaciones están deshabilitadas.';}
    }else{setupError='El calendario de accesos no está habilitado. Instala la migración 5.9 y activa EDGORIA_ACCESS_PERIODS_ENABLED.';}
    const gBy=new Map(grants.map(g=>[g.user_id,g]));const rBy=new Map(roles.map(r=>[r.user_id,r.role]));
    const archivedSet=new Set(archived.map(a=>a.user_id));const now=Date.now();
    const pBy=new Map();for(const p of periods){if(!pBy.has(p.user_id))pBy.set(p.user_id,[]);pBy.get(p.user_id).push(p);}
    const users=profiles.map(p=>{
      const grant=gBy.get(p.user_id)||{},own=pBy.get(p.user_id)||[];
      const live=own.find(x=>x.status==='active'&&Date.parse(x.starts_at)<=now&&Date.parse(x.ends_at)>now)||null;
      const latest=own[0]||null;
      const archivedUser=archivedSet.has(p.user_id);
      return {user_id:p.user_id,full_name:p.full_name||'',email:p.email||'',country:p.country||'',
        email_confirmed:!!p.email_confirmed_at,created_at:p.created_at,
        role:p.user_id===actor.id?'admin':rBy.get(p.user_id)||'trader',
        access_status:grant.access_status||'pending',archived:archivedUser,
        current_period:live,latest_period:latest,
        effective_status:archivedUser?'archived':grant.access_status==='suspended'?'suspended':live?'active':latest?'expired':grant.access_status==='active'?'legacy':'pending'};
    });
    return json({ok:true,admin_user_id:actor.id,access_enabled:configured,calendar_ready:calendarReady,
      setup_error:setupError,users,periods,audit,updated_at:new Date().toISOString(),limited_to:MAX});
  }catch(e){const [body,status]=safeError(e);return json(body,status)}
}};
