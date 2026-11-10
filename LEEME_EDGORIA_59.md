# EDGORIA 5.9 — Accesos manuales y calendario automático

## Resumen
- **Pagos USDT/TRC20 totalmente separados de los permisos.** EDGORIA 5.9 no comprueba wallets, importes, recibos ni transacciones al conceder acceso.
- El administrador concede **Prueba gratuita (7 días)** o **Mensualidad (1 mes calendario desde el instante de activación)**.
- El servidor crea un periodo fechado y un registro de auditoría; el calendario lo muestra automáticamente.
- Cuando expira, las rutas de aplicación protegidas comprueban la fecha del servidor y deniegan la sesión funcional en el journal. La UI comprueba el estado durante el inicio y aproximadamente cada minuto con la app abierta.
- Un usuario puede recibir prueba gratuita **una sola vez** (control de base de datos). Al activar un nuevo periodo, el anterior se marca como revocado y el historial permanece visible.
- **Eliminar** significa retirar y bloquear la cuenta de forma **reversible**, preservando su historial de trading. La eliminación física definitiva es un procedimiento distinto que requiere revisar datos vinculados, auditoría y copias de seguridad.

## Vistas del panel Admin
1. Resumen: usuarios, accesos actuales, pruebas activas, próximos vencimientos y cuentas antiguas sin plazo.
2. Calendario: activaciones y vencimientos por día, con detalles del usuario y tipo de acceso.
3. Usuarios: búsqueda, filtros, conceder 7 días/1 mes, suspender, retirar y restaurar.
4. Accesos: historial de periodos.
5. Auditoría: concesiones, suspensiones, retiradas y restauraciones.

## Instalación segura (sin modificar `main`)
1. Verifica en **Vercel → edgoria-5-premium → Settings → Git** cuál repositorio está conectado. Trabaja con ese repositorio, no necesariamente el que aparece en conversaciones anteriores.
2. Haz una copia de respaldo y crea una rama Preview desde el código que está funcionando. No publiques sobre Production directamente.
3. Extrae el ZIP `EDGORIA_5_9_PARCHE_SEGURO.zip` y ejecuta `INSTALAR_WINDOWS.bat` o `python aplicar_edgoria59.py "C:\ruta\al\repositorio"` (requiere Python 3). **Si el repositorio no coincide con la base 5.8, el instalador se detiene sin copiar**.
4. Antes de habilitar en Vercel, aplica `supabase/edgoria_v59_access_manual.sql` **primero en un proyecto Supabase de pruebas**, revisando RLS y privilegios. El SQL solo crea tablas de periodos, archivo y auditoría, y funciones RPC; no lee ni modifica historiales de trading ni pagos.
5. Despliega la rama como Preview con credenciales del proyecto de pruebas. Allí configura `EDGORIA_ACCESS_PERIODS_ENABLED=1` (solo después de instalar SQL). No actives esta variable en Production antes de validar.
6. Verifica admin en `/admin` usando el login habitual `/app`. Prueba con dos usuarios de prueba: confirma que el admin pueda activar trial, activar mes, suspender, retirar/restaurar y que el calendario muestre fechas correctas; que un trader no pueda acceder a `/admin` ni a las APIs administrativas.
7. Comprueba inicio de sesión, Journal, Analytics, Strategy Lab y sincronización de MT5 sin cambios. Las operaciones no deben perderse.
8. Revisa los registros y permisos antes de pasar a Production. **No subas valores de Secret a GitHub**.

## Entornos de Vercel
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública del Supabase correspondiente a ese entorno.
- `SUPABASE_SECRET_KEY`: clave privada del servidor; nunca usar en JS público.
- `EDGORIA_ADMIN_USER_ID`: UUID de un usuario existente en esa base de datos.
- **Nuevo:** `EDGORIA_ACCESS_PERIODS_ENABLED=1` para activar control de periodos **después** de migrar y probar.
- Si cuentas existentes están aprobadas pero no tienen un periodo 5.9, se mantienen con acceso legado para evitar bloqueos masivos. El admin las ve como “Legado sin plazo” y puede asignarles uno. Para exigir periodo a todo usuario, después de migrar los antiguos y verificar su acceso, usa `EDGORIA_LEGACY_ACCESS_ALLOWED=0`.
- `EDGORIA_USDT_MANUAL_ENABLED` y `EDGORIA_ENFORCE_PAID_ACCESS` ya no controlan las concesiones 5.9. No los uses para habilitar periodos.

## Seguridad / límites
- Roles comprobados **en servidor** mediante sesión Supabase, `EDGORIA_ADMIN_USER_ID` o rol administrativo en base de datos. No confiar en parámetros de URL ni en roles editables del cliente.
- La expiración se comprueba en las rutas privadas del journal y al cargar su interfaz. Las políticas RLS de las tablas de trading siguen protegiendo a cada usuario de otros usuarios, pero una cuenta propia con un token Supabase válido podría consultar sus propios datos por otras vías si no se amplían esas políticas. Para una restricción total a nivel de base, hay que auditar y actualizar todas las políticas RLS existentes antes de habilitar pagos o acceso público de suscripción. No afirmamos que la expiración revoca el token de Supabase.
- “Eliminar” en esta versión es retiro reversible, no borrado físico de `auth.users`. Esto evita pérdidas accidentales e incompatibilidades con tablas históricas.
- Las migraciones 5.6/5.7 de pagos USDT **no son necesarias** para conceder accesos con esta versión.

## Validación
- 10 pruebas nuevas específicas de administración/pagos desacoplados, reglas de acceso y caducidad: **10/10 pasan**.
- Interfaz offline con datos de ejemplo: Resumen, Calendario, Usuarios, modal, menú móvil sin errores de JavaScript.
- Suite histórica completa: **136/189 pasan, 53 fallan**, comparada con **131/179 pasan, 48 fallan** en 5.8. Los cinco fallos adicionales son comprobaciones antiguas que exigen que el pago USDT active el acceso o que existan acciones antiguas de activación; esa conducta se retiró deliberadamente. Quedan fallos heredados de múltiples versiones anteriores que deben revisarse para certificar producción.
- **No se ha aplicado SQL a la base de producción ni publicado este código en Vercel.**
