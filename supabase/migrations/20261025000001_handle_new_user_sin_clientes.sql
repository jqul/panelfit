-- Las cuentas de cliente dejan de crear una fila fantasma en `entrenadores` (2026-10-25).
--
-- handle_new_user() insertaba una fila `entrenadores` (approved=false) para CUALQUIER alta en auth.users,
-- también la de un cliente que se registra con su enlace. Eso dejaba entrenadores "pendientes" que eran
-- clientes (ensuciaba el panel de superadmin y, si el cliente abría la app por la raíz en vez de por su
-- enlace, lo trataba como un entrenador sin aprobar).
--
-- El registro del cliente (ClientRegister) manda `token` en los metadatos del alta; el del entrenador
-- (Auth) no manda ninguno. Se distingue por eso. Prueba: hardening/tests/bloque12_alta_usuarios.sql
-- No toca las filas fantasma que ya existen (son inertes; borrarlas es decisión aparte).

create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  if new.raw_user_meta_data ? 'token' then
    return new; -- cuenta de cliente: no es un entrenador
  end if;

  insert into public.entrenadores (uid, email, "displayName", approved, rol, "createdAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'displayName', split_part(new.email, '@', 1)),
    false,
    'trainer',
    extract(epoch from now()) * 1000
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;
