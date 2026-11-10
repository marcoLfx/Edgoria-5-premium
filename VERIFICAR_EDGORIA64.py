from pathlib import Path
import sys,subprocess
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
assert (root/'public/app.js').exists(), 'No se encontró la carpeta public'
a=(root/'public/app.js').read_text(encoding='utf-8')
b=(root/'public/index.html').read_text(encoding='utf-8')
h=(root/'public/app.html').read_text(encoding='utf-8')
c=(root/'public/edgoria64.css').read_text(encoding='utf-8')
checks={
 'MT5 check': 'aria-label="MetaTrader 5 disponible"' in b,
 'cTrader reloj de arena':'aria-label="cTrader próximamente"' in b,
 'CSS integrado':'/edgoria64.css?v=6.4.0' in h and '/edgoria64.css?v=6.4.0' in b,
 'Sincronización 20 segundos':'setInterval(pollAffiliateDashboard,20000)' in a,
 'Actualización al regresar':'window.addEventListener(\'focus\',pollAffiliateDashboard)' in a,
 'Solicitudes sin interrupción':"$('#partner-application-form')" in a,
 'Aprobación desde servidor':'state.affiliatePortal?.approved===true' in a,
 'CSS indicadores':'eg64-integration-signal' in c,
}
for name,ok in checks.items():print(('OK' if ok else 'ERROR')+' — '+name)
if not all(checks.values()):raise SystemExit(1)
try:
 r=subprocess.run(['node','--check',str(root/'public/app.js')],capture_output=True,text=True,timeout=25)
 if r.returncode:print(r.stderr);raise SystemExit(1)
 print('OK — Sintaxis JavaScript')
except FileNotFoundError:print('AVISO — Node no instalado; sintaxis JS sin comprobar aquí')
print('Verificación estática completada. Las pruebas reales requieren Preview.')
