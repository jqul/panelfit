-- Preferencias de la biblioteca de ejercicios, sincronizadas entre dispositivos (2026-10-26).
--
-- Hasta ahora los favoritos y las listas propias del entrenador (grupos musculares, especialidades y etiquetas)
-- vivían solo en el localStorage de cada navegador: la biblioteca se veía distinta en el ordenador y en el móvil.
-- Una fila por entrenador: `valores` = { fav: [ids], cats: [...], esps: [...], tags: [...] } y `ts` = la marca de
-- tiempo (ms) de la última modificación de CADA lista, para quedarse con la más reciente al sincronizar.
-- Misma regla de acceso que exercise_library: cada entrenador solo ve y escribe la suya. Sin permisos para `anon`.
-- Prueba: hardening/tests/bloque15_biblioteca_preferencias.sql (run-pglite-biblioteca-preferencias.mjs).

create table if not exists public.exercise_library_prefs (
  trainer_id text primary key,
  valores    jsonb  not null default '{}'::jsonb,
  ts         jsonb  not null default '{}'::jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.exercise_library_prefs enable row level security;

create policy "trainer_owns_exercise_library_prefs" on public.exercise_library_prefs
  for all to authenticated
  using (trainer_id = (select auth.uid())::text)
  with check (trainer_id = (select auth.uid())::text);
