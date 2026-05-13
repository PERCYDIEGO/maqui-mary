# Reglas de Estilo de Código — Maqui Mary

## Formateador y Linter
- **Linter:** ESLint (configuración de Next.js)
- **Comando:** `npm run lint` (desde `web/`)
- Next.js incluye Prettier implícitamente para formateo.

## Reglas específicas del proyecto

### TypeScript
- **Indentación:** 2 espacios
- **Max line length:** 100 caracteres
- **Punto y coma:** siempre al final de sentencias
- **Comillas:** simples (`'string'`) para strings, backticks (`` `template` ``) para interpolación
- **Trailing comma:** siempre en multilinea

### Reglas de código
- Nunca dejar `console.log` en producción. Usar solo durante debug y eliminar antes del commit.
- Usar `===` y `!==` en vez de `==` y `!=`.
- Preferir `const` sobre `let`; nunca usar `var`.
- Funciones pequeñas: máximo 30 líneas, un solo propósito.
- Evitar `any`. Usar `unknown` si el tipo es desconocido, o definir interfaces.
- Los hooks de React deben empezar con `use` y seguir las reglas de hooks.

### Imports (orden)
1. React / Next.js
2. Librerías externas (framer-motion, lucide-react, etc.)
3. Componentes locales (`@/components/...`)
4. Hooks locales (`@/hooks/...`)
5. Utilidades (`@/lib/...`)
6. Tipos (`@/types/...`)

### CSS / Tailwind
- Usar clases de Tailwind en `className`, nunca inline styles.
- Para clases dinámicas complejas, usar `cn()` o `clsx` + `tailwind-merge`.
- Mantener consistencia con la paleta de colores de Maqui Mary.

### Kotlin (Android)
- **Indentación:** 4 espacios
- **Naming:** camelCase para funciones/variables, PascalCase para clases.
- **Comillas:** dobles para strings.
- Usar `val` sobre `var` siempre que sea posible.
- Funciones de Compose: PascalCase y descriptivas.
