-- Solicitud de programación inicial: aviso propio, recordatorio para «a revisar» y seguimiento autorizado (2026-11-19).
--
-- Tras la primera versión (20261118000020) quedan cuatro cabos antes de compartir enlaces:
--   1. El push decía «Nuevo contacto» para todo. Ahora el trigger le dice a `notify-lead` de qué tipo es ('solicitud' | 'revision' |
--      'contacto') y la función escribe «Nueva solicitud de programación» o «Solicitud pendiente de revisión personal». Sin datos de salud.
--   2. Los leads «a revisar» (PAR-Q con alarma) no entraban en ningún recordatorio. `recordar_solicitudes_revision` los avisa UNA vez
--      si llevan más de un día esperando, aparte de «contactos sin contestar»: son otra bandeja (prioridad clínica/operativa).
--   3. La purga de 60 días borra también las «a revisar» (una alarma no se retiene por inercia), salvo las que el entrenador marque
--      como `seguimiento_autorizado` a propósito (o las que convierta en cliente).
--   4. La política (60 días) se enseña en el producto: en el consentimiento y en el detalle de la solicitud (cambio de la pantalla).
-- Prueba: hardening/tests/bloque41_solicitud_revision.sql (run-pglite-solicitud-revision.mjs).

-- ── 1. Seguimiento autorizado: el entrenador decide, explícitamente, conservar una solicitud no convertida ──
alter table public.solicitudes_programacion add column if not exists seguimiento_autorizado boolean not null default false;

create or replace function public.autorizar_seguimiento_solicitud(p_lead_id uuid, p_autorizado boolean)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.leads where id = p_lead_id and trainer_id = v_uid and origen = 'programacion') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.solicitudes_programacion set seguimiento_autorizado = coalesce(p_autorizado, false) where lead_id = p_lead_id;
end;
$$;
revoke execute on function public.autorizar_seguimiento_solicitud(uuid, boolean) from public, anon;
grant execute on function public.autorizar_seguimiento_solicitud(uuid, boolean) to authenticated;

-- La purga respeta lo autorizado; todo lo demás no convertido, «a revisar» incluido, se borra a los 60 días
create or replace function public.purgar_solicitudes_programacion(p_dias integer default 60)
 returns integer language plpgsql security definer
 set search_path to 'public'
as $$
declare n integer;
begin
  delete from public.leads l
   where l.origen = 'programacion' and l.status <> 'convertido'
     and l.created_at < (extract(epoch from now()) * 1000)::bigint - p_dias::bigint * 86400000
     and not exists (select 1 from public.solicitudes_programacion s where s.lead_id = l.id and s.seguimiento_autorizado);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purgar_solicitudes_programacion(integer) from public, anon, authenticated;

-- ── 2. El aviso dice de qué tipo es (el push lo escribe notify-lead; la campanita sigue como estaba) ──
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
        body := jsonb_build_object('trainer_id', new.trainer_id, 'name', left(new.name, 80),
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

-- ── 3. Recordatorio específico de las solicitudes «a revisar» ──
-- Una sola vez por solicitud, si lleva más de 24 h sin que el entrenador la mire (sigue en 'revisar'), entre las 8:00 y las 21:59
-- (Madrid) y solo de los últimos 14 días. Reutiliza `leads.recordado_at`: «contactos sin contestar» solo mira los 'nuevo', así que no se pisan.
create or replace function public.recordar_solicitudes_revision(p_hora_madrid integer default null)
 returns integer language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_ahora bigint := (extract(epoch from now()) * 1000)::bigint;
  v_secret text;
  r record;
  n integer := 0;
begin
  if coalesce(p_hora_madrid, extract(hour from now() at time zone 'Europe/Madrid')::integer) not between 8 and 21 then
    return 0;
  end if;
  select secret into v_secret from internal_webhook_secrets where name = 'new_lead';

  for r in
    select id, trainer_id, name from leads
    where origen = 'programacion' and status = 'revisar' and recordado_at is null
      and created_at < v_ahora - 86400000 and created_at > v_ahora - 14 * 86400000
  loop
    update leads set recordado_at = v_ahora where id = r.id;
    begin
      insert into notificaciones (id, trainer_id, client_id, tipo, titulo, mensaje, leida, created_at, destinatario)
      values ('revision_recuerdo_' || r.id::text, r.trainer_id::text, null, 'nuevo_contacto',
              'Pendiente de revisión personal: ' || left(r.name, 80), 'Lleva más de un día esperando tu revisión', false, v_ahora, 'trainer')
      on conflict (id) do nothing;
      if v_secret is not null then
        perform net.http_post(
          url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/notify-lead',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
          body := jsonb_build_object('trainer_id', r.trainer_id, 'name', left(r.name, 80), 'recordatorio', true, 'tipo', 'revision')
        );
      end if;
    exception when others then
      null; -- el aviso es secundario: la solicitud ya queda marcada como recordada
    end;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.recordar_solicitudes_revision(integer) from public, anon, authenticated;

-- Al borrar un lead tampoco queda su recordatorio (llevaba el nombre)
create or replace function public.limpiar_avisos_lead()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  delete from public.notificaciones where id in ('lead_' || old.id::text, 'lead_recuerdo_' || old.id::text, 'revision_recuerdo_' || old.id::text);
  return old;
end;
$$;
revoke execute on function public.limpiar_avisos_lead() from public, anon, authenticated;

-- Tarea programada: cada hora, a y media (la de contactos sin contestar va en punto).
select cron.schedule('recordar-solicitudes-revision', '30 * * * *', $cron$select public.recordar_solicitudes_revision();$cron$);
