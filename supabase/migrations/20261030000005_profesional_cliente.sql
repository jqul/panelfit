-- Asignar clientes a cada profesional del equipo (2026-10-30).
--
-- Un entrenador con equipo (team_members) puede repartir sus clientes: cada cliente tiene, si se quiere, un profesional
-- asignado (el dueño o un compañero de su equipo). No cambia quién ve qué (el equipo sigue viendo todos los clientes
-- del dueño): sirve para que cada uno filtre "Mis clientes" y para saber de quién es cada cliente.
--
--   clientes.profesional_id      null = sin asignar. Solo puede ser el dueño (trainerId) o alguien de su equipo
--                                (trigger validar_profesional); si alguien deja el equipo, sus clientes quedan sin asignar.
--   profesionales_del_equipo()   el dueño y su equipo, con nombre, para quien es del equipo (los compañeros no siempre
--                                pueden leer la ficha de los demás en entrenadores).
-- get_client_by_token devuelve SETOF clientes con las columnas en el orden de la tabla: se rehace con la nueva al final
-- (sin rehacerla, el panel de todos los clientes dejaría de cargar; ver 20261026000002_archivar_clientes.sql).
-- Prueba: hardening/tests/bloque29_profesional_cliente.sql (run-pglite-profesional-cliente.mjs).

alter table public.clientes add column if not exists profesional_id uuid references public.entrenadores(uid) on delete set null;
create index if not exists clientes_profesional_idx on public.clientes ("trainerId", profesional_id) where profesional_id is not null;

create or replace function public.get_client_by_token(p_token text)
 returns setof clientes
 language sql
 security definer
 set search_path to 'public'
as $function$
  select c.id, c."trainerId", c.name, c.surname, c.weight, c."fatPercentage", c."muscleMass",
         c."totalLifted", c."planDescription", c.token, c."createdAt", c.objetivo, c.phone,
         c.altura, c.genero, c.fechanacimiento,
         null::text        as notas_privadas,
         '[]'::jsonb       as alerts,
         c.auth_user_id,
         '[]'::jsonb       as label_ids,
         c.notif_email, c.notif_prefs,
         null::numeric     as precio_mensual,
         null::text        as lesiones,
         null::text        as equipo_disponible,
         c.metricas_cliente, c.plan_last_opened_at, c.main_goal,
         c.token_expires_at,
         c.archived_at,
         c.recordatorio_diario,
         null::uuid        as profesional_id
  from public.clientes c
  where c.token = p_token
    and (c.token_expires_at is null or c.token_expires_at > now())
    and c.archived_at is null
  limit 1;
$function$;

create or replace function public.validar_profesional()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if new.profesional_id is not null and new.profesional_id <> new."trainerId"
     and not exists (select 1 from team_members t where t.owner_id = new."trainerId" and t.member_uid = new.profesional_id) then
    raise exception 'El profesional asignado tiene que ser del equipo del entrenador' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_validar_profesional on public.clientes;
create trigger clientes_validar_profesional before insert or update of profesional_id, "trainerId" on public.clientes
  for each row execute function public.validar_profesional();

-- Si alguien deja el equipo, sus clientes de ese dueño quedan sin asignar.
create or replace function public.soltar_clientes_del_profesional()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  update clientes set profesional_id = null where "trainerId" = old.owner_id and profesional_id = old.member_uid;
  return old;
end;
$$;

drop trigger if exists team_members_soltar_clientes on public.team_members;
create trigger team_members_soltar_clientes after delete on public.team_members
  for each row execute function public.soltar_clientes_del_profesional();

create or replace function public.profesionales_del_equipo(p_owner uuid)
 returns table(uid uuid, nombre text)
 language sql stable security definer
 set search_path to 'public'
as $$
  select e.uid, coalesce(nullif(btrim(e."displayName"), ''), e.email) as nombre
    from entrenadores e
   where (auth.uid() = p_owner or exists (select 1 from team_members t where t.owner_id = p_owner and t.member_uid = auth.uid()))
     and (e.uid = p_owner or e.uid in (select t.member_uid from team_members t where t.owner_id = p_owner))
   order by e.uid = p_owner desc, 2;
$$;
revoke execute on function public.profesionales_del_equipo(uuid) from public, anon;
grant execute on function public.profesionales_del_equipo(uuid) to authenticated;
