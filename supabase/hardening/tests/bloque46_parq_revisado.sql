-- Prueba de migrations/20261122000020_checkins_parq_revisado_solo_entrenador.sql
-- (las revisiones del cuestionario de salud —checkins tipo 'parq_revisado'— solo las escribe el entrenador del cliente; la huella SHA-256 de las fichas y de las
-- revisiones la calcula el servidor y no se puede mandar desde fuera; una revisión queda atada a la versión exacta de la ficha que se leyó).
-- Los vectores fijos de la huella (normalización, reordenaciones, nulos, equivalentes) los comprueba el runner (run-pglite-parq-revisado.mjs) con huella_vectores.json.
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
-- Las fichas de admisión de cada uno (insertadas sin sesión, como lo haría un administrador); la de Ana tiene una señal de alarma
insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'intake', '[{"pregunta":"¿Problema cardíaco?","respuesta":"Sí"},{"pregunta":"¿Mareos?","respuesta":"No"}]', 1000),
  ('a2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'intake', '[{"pregunta":"¿Problema cardíaco?","respuesta":"No"}]', 1000),
  ('ccc00000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'checkin', '[]', 1500);

-- Ejecuta una sentencia como un usuario (su auth.uid) y devuelve 'OK' o 'ERR: ' + mensaje + código
create function pg_temp.como(p_uid text, p_sql text) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return 'OK';
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '', true);
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

-- La sentencia que inserta una revisión de la ficha `adm` (id) del cliente `cid`, con el contenido extra que se quiera colar
create function pg_temp.revision(p_cid text, p_resp text, p_huella text default null) returns text language sql as $f$
  select format($q$insert into public.checkins (id, "clientId", tipo, respuestas, huella, "createdAt") values (gen_random_uuid(), %L, 'parq_revisado', %L::jsonb, %L, 2000)$q$, p_cid, p_resp, p_huella)
$f$;

-- ═══ 0. La huella: SHA-256 en hexadecimal; sin respuestas, el de la cadena vacía ═══
do $$
begin
  perform pg_temp.reg('0a sin respuestas es el SHA-256 de la cadena vacía', public.huella_admision('[]') = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    and public.huella_admision(null) = public.huella_admision('[]') and public.huella_admision('{}') = public.huella_admision('[]'), public.huella_admision('[]'));
  perform pg_temp.reg('0b tiene 64 caracteres hexadecimales en minúscula', public.huella_admision('[{"pregunta":"a","respuesta":"b"}]') ~ '^[0-9a-f]{64}$', '');
  perform pg_temp.reg('0c una ficha de admisión insertada tiene su huella calculada por el servidor (las anteriores a la migración las comprueba el runner)',
    (select huella = public.huella_admision(respuestas) from public.checkins where id = 'a1000000-0000-0000-0000-000000000001'), '');
end $$;

-- ═══ 1. El cliente NO puede dejarse una revisión, pero sí escribir sus otras filas; la huella no la manda él ═══
do $$
declare r text; c1 text := 'bbbbbbbb-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001';
  v_antes text; v_despues text;
begin
  r := pg_temp.como(c1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"}]'));
  perform pg_temp.reg('1a el cliente no puede insertarse una revisión (ni con un id de ficha válido)', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]', r);
  perform pg_temp.reg('1b y no queda ninguna', (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, '');
  -- Su ficha: la huella la pone el servidor aunque el cliente mande otra
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, huella, "createdAt") values ('a1000000-0000-0000-0000-000000000009', %L, 'intake', '[{"pregunta":"p","respuesta":"No"}]', 'forjada', 2)$q$, cid));
  perform pg_temp.reg('1c el cliente sí puede insertar su ficha de admisión, pero su huella la pone el servidor (pisa la que mande)',
    r = 'OK' and (select huella from public.checkins where id = 'a1000000-0000-0000-0000-000000000009') = public.huella_admision('[{"pregunta":"p","respuesta":"No"}]'), r);
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, huella, "createdAt") values (gen_random_uuid(), %L, 'checkin', '[]', 'forjada', 3)$q$, cid));
  perform pg_temp.reg('1d y sus check-ins, sin que una huella mandada se conserve', r = 'OK' and (select count(*) from public.checkins where huella = 'forjada') = 0, r);
  -- Cambiar sus respuestas: la huella se recalcula (y es otra)
  select huella into v_antes from public.checkins where id = 'a1000000-0000-0000-0000-000000000009';
  r := pg_temp.como(c1, $q$update public.checkins set respuestas = '[{"pregunta":"p","respuesta":"Sí"}]', huella = 'forjada' where id = 'a1000000-0000-0000-0000-000000000009'$q$);
  select huella into v_despues from public.checkins where id = 'a1000000-0000-0000-0000-000000000009';
  perform pg_temp.reg('1e puede modificar sus respuestas; la huella se recalcula y no la elige él', r = 'OK' and v_antes <> v_despues and v_despues = public.huella_admision('[{"pregunta":"p","respuesta":"Sí"}]'), r);
  -- Convertir una fila suya a 'parq_revisado' tampoco
  r := pg_temp.como(c1, format($q$update public.checkins set tipo = 'parq_revisado' where id = 'a1000000-0000-0000-0000-000000000009'$q$));
  perform pg_temp.reg('1f no puede convertir una de sus filas en una revisión', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
  delete from public.checkins where id = 'a1000000-0000-0000-0000-000000000009'; -- fuera la ficha de prueba
end $$;

-- ═══ 2. El entrenador del cliente sí; otro entrenador no; y lo que mande de más se descarta ═══
do $$
declare r text; t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; t2 text := 'aaaaaaaa-0000-0000-0000-000000000002'; cid text := 'c1000000-0000-0000-0000-000000000001';
  rev public.checkins;
begin
  r := pg_temp.como(t2, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"}]'));
  perform pg_temp.reg('2a otro entrenador no puede revisar a un cliente que no es suyo', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
  -- Su entrenador, colando una huella y contenido propios: el servidor los reescribe
  r := pg_temp.como(t1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"},{"pregunta":"huella","respuesta":"forjada"},{"pregunta":"x","respuesta":"y"}]', 'forjada'));
  select * into rev from public.checkins where tipo = 'parq_revisado' and "clientId" = cid::uuid;
  perform pg_temp.reg('2b su entrenador sí puede dejar la revisión', r = 'OK' and rev.id is not null, r);
  perform pg_temp.reg('2c la huella de la revisión es la SHA-256 de la ficha indicada, calculada por el servidor (no la que mandó)',
    rev.huella = public.huella_admision((select respuestas from public.checkins where id = 'a1000000-0000-0000-0000-000000000001')) and rev.huella <> 'forjada', coalesce(rev.huella, ''));
  perform pg_temp.reg('2d el contenido de la revisión lo reescribe el servidor: solo el id de la ficha, sin lo que se coló',
    rev.respuestas = '[{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"}]'::jsonb, rev.respuestas::text);
end $$;

-- ═══ 3. Una revisión debe indicar una ficha de admisión DE ESE cliente ═══
do $$
declare r text; t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001'; antes int;
begin
  select count(*) into antes from public.checkins where tipo = 'parq_revisado';
  r := pg_temp.como(t1, pg_temp.revision(cid, '[]'));
  perform pg_temp.reg('3a sin indicar ficha, error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  r := pg_temp.como(t1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"no-es-un-uuid"}]'));
  perform pg_temp.reg('3b con un id que no es un uuid, error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  r := pg_temp.como(t1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"99999999-0000-0000-0000-000000000009"}]'));
  perform pg_temp.reg('3c con una ficha que no existe, error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  r := pg_temp.como(t1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"a2000000-0000-0000-0000-000000000002"}]'));
  perform pg_temp.reg('3d con la ficha de OTRO cliente, error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  r := pg_temp.como(t1, pg_temp.revision(cid, '[{"pregunta":"admision","respuesta":"ccc00000-0000-0000-0000-000000000003"}]'));
  perform pg_temp.reg('3e con una fila que no es una ficha de admisión (un check-in), error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  r := pg_temp.como(t1, pg_temp.revision(cid, '{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"}'));
  perform pg_temp.reg('3f un contenido que no es una lista de respuestas, error', r like 'ERR: La revisión debe indicar una ficha de admisión de este cliente%[23514]', r);
  perform pg_temp.reg('3g tras todos esos rechazos no se ha guardado nada', (select count(*) from public.checkins where tipo = 'parq_revisado') = antes, '');
end $$;

-- ═══ 4. La revisión queda atada a la versión exacta: si la ficha cambia, deja de coincidir ═══
do $$
declare r text; c1 text := 'bbbbbbbb-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001';
  coincide text := $q$select exists (select 1 from public.checkins rv join public.checkins i on i."clientId" = rv."clientId" and i.tipo = 'intake'
      where rv.tipo = 'parq_revisado' and rv."clientId" = 'c1000000-0000-0000-0000-000000000001' and rv.huella is not null and rv.huella = i.huella and i.id = 'a1000000-0000-0000-0000-000000000001')$q$;
  v boolean;
begin
  execute coincide into v;
  perform pg_temp.reg('4a recién revisada, la huella de la revisión coincide con la de la ficha', v, '');
  -- El cliente cambia UNA respuesta de su ficha
  r := pg_temp.como(c1, $q$update public.checkins set respuestas = '[{"pregunta":"¿Problema cardíaco?","respuesta":"No"},{"pregunta":"¿Mareos?","respuesta":"No"}]' where id = 'a1000000-0000-0000-0000-000000000001'$q$);
  execute coincide into v;
  perform pg_temp.reg('4b el cliente modifica la ficha (ocultando la alerta): la revisión anterior ya NO coincide', r = 'OK' and not v, r);
  -- Y la deja otra vez como estaba: es el mismo contenido que se revisó
  r := pg_temp.como(c1, $q$update public.checkins set respuestas = '[{"pregunta":"¿Problema cardíaco?","respuesta":"Sí"},{"pregunta":"¿Mareos?","respuesta":"No"}]' where id = 'a1000000-0000-0000-0000-000000000001'$q$);
  execute coincide into v;
  perform pg_temp.reg('4c si vuelve a dejar exactamente lo mismo, vuelve a coincidir (la huella depende solo del contenido)', r = 'OK' and v, r);
  -- Reordenar las respuestas no es un cambio de contenido
  r := pg_temp.como(c1, $q$update public.checkins set respuestas = '[{"pregunta":"¿Mareos?","respuesta":"No"},{"pregunta":"¿Problema cardíaco?","respuesta":"Sí"}]' where id = 'a1000000-0000-0000-0000-000000000001'$q$);
  execute coincide into v;
  perform pg_temp.reg('4d reordenar las mismas respuestas no invalida la revisión', r = 'OK' and v, r);
  -- Intercambiar las respuestas entre preguntas SÍ es un cambio
  r := pg_temp.como(c1, $q$update public.checkins set respuestas = '[{"pregunta":"¿Problema cardíaco?","respuesta":"No"},{"pregunta":"¿Mareos?","respuesta":"Sí"}]' where id = 'a1000000-0000-0000-0000-000000000001'$q$);
  execute coincide into v;
  perform pg_temp.reg('4e intercambiar las respuestas entre preguntas sí la invalida', r = 'OK' and not v, r);
  -- Una ficha NUEVA del cliente (otra fila, más reciente) con otro contenido tiene otra huella que la revisada
  insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values ('a1000000-0000-0000-0000-000000000005', cid::uuid, 'intake', '[{"pregunta":"¿Problema cardíaco?","respuesta":"No"}]', 5000);
  perform pg_temp.reg('4f una ficha nueva con otro contenido tiene otra huella que la revisión',
    (select huella from public.checkins where id = 'a1000000-0000-0000-0000-000000000005') is distinct from (select huella from public.checkins where tipo = 'parq_revisado' and "clientId" = cid::uuid limit 1), '');
  delete from public.checkins where id = 'a1000000-0000-0000-0000-000000000005';
end $$;

-- ═══ 5. Una revisión ya hecha: el cliente no la toca; su entrenador sí ═══
do $$
declare r text; t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; c1 text := 'bbbbbbbb-0000-0000-0000-000000000001'; cid text := 'c1000000-0000-0000-0000-000000000001'; h text;
begin
  select huella into h from public.checkins where tipo = 'parq_revisado' and "clientId" = cid::uuid limit 1;
  r := pg_temp.como(c1, format($q$update public.checkins set huella = 'otra' where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('5a el cliente no puede modificar una revisión (ni su huella)', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select huella from public.checkins where tipo = 'parq_revisado' and "clientId" = cid::uuid limit 1) = h, r);
  r := pg_temp.como(c1, format($q$delete from public.checkins where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('5b ni borrarla', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]' and (select count(*) from public.checkins where tipo = 'parq_revisado') = 1, r);
  -- Un upsert que pretenda convertir la revisión en otra cosa (mismo id): también cae
  r := pg_temp.como(c1, format($q$insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") select id, "clientId", 'intake', '[]', 1 from public.checkins where "clientId" = %L and tipo = 'parq_revisado'
       on conflict (id) do update set tipo = 'intake'$q$, cid));
  perform pg_temp.reg('5c un upsert (on conflict do update) que la convierta en otro tipo también cae', r like 'ERR: Solo el entrenador del cliente puede marcar%[42501]'
    and (select count(*) from public.checkins where tipo = 'parq_revisado') = 1, r);
  r := pg_temp.como(t1, format($q$delete from public.checkins where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('5d su entrenador sí puede retirarla', r = 'OK' and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, r);
end $$;

-- ═══ 6. Quién cuenta como «entrenador del cliente» ═══
do $$
begin
  perform pg_temp.reg('6a el entrenador del cliente puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('6b un miembro de su equipo puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('6c un superadmin puede', pg_temp.puede('aaaaaaaa-0000-0000-0000-0000000000ad', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('6d otro entrenador no puede', not pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('6e el propio cliente no puede', not pg_temp.puede('bbbbbbbb-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'), '');
  perform pg_temp.reg('6f un cliente que no existe, nadie salvo un superadmin', not pg_temp.puede('aaaaaaaa-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000009'), '');
end $$;

-- ═══ 7. Sin sesión (service role, SQL de administración) se permite, con las mismas reglas de contenido; las funciones no son llamables desde la web ═══
do $$
declare ok boolean; cid uuid := 'c1000000-0000-0000-0000-000000000001'; r text; rev public.checkins;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.checkins (id, "clientId", tipo, respuestas, huella, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[{"pregunta":"admision","respuesta":"a1000000-0000-0000-0000-000000000001"}]', 'forjada', 6);
  select * into rev from public.checkins where tipo = 'parq_revisado';
  perform pg_temp.reg('7a sin sesión se permite, y la huella también la calcula el servidor', rev.huella = public.huella_admision((select respuestas from public.checkins where id = 'a1000000-0000-0000-0000-000000000001')), '');
  begin
    insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[]', 7); ok := false;
  exception when check_violation then ok := true; end;
  perform pg_temp.reg('7b sin sesión, pero sin indicar la ficha, error: ninguna revisión se escribe sin vínculo a una ficha', ok, '');
  delete from public.checkins where tipo = 'parq_revisado';
  set local role authenticated;
  begin perform public.checkins_puede_revisar(cid); ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.reg('7c la función de apoyo no se puede llamar desde la web', ok, '');
  set local role authenticated;
  begin perform public.huella_admision('[]'); ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.reg('7d tampoco la que calcula la huella: nadie desde la web la elige', ok, '');
  set local role anon;
  begin insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[]', 7); ok := false; exception when others then ok := true; end;
  reset role;
  perform pg_temp.reg('7e anon no puede escribir una revisión', ok and (select count(*) from public.checkins where tipo = 'parq_revisado') = 0, '');
end $$;

-- ═══ 8. Borrar al cliente entero (cascada de la clave ajena) no choca con el trigger, pero solo lo puede hacer quien ya podía borrar al cliente ═══
do $$
declare r text; cid uuid := 'c1000000-0000-0000-0000-0000000000c3';
begin
  insert into auth.users (id, email) values ('bbbbbbbb-0000-0000-0000-000000000003', 'c3@test.local');
  insert into public.clientes (id, "trainerId", name, token, auth_user_id) values (cid, 'aaaaaaaa-0000-0000-0000-000000000001', 'Carla', 'tok-3', 'bbbbbbbb-0000-0000-0000-000000000003');
  insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values ('a3000000-0000-0000-0000-000000000003', cid, 'intake', '[{"pregunta":"¿Mareos?","respuesta":"Sí"}]', 1);
  insert into public.checkins (id, "clientId", tipo, respuestas, "createdAt") values (gen_random_uuid(), cid, 'parq_revisado', '[{"pregunta":"admision","respuesta":"a3000000-0000-0000-0000-000000000003"}]', 2);

  r := pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002', format($q$delete from public.clientes where id = %L$q$, cid));
  perform pg_temp.reg('8a otro entrenador no puede borrar al cliente (la RLS lo deja en 0 filas) y la revisión sigue ahí',
    (select count(*) from public.clientes where id = cid) = 1 and (select count(*) from public.checkins where "clientId" = cid and tipo = 'parq_revisado') = 1, r);

  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000003', format($q$delete from public.checkins where "clientId" = %L and tipo = 'parq_revisado'$q$, cid));
  perform pg_temp.reg('8b el propio cliente sigue sin poder borrar su revisión mientras su ficha existe', r like 'ERR%' and (select count(*) from public.checkins where "clientId" = cid and tipo = 'parq_revisado') = 1, r);

  r := pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001', format($q$delete from public.clientes where id = %L$q$, cid));
  perform pg_temp.reg('8c el entrenador borra al cliente con su ficha y su revisión: la cascada no choca con el trigger',
    r = 'OK' and (select count(*) from public.clientes where id = cid) = 0 and (select count(*) from public.checkins where "clientId" = cid) = 0, r);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
