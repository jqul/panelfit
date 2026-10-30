-- Permisos por compañero del equipo (2026-10-30).
--
-- El dueño decide, para cada compañero (team_members):
--   solo_asignados   solo ve y toca los clientes asignados a él (clientes.profesional_id, 20261030000005). Se aplica
--                    aquí, en la base de datos: la regla de `clientes` deja de darle los demás y, como las reglas de
--                    planes, registros, tareas, ausencias… comprueban el cliente leyendo `clientes` (que respeta esa
--                    regla), tampoco ve sus datos. Las citas y los bonos, que van por entrenador, se restringen igual.
--                    Los clientes que crea ese compañero quedan asignados a él (si no, no los vería).
--   ver_negocio      si ve la sección Negocio (ingresos) en su panel. Solo de pantalla: no es una barrera de datos.
-- Por defecto, como hasta ahora: ve todos los clientes y Negocio.
-- Prueba: hardening/tests/bloque30_permisos_equipo.sql (run-pglite-permisos-equipo.mjs).

alter table public.team_members add column if not exists solo_asignados boolean not null default false;
alter table public.team_members add column if not exists ver_negocio boolean not null default true;

-- ¿Puede quien llama, como compañero del dueño, ver a un cliente asignado a `p_profesional`?
create or replace function public.equipo_ve_cliente(p_owner uuid, p_profesional uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (
    select 1 from team_members t
     where t.owner_id = p_owner and t.member_uid = auth.uid()
       and (not t.solo_asignados or p_profesional = auth.uid())
  );
$$;
revoke execute on function public.equipo_ve_cliente(uuid, uuid) from public, anon;
grant execute on function public.equipo_ve_cliente(uuid, uuid) to authenticated;

drop policy if exists trainer_owns_clientes on public.clientes;
create policy trainer_owns_clientes on public.clientes for all
  using ("trainerId" = (select auth.uid()) or is_super_admin() or equipo_ve_cliente("trainerId", profesional_id))
  with check ("trainerId" = (select auth.uid()) or is_super_admin() or equipo_ve_cliente("trainerId", profesional_id));

-- Citas y bonos: el equipo, solo las de clientes que ve (o, en citas, los bloqueos sin cliente).
drop policy if exists trainer_owns_citas on public.citas;
create policy trainer_owns_citas on public.citas for all
  using (trainer_id = (select auth.uid()) or is_super_admin()
         or (is_team_member_of(trainer_id) and (client_id is null or exists (select 1 from clientes c where c.id = citas.client_id))))
  with check (trainer_id = (select auth.uid()) or is_super_admin()
         or (is_team_member_of(trainer_id) and (client_id is null or exists (select 1 from clientes c where c.id = citas.client_id))));

drop policy if exists "entrenador_gestiona_bonos" on public.bonos_cliente;
create policy "entrenador_gestiona_bonos" on public.bonos_cliente for all to authenticated
  using (trainer_id = (select auth.uid())
         or (is_team_member_of(trainer_id) and exists (select 1 from clientes c where c.id = bonos_cliente.client_id)))
  with check ((trainer_id = (select auth.uid()) or is_team_member_of(trainer_id))
    and exists (select 1 from clientes c where c.id = bonos_cliente.client_id and c."trainerId" = bonos_cliente.trainer_id));

-- Lo que crea un compañero queda asignado a él (con "solo sus clientes" es la única forma de que lo vea).
create or replace function public.profesional_por_defecto()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if new.profesional_id is null and auth.uid() is not null and auth.uid() <> new."trainerId"
     and exists (select 1 from team_members t where t.owner_id = new."trainerId" and t.member_uid = auth.uid()) then
    new.profesional_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_profesional_por_defecto on public.clientes;
create trigger clientes_profesional_por_defecto before insert on public.clientes
  for each row execute function public.profesional_por_defecto();
