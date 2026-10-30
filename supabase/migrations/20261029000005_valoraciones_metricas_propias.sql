-- Métricas propias del entrenador en las valoraciones (2026-10-29).
--
-- El entrenador define sus métricas ("FC en reposo · lpm"…) en su perfil (entrenadores.profile.metricasPropias) y los
-- valores de cada valoración van aquí: { "m_xxx": 58 }. Solo un objeto, y pequeño (12 métricas como mucho en la app).
-- Las políticas de valoraciones no cambian (el entrenador de la valoración o el propio cliente).
-- Prueba: hardening/tests/bloque25_valoraciones_extra.sql (run-pglite-valoraciones-extra.mjs).

alter table public.valoraciones add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.valoraciones add constraint valoraciones_extra_objeto
  check (jsonb_typeof(extra) = 'object' and pg_column_size(extra) <= 4096);
