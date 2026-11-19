-- Resultado técnico del aviso push de un contacto (2026-11-19).
--
-- El aviso al entrenador no puede ser el único sitio donde exista una solicitud (el lead siempre está en Contactos), pero sí conviene saber si
-- el push NO salió. La función de borde notify-lead anota en el lead, con la clave de servicio, qué pasó:
--   sin_suscripcion        el entrenador no tiene push activado en ningún dispositivo
--   enviado_al_proveedor   el servicio push aceptó el envío (NO demuestra que llegara al móvil)
--   fallido                la función dio error o todas las suscripciones fallaron
--   parcial                se intentó en varios dispositivos y solo alguno aceptó el envío
-- Nunca lleva datos de salud: solo el estado y cuándo. El trigger leads_notify pasa el id del lead a la función.
-- Prueba: hardening/tests/bloque43_aviso_push_lead.sql (run-pglite-aviso-push-lead.mjs).

alter table public.leads add column if not exists aviso_push text
  check (aviso_push is null or aviso_push in ('sin_suscripcion', 'enviado_al_proveedor', 'fallido', 'parcial'));
alter table public.leads add column if not exists aviso_push_at bigint;

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
      case when new.status = 'revisar' then 'Revisión personal: '
           when new.origen = 'programacion' then 'Solicitud de programación: '
           else 'Nuevo contacto: ' end || left(new.name, 80),
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
        -- lead_id: para dejar anotado en el lead qué pasó con el aviso (ningún dato de salud)
        body := jsonb_build_object('trainer_id', new.trainer_id, 'name', left(new.name, 80), 'lead_id', new.id,
          'tipo', case when new.status = 'revisar' then 'revision' when new.origen = 'programacion' then 'solicitud' else 'contacto' end)
      );
    end if;
  exception when others then
    null; -- el aviso es secundario: el contacto ya está guardado
  end;
  return new;
end;
$$;
revoke execute on function public.notify_new_lead() from public, anon, authenticated;
