-- PROPUESTA — NO está aplicada en producción (RGPD, art. 9 / 15 / 17 / 20).
-- Igual que 20261018_propuesta_endurecimiento.sql: se aplica por bloques y lo
-- aceptado se mueve a migrations/. Pruebas locales: tests/run-pglite-rgpd.mjs.
-- Detalle legal y de producto: docs/rgpd.md.

-- ═════════════════════════════════════════════════════════
-- 9 · Consentimiento explícito para datos de salud y fotos (art. 9.2.a)
-- ═════════════════════════════════════════════════════════
-- Hoy solo existe `waivers` (descargo de responsabilidad), que no es un
-- consentimiento al tratamiento de datos de salud. Esta tabla es un historial
-- de solo añadir: aceptar, ampliar (fotos) o retirar es una fila nueva; la
-- última manda. No hay UPDATE ni DELETE para el cliente a propósito (prueba de
-- que se consintió); al borrar al cliente se borra en cascada.
create table if not exists public.consentimientos (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  version text not null,
  salud boolean not null,
  fotos boolean not null default false,
  accepted_at timestamptz not null default now(),
  constraint consentimientos_pkey primary key (id),
  constraint "consentimientos_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);
create index if not exists idx_consentimientos_client on public.consentimientos ("clientId", accepted_at desc);
alter table public.consentimientos enable row level security;

create policy client_inserts_own_consent on public.consentimientos for insert to authenticated
  with check (exists (select 1 from public.clientes c
    where c.id = consentimientos."clientId" and c.auth_user_id = (select auth.uid())));

create policy client_or_trainer_reads_consent on public.consentimientos for select to authenticated
  using (exists (select 1 from public.clientes c
    where c.id = consentimientos."clientId"
      and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid())
           or is_super_admin() or is_team_member_of(c."trainerId"))));

-- ═════════════════════════════════════════════════════════
-- 10 · Exportar todos los datos de un cliente (art. 15 y 20)
-- ═════════════════════════════════════════════════════════
-- Lista única de tablas con datos de un cliente. Varias guardan el id como
-- text sin clave foránea, por eso el borrado y la exportación son explícitos.
-- Si se añade una tabla con datos de cliente hay que añadirla aquí: el test
-- tests/bloque9_11_rgpd.sql falla si falta alguna.
create or replace function public.client_data_tables()
 returns table(tbl text, col text) language sql immutable
 set search_path to 'public'
as $$
  values
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$$;

create or replace function public.can_manage_client(p_client_id uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from public.clientes c
    where c.id = p_client_id
      and (c."trainerId" = auth.uid() or public.is_super_admin() or public.is_team_member_of(c."trainerId")));
$$;

-- Lo puede pedir el propio cliente (sin las notas privadas, alertas y etiquetas
-- del entrenador) o su entrenador / equipo / super admin (completo).
create or replace function public.export_client_data(p_client_id uuid)
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  r record;
  v jsonb;
  v_row jsonb;
  v_out jsonb;
  v_manager boolean := public.can_manage_client(p_client_id);
  v_self boolean := auth.uid() is not null and exists (
    select 1 from public.clientes c where c.id = p_client_id and c.auth_user_id = auth.uid());
begin
  if not (v_manager or v_self) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select to_jsonb(c) into v_row from public.clientes c where c.id = p_client_id;
  if v_row is null then raise exception 'Cliente no encontrado'; end if;
  if not v_manager then v_row := v_row - 'notas_privadas' - 'alerts' - 'label_ids'; end if;
  v_out := jsonb_build_object('clientes', v_row);

  for r in select * from public.client_data_tables() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where t.%I::text = $1', r.tbl, r.col)
      into v using p_client_id::text;
    v_out := v_out || jsonb_build_object(r.tbl, v);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.accepted_at), '[]'::jsonb) into v
    from public.consentimientos t where t."clientId" = p_client_id;
  return v_out || jsonb_build_object('consentimientos', v, 'exportado_en', now());
end;
$$;

revoke execute on function public.export_client_data(uuid), public.can_manage_client(uuid) from public, anon;
grant execute on function public.export_client_data(uuid), public.can_manage_client(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════
-- 11 · Borrado completo de un cliente (art. 17)
-- ═════════════════════════════════════════════════════════
-- Hoy `deleteClient` solo hace DELETE de la fila de `clientes`: dejan huérfanos
-- sus datos en las tablas con id como text, sus ficheros de Storage y su
-- cuenta de acceso. Esta función borra todas las filas y la cuenta de acceso
-- (si no es también cuenta de entrenador ni de otro cliente). Los ficheros de
-- Storage los borra el front por la API antes de llamarla (Supabase impide
-- borrarlos por SQL). Deja constancia sin datos personales en registro_borrados.
create table if not exists public.registro_borrados (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  trainer_id uuid,
  deleted_at timestamptz not null default now(),
  filas jsonb not null default '{}',
  constraint registro_borrados_pkey primary key (id)
);
alter table public.registro_borrados enable row level security;
create policy trainer_reads_registro_borrados on public.registro_borrados for select to authenticated
  using (trainer_id = (select auth.uid()) or is_super_admin() or is_team_member_of(trainer_id));

create or replace function public.delete_client_data(p_client_id uuid)
 returns jsonb language plpgsql security definer
 set search_path to 'public'
as $$
declare
  r record;
  n int;
  v_counts jsonb := '{}';
  v_auth uuid;
  v_trainer uuid;
begin
  if not public.can_manage_client(p_client_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select auth_user_id, "trainerId" into v_auth, v_trainer from public.clientes where id = p_client_id;

  for r in select * from public.client_data_tables() loop
    execute format('delete from public.%I t where t.%I::text = $1', r.tbl, r.col) using p_client_id::text;
    get diagnostics n = row_count;
    if n > 0 then v_counts := v_counts || jsonb_build_object(r.tbl, n); end if;
  end loop;

  delete from public.clientes where id = p_client_id; -- consentimientos cae en cascada
  v_counts := v_counts || jsonb_build_object('clientes', 1);

  -- Cuenta de acceso del cliente. handle_new_user crea una fila "entrenador
  -- pendiente" para cualquier alta, también las de clientes, así que esa fila
  -- fantasma se borra con la cuenta. Se conserva si la persona es además un
  -- entrenador de verdad (aprobado, super admin o con clientes) o cliente de otro.
  if v_auth is not null
     and not exists (select 1 from public.entrenadores where uid = v_auth and (approved or rol = 'super_admin'))
     and not exists (select 1 from public.clientes where "trainerId" = v_auth)
     and not exists (select 1 from public.clientes where auth_user_id = v_auth) then
    delete from public.entrenadores where uid = v_auth;
    delete from auth.users where id = v_auth;
    v_counts := v_counts || jsonb_build_object('cuenta_acceso', 1);
  end if;

  insert into public.registro_borrados (client_id, trainer_id, filas) values (p_client_id, v_trainer, v_counts);
  return v_counts;
end;
$$;

revoke execute on function public.delete_client_data(uuid) from public, anon;
grant execute on function public.delete_client_data(uuid) to authenticated;
