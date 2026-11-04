-- Sesiones de grupo con aforo y lista de espera (2026-11-04).
--
-- Además de las citas 1:1 (citas), el entrenador programa clases para varios clientes: título, hora y plazas. Sus
-- clientes reservan desde su app; si la clase está llena, entran en la lista de espera, por orden de llegada. Cuando
-- alguien con plaza cancela (o el entrenador lo quita, o sube el aforo), el primero de la espera pasa a tener plaza.
--   - clases: las crea, cambia y cancela el entrenador (o su equipo). El cliente no las lee directamente: las ve con
--     clases_cliente(), que le da cuántas plazas quedan sin enseñarle quién más va.
--   - clase_plazas: una fila por cliente apuntado, 'reservada' o 'espera'. El cliente solo ve las suyas y solo entra o
--     sale con reservar_clase() / cancelar_clase(). El entrenador las ve todas y puede quitar a alguien.
--   - Nunca hay más reservadas que plazas: al apuntar a alguien se bloquea la clase y, si está llena, va a la espera
--     (trigger). La espera avanza sola con otro trigger, haga quien haga el cambio.
--   - Las normas de reserva del entrenador (horario_citas) valen también aquí: días vista para reservar y plazo para
--     cancelar una plaza (salir de la lista de espera siempre se puede).
-- clase_plazas entra en el RGPD (client_data_tables) y cae en cascada con el cliente.
-- Prueba: hardening/tests/bloque33_clases_grupo.sql (run-pglite-clases-grupo.mjs).

create table if not exists public.clases (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references public.entrenadores(uid) on delete cascade,
  titulo     text not null check (length(btrim(titulo)) between 1 and 80),
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  aforo      integer not null check (aforo between 1 and 200),
  notas      text not null default '' check (length(notas) <= 500),
  cancelada  boolean not null default false,
  created_at timestamptz not null default now(),
  constraint clases_fin_tras_inicio check (end_at > start_at)
);
create index if not exists clases_trainer_inicio_idx on public.clases (trainer_id, start_at);

create table if not exists public.clase_plazas (
  clase_id   uuid not null references public.clases(id) on delete cascade,
  client_id  uuid not null references public.clientes(id) on delete cascade,
  estado     text not null default 'reservada' check (estado in ('reservada', 'espera')),
  created_at timestamptz not null default clock_timestamp(),
  primary key (clase_id, client_id)
);
create index if not exists clase_plazas_cliente_idx on public.clase_plazas (client_id);

alter table public.clases enable row level security;
alter table public.clase_plazas enable row level security;
revoke all on public.clases, public.clase_plazas from anon;
grant select, insert, update, delete on public.clases, public.clase_plazas to authenticated;

drop policy if exists clases_entrenador on public.clases;
create policy clases_entrenador on public.clases for all to authenticated
  using (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
  with check (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id));

drop policy if exists clase_plazas_entrenador on public.clase_plazas;
create policy clase_plazas_entrenador on public.clase_plazas for all to authenticated
  using (exists (select 1 from public.clases k where k.id = clase_plazas.clase_id
                 and (k.trainer_id = (select auth.uid()) or public.is_team_member_of(k.trainer_id))))
  with check (exists (select 1 from public.clases k join public.clientes c on c.id = clase_plazas.client_id
                      where k.id = clase_plazas.clase_id and c."trainerId" = k.trainer_id
                        and (k.trainer_id = (select auth.uid()) or public.is_team_member_of(k.trainer_id))));

drop policy if exists clase_plazas_cliente_lee on public.clase_plazas;
create policy clase_plazas_cliente_lee on public.clase_plazas for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = clase_plazas.client_id and c.auth_user_id = (select auth.uid())));

-- ── La espera avanza: llena las plazas libres con los primeros de la lista ──
create or replace function public.promover_espera(p_clase uuid)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare v_libres integer;
begin
  select k.aforo - (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'reservada')
    into v_libres from clases k where k.id = p_clase and not k.cancelada for update;
  if coalesce(v_libres, 0) <= 0 then return; end if;
  update clase_plazas set estado = 'reservada'
   where clase_id = p_clase and client_id in (
     select client_id from clase_plazas where clase_id = p_clase and estado = 'espera' order by created_at limit v_libres);
end;
$$;
revoke all on function public.promover_espera(uuid) from public, anon, authenticated;

-- Al apuntar a alguien con plaza: si ya no queda, a la espera (con la clase bloqueada: dos a la vez no se cuelan).
create or replace function public.clase_plazas_aforo()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
declare v_aforo integer; v_ocupadas integer;
begin
  select aforo into v_aforo from clases where id = new.clase_id for update;
  if new.estado = 'reservada' then
    select count(*) into v_ocupadas from clase_plazas where clase_id = new.clase_id and estado = 'reservada' and client_id <> new.client_id;
    if v_ocupadas >= v_aforo then new.estado := 'espera'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists clase_plazas_aforo on public.clase_plazas;
create trigger clase_plazas_aforo before insert or update of estado on public.clase_plazas
  for each row execute function public.clase_plazas_aforo();

create or replace function public.clase_plazas_libera()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if tg_table_name = 'clase_plazas' then
    if old.estado = 'reservada' then perform promover_espera(old.clase_id); end if;
  elsif new.aforo > old.aforo then
    perform promover_espera(new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists clase_plazas_libera on public.clase_plazas;
create trigger clase_plazas_libera after delete on public.clase_plazas
  for each row execute function public.clase_plazas_libera();
drop trigger if exists clases_sube_aforo on public.clases;
create trigger clases_sube_aforo after update of aforo on public.clases
  for each row execute function public.clase_plazas_libera();

-- ── Lo que usa el cliente ──
-- Sus clases de los próximos días: plazas libres, si va (o en qué puesto de la espera está) y las normas.
create or replace function public.clases_cliente(p_dias integer default 14)
 returns jsonb language sql stable security definer
 set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', k.id, 'titulo', k.titulo, 'start_at', k.start_at, 'end_at', k.end_at, 'notas', k.notas,
    'aforo', k.aforo,
    'ocupadas', (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'reservada'),
    'en_espera', (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'espera'),
    'mi_estado', mp.estado,
    'mi_puesto', case when mp.estado = 'espera' then
      (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'espera' and p.created_at <= mp.created_at) end,
    'cancelar_horas', coalesce(h.cancelar_horas, 0)
  ) order by k.start_at), '[]'::jsonb)
  from clientes c
  join clases k on k.trainer_id = c."trainerId"
  left join horario_citas h on h.trainer_id = k.trainer_id
  left join clase_plazas mp on mp.clase_id = k.id and mp.client_id = c.id
  where c.auth_user_id = auth.uid() and c.archived_at is null
    and not k.cancelada
    and k.start_at > now()
    and k.start_at < now() + make_interval(days => least(greatest(coalesce(p_dias, 14), 1), 90))
    and (mp.estado is not null or k.start_at <= now() + make_interval(days => coalesce(h.dias_vista, 60)));
$$;
revoke all on function public.clases_cliente(integer) from public, anon;
grant execute on function public.clases_cliente(integer) to authenticated;

-- Reservar: 'reservada' si queda plaza, 'espera' si no. Si ya estaba apuntado, devuelve lo que tenía.
create or replace function public.reservar_clase(p_clase uuid)
 returns text language plpgsql security definer
 set search_path to 'public'
as $$
declare v_k clases%rowtype; v_cliente uuid; v_vista integer; v_estado text;
begin
  select * into v_k from clases where id = p_clase;
  select c.id into v_cliente from clientes c
   where c.auth_user_id = auth.uid() and c."trainerId" = v_k.trainer_id and c.archived_at is null limit 1;
  if v_k.id is null or v_cliente is null then raise exception 'no_autorizado' using errcode = '42501'; end if;
  if v_k.cancelada or v_k.start_at <= now() then raise exception 'clase_no_disponible' using errcode = 'P0001'; end if;
  select dias_vista into v_vista from horario_citas where trainer_id = v_k.trainer_id;
  if v_k.start_at > now() + make_interval(days => coalesce(v_vista, 60)) then
    raise exception 'demasiado_lejos' using errcode = 'P0001';
  end if;
  insert into clase_plazas (clase_id, client_id, estado) values (p_clase, v_cliente, 'reservada')
    on conflict (clase_id, client_id) do nothing;
  select estado into v_estado from clase_plazas where clase_id = p_clase and client_id = v_cliente;
  return v_estado;
end;
$$;
revoke all on function public.reservar_clase(uuid) from public, anon;
grant execute on function public.reservar_clase(uuid) to authenticated;

-- Cancelar su plaza (dentro del plazo de su entrenador) o salir de la espera (siempre).
create or replace function public.cancelar_clase(p_clase uuid)
 returns boolean language plpgsql security definer
 set search_path to 'public'
as $$
declare v_p clase_plazas%rowtype; v_k clases%rowtype; v_horas integer;
begin
  select p.* into v_p from clase_plazas p join clientes c on c.id = p.client_id
   where p.clase_id = p_clase and c.auth_user_id = auth.uid() limit 1;
  if v_p.clase_id is null then return false; end if;
  select * into v_k from clases where id = p_clase;
  if v_p.estado = 'reservada' and not v_k.cancelada then
    select cancelar_horas into v_horas from horario_citas where trainer_id = v_k.trainer_id;
    if coalesce(v_horas, 0) > 0 and v_k.start_at - make_interval(hours => v_horas) < now() then
      raise exception 'plazo_cancelacion' using errcode = 'P0001', hint = format('Se puede cancelar hasta %s h antes', v_horas);
    end if;
  end if;
  delete from clase_plazas where clase_id = v_p.clase_id and client_id = v_p.client_id;
  return true;
end;
$$;
revoke all on function public.cancelar_clase(uuid) from public, anon;
grant execute on function public.cancelar_clase(uuid) to authenticated;

-- ── RGPD: las plazas del cliente se exportan y se borran con él ──
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('clase_plazas', 'client_id'),
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
