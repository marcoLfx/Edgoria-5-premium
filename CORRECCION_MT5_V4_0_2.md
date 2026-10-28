# EDGORIA 4.0.2 · Corrección de importación de historiales MT5

## Error resuelto

La versión anterior esperaba una tabla *Deals* con las columnas `Ticket, Position, Entry, ...`.
El archivo XLSX nativo de MetaTrader 5 puede ser un **Informe del historial de trading** con varias secciones: `Posiciones`, `Órdenes`, `Transacciones`, `Resultados`. La sección Posiciones ya incluye entradas, cierres, comisión, swap y beneficio, por lo que **no debe ser rechazada** por no llevar `Entry`.

Además, algunos informes MT5 usan archivos XML en UTF-16LE dentro de XLSX y celdas XML autocerradas; ambas variantes están contempladas ahora. Los XLSX con namespaces XML (`x:row`, `x:c`) también se admiten.

## Formatos probados

- XLSX nativo MT5 español: el reporte proporcionado por el usuario, analizado **solo durante las pruebas locales**, produjo 18 posiciones cerradas y un neto de -339.33 USD, exactamente igual al resumen del broker. No se distribuye en el ZIP.
- XLSX sintético con XML prefijado: 2 posiciones cerradas y neto 166.50 USD.
- CSV de posiciones MT5 y HTML tabular de posiciones MT5.
- XLSX y CSV de Deals con Position ID para reconciliación por operaciones ejecutadas.

No se garantiza compatibilidad con cualquier Excel modificado o formato privado de todos los brokers. Archivos corruptos, posiciones sin cerrar, órdenes aisladas, cuentas en moneda no USD y reportes de más de 3 MB se rechazan con mensaje explícito.

## Cambios visibles

- El nombre del archivo seleccionado permanece visible.
- No se borra la selección por la actualización periódica del Dashboard mientras haya archivo elegido.
- La pantalla conserva un estado de éxito/error, no solo un aviso efímero.
- Indica cantidad de posiciones, resultado neto y advertencias por discrepancias.
- Cada importación se guarda como lote en Supabase, identificada por hash SHA-256.
- Un lote duplicado indica que ya fue importado: evita duplicar resultados.
- Al borrar un lote, sus posiciones se eliminan y las métricas se recalculan. Los datos sincronizados por Bridge no se borran.
- Si la cuenta de EDGORIA ya está vinculada a un login MT5, se rechazan reportes de otro login.

## Publicar en Vercel

1. Usar el **proyecto nuevo ya configurado**: `edgoria_4_0_saas_mt5_roles_excel` en el equipo `marludena3102-7712`. Evitar crear un proyecto adicional por accidente.
2. Subir los archivos completos de `EDGORIA_PRODUCCION_VERCEL` con Vercel Drop a **ese proyecto**. No se necesitan nuevas migraciones SQL.
3. Antes de probar, verificar en las variables de entorno de **este** proyecto: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y la variable **solo de servidor** `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`). No enviarlas por chat ni exponer claves privadas en `NEXT_PUBLIC_*`.
4. Volver a desplegar si las variables se añadieron después del último despliegue.
5. Confirmar estado `Ready` y entrar a **MT5 Bridge → Importar Excel / CSV de MT5**.
6. Seleccionar la ficha EDGORIA que corresponde al login del reporte, elegir el XLSX y pulsar **Importar y actualizar Dashboard**. El archivo no se guarda en bruto.
7. Verificar que el lote figure en **Archivos importados** y que el P&L corresponda al reporte. Si se importa el archivo de prueba del usuario en una cuenta nueva y sin otras operaciones, debería observarse 18 posiciones con P&L neto -339.33 USD en el rango completo.
8. Probar eliminar el lote y confirmar que solo sus posiciones desaparecen. No eliminar un lote de datos reales por error.

Si el backend muestra `SERVER_CONFIG`, falta la variable privada en **este** proyecto de Vercel. Si marca `INVALID_FILE`, la página ahora explica por qué. Si aparece `INTERNAL_ERROR`, revisar Logs del despliegue que recibió la solicitud. La conexión automática MT5 Bridge continúa siendo una funcionalidad aparte, que todavía requiere validación en MT5 real.

## Seguridad

Este importador solo lee posiciones cerradas y no abre operaciones ni modifica órdenes del broker. No almacena contraseñas MT5. La API exige una sesión de usuario; antes de escribir comprueba pertenencia de cuenta y valida tipo/tamaño/moneda y login cuando aplica. Los datos se escriben desde el servidor y están separados por usuario. No se incorporó ninguna clave privada al ZIP.
