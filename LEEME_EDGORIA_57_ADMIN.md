# EDGORIA 5.7 — Consola administrativa separada

## Objetivo

La nueva administración se sirve en `/admin` y el journal se mantiene en `/app`. Las sesiones de Supabase Auth se reutilizan dentro del mismo dominio, pero las rutas, la navegación y las consultas del administrador son independientes. Las APIs administrativas exigen **rol admin en servidor**; nadie obtiene permisos por visualizar la URL ni por modificar el navegador.

### Vistas
- **Resumen:** total de usuarios, membresías pagadas vigentes, importes verificados, vencimientos cercanos y últimos registros.
- **Calendario:** días activos, inicios, vencimientos, detalle por usuario, importe y periodo.
- **Usuarios:** cuentas activas, pendientes, suspendidas o vencidas; búsqueda y acciones de verificar/renovar/revocar/suspender/reactivar.
- **Suscripciones:** historial verificable de periodos, importes y referencias.
- **Auditoría:** verificación o revocación con fecha y administrador responsable.

### Qué registra automáticamente el calendario

La función ya existente `edgoria_record_usdt_payment` de 5.6 confirma manualmente un pago externo, registra una auditoría, actualiza la suscripción y activa la cuenta. La migración 5.7 crea un trigger *sobre esa misma auditoría* para almacenar un periodo de acceso por cada pago confirmado. Toda la operación se efectúa en **una transacción de base de datos**: si falla el registro del periodo, la activación se revierte.

Un pago de US$10.99 o US$14.99 incluye fecha de inicio, vencimiento, referencia de pago, usuario y administrador verificador. Las renovaciones se programan al vencimiento actual cuando este sea futuro. El calendario no inventa pagos ni acredita USDT automáticamente.

**Importante:** Solo es posible reconstruir por migración el periodo más reciente ya almacenado en 5.6. No se inventan mensualidades antiguas para los usuarios sin registros históricos completos.

## Instalación recomendada

1. **No reemplaces producción directamente.** Haz una copia de seguridad de GitHub y Supabase.
2. En GitHub Desktop, usa una rama nueva desde la última versión de `edgoria-produccion`, no `main`.
3. Descarga el ZIP del parche, extráelo y ejecuta `INSTALAR_EN_WINDOWS.bat`, o `python aplicar_edgoria57.py "RUTA_DEL_REPO"`.
4. El instalador exige Git, una rama de trabajo limpia y hashes de versión 5.6 para archivos modificados. Si tu repositorio no coincide exactamente con esa versión, se **detiene sin sobrescribir**. No elimines esa verificación.
5. Revisa los cambios y publica el branch como Preview en Vercel. Debe tener `/admin` y `/app`.
6. Aplica el esquema de suscripciones *en una base de pruebas*, en este orden: `supabase/edgoria_v56_manual_usdt.sql` y `supabase/edgoria_v57_subscription_calendar.sql`.
7. Configura en Vercel Preview, **solo del lado servidor**: `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`, acorde a la versión del servidor), `EDGORIA_ADMIN_USER_ID` (UUID del usuario admin), `EDGORIA_USDT_MANUAL_ENABLED=1`; configura la URL y clave pública ya utilizadas por tu journal.
8. Entra a `/admin` con la cuenta administradora, comprueba la lista de usuarios y registra una **verificación de pago de prueba** con referencia única. Revisa que se haya generado en el calendario y el historial, que renovar y revocar funcionen, y que un usuario no administrador reciba 403.
9. Valida que el bloqueo de usuarios vencidos y suscripciones sin pagar funcione antes de habilitar `EDGORIA_ENFORCE_PAID_ACCESS=1`. **Activar esta variable sin pruebas podría bloquear cuentas existentes**. No la actives automáticamente.
10. Comprueba `/app` con un usuario trader, permisos, MT5, journal, Strategy Lab, Analytics, y solo después promueve el Preview a producción.

## Diagnóstico del entorno conectado

Durante esta preparación consultamos únicamente el esquema (sin modificar datos) del proyecto Supabase `jixygssxfgytxsylsowq`. Existen las tablas `edgoria_v4_profiles`, `edgoria_v4_access_grants` y `edgoria_mt5_connections`, pero **no** `edgoria_manual_subscriptions`, `edgoria_manual_payment_audit` ni `edgoria_subscription_periods` a fecha 10/11/2026. Por tanto, debes ejecutar ambas migraciones antes de usar funciones de cobro en ese proyecto.

## Privacidad y seguridad

- La interfaz no recibe contraseñas ajenas, tokens MT5, carteras ni claves privadas del servidor.
- La API `/api/admin?route=console` comprueba la sesión y el rol admin en el servidor; el navegador no puede decidir el rol.
- RLS: `edgoria_subscription_periods` no concede acceso a `anon` ni `authenticated`; la lectura administrativa se hace por un endpoint protegido.
- El importe es un dato **declarado y verificado manualmente**; no representa conciliación ni confirmación blockchain autónoma.
- Las revocaciones conservan historial.
- Los pagos se confirman **fuera** de EDGORIA por medios independientes; nunca basta una captura.

## Alcance de pruebas

Las pruebas unitarias de la capa de calendario y estructura administrativa pasan. La UI se ha probado en un navegador con **datos de ejemplo inyectados únicamente en el entorno de pruebas** (no existen datos ficticios en la app real). Falta una prueba de extremo a extremo con Supabase real y Vercel Preview, incluida migración, redirección de admin, expiración, RLS y MT5, antes de habilitar cobros en producción.
