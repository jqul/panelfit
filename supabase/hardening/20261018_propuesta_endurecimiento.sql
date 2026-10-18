-- PROPUESTA — NO está aplicada en producción y NO es una migración automática
-- (por eso vive en supabase/hardening/ y no en supabase/migrations/).
-- Cada bloque es independiente: aplícalos uno a uno, primero en un branch o
-- entorno de pruebas, y mueve a migrations/ solo lo que se acepte.
-- Detalle de cada hallazgo: supabase/README.md.

-- ═════════════════════════════════════════════════════════
-- 1 · CRÍTICO — Un entrenador puede aprobarse a sí mismo y cambiarse de plan
-- ═════════════════════════════════════════════════════════
-- La política trainer_owns_entrenadores deja a cada usuario hacer UPDATE (e
-- INSERT) de su propia fila sin restringir columnas, así que desde la API
-- puede poner approved=true, rol='super_admin' o profile.clientLimit/planName.
-- Este trigger ignora esos cambios salvo que los haga un super admin o el
-- service role (auth.uid() es NULL en triggers internos y Edge Functions).
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

-- ═════════════════════════════════════════════════════════
-- 2 · ALTO — get_client_by_token devuelve las notas privadas del entrenador
-- ═════════════════════════════════════════════════════════
-- Hoy hace `select *`: cualquiera con el enlace (sin sesión) recibe
-- notas_privadas, lesiones, precio_mensual, alerts y equipo_disponible. La app
-- del cliente no usa ninguna de esas columnas. Se mantiene el tipo de retorno
-- (setof clientes) con esas columnas anuladas, así no hay que tocar el frontend.
create or replace function public.get_client_by_token(p_token text)
 returns setof clientes language sql security definer
 set search_path to 'public'
as $$
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
         c.metricas_cliente, c.plan_last_opened_at, c.main_goal
  from public.clientes c
  where c.token = p_token
  limit 1;
$$;

-- ═════════════════════════════════════════════════════════
-- 3 · MEDIO — Un cliente puede borrar su propia fila de `clientes`
-- ═════════════════════════════════════════════════════════
-- La política es FOR ALL con USING que incluye al cliente; el WITH CHECK solo
-- frena los UPDATE, no los DELETE. Se separa: entrenador/equipo = todo; cliente
-- = solo lectura de su fila.
drop policy if exists trainer_or_client_owns_clientes on public.clientes;

create policy trainer_owns_clientes on public.clientes for all
  using ("trainerId" = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"))
  with check ("trainerId" = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"));

create policy client_reads_own_cliente on public.clientes for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- ═════════════════════════════════════════════════════════
-- 4 · MEDIO — Funciones de trigger y búsqueda por email expuestas como RPC
-- ═════════════════════════════════════════════════════════
-- handle_new_user y notify_welcome_email solo las dispara un trigger (no hace
-- falta EXECUTE para eso). find_trainer_by_email solo la usa EquipoSection con
-- sesión iniciada; sin sesión permitía comprobar qué emails son entrenadores.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_welcome_email() from public, anon, authenticated;
revoke execute on function public.find_trainer_by_email(text) from public, anon;

-- ═════════════════════════════════════════════════════════
-- 5 · MEDIO — Las fotos de progreso no se pueden borrar de Storage
-- ═════════════════════════════════════════════════════════
-- delete_own compara la 2ª carpeta con auth.uid(): vale para videos/<uid>/...
-- pero en fotos/<clientId>/... esa carpeta es el id del cliente, no el uid.
-- Se reutiliza la misma regla que ya tiene el SELECT. Necesario para el
-- derecho de supresión (RGPD).
drop policy if exists delete_own on storage.objects;
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (
    ((storage.foldername(name))[1] = 'videos' and (auth.uid())::text = (storage.foldername(name))[2])
    or ((storage.foldername(name))[1] = 'fotos' and exists (
      select 1 from clientes c
      where c.id::text = (storage.foldername(objects.name))[2]
        and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))));

-- ═════════════════════════════════════════════════════════
-- 6 · OPCIONAL (probar antes) — anon sin permisos sobre las tablas
-- ═════════════════════════════════════════════════════════
-- Supabase da por defecto a `anon` todos los privilegios sobre todas las
-- tablas; hoy solo RLS lo frena. Todo el flujo sin sesión pasa por RPCs
-- (get_client_by_token, get_public_trainer_page, submit_lead...). Quitar los
-- privilegios es defensa en profundidad, pero hay que probar login, registro,
-- enlace de cliente y página pública antes de aplicarlo.
-- revoke all on all tables in schema public from anon;
-- grant select on public.plan_templates to anon;   -- política anyone_reads_public_plan_templates
-- alter default privileges in schema public revoke all on tables from anon;
