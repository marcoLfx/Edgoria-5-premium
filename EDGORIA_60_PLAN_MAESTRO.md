# EDGORIA 6.0 — Paquete de negocio integrado (Release Candidate)

**Estado:** listo para revisar en Preview; **no** habilitado en producción. No declara verificado el dominio real, la configuración de Vercel, los datos de los usuarios ni las transferencias USDT.

## 1. Producto y oferta

- Un solo plan **EDGORIA PRO**: US$10.99 de lanzamiento, US$14.99 regular, acceso de **1 mes calendario desde la activación**.
- Prueba gratuita opcional de 7 días autorizada por el administrador.
- Importación/conexión de lectura MT5; máximo cinco conexiones por usuario conforme a controles existentes.
- **cTrader: próximamente**, sin prometer fecha, conexión activa o asociación comercial.
- EDGORIA es un *journal*; no ejecuta órdenes ni promete rentabilidad.

## 2. Arquitectura y pantallas

| Ruta | Audiencia | Función |
|---|---|---|
| `/` | Pública | Landing y CTA de registro |
| `/app` | Cuentas existentes | Único login; traders al journal, administradores a su consola |
| `/admin` | Solo administradores | Usuarios, calendario, accesos, afiliados y auditoría |
| `/reset-password` | Titular de un enlace válido | Contraseña nueva, sin abrir el journal directamente |
| `/afiliados.html` | Pública | Condiciones informativas de afiliación |
| `/privacidad.html` y `/terminos.html` | Pública | Información legal y privacidad |

## 3. Proceso de alta y acceso (sin depender de pagos)

1. Usuario crea cuenta y confirma el correo.
2. Se identifica con una sesión segura.
3. Administrador concede **7 días de prueba** o **1 mes calendario** desde su consola.
4. El servidor registra inicio, fin, responsable y evento de auditoría.
5. El calendario consulta esos periodos reales; cuando vencen, el acceso protegido debe rechazarse en servidor.
6. El usuario puede renovar o solicitar asistencia. Las cuentas preexistentes sin periodos nuevos mantienen la compatibilidad definida en v5.9 hasta su migración controlada.

**Nunca** inferir que un pago acreditado debe activar el acceso.

## 4. Proceso de pago USDT manual y de venta

1. Se acuerdan los datos de pago únicamente mediante canal oficial, sin almacenarlos en JavaScript público.
2. El responsable comprueba la recepción **fuera** del sistema.
3. Puede registrar una **venta comercial verificada** en `/admin → Afiliados`, identificando comprador, importe y una referencia única, con confirmación explícita.
4. La venta no crea ni modifica ningún periodo de acceso.
5. Una segunda decisión administrativa independiente puede conceder el acceso desde `/admin → Usuarios`.

No se incluye wallet ni checkout automático: no hay dirección TRC20 aprobada para publicar, ni pasarela que confirme fondos de forma fiable. No subir seed phrases o claves privadas.

## 5. Afiliados

- Registro de referido mediante URL `/?ref=edg-<código>`, solo para usuarios nuevos.
- Atribución única por usuario, validada en servidor y sin autorreferidos.
- 25 % afiliado estándar; 30 % partner especial. La tasa se fija en la ficha y se guarda como *snapshot* al generar cada comisión.
- **Solo la primera mensualidad pagada y verificada** genera una comisión; el registro gratuito o la prueba no.
- Comisión pendiente → aprobada → pagada; verificación de pago a afiliado manual y por separado.
- El administrador puede aprobar, suspender y cambiar tasa de afiliados y registrar ventas.
- El portal del partner muestra solo sus datos de atribución y comisiones, nunca información privada del comprador.

El acceso al programa desde una cuenta sin membresía activa y la política de devolución deben validarse en los flujos reales antes de campañas abiertas.

## 6. Datos y seguridad

- Las tablas nuevas de ventas, comisiones y auditoría tienen RLS y no conceden escritura a clientes anónimos ni autenticados.
- La API de administración usa `requireAdmin` en el servidor. Nunca confíes en un parámetro `role=admin` del navegador.
- Las operaciones con privilegios del servidor usan `SUPABASE_SECRET_KEY`, nunca una variable `NEXT_PUBLIC_`.
- El RPC para registrar ventas es atómico; es idempotente por referencia única y no modifica acceso, calendario ni MT5.
- Recuperación de contraseña se tramita mediante enlace válido en `/reset-password`.
- No eliminar usuarios reales para probar. Conservar copia de seguridad y revisión de dependencias antes de permitir borrados definitivos.

## 7. Configuración requerida en Vercel Preview

| Nombre | Tipo | Propósito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | Supabase de pruebas |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Autenticación pública |
| `SUPABASE_SECRET_KEY` | Secret | Operaciones administrativas del servidor |
| `EDGORIA_ADMIN_USER_ID` | Config/Secret servidor | UUID de la cuenta admin |
| `EDGORIA_ACCESS_PERIODS_ENABLED=1` | Config | Accesos y calendario **después** de migración 5.9 |
| `EDGORIA_AFFILIATES_V60_ENABLED=1` | Config | Afiliados **después** de migración 6.0 |

Prohibido compartir valores secretos o usarlos en una rama Preview conectada a datos reales sin revisión de seguridad.

## 8. Pasos de despliegue

1. Revisar la rama que usa Vercel; no editar `main` directamente.
2. Aplicar `supabase/edgoria_v60_affiliates_manual.sql` a un proyecto **staging** que ya tenga el esquema de afiliados v2 y accesos v5.9.
3. Configurar las variables anteriores para Preview.
4. Desplegar la rama de revisión y verificar `GET /api/config`.
5. Probar registro, recuperación, login normal, login administrador, carga de Overview con 0/varios trades, conexión MT5, calendarios, acceso 7 días, mensualidad, vencimiento, enlace referido, afiliación, venta verificada y comisiones.
6. Confirmar accesibilidad de páginas legales, favicon, móvil y navegación.
7. Aprobar explícitamente el paso a `main` solo después de validar producción y copia de seguridad.

## 9. Pruebas de aceptación imprescindibles

- [ ] El login redirige a la experiencia correcta, sin segundo login para administradores.
- [ ] La recuperación abre formulario de contraseña nueva, no el Journal.
- [ ] Un usuario no puede consultar otros usuarios ni ejecutar administración.
- [ ] El registro, trial y mensualidad funcionan sin ninguna relación automática con USDT.
- [ ] La activación crea fechas en calendario y el vencimiento se aplica en servidor.
- [ ] El límite de cinco MT5 funciona también en el backend.
- [ ] La atribución por `ref` funciona tras crear cuenta y es única.
- [ ] Un referido sin pago no genera comisión.
- [ ] Una venta verificada genera a lo sumo una comisión de primera mensualidad.
- [ ] La aprobación y el pago de comisión son distintos de activar el journal.
- [ ] La misma referencia de venta no permite duplicar comisión.
- [ ] Navegación y landing sin scroll horizontal en móvil.
- [ ] RLS y función RPC verificadas con usuarios sin privilegios.
- [ ] Políticas de privacidad, condiciones comerciales, normativa local y documentos legales revisados antes de recaudar fondos.

## 10. Restricciones actuales

La copia usada como base se corresponde con el `main` accesible de `marcoLfx/Edgoria-5-premium` para los archivos comprobados. **Este paquete no equivale a un lanzamiento de producción certificado.** No se han probado pagos reales, ni conectado una wallet, ni ejecutado la migración 6.0 en la base productiva, ni aprobado un despliegue Production.
