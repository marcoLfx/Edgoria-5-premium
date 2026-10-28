# EDGORIA NEO 13 — Rediseño real de Analytics

- Mantiene API, autenticación, RLS, multi-MT5 y XLSX/CSV.
- Cambia distribución de Analytics: 4 indicadores, capital + sesión/dirección, estrategia/activo + semana + mes, MT5 Bridge.
- Valores y gráficos calculados a partir de las posiciones cerradas; no datos ficticios.
- Importar historial utiliza el Bridge existente.
- Para GitHub usar el paquete pequeño y poner el contenido de public/ en public/ del repo, reemplazando app.js, styles.css, index.html y agregando neo13.css.
- Verificar NEO 13 en encabezado de Analytics después de nuevo despliegue Ready desde GitHub.
- Esta entrega es código fuente, no un despliegue ejecutado en Vercel.
