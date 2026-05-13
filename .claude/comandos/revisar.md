---
name: revisar
description: Revisa código frontend buscando bugs, mejoras de UX y performance.
usage: "/revisar [archivo o carpeta]"
---

## Checklist de Revisión Frontend (Next.js + Tailwind)

### 1. Accesibilidad (a11y)
- [ ] Todas las imágenes tienen `alt` descriptivo.
- [ ] Botones y enlaces tienen texto accesible o `aria-label`.
- [ ] Formularios tienen `label` asociado a cada input.
- [ ] Contraste de colores cumple WCAG AA (mínimo 4.5:1).
- [ ] Navegación por teclado funciona (Tab, Enter, Escape).

### 2. Performance
- [ ] Imágenes usan `next/image` con `priority` solo para LCP.
- [ ] Componentes pesados usan `dynamic` import con `ssr: false` si no son críticos.
- [ ] Animaciones de Framer Motion usan `layout` y `AnimatePresence` correctamente.
- [ ] No hay re-renderizados innecesarios (revisar dependencias de `useEffect`).
- [ ] Audio/video tiene `preload` adecuado.

### 3. UX / Diseño
- [ ] Estados de carga (skeleton/spinner) para operaciones async.
- [ ] Estados de error manejados con toast o mensaje en UI.
- [ ] Responsive: se ve bien en mobile (375px), tablet (768px), desktop (1440px).
- [ ] Colores consistentes con la paleta de Maqui Mary (rosa #E91E63, azul #2196F3).
- [ ] Feedback visual inmediato para acciones del usuario (hover, active, focus).

### 4. Calidad de código
- [ ] No hay `any` en TypeScript (usar `unknown` o tipos definidos).
- [ ] Props de componentes están tipadas con interfaces.
- [ ] No hay código comentado sin explicación.
- [ ] Imports están ordenados (React → Next → externos → locales → tipos).

### 5. Seguridad
- [ ] No hay secrets hardcodeados (keys, tokens, passwords).
- [ ] Inputs de usuario tienen validación (zod, regex, o manual).
- [ ] Rutas protegidas usan middleware de auth.

### Output esperado
- Lista de problemas encontrados con severidad (🔴 crítico / 🟡 medio / 🟢 mejora).
- Sugerencias concretas de cómo arreglar cada uno.
- Si no hay problemas, confirmar que pasa la revisión.
