-- Bonos de sesiones con caducidad (2026-10-30).
--
-- El entrenador le da a un cliente un bono ("Bono 10 sesiones", con o sin fecha de caducidad). Cada cita nueva del
-- cliente (la reserve él desde la app o la cree el entrenador) se descuenta sola de su bono activo: el que caduca antes
-- de los que aún tienen sesiones y no han caducado el día de la cita. Las citas canceladas dejan de contar. Lo que
-- queda se calcula contando sus citas no canceladas (src/lib/bonos.ts).
--
--   bonos_cliente    los gestiona el entrenador (o su equipo), solo para SUS clientes; el cliente ve los suyos.
--   citas.bono_id    de qué bono descuenta la cita (si se borra el bono, la cita se queda sin él).
--   asignar_bono     trigger al crear una cita: pone el bono activo si no trae uno, y descarta uno que no sea de ese
--                    cliente (nadie descuenta de un bono ajeno).
-- Entra en el RGPD (client_data_tables) y cae en cascada si se borra el cliente.
-- Prueba: hardening/tests/bloque28_bonos.sql (run-pglite-bonos.mjs).

create table if not exists public.bonos_cliente (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.entrenadores(uid) on delete cascade,
  client_id   uuid not null references public.clientes(id) on delete cascade,
  nombre      text not null check (char_length(btrim(nombre)) between 1 and 60),
  sesiones    integer not null check (sesiones between 1 and 200),
  caduca      date,
  created_at  timestamptz not null default now()
);
create index if not exists bonos_cliente_client_idx on public.bonos_cliente (client_id);

alter table public.bonos_cliente enable row level security;

create policy "entrenador_gestiona_bonos" on public.bonos_cliente for all to authenticated
  using (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
  with check ((trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
    and exists (select 1 from public.clientes c where c.id = bonos_cliente.client_id and c."trainerId" = bonos_cliente.trainer_id));

create policy "cliente_ve_sus_bonos" on public.bonos_cliente for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = bonos_cliente.client_id and c.auth_user_id = (select auth.uid())));

revoke all on public.bonos_cliente from anon;

alter table public.citas add column if not exists bono_id uuid references public.bonos_cliente(id) on delete set null;
create index if not exists citas_bono_idx on public.citas (bono_id) where bono_id is not null;

create or replace function public.asignar_bono()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  -- Un bono que no es de ese cliente no vale (no se descuenta de un bono ajeno)
  if new.bono_id is not null and not exists (select 1 from bonos_cliente b where b.id = new.bono_id and b.client_id = new.client_id) then
    new.bono_id := null;
  end if;
  if new.bono_id is null and new.client_id is not null and new.status <> 'cancelada' then
    select b.id into new.bono_id from bonos_cliente b
     where b.client_id = new.client_id
       and (b.caduca is null or b.caduca >= (new.start_at at time zone 'Europe/Madrid')::date)
       and b.sesiones > (select count(*) from citas c where c.bono_id = b.id and c.status <> 'cancelada')
     order by b.caduca nulls last, b.created_at
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists citas_asignar_bono on public.citas;
create trigger citas_asignar_bono before insert on public.citas
  for each row execute function public.asignar_bono();

create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notificaciones', 'client_id'),
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
