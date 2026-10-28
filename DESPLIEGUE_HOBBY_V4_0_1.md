# EDGORIA 4.0.1 — Corrección para Vercel Hobby

## Diagnóstico verificado
Vercel rechazó la V4 por superar el máximo de **12 Serverless Functions** del plan Hobby. Los warnings de Node `>=22` no eran la causa.

## Solución
- Las cinco funciones `v4-*` se agrupan en `api/v4.js`.
- Las cuatro funciones `mt5-*` se agrupan en `api/mt5.js`.
- Las nueve rutas públicas originales siguen disponibles mediante `rewrites` exactos en `vercel.json`.
- La carpeta `/api` tiene ahora **9 funciones** (antes 16), por debajo del límite y con capacidad para tres funciones adicionales.
- Node fijado en `22.x` para evitar upgrades mayores imprevistos.
- **No se cambian las tablas ni las claves de Supabase**; **no debes repetir migraciones**.

## Cómo publicar
1. Extrae el ZIP y sube la carpeta `EDGORIA_PRODUCCION_VERCEL` completa a tu proyecto existente de Vercel con Vercel Drop (o actualiza mediante GitHub / Vercel CLI).
2. Usa primero un despliegue **Preview** si tu procedimiento lo permite, sin sustituir producción hasta probar. Vercel Drop sobre el proyecto puede dirigirse directamente a producción; revisa el entorno antes de confirmar.
3. Asegura que las variables privadas existentes permanezcan configuradas en el mismo proyecto. No copies claves a chat ni a `public/`.
4. Comprueba que el despliegue esté `Ready` y verifica login, `/api/config`, `/api/v4-me` (requiere sesión), `/api/v4-mt5-diagnostics` (requiere sesión), y generación de conexión MT5 con una cuenta demo.
5. Verifica que las rutas antiguas de MT5 funcionen; la URL de ingestión del Bridge sigue siendo `/api/mt5-ingest`.

## Seguridad
Los despachadores únicamente delegan en handlers originales; cada uno conserva sus comprobaciones de método, sesión, propiedad y rol. Los endpoints privados usan las credenciales del servidor de Vercel. No es necesario publicar una clave nueva ni contratar Pro.

## Limitaciones
No se ha validado todavía un despliegue remoto de este paquete ni una sesión real de MetaTrader 5. `Ready` no garantiza que las APIs funcionen: hay que ejecutar las pruebas de integración indicadas. Si el Bridge falla, inspeccionar Vercel Runtime Logs, no volver a cambiar claves a ciegas.
