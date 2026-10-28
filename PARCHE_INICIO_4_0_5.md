# EDGORIA 4.0.5: corrección del inicio

Este paquete conserva todos los módulos de la V4.0.4 y agrega un diagnóstico para un arranque que antes podía quedarse permanentemente en “Preparando tu espacio…”.

- Límite de espera de `/api/config`, autenticación, permisos y datos.
- Fuente alternativa para cargar la biblioteca de Supabase si esm.sh falla.
- Pantalla de diagnóstico cuando el JavaScript no llega a ejecutarse, con acceso a `/api/config`.
- NO cambia la base de datos ni requiere migraciones adicionales.

**Instalación en el proyecto existente**: actualiza tu repositorio privado GitHub de EDGORIA reemplazando los archivos del proyecto con los de esta carpeta, deja las variables privadas únicamente en Vercel, y verifica el nuevo despliegue GitHub de la rama main.

Si falla el inicio, la nueva pantalla informará el paso que no respondió y el usuario puede abrir la consola del navegador. Si `/api/config` muestra `configured:false`, comprueba la configuración pública de Supabase en el entorno del despliegue. No publiques el JWT del usuario ni claves privadas.
