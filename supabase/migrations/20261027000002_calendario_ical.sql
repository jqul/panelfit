-- Calendario del cliente para Google / Apple / Outlook (iCal), 2026-10-27.
--
-- El cliente activa "Añadir a mi calendario" y recibe una dirección secreta (/api/calendario?t=<token>) que su
-- aplicación de calendario consulta sola cada pocas horas. El token es propio del calendario (no el del enlace de
-- acceso): se puede desactivar o cambiar sin tocar el acceso al panel.
--
-- `calendario_enlaces`: un token por cliente, con RLS (el cliente, su entrenador o un compañero de su equipo).
-- `calendario_datos(token)`: lo único que ve quien tenga la dirección. Devuelve solo lo que va al calendario
-- (sesiones confirmadas con el entrenador, fechas clave, ausencias y los días de entreno elegidos), nada de salud,
-- y nada si el cliente está archivado o el token no tiene forma de token.
-- Prueba: hardening/tests/bloque17_calendario_ical.sql (run-pglite-calendario.mjs).

create table if not exists public.calendario_enlaces (
  client_id  uuid primary key references public.clientes(id) on delete cascade,
  token      text not null unique check (token ~ '^[a-f0-9]{32,64}$'),
  created_at timestamptz not null default now()
);

alter table public.calendario_enlaces enable row level security;

create policy "cliente_o_entrenador_calendario" on public.calendario_enlaces
  for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = calendario_enlaces.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from public.clientes c where c.id = calendario_enlaces.client_id
    and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()) or public.is_team_member_of(c."trainerId"))));

revoke all on public.calendario_enlaces from anon;

create or replace function public.calendario_datos(p_token text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_client uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{32,64}$' then return null; end if;
  select e.client_id into v_client
    from public.calendario_enlaces e join public.clientes c on c.id = e.client_id
   where e.token = p_token and c.archived_at is null;
  if v_client is null then return null; end if;

  return jsonb_build_object(
    'entrenador', (select coalesce(nullif(t."displayName", ''), 'tu entrenador')
                     from public.clientes c join public.entrenadores t on t.uid = c."trainerId" where c.id = v_client),
    'citas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', title, 'inicio', start_at, 'fin', end_at) order by start_at)
                         from public.citas
                        where client_id = v_client and status = 'confirmada'
                          and start_at > now() - interval '30 days' and start_at < now() + interval '180 days'), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'fecha', fecha, 'nombre', nombre, 'prioridad', prioridad) order by fecha)
                           from public.eventos_cliente where client_id = v_client and fecha > current_date - 30), '[]'::jsonb),
    'ausencias', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'desde', desde, 'hasta', hasta, 'motivo', motivo) order by desde)
                             from public.ausencias where client_id = v_client and hasta > current_date - 30), '[]'::jsonb),
    'entreno', (select jsonb_build_object(
                         'dias', coalesce(p.plan -> 'P' -> 'diasElegidos', '[]'::jsonb),
                         'inicio', p.plan -> 'P' ->> 'fechaInicio',
                         'semanas', jsonb_array_length(coalesce(p.plan -> 'P' -> 'weeks', '[]'::jsonb)),
                         'programa', p.plan -> 'P' ->> 'programName')
                  from public.planes p where p."clientId" = v_client)
  );
end;
$function$;

revoke all on function public.calendario_datos(text) from public;
grant execute on function public.calendario_datos(text) to anon, authenticated;

-- RGPD: el token entra en la exportación y en el borrado completo del cliente.
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('ausencias', 'client_id'), ('calendario_enlaces', 'client_id'),
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
