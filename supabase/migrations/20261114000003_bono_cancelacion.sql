-- Bonos: cancelar a tiempo devuelve la sesión; cancelar tarde la gasta (2026-11-14).
-- Hasta ahora toda cita cancelada volvía al bono, aunque se cancelara una hora antes. Ahora:
--   - A tiempo (antes del plazo de cancelación del entrenador, horario_citas.cancelar_horas; sin plazo, antes de que
--     empiece): la sesión vuelve al bono, como siempre (el cliente la recupera reservando otra).
--   - Tarde: la cita queda cancelada pero gasta la sesión (citas.consume_bono = true). El entrenador puede devolverla
--     igualmente (pone consume_bono a false).
-- Cuentan como usadas las citas no canceladas y las canceladas tarde (asignar_bono aquí y src/lib/bonos.ts).

alter table public.citas add column if not exists consume_bono boolean not null default false;
comment on column public.citas.consume_bono is 'cancelada tarde: gasta la sesión del bono aunque esté cancelada (lib/bonos)';

create or replace function public.cancelacion_bono()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
declare v_horas integer;
begin
  if new.status = 'cancelada' and old.status is distinct from 'cancelada' then
    if new.bono_id is not null then
      select h.cancelar_horas into v_horas from horario_citas h where h.trainer_id = new.trainer_id;
      new.consume_bono := now() >= new.start_at - make_interval(hours => coalesce(v_horas, 0));
    end if;
  elsif new.status is distinct from 'cancelada' then
    new.consume_bono := false; -- una cita viva no "gasta por cancelación"
  end if;
  return new;
end;
$$;
revoke execute on function public.cancelacion_bono() from public, anon, authenticated;

drop trigger if exists citas_cancelacion_bono on public.citas;
create trigger citas_cancelacion_bono before update of status on public.citas
  for each row execute function public.cancelacion_bono();

-- El cliente no puede tocar consume_bono por su cuenta (solo el entrenador o su equipo devuelven una sesión)
create or replace function public.proteger_consume_bono()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if new.consume_bono is distinct from old.consume_bono
     and pg_trigger_depth() = 1
     and not (old.trainer_id = auth.uid() or public.is_team_member_of(old.trainer_id))
     and auth.uid() is not null then
    new.consume_bono := old.consume_bono;
  end if;
  return new;
end;
$$;
revoke execute on function public.proteger_consume_bono() from public, anon, authenticated;

drop trigger if exists citas_proteger_consume_bono on public.citas;
create trigger citas_proteger_consume_bono before update of consume_bono on public.citas
  for each row execute function public.proteger_consume_bono();

-- Lo mismo que en 20261030000004_bonos_cliente.sql, contando también las canceladas tarde
create or replace function public.asignar_bono()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if new.bono_id is not null and not exists (select 1 from bonos_cliente b where b.id = new.bono_id and b.client_id = new.client_id) then
    new.bono_id := null;
  end if;
  if new.bono_id is null and new.client_id is not null and new.status <> 'cancelada' then
    select b.id into new.bono_id from bonos_cliente b
     where b.client_id = new.client_id
       and (b.caduca is null or b.caduca >= (new.start_at at time zone 'Europe/Madrid')::date)
       and b.sesiones > (select count(*) from citas c where c.bono_id = b.id and (c.status <> 'cancelada' or c.consume_bono))
     order by b.caduca nulls last, b.created_at
     limit 1;
  end if;
  return new;
end;
$$;
