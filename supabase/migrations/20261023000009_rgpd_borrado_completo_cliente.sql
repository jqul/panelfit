-- Bloque 11 (RGPD, 2026-10-23): borrado completo de un cliente (filas, cuenta de acceso y constancia).

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
