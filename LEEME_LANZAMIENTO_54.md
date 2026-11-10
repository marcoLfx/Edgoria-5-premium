# EDGORIA — LANDING DE LANZAMIENTO 5.4

## Alcance realizado

- Landing pública en `/` basada en `descubre.html` existente y el concepto visual aprobado.
- Barra superior responsive: Plataforma, Cómo funciona, Seguridad, Preguntas, Iniciar sesión y Crear cuenta.
- Acceso privado y journal en `/app` (`public/app.html`), con app.js y la lógica actual conservados.
- Reemplazados enlaces obsoletos a NOVA 4.2. Página de descubrimiento anterior redirige al inicio.
- Recuperación de contraseña y confirmación de correo apuntan al acceso privado `/app`, no al marketing.
- Registro desde landing abre `/app?register=1` (respeta aprobación de admin).
- Referencias `?ref=edg-...` se conservan en los enlaces de CTA.
- Diseño responsive mejorado para el login, que se cortaba en pantallas estrechas.
- Corrección comprobada de un fallo crítico: `eg17RiskAside(r)` usaba una variable inexistente; ahora utiliza `eg17RiskAside(risk)` en Overview.
- Se preservan las APIs, esquema Supabase, importación MT5, Strategy Lab, navegación y demás componentes de la versión recuperada 5.3.

## Publicar de forma segura

1. **No sobrescribir producción.** Sube la carpeta completa a un repositorio de PRUEBAS o una rama nueva. El ZIP se basa en EDGORIA 5.3 recuperada, no en una lectura verificada del último commit de producción.
2. En Vercel importa el repositorio de pruebas, Framework Other, Root `./` y Output `public` como está en `vercel.json`.
3. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en el entorno Preview. Claves privadas, solo del lado servidor y únicamente si el backend del proyecto lo requiere.
4. Supabase Auth → URL Configuration: permite los dominios de Preview para callbacks de pruebas. Añade `https://TU-DOMINIO/app` como Redirect URL para recuperación/correo. No compartas claves privadas.
5. Verifica registro, confirmación, inicio de sesión, aprobación de admin, recuperación, Dashboard, carga de operaciones, MT5, Strategy Lab, Analytics y enlaces legales; realiza pruebas de dos usuarios aislados.
6. Cuando la suite crítica pase, respalda base y promueve esa rama de pruebas a producción. Para tu dominio comercial, apunta el dominio de Vercel solo cuando la versión esté validada.

## Importante sobre el dominio

Si ya tienes otras rutas o enlaces de Supabase con la raíz `/`, confirma la nueva ruta `/app` en `Supabase → Authentication → URL Configuration`. La landing redirige enlaces de recuperación recibidos accidentalmente en `/` hacia `/app`.

## Limitaciones actuales

La landing y sus rutas están construidas y comprobadas localmente; **corrige el ReferenceError comprobado en Overview**, pero todavía no certifica los resultados con tu base Supabase. No hemos probado el inicio de sesión real ni los permisos en tu entorno remoto. El objetivo de lanzar hoy requiere esas pruebas reales antes de invitar usuarios.
