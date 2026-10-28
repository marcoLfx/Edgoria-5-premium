# EDGORIA 5.0 — Rediseño visual premium sobre NOVA 4.2

## Incluido
- Tema oscuro premium, navegación azul, tarjetas elegantes.
- Identidad tipográfica EDGORIA sin imagen, símbolo ni favicon.
- Frontend, Supabase, endpoints, migraciones y bridge MT5 originales conservados.

## Limitaciones honestas
Esta entrega es una actualización visual de NOVA 4.2. No incorpora un motor de IA nuevo ni garantiza que MT5 o billing funcionen en tu infraestructura. La app usa la lógica existente y requiere configuración externa segura.

## Puesta en marcha en Vercel
1. Realiza copia de seguridad del repositorio y de la base de datos antes de modificar producción.
2. Sube el contenido de este ZIP a una nueva rama o repositorio GitHub.
3. Importa el repositorio en Vercel como nuevo proyecto o despliegue Preview; conserva las variables de entorno existentes desde Vercel, nunca en el código.
4. Valida `/api/config`, login, aprobación admin, cuentas, importación CSV/Excel, operaciones, analytics y permisos de acceso con usuarios de prueba.
5. Promueve a producción solo tras completar las pruebas manuales.

## Restauración
Redeploy del commit anterior NOVA 4.2. No ejecutar nuevas migraciones hasta revisar diferencias con el proyecto Supabase real.
