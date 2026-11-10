# EDGORIA 5.3 — ajuste de interfaz sin módulos nuevos

## Alcance

- Mantiene las rutas existentes de Journal, Analytics, Risk Watch, AI Coach, Strategy Lab, Calendario, Reportes, MT5, Cuentas, Suscripción y Ajustes.
- Elimina el enlace superior duplicado "Prop Firm Hub"; conserva "Mis Cuentas" y "Cuenta" en el grupo inferior.
- Restituye el **recurso de marca existente en este proyecto** (`public/favicon.svg`) en la cabecera lateral y acceso. Si el logotipo oficial de producción es otro, sustituir únicamente ese archivo después de verificar los derechos y el original.
- Sustituye visualmente la barra de desplazamiento lateral superpuesta por desplazamiento nativo y adapta la altura a 100dvh.
- Mejora superficies, tipografía, separación, estados focus/hover y ajuste responsive sin alterar los cálculos.

## Advertencia de compatibilidad

Este proyecto se basa en **EDGORIA 5.2 derivado de NOVA 4.2**, no en una copia confirmada del último repositorio en producción. No reemplazar el directorio public en producción sin comparar los cambios y verificar las funciones de login, operaciones, importación MT5, Strategy Lab, roles y Analytics.

## Para probar

1. Usar rama Preview y copia de seguridad.
2. Copiar únicamente `public/edgoria53.css` y aplicar estas dos ediciones a `public/app.js`: sustituir la constante `brand` y quitar solo el botón superior `button('prop','Prop Firm Hub')`. En `public/index.html` incluir el stylesheet como ÚLTIMA hoja dentro de `<head>`.
3. Ejecutar `node --check public/app.js` y `npm test` antes de despliegue.
4. Desplegar Preview, probar navegación completa y responsive; nunca editar credenciales para una modificación visual.

No se han creado nuevos módulos o eliminado datos de Supabase.
