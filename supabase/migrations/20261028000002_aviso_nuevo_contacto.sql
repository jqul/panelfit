-- Aviso al entrenador cuando entra un contacto por su página pública (2026-10-28).
--
-- Hasta ahora `submit_lead` solo insertaba la fila en `leads`: no llegaba ningún aviso y el contacto solo se veía
-- entrando a Ajustes. Este trigger, al insertarse un contacto:
--   1. deja una notificación en `notificaciones` (la campanita del panel, en directo por Realtime), y
--   2. avisa por push con la función de borde `notify-lead` (secreto 'new_lead' en internal_webhook_secrets,
--      que se crea a mano en la base de datos: no va en este fichero).
-- Si el aviso falla, el contacto se guarda igual: nunca puede romper el envío del formulario.

create or replace function public.notify_new_lead()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_secret text;
begin
  begin
    insert into notificaciones (id, trainer_id, client_id, tipo, titulo, mensaje, leida, created_at, destinatario)
    values (
      'lead_' || new.id::text,
      new.trainer_id::text,
      null,
      'nuevo_contacto',
      'Nuevo contacto: ' || left(new.name, 80),
      left(coalesce(nullif(btrim(new.message), ''), 'Te ha escrito desde tu página pública'), 200),
      false,
      new.created_at,
      'trainer'
    )
    on conflict (id) do nothing;

    select secret into v_secret from internal_webhook_secrets where name = 'new_lead';
    if v_secret is not null then
      perform net.http_post(
        url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/notify-lead',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
        body := jsonb_build_object('trainer_id', new.trainer_id, 'name', left(new.name, 80))
      );
    end if;
  exception when others then
    null; -- el aviso es secundario: el contacto ya está guardado
  end;
  return new;
end;
$$;

revoke execute on function public.notify_new_lead() from public, anon, authenticated;

drop trigger if exists leads_notify on public.leads;
create trigger leads_notify
  after insert on public.leads
  for each row execute function public.notify_new_lead();
