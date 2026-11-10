# EDGORIA 5.10 – recuperación y eliminación de usuarios

## Cambios

- `Olvidé mi contraseña` envía el correo a `/reset-password`, no `/app`.
- La nueva pantalla verifica el enlace de recuperación, permite establecer la contraseña y cierra la sesión al guardar.
- Los enlaces antiguos `/app#...type=recovery` se redirigen antes de cargar el Journal.
- En Admin, `Suspender` sigue suspendiendo; `Eliminar definitivamente` realiza una solicitud de borrado de Auth (no `archive-user`).
- El borrado es irreversible y puede afectar registros de usuario con claves foráneas `ON DELETE CASCADE`. No lo pruebes con cuentas reales sin copia.

## Publicación segura

1. Copia estos cambios **solo en una rama Preview** de tu repositorio real. Confirma primero que el proyecto desplegado corresponde a la base 5.9 incluida.
2. En Supabase → Authentication → URL Configuration, agrega la URL exacta `https://edgoria-5-premium.vercel.app/reset-password` a los Redirect URLs permitidos. Para Preview, agrega explícitamente la URL del despliegue de prueba si corresponde.
3. En Vercel Preview, conserva las mismas dos variables públicas de Supabase. La eliminación de usuarios utiliza en servidor la clave `SUPABASE_SECRET_KEY` ya configurada. No expongas esta clave.
4. Comprueba que el correo de recuperación te lleve a `/reset-password` y que el botón guarde la contraseña nueva. Usa una cuenta de **prueba**.
5. Comprueba login normal de trader, login de administrador, Suspender y el modal de eliminación. Para probar eliminación irreversible, utiliza solamente una cuenta ficticia creada para ese fin.
6. Solo tras comprobar Preview, promueve a Production.

## Nota técnica

La API de Supabase Auth puede rechazar el borrado si el usuario es propietario de archivos Storage o si existen referencias sin borrado en cascada. En tal caso, la API devuelve error y NO suspende la cuenta como alternativa.

Los JWT emitidos antes de borrar un usuario pueden mantenerse vigentes temporalmente hasta su expiración; las rutas protegidas deben verificar el usuario actual en el servidor.

## Archivos modificados
- public/app.js
- public/app.html
- public/admin59.js
- public/admin.html
- public/reset-password.html (nuevo)
- public/reset-password.js (nuevo)
- server/v4-access-management.js
- server/supabase.js
- vercel.json

No modifica `mt5`, tablas Supabase, registros ni las API existentes de trading.
