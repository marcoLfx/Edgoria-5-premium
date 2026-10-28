# EDGORIA 10.1 — entrega

## Qué cambió
- Reglas de jornadas de reporte seleccionables **por cuenta MT5** y una regla de comparación para «Todas mis cuentas». Las preferencias se guardan en el navegador y no alteran la base de datos.
- Perfiles: Nueva York 17:00; FTMO medianoche Europe/Prague; FundedNext CFD medianoche Europe/Athens; Topstep 17:00 Chicago, alternativa antigua de Lima 16:00 y UTC 00:00. Zona horaria IANA con DST.
- Cierres reflejados en la jornada de realización del P&L.
- Calendario mensual con operaciones por día, totales por semana y resultados de mes.
- Gráficos de jornadas, resultado acumulado y retroceso realizado, SVG/CSS sin dependencias externas.
- Plan gratuito explicado de manera transparente en «Mi suscripción»; la cortesía administrativa de un mes y el proveedor de pagos siguen separados.

## Límites importantes
No existe un único reset para todas las prop firms. Las jornadas son informativas y **NO** verifican el cumplimiento de restricciones financieras: falta el P&L flotante y puede haber diferencias en reglas de apertura frente a cierre, parcializaciones y cálculo de fees. El backend de gating del plan gratuito debe implementarse y probarse por separado antes de publicitar límites de uso exigibles.

## Despliegue seguro
Actualiza **solo** `public/app.js`, `public/trading-day.js`, `public/styles.css` y `public/index.html` en el GitHub privado ya conectado al proyecto de Vercel; conserva todos los archivos de `api/` y `server/` (junto con `SUPABASE_SECRET_KEY` y `EDGORIA_ADMIN_USER_ID`).
Vercel → Deployments → nuevo commit de GitHub → Ready. Verifica roles, carga Excel y resumen del calendario después de publicar.
