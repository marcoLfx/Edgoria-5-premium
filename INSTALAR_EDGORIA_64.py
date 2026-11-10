#!/usr/bin/env python3
"""EDGORIA 6.4 minimal, transactional patch: modifies exactly three existing files,
then copies one CSS file. No Supabase commands, secrets, or deployment actions.
Usage: python INSTALAR_EDGORIA_64.py C:/Users/.../edgoria-premium
"""
from pathlib import Path
import sys, shutil, datetime, tempfile

ROOT=Path(__file__).resolve().parent
CSS=(ROOT/'public'/'edgoria64.css').read_bytes()
TEST=(ROOT/'tests'/'v64-affiliate-sync.test.js').read_bytes()
SIGNAL_READY='<span class="eg64-integration-signal ready" role="img" aria-label="MetaTrader 5 disponible"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4.5 12.2 4.6 4.5 10.5-10.7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></span>'
SIGNAL_SOON='<span class="eg64-integration-signal soon" role="img" aria-label="cTrader próximamente"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3h12M6 21h12M7 3v4c0 2 2 4 5 5-3 1-5 3-5 5v4m10-18v4c0 2-2 4-5 5 3 1 5 3 5 5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></span>'

def replace_once(text, old, new, filename):
    count=text.count(old)
    if count!=1:raise RuntimeError(f'{filename}: se esperaba una coincidencia exacta (encontradas {count}). No se cambió ningún archivo.')
    return text.replace(old,new,1)

def patch_index(s):
    name='public/index.html'
    s=replace_once(s,'<link rel="stylesheet" href="/edgoria61.css?v=6.1" />','<link rel="stylesheet" href="/edgoria61.css?v=6.1" />\n  <link rel="stylesheet" href="/edgoria64.css?v=6.4.0" />',name)
    s=replace_once(s,'Hasta cinco cuentas por usuario.</p></div></article>',f'Hasta cinco cuentas por usuario.</p></div>{SIGNAL_READY}</article>',name)
    s=replace_once(s,'No se promete una fecha de lanzamiento.</p></div></article>',f'No se promete una fecha de lanzamiento.</p></div>{SIGNAL_SOON}</article>',name)
    return s

def patch_app_html(s):
    name='public/app.html'
    s=replace_once(s,'src="/app.js?v=6.3.0"','src="/app.js?v=6.4.0"',name)
    s=replace_once(s,'<link rel="stylesheet" href="/edgoria63.css?v=6.3.0">','<link rel="stylesheet" href="/edgoria63.css?v=6.3.0">\n  <link rel="stylesheet" href="/edgoria64.css?v=6.4.0">',name)
    return s

def patch_app_js(s):
    name='public/app.js'
    before='''async function refreshAffiliatePortal(){
 try{
   state.affiliatePortal=await apiGet('affiliate-portal');
   state.affiliatePortalError=null;
 }catch(err){
   state.affiliatePortalError='Las estadísticas de afiliación no están disponibles. Actualiza o contacta a soporte.';
   console.warn('EDGORIA_PARTNER_DASHBOARD_UNAVAILABLE');
 }
}'''
    after='''async function refreshAffiliatePortal(){
 const previous=JSON.stringify(state.affiliatePortal);
 const previousError=state.affiliatePortalError;
 try{
   const fresh=await apiGet('affiliate-portal');
   if(fresh?.ok!==true)throw Error('Respuesta de afiliación no disponible');
   state.affiliatePortal=fresh;
   state.affiliatePortalError=null;
   // Server response is authoritative. Approval does NOT activate a trader subscription.
   if(fresh.approved && fresh.code && state.member){
     state.member.affiliate={...(state.member.affiliate||{}),status:'active',code:fresh.code,rate_basis_points:fresh.rate_basis_points};
   }else if(!fresh.approved && state.member?.affiliate?.status==='active'){
     state.member.affiliate={...state.member.affiliate,status:'suspended'};
   }
 }catch(err){
   state.affiliatePortalError='Las estadísticas de afiliación no están disponibles. Actualiza o contacta a soporte.';
   console.warn('EDGORIA_PARTNER_DASHBOARD_UNAVAILABLE');
 }
 return previous!==JSON.stringify(state.affiliatePortal)||previousError!==state.affiliatePortalError;
}'''
    s=replace_once(s,before,after,name)
    s=replace_once(s,"if(state.member?.affiliate?.status==='active')return affiliatesView();", "if(state.member?.affiliate?.status==='active'||state.affiliatePortal?.approved===true)return affiliatesView();",name)
    s=replace_once(s,"const approved=affiliate?.status==='active'&&portal?.approved===true;", "const approved=portal?.approved===true&&typeof portal.code==='string'&&/^edg-[a-f0-9]{12}$/.test(portal.code);",name)
    s=replace_once(s,"<button type=\"button\" class=\"btn\" data-action=\"refresh-affiliate-portal\">↻ Actualizar estadísticas</button>","<button type=\"button\" class=\"btn\" data-action=\"refresh-affiliate-portal\">↻ Actualizar estadísticas</button><span class=\"eg64-sync-note\">Sincronización automática cada 20 s</span>",name)
    s=replace_once(s,"const a=state.member?.affiliate||state.data.edgoria_affiliates[0];if(!a||a.status!=='active'||!state.affiliatePortal?.approved)throw Error('El enlace todavía no está aprobado');await navigator.clipboard.writeText('https://www.edgoriatradingjournal.com/?ref='+a.code);notify('Enlace copiado');break;", "const a=state.affiliatePortal;if(!a?.approved||!/^edg-[a-f0-9]{12}$/.test(a.code||''))throw Error('El enlace todavía no está aprobado');await navigator.clipboard.writeText('https://www.edgoriatradingjournal.com/?ref='+a.code);notify('Enlace copiado');break;",name)
    anchor="setInterval(pollMt5Dashboard,60000);\ndocument.addEventListener('visibilitychange',()=>{if(!document.hidden)pollMt5Dashboard()});\ninit();"
    new="""setInterval(pollMt5Dashboard,60000);
// EDGORIA 6.4 — Fresh private commission stats without refreshing the whole Journal.
// This only polls while the affiliate screen is open and the user is not editing.
let affiliatePolling=false;
async function pollAffiliateDashboard(){
 if(affiliatePolling||!sb||!state.user||state.view!=='affiliates'||document.hidden||busy||$('#modal-root')||$('#partner-application-form')||$('#workspace input:focus, #workspace textarea:focus, #workspace select:focus'))return;
 affiliatePolling=true;
 try{
   const changed=await refreshAffiliatePortal();
   if(changed&&state.user&&state.view==='affiliates'&&!document.hidden)update();
 }finally{affiliatePolling=false}
}
setInterval(pollAffiliateDashboard,20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollMt5Dashboard();pollAffiliateDashboard()}});
window.addEventListener('focus',pollAffiliateDashboard);
init();"""
    s=replace_once(s,anchor,new,name)
    return s

def patch_previous_test(s):
    name='tests/v63-affiliates.test.js'
    return replace_once(s,
      r"assert.match(src,/if\(state\.member\?\.affiliate\?\.status==='active'\)return affiliatesView\(\)/);",
      r"assert.match(src,/state\.member\?\.affiliate\?\.status==='active'\|\|state\.affiliatePortal\?\.approved===true/);",name)

PATCHES={'public/index.html':patch_index,'public/app.html':patch_app_html,'public/app.js':patch_app_js,'tests/v63-affiliates.test.js':patch_previous_test}

def main():
 if len(sys.argv)!=2:
  print('Uso: python INSTALAR_EDGORIA_64.py RUTA_DEL_REPOSITORIO');return 2
 repo=Path(sys.argv[1]).expanduser().resolve()
 if not (repo/'api'/'admin.js').exists() or not (repo/'server'/'v63-partner-dashboard.js').exists():
  print('ERROR: Esta carpeta no parece ser EDGORIA Premium 6.3+ (sin admin.js o panel afiliados).');return 1
 try:
  targets={}
  if 'async function pollAffiliateDashboard()' in (repo/'public'/'app.js').read_text(encoding='utf-8'):
   print('EDGORIA 6.4 ya instalada: no se repiten los cambios.');return 0
  for path,fn in PATCHES.items():
   file=repo/path
   raw=file.read_bytes()
   txt=raw.decode('utf-8')
   line_ending='\r\n' if b'\r\n' in raw else '\n'
   result=fn(txt.replace('\r\n','\n')).replace('\n',line_ending)
   targets[file]=result.encode('utf-8')
  css_file=repo/'public'/'edgoria64.css'
  test_file=repo/'tests'/'v64-affiliate-sync.test.js'
  if css_file.exists() and css_file.read_bytes()!=CSS:
   raise RuntimeError('Ya existe edgoria64.css con contenido diferente; operación cancelada.')
  if test_file.exists() and test_file.read_bytes()!=TEST:
   raise RuntimeError('Ya existe v64-affiliate-sync.test.js con contenido diferente; operación cancelada.')
  # All preflight checks done: make backups before replacing anything.
  stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
  backup=repo.parent/f'EDGORIA64_BACKUP_{repo.name}_{stamp}'
  backup.mkdir()
  for file in targets:
   dest=backup/file.relative_to(repo)
   dest.parent.mkdir(parents=True,exist_ok=True)
   shutil.copy2(file,dest)
  try:
   for file,data in targets.items():
    with tempfile.NamedTemporaryFile(dir=file.parent,delete=False) as f:
     f.write(data);temp=Path(f.name)
    temp.replace(file)
   css_file.write_bytes(CSS)
   test_file.parent.mkdir(exist_ok=True)
   test_file.write_bytes(TEST)
  except Exception:
   # Restore every touched file if an I/O error occurs during the commit phase.
   for file in targets:
    original=backup/file.relative_to(repo)
    if original.exists():shutil.copy2(original,file)
   if css_file.exists() and css_file.read_bytes()==CSS:css_file.unlink()
   if test_file.exists() and test_file.read_bytes()==TEST:test_file.unlink()
   raise
  print('EDGORIA 6.4 instalada en:',repo)
  print('Copia de seguridad:',backup)
  print('Archivos modificados:',', '.join(str(p.relative_to(repo)) for p in targets), '+ public/edgoria64.css, tests/v64-affiliate-sync.test.js')
  print('No se tocaron server/, Supabase, accesos, MT5, precios ni administración.')
  return 0
 except Exception as exc:
  print('ERROR: Instalación abortada:',exc)
  return 1
if __name__=='__main__':sys.exit(main())
