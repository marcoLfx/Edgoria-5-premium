#!/usr/bin/env python3
"""Aplica EDGORIA 5.6 SOLO sobre una copia exacta de la versión 5.5 suministrada.
Si el repo cambió, no sobrescribe. Crea respaldo FUERA del repositorio.
No ejecuta SQL, no despliega, no lee ni imprime secretos.
"""
from pathlib import Path
import json,hashlib,sys,shutil,datetime
package=Path(__file__).resolve().parent
repo=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else Path.cwd().resolve()
if not (repo/'vercel.json').exists() or not (repo/'public/app.js').exists():
 raise SystemExit('ERROR: selecciona la RAÍZ de tu repositorio EDGORIA (contiene vercel.json y public/app.js).')
if (repo/'.git').exists():
 import subprocess
 try:
  branch=subprocess.check_output(['git','-C',str(repo),'branch','--show-current'],text=True).strip()
  if branch in ('main','master'):
   raise SystemExit('ERROR: crea primero una RAMA DE PRUEBA. No se permite editar main/master.')
  print('Rama de pruebas:',branch)
 except FileNotFoundError:
  raise SystemExit('ERROR: Git no disponible. Abre GitHub Desktop y confirma que estás en la rama de pruebas.')
manifest=json.loads((package/'manifest.json').read_text())
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
errors=[];write=[]
for relative,checks in manifest.items():
 dst=repo/relative;source=package/'CAMBIOS'/relative
 if not source.is_file() or sha(source)!=checks['new_sha256']:
  errors.append('Paquete corrupto: '+relative);continue
 if dst.exists() and sha(dst)==checks['new_sha256']:continue
 if checks['base_sha256'] is None:
  if dst.exists():errors.append('Archivo nuevo diferente: '+relative)
  else:write.append(relative)
 else:
  if not dst.exists() or sha(dst)!=checks['base_sha256']:
   errors.append('Archivo modificado respecto a 5.5: '+relative)
  else:write.append(relative)
if errors:
 print('NO SE APLICÓ NINGÚN CAMBIO. Este repositorio no coincide con la base 5.5:')
 for item in errors:print(' -',item)
 print('Conserva tus archivos y compara con un desarrollador. NO reemplaces todo public.')
 raise SystemExit(2)
if not write:print('Ya está aplicado; no hay nada que cambiar.');raise SystemExit(0)
back=repo.parent/(repo.name+'_RESPALDO_EDGORIA56_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
for relative in write:
 old=repo/relative
 if old.is_file():
  target=back/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(old,target)
for relative in write:
 dst=repo/relative;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(package/'CAMBIOS'/relative,dst)
print('Aplicados:',len(write),'archivos. Respaldo:',back)
print('Revisa los cambios de GitHub Desktop. SQL y variables Vercel siguen pendientes.')
