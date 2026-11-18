-- Diario de decisiones del entrenador (2026-11-18).
--
-- Cuando un ejercicio no sube (lista de comprobación «Estancamiento»), lo importante no es solo qué se decide sino por qué y
-- cuándo se vuelve a mirar: la hipótesis, la intervención (o no intervenir) y la fecha de revisión, y al revisarla, qué pasó. Así
-- el criterio se puede contrastar con lo ocurrido en vez de repetirse de memoria (src/lib/diarioDecisiones.ts).
--
--   decisiones_entrenador   SOLO el entrenador (o su equipo), solo para SUS clientes. El cliente NO la ve: son hipótesis
--                           de trabajo sobre él, no un diagnóstico (por eso no va en planes.plan, que el cliente lee entero).
-- Entra en el RGPD (client_data_tables) y cae en cascada si se borra el cliente.
-- Prueba: hardening/tests/bloque29_diario_decisiones.sql (run-pglite-diario-decisiones.mjs).

create table if not exists public.decisiones_entrenador (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.entrenadores(uid) on delete cascade,
  client_id    uuid not null references public.clientes(id) on delete cascade,
  fecha        date not null default ((now() at time zone 'Europe/Madrid')::date),
  ejercicio    text check (ejercicio is null or char_length(btrim(ejercicio)) between 1 and 120),
  hipotesis    text not null default '' check (char_length(hipotesis) <= 1000),
  tipo         text not null check (tipo in ('mantener', 'subir', 'bajar', 'redistribuir', 'sustituir', 'no-intervenir')),
  intervencion text not null default '' check (char_length(intervencion) <= 1000),
  revisar_el   date,
  revisada_el  date,
  resultado    text check (resultado is null or char_length(resultado) <= 1000),
  created_at   timestamptz not null default now(),
  -- Una decisión no se revisa antes de tomarla
  check (revisar_el is null or revisar_el >= fecha),
  check (revisada_el is null or revisada_el >= fecha)
);
create index if not exists decisiones_entrenador_client_idx on public.decisiones_entrenador (client_id, fecha desc);

alter table public.decisiones_entrenador enable row level security;

-- Solo el entrenador o su equipo, y solo para clientes suyos. No hay política para el cliente: no ve nada.
create policy "entrenador_gestiona_decisiones" on public.decisiones_entrenador for all to authenticated
  using (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
  with check ((trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
    and exists (select 1 from public.clientes c where c.id = decisiones_entrenador.client_id and c."trainerId" = decisiones_entrenador.trainer_id));

revoke all on public.decisiones_entrenador from anon;

-- RGPD: la exportación y el borrado completo del cliente la incluyen
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('actividades', 'client_id'),
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('clase_plazas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('decisiones_entrenador', 'client_id'), ('descansos', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('strava_conexiones', 'client_id'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
