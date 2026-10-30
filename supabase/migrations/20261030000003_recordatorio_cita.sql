-- Recordatorio de cita una hora antes (2026-10-30).
--
-- Cada 15 minutos, si hay alguna cita confirmada (con cliente) que empieza dentro de 30 a 75 minutos y aún no se ha
-- recordado, `lanzar_recordatorio_citas()` llama a la función de borde `recordatorio-cita`
-- (supabase/functions/recordatorio-cita), que reclama cada cita (recordada_at, de forma atómica: un solo aviso aunque
-- la tarea se lance dos veces) y manda el push al cliente: "Tu cita es a las 18:00". Así llega más o menos una hora
-- antes (entre 30 y 75 minutos según caiga la tarea).
-- Lo que hace falta:
--   - citas.recordada_at y un índice parcial para que la comprobación no recorra toda la tabla;
--   - el secreto 'recordatorio_cita' (aleatorio, solo en internal_webhook_secrets, nunca en el código);
--   - el lanzador, que no se puede llamar desde fuera (solo la tarea programada).
-- Prueba: hardening/tests/bloque27_recordatorio_cita.sql (run-pglite-recordatorio-cita.mjs).

alter table public.citas add column if not exists recordada_at timestamptz;

create index if not exists idx_citas_por_recordar on public.citas (start_at)
  where status = 'confirmada' and recordada_at is null and client_id is not null;

insert into public.internal_webhook_secrets (name, secret)
values ('recordatorio_cita', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function public.lanzar_recordatorio_citas()
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_secret text;
begin
  -- Sin nada que recordar no se llama a la función de borde (la comprobación es barata; cada llamada, no).
  if not exists (
    select 1 from citas
     where status = 'confirmada' and recordada_at is null and client_id is not null
       and start_at between now() + interval '30 minutes' and now() + interval '75 minutes'
  ) then
    return false;
  end if;
  select secret into v_secret from internal_webhook_secrets where name = 'recordatorio_cita';
  if v_secret is null then return false; end if;
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/recordatorio-cita',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;
revoke execute on function public.lanzar_recordatorio_citas() from public, anon, authenticated;

-- Tarea programada: cada 15 minutos.
select cron.schedule('recordatorio-cita', '*/15 * * * *', $cron$select public.lanzar_recordatorio_citas();$cron$);
