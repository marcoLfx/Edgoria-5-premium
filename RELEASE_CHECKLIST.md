# EDGORIA — Lista de publicación

## Configuración obligatoria

- [ ] Crear proyecto Supabase.
- [ ] Ejecutar `supabase/schema.sql` completo.
- [ ] Revisar 4 tablas y RLS (enabled).
- [ ] Activar confirmación de email y configurar SMTP con dominio válido.
- [ ] Cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel (solo clave pública).
- [ ] Importar repo privado en Vercel; Framework: Other; Output: public.
- [ ] Verificar que `/api/config` responde `configured:true` sin secretos.
- [ ] Configurar Site URL + Redirect URLs de Supabase con el dominio real.

## Pruebas de aceptación antes de invitar traders

- [ ] Crear usuario A, confirmar correo y hacer login.
- [ ] Crear cuenta con capital nominal y límites configurables.
- [ ] Registrar, editar y eliminar una operación cerrada.
- [ ] Importar CSV propio; importar nuevamente y comprobar duplicados.
- [ ] Verificar fechas, win rate, P&L y drawdown comparando con cálculos externos.
- [ ] Crear y exportar journal emocional; registrar un retiro manual.
- [ ] Probar la carga/replay de velas OHLC desde CSV real.
- [ ] Crear usuario B; verificar que no puede leer datos A ni mediante API.
- [ ] Confirmar recuperación de contraseña por correo.
- [ ] Probar navegación móvil, teclado, carga de archivos y cierre de sesión.
- [ ] Probar respaldos, restauración, alertas y tasa de errores.

## Antes de venta/distribución pública

- [ ] Sustituir placeholders en privacidad y términos; revisión jurídica local.
- [ ] Definir canal de soporte, política de borrado de datos y retención.
- [ ] Confirmar marca EDGORIA y dominio elegible.
- [ ] Preparar política de edad mínima adecuada al servicio y jurisdicción.
- [ ] Monitoreo, antispam, límites de uso, controles de abuso y auditoría de seguridad.
- [ ] Si se cobra suscripción, integrar facturación y conciliación antes de anunciar planes.

**No anunciar sincronización MT5 automática, cumplimiento de reglas de fondeo o resultados de IA**: no están implementados ni verificados.
