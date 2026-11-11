# EDGORIA 6.4 — Proyecto completo

Este ZIP contiene el árbol completo de código para el proyecto **edgoria-5-premium**. No es el parche incremental. Los archivos están en la raíz del ZIP para copiarlos a la raíz de tu repositorio. **No sustituye tus valores de Environment Variables, tu base de datos ni tus registros de usuarios.**

## Cambios exclusivos de 6.4
- Landing: check verde para MetaTrader 5 y reloj de arena para cTrader (próximamente).
- Afiliados: refresco de cifras y estados cada 20 segundos mientras el panel esté visible; también al recuperar el foco.
- Afiliados: estados consultados desde la API existente; el cliente no crea ni modifica comisiones ni pagos.
- Sin cambios nuevos en SQL, backend, MT5, roles ni activación manual de membresías.

## Instalación — segura para tu sitio actual
1. Descarga el ZIP y extrae su contenido a una carpeta. **No ejecutes antiguos instaladores 6.3** incluidos en otras entregas.
2. Abre **GitHub Desktop** y el repositorio del proyecto EDGORIA Premium conectado a Vercel. Selecciona `main`, pulsa **Fetch origin**, crea rama **edgoria-64-completo-preview**.
3. En GitHub Desktop, **Repository > Show in Explorer**, abre la raíz de la copia local. **Antes de copiar, conserva una copia de respaldo**.
4. Copia las carpetas `api`, `server`, `public`, `supabase`, `tests`, `mt5`, `migrations` y archivos raíz de este ZIP a la raíz local del repositorio. Confirma **reemplazar** cuando corresponda. No borres otros archivos de tu repositorio.
5. Revisa **Changes** en GitHub Desktop. Si aparecen cambios de negocio que no esperabas (precios, autenticación, SQL o MT5), **no hagas Commit**: compara con la versión que esté publicada en Vercel.
6. En tu equipo, abre un terminal en la raíz y ejecuta `npm test`. Requiere Node.js 22. La batería histórica tiene fallos anteriores: no interpretes un fallo total como confirmación de que este cambio no funciona, pero tampoco ignores errores nuevos.
7. Commit en tu rama Preview > **Push origin**. En Vercel abre el deployment Preview correspondiente a la rama y comprueba login, Journal, Admin, Afiliados y Dashboard.
8. **Sólo después** de validar con cuentas de prueba, fusiona la rama con `main` para publicar Production. Comprueba el dominio personalizado y los redireccionamientos.

## Comprobación de afiliados
- Abre una cuenta de afiliado de prueba aprobada.
- Comprueba que el dashboard muestre enlace, referidos y comisiones.
- Desde otra sesión Admin, usa **registros de prueba autorizados** para verificar transiciones de estados: pendiente > aprobada > pagada. Sólo marca `pagada` después de confirmar una transferencia real; el cambio de estado no ejecuta pagos.
- Vuelve al panel del afiliado: debe cargar datos actualizados por consulta automática en aproximadamente 20 s.
- Verifica que el frontend sólo presente datos propios del afiliado y no de otros.

## Precondiciones
- Mantener las Environment Variables y la configuración Supabase existentes; no pegar credenciales dentro de archivos.
- La actualización de BD 6.3 para comisiones 25/30% debe estar ya aplicada (el usuario la confirmó en SQL Editor).
- Verificar que el API actual pueda consultar `edgoria_partner_commissions` con permisos correctos.

## Evidencia local y límites
- Sintaxis JavaScript validada (`node --check`).
- Test dirigidos a afiliados y 6.4: **10 de 10 aprobados**.
- Batería histórica completa de esta copia: **229 tests, 165 aprobados, 64 fallidos**. La copia de la versión anterior también presenta esos fallos históricos; ninguna prueba nueva de 6.4 falló.
- No se ejecutó una prueba E2E autenticada contra cuentas reales ni una publicación Vercel Production. No se certifica un 100 % operativo hasta validar esa integración.

## Ayuda
En Vercel, mira `Deployments > Preview` y `Logs` si alguna ruta falla. No compartas claves privadas ni tokens de sesión.
