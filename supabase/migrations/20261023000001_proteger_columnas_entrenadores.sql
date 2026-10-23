-- Bloque 1 de hardening (2026-10-23): un entrenador ya no puede aprobarse a sí mismo,
-- hacerse super admin ni cambiarse de plan. Ver supabase/README.md (hallazgo 1).

create or replace function public.protect_entrenadores_privileged_columns()
 returns trigger language plpgsql
 set search_path to 'public'
as $$
declare
  protegidas constant text[] := array['planName', 'clientLimit', 'tier', 'trialEndsAt'];
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approved := false;
    new.rol := 'trainer';
    new.role := 'trainer';
    new.profile := coalesce(new.profile, '{}'::jsonb) - protegidas;
    return new;
  end if;

  new.uid := old.uid;
  new.email := old.email;
  new.approved := old.approved;
  new.rol := old.rol;
  new.role := old.role;
  new.profile := (coalesce(new.profile, '{}'::jsonb) - protegidas)
    || coalesce((select jsonb_object_agg(e.key, e.value)
                 from jsonb_each(coalesce(old.profile, '{}'::jsonb)) as e(key, value)
                 where e.key = any (protegidas)), '{}'::jsonb);
  return new;
end;
$$;

revoke execute on function public.protect_entrenadores_privileged_columns() from public, anon, authenticated;

drop trigger if exists protect_entrenadores_privileged_columns on public.entrenadores;
create trigger protect_entrenadores_privileged_columns
  before insert or update on public.entrenadores
  for each row execute function public.protect_entrenadores_privileged_columns();
