# Revisión técnica y de producto — PanelFit

Fecha: 2026-05-27

## 1) Hallazgos clave

1. **`App.tsx` concentra demasiada orquestación** (auth, routing por query params, modo demo, modo pending, carga de perfil y render condicional grande). Esto complica pruebas y mantenimiento.
2. **`TrainerDashboard.tsx` es un componente monolítico** con mucha lógica de datos (queries, mapeos, estadísticas, UI y mutaciones en el mismo archivo).
3. **Uso extensivo de `localStorage` para demo y notas** que hoy está embebido en pantallas principales; conviene encapsularlo para evitar side-effects y facilitar migraciones.
4. **Higiene de repo**: existía `gitignore` sin punto; Git no lo aplica automáticamente como archivo de exclusión estándar.
5. **Nombres de archivos anómalos** que pueden romper DX/builds en algunos entornos (`Preciospage` sin extensión, `Pendingscreen · TSX` con caracteres/espacios inusuales).

## 2) Prioridades recomendadas (2 semanas)

### Semana 1 — Estabilidad y estructura

- Extraer de `App.tsx`:
  - `useAuthBootstrap` para sesión/perfil
  - `useDemoBootstrap` para hidratación demo
  - `AppRouter` para lógica de vistas
- Extraer de `TrainerDashboard.tsx`:
  - `useTrainerClients` (fetch, realtime, delete/add)
  - `useClientStats` (lastActive, doneToday, weeklyDays)
  - `useLabels`
- Normalizar nombres de archivos conflictivos.

### Semana 2 — UX y crecimiento

- Definir design tokens básicos (spacing/typography/colors).
- Estandarizar estados de carga/empty/error en tabs clave.
- Crear landing SEO inicial:
  - `/app-entrenadores`
  - `/alternativas/harbiz`
  - `/software-entrenador-personal`

## 3) Checklist de calidad por PR

- Sin `any` nuevo salvo justificación explícita.
- Sin lógica de negocio nueva dentro de componentes de más de 300 líneas.
- Estados de `loading/error/empty` cubiertos.
- Prueba manual mínima:
  1) Alta de cliente
  2) Asignación de plan
  3) Vista de cliente por token
  4) Logout/login

## 4) Métricas objetivo

- Reducir `App.tsx` a <250 líneas.
- Reducir `TrainerDashboard.tsx` a <350 líneas moviendo lógica a hooks.
- Tiempo para "crear cliente + asignar plan" < 2 minutos.


## 5) Backlog ejecutable recomendado

> Objetivo: avanzar primero en lo que aumenta valor percibido y reduce fricción para entrenadores reales.

### Tarea 1 — Flujo "cliente nuevo → plan asignado"

- **Problema:** el valor principal de PanelFit depende de crear clientes y dejarles un plan activo sin perderse entre pantallas.
- **Acción:** revisar el flujo completo desde alta de cliente hasta asignación del primer plan.
- **Criterio de hecho:** un entrenador puede crear un cliente mínimo y asignarle una rutina en menos de 2 minutos.
- **Prioridad:** alta.

### Tarea 2 — Dashboard inicial más accionable

- **Problema:** el dashboard debe decirle al entrenador qué hacer hoy, no solo mostrar navegación.
- **Acción:** priorizar tarjetas de clientes sin plan, clientes inactivos y entrenamientos completados esta semana.
- **Criterio de hecho:** al entrar, el entrenador ve 3 acciones claras: revisar inactivos, asignar planes pendientes y ver progreso semanal.
- **Prioridad:** alta.

### Tarea 3 — Estados vacíos y mensajes guía

- **Problema:** cuando no hay datos, la app puede sentirse incompleta.
- **Acción:** añadir textos y CTAs claros en pantallas sin clientes, sin planes, sin ejercicios o sin registros.
- **Criterio de hecho:** cada pantalla principal tiene un estado vacío que explica qué hacer después.
- **Prioridad:** alta.

### Tarea 4 — Refactor pequeño, no masivo

- **Problema:** los componentes grandes frenan futuras mejoras, pero un refactor enorme puede retrasar producto.
- **Acción:** extraer solo la lógica de clientes de `TrainerDashboard.tsx` a un hook y dejar el resto para después.
- **Criterio de hecho:** fetch, realtime, alta y borrado de clientes viven fuera del componente visual.
- **Prioridad:** media.

### Tarea 5 — Primera página SEO pública

- **Problema:** sin páginas indexables, Google no puede posicionar Panelfit por búsquedas comerciales.
- **Acción:** crear una landing enfocada en "app para entrenadores personales" antes de hacer comparativas más agresivas.
- **Criterio de hecho:** la página tiene H1, beneficios, capturas/demo, FAQ y CTA a registro o demo.
- **Prioridad:** media.

## 6) Orden exacto sugerido

1. Mejorar el flujo de alta de cliente y asignación de plan.
2. Añadir estados vacíos útiles en dashboard, clientes, planes y ejercicios.
3. Convertir el dashboard en una pantalla de acciones diarias.
4. Extraer el primer hook (`useTrainerClients`) para bajar deuda técnica sin paralizar producto.
5. Crear la primera landing SEO pública.

## 7) Qué dejar para después

- Automatizaciones avanzadas.
- Rediseño completo de toda la interfaz.
- Comparativas SEO contra competidores si todavía no hay una landing base sólida.
- Refactors grandes que no cambian la experiencia del usuario final.
