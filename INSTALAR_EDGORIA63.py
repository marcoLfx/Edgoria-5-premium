#!/usr/bin/env python3
"""Safe EDGORIA 6.3 patch installer. Never touches Supabase, credentials, or GitHub remotely."""
import hashlib
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

HERE=Path(__file__).resolve().parent
# Exact SHA-1 Git BLOB IDs of the project's verified current main baseline.
BASELINE={
    'public/app.js':'8a4ea17d45c627d57a16753206163f1116f90b98',
    'public/app.html':'b4b6e6bcea80583e4854bf4e9cbc8c0c7289620f',
    'api/v4.js':'694b5ebc0b7fe1c9d15a8f22d9fed8fe4c0213e9',
    'server/supabase.js':'fb01fa416ebf9dca0f9c796efb77535b7537ab03',
    'vercel.json':'94b23689679505607bab272c4e6296311f2f7f66',
    'public/release.json':None,
}
FILES=list(BASELINE)+[
    'server/v63-partner-dashboard.js',
    'public/edgoria63.css',
    'supabase/edgoria_v63_affiliate_rate_fix.sql',
    'tests/v63-affiliates.test.js',
]
def blob_hash(data:bytes)->str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()

def install(repo:Path):
    repo=repo.expanduser().resolve()
    if not repo.is_dir() or not (repo/'api/v4.js').is_file() or not (repo/'public/app.js').is_file():
        raise ValueError('Selecciona la carpeta RAIZ del repositorio EDGORIA (contiene api, public, server).')
    if repo==HERE:
        raise ValueError('El instalador está dentro del paquete. Selecciona tu repositorio GitHub Desktop.')
    for relative,expected in BASELINE.items():
        dest=repo/relative
        if not dest.is_file():raise ValueError(f'Archivo original no encontrado: {relative}')
        if expected and blob_hash(dest.read_bytes())!=expected:
            raise ValueError(f'{relative} no coincide con la versión verificada. No se cambió nada; revisa antes de sobrescribirlo.')
    for relative in FILES:
        src=HERE/relative
        if not src.is_file():raise ValueError(f'El paquete está incompleto: {relative}')
        dest=repo/relative
        if relative not in BASELINE and dest.exists():
            raise ValueError(f'Ya existe {relative}. Se detuvo para evitar sobrescribirlo.')
    stamp=datetime.now().strftime('%Y%m%d-%H%M%S')
    backup=repo.parent/f'EDGORIA63_BACKUP_{stamp}'
    if backup.exists():raise ValueError('Ya existe carpeta de copia de seguridad; vuelve a intentarlo más tarde')
    for relative in BASELINE:
        dst=backup/relative;dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(repo/relative,dst)
    applied=[]
    try:
        for relative in FILES:
            src=HERE/relative;dst=repo/relative
            dst.parent.mkdir(parents=True,exist_ok=True)
            tmp=dst.with_name(dst.name+'.edgoria63.tmp')
            shutil.copy2(src,tmp)
            os.replace(tmp,dst)
            applied.append(relative)
    except Exception:
        for relative in applied:
            dst=repo/relative
            b=backup/relative
            if b.exists():shutil.copy2(b,dst)
            elif dst.exists():dst.unlink()
        raise
    print('Instalación completada: archivos de código actualizados.',len(applied))
    print('Copia de seguridad en:',backup)
    print('IMPORTANTE: El SQL no se ejecutó. Aplica supabase/edgoria_v63_affiliate_rate_fix.sql en STAGING primero.')
    print('GitHub Desktop: revisa diferencias, haz commit en rama Preview y Push origin.')

if __name__=='__main__':
    try:
        if len(sys.argv)>1:path=Path(sys.argv[1])
        else:path=Path(input('Pega aquí la RUTA a la carpeta GitHub Desktop / Edgoria-5-premium: ').strip().strip('"'))
        install(path)
    except Exception as exc:
        print('NO SE MODIFICÓ/INSTALACIÓN DETENIDA:',str(exc))
        sys.exit(1)
