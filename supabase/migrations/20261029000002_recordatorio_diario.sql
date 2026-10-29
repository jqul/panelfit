-- Aviso diario de lo pendiente al cliente (2026-10-29).
--
-- A las 18:00 (hora de Madrid), un push al cliente que tiene la sesión de hoy o alguna tarea de hoy sin hacer:
-- "Te queda el entreno de hoy" / "Te quedan 2 tareas de hoy". Lo calcula y lo envía la función de borde
-- `recordatorio-diario` (supabase/functions/recordatorio-diario); esta migración pone lo que necesita:
--   - clientes.recordatorio_diario: el cliente puede apagarlo desde su app (recordatorio_diario_cliente);
--   - recordatorios_enviados: uno por cliente y día como mucho (la clave primaria lo garantiza). Solo lo usa la
--     función con service role: RLS activado y sin políticas. Entra en el RGPD (client_data_tables) y cae en cascada;
--   - el secreto 'recordatorio_diario' (aleatorio, solo en internal_webhook_secrets, nunca en el código);
--   - lanzar_recordatorio_diario(), que la tarea programada ejecuta cada hora y solo llama a la función a las 18.
-- Prueba: hardening/tests/bloque22_recordatorio_diario.sql (run-pglite-recordatorio-diario.mjs).

alter table public.clientes add column if not exists recordatorio_diario boolean not null default true;

-- get_client_by_token devuelve SETOF clientes con la lista de columnas en el orden de la tabla: la nueva va al final.
-- Sin rehacerla, el panel de todos los clientes dejaría de cargar (ver 20261026000002_archivar_clientes.sql).
create or replace function public.get_client_by_token(p_token text)
 returns setof clientes
 language sql
 security definer
 set search_path to 'public'
as $function$
  select c.id, c."trainerId", c.name, c.surname, c.weight, c."fatPercentage", c."muscleMass",
         c."totalLifted", c."planDescription", c.token, c."createdAt", c.objetivo, c.phone,
         c.altura, c.genero, c.fechanacimiento,
         null::text        as notas_privadas,
         '[]'::jsonb       as alerts,
         c.auth_user_id,
         '[]'::jsonb       as label_ids,
         c.notif_email, c.notif_prefs,
         null::numeric     as precio_mensual,
         null::text        as lesiones,
         null::text        as equipo_disponible,
         c.metricas_cliente, c.plan_last_opened_at, c.main_goal,
         c.token_expires_at,
         c.archived_at,
         c.recordatorio_diario
  from public.clientes c
  where c.token = p_token
    and (c.token_expires_at is null or c.token_expires_at > now())
    and c.archived_at is null
  limit 1;
$function$;

create table if not exists public.recordatorios_enviados (
  client_id  uuid not null references public.clientes(id) on delete cascade,
  fecha      date not null,
  created_at timestamptz not null default now(),
  primary key (client_id, fecha)
);
alter table public.recordatorios_enviados enable row level security;
revoke all on public.recordatorios_enviados from anon, authenticated;

-- El cliente enciende o apaga su aviso (solo el suyo). Devuelve si ha cambiado algo.
create or replace function public.recordatorio_diario_cliente(p_activo boolean)
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare n integer;
begin
  if auth.uid() is null or p_activo is null then return false; end if;
  update clientes set recordatorio_diario = p_activo where auth_user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke execute on function public.recordatorio_diario_cliente(boolean) from public, anon;
grant execute on function public.recordatorio_diario_cliente(boolean) to authenticated;

insert into public.internal_webhook_secrets (name, secret)
values ('recordatorio_diario', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function public.lanzar_recordatorio_diario(p_hora_madrid integer default null)
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_secret text;
begin
  -- `p_hora_madrid` solo sirve para probar la función sin depender del reloj; la tarea programada no lo pasa
  if coalesce(p_hora_madrid, extract(hour from now() at time zone 'Europe/Madrid')::integer) <> 18 then
    return false;
  end if;
  select secret into v_secret from internal_webhook_secrets where name = 'recordatorio_diario';
  if v_secret is null then return false; end if;
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/recordatorio-diario',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;
revoke execute on function public.lanzar_recordatorio_diario(integer) from public, anon, authenticated;

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
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;

-- Tarea programada: cada hora, en punto (la función solo hace algo a las 18 de Madrid, en verano y en invierno).
select cron.schedule('recordatorio-diario', '0 * * * *', $cron$select public.lanzar_recordatorio_diario();$cron$);
