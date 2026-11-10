# EDGORIA 6.1 — Lanzamiento controlado (Preview)

**Estado:** código preparado para integración y pruebas; NO activado en producción ni certificado para pagos reales. Última revisión: 10 de noviembre de 2026.

## Qué incorpora

- Landing: identidad EDGORIA intacta; MetaTrader 5 disponible, cTrader **Próximamente**, afiliados al final y un diseño compacto en móvil. Logos enlazados a recursos externos con íconos locales de reserva; obtener assets originales con sus condiciones de uso antes de marketing oficial.
- Alta: registro Trader o solicitud de Afiliado con correo confirmado. Nunca asigna permisos de journal solo por seleccionar “Afiliado”.
- Vista previa de usuario: dashboard de bienvenida; trading, Calendario, Journal, Analytics, Strategy Lab, Risk Watch y MT5 bloqueados sin activación. Solo `Suscripción`, `Afiliados`, `Ajustes` y la bienvenida siguen accesibles.
- Suscripción: precio promocional US$10.99 / mes, regular US$14.99; **USDT/TRC20** como método externo manual con wallet en la plataforma, copia de dirección y comprobante JPG/PNG/WebP hasta 3 MiB. No se solicitan claves privadas ni frases de recuperación.
- Comprobantes: bucket privado `edgoria-payment-proofs`, tabla con RLS por propietario; panel `Comprobantes` visible solo para Admin. Aprobar/rechazar registra auditoría, **nunca** activa permisos, no crea venta ni comisión.
- Acceso real de journal: exclusivamente administrador, `Usuarios → Dar acceso`, prueba 7 días o mes calendario; las solicitudes a la API verifican el vencimiento por fecha.
- Afiliados: 25% estándar / 30% partner aprobado, comisiones solo por **primera** venta registrada por admin. La migración 6.0 no da acceso de pago.

## Cómo instalar sin dañar EDGORIA

1. **No sobrescribir `main`**. GitHub Desktop: crear rama nueva desde el commit productivo real (`preview-edgoria-61`). Confirmar en Vercel que el repositorio es `marcoLfx/Edgoria-5-premium`.
2. Extraer el ZIP del parche. Ejecutar `INSTALAR_WINDOWS.bat` (o `python instalar.py RUTA_DEL_REPOSITORIO`). Se verifican todas las sumas SHA256 de los archivos 6.0 antes de sustituirlos. Un desajuste detiene la instalación.
3. El instalador crea una carpeta de **copia de seguridad fuera del repositorio**. Inspeccionar el diff en GitHub Desktop, Commit → Push origin y revisar la URL **Preview**, NO Production.
4. Probar las migraciones primero en una base de pruebas. **En este orden:** `supabase/edgoria_v60_affiliates_manual.sql` y `supabase/edgoria_v61_payment_proofs.sql`. No ejecutar una migración dos veces sin auditar; la segunda crea bucket privado, tabla RLS, auditoría y RPC de revisión.
5. Verificar que la configuración de Vercel Preview apunte a la base de pruebas. Solo cuando existan las tablas activar, para Preview, `EDGORIA_AFFILIATES_V60_ENABLED=1` y `EDGORIA_PAYMENT_PROOFS_ENABLED=1`. `EDGORIA_ACCESS_PERIODS_ENABLED=1` requiere la migración 5.9 ya comprobada. Usar `EDGORIA_ADMIN_USER_ID` con UUID real y `SUPABASE_SECRET_KEY` exclusivamente como Secret de servidor. `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` corresponden al mismo proyecto.
6. Redeploy de **Preview**, probar el flujo completo y sólo entonces decidir si se publica. `EDGORIA_LEGACY_ACCESS_ALLOWED=0` podría bloquear usuarios actuales sin periodos; no activarla hasta auditar.

## Pruebas manuales imprescindibles

- [ ] Nueva cuenta Trader: confirma correo → login → bienvenida y solo Suscripción / Afiliados / Ajustes; herramientas protegidas desactivadas.
- [ ] Cuenta Afiliado: solicita perfil → solicitud pendiente; administrador aprueba afiliación por separado; enlace de atribución se conserva al registrar; no da Journal ni comisión por registro.
- [ ] Cuenta anterior y administrador mantienen sus accesos y no se producen redirecciones en bucle.
- [ ] `/reset-password` recibe enlace de recuperación y permite establecer nueva contraseña.
- [ ] Suscripción muestra la dirección exacta `TB5UoKnA1zK5AowiiWH8QUT7DMKcCdUphN`, red **TRC20**, precio promocional y precio regular; copiar dirección funciona.
- [ ] Subir comprobante JPG, PNG o WebP (máx 3 MiB). Usuario no puede ver capturas ajenas, actualizar estado ni subir un segundo comprobante pendiente.
- [ ] Admin: Comprobantes → abrir imagen privada, marcar verificado/rechazado, confirmar que no concede acceso ni comisión automáticamente.
- [ ] Admin: Usuarios → dar 7 días o un mes, comprobar calendario y cierre al vencimiento. Comprobar suspensión y restauración sin pérdida de datos.
- [ ] Admin: Afiliados → solicitud, aprobar, cambiar tasa, atribuir referido, registrar solo primera venta elegible, aprobar y marcar comisión pagada. Un recibo verificado no implica venta/comisión.
- [ ] Dashboard, Strategy Lab, Analytics, importaciones MT5, permisos RLS y límite de cinco conexiones en cuentas autorizadas. Verificar con navegadores de escritorio/móvil.
- [ ] Supervisar logs, backups, reversión, páginas legales y política de reembolsos antes del lanzamiento al público.

## Advertencias de seguridad

El comprobante **NO demuestra** por sí solo recepción de una transferencia. La decisión comercial debe sustentarse en comprobación separada y trazable; no compartir claves de billetera. La política RLS restringe evidencia privada, pero el almacenamiento de usuarios y todas las rutas directas del journal deben someterse a auditoría antes de afirmar un bloqueo completo. `edgoria_v60_affiliates_manual.sql` no está instalado en el Supabase de producción que se inspeccionó; `edgoria_v61_payment_proofs.sql` tampoco. **No publicar como funcional hasta validar SQL, flags y pruebas extremo a extremo.**

## Enlaces

- Landing `/`
- Acceso único `/app`
- Contraseña `/reset-password`
- Admin `/admin` por rol, sin formulario adicional
- Admin: `Afiliados` al final, `Comprobantes` inmediatamente antes
- Supabase SQL: `https://supabase.com/dashboard/project/jixygssxfgytxsylsowq/sql/new`
- Vercel Settings: `https://vercel.com/marludena3102-7712/edgoria-5-premium/settings/environment-variables`

**Si el paquete no coincide con tu repositorio, el instalador se detendrá en lugar de sobrescribir código distinto.**
