---
name: panelfit-flujo
description: Flujo de trabajo de PanelFit para cualquier cambio con código o con la base de datos (rama, tests, migración probada con PGlite, aplicar y verificar con reversión, PR, CI y merge). Úsala al empezar una tarea de desarrollo en este repositorio y antes de tocar Supabase.
---

# Flujo de PanelFit

Este es el flujo que seguimos en cada tarea. No es una lista de deseos: cada paso está porque alguna vez se olvidó y costó algo.

## Reglas que no se saltan
- **Se mergea solo con el CI en verde.** Nunca con rojo ni pendiente.
- **No se borran datos de producción.** Las comprobaciones en producción se hacen con un bloque `DO` que termina en `RAISE EXCEPTION` (se revierte todo) y después se comprueba que no queda nada.
- **No se toca** la protección de ramas de GitHub, nada de pagos (Javier no quiere cobros) ni los datos de Javier como cliente salvo lo que pida la revisión del domingo.
- **Contenido público con el nombre de alguien** (páginas, textos que ven clientes): preparado pero apagado, y se pregunta antes de publicarlo.
- **Se informa con honradez:** qué se comprobó, cómo y qué NO se pudo comprobar (por ejemplo, un push a un móvil real). Nada de "hecho" si no está verificado.
- Hay autonomía para mergear, aplicar migraciones verificadas, borrar ramas fusionadas y trabajar en paralelo. Cuidado con las tareas pesadas el domingo a las 12:00 (revisión semanal de Javier): comparten cupo de uso.

## 1. Empezar
- `git fetch origin && git checkout -b claude/<tema> origin/main`. Otras sesiones trabajan en paralelo: `main` se mueve.
- `node_modules` de los worktrees es un enlace al del repositorio principal: un `npm install` ahí lo cambia para todos (y **borra** lo instalado con `--no-save`, como PGlite).
- Si el cambio se ve (pantalla, demo), piensa ya cómo lo vas a comprobar.

## 2. Escribir
- Comentarios en español que explican el **porqué**; mismo estilo que el código de al lado.
- La lógica va en `src/lib/*.ts` sin React ni red, con su `*.test.ts`. Lo que habla con Supabase, en un fichero aparte (para poder probar la lógica sin variables de entorno).
- Lo pesado y poco usado, con `lazy()`: hay **presupuestos de tamaño** (`scripts/bundle-report.mjs`: landing 135, cliente 165, entrenador 240 kB gzip; confirma las cifras en ese fichero, porque se ajustan hacia abajo cuando se mejora) y el CI falla si se pasan.
- Los registros de entreno se indexan **por posición** (`ex_w{semana}_d{dia}_r{posición}`): no reordenes ni insertes ejercicios en semanas con registros.
- Si la pantalla llama a una función RPC nueva, enséñasela al simulador de e2e (`e2e/support/fakeSupabase.ts`) o la prueba fallará por "petición no entendida".
- Botones e inputs con nombre accesible (también lo usan los e2e).

## 3. Probar en local
Desde la raíz, en PowerShell:
- `npx tsc --noEmit` y `npm run typecheck:e2e`
- `npx vitest run`
- `npm run size` (construye y mide; debe decir "ok" en los tres)
- e2e: `$env:E2E_PORT='5195'; npx playwright test e2e/<fichero>`. La primera carga compila en frío: usa `test.setTimeout(120_000)` y `expect.configure({ timeout: 30_000 })` en las pruebas de pantallas diferidas. El conjunto completo tarda ~5 min (el CI lo ejecuta igual): lánzalo en segundo plano.
- Si usas el demo en una prueba: la página pública de ejemplo usa el slug `alexfit`; elige otro slug en tus pruebas.

## 4. Verlo a ojo (regla de Javier: probar en el demo antes de decir "hecho")
- Copia `.env.local` del repositorio principal, apunta `dev-with-node.cmd` al puerto 5196 (`npm run dev -- --port 5196 --strictPort`) y añade una entrada a `.claude/launch.json`. Al acabar: `git checkout .claude/launch.json dev-with-node.cmd`, `rm .env.local vite.config.ts.timestamp-*`.
- Demo del entrenador: `/?demo=1`. Demo del cliente: `/?c=demo-maria-001`. Móvil: `resize_window` a "mobile" y volver a "desktop" al terminar.
- Si el panel va lento con el servidor en frío o la captura sale recortada, recarga; para lo estructural, un e2e es más fiable que mirar.

## 5. Migraciones y funciones de Supabase (proyecto `thurxdxazqqxuzbupghv`)
1. Fichero `supabase/migrations/AAAAMMDDNNNNNN_nombre.sql` con un comentario inicial que explique qué y por qué.
2. **Prueba en PGlite** antes de tocar producción: `supabase/hardening/tests/bloqueN_*.sql` + `run-pglite-*.mjs` (copia uno existente). Necesita `npm i --no-save @electric-sql/pglite`. Trampas conocidas:
   - Una consulta **no ve** lo que inserta una función llamada en la misma sentencia: separa el envío de la comprobación.
   - `pg_net`/`cron` no existen en PGlite: sustituye `net.http_post` por un registro de llamadas y corta la línea de `cron.schedule`.
3. Aplicar con `apply_migration` y **verificar en producción con reversión** (bloque `DO` + `RAISE EXCEPTION`), y después una consulta que confirme 0 residuos. `pg_net` solo envía al confirmar la transacción: la reversión no manda nada.
4. Funciones de trigger o de tarea programada: `revoke execute ... from public, anon, authenticated`.
5. Secretos de funciones de borde: tabla `internal_webhook_secrets`, creados **a mano** en la base de datos (nunca en el repositorio); la función los lee con la clave de servicio y los compara sin atajos de tiempo. `verify_jwt=false` solo cuando la autenticación es ese secreto.
6. Funciones de borde: el código vive en `supabase/functions/<nombre>/index.ts` y se despliega con `deploy_edge_function` con el mismo contenido. Prefiere imports `npm:` (el registro JSR da tiempos de espera). No hay forma de borrar una función desde aquí: se deja inofensiva y se avisa a Javier.
7. Anota la migración en `supabase/README.md`.

## 6. Commit y PR
- `gh` está en `C:\Program Files\GitHub CLI` (añádelo al PATH en Bash).
- Commits en español, sin lista de ficheros; terminan con la línea `Co-Authored-By` que indique el sistema.
- PR con: **Qué cambia**, **Verificación** (lo que se probó y cómo), lo que NO se pudo probar, y la línea final "🤖 Generated with Claude Code".
- Tras abrirlo: `set_monitor` con `auto_fix` y esperar con `gh pr checks <n> --watch` (si pasa de 10 min, `gh pr checks <n>` a mano). Los comentarios de `vercel[bot]` son ruido: no se responden.
- Mergear con `gh pr merge <n> --merge`, borrar la rama remota, `git fetch --prune` y empezar la siguiente desde `origin/main`.

## 7. Cerrar
- Actualiza `FUNCIONALIDADES.md` (y `docs/rendimiento.md` si cambió el tamaño).
- Si el cambio se ve, actualiza el **demo** para que lo enseñe y añade un e2e del demo.
- Resumen a Javier en español claro: qué hay ahora, qué no se pudo comprobar y qué decisión le toca a él.

## Trampas de este repositorio
- Muchos ficheros son CRLF: edita con la herramienta de edición o normaliza antes de reemplazar texto.
- Los scripts con `$$` o muchas comillas rompen en heredocs de Bash: escríbelos con la herramienta de escritura y ejecútalos aparte.
- React en desarrollo ejecuta cada efecto dos veces: usa una referencia `montado` si un efecto carga datos.
- En iOS la app instalada tiene su propio almacenamiento y lee el manifiesto al cargar; una sola sesión de Supabase por origen (entrenador y cliente en el mismo móvil se pisan).
