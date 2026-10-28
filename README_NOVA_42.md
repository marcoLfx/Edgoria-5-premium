# EDGORIA NOVA 4.2 — Instalación y límites

Versión: 4.2.0. Se basa en el proyecto completo EDGORIA 3.1.2, conservando el servidor, APIs, políticas de aprobación de Supabase y el importador MT5.

## Incluye

- Nuevo estilo `public/nova42.css`, cargado después de las hojas históricas, sin eliminarlas.
- Dashboard rediseñado con CTA de revisión diaria, métricas de cierres, curva, riesgo y resumen de operaciones existentes.
- Analytics ordenado, con riesgo detallado desplegable y sin la fila redundante de tres indicadores.
- Journal emocional rediseñado, plantilla guiada de tres preguntas, fotos privadas y recuento de archivos elegidos.
- Menú reagrupado en actividad, revisión, cuentas y espacio personal; se oculta Replay Studio del menú principal, que sigue siendo una pantalla de desarrollo y no se anuncia como función terminada.
- Página pública `/descubre.html` y acceso a ella desde el formulario de inicio de sesión.
- `/release.json` y `/version.html` para diagnosticar el despliegue.
- `PLAN_COMERCIAL_NOVA_42.md`: contenido comercial verificable y beta responsable.

## Instalación

1. Crea una rama/copia de seguridad de la versión actual de GitHub.
2. Extrae el **parche GitHub** sobre la raíz del repositorio conservando directorios `public/` y `tests/`. No anides `public/public`.
3. Publica el commit en la rama que despliega Production en Vercel.
4. Abre `https://TU-DOMINIO/version.html` y confirma versión `4.2.0` y sus cinco indicadores correctos.
5. Visita `https://TU-DOMINIO/descubre.html`; comprueba la vista móvil e inicia sesión con una cuenta de prueba aprobada.
6. Valida Dashboard (1 día y fecha concreta), Analytics, journal con imágenes, Admin (aprobaciones) y MT5 Bridge (importación de prueba autorizada).
7. No realices cambios de SQL para esta versión; **no requiere migraciones**.

## Importante

- No se ha modificado ni conectado GitHub/Vercel de forma remota desde esta entrega.
- Datos reales y cargas de imágenes requieren pruebas autenticadas en producción.
- La curva de capital y los límites se calculan con operaciones cerradas; no equivalen a equity flotante ni a verificación del broker.
- No se implementa un replay con datos tick, IA generativa o nuevas integraciones en esta versión.
- Antes de cobrar suscripciones, validar pasarela, cumplimiento y la infraestructura de despliegue.
