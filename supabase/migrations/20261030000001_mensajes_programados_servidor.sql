-- Envío de los mensajes programados desde el servidor (2026-10-30).
--
-- Hasta ahora un mensaje programado ("Mañana toca AMRAP…") solo se enviaba como push cuando el entrenador abría la
-- pestaña Mensajes de su panel: si no la abría ese día, el cliente no recibía nada. Ahora lo envía la función de borde
-- `enviar-mensajes-programados` (supabase/functions/enviar-mensajes-programados), lanzada por una tarea programada:
--   - el secreto 'mensajes_programados' (aleatorio, solo en internal_webhook_secrets, nunca en el código);
--   - lanzar_mensajes_programados(), que la tarea programada ejecuta cada hora y que solo llama a la función entre las
--     8 y las 21 (Madrid) y solo si hay algo que enviar (un mensaje que toca hoy o antes, sin push enviado).
-- La función marca "pushEnviado" y NO "enviado": "enviado" lo marca el entrenador desde su panel (compatible con la
-- pestaña Mensajes, que no repite el push si pushEnviado ya está).
-- Prueba: hardening/tests/bloque26_mensajes_programados.sql (run-pglite-mensajes-programados.mjs).

insert into public.internal_webhook_secrets (name, secret)
values ('mensajes_programados', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function public.lanzar_mensajes_programados(p_hora_madrid integer default null)
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_secret text; v_hora integer; v_hoy date;
begin
  -- `p_hora_madrid` solo sirve para probar la función sin depender del reloj; la tarea programada no lo pasa
  v_hora := coalesce(p_hora_madrid, extract(hour from now() at time zone 'Europe/Madrid')::integer);
  if v_hora < 8 or v_hora > 21 then return false; end if;
  v_hoy := (now() at time zone 'Europe/Madrid')::date;
  if not exists (
    select 1 from programacion_mensajes
    where not coalesce(enviado, false) and not coalesce("pushEnviado", false) and "fechaEnvio" <= v_hoy
  ) then return false; end if;
  select secret into v_secret from internal_webhook_secrets where name = 'mensajes_programados';
  if v_secret is null then return false; end if;
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/enviar-mensajes-programados',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;
revoke execute on function public.lanzar_mensajes_programados(integer) from public, anon, authenticated;

-- Tarea programada: cada hora, y cinco minutos pasada para no coincidir con el recordatorio diario.
select cron.schedule('mensajes-programados', '5 * * * *', $cron$select public.lanzar_mensajes_programados();$cron$);
