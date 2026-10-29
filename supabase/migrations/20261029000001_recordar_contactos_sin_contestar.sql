-- Recordatorio de contactos sin contestar (2026-10-29).
--
-- El aviso de "contacto nuevo" llega una vez; si el entrenador no lo ve, el contacto se enfría (y es un cliente por ganar).
-- Cada hora, esta tarea mira los contactos "nuevos" que llevan más de 24 h sin contestar y, una sola vez por contacto:
--   1. deja una notificación en la campanita ("Sin contestar: Paula"), y
--   2. pide un push a la función de borde `notify-lead` (con `recordatorio`), con el mismo secreto 'new_lead'.
-- Solo entre las 8:00 y las 21:59 (hora de Madrid), para no despertar a nadie, y solo contactos de los últimos 7 días
-- (más viejos ya no se reclaman). `recordado_at` evita repetir el aviso.

alter table public.leads add column if not exists recordado_at bigint;

create or replace function public.recordar_contactos_sin_contestar(p_hora_madrid integer default null)
 returns integer language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_ahora bigint := (extract(epoch from now()) * 1000)::bigint;
  v_secret text;
  r record;
  n integer := 0;
begin
  -- `p_hora_madrid` solo sirve para probar la función sin depender del reloj; la tarea programada no lo pasa
  if coalesce(p_hora_madrid, extract(hour from now() at time zone 'Europe/Madrid')::integer) not between 8 and 21 then
    return 0;
  end if;

  select secret into v_secret from internal_webhook_secrets where name = 'new_lead';

  for r in
    select id, trainer_id, name from leads
    where status = 'nuevo' and recordado_at is null
      and created_at < v_ahora - 86400000 and created_at > v_ahora - 7 * 86400000
  loop
    update leads set recordado_at = v_ahora where id = r.id;
    begin
      insert into notificaciones (id, trainer_id, client_id, tipo, titulo, mensaje, leida, created_at, destinatario)
      values ('lead_recuerdo_' || r.id::text, r.trainer_id::text, null, 'nuevo_contacto',
              'Sin contestar: ' || left(r.name, 80), 'Lleva más de un día esperando tu respuesta', false, v_ahora, 'trainer')
      on conflict (id) do nothing;
      if v_secret is not null then
        perform net.http_post(
          url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/notify-lead',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
          body := jsonb_build_object('trainer_id', r.trainer_id, 'name', left(r.name, 80), 'recordatorio', true)
        );
      end if;
    exception when others then
      null; -- el aviso es secundario: el contacto ya queda marcado como recordado
    end;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.recordar_contactos_sin_contestar(integer) from public, anon, authenticated;

-- Tarea programada: cada hora, en punto.
select cron.schedule('recordar-contactos-sin-contestar', '0 * * * *', $cron$select public.recordar_contactos_sin_contestar();$cron$);
