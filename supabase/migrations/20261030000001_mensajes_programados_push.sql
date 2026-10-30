-- Push de los mensajes programados sin tener que abrir la pestaña Mensajes (2026-10-30).
--
-- Hasta ahora el push al cliente de un mensaje programado (programacion_mensajes) solo salía cuando el
-- entrenador abría la pestaña Mensajes: si no entraba ese día, el cliente no recibía nada. Ahora lo manda el
-- servidor: cada hora, de 9 a 20 (hora de Madrid), si hay algún mensaje que ya toca (fechaEnvio <= hoy), sin enviar
-- y con el push sin mandar, `lanzar_mensajes_programados()` llama a la función de borde `mensajes-programados`
-- (supabase/functions/mensajes-programados), que reclama cada mensaje (pushEnviado = true, de forma atómica, para que
-- no salga dos veces ni choque con la pestaña, que sigue mandándolo si el servidor aún no lo hizo) y manda el push.
-- Lo que hace falta:
--   - el secreto 'mensajes_programados' (aleatorio, solo en internal_webhook_secrets, nunca en el código);
--   - el lanzador, que no se puede llamar desde fuera (solo la tarea programada);
--   - un índice parcial para que la comprobación horaria no recorra toda la tabla.
-- Prueba: hardening/tests/bloque25_mensajes_programados.sql (run-pglite-mensajes-programados.mjs).

insert into public.internal_webhook_secrets (name, secret)
values ('mensajes_programados', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create index if not exists idx_programacion_mensajes_push_pendiente
  on public.programacion_mensajes ("fechaEnvio")
  where enviado is not true and "pushEnviado" is not true;

create or replace function public.lanzar_mensajes_programados(p_hora_madrid integer default null)
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_secret text;
begin
  -- `p_hora_madrid` solo sirve para probar la función sin depender del reloj; la tarea programada no lo pasa.
  -- Fuera de 9-20 no se manda nada: un push de madrugada no se perdona (se manda en cuanto llegue la hora).
  if coalesce(p_hora_madrid, extract(hour from now() at time zone 'Europe/Madrid')::integer) not between 9 and 20 then
    return false;
  end if;
  -- Sin nada que mandar no se llama a la función de borde (la comprobación es barata; cada llamada, no).
  if not exists (
    select 1 from programacion_mensajes
    where enviado is not true and "pushEnviado" is not true
      and "fechaEnvio" <= (now() at time zone 'Europe/Madrid')::date
  ) then
    return false;
  end if;
  select secret into v_secret from internal_webhook_secrets where name = 'mensajes_programados';
  if v_secret is null then return false; end if;
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/mensajes-programados',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;
revoke execute on function public.lanzar_mensajes_programados(integer) from public, anon, authenticated;

-- Tarea programada: cada hora, a y diez (la función solo hace algo entre las 9 y las 20 de Madrid, en verano y en invierno).
select cron.schedule('mensajes-programados', '10 * * * *', $cron$select public.lanzar_mensajes_programados();$cron$);
