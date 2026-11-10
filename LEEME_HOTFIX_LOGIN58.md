# EDGORIA 5.8 — Hotfix de ingreso único

## Objetivo
**Un solo login**: usuario común y administrador ingresan por `/app` con las mismas credenciales de Supabase. Tras verificar sesión y rol en el servidor, la cuenta admin se dirige a `/admin`; la del trader permanece en su journal. `/admin` deja de mostrar un formulario separado.

## Fallos reparados
1. La validación de sesión en `server/v4-user-data.js` exigía `access_status=active` incluso al administrador, bloqueando el rol antes de identificarlo. Se reconoce primero el rol autenticado por UID confiable de servidor o por `edgoria_v4_roles`; los traders siguen sujetos a aprobación y suscripción.
2. `public/app.js` exigía acceso de trader incluso cuando `/api/v4-me` devolvía rol admin.
3. `public/admin57.js` tenía un segundo formulario y autenticación redundante. Ahora reutiliza la sesión existente y, si no hay sesión, regresa a `/app`.
4. `/api/v4-me` no necesita consultar pagos del administrador (que no debe comprar una mensualidad de trader).

## Archivos cambiados
- `public/app.js`, `public/app.html`
- `public/admin57.js`, `public/admin.html`
- `server/v4-user-data.js`, `server/v4-me.js`

## Instalación más segura
1. En GitHub Desktop, elige el repositorio **que realmente aparece conectado** en Vercel → proyecto `edgoria-5-premium` → Settings → Git (podría ser `marcoLfx/Edgoria-5-premium`). Crea una **rama de pruebas nueva** desde su versión actual. No copies todos los archivos del ZIP completo sobre `main`.
2. Descomprime `EDGORIA_5_8_PARChe_PEGAR.zip`. Copia sus carpetas `public` y `server` **encima de la carpeta raíz del repositorio**, conservando la estructura.
3. Solo debe haber seis archivos cambiados. Si tu repositorio no contiene `public/admin57.js`, `server/v4-user-data.js` y `server/v4-me.js`, **detente**: aún no tiene la base 5.7 de este parche. Si aparecen muchos más archivos modificados o sobreescritos, descarta esos cambios y revisa la rama.
4. Haz Commit → Push origin y abre el Preview correspondiente, sin promoverlo a Production todavía.
5. En Preview, confirma que `/app` muestra el mismo formulario a todos; trader con cuenta activa entra en Journal; admin con su email y contraseña entra en Admin Console; visitante en `/admin` sin sesión vuelve a `/app`; usuario trader en `/admin` recibe acceso denegado. Verifica cierre de sesión y registro.
6. Comprueba las APIs `/api/config` y `/api/v4-me` (requiere sesión) y pruebas de Vercel Logs si aparecen errores. **No envíes tokens**.
7. Solo después de pasar las pruebas, promueve el Preview a Production. La parte de pagos/calendario 5.7 aún requiere las migraciones 5.6/5.7 y pruebas con un proyecto Supabase de ensayo.

## Variables de servidor
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (config pública)
- `EDGORIA_ADMIN_USER_ID` (UUID de un usuario existente, jamás la dirección de correo; solo servidor)
- `SUPABASE_SECRET_KEY` (solo si el backend de admin requiere acceso privilegiado y ha sido validado)
- **No cambies** `EDGORIA_ENFORCE_PAID_ACCESS` al instalar este parche. Conserva las reglas actuales de acceso y prueba con cuentas verificadas en Preview.

## Seguridad
El acceso de administración se verifica en `/api/admin?route=console` y otros endpoints mediante `requireAdmin`; jamás se confía en campos editables por usuario o una bandera del navegador. No se crean cuentas, no se borran datos ni se ejecutan migraciones. Este parche NO garantiza despliegue listo sin probar la versión exacta de GitHub/Vercel.
