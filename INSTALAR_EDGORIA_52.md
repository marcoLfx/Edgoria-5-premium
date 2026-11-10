# EDGORIA 5.2 — Interfaz Clear Intelligence

## Alcance real

Esta entrega se basa en el código recuperado de EDGORIA 5.1 PRO / NOVA 4.2. **No se ha fusionado ni probado directamente contra la versión exacta de GitHub `marcoLfx/edgoria-produccion`**. Tampoco incluye un despliegue realizado en Vercel. No sobrescribas la rama `main` sin verificar la vista previa.

### Cambios incluidos

- Overview con métricas esenciales en primer nivel: Net P&L, Win Rate, Profit Factor, RR Promedio, operaciones. Espaciados compactos en escritorio. En móvil, tarjetas en dos columnas; se puede requerir desplazamiento.
- Analytics simplificado: resumen de cinco indicadores, curva de capital, sesiones, estrategias/activos y días de la semana. Información avanzada (gain/loss, expectancy, rendimiento mensual, registros, drawdown) agrupada en un `<details>` cerrado por defecto.
- Eliminación de las vistas y formularios en desuso de retiros funded. Los registros de `payouts` y movimientos de caja no se borran ni se migran de la base de datos. No se modifican esquemas/API.
- CSS premium tecnológico con movimiento sutil, `prefers-reduced-motion`, responsive y foco de teclado.
- Orden lateral de 5.1 preservado. Se mantienen los IDs actuales de las rutas por compatibilidad.

## Instalación recomendada sobre el proyecto funcional

1. Haz respaldo del repositorio y una copia de seguridad de Supabase.
2. En GitHub Desktop, comprueba que `Current repository` sea `edgoria-produccion` y `Current branch` sea una **rama de pruebas**, por ejemplo `resideño-edgoria-premium`. No uses `main`.
3. Antes de copiar nada, compara el `public/app.js` del proyecto actual con el del paquete. Las funciones originales pueden haber evolucionado; un reemplazo total podría retirar funciones nuevas. Si no coinciden, aplica **únicamente las modificaciones** de las funciones `dashboard()` y `analytics()` y retira componentes funded sobre el código más reciente; no reemplaces `app.js` a ciegas.
4. En una rama compatible con esta base, copia los tres archivos de `PARCHE_PUBLIC_52/public/` (`app.js`, `index.html`, `edgoria52.css`) a `public/`. `index.html` ya incluye `/edgoria52.css` y versión del `app.js`; no edites manualmente el HTML otra vez.
5. No toques `api/`, `server/`, `supabase/`, `.env`, variables de Vercel ni configuración MT5.
6. Prueba localmente `node --check public/app.js` y `node --test tests/v52-interface.test.js`, seguido de toda la suite de la rama. Los tests históricos de las versiones 3.x/4.x/5.1 incluyen comprobaciones de estructura y textos anteriores: fallan incluso en el paquete base, por lo que deben actualizarse y revisarse cuidadosamente.
7. Publica con Commit + Push origin a la rama de pruebas. En Vercel abre el despliegue **Preview**, no Production. Revisa login, permisos, importación MT5, operaciones, Overview, Analytics, calendario, administración y móvil.
8. Solo tras validación, realiza Pull Request y merge controlado a `main`.

## Verificación realizada aquí

- `node --check public/app.js`: correcto.
- Tests nuevos `tests/v52-interface.test.js`: 5/5 correctos.
- Suite histórica del paquete 5.1: 115/139 correctos, 24 fallidos en el archivo base. Tras cambios de estructura en Analytics, 113/139 correctos, 26 fallidos; los 2 fallos adicionales son pruebas que esperaban el HTML de Analytics anterior. **La suite completa no está verde.**
- No se realizó test end-to-end con datos de producción ni conexión real a MT5.

## Restauración

En GitHub Desktop puedes revertir el commit de prueba; alternativamente restaura los tres archivos de la rama anterior. La base de datos no se modifica con este paquete.
