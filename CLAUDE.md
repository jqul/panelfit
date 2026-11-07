# PanelFit

App para entrenadores personales: panel del entrenador, app del cliente (por enlace) y páginas públicas (landing, blog, calculadoras). React 18 + Vite 5 + TypeScript + Tailwind 4, datos en Supabase y despliegue en Vercel.

**Antes de cualquier cambio de código o de base de datos, usa la skill `panelfit-flujo`.** Recoge las reglas que no se saltan (CI en verde para mergear, no borrar datos de producción, verificar antes de decir "hecho") y el paso a paso.

## Comandos
- `npx tsc --noEmit`: tipos de la app (`src`)
- `npm run typecheck:e2e`: tipos de las pruebas e2e
- `npx vitest run`: pruebas unitarias (`*.test.ts` junto al código)
- `npm run size`: construye y comprueba los presupuestos de tamaño (`scripts/bundle-report.mjs`)
- `npx playwright test e2e/<fichero>`: una prueba e2e (el conjunto completo tarda ~5 min: en segundo plano)
- Servidor de desarrollo: `panelfit-dev` en `.claude/launch.json`. Demo del entrenador `/?demo=1`, demo del cliente `/?c=demo-maria-001`

El CI (`.github/workflows/ci.yml`) ejecuta lo mismo en cada PR.

## Dónde está cada cosa
- `src/lib/`: lógica pura (sin React ni red) con su `*.test.ts`. Lo que habla con Supabase va en un fichero aparte.
- `src/components/trainer/`, `client/`, `shared/`: pantallas del entrenador, del cliente y comunes. En la raíz de `components/`: landings, blog y herramientas públicas.
- `src/hooks/`: carga de datos con Supabase. `src/types/index.ts`: tipos compartidos.
- `api/`: funciones de Vercel (`calendario.js`, `manifest.js`).
- `supabase/migrations/`: migraciones; cada una se anota en `supabase/README.md`. `supabase/functions/`: funciones de borde. `supabase/hardening/tests/`: pruebas de migraciones con PGlite.
- `e2e/`: pruebas Playwright contra un Supabase simulado (`e2e/support/fakeSupabase.ts`); toda RPC nueva hay que enseñársela ahí.
- `docs/`: notas de diseño (rendimiento, RGPD, sincronización, pruebas e2e).

## Convenciones
- Todo en español: código de dominio, comentarios (explican el porqué), commits y PRs.
- Lo pesado y poco usado, con `lazy()`: hay presupuestos de tamaño por zona y el CI falla si se pasan.
- Los registros de entreno se indexan por posición: no reordenes ni insertes ejercicios en semanas con registros.
- Botones e inputs con nombre accesible (los e2e los buscan así).
- No edites `.env.local` ni `package-lock.json` a mano.

## Hook de tipos
Tras editar un `.ts`/`.tsx`, `.claude/hooks/typecheck.mjs` pasa `tsc` (incremental) y avisa solo de los errores del fichero editado. No sustituye a `npx tsc --noEmit` completo antes del PR.
