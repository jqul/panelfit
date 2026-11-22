-- Prueba de migrations/20261122000010_cliente_datos_basicos.sql
-- (el cliente guarda en SU ficha género, nacimiento, altura y peso, y su primer pesaje: solo rellena lo vacío, valida lo que recibe,
-- no pisa lo del entrenador, es idempotente y no la puede usar anon, nadie sin sesión ni un cliente archivado).
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
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'c1@test.local'), ('bbbbbbbb-0000-0000-0000-000000000002', 'c2@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'c3@test.local'), ('bbbbbbbb-0000-0000-0000-000000000004', 'c4@test.local'),
  ('bbbbbbbb-0000-0000-0000-0000000000ff', 'otra@test.local');
-- c1: recién creado solo con nombre (y teléfono); c2: con altura y género que puso el entrenador; c3: archivado; c4: de otra persona
insert into public.clientes (id, "trainerId", name, token, phone, auth_user_id, altura, genero, weight, archived_at) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', '600111222', 'bbbbbbbb-0000-0000-0000-000000000001', null, null, null, null),
  ('c2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Beto', 'tok-2', '600333444', 'bbbbbbbb-0000-0000-0000-000000000002', 180, 'h', 82, null),
  ('c3000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cleo', 'tok-3', null, 'bbbbbbbb-0000-0000-0000-000000000003', null, null, null, 1700000000000),
  ('c4000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dani', 'tok-4', null, 'bbbbbbbb-0000-0000-0000-000000000004', null, null, null, null);
update public.clientes set fechanacimiento = '1990-05-05' where id = 'c2000000-0000-0000-0000-000000000002';

-- Llama a la función como un cliente (su auth.uid) y devuelve el resultado o 'ERR: ' + mensaje
create function pg_temp.como(p_uid text, p_genero text, p_nac date, p_altura numeric, p_peso numeric) returns text language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claims', case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  set local role authenticated;
  v := public.cliente_guardar_datos_basicos(p_genero, p_nac, p_altura, p_peso);
  reset role;
  return v::text;
exception when others then
  reset role;
  return 'ERR: ' || sqlerrm || ' [' || sqlstate || ']';
end $f$;
grant execute on function pg_temp.como(text, text, date, numeric, numeric) to public;

-- ═══ 1. Un cliente recién creado: se rellena su ficha y su primer pesaje ═══
do $$
declare r text; c record; hoy text := to_char((now() at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD');
begin
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000001', 'm', '1995-03-10', 168.5, 64.2);
  select * into c from public.clientes where id = 'c1000000-0000-0000-0000-000000000001';
  perform pg_temp.reg('1a guarda género, nacimiento, altura y peso en su ficha', c.genero = 'm' and c.fechanacimiento = '1995-03-10' and c.altura = 168.5 and c.weight = 64.2, r);
  perform pg_temp.reg('1b devuelve lo que quedó guardado', r::jsonb ->> 'fechanacimiento' = '1995-03-10' and (r::jsonb ->> 'altura')::numeric = 168.5, r);
  perform pg_temp.reg('1c el peso es también su primer pesaje, de hoy',
    (select count(*) from public.registros_peso where "clientId" = c.id and date = hoy and weight = 64.2) = 1, '');
  perform pg_temp.reg('1d no toca el resto de su ficha', c.name = 'Ana' and c.phone = '600111222' and c.token = 'tok-1', '');
  -- Idempotente
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000001', 'm', '1995-03-10', 168.5, 64.2);
  perform pg_temp.reg('1e llamarla otra vez no duplica el pesaje del día', (select count(*) from public.registros_peso where "clientId" = c.id) = 1, r);
  -- El género es opcional
  update public.clientes set genero = null, altura = null, weight = null, fechanacimiento = null where id = c.id;
  delete from public.registros_peso where "clientId" = c.id;
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000001', null, '1995-03-10', 170, 65);
  perform pg_temp.reg('1f sin género (prefiere no decirlo) se guarda lo demás', (select genero is null and altura = 170 and weight = 65 from public.clientes where id = c.id), r);
end $$;

-- ═══ 2. No pisa lo que el entrenador ya puso ═══
do $$
declare r text; c record;
begin
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000002', 'm', '1999-09-09', 175, 70);
  select * into c from public.clientes where id = 'c2000000-0000-0000-0000-000000000002';
  perform pg_temp.reg('2a lo que ya tenía (altura 180, género h, nacimiento, peso 82) se respeta', c.altura = 180 and c.genero = 'h' and c.fechanacimiento = '1990-05-05' and c.weight = 82, r);
  perform pg_temp.reg('2b y lo que devuelve es lo que hay en la ficha', (r::jsonb ->> 'altura')::numeric = 180 and r::jsonb ->> 'genero' = 'h', r);
  perform pg_temp.reg('2c su pesaje de hoy sí queda con lo que dijo (70)', (select weight from public.registros_peso where "clientId" = c.id) = 70, '');
end $$;

-- ═══ 3. Valores sin sentido: se rechazan y no se guarda nada ═══
do $$
declare uid text := 'bbbbbbbb-0000-0000-0000-000000000004'; antes bigint; r text;
begin
  select count(*) into antes from public.registros_peso;
  perform pg_temp.reg('3a altura demasiado baja', pg_temp.como(uid, 'h', '1990-01-01', 20, 70) like 'ERR: La altura no es válida%', '');
  perform pg_temp.reg('3b altura demasiado alta', pg_temp.como(uid, 'h', '1990-01-01', 300, 70) like 'ERR: La altura no es válida%', '');
  perform pg_temp.reg('3c peso demasiado bajo', pg_temp.como(uid, 'h', '1990-01-01', 170, 5) like 'ERR: El peso no es válido%', '');
  perform pg_temp.reg('3d peso demasiado alto', pg_temp.como(uid, 'h', '1990-01-01', 170, 500) like 'ERR: El peso no es válido%', '');
  perform pg_temp.reg('3e nacimiento en el futuro', pg_temp.como(uid, 'h', (now() + interval '1 year')::date, 170, 70) like 'ERR: La fecha de nacimiento no es válida%', '');
  perform pg_temp.reg('3f menor de 10 años', pg_temp.como(uid, 'h', (now() - interval '5 years')::date, 170, 70) like 'ERR: La fecha de nacimiento no es válida%', '');
  perform pg_temp.reg('3g más de 100 años', pg_temp.como(uid, 'h', '1800-01-01', 170, 70) like 'ERR: La fecha de nacimiento no es válida%', '');
  perform pg_temp.reg('3h sin fecha de nacimiento', pg_temp.como(uid, 'h', null, 170, 70) like 'ERR: La fecha de nacimiento no es válida%', '');
  perform pg_temp.reg('3i género desconocido', pg_temp.como(uid, 'x', '1990-01-01', 170, 70) like 'ERR: El género no es válido%', '');
  perform pg_temp.reg('3j sin altura o sin peso', pg_temp.como(uid, 'h', '1990-01-01', null, 70) like 'ERR: La altura%' and pg_temp.como(uid, 'h', '1990-01-01', 170, null) like 'ERR: El peso%', '');
  perform pg_temp.reg('3k tras los rechazos no queda nada guardado', (select altura is null and weight is null and genero is null and fechanacimiento is null from public.clientes where auth_user_id = uid::uuid)
    and (select count(*) from public.registros_peso) = antes, '');
end $$;

-- ═══ 4. Quién puede usarla ═══
do $$
declare ok boolean; r text;
begin
  perform pg_temp.reg('4a sin sesión (sin auth.uid) no puede', pg_temp.como(null, 'h', '1990-01-01', 170, 70) like 'ERR: No autorizado%', '');
  perform pg_temp.reg('4b una cuenta que no es de ningún cliente no puede', pg_temp.como('bbbbbbbb-0000-0000-0000-0000000000ff', 'h', '1990-01-01', 170, 70) like 'ERR: No autorizado%', '');
  perform pg_temp.reg('4c un cliente archivado no puede', pg_temp.como('bbbbbbbb-0000-0000-0000-000000000003', 'h', '1990-01-01', 170, 70) like 'ERR: No autorizado%'
    and (select altura is null and weight is null from public.clientes where name = 'Cleo'), '');
  set local role anon;
  begin perform public.cliente_guardar_datos_basicos('h', '1990-01-01', 170, 70); ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.reg('4d anon no tiene permiso para llamarla', ok, '');
  -- Cada cliente solo toca SU fila
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000004', 'h', '1988-08-08', 181, 85);
  perform pg_temp.reg('4e un cliente escribe en su fila y en ninguna otra',
    (select count(*) from public.clientes where altura = 181) = 1 and (select name from public.clientes where altura = 181) = 'Dani', r);
end $$;

-- ═══ 5. Un pesaje que ya existe ese día NUNCA se modifica al registrarse ═══
do $$
declare r text; cid uuid := 'c5000000-0000-0000-0000-000000000005'; hoy text := to_char((now() at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD'); w double precision;
begin
  insert into auth.users (id, email) values ('bbbbbbbb-0000-0000-0000-000000000005', 'c5@test.local');
  insert into public.clientes (id, "trainerId", name, token, auth_user_id) values (cid, 'aaaaaaaa-0000-0000-0000-000000000001', 'Eva', 'tok-5', 'bbbbbbbb-0000-0000-0000-000000000005');
  -- El entrenador ya la pesó hoy: 99.9
  insert into public.registros_peso ("clientId", weight, date) values (cid, 99.9, hoy);
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000005', 'm', '1992-02-02', 170, 65);
  select weight into w from public.registros_peso where "clientId" = cid and date = hoy;
  perform pg_temp.reg('5a registrarse el mismo día NO modifica el pesaje que ya existe', w = 99.9 and (select count(*) from public.registros_peso where "clientId" = cid) = 1, r || ' / ' || w);
  -- Y repetirlo tampoco
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000005', 'm', '1992-02-02', 170, 60);
  select weight into w from public.registros_peso where "clientId" = cid and date = hoy;
  perform pg_temp.reg('5b volver a llamarla con otro peso tampoco lo toca ni añade otro', w = 99.9 and (select count(*) from public.registros_peso where "clientId" = cid) = 1, r || ' / ' || w);
  -- Un pesaje de OTRO día tampoco se toca
  insert into public.registros_peso ("clientId", weight, date) values (cid, 70.5, to_char((now() at time zone 'Europe/Madrid')::date - 3, 'YYYY-MM-DD'));
  r := pg_temp.como('bbbbbbbb-0000-0000-0000-000000000005', 'm', '1992-02-02', 170, 61);
  perform pg_temp.reg('5c los pesajes de otros días quedan igual', (select weight from public.registros_peso where "clientId" = cid and date <> hoy) = 70.5, '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
