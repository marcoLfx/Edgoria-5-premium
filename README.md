# EDGORIA 4.0.4 — Gestión de accesos y calendario 16:00–16:00

**Consulta primero `ENTREGA_EDGORIA_4_0_4.md` para instalación, roles, pruebas y límites de producción.**

# EDGORIA 4.0.3 — importación MT5 con sesión autenticada

**Problema corregido:** `SERVER_CONFIG` al importar un historial Excel de MT5, aunque el acceso público y el inicio de sesión de Supabase funcionasen.

## Cambios

- `api/v4-file-upload`, `api/v4-file-delete` y `api/v4-mt5-diagnostics` usan el JWT del usuario validado por Supabase y la clave **publicable**, sin requerir `SUPABASE_SECRET_KEY`.
- RLS restringe lotes y posiciones a la propia cuenta del usuario. No se concede capacidad UPDATE ni DELETE directo de posiciones.
- El importador sigue mostrando lote/archivo y reconciliando P&L, comisión y swap. Su resultado queda marcado como **archivo aportado no verificado**, no como verificación del broker.
- Dashboard: consulta lotes por `uploaded_at` (en vez de una columna inexistente `created_at`) y pagina las posiciones importadas más allá de 1000 registros. No inventa un valor de riesgo inicial (R) si el reporte no lo contiene.
- No se incluye información del archivo personal usado en las pruebas.

## Requisitos para el importador

Solo estas dos variables deben existir en Vercel **Production** (además de otras variables usadas por distintas funciones):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Ejecutar **una vez** `supabase/edgoria_v4_0_3_user_import_rls.sql` en Supabase SQL Editor si la migración todavía no está aplicada. El proyecto en la conversación ya recibió la migración automáticamente mediante la conexión Supabase, y no debe ejecutarla por segunda vez (aunque es idempotente).

Después desplegar esta carpeta en el proyecto Vercel existente `edgoria_4_0_saas_mt5_roles_excel`, no crear uno nuevo. Abrir el dominio de producción, iniciar sesión, seleccionar cuenta y subir archivo.

**El Bridge automático de MT5, operaciones administrativas y cobros siguen necesitando sus respectivas credenciales privadas**; esta mejora solo elimina esa dependencia para carga por archivo, borrado de lotes y diagnóstico de lectura. Nunca publicar `SUPABASE_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en el navegador.

## Seguridad

- RLS exige `auth.uid()` en cada fila. Para crear un lote, la cuenta debe pertenecer al usuario. Para crear posiciones, el lote debe pertenecer al usuario y a la misma cuenta.
- Un usuario no puede modificar ni borrar filas individuales importadas, solo borrar sus lotes completos. No se accede a archivos de otros usuarios.
- La información subida es aportada por el usuario; como cualquier exportación local, no constituye prueba independiente de resultados.
- Límite de 3 MB por subida, y 20 000 posiciones reconocidas por archivo.
- `node --test tests/*.test.js` ejecuta las pruebas.

## Alcance de las pruebas

Pruebas de código y subida simulada; **no** un despliegue de Vercel ni una carga real a la cuenta. Validar en el dominio principal una vez publicado.

---

> **Actualización 4.0.2:** corregida importación del XLSX completo de MT5 (incluye UTF-16LE y sección Posiciones). Consulta [CORRECCION_MT5_V4_0_2.md](CORRECCION_MT5_V4_0_2.md).

# EDGORIA 4.0 — Trading Intelligence

**Proyecto completo para despliegue Preview en Vercel.** Mantiene el journal anterior y añade perfiles con nombre/país/teléfono opcional, separación de roles Trader/Partner/Administrador, importación de ejecuciones MT5 en XLSX/CSV con eliminación por lote y actualización de gráficos, diagnóstico de conexión Bridge y Playbooks propios. Las operaciones manuales permanecen deshabilitadas en V4.

**Importante:** La migración aditiva V4 ya se ejecutó en Supabase. Este ZIP no ha sido publicado en Vercel ni verificado contra MT5 real. Para instalar, empieza por `INSTRUCCIONES_EDGORIA_4.0.md`. No ejecutes el SQL restrictivo V3 de trades hasta verificar Preview. No actives pagos reales sin pruebas de webhook.

---

# EDGORIA 3.0 — Journal MT5

EDGORIA 3.0 está diseñado para importar automáticamente operaciones **cerradas** desde una o varias cuentas MetaTrader 5 mediante un conector de **solo lectura** instalado en el terminal del usuario.

## Lo nuevo

- Eliminada la creación / edición manual de operaciones y la importación CSV (se conserva la exportación CSV del historial recibido por MT5).
- Playbooks: crea tus propias estrategias, sin estrategias predefinidas. Anota o clasifica operaciones sincronizadas sin alterar importes, precios, direcciones ni fechas.
- Replay Studio: apartado informativo «Próximamente».
- Mis cuentas MT5: fichas separadas por cuenta, vinculación con login y servidor, historial anterior y sincronización posterior cuando MT5 esté abierto.
- Dashboard, Analytics, Calendario, Risk Guard, Score y Journal emocional conservados. Recarga automática del dashboard cada 60 segundos con la pestaña activa (tras sincronización MT5).
- Plan SaaS US$14.90 / mes y programa de afiliados provenientes de V2. No activar cobros reales antes de validar webhooks.

## Documentación de instalación

**Lee primero `INSTRUCCIONES_EDGORIA_3.0.md`.** La migración `supabase/edgoria_v3_strategies.sql` es aditiva, mientras que `supabase/edgoria_v3_enforce_mt5_only_AFTER_PREVIEW.sql` se ejecuta **solo después** de probar el conector y el Preview. La segunda revoca permisos de escritura sobre operaciones para el navegador, sin borrar las anteriores.

## Comprobaciones locales

```bash
node --check public/app.js
npm test
python -m unittest discover -s tests -v
```

## Estructura

- `public/`: web responsive, frontend, política de privacidad y términos, archivo descargable `.mq5`.
- `api/`: funciones seguras (MT5, facturación sandbox y afiliados).
- `server/`: lógica de conciliación MT5 y comunicación privada con Supabase.
- `mt5/EDGORIA_ReadOnly_Bridge.mq5`: EA que solo lee historial MT5, requiere compilación en MetaEditor.
- `supabase/`: SQL inicial, comercio de V2, conexión MT5, estrategias y bloqueo de trade manual en V3.
- `tests/`: validación de reglas de negocio y seguridad a nivel de código.

## Alcance de conciliación

Las cifras de Analytics representan posiciones completadas y reconstruidas desde deals disponibles en MT5, incluyendo Profit/Commission/Swap/Fee si el broker los incluye dentro de esas ejecuciones. No se incorporan como P&L movimientos de balance ni posiciones abiertas. *No es un feed directamente firmado por el broker*, sino información transmitida por el conector autorizado del usuario. Por ahora solo se admiten cuentas con moneda USD; movimientos de comisiones especiales y reversiones netting complejas requieren pruebas/adaptaciones específicas. Nunca ejecuta órdenes.

## Estado real

Código empaquetado y comprobado localmente; no significa que el EA haya compilado o sincronizado en un MT5 real. Debes instalar la migración V3, verificar secretos en Vercel, publicar un Preview, probar en demo y, únicamente después de validar, lanzar producción. **No incluye servicios de broker externos ni IA generativa ya conectada.**
