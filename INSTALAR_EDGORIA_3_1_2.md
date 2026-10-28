# EDGORIA 3.1.2 — Instalar y confirmar los cambios

## Qué trae
- Centro administrativo rediseñado: usuarios y solicitudes en una sola pantalla, buscador de nombre/correo, filtros y botones de activación. Datos reales provenientes de `v4-access-management`, no datos de ejemplo.
- Se conserva el flujo ya existente de verificación de correo, aprobación por el administrador, control en el servidor, Journal privado y sus capturas, MT5 Bridge y Analytics.
- Hoja nueva `public/edgoria312.css`, identificador `public/release.json` y diagnóstico público `public/version.html`.
- No se ejecuta ninguna nueva migración de base de datos.

## Cómo subirlo (importante para no duplicar carpetas)
1. Haz un backup del repositorio o crea una rama de respaldo.
2. Descomprime el ZIP. En GitHub, abre la **raíz del repositorio** `edgoria-produccion`.
3. Sube los archivos conservando su carpeta `public/`, `server/` y `api/`. Si usas la interfaz web de GitHub, entra a `public` y sube allí **los archivos que están DENTRO de public**, no una carpeta `public` anidada. Confirma que `public/edgoria312.css` y `public/version.html` existen.
4. Confirma el commit en la rama enlazada a Production (habitualmente `main`). Si Vercel despliega otra rama, el commit no será visible.
5. En Vercel > proyecto > Deployments, comprueba que el commit llegó al entorno **Production**, con estado **Ready**. Una URL de Preview no es lo mismo que el dominio Production.
6. Abre `https://TU-DOMINIO.com/version.html`. Debe decir **3.1.2** y cuatro comprobaciones **Correcto**. Si dice que falta un archivo, vuelve a revisar el commit y la rama; borrar caché no soluciona un archivo no publicado.
7. Inicia sesión con el ADMIN real. En el menú Administración debe mostrar **EDGORIA · ADMIN CENTER 3.1.2** y tarjetas Por aprobar / Accesos activos / Registros totales / Por verificar. Usa búsqueda y filtros.
8. Prueba con una cuenta NUEVA usando un correo distinto: debe confirmar el correo, permanecer pendiente y no tener acceso a la app; luego actívala desde Administración y vuelve a iniciar sesión.

## Correo de bienvenida
La plantilla `EMAIL_BIENVENIDA_SUPABASE.html` es para **Supabase > Authentication > Email Templates > Confirm signup**. El ZIP **no la instala automáticamente**. Si no has pegado y guardado la plantilla, seguirá llegando el correo de confirmación predeterminado de Supabase. No cambies secretos ni compartas JWT.

## Diagnóstico si el panel no carga
- Si `version.html` no marca 3.1.2: problema de **despliegue o archivos de publicación**, no de CSS.
- Si `version.html` marca 3.1.2 pero Administración no aparece: comprueba si iniciaste sesión con el usuario reconocido como `admin`. Revisa que `EDGORIA_ADMIN_USER_ID` apunte al ID del administrador en las Environment Variables correctas.
- Si aparece Administración pero no carga la lista: comprueba los logs del endpoint `GET /api/v4-access-management` en Vercel; requiere autenticación y rol admin. No pegues tokens ni datos privados en soporte.
- Si las cuentas nuevas entran directamente: revisa que el despliegue nuevo esté usando la API `api/v4.js`, `server/v4-user-data.js` y las políticas RLS de Supabase 3.1 ya instaladas.

## Información sobre imágenes del journal
Las imágenes se guardan en el bucket privado `edgoria-journal` (JPG/PNG/WebP de hasta 3 MB por archivo, hasta 3 por entrada). Verifica con una cuenta real tras publicar.

## Estado de la entrega
Pruebas de código locales y visuales con datos ficticios; la aplicación no se ha desplegado ni comprobado desde una cuenta autenticada de producción.
