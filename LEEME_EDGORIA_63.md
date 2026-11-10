# EDGORIA 6.3 — Actualización del panel de afiliados

> **Estado:** release candidate para pruebas (Preview). No es una publicación verificada en producción. Todos los cambios se basan en la rama `main` de `marcoLfx/Edgoria-5-premium` comprobada el 10 de noviembre de 2026. No modifica directamente tus repositorios ni tu Supabase.

## Qué corrige

- **Causa probable del HTTP 400 al aprobar 25 %:** la tabla original `edgoria_affiliates` tenía `CHECK (rate_basis_points BETWEEN 0 AND 1500)` (máximo 15 %) y la versión 6.2 intenta insertar `2500`. El archivo SQL 6.3 retira exclusivamente ese límite antiguo y permite 25 % y 30 %; conserva otros valores anteriores hasta 15 %.
- **Panel privado de cada afiliado aprobado:** enlace de referido, registros atribuidos, primeras ventas verificadas que generaron comisión, tasa de conversión, pendientes, aprobadas, pagadas e historial; detalle agregado por fechas de registro sin exponer identidades de referidos.
- **Usuario sin licencia de trader:** si su afiliación fue aprobada, puede abrir Partners sin habilitar el Journal.
- **Mensaje técnico de errores:** el servidor registra `EDGORIA_DB_DIAGNOSTIC` con código PostgreSQL y status HTTP, sin contenido de sesiones, parámetros, claves o mensajes completos de la base de datos.
- **Vercel Hobby:** no se crea una función adicional; `/api/affiliate-portal` se enruta a `/api/v4?route=affiliate-portal` mediante `vercel.json`.

## Cómo instalar sobre la versión exacta actualmente publicada

1. **Haz un respaldo** del repositorio y de la base de datos. Crea en GitHub Desktop una rama `edgoria63-preview` desde `main`. No cambies Production todavía.
2. **Usa el ZIP de parche** y extrae todos sus archivos en una carpeta. O ejecuta `INSTALAR_WINDOWS.bat` y facilita la ruta a la **raíz** del repositorio en Documentos/GitHub. El instalador verifica los hashes de los archivos existentes antes de escribir, conserva copias de seguridad fuera del repositorio y se detiene si no coincide la versión. No ejecuta SQL ni modifica Vercel.
3. **Instala la migración SQL** `supabase/edgoria_v63_affiliate_rate_fix.sql` **primero en una base STAGING** que tenga el esquema de EDGORIA 6.2. Comprueba que devuelve la regla `rate_basis_points BETWEEN 0 AND 3000`.
4. En Vercel, genera un **Preview** de esa rama apuntando a Supabase STAGING, con las variables privadas y públicas de STAGING (no compartas valores ni los introduzcas en GitHub). `EDGORIA_AFFILIATES_V60_ENABLED=1` debe estar habilitada; no existe ninguna variable nueva de versión 6.3.
5. Crea una solicitud de **prueba** con un usuario distinto al administrador y apruébala al 25 %. Confirma que cambia a aprobado, que aparece su `edg-...`, y que el referido llega al formulario de alta. Verifica con usuario aprobado el nuevo panel de Partners.
6. Prueba una venta ficticia de primera mensualidad en STAGING: debe reflejarse la comisión solo después de que el administrador la registre como **venta verificada**. La comprobación de captura USDT y el acceso del Journal siguen totalmente separados.
7. Comprueba en Admin el calendario de accesos y en Journal el límite de cinco cuentas y la importación MT5. Si todo pasa, programa aplicación de la migración de porcentajes en Production y luego promoción del despliegue verificado.

**No ejecutes el botón «Aprobar 25 %» en solicitudes reales hasta comprobar la migración en STAGING.** Si reaparece el 400, consulta los Logs de Vercel por `EDGORIA_DB_DIAGNOSTIC`: los códigos `23514` (CHECK), `23505` (UNIQUE), `42501` (permisos) o `PGRST...` ayudarán a ubicar la causa. No registres mensajes SQL completos ni tokens en logs públicos.

## Archivos modificados

- `api/v4.js` — ruta privada para el portal afiliado (misma función Hobby).
- `server/v63-partner-dashboard.js` — endpoint protegido y métricas sin datos personales de referidos.
- `server/supabase.js` — logs sanitizados de errores PostgREST.
- `public/app.js`, `public/app.html`, `public/edgoria63.css` — dashboard de afiliados y navegación responsive.
- `public/release.json` — identificación de versión.
- `vercel.json` — rewrite al endpoint consolidado.
- `supabase/edgoria_v63_affiliate_rate_fix.sql` — migración aditiva del máximo de porcentaje.
- `tests/v63-affiliates.test.js` — pruebas del nuevo panel.

## Seguridad y compatibilidad

- Nunca se concede acceso al Journal al aprobar un afiliado ni verificar una venta.
- Afiliados solo consultan agregados de sus propios referidos, sin correo, nombre ni UUID de los referidos.
- El mismo acceso `/app` sigue funcionando para traders; `/admin` mantiene autenticación y privilegios de servidor.
- MT5, la restricción de cinco cuentas, los comprobantes y su almacenamiento privado no se modifican.
- No se borran solicitudes antiguas, usuarios, operaciones, archivos ni comisiones existentes.

## Pruebas

`node --test tests/v63-affiliates.test.js` — 7/7 correctas. La batería global 6.3 tuvo **166/226** aprobadas y **60** fallidas. Se verificó que son los mismos 60 fallos que ya tenía la base 6.2 (159/219 aprobadas). Esta discrepancia histórica **debe revisarse** antes de afirmar que todo EDGORIA está listo al 100 %.

## Checklist de aceptación

- [ ] Migración 6.3 aplicada y verificada en STAGING.
- [ ] Panel Admin aprueba 25 % y 30 % en cuentas de prueba.
- [ ] Enlace único `?ref=edg-...` solo después de aprobación.
- [ ] Registro con enlace genera atribución una sola vez.
- [ ] La primera venta manual verificada registra comisión, no activa Journal.
- [ ] Afiliado solo ve su enlace, sus cifras y sus comisiones.
- [ ] Prueba 7 días / mensualidad / vencimiento siguen funcionando.
- [ ] Usuarios pendientes no pueden acceder a datos MT5.
- [ ] No se habilitan más de 5 cuentas MT5 por usuario.
- [ ] No aparecen HTTP 400, 500 en Logs de Preview.
- [ ] Hay respaldo y procedimiento de rollback.
