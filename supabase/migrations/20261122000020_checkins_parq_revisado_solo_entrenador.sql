-- Las filas de `checkins` con tipo 'parq_revisado' (el entrenador dice «he revisado la ficha de admisión de este cliente») solo las puede escribir el entrenador
-- del cliente (o su equipo / un superadmin) y la propia base de datos sin sesión (service role, migraciones).
--
-- Por qué: la política RLS de `checkins` deja al cliente escribir en SUS filas, así que sin esto podría insertarse una «revisión» y darse por revisado a sí mismo
-- (soltando la retención de su cuestionario de programación). Un trigger es lo único que distingue por tipo de fila sin tocar la política existente ni el resto de
-- usos de `checkins` (check-ins, fichas de admisión, etc., que siguen como estaban).
--
-- Qué NO hace: no impide que el cliente cambie SUS respuestas (la ficha es suya; la revisión atada a su contenido —huella— deja de valer si cambian) ni protege
-- nada más allá de esta marca. La retención del cuestionario de programación sigue siendo solo de interfaz (ver src/lib/retencionParq.ts).
--
-- Cubre INSERT, UPDATE y DELETE, y también un UPDATE que convierta una fila de otro tipo en 'parq_revisado' o al revés.

create or replace function public.checkins_parq_revisado_solo_entrenador()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_old_cliente uuid;
  v_new_cliente uuid;
begin
  -- Sin sesión (service role, SQL de administración): permitido. Quien llega desde la web siempre trae sesión (anon no puede escribir en checkins por RLS).
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.tipo is not distinct from 'parq_revisado' then v_old_cliente := old."clientId"; end if;
  if tg_op in ('INSERT', 'UPDATE') and new.tipo is not distinct from 'parq_revisado' then v_new_cliente := new."clientId"; end if;

  -- Nada que ver con revisiones: no se toca
  if v_old_cliente is null and v_new_cliente is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Cada cliente implicado (el de la fila vieja y el de la nueva) debe ser de este entrenador, de su equipo, o él ser superadmin
  if (v_old_cliente is not null and not public.checkins_puede_revisar(v_old_cliente))
     or (v_new_cliente is not null and not public.checkins_puede_revisar(v_new_cliente)) then
    raise exception 'Solo el entrenador del cliente puede marcar su ficha de admisión como revisada' using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- ¿Puede el usuario de la sesión revisar la ficha de este cliente? (su entrenador, un miembro de su equipo o un superadmin)
create or replace function public.checkins_puede_revisar(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_super_admin()
      or exists (
        select 1 from public.clientes c
        where c.id = p_cliente
          and (c."trainerId" = auth.uid() or public.is_team_member_of(c."trainerId"))
      );
$$;

revoke all on function public.checkins_puede_revisar(uuid) from public, anon, authenticated;
revoke all on function public.checkins_parq_revisado_solo_entrenador() from public, anon, authenticated;

drop trigger if exists checkins_parq_revisado_solo_entrenador on public.checkins;
create trigger checkins_parq_revisado_solo_entrenador
  before insert or update or delete on public.checkins
  for each row execute function public.checkins_parq_revisado_solo_entrenador();
