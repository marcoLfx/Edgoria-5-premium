# EDGORIA 3.0 — guía de instalación segura

**IMPORTANTE:** este paquete NO se ha desplegado automáticamente en tu proyecto Vercel. Los cambios de la base de datos de V3 no deben aplicarse a producción por sorpresa.

## Qué incluye EDGORIA 3.0

- Dashboard, Analytics y operaciones filtrados exclusivamente por identificadores provenientes del MT5 Bridge (prefijo `mt5:`). Los trades creados manualmente antes de V3 **no se borran**: permanecen preservados en la tabla `trades`, pero no aparecen en las métricas V3.
- Nueva página **Mis cuentas MT5**: crea una ficha por número de cuenta del terminal. La ficha no genera posiciones ni ganancias.
- **MT5 Bridge** con token de lectura revocable; el EA es incapaz de enviar órdenes y envía todas las ejecuciones históricas que MT5 tenga disponibles en el primer inicio (configuración `HistoryDaysFirstImport=0`). En las siguientes ejecuciones revisa los registros recientes periódicamente con deduplicación por deal ticket.
- **Playbooks** empieza vacío: tú creas, editas o eliminas estrategias. Tras importar operaciones reales puedes asignar estrategia y notas privadas a cada operación sin modificar datos financieros.
- **Replay Studio** muestra únicamente una pantalla Próximamente.
- El modelo de suscripción, afiliados, Risk Guard, Score y Mindset se conservan tal como estaban en V2.

## Orden de instalación

1. Descarga y descomprime el ZIP. Conserva una copia del despliegue V2 y de tu base de datos antes de cambiar producción.
2. **Este Supabase ya recibió la migración aditiva de V3 en esta conversación**. No necesitas ejecutarla otra vez allí. En otro proyecto Supabase, instala `supabase/edgoria_v3_strategies.sql` antes de Preview. La migración no borra datos.
3. Publica un **Vercel Preview** de esta carpeta `EDGORIA_PRODUCCION_VERCEL`. Comprueba que `api`, `server`, `public`, `mt5`, `supabase` y `vercel.json` estén en la raíz. Framework Other, Output Directory `public`.
4. En Vercel → Settings → Environment Variables, verifica que existan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Para **MT5 Bridge** es obligatoria la credencial privada `SUPABASE_SERVICE_ROLE_KEY` (sin prefijo `NEXT_PUBLIC_`). Configúrala dentro del panel seguro de Vercel, nunca en conversaciones, archivos públicos, capturas o frontend. Redeploy después de editar variables.
5. Prueba el acceso con cuentas A y B. Crea una ficha demo y confirma que no exista botón ni formulario de creación manual de operaciones; comprueba que Playbooks aparezca vacío y puedas crear una estrategia.
6. En la ficha nueva, abre MT5 Bridge, registra el login numérico del terminal y el servidor exacto. Copia el token que aparece una sola vez. Si «No se pudo crear la conexión», abre Vercel Logs para `/api/mt5-connect`; comprueba la variable privada y que el servidor esté usando el proyecto Supabase correcto.
7. Instala `mt5/EDGORIA_ReadOnly_Bridge.mq5` (MT5 escritorio → Archivo → Abrir carpeta de datos → MQL5 → Experts). Compila con MetaEditor (`F7`). En MT5 → Herramientas → Opciones → Asesores Expertos, autoriza WebRequest exclusivamente al dominio HTTPS de EDGORIA. Coloca `EDGORIA_Token` y `EDGORIA_Endpoint` en las entradas del conector. **Usa una cuenta demo en USD al probar**. MT5 debe permanecer abierto para sincronizar.
8. Tras el primer ciclo, revisa el P&L y conteo por cuenta en dashboard. Contrasta **cada trade consolidado** con el historial MT5 incluyendo comisiones, swaps y cierres parciales. No habrá P&L de depósitos, balance ni posiciones abiertas. Cuentas denominadas en otras monedas aún no se importan para no mostrar resultados erróneos en USD.
9. Revoca el token para comprobar acceso. Para reconectar la **misma** cuenta usa «Crear token nuevo»; mantiene sus ejecuciones anteriores. Para un login diferente, crea otra ficha.
10. **Solo tras validar la importación y los dos usuarios en Preview**, ejecuta `supabase/edgoria_v3_enforce_mt5_only_AFTER_PREVIEW.sql` para prohibir definitivamente operaciones manuales mediante RLS/GRANT en Supabase. Esta acción hará que la **V2 antigua deje de poder insertar operaciones manuales**. No corras este archivo antes de confirmar que la V3 funciona. Promociona producción después de los ensayos y de la activación controlada.

## Comprobaciones y límites

- `npm test` y `python -m unittest discover -s tests -v` y `node --check public/app.js`.
- La importación automática requiere **MT5 abierto**. No equivale a una API universal 24/7 del broker. La cuenta de trading no se opera desde EDGORIA.
- No se debe entregar una contraseña de inversor ni contraseña de trading a EDGORIA; el EA se ejecuta en el terminal propio y usa solo un token EDGORIA para transmitir el historial.
- Para conciliación correcta, V3 sólo admite **cuentas denominadas en USD**. Las operaciones netting con inversiones de posición, ejecuciones especiales de comisiones y brokers de formatos atípicos pueden requerir adaptación. Las posiciones incompletas no se inventan.
- Los cálculos de EDGORIA 3.0 muestran **P&L realizado de posiciones cerradas**, no balance real/equity flotante, garantías oficiales de prop firms ni señales de inversión.
- Los pagos recurrentes y programa de afiliados aún deben validarse con la pasarela en modo de prueba antes de activar los cobros. No actives el script de paywall hasta validar todo.
- Reportes provenientes de **trades anteriores manuales** siguen en la base, pero V3 deliberadamente no los mezcla con el MT5 automático. Antes de migrar, respalda los datos.

## Estado de entrega

✅ Código fuente + pruebas automatizadas locales + SQL separados. 
⚠️ Pendientes: compilar el EA en MetaEditor real, conectar una demo USD, probar conciliación en MT5 real, validar credenciales y logs Vercel, ejecutar pruebas end-to-end y publicar Preview, luego producción. Nunca se ha declarado una sincronización MT5 de producción verificada.
