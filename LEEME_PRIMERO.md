# EDGORIA 6.4 — Sincronización de comisiones y señales visuales

## Alcance exacto

- `public/index.html`: añade un check verde al recuadro MetaTrader 5 y un reloj de arena ámbar al de cTrader.
- `public/edgoria64.css`: estilos de esos dos indicadores y de la nota de sincronización.
- `public/app.js`: consulta automática cada **20 segundos** mientras el afiliado mantiene su pantalla abierta y activa; refresca al recuperar el foco; refleja estados `pending`, `approved` y `paid` que el administrador ya cambia desde su panel. El endpoint privado `/api/affiliate-portal` ya devuelve datos actuales (`no-store`), sin identidades de referidos.
- `public/app.html`: versión de caché 6.4 e importación de CSS.
- `tests/v63-affiliates.test.js`: actualiza la prueba de vista aprobada para aceptar el nuevo refresco de estado.

**No se modifican backend, funciones de Vercel, SQL, Supabase, MT5, accesos, pagos ni comisiones existentes.** No se genera dinero ni se cambia el estado desde el panel del afiliado; su vista es estrictamente de consulta.

## Instalación segura (recomendada)

1. Abre GitHub Desktop y selecciona tu repositorio que despliega `edgoria-5-premium`.
2. Haz `Fetch origin`, crea una nueva rama `edgoria-64-preview` desde `main`. No toques Production primero.
3. Extrae este ZIP **fuera del repositorio**.
4. En GitHub Desktop, menú `Repository` → `Show in Explorer`. Copia esa ruta.
5. Ejecuta `INSTALAR_WINDOWS.bat` y pega la ruta. Es necesario tener **Python 3** instalado (el comando `py` de Windows).
6. El instalador comprueba todos los textos originales antes de cambiar los archivos y crea un respaldo `EDGORIA64_BACKUP_...` en la carpeta **anterior** al repositorio, fuera del control de versiones. No se incluye en GitHub.
7. Inspecciona que GitHub Desktop muestre **exactamente 6 archivos**, `public/index.html`, `public/app.js`, `public/app.html`, `public/edgoria64.css`, `tests/v63-affiliates.test.js`, `tests/v64-affiliate-sync.test.js`. Haz commit en tu rama Preview → Push Origin.
8. Abre el despliegue Preview de Vercel. Prueba escritorio/móvil y el panel del afiliado con una cuenta de prueba.
9. Cuando todo esté comprobado, fusiona la rama con `main` mediante PR o GitHub Desktop, según tu flujo de publicación.

No pegues el instalador ni CSS en Supabase SQL Editor. **6.4 no tiene migraciones SQL.**

## Prueba de sincronización sin riesgo

- Abre una cuenta de **afiliado de prueba** con su dashboard; deja la pestaña abierta.
- Desde otra sesión de Administrador, **con una comisión de prueba creada de manera legítima en tu entorno de pruebas**, cambia de Pendiente → Aprobada y, tras confirmar el pago real de prueba, a Pagada.
- Vuelve a la pestaña del afiliado. Al recuperar el foco o en aproximadamente 20 segundos si está visible, debe actualizarse `Pendientes`, `Aprobadas`, `Pagadas` y el historial.
- Comprueba que el usuario no pueda cambiar el estado desde su dashboard. El pago y la activación siguen separados.
- Si no se actualiza, en Vercel Logs comprueba `/api/v4?route=affiliate-portal`. No pegues tokens de sesión en soporte.

### Nota de seguridad

No marques como pagada una comisión de un cliente real como parte de esta prueba, salvo que efectivamente se haya transferido. No pruebes compras reales ni transferencias nuevas sin necesidad.
