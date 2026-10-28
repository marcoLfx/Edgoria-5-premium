# EDGORIA 3.1 FINAL — instrucciones de publicación

**Base:** EDGORIA NEO 18.1. Esta versión conserva el importador MT5, los paneles de Analytics, los retiros funded y las cuentas. Cambia principalmente seguridad de altas, administración, identidad visible y journal.

## 1. Subir a GitHub

Abre el repositorio `marcoLfx/edgoria-produccion`, rama `main`. Desde el ZIP de parche, sube estos archivos **manteniendo sus carpetas**:

- `public/app.js`
- `public/index.html`
- `public/edgoria31.css` (nuevo)
- `server/v4-user-data.js`
- `server/v4-access.js`
- `server/v4-access-management.js`
- `package.json` (identificador de versión)

**No reemplaces ni borres** los demás archivos en `public` o `server`, incluidos `neo181.css`, `mt5-spreadsheet.js` y `v4-file-upload.js`. Vercel reconstruirá Production desde `main` si tu proyecto está conectado a esa rama.

## 2. Migración a Supabase: ya ejecutada

Para **tu proyecto Supabase de EDGORIA**, ya apliqué las migraciones de aprobación, identidad y fotos privadas. **NO ejecutes nuevamente** `migrations/20261027_edgoria31_final.sql` allí. Se verificó:

- 5 usuarios conservados: 4 activos y 1 suspendido; ninguna cuenta existente ha sido aprobada de forma indebida.
- 5 perfiles con su correo en tabla protegida.
- Nuevas cuentas: `pending` al registrarse, y solo el administrador puede cambiarlas a `active`.
- 16 tablas personales con restricción adicional RLS para usuarios aún no activados.
- Bucket `edgoria-journal` **privado**, máximo 3 MB por imagen; tabla de adjuntos con RLS y políticas de Storage.

El archivo SQL queda como **referencia de migración** para otro proyecto nuevo. Requiere revisar el esquema y los conflictos antes de aplicarlo en entornos distintos.

## 3. Correo de bienvenida de EDGORIA (paso manual obligatorio)

1. Ve al proyecto Supabase → **Authentication → Email Templates → Confirm signup**.
2. Abre `EMAIL_BIENVENIDA_SUPABASE.html` del ZIP y copia su HTML completo en el campo de plantilla.
3. Pon como asunto: `¡Bienvenido a EDGORIA! Confirma tu correo`.
4. Guarda la plantilla y asegúrate de que **Confirm email** esté activado en Authentication → Providers → Email.
5. En **Authentication → URL Configuration**, comprueba que `Site URL` y los `Redirect URLs` apuntan al dominio `.com` de EDGORIA y a las direcciones de Vercel que todavía uses.
6. Para que **el remitente** sea propiamente EDGORIA (no solo el diseño del cuerpo), configura un proveedor de **SMTP propio con dominio verificado**, en Authentication → SMTP Settings, si aún no lo tienes. No envíes credenciales por chat.

**Estado de este paso:** la plantilla HTML está preparada, pero **todavía debe guardarse desde el panel de Supabase**. No se ha enviado un email real como parte de estas pruebas.

## 4. Nuevo flujo de acceso

1. Usuario registra su nombre, correo, país y contraseña.
2. Supabase envía el email de confirmación según la plantilla configurada.
3. El usuario confirma el correo. Su cuenta permanece **Pendiente**.
4. El administrador entra a **Administración → Pendientes de aprobación** y pulsa **Activar**. Si el correo no está confirmado, la activación está bloqueada.
5. El usuario pulsa **Comprobar mi acceso**, vuelve a iniciar sesión o recarga el sitio; entonces ve el dashboard.
6. En **Usuarios y roles** el administrador ve nombre, correo, rol, verificación y estado, y puede suspender o conceder pruebas. **Conceder prueba no equivale a aprobar**.

## 5. Capturas en Journal emocional

Cada reflexión puede adjuntar **hasta 3 imágenes JPG/PNG/WebP de 3 MB como máximo cada una**. El archivo se guarda en el bucket **privado** de Supabase; solo se entrega una URL temporal firmada al propietario. Al eliminar la reflexión, la app intenta borrar sus archivos y datos relacionados. Las capturas no se publican en redes ni se envían a terceros mediante esta función.

## 6. Verificar el despliegue

- En la pantalla Administrador se lee **«EDGORIA / 3.1 FINAL»**.
- El usuario ve **«Hola, [nombre]»** en la parte superior, con **Salir** en el extremo derecho.
- La bandeja **Pendientes de aprobación** muestra nombre, correo y estado de confirmación.
- En **Journal emocional** aparece **«Capturas de tu sesión (opcional)»**.
- Valida un registro de prueba desde cero en staging o con una dirección propia de pruebas: registro → confirmación → pendiente → activación manual → acceso.
- Comprueba un archivo de captura real y su vista previa con sesión autenticada. Las pruebas automatizadas no sustituyen esta comprobación en producción.

## 7. Pruebas realizadas

- **127 pruebas JavaScript** aprobadas, incluidas 6 nuevas de control de acceso y privacidad.
- **11 pruebas Python** aprobadas.
- Vistas **Administración, Journal emocional y móvil** renderizadas en Chromium con **datos simulados**, sin errores JavaScript y sin desbordamiento horizontal móvil.
- Consulta SQL confirmó: bucket privado, políticas RLS, restricciones de acceso y conservación de los estados anteriores.

**Pendiente tras esta entrega:** publicar los archivos en GitHub/Vercel y guardar/activar la plantilla de email en Supabase. Sin esos dos pasos, no se reflejarán todos los cambios para tus usuarios.
