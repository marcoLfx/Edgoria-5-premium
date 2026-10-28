# EDGORIA — Design System 2.0 / Ember Sunset

> Identidad propuesta; comprobar nombre, dominio y registro de marca antes de promocionar.

## Concepto
**Every trade leaves a lesson.** Diario privado de decisiones para interpretar resultados, riesgo y comportamiento sin proveer señales de inversión ni ejecutar órdenes.

## Colores cálidos, nítidos y consistentes

| Token | Hex | Uso |
| --- | --- | --- |
| Warm Obsidian | `#160F17` | Fondo principal |
| Warm Sable | `#1C141C` | Navegación |
| Espresso Surface | `#261C27` | Tarjetas |
| Plum Layer | `#332631` | Inputs y superficies |
| Mauve Border | `#684A5B` | Contrastes y bordes |
| Pearl Cream | `#FFF5ED` | Texto principal |
| Warm Lilac Grey | `#C7B0BB` | Texto secundario |
| Sunrise Gold | `#FFBA70` | Acciones principales |
| Ember Peach | `#FF8A63` | Degradados y acentos |
| Jade | `#56E6AE` | Resultados positivos y curvas |
| Orchid | `#B99AFF` | Análisis secundario |
| Electric Rose | `#FF728B` | Resultados negativos |

**Regla:** botones e interacción en dorado/coral; beneficios observados en jade; pérdidas en rosa. No mezclar significado funcional de los colores.

## Estilo
Space Grotesk para números y titulares; DM Sans en interfaz. Tarjetas de radio 14–16px, contraste alto, bordes malva, brillo oro acotado, sombras cálidas. Diseño adaptativo escritorio/móvil y animaciones reducidas para accesibilidad.

## Dirección funcional
- Vercel: frontend estático + `/api/config` vía función del servidor.
- Supabase: autenticación y PostgreSQL con Row Level Security (RLS).
- CSV: importa operaciones cerradas de columnas normalizadas; exportación propia.
- Módulos: operaciones, calendario, estadísticas, playbooks, cuentas, notas y replay educativo.
- Nada de credenciales de brokers ni ejecución de órdenes.
