-- Entrenos del reloj: el cliente (o su entrenador) sube el archivo .fit/.gpx/.tcx que exporta su reloj o su app
-- (Garmin, Coros, Polar, Suunto, Apple a través de una app de exportación…) y se guarda su resumen. El archivo no se
-- guarda: solo los números (src/lib/actividadReloj.ts).

create table if not exists public.actividades (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clientes(id) on delete cascade,
  fecha       date not null,
  inicio      timestamptz,
  deporte     text not null check (deporte in ('correr', 'bici', 'caminar', 'nadar', 'remo', 'fuerza', 'otro')),
  nombre      text not null default '' check (char_length(nombre) <= 80),
  duracion_s  integer not null check (duracion_s > 0 and duracion_s <= 86400),
  distancia_m integer check (distancia_m is null or (distancia_m >= 0 and distancia_m <= 1000000)),
  desnivel_m  integer check (desnivel_m is null or (desnivel_m >= 0 and desnivel_m <= 20000)),
  fc_media    smallint check (fc_media is null or fc_media between 30 and 250),
  fc_max      smallint check (fc_max is null or fc_max between 30 and 250),
  kcal        integer check (kcal is null or (kcal >= 0 and kcal <= 20000)),
  origen      text not null default 'archivo' check (origen in ('archivo')),
  created_at  timestamptz not null default now()
);
create index if not exists actividades_client_idx on public.actividades (client_id, fecha desc);
-- El mismo entreno no se importa dos veces
create unique index if not exists actividades_unica on public.actividades (client_id, inicio) where inicio is not null;

alter table public.actividades enable row level security;

-- El cliente, su entrenador o un compañero del equipo: ver, subir y borrar.
create policy "cliente_o_entrenador_actividades" on public.actividades
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = actividades.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from public.clientes c where c.id = actividades.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

revoke all on public.actividades from anon;

-- RGPD: entran en la exportación y el borrado completo del cliente (también los descansos del aviso de fin)
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
    ('cohorte_clientes', 'client_id'), ('descansos', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
