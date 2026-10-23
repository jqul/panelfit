-- Bloque 10 (RGPD, 2026-10-23): exportación de todos los datos de un cliente.

create or replace function public.client_data_tables()
 returns table(tbl text, col text) language sql immutable
 set search_path to 'public'
as $$
  values
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$$;

create or replace function public.can_manage_client(p_client_id uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from public.clientes c
    where c.id = p_client_id
      and (c."trainerId" = auth.uid() or public.is_super_admin() or public.is_team_member_of(c."trainerId")));
$$;

-- Lo puede pedir el propio cliente (sin las notas privadas, alertas y etiquetas
-- del entrenador) o su entrenador / equipo / super admin (completo).
create or replace function public.export_client_data(p_client_id uuid)
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  r record;
  v jsonb;
  v_row jsonb;
  v_out jsonb;
  v_manager boolean := public.can_manage_client(p_client_id);
  v_self boolean := auth.uid() is not null and exists (
    select 1 from public.clientes c where c.id = p_client_id and c.auth_user_id = auth.uid());
begin
  if not (v_manager or v_self) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select to_jsonb(c) into v_row from public.clientes c where c.id = p_client_id;
  if v_row is null then raise exception 'Cliente no encontrado'; end if;
  if not v_manager then v_row := v_row - 'notas_privadas' - 'alerts' - 'label_ids'; end if;
  v_out := jsonb_build_object('clientes', v_row);

  for r in select * from public.client_data_tables() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where t.%I::text = $1', r.tbl, r.col)
      into v using p_client_id::text;
    v_out := v_out || jsonb_build_object(r.tbl, v);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.accepted_at), '[]'::jsonb) into v
    from public.consentimientos t where t."clientId" = p_client_id;
  return v_out || jsonb_build_object('consentimientos', v, 'exportado_en', now());
end;
$$;

revoke execute on function public.export_client_data(uuid), public.can_manage_client(uuid) from public, anon;
grant execute on function public.export_client_data(uuid), public.can_manage_client(uuid) to authenticated;
