# EDGORIA 4.0 — Instalación, acceso por roles y conciliación de MT5

## Estado real y protección de producción

- El código de la V4 está empaquetado y pasó las pruebas locales. **NO está publicado automáticamente en Vercel** ni se ha certificado mediante una conexión real a MetaTrader 5.
- Se aplicó a Supabase (proyecto `jixygssxfgytxsylsowq`) la migración aditiva `edgoria_v4_role_profiles_excel_imports`. Las tablas anteriores, usuarios y operaciones permanecen intactos.
- **No ejecutar** `supabase/edgoria_v3_enforce_mt5_only_AFTER_PREVIEW.sql` ni `activate_paywall_AFTER_TESTING.sql` hasta verificar el despliegue y la API de importación. El primero bloquea las escrituras desde el navegador y puede romper una instalación antigua.
- La V4 no debe desplegarse directamente en producción sin pruebas multiusuario y funcionales; usa Preview con Vercel y un entorno de base de datos de prueba si es posible.

## Roles y correos independientes

Todos los usuarios se autentican mediante Supabase Auth (un correo único por cuenta). En el frontend se presenta el área correspondiente:

- **Trader:** Dashboard, Operaciones, Analytics, cuentas, MT5 Bridge, importaciones, Playbooks, Risk Guard, Score, suscripción y su perfil.
- **Partner:** panel de referidos, comisiones y perfil. No consulta los registros de traders ajenos.
- **Administrador:** resumen de suscripciones/afiliados, solicitudes de Partner, cuentas registradas y roles. Los datos de perfil de otros usuarios se consultan únicamente mediante funciones privilegiadas, nunca con permisos generales del navegador.

**Nunca se elige el rol de administrador en el formulario de registro.** Una persona crea una cuenta estándar, completa nombre, país, teléfono opcional y experiencia. Para acceder como Partner envía una solicitud desde la página Partners; el administrador debe aprobarla. El administrador inicial se establece con la variable privada `EDGORIA_ADMIN_USER_ID`, correspondiente al UUID del usuario que realmente hayas registrado en Supabase Auth. No es un correo, clave ni contraseña, y no debe concederse a una cuenta desconocida. Tras aprobación de Partner, cerrar sesión y volver a entrar para refrescar el menú.

No se ha implementado un sistema de invitaciones automáticas por correo; Supabase permite invitar usuarios desde Authentication > Users. Define una cuenta y correo distintos para cada rol durante las pruebas.

## Variables de entorno de Vercel

Settings > Environment Variables:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://jixygssxfgytxsylsowq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # Clave pública
SUPABASE_SECRET_KEY=sb_secret_...                         # Solo backend
EDGORIA_ADMIN_USER_ID=EL_UUID_VERIFICADO_EN_AUTH_USERS     # Solo backend
```

Se admite `SUPABASE_SERVICE_ROLE_KEY` como alternativa histórica a `SUPABASE_SECRET_KEY`, pero nunca se deben colocar las dos con valores contradictorios. **No uses el prefijo `NEXT_PUBLIC_` para secretos.** No copies valores privados a un chat, repositorio, captura, HTML ni logs. Redeploy tras modificar variables. El SDK/frontend de Supabase usa la clave publicable exclusivamente.

Para depurar MT5:

1. Inicia sesión con una cuenta Trader.
2. MT5 Bridge > **Diagnosticar API de MT5**.
3. Si muestra `SERVER_CONFIG`, revisa la variable del servidor y el entorno de despliegue (Preview vs Production).
4. Si muestra `DB_...`, examina el error `MT5 connect error` en los Logs de Vercel y comprueba tablas, permisos y migraciones de Supabase. No compartas claves privadas.
5. Cuando el diagnóstico esté correcto, genera token para **una cuenta demo**. No se solicitará contraseña MT5. Instala y compila el EA `.mq5` y confirma la primera recepción; no se ha certificado aún su compilación y funcionamiento real en MetaEditor.

## Importar Excel/CSV (alternativa sin conexión MT5 permanente)

En Trader > **MT5 Bridge > Importar Excel/CSV**, selecciona una ficha de cuenta y un archivo de ejecuciones (`.xlsx` o `.csv`) de hasta 3 MB y máximo 20.000 filas. El archivo debe contener identificadores *Ticket* y *Position*, además de `Symbol`, `Type` (BUY/SELL), `Entry` (IN/OUT), `Volume`, `Time` y `Profit`. Para importes netos añade `Commission`, `Swap` y `Fee`. Se incluye `/public/downloads/ejemplo_mt5_deals.csv`.

Importa el historial de *Deals* del MT5. Algunos informes de broker no incluyen identificador de posición o datos de entradas y salidas; **se rechazan** hasta adaptarlos correctamente. Se excluyen posiciones abiertas, incompletas y reversiones complejas; para la máxima fidelidad usa cuentas de prueba USD, con timestamps ISO UTC. Los archivos no se guardan íntegros: se calcula un hash SHA-256 y se guardan posiciones derivadas y metadatos.

Al subir correctamente, la pantalla actualiza datos; al eliminar ese archivo, se eliminan solamente sus posiciones derivadas y se recalculan resultados. Importar el mismo archivo dos veces en una cuenta está bloqueado. Si varios archivos contienen la misma posición, la gráfica la cuenta una sola vez y prioriza los datos del Bridge sobre los aportados por archivo. **La importación de archivos no verifica la autenticidad del reporte frente al broker.** No presenta operaciones de archivos como sincronizadas oficialmente. La carga no constituye conexión automática: para recibir cambios hay que subir una versión nueva del archivo o utilizar el Bridge.

## Playbooks, suscripción y privacidad

Las estrategias se crean manualmente en Playbooks, sin plantillas prefijadas. Replay Studio se mantiene como Próximamente. La pantalla de Operaciones no permite ingresar manualmente P&L, fecha de cierre o lotaje. Los cobros (US$14.90) y afiliados conservan las estructuras del proyecto previo, pero **no activar pagos reales** hasta probar webhooks, renovaciones, cancelaciones y seguridad.

Revisa `public/privacidad.html` y `public/terminos.html` antes de comercializar: faltan información legal del responsable, retención de datos y condiciones locales de suscripción. El teléfono es opcional y se guarda con RLS por propietario. No almacenar contraseñas de broker ni token de sincronización en notas o mensajes.

## Validación antes de producción

Desde la raíz de `EDGORIA_PRODUCCION_VERCEL`:

```bash
node --check public/app.js
npm test
python -m unittest discover -s tests -v
```

Luego crear tres usuarios de prueba con correos distintos (Trader, Partner aprobado y Administrador verificado), intentar acceso cruzado, importar y eliminar XLSX/CSV de prueba, revisar el P&L neto por activo y cuenta, verificar duplicados y reconexión Bridge, comprobar móviles y pruebas de recuperación de contraseña. El proyecto requiere pruebas reales en Vercel/Supabase, no basta con las pruebas locales.

Guía oficial: https://vercel.com/docs/functions/runtimes/node-js y https://supabase.com/docs/guides/getting-started/api-keys
