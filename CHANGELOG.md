## EDGORIA 4.0.6 — Reparación del arranque

- Corrige la referencia `prop` indefinida en el registro de páginas.
- Refresca la ruta de app.js con identificador de versión para evitar caché de archivos antiguos.
- Añade diagnóstico temprano para errores de ejecución de JavaScript sin exponer datos de sesión.

# 4.0.4 — 25 oct 2026
- Roles de interfaz aislados: owner/admin, partner, trader. El rol se valida en API desde Supabase Auth/RLS.
- Control del administrador: habilitar, suspender, un mes de prueba manual y revocar prueba. Sin exposición de credenciales.
- Tabla protegida edgoria_v4_access_grants y bloqueo de los endpoints de usuario al suspender.
- Sidebar desplazable y cierre de sesión siempre visible en topbar.
- Eliminar Playbooks del producto sin borrar históricos SQL de estrategias.
- Calendario y Analytics por jornada 16:00 a 16:00 por cierre, zona horaria configurable.
- Consultas aceleradas para paneles de partners y admin. Tests E2E simulados de backend y archivo MT5.

## 4.0.3 — MT5 sin secreto de servidor para archivos
- Importación y borrado de lotes con sesión autenticada Supabase y RLS propietario.
- Corrige el criterio de ordenación de lotes del dashboard y permite paginar posiciones.
- Diagnóstico MT5 de lectura ya no requiere clave privada; el Bridge automático sí.
- Actualiza pruebas de rutas y seguridad de importación.

## 4.0.2 · MT5 native history import fix

- XLSX nativo MT5 español e inglés: Posiciones, Ordenes, Transacciones, Resultados.
- XML UTF-16, celdas vacías autocerradas y namespaces.
- CSV/HTML del resumen de posiciones; se conserva formato Deals.
- Reconciliación neta; selector persistente, estado de subida, mensajes de error.
- Continúa dentro del límite Vercel Hobby (9 funciones).
- Sin nuevas migraciones SQL ni cambios de cobros.

# EDGORIA Vercel MVP — Avances entregados

## Disponible en el paquete
- Vercel-ready: proyecto estático con `vercel.json`, `public/` y endpoint `/api/config`.
- Interfaz renovada de 10 módulos, estilo Obsidian Aurora, móvil y escritorio.
- Login/registro y persistencia multiusuario con Supabase después de aplicar el SQL y variables Vercel.
- Modo demostración sin servicios externos, con datos ficticios y `localStorage`.
- Tabla accounts, trades, journal_entries, payouts y políticas RLS de propiedad y relación cuenta-usuario.
- Registro, edición, eliminación y filtrado de operaciones; cuentas, retiros y notas.
- Dashboard, equity curve, profit factor, win rate, expectancy y drawdown histórico cerrado.
- Calendario P&L, reportes por activo, estrategia, sesión y día.
- Importador de CSV con detectores de columna, filas normalizadas y deduplicación básica por ticket, exportación CSV.
- Laboratorio de replay sintético, sin acceso a precios históricos.
- Sistema de marca y guías de despliegue.

## No implementado / no probado externamente
- Vercel deployment real (requiere cuenta/acceso).
- Credenciales y proyecto Supabase reales; usuario multi-tenant end-to-end (RLS SQL está preparado pero requiere validar en Supabase).
- Sincronización MT4/MT5 automática, conectores externos, IA generativa, gráficas profesionales en tiempo real.
- Suscripciones/pasarela de pagos, mentor, admin, planes, facturación.
- Precios bursátiles históricos reales, replay con datos reales, backtesting de ejecución.
- Auditoría de seguridad, carga y estrés con miles de usuarios.

## V4.0 — 2026-10-25
- Paneles por rol, perfil ampliado, importación MT5 Excel/CSV reversible y diagnósticos del Bridge.
- Producción aún sin publicar; migración de V4 aditiva aplicada a Supabase.
