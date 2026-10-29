-- De qué programa viene una tarea suelta (2026-10-29).
--
-- Al asignar un programa, sus tareas que no son entrenos (cardio, vídeo, documento, registrar evolución) se crean como
-- tareas con fecha (tareas_cliente), marcadas con origen = 'programa:<id>'. Así, al cambiar de programa o
-- actualizarlo, se quitan las suyas que estaban por venir y sin hacer (src/lib/sincronizarTareasPrograma.ts).
-- Las que pone el entrenador a mano no llevan origen y nunca se tocan. Las políticas no cambian: las crea y borra el
-- entrenador (o su equipo), como cualquier tarea.
-- Prueba: hardening/tests/bloque24_tareas_origen.sql (run-pglite-tareas-origen.mjs).

alter table public.tareas_cliente add column if not exists origen text
  check (origen is null or char_length(origen) between 1 and 80);

create index if not exists tareas_cliente_origen_idx on public.tareas_cliente (client_id, fecha) where origen is not null;
