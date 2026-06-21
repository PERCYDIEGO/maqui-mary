# Diseño: Sistema Multi-Agente para Maqui Mary

## Visión General
Un equipo de agentes especializados que trabajan coordinadamente para desarrollar, mantener y mejorar el sistema Maqui Mary, con un agente orquestador que gestiona el flujo de trabajo end-to-end.

## Agentes Propuestos

### 1. Orquestador Maqui (`orquestador-maqui`)
**Responsabilidad:** Coordinador principal que recibe tareas, las descompone en pasos, delega a agentes especializados y gestiona los handoffs entre ellos.
**Instrucciones clave:**
- Descomponer tareas complejas en subtareas manejables usando metodologías de brainstorming
- Crear planes de implementación detallados con hitos claros
- Coordinar la secuencia de trabajo entre agentes (diseño → frontend/backend → QA → contenido → despliegue)
- Gestionar conflictos y dependencias entre agentes
- Realizar revisiones de código y garantizar calidad antes del merge
- Mantener el registro de decisiones y lecciones aprendidas
**Skills necesarios:** `brainstorming`, `writing-plans`, `executing-plans`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `stop-slop`
**Modelo recomendado:** `opencode/sonnet-4-6` (para razonamiento complejo y planificación)

### 2. Diseñador Maqui (`disenador-maqui`)
**Responsabilidad:** Define la experiencia de usuario y diseño visual del sistema, crea y mantiene archivos DESIGN.md.
**Instrucciones clave:**
- Crear archivos DESIGN.md que definan tokens de diseño (colores, tipografía, spacing, sombras)
- Seleccionar paletas de color accesibles y alineadas con la marca
- Definir sistemas de tipografía jerárquica para lecturas óptimas
- Diseñar componentes UI reutilizables siguiendo principios de accesibilidad WCAG 2.2
- Crear flujos de usuario intuitivos para las distintas secciones del CRM
- Prototipar interacciones y micro-interacciones usando Framer Motion
- Garantizar consistencia visual en todas las pantallas del sistema
**Skills necesarios:** `high-end-visual-design`, `design-md`, `ui-ux-pro-max`, `motion-design`, `accessibility`, `color-expert`, `brand-guidelines`
**Modelo recomendado:** `opencode/gpt-5.4-pro` (equilibrio entre creatividad y precisión técnica)

### 3. Frontend Maqui (`frontend-maqui`)
**Responsabilidad:** Implementa la interfaz de usuario usando Next.js 14 App Router, componentes React y Tailwind CSS.
**Instrucciones clave:**
- Construir páginas siguiendo la estructura de App Router (layout.js, page.js)
- Crear componentes React reutilizables y compuestos
- Implementar hooks personalizados para lógica de presentación
- Utilizar Tailwind CSS con configuración personalizada para el diseño sistema
- Aplicar principios de diseño responsivo (mobile-first)
- Implementar animaciones y transiciones usando Framer Motion y CSS
- Garantizar accesibilidad semántica y navegación por teclado
- Optimizar rendimiento (lazy loading, code splitting, imagen optimizada)
**Skills necesarios:** `nextjs-app-router-patterns`, `frontend-design`, `tailwind-css-patterns`, `tailwindcss-advanced-layouts`, `web-animation-design`, `shadcn-ui`, `gsap-react`
**Modelo recomendado:** `opencode/nemotron-3-super-free` (velocidad para iteración rápida de UI)

### 4. Backend Maqui (`backend-maqui`)
**Responsabilidad:** Implementa la lógica de negocio, APIs route handlers e integración con Supabase.
**Instrucciones clave:**
- Crear route handlers en `web/src/app/api/` siguiendo mejores prácticas de Next.js
- Implementar lógica de negocio centralizada en `web/src/lib/`
- Integrar con Supabase para operaciones de base de datos (CRUD, transacciones)
- Manejar autenticación y autorización usando Supabase Auth
- Implementar validación de entrada con esquemas Zod/Yup
- Crear funciones de utilidad para cálculos de totales, IGV, etc.
- Manejo seguro de archivos y almacenamiento en Supabase Storage
- Implementar logging estructurado y manejo de errores apropiado
**Skills necesarios:** `nodejs-backend-patterns`, `supabase`, `supabase-postgres-best-practices`, `validation`, `security`, `api-integration`
**Modelo recomendado:** `opencode/gpt-5.4` (buen rendimiento para lógica de negocio)

### 5. Especialista SUNAT Maqui (`sunat-maqui`)
**Responsabilidad:** Maneja toda la facturación electrónica y cumplimiento con SUNAT/OSE.
**Instrucciones clave:**
- Generar XML firmado digitalmente para comprobantes electrónicos
- Implementar comunicación segura con servicios web de SUNAT
- Manejar los diferentes tipos de comprobantes (Factura 01, Boleta 03, Guía 09)
- Validar respuestas de SUNAT y procesar errores apropiadamente
- Almacenar y gestionar certificados digitales de forma segura
- Implementar reintentos inteligentes y manejo de timeouts
- Generar PDFs de representación impresa de comprobantes
- Mantenerse actualizado con cambios en la normativa SUNAT
**Skills necesarios:** `xml-processing`, `digital-signature`, `soap-client`, `peruvian-tax`, `api-integration`, `security`
**Modelo recomendado:** `opencode/claude-opus-4-6` (alta precisión para cumplimiento legal complejo)

### 6. QA Maqui (`qa-maqui`)
**Responsabilidad:** Escribe y mantiene pruebas automatizadas para asegurar la calidad del sistema.
**Instrucciones clave:**
- Crear pruebas end-to-end con Playwright que cubran flujos de usuario completos
- Escribir pruebas unitarias para funciones de lógica de negocio
- Diseñar pruebas de seguridad (SQLi, XSS, IDOR, autenticación)
- Medir y reportar cobertura de código
- Implementar pruebas de rendimiento y carga
- Crear fixtures y datos de prueba realistas pero seguros
- Integrar pruebas en el pipeline de CI/CD
- Mantener documentación de casos de prueba y resultados
**Skills necesarios:** `e2e-testing-patterns`, `web-session-testing`, `webapp-testing`, `security`, `performance`, `testing`
**Modelo recomendado:** `opencode/gpt-5.4-mini` (eficiente para generar tests estructurados y mantenibles)

### 7. DevOps Maqui (`devops-maqui`)
**Responsabilidad:** Gestiona el despliegue, monitoreo y operaciones del sistema en producción.
**Instrucciones clave:**
- Configurar y optimizar despliegues automáticos a Vercel
- Implementar pipelines de CI/CD con testing integrado
- Configurar monitoreo de aplicación y infraestructura
- Gestionar variables de entorno y secrets de forma segura
- Implementar estrategias de backup y recuperación de datos
- Optimizar rendimiento de Next.js (ISR, caching, prefetching)
- Gestionar versiones y despliegues azul-verde cuando sea necesario
- Documentar procedimientos de operaciones y recuperación de desastres
**Skills necesarios:** `vercel-react-best-practices`, `deployment`, `monitoring`, `scripts`, `logging`
**Modelo recomendado:** `opencode/nemotron-3-super-free` (tareas de automatización y configuración)

### 8. Contenido Maqui (`contenido-maqui`)
**Responsabilidad:** Crea y gestiona todo el contenido textual del sistema y materiales de marketing.
**Instrucciones clave:**
- Escribir microcopy claro y útil para interfaces de usuario
- Crear descriptions de productos persuasivas y informativas
- Desarrollar contenido de ayuda y documentación de usuario
- Generar emails transaccionales (confirmación de pedido, envío, etc.)
- Crear secuencias de email de marketing y nutrición de leads
- Aplicar principios de marketing psicológico y persuasión ética
- Adaptar contenido al contexto cultural y lingüístico peruano
- Mantener consistencia de tono de voz en todas las comunicaciones
**Skills necesarios:** `copywriting`, `content-strategy`, `emails`, `marketing-psychology`, `localization`, `brand-voice`
**Modelo recomendado:** `opencode/claude-sonnet-4-6` (equilibrio entre creatividad y profesionalismo)

### 9. Arquitecto de Base de Datos Maqui (`arquitecto-db-maqui`)
**Responsabilidad:** Diseña y mantiene la estructura de la base de datos Supabase/PostgreSQL.
**Instrucciones clave:**
- Diseñar esquema de base de datos normalizado y eficiente
- Definir relaciones entre entidades (clientes, productos, pedidos, facturas, etc.)
- Crear índices estratégicos para optimizar consultas frecuentes
- Diseñar migraciones de esquema seguras y reversibles
- Implementar constraints y reglas de integridad referencial
- Optimizar consultas lentas usando análisis de planes de ejecución
- Manejar tipos de datos especializados (JSONB, rangos, etc.)
- Implementar políticas de seguridad a nivel de fila (RLS) cuando sea apropiado
**Skills necesarios:** `supabase-postgres-best-practices`, `database-design`, `query-optimization`, `migration-management`, `data-modeling`
**Modelo recomendado:** `opencode/gpt-5.4-nano` (rápido para tareas estructuradas de diseño de datos)

### 10. Investigador Maqui (`investigador-maqui`)
**Responsabilidad:** Busca y sintetiza información técnica actualizada para mejorar el sistema.
**Instrucciones clave:**
- Utilizar Context7 para acceder a documentación actualizada de librerías y frameworks
- Realizar búsquedas en vivo de mejores prácticas y soluciones técnicas
- Analizar soluciones de competencia y tendencias del mercado
- Evaluar nuevas tecnologías y su potencial impacto en el sistema
- Sintetizar información técnica compleja en resúmenes accionables
- Mantenerse actualizado con cambios en las dependencias del proyecto
- Proponer mejoras basadas en evidencia y benchmarks
**Skills necesarios:** `context7`, `websearch`, `competitor-research`, `trends-analysis`, `documentation`
**Modelo recomendado:** `opencode/nemotron-3-super-free` (eficiente para búsqueda y síntesis de información)

## Flujo de Trabajo End-to-End Típico

### Ejemplo: "Agregar sistema de puntos de lealtad a compras"

1. **Orquestador** recibe el task y lo descompone:
   - Diseñar UI de visualización y canje de puntos → `disenador-maqui`
   - Agregar campos de puntos en tablas de clientes y pedidos → `arquitecto-db-maqui` + `backend-maqui`
   - Mostrar puntos en perfil de cliente y historial de pedidos → `frontend-maqui`
   - Lógica de acumulación y canje de puntos al crear pedidos → `backend-maqui`
   - Tests de acumulación, vencimiento y canje de puntos → `qa-maqui`
   - Actualizar ayuda y documentación del nuevo sistema → `contenido-maqui`
   - Verificar despliegue en entorno de staging → `devops-maqui`

2. **Orquestador** coordina los handoffs en secuencia lógica:
   - `disenador-maqui` → entrega especificaciones de UI
   - `arquitecto-db-maqui` y `backend-maqui` trabajan en paralelo (DB y API)
   - `frontend-maqui` recibe las especificaciones de diseño y los endpoints de API
   - `qa-maqui` recibe la implementación completa para crear tests
   - `contenido-maqui` trabaja basado en las especificaciones funcionales
   - `devops-maqui` prepara el despliegue una vez que QA aprueba

3. **Cada agente** ejecuta su parte usando sus skills especializados:
   - El diseñador crea un archivo DESIGN.md con los componentes de puntos
   - El arquitecto de DB agrega columnas `puntos_acumulados` y `puntos_disponibles` a la tabla de clientes
   - El backend implementa la lógica de cálculo y actualización de puntos
   - El frontend crea componentes para mostrar y canjear puntos
   - QA escribe pruebas que verifican la acumulación correcta y el canje
   - Contenido crea guías de usuario explicando el nuevo sistema
   - DevOps verifica que el despliegue a Vercel funciona correctamente

4. **Orquestador** realiza la integración final:
   - Revisa que todos los componentes funcionen juntos
   - Ejecuta el suite completo de pruebas
   - Solicita aprobación de code review
   - Autoriza el merge a la rama principal
   - Notifica al equipo de la completion del feature

## Estructura de Archivos y Organización

### En el proyecto Maqui Mary:
```
Maqui-Mary/
├── .claude/
│   ├── agents/
│   │   ├── orquestador-maqui.md
│   │   ├── disenador-maqui.md
│   │   ├── frontend-maqui.md
│   │   ├── backend-maqui.md
│   │   ├── sunat-maqui.md
│   │   ├── qa-maqui.md
│   │   ├── devops-maqui.md
│   │   ├── contenido-maqui.md
│   │   ├── arquitecto-db-maqui.md
│   │   └── investigador-maqui.md
│   ├── commands/
│   │   └── orchestrator-task.md  # comando para iniciar un task con el orquestador
│   ├── memory/
│   │   ├── lessons_learned.md
│   │   └── topic/
│   │       ├── maqui-mary.md
│   │       └── maqui-mary-agentes.md  # nuevo topic para este sistema
│   └── settings.json
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-31-maqui-mary-multi-agente-sistema-design.md
├── web/
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # componentes reutilizables
│   │   ├── lib/                  # lógica de negocio y utilidades
│   │   ├── styles/               # estilos Tailwind personalizados
│   │   └── types/                # tipos TypeScript globales
│   └── supabase/                 # migraciones y configuración de Supabase
└── scripts/                      # scripts de automatización y despliegue
```

### Archivo de Agente Ejemplo (`orquestador-maqui.md`):
```markdown
# Orquestador Maqui

## Rol
Coordinador principal que gestiona el flujo de trabajo end-to-end del desarrollo de Maqui Mary.

## Responsabilidades
- Descomponer tareas complejas en pasos manejables
- Crear planes de implementación detallados
- Coordinar handoffs entre agentes especializados
- Gestionar dependencias y conflictos
- Asegurar calidad mediante revisiones de código
- Mantener registro de decisiones y lecciones aprendidas

## Skills Disponibles
- brainstorming
- writing-plans
- executing-plans
- systematic-debugging
- requesting-code-review
- receiving-code-review
- stop-slop

## Modelo Predeterminado
opencode/sonnet-4-6

## Instrucciones de Uso
Para iniciar un nuevo task:
1. Usar el comando `/orchestrator-task` 
2. Describir el objetivo del task
3. El orquestador descompondrá el task y coordinará con los agentes especializados
4. Seguir el flujo de trabajo coordinado hasta la completion
```

## Métricas de Éxito

### Calidad del Código
- Cobertura de tests > 80% para nueva funcionalidad
- 0 vulnerabilidades de seguridad críticas en scans
- Cumplimiento de estándares de accesibilidad WCAG 2.2 AA
- Código sigue convenciones del proyecto ( TypeScript strict, convenciones de commit )

### Velocidad de Entrega
- Tiempo promedio de task a completion reducido en 40% vs enfoque ad-hoc
- Menos contexto switching para desarrolladores humanos
- Mejor estimación de esfuerzo gracias a descomposición estructurada

### Mantenibilidad
- Documentación actualizada con cada cambio significativo
- Lecciones aprendidas registradas y accesibles
- Diseño del sistema evolucionando de forma intencional
- Reducción en deuda técnica gracias a refactorings continuos

## Próximos Steps para Implementación

1. **Crear los archivos de agente** en `.claude/agents/` para cada uno de los 10 agentes propuestos
2. **Crear el comando** `/orchestrator-task` en `.claude/commands/`
3. **Actualizar el topic memory** en `.claude/memory/topic/maqui-mary-agentes.md`
4. **Probar el flujo** con un task simple para validar la coordinación
5. **Iterar y ajustar** basado en la experiencia real de uso

---
*Este diseño fue creado siguiendo la metodología de brainstorming de OpenCode Superpowers. Revisado y aprobado el 31/05/2026.*