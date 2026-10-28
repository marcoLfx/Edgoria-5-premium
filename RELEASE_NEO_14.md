# EDGORIA NEO 14 — Analytics y Dashboard (27/10/2026)

## Mejoras
- Dashboard: P&L de la jornada activa y P&L histórico, cantidades USD y porcentajes respecto al capital NOMINAL configurado.
- Analytics: mejores y peores jornadas del período, drawdown máximo realizado intradía, lotes promedio MT5 y estadísticas por cuenta.
- Curva de capital estimada: punto por jornada, etiquetas al pasar mouse / foco con P&L diario y P&L acumulado. Solo aproxima capital nominal + cierres, sin flotantes, depósitos y retiros.
- Filtros Hoy, Elegir fecha, 7, 30, 90 días, Todo. Usan el perfil de cierre de la cuenta en el calendario.
- Excel MT5: el importador persiste `volume_lots` y el puente MT5 registra volumen de posición.

## Cambios de infraestructura
- Migración aditiva `migrations/20261027_neo14_lotage.sql` aplicada y verificada en Supabase `jixygssxfgytxsylsowq`.
- Solo se agregaron las columnas anulables `volume_lots` a `trades` y `edgoria_v4_file_positions`; no se borró nada ni cambiaron políticas RLS.
- Los historiales anteriores carecen de volumen: mostrarán N/D. Para obtenerlo, eliminar SOLO el lote pertinente después de hacer respaldo y reimportar el Excel original. La plataforma no reconstruye lote a partir de P&L.
- `app.js`, `index.html`, `neo14.css`, `performance14.js` en `public`; `positions.js` y `mt5-spreadsheet.js` en `server`.
- NO modificar las variables de Vercel ni ejecutar otra vez SQL.

## Validación
- 84 pruebas de JS y 11 de Python aprobadas.
- Prueba de interfaz en navegador con datos FICTICIOS: puntos y tooltip, Hoy, Elegir fecha, Dashboard, sin errores JS.
- Excel original usado en una prueba local (NO incorporado en el ZIP): 18 cierres, lotes reconocidos, conciliación de -339.33 USD.
- Pendiente: despliegue GitHub/Vercel y prueba de subida con la sesión autorizada de producción.

## Cómo publicar
1. Crear respaldo / confirmar `main` actual en GitHub.
2. Desde `main` subir `public/app.js`, `public/index.html`, `public/performance14.js`, `public/neo14.css`, `server/positions.js`, `server/mt5-spreadsheet.js` a las mismas rutas. Se recomienda subirlos en un único commit.
3. Revisar Vercel Deployments: GitHub `main`, Production, Ready.
4. Abrir `https://edgoria40saasmt5rolesexcel.vercel.app/`, recargar sin caché, confirmar `EDGORIA NEO 14` en Analytics.
5. Probar fecha específica, curva tooltip, cuenta y lotaje. Guardar una copia del informe antes de reimportar archivos existentes.

## Avisos
- Una métrica porcentual de P&L / capital nominal NO sustituye ROI, balance/equity real ni límite contractual de una prop firm.
- Máximo drawdown diario únicamente se calcula usando la sucesión de posiciones ya cerradas. No incluye drawdown flotante.
- Al cambiar filtro se muestran estadísticas del período seleccionado. Mejor/peor jornada también siguen ese período.
