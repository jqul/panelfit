-- Ausencias del cliente y eventos con fecha (2026-10-27).
--
-- `ausencias`: "no puedo entrenar del 14 al 18, viaje" (o disponibilidad limitada). La pone el cliente o su
-- entrenador; el entrenador la ve en la ficha y la lista, y las alertas de inactividad no saltan mientras dura.
-- `eventos_cliente`: una competición o fecha clave con prioridad A/B/C; el cliente ve la cuenta atrás en Hoy.
--
-- Acceso como readiness_checkins y citas: el cliente (su cuenta) y su entrenador o un compañero de su equipo.
-- Ninguna de las dos es visible sin sesión. Las dos entran en la exportación y el borrado completo del RGPD
-- (client_data_tables), y caen en cascada si se borra el cliente.
-- Prueba: hardening/tests/bloque16_ausencias_eventos.sql (run-pglite-ausencias-eventos.mjs).

create table if not exists public.ausencias (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clientes(id) on delete cascade,
  desde      date not null,
  hasta      date not null,
  tipo       text not null default 'no_puedo' check (tipo in ('no_puedo', 'limitada')),
  motivo     text not null default 'otro' check (motivo in ('viaje', 'lesion', 'enfermedad', 'trabajo', 'otro')),
  nota       text not null default '' check (char_length(nota) <= 300),
  creado_por text not null default 'cliente' check (creado_por in ('cliente', 'entrenador')),
  created_at timestamptz not null default now(),
  check (hasta >= desde),
  check (hasta - desde <= 180)
);
create index if not exists ausencias_client_hasta_idx on public.ausencias (client_id, hasta);

create table if not exists public.eventos_cliente (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clientes(id) on delete cascade,
  fecha      date not null,
  nombre     text not null check (char_length(btrim(nombre)) between 1 and 80),
  prioridad  text not null default 'A' check (prioridad in ('A', 'B', 'C')),
  nota       text not null default '' check (char_length(nota) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists eventos_cliente_client_fecha_idx on public.eventos_cliente (client_id, fecha);

alter table public.ausencias enable row level security;
alter table public.eventos_cliente enable row level security;

create policy "cliente_o_entrenador_ausencias" on public.ausencias
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = ausencias.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from public.clientes c where c.id = ausencias.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

create policy "cliente_o_entrenador_eventos" on public.eventos_cliente
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = eventos_cliente.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from public.clientes c where c.id = eventos_cliente.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

revoke all on public.ausencias, public.eventos_cliente from anon;

-- RGPD: las tablas nuevas entran en la exportación y el borrado completo del cliente.
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('ausencias', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
