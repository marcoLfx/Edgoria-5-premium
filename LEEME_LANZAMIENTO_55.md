# EDGORIA 5.5 — Landing de lanzamiento

## Qué se entrega

- Landing pública original en `/` inspirada en la **claridad estructural** de las mejores herramientas SaaS de journal, sin copiar TradeZella.
- Navegación superior fija: Plataforma, Funciones, Cómo funciona, Seguridad, FAQ, Iniciar sesión y Crear cuenta.
- Diseño de presentación con mockup **ilustrativo** y sin datos reales inventados; módulos Overview, Journal, Analytics, Strategy Lab, Risk Watch y Mis Cuentas.
- Pestañas de producto, preguntas desplegables, menú móvil, animaciones respetuosas con `prefers-reduced-motion`, responsive.
- Aplicación privada existente en `/app` (`public/app.html`), formularios de registro en `/app?register=1` y recuperación de contraseña/correo que regresan a `/app`.
- Corrección conocida de ReferenceError del Overview (`eg17RiskAside(risk)`), demostrada con estado vacío y dos operaciones en prueba local.
- Se conserva el código actual recuperado de Supabase Auth, MT5, Strategy Lab, Analytics y permisos.
- No elimina tablas, ni configura claves nuevas ni modifica datos reales.

## Archivo principal

`public/index.html` es la landing. `public/edgoria-launch55.css` y `public/edgoria-launch55.js` contienen diseño e interacciones. `public/app.html` conserva la SPA del journal. `vercel.json` contiene el rewrite `/app`→`/app.html`.

## Recomendado para actualizar tu repositorio actual

Usa el ZIP **EDGORIA_5_5_PARCHE_SEGURO.zip** en una rama nueva: conserva tu archivo actual `public/app.js` con todos tus arreglos y aplica únicamente correcciones localizadas. No copies el `public/app.js` de esta versión completa encima del tuyo sin compararlo.

1. En GitHub Desktop: selecciona `edgoria-produccion`, crea una rama `landing-edgoria-55` desde el último `main`, deja todo sin cambios pendientes.
2. Extrae el ZIP del parche. Abre PowerShell allí. Ejecuta `python aplicar_edgoria55.py "C:\Users\TU_USUARIO\Documents\GitHub\edgoria-produccion"`, sustituyendo la ruta con la carpeta que muestra GitHub Desktop → Repository → Show in Explorer.
3. Comprueba los cambios, haz Commit y Push. Revisa el Preview en Vercel.
4. Confirma que el proyecto Preview tiene las variables de Supabase y está en estado `Ready`. No promociones a producción sin pasar la lista de abajo.

## Lista de verificación obligatoria para lanzar

- [ ] `/` abre landing y el logo; todos los botones internos, menú móvil y secciones responden.
- [ ] `/app` abre el journal; `/app?register=1` inicia registro.
- [ ] `/api/config` devuelve `configured: true` sin datos sensibles.
- [ ] Supabase → Authentication → URL Configuration acepta **tu dominio real** + ruta `/app` y los Preview usados para validación.
- [ ] Usuario pendiente no puede acceder; usuario aprobado inicia sesión.
- [ ] Restablecimiento de contraseña y confirmación de correo regresan a `/app`.
- [ ] Overview se ve sin operaciones y con operaciones, P&L/Win Rate coinciden con operaciones reales.
- [ ] Journal, Strategy Lab, Analytics, importador MT5 y roles no fallan.
- [ ] Dos usuarios no pueden ver los registros privados del otro (RLS comprobado).
- [ ] Backup y rollback preparados antes de tocar el dominio comercial.

## Pruebas realizadas en esta entrega

- 6/6 pruebas focalizadas de landing y accesos.
- Javascript del journal y landing: `node --check` correcto.
- Vista de navegador offline: escritorio/móvil sin overflow, pestañas y menú funcionando, sin errores JS en la landing.
- Smoke del Overview con 0 y 2 operaciones de ejemplo: correcto.
- La suite histórica contiene verificaciones de interfaces y versiones previas que ya no describen esta entrega: 122 de 156 pruebas pasaron. **No está certificada por esa suite completa**.

## Qué no se pudo certificar

No hay acceso verificado a la copia más reciente del repositorio de producción ni a un usuario de prueba real de Supabase en tu Vercel. Por tanto, **no se garantiza el funcionamiento de todos los flujos remotos hasta ejecutar las pruebas anteriores en Preview**.

## Seguridad

Nunca incluyas `.env` ni claves `sb_secret_` o `service_role` en archivos de `public`. No fuerces login sin aprobación. Los insights de trading no son promesas de resultados ni señales de inversión.
