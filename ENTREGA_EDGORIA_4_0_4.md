# EDGORIA 4.0.4 — Accesos, administración, calendario 16:00–16:00

**Estado de entrega:** código fuente completo y pruebas automatizadas; no desplegado en la cuenta Vercel. La migración de base de datos `edgoria_v4_0_4_access_grants.sql` ya se aplicó y verificó en el proyecto Supabase `jixygssxfgytxsylsowq` el 25-10-2026. No vuelvas a ejecutar el SQL si usas esa misma base salvo para recuperación.

## Lo que cambió

1. **Roles aislados:** interfaz independiente para administrador, partner y usuario. La API verifica el rol mediante credenciales autenticadas y una asignación protegida en Supabase, nunca mediante campos editables del registro.
2. **Administrador:** panel resumen de usuarios **habilitados** (no usuarios conectados en tiempo real), usuarios suspendidos, partners y pruebas gratis; tabla de perfiles con acciones **activar**, **desactivar**, **conceder 1 mes** y **retirar prueba**. No permite suspender al propio administrador.
3. **Cortesía de 1 mes:** se crea/actualiza una autorización privada con fecha de concesión y vencimiento de un mes calendario; no crea cobro o suscripción externa. La interfaz de membresía muestra la cortesía vigente. Al vencer, deja de mostrarse como vigente. La activación comercial del paywall que determine a quién bloquear por falta de pago es una integración aparte; no se alteró el estado de facturación ni los webhooks.
4. **Seguridad:** las escrituras de administración requieren un rol admin comprobado en el servidor y la clave privada de Supabase. Los usuarios comunes tienen únicamente permiso `SELECT` sobre su propia concesión. El inicio de sesión y los endpoints API de usuario rechazan un estado suspendido. Las sesiones/JWT ya emitidas y los accesos directos a otras tablas de Supabase pueden requerir revocación adicional si se necesita bloqueo absoluto; esta versión es un control de acceso a la aplicación, no una revocación universal de credenciales.
5. **Interfaz:** barra lateral con `overflow-y:auto`, wheel scrolling y botón Salir en la barra superior. Playbooks eliminado del menú y de los formularios; notas siguen disponibles. Las tablas históricas no se eliminan.
6. **Tiempo y calendario:** fechas asignadas según la **hora de cierre** a la jornada local `[16:00, 16:00 del siguiente día)`. En el calendario el día mostrado es el de inicio de la jornada. Zona horaria seleccionable desde Configuración, por defecto `America/Lima` (otras: `America/New_York`, `UTC`, `Europe/London`, `Europe/Madrid`). Se guarda por usuario en este navegador y no altera los timestamps almacenados. En informes MT5 sin zona horaria hay que comprobar la diferencia del reloj de broker.
7. **Rendimiento:** administradores y partners dejan de descargar todas las operaciones personales en cada actualización; los datos del trader siguen paginándose.

## Publicar en el proyecto EXISTENTE

1. Extraer el archivo ZIP de entrega. Usar la carpeta `EDGORIA_PRODUCCION_VERCEL` como raíz del despliegue, **en el mismo proyecto existente**, no uno nuevo.
2. Publicar primero Preview si el proceso de Vercel lo permite, después producción tras validar. No compartir variables secretas por chat.
3. Variables en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL correcta de Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — clave pública, no una `sb_secret_`.
   - `SUPABASE_SECRET_KEY` — clave privada `sb_secret_` **solo servidor**, requerida para las operaciones de administración y el Bridge automático (alternativa legacy: `SUPABASE_SERVICE_ROLE_KEY`).
   - `EDGORIA_ADMIN_USER_ID` — UUID de **tu propia cuenta de Supabase Auth** para habilitar al primer administrador. Identificarlo con sesión autenticada o la consola de Auth, no copiando el ID de otra persona. El rol también puede ser asignado por una operación administrativa autorizada.
4. Las variables deben estar activas en el mismo entorno de destino (Production/Preview); guardar y hacer un **nuevo despliegue**. Redeploy de una versión antigua no instala el código 4.0.4.
5. Verificar que Vercel indique `Ready` y que la API `/api/v4-me` responda a sesiones válidas. Si aparece `SERVER_CONFIG`, revisar variables privadas antes de intentar acciones de administrador.

## Pruebas en el sitio publicado

- Entrar con el administrador y comprobar **Administración → Usuarios y roles**, total de habilitados y solicitud Partner. Probar activar/desactivar con una cuenta de test secundaria, **nunca con la cuenta administradora**.
- Dar prueba de 1 mes a una cuenta de prueba, comprobar que no genere cobro y que `Mi suscripción` muestre la fecha.
- Entrar con una cuenta partner y comprobar que no vea menús de trader/administrador.
- Desplazarse con la rueda por WORKSPACE, TU EVOLUCIÓN y PLATAFORMA; probar **Salir** desde la barra superior.
- Importar un archivo XLSX MT5 en una cuenta de prueba y comprobar el Dashboard y Calendario en la misma zona horaria que corresponda al informe.
- Confirmar que las operaciones cerradas a las 15:59 queden en la jornada anterior y las cerradas a las 16:00 en la nueva jornada.

## Límites conocidos

- La migración no asigna automáticamente privilegios de administrador a ningún email; el administrador inicial necesita vincular **su propio UUID** por configuración segura.
- Recuento de usuarios se construye a partir de perfiles registrados y se limita a 1000 filas; "activos" significa cuentas habilitadas, **no sesiones abiertas**.
- El permiso de suspensión en la aplicación no sustituye una revocación de sesiones de Supabase Auth ni políticas RLS exhaustivas sobre todas las tablas para una revocación inmediata de acceso a la API pública.
- Las cortesías administrativas no alteran Lemon Squeezy ni implementan por sí solas un paywall automático al vencer. Para exigir suscripción tras el mes hace falta conectar la regla comercial a los permisos y al proveedor de pagos.
- No se ha realizado una prueba E2E con una cuenta real administradora en producción desde este chat; se entregan tests automáticos y guía de validación.
