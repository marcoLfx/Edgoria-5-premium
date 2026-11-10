# Corrección del build EDGORIA 5.10 — Vercel

Error corregido: headers[1].headers[0] should NOT have additional property source.

Causa: se insertó accidentalmente un bloque source/headers dentro de los headers de /admin, /(.*), /app.js y HSTS.
Se conservaron las rutas /reset-password, /app, /admin y todas las API.

PARA ARREGLAR SOLO LA COMPILACIÓN:
1. En el repositorio que está conectado con el proyecto `edgoria-5-premium` en Vercel, localiza `vercel.json` en la raíz.
2. Reemplaza exclusivamente ese archivo con el `vercel.json` corregido incluido.
3. Confirma los cambios y haz Push. Vercel iniciará el nuevo build automáticamente si el repositorio está conectado.
4. Verifica que el despliegue quede `Ready`; abre /app y /reset-password, y prueba el flujo de correo en una cuenta de prueba.

Si reemplazas todo el proyecto con el ZIP completo, puedes sobrescribir cambios más recientes. Usa preferentemente el archivo individual o el parche corregido.

No modifica variables Supabase, claves, tablas, MT5, usuarios ni datos.

Aviso: esta corrección elimina un error del esquema vercel.json, pero no prueba automáticamente todas las funciones de EDGORIA ni certifica que el despliegue final será satisfactorio.
