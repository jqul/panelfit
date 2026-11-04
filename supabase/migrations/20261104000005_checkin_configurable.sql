-- Check-in diario configurable (2026-11-04).
--
-- El entrenador elige qué preguntar en el check-in de sus clientes (entrenadores.profile.checkin, lib/checkinConfig):
-- cuáles de las cuatro escalas de siempre (energía, sueño, agujetas, estrés) y hasta tres preguntas propias de 1 a 5
-- ("Hidratación", "Ganas de entrenar"...). Lo que no se pregunta se guarda vacío (null), no con un valor inventado: las
-- medias y avisos del entrenador lo ignoran.
--   - Las cuatro columnas dejan de ser obligatorias (siguen entre 1 y 5 cuando hay valor).
--   - extra: las respuestas a las preguntas propias, { "<id>": 1..5 }.
--   - Cada check-in responde al menos una pregunta.
-- RLS de readiness_checkins sin cambios; la tabla ya está en el RGPD (client_data_tables).

alter table public.readiness_checkins
  alter column sleep drop not null,
  alter column soreness drop not null,
  alter column stress drop not null,
  alter column motivation drop not null,
  add column if not exists extra jsonb not null default '{}'::jsonb;

alter table public.readiness_checkins drop constraint if exists readiness_checkins_extra_valido;
alter table public.readiness_checkins add constraint readiness_checkins_extra_valido check (
  jsonb_typeof(extra) = 'object'
  and pg_column_size(extra) <= 1024
  and not jsonb_path_exists(extra, '$.* ? (@.type() != "number" || @ < 1 || @ > 5)')
);

alter table public.readiness_checkins drop constraint if exists readiness_checkins_alguna_respuesta;
alter table public.readiness_checkins add constraint readiness_checkins_alguna_respuesta check (
  num_nonnulls(sleep, soreness, stress, motivation) > 0 or extra <> '{}'::jsonb
);
