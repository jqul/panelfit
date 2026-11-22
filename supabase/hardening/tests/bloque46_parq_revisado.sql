-- Prueba de migrations/20261122000020_checkins_parq_revisado_solo_entrenador.sql
-- (las filas de `checkins` con tipo 'parq_revisado' solo las escribe el entrenador del cliente: el cliente, que sí puede escribir en sus otras filas de
-- `checkins`, no puede insertarse una revisión, ni cambiar una fila a ese tipo, ni modificar o borrar una revisión).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.reg(p_caso text, p_ok boolean, p_detalle text default '') returns void language sql as
  $f$ insert into resultados values (p_caso, coalesce(p_ok, false), p_detalle) $f$;
grant execute on function pg_temp.reg(text, boolean, text) to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'eq@test.local', 'Equipo de 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-0000000000ad', 'sa@test.local', 'Superadmin', true, 'super_admin', 'trainer');
insert into public.team_members (owner_id, member_uid, role, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'coach', 1);
insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'c1@test.local'), ('bbbbbbbb-0000-0000-0000-000000000002', 'c2@test.local');
-- c1 es del entrenador 1; c2, del entrenador 2
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'bbbbbbbb-0000-0000-0000-000000000001'),
  ('c2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Beto', 'tok-2', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Ejecuta una sentencia como un usuario (su auth.uid) y devuelve 'OK' o 'ERR: ' + mensaje + código
create function pg_temp.como(p_uid text, p_sql text) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'OK';
exception when others then
  reset role;
  return 'ERR: ' || sqlerrm || ' [' || sqlstate || ']';
end $f$;
grant execute on function pg_temp.como(text, text) to public;

-- ¿Puede este usuario revisar este cliente? (la función de apoyo, llamada como lo haría el trigger: ejecutada por el dueño pero con la sesión del usuario)
create function pg_temp.puede(p_uid text, p_cliente uuid) returns boolean language plpgsql as $f$
declare r boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  r := public.checkins_puede_revisar(p_cliente);
  perform set_config('request.jwt.claims', '', true);
  return r;
end $f$;

-- ═══ 1. El cliente NO puede dejarse una revisión, pero sí escribir sus otras filas ═══
do $$
declare r text; c1 text := 'bbbbbbbb-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001';
begin
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), %L, 'parq_revisado', '[{"pregunta":"huella","respuesta":"x"}]', 1)$q$, cid));
  perform pg_temp.reg('1a el cliente no puede insertarse una revisión', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]', r);
  perform pg_temp.reg('1b y no queda ninguna', (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, '');
  -- Lo demás de su ficha sigue funcionando como antes
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), %L, 'intake', '[{"pregunta":"p","respuesta":"No"}]', 2)$q$, cid));
  perform pg_temp.reg('1c el cliente sí puede insertar su ficha de admisión', r = 'OK', r);
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), %L, 'checkin', '[]', 3)$q$, cid));
  perform pg_temp.reg('1d y sus check-ins', r = 'OK', r);
  r := pg_temp.como(c1, format($q$update public.checkins set respuestas = '[{"pregunta":"p","respuesta":"Sí"}]' where "clientId" = %L and tipo = 'intake'$q$, cid));
  perform pg_temp.reg('1e y modificar sus respuestas (la revisión atada a su contenido dejará de valer, pero eso es de la app)', r = 'OK'
    and (select count(*) from public.checkins where tipo = 'intake' and respuestas::text like '%Sí%') = 1, r);
  -- Convertir una fila suya a 'parq_revisado' tampoco
  r := pg_temp.como(c1, format($q$update public.checkins set tipo = 'parq_revisado' where "clientId" = %L and tipo = 'intake'$q$, cid));
  perform pg_temp.reg('1f no puede convertir una de sus filas en una revisión', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
end $$;

-- ═══ 2. El entrenador del cliente sí; otro entrenador no ═══
do $$
declare r text; t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; t2 text := 'aaaaaaaa-0000-0000-0000-000000000002'; cid text := 'c1000000-0000-0000-0000-000000000001';
begin
  r := pg_temp.como(t2, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), %L, 'parq_revisado', '[{"pregunta":"huella","respuesta":"x"}]', 4)$q$, cid));
  perform pg_temp.reg('2a otro entrenador no puede revisar a un cliente que no es suyo', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
  r := pg_temp.como(t1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), %L, 'parq_revisado', '[{"pregunta":"huella","respuesta":"abc"}]', 5)$q$, cid));
  perform pg_temp.reg('2b su entrenador sí puede dejar la revisión', r = 'OK' and (select count(*) from public.checkins where tipo = 'parq_revisado' and "clientId" = cid::uuid) = 1, r);
end $$;

-- ═══ 3. Una revisión ya hecha: el cliente no la toca; su entrenador sí ═══
do $$
declare r text; t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; c1 text := 'bbbbbbbb-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001';
begin
  r := pg_temp.como(c1, format($q$update public.checkins set respuestas = '[{"pregunta":"huella","respuesta":"otra"}]' where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('3a el cliente no puede modificar una revisión', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select respuestas::text like '%abc%' from public.checkins where tipo = 'parq_revisado'), r);
  r := pg_temp.como(c1, format($q$delete from public.checkins where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('3b ni borrarla', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]' and (select count(*) from public.checkins where tipo = 'parq_revisado') = 1, r);
  r := pg_temp.como(t1, format($q$delete from public.checkins where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('3c su entrenador sí puede retirarla', r = 'OK' and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
end $$;

-- ═══ 4. Quién cuenta como «entrenador del cliente» ═══
do $$
begin
  perform pg_temp.reg('4a el entrenador del cliente puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('4b un miembro de su equipo puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('4c un superadmin puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-0000000000ad', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('4d otro entrenador no puede', not pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('4e el propio cliente no puede', not pg_temp.puede('bbbbbbbb-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('4f un cliente que no existe, nadie salvo un superadmin', not pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000009'), '');
end $$;

-- ═══ 5. Sin sesión (service role, SQL de administración) se permite; la función de apoyo no se puede llamar desde la web ═══
do $$
declare ok boolean; cid uuid := 'c1000000-0000-0000-0000-000000000001';
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[{"pregunta":"huella","respuesta":"srv"}]', 6);
  perform pg_temp.reg('5a sin sesión (service role / administración) se permite', (select count(*) from public.checkins where tipo = 'parq_revisado') = 1, '');
  delete from public.checkins where tipo = 'parq_revisado';
  set local role authenticated;
  begin perform public.checkins_puede_revisar(cid); ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.reg('5b la función de apoyo no se puede llamar desde la web', ok, '');
  set local role anon;
  begin insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[]', 7); ok := false; exception when others then ok := true; end;
  reset role;
  perform pg_temp.reg('5c anon no puede escribir una revisión', ok and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
