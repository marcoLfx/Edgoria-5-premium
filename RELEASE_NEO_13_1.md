# EDGORIA NEO 13.1 — Separación de gestión de cuentas y MT5 Bridge

- «Mis cuentas MT5» (`prop`) solo contiene creación, edición y eliminación de fichas de cuentas.
- «MT5 Bridge» (`connect`) solo permite conectar cuentas ya registradas, importar Excel/CSV y gestionar conexiones y archivos.
- Importación y cálculos conservados sin cambios del servidor ni de la base de datos.
- Eliminación protegida con confirmación; si existen datos vinculados exige escribir `ELIMINAR` y avisa del borrado en cascada.
- Registra primero tus cuentas; después carga los archivos desde Bridge.

**Instalación**: reemplazar solamente `public/app.js`, `public/index.html`, `public/neo13.css` desde el parche. No ejecutar SQL.
