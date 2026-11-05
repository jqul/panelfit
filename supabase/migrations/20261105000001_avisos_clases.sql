-- Avisos de las clases de grupo (2026-11-05).
--
-- Dos avisos push al cliente que faltaban en las clases (20261104000004_clases_grupo.sql):
--   - "Ya tienes plaza en «Funcional»" cuando pasa de la lista de espera a tener plaza (porque alguien cancela, el
--     entrenador quita a alguien o sube el aforo). La plaza queda marcada con aviso_plaza_pendiente y se avisa al
--     momento: un trigger llama al lanzador, que llama a la función de borde recordatorio-cita.
--   - El recordatorio de una hora antes, como el de las citas: recordada_at, una vez por plaza.
-- La función de borde reclama cada aviso con una condición (atómico): aunque se lance dos veces, un único push.
-- El lanzador (lanzar_recordatorio_citas) sigue siendo el de la tarea de cada 15 minutos; ahora también mira las clases
-- y las plazas por avisar, y sin nada que hacer no llama a la función.
-- Prueba: hardening/tests/bloque35_avisos_clases.sql (run-pglite-avisos-clases.mjs).

alter table public.clase_plazas
  add column if not exists recordada_at timestamptz,
  add column if not exists aviso_plaza_pendiente boolean not null default false;

create index if not exists clase_plazas_aviso_pendiente_idx on public.clase_plazas (clase_id) where aviso_plaza_pendiente;
create index if not exists clase_plazas_por_recordar_idx on public.clase_plazas (clase_id) where estado = 'reservada' and recordada_at is null;

-- Quien pasa de la espera a tener plaza queda por avisar (lo hace promover_espera, o el entrenador a mano)
create or replace function public.clase_plazas_marca_aviso()
 returns trigger language plpgsql
 set search_path to 'public'
as $$
begin
  if old.estado = 'espera' and new.estado = 'reservada' then new.aviso_plaza_pendiente := true; end if;
  if new.estado = 'espera' then new.aviso_plaza_pendiente := false; end if;
  return new;
end;
$$;
drop trigger if exists clase_plazas_marca_aviso on public.clase_plazas;
-- Va después del de aforo (orden alfabético: clase_plazas_aforo < clase_plazas_marca_aviso), que puede devolverla a la espera
create trigger clase_plazas_marca_aviso before update of estado on public.clase_plazas
  for each row execute function public.clase_plazas_marca_aviso();

-- Y se avisa al momento (no a los 15 minutos de la tarea)
create or replace function public.clase_plazas_lanza_aviso()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  -- Un fallo al avisar no puede deshacer la cancelación de quien liberó la plaza: la tarea de 15 minutos lo reintenta
  begin perform public.lanzar_recordatorio_citas(); exception when others then null; end;
  return null;
end;
$$;
drop trigger if exists clase_plazas_lanza_aviso on public.clase_plazas;
create trigger clase_plazas_lanza_aviso after update of estado on public.clase_plazas
  for each row when (old.estado = 'espera' and new.estado = 'reservada')
  execute function public.clase_plazas_lanza_aviso();

create or replace function public.lanzar_recordatorio_citas()
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_secret text;
begin
  -- Sin nada que recordar ni avisar no se llama a la función de borde (la comprobación es barata; cada llamada, no).
  if not exists (
    select 1 from citas
     where status = 'confirmada' and recordada_at is null and client_id is not null
       and start_at between now() + interval '30 minutes' and now() + interval '75 minutes'
  ) and not exists (
    select 1 from clase_plazas p join clases k on k.id = p.clase_id
     where p.estado = 'reservada' and p.recordada_at is null and not k.cancelada
       and k.start_at between now() + interval '30 minutes' and now() + interval '75 minutes'
  ) and not exists (
    select 1 from clase_plazas p join clases k on k.id = p.clase_id
     where p.aviso_plaza_pendiente and p.estado = 'reservada' and not k.cancelada and k.start_at > now()
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
revoke all on function public.clase_plazas_lanza_aviso() from public, anon, authenticated;
