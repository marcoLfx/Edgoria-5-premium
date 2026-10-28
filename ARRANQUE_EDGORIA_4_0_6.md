# Corrección EDGORIA 4.0.6

El defecto observado fue `Uncaught ReferenceError: prop is not defined` en `public/app.js`, registro `const pages`.

## Publicación

1. En GitHub `marcoLfx/edgoria-produccion`, rama `main`, sustituir **solo** `public/app.js` y `public/index.html` por las versiones de este paquete, o subir todo el contenido extraído del ZIP a la raíz del repositorio.
2. No subir el ZIP, archivos `.env` ni claves privadas.
3. Confirmar los cambios en GitHub.
4. Comprobar en Vercel el nuevo despliegue que corresponda al commit de GitHub, estado Ready y Production.
5. En `https://edgoria40saasmt5rolesexcel.vercel.app/app.js` buscar `prop:connectV4` (debe existir); en el código antiguo aparecía `mindset,prop,replay`.
6. Recargar la página con Ctrl+Shift+R. Si aparece un error distinto, copiar únicamente el mensaje sin tokens de Console.

No ejecutar cambios SQL para este parche.
