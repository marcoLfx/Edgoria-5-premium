# EDGORIA 3.1.1 Final — Reparación de aprobación y administración

**Objetivo:** corregir el problema que impedía visualizar «Cuenta pendiente» y el bloqueo accidental de Administración cuando fallaba el módulo comercial. Conserva MT5 Bridge, importador Excel/CSV, Analytics, retiros funded, reglas RLS y journal con capturas privadas.

## Qué se corrigió

- La API distingue correo sin confirmar, cuenta pendiente, suspendida y cuenta activa. El frontend conserva el código del error y muestra **la pantalla correcta**.
- Un usuario sin registro de aprobación se considera **pendiente**, nunca activo.
- La administración obtiene **usuarios/correos**, **roles** y **suscripciones** por separado: la falla de un módulo ya no oculta los otros.
- Administración muestra nuevas solicitudes y un resumen de los últimos usuarios, con nombre, correo y estado.
- Menú superior muestra nombre del usuario y el botón **Salir** al extremo derecho.
- Journal permite hasta 3 capturas JPG/PNG/WebP de 3 MB, almacenadas en bucket privado y visibles solo con permiso.
- Transiciones sutiles, paneles legibles y vista móvil sin desbordamiento.

## Publicación en GitHub: importante

**Elige una sola ruta de instalación:**

### Opción recomendada: actualización completa

1. Descomprime `EDGORIA_3_1_1_CORRECCION_GITHUB.zip`.
2. En el repositorio `marcoLfx/edgoria-produccion`, rama de producción `main`, reemplaza **el contenido de `public/` por el contenido de `public/` incluido en este ZIP**. Conserva la ruta: `public/app.js`, `public/index.html`, `public/edgoria311.css`, etc. **NO** lo subas a la raíz como carpeta adicional `public/public/`.
3. En `server/` reemplaza los archivos contenidos en la carpeta `server/` del ZIP. Incluye `v4-me.js`, `v4-access.js`, `v4-user-data.js`, `v4-access-management.js`.
4. Conserva las rutas de `api/` y el `vercel.json`, también incluidos para garantizar el enrutamiento. Si tu repositorio contiene personalizaciones posteriores, compara diferencias antes de reemplazarlas.
5. Confirma el commit a `main` y revisa Vercel **Deployments**. Debe aparecer un despliegue `Production` y estado `Ready`.
6. Abre `https://TU-DOMINIO/release.json`. Debes ver `"version": "3.1.1"`. Si sale 404 o versión anterior, **la producción no está sirviendo los archivos de este ZIP**.
7. Abre el dominio en una pestaña privada; en Administración debe leerse **EDGORIA / 3.1.1 FINAL**.

## Ajustes de Supabase ya aplicados

Para el proyecto Supabase previamente conectado con EDGORIA ya quedaron aplicadas las migraciones 3.1 de aprobación y capturas privadas. No las vuelvas a ejecutar ni cambies estados de usuarios por SQL. Las cuentas existentes se conservaron activas/suspendidas según su estado anterior. Nuevos registros: `pending` por defecto.

## Correo de bienvenida — paso manual obligatorio

1. Abre el proyecto Supabase: **Authentication → Email Templates → Confirm signup**.
2. Usa el archivo `EMAIL_BIENVENIDA_SUPABASE.html` y copia su contenido en la plantilla HTML. Asunto: `¡Bienvenido a EDGORIA! Confirma tu correo`.
3. En Authentication → Providers → Email asegúrate de que la confirmación de correo esté habilitada.
4. En Authentication → URL Configuration configura el dominio `.com` correcto y las redirecciones permitidas.
5. Si deseas un **remitente** como `bienvenida@tu-dominio.com`, configura un proveedor SMTP autenticado con tu dominio. El archivo HTML por sí solo personaliza el mensaje, no el remitente.
6. Verifica registro/confirmación usando una cuenta de prueba de la que eres propietario. No compartas contraseñas ni tokens.

## Prueba mínima de aceptación

1. Un usuario de prueba se registra: aparece en Administración → Pendientes, con nombre y correo.
2. Antes de confirmar el correo **no** puede acceder al dashboard.
3. Tras la confirmación **tampoco** puede acceder al dashboard; aparece «Tu acceso está pendiente».
4. El administrador pulsa **Activar**; el usuario recarga o usa «Comprobar mi acceso» y entra.
5. Administración muestra nombre, email y estado; activar/suspender conserva el estado en servidor.
6. Journal emocional acepta una captura JPG/PNG/WebP válida, muestra miniatura privada y la elimina con su reflexión.
7. Comprueba que tu cuenta antigua, MT5 Bridge, importaciones y Analytics no han cambiado de datos.

## Diagnósticos si falla

- `https://TU-DOMINIO/release.json` diferente de `3.1.1` → revisar rama Production, commit, despliegue o dominio del proyecto correcto.
- Administrador muestra error de módulo → pulsar **Reintentar administración**, comprobar Vercel Runtime Logs de `/api/v4-access-management` y entorno privado `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (no compartir valores).
- Email no llega o no está personalizado → revisar plantilla Supabase, proveedor Email y límites/SMTP.
- El botón de verificación no habilita el acceso → en Administración, verificar que el correo está confirmado y que el estado cambió a **Activo**.
- Fotos no suben → comprobar bucket `edgoria-journal` privado, límite 3 MB, políticas RLS y permisos del usuario.

## Validaciones realizadas en entorno aislado

- `node --test tests/*.test.js`: **131/131**.
- `pytest -q tests/test_project.py tests/test_release.py`: **11/11**.
- `node --check` en módulos modificados: aprobado.
- Playwright/Chromium: Administración, Journal, espera de aprobación y vista móvil sin errores JavaScript ni scroll horizontal. **Solo con cuentas de prueba**.

**No verificado desde este entorno:** despliegue real de tu URL de Vercel, envío de correo personalizado o flujo completo con una cuenta nueva en producción. Esos pasos requieren tu publicación y configuración de Supabase Email Templates.
