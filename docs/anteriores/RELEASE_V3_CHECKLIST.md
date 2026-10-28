# EDGORIA 3.0 — Checklist de publicación

- [x] Reutilización del frontend EDGORIA 2.0 y de las API existentes.
- [x] Pantallas V3 sin operaciones manuales ni importador CSV.
- [x] Playbooks creados por usuario y asignación de estrategias/notas a trades MT5.
- [x] Replay Studio como Próximamente.
- [x] Módulo de cuentas MT5 separadas, tokens revocables y rotación conservando historial.
- [x] Importación de historial disponible MT5 (inicial) y actualizaciones con deduplicación.
- [x] P&L acumulado exclusivamente desde posiciones MT5 cerradas reconstruidas.
- [x] Refresco del dashboard cada 60 segundos cuando está activa la pestaña.
- [x] SQL aditivo de estrategias aplicado a Supabase de EDGORIA.
- [x] QA local: Node + Python, pruebas de API simulada y pruebas de reconciliación de posiciones.
- [ ] Vercel Preview del código V3.
- [ ] Confirmar variables secretas de Vercel, especialmente SUPABASE_SERVICE_ROLE_KEY.
- [ ] Compilar `.mq5` en MetaEditor real y probar desde una cuenta MT5 demo en USD.
- [ ] Comparar beneficios netos, fees, fechas, lotes y cierres parciales con MT5.
- [ ] Prueba de dos usuarios independientes y lectura RLS en API.
- [ ] Ejecutar `supabase/edgoria_v3_enforce_mt5_only_AFTER_PREVIEW.sql` tras validación.
- [ ] Promocionar el deploy Preview de V3 a producción.
- [ ] Revisar SMTP, políticas de contraseñas filtradas, legalidad y backups.
- [ ] Validar pagos/afiliados con proveedor sandbox antes de cobrar.

**Nota:** el bloqueo SQL de trades manuales NO se ha aplicado aún a producción para mantener compatibilidad con el frontend anterior hasta el corte controlado.
