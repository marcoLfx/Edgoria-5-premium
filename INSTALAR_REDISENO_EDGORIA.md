# EDGORIA — parche visual premium sobre tu proyecto funcional

Este paquete se construyó sobre los archivos recuperados de EDGORIA NOVA 4.2. **No se ha conectado a tu producción ni confirmado que ese ZIP sea idéntico al código actualmente funcional.**

## Forma recomendada (sin cambiar Supabase)
1. Abre el repositorio GitHub de la versión **que ya inicia sesión y funciona**, no el repositorio nuevo que muestra «Conexión de datos pendiente».
2. Crea una rama `redesign-premium`, y respalda el estado anterior.
3. Copia los 3 archivos de la carpeta `PARCHE_SOLO_VISUAL/public/` al `public/` del repositorio funcional.
4. No copies `api`, `supabase`, `server`, `migrations`, `.env` ni `vercel.json`.
5. Publica Preview en Vercel usando las variables que YA tiene el proyecto funcional.
6. Comprueba login, cuentas, importación, journal, calendario, estadísticas y admin. Después promueve a producción.

## Consideración
El archivo `app.js` del parche corresponde al EDGORIA NOVA 4.2 recuperado. Si el código de tu producción actual tiene cambios posteriores, **NO lo sustituyas sin comparar ambos archivos**. En ese caso, aplica manualmente solo estos cambios: retirar `<div class="brandmark">${icon}</div>` en `const brand`, incluir `edgoria-premium.css` al final de la lista de CSS y cambiar el versionado del script.

## Backend
No se modifica ninguna API, fórmula, registro, esquema ni variable de entorno. El diseño de referencia se aproxima a nivel de estilo sin inventar indicadores o datos.
