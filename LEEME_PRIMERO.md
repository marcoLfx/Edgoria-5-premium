# EDGORIA 5.6 · Cambios solicitados

## Contenido

1. Menú: Dashboard → Calendario → Journal → Analytics → Strategy Lab → Risk Watch → AI Coach → Reportes; debajo, separados: Cuenta, Mis Cuentas, Suscripción, Ajustes.
2. Dashboard: Insights de EDGORIA ocupa 100% del ancho. Eliminada la tarjeta Plan de riesgo del día. Los datos siguen viniendo del historial real.
3. Landing: texto de seguridad simplificado, precio regular US$14.99 tachado y lanzamiento US$10.99 por 1 mes, hasta 5 conexiones MT5 y activación USDT manual. No se muestra dirección de pago inventada.
4. Suscripción interna: oferta, estado manual verificado, vencimiento y contador MT5.
5. Admin: lista de usuarios y accesos, indicador de mensualidades vigentes, acción "Confirmar USDT · 1 mes" con referencia verificada, revocación, y contadores. Solo el servidor autoriza y registra verificaciones.
6. Servidor: máximo 5 vinculaciones MT5 por usuario; SQL entrega además protección concurrente; acciones USDT atómicas con registro de auditoría.

## Instalación en una RAMA DE PRUEBA

- **Haz respaldo de tu BD y del repo antes de comenzar.**
- Abre GitHub Desktop y confirma que el repositorio corresponde a EDGORIA y la rama NO es main ni master.
- Extrae este ZIP a una carpeta nueva en Windows.
- Ejecuta `INSTALAR_EN_WINDOWS.bat`, proporcionando la ruta de la raíz del repositorio, por ejemplo `C:\Users\TU_USUARIO\Documents\GitHub\edgoria-produccion`.
- El instalador comprueba SHA256 de cada archivo frente a la versión 5.5 de la que partimos. Si tu código difiere, **se detiene sin sobrescribir**. No uses el ZIP completo para saltarte la comprobación.
- Si aplica, revisa los cambios en GitHub Desktop → Commit → Push origin → Vercel Preview.

## Base de datos y pagos (PRUEBAS antes de activación)

1. **Nunca compartas la clave secreta en GitHub ni en el navegador.** En Vercel (servidor), usa `SUPABASE_SECRET_KEY` para los endpoints admin con autorización; URL y clave pública se configuran por separado.
2. Tras backup y en un Supabase de pruebas, ejecuta desde SQL Editor `supabase/edgoria_v56_manual_usdt.sql`. Contiene RLS y funciones transaccionales de verificación. Revisa su contenido antes de aplicarlo a producción.
3. En Vercel Preview establece `EDGORIA_USDT_MANUAL_ENABLED=1` (no es clave secreta; solo habilita el módulo admin USDT). Re-deploy Preview.
4. En el panel administrador verás usuarios registrados, activos y pagos activos. Para verificar un USDT REALMENTE RECIBIDO, utiliza el botón `Confirmar USDT · 1 mes`, introduce la referencia comprobada y confirma. **Nunca actives basado solo en una captura o afirmación del usuario.** La acción crea la mensualidad por un mes calendario y actualiza acceso.
5. Prueba: registro → email confirmado → admin valida pago → mensualidad → login → hasta 5 enlaces MT5 → revocación → login bloqueado, sin perder historial. Comprueba que se rechacen referencias duplicadas y el sexto enlace MT5.
6. **No actives `EDGORIA_ENFORCE_PAID_ACCESS=1` hasta validar todos los flujos**, incluido acceso de admin sin pago y cuentas activas antiguas. Con esa variable, usuarios sin mensualidad activa o cortesía vigente no podrán acceder a endpoints protegidos.
7. La aplicación no recibe USDT ni conecta con una cartera; solo permite registrar y auditar la verificación externa, manual y administrativa. No se ha configurado dirección de pago ni confirmación automática on-chain.

## Estado de pruebas

- Pruebas nuevas: 6/6 correctas (orden, dashboard con cero y dos operaciones, landing/precios, esquema/seguridad, límite MT5, suscripción).
- Suite histórica de 5.5: 120/156. La 5.6: 124/162; **38 tests heredados/versionados fallan**. No se certifica producción.
- Se requiere desplegar en Preview, verificar el esquema SQL, RLS, roles, importación MT5, expiración, suspensión y control administrativo con datos reales antes del lanzamiento.
- La versión NO se ha publicado en GitHub, Vercel ni Supabase desde este entorno.
