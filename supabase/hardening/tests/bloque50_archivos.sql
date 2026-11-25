-- Prueba de migrations/20261125000010_archivos_cuestionario.sql (archivos en los cuestionarios).
-- Qué demuestra:
--   · permisos: un cliente no ve, no descarga, no sube ni cita archivos de otro; el entrenador solo ve los de sus clientes (y nada sin verificar); otro entrenador, un compañero de
--     equipo (con y sin «solo asignados»), el super admin y anon no ven nada;
--   · reserva: formatos, tamaños, tope por pregunta (5) y por cliente (25), cliente archivado, pregunta que no es de archivos o de otro entrenador;
--   · subida: solo sobre una ruta reservada, sin sobrescribir ni borrar lo ya subido;
--   · respuesta: el trigger rechaza archivos ajenos, sin verificar, de otra pregunta/plantilla, repetidos o de más, y reescribe nombre, tamaño y tipo; vincula y desvincula;
--   · retención con reloj simulado (24 h, 30 días, 12 meses con aviso de 30 días), reintento, huérfanos y que nadie sin clave de servicio puede llamarlas;
--   · RGPD: borrado y exportación.
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración (sin su línea de cron.schedule: PGlite no tiene cron) y con un esquema `storage` simulado (run-pglite-archivos.mjs).
-- Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

create schema if not exists net;
create table public.llamadas_http (url text, headers jsonb, body jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
 returns bigint language plpgsql as $f$
begin
  insert into public.llamadas_http values (url, headers, body);
  return 1;
end $f$;

create function public.t_chk(caso text, cond boolean, det text default '') returns void language sql as $$ insert into resultados values (caso, coalesce(cond, false), det) $$;
-- Ejecuta una sentencia con el rol actual y devuelve 'ok' o el código del error
create function public.t_prueba(q text) returns text language plpgsql as $$ begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function public.t_chk(text, boolean, text), public.t_prueba(text) to public;

-- Las tablas de client_data_tables() que esta prueba no necesita pero que delete_client_data recorre
do $$ declare r record; begin
  for r in select * from public.client_data_tables() loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then execute format('create table public.%I (%I text)', r.tbl, r.col); end if;
  end loop;
end $$;

-- ── Datos ──
alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'm1@test.local', 'Compañero', true, 'trainer', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'm2@test.local', 'Compañero solo asignados', true, 'trainer', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'sa@test.local', 'Super admin', true, 'super_admin', 'trainer');
insert into public.team_members (owner_id, member_uid, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 1);
update public.team_members set solo_asignados = true where member_uid = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-00000000000a', 'a@test.local'), ('cccccccc-0000-0000-0000-00000000000b', 'b@test.local'),
  ('cccccccc-0000-0000-0000-00000000000c', 'c@test.local'), ('cccccccc-0000-0000-0000-00000000000d', 'd@test.local');
insert into public.clientes (id, "trainerId", name, surname, token, auth_user_id) values
  ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'A', 'tok-a', 'cccccccc-0000-0000-0000-00000000000a'),
  ('11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'Beto', 'B', 'tok-b', 'cccccccc-0000-0000-0000-00000000000b'),
  ('11111111-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000002', 'Carla', 'C', 'tok-c', 'cccccccc-0000-0000-0000-00000000000c'),
  ('11111111-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dani', 'D', 'tok-d', 'cccccccc-0000-0000-0000-00000000000d');
update public.clientes set profesional_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = '11111111-0000-0000-0000-00000000000a';
insert into public.survey_templates (id, trainer_id, name, questions) values
  ('tplA', 'aaaaaaaa-0000-0000-0000-000000000001', 'Programación', '[{"id":"rutina","type":"archivos","label":"Sube tu rutina"},{"id":"otra","type":"archivos","label":"Otra"},{"id":"texto","type":"short","label":"Texto"}]'),
  ('tplB', 'aaaaaaaa-0000-0000-0000-000000000002', 'De otro entrenador', '[{"id":"rutina","type":"archivos","label":"Sube tu rutina"}]'),
  ('tplMany', 'aaaaaaaa-0000-0000-0000-000000000001', 'Muchas', '[{"id":"q1","type":"archivos"},{"id":"q2","type":"archivos"},{"id":"q3","type":"archivos"},{"id":"q4","type":"archivos"},{"id":"q5","type":"archivos"},{"id":"q6","type":"archivos"}]'),
  ('tplSin', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sin archivos', '[{"id":"x","type":"short"}]');

-- ═══ Reserva (como el cliente A) ═══
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
create temp table res as select public.archivo_reservar('tplA', 'rutina', 'Mi rutina.PDF', 100000) as r;
grant all on res to public;
select public.t_chk('R1 reserva válida: ok, ruta con su carpeta y un uuid (no el nombre), tipo fijado por el servidor',
  (r ->> 'ok')::boolean and r ->> 'ruta' ~ '^11111111-0000-0000-0000-00000000000a/[0-9a-f-]{36}\.pdf$' and r ->> 'tipo' = 'application/pdf' and r ->> 'nombre' = 'Mi rutina.PDF', r::text) from res;
select public.t_chk('R2 el nombre se limpia (sin rutas ni caracteres de control)',
  (public.archivo_reservar('tplA', 'rutina', E'..\\..\\evil‮.pdf', 1000) ->> 'nombre') = 'evil.pdf');
select public.t_chk('R3 formatos no admitidos (.exe, .xlsm, .docx, .zip, .html, sin extensión)',
  (select bool_and((public.archivo_reservar('tplA', 'otra', n, 1000) ->> 'codigo') = 'formato') from unnest(array['virus.exe', 'macros.xlsm', 'a.docx', 'a.zip', 'a.html', 'sin_extension']) n));
select public.t_chk('R4 los formatos admitidos pasan, con su tipo (jpg, png, webp, heic, xlsx, csv)',
  (select bool_and((r.x ->> 'ok')::boolean) from (select public.archivo_reservar('tplMany', 'q6', n, 1000) x from unnest(array['a.jpg', 'a.png', 'a.webp', 'a.heic']) n) r)
  and (public.archivo_reservar('tplA', 'otra', 'a.xlsx', 1000) ->> 'tipo') = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  and (public.archivo_reservar('tplA', 'otra', 'a.csv', 1000) ->> 'tipo') = 'text/csv');
select public.t_chk('R5 tamaño: 0 y 20 MB + 1 se rechazan; 20 MB justos pasa',
  (public.archivo_reservar('tplMany', 'q1', 'a.pdf', 0) ->> 'codigo') = 'tamano' and (public.archivo_reservar('tplMany', 'q1', 'a.pdf', 20971521) ->> 'codigo') = 'tamano'
  and (public.archivo_reservar('tplMany', 'q1', 'a.pdf', 20971520) ->> 'ok')::boolean and (public.archivo_reservar('tplMany', 'q1', 'a.pdf', null) ->> 'codigo') = 'tamano');
select public.t_chk('R6 una pregunta que no es de archivos, que no existe o de la plantilla de OTRO entrenador: no se reserva',
  (public.archivo_reservar('tplA', 'texto', 'a.pdf', 1000) ->> 'codigo') = 'pregunta' and (public.archivo_reservar('tplA', 'no_existe', 'a.pdf', 1000) ->> 'codigo') = 'pregunta'
  and (public.archivo_reservar('tplB', 'rutina', 'a.pdf', 1000) ->> 'codigo') = 'pregunta' and (public.archivo_reservar('tplSin', 'x', 'a.pdf', 1000) ->> 'codigo') = 'pregunta'
  and (public.archivo_reservar('no_hay', 'rutina', 'a.pdf', 1000) ->> 'codigo') = 'pregunta');
select public.t_chk('R7 nombre de más de 120 caracteres: se acorta conservando la extensión',
  (select length(x ->> 'nombre') <= 120 and x ->> 'nombre' like '%.pdf' from (select public.archivo_reservar('tplMany', 'q2', repeat('x', 300) || '.pdf', 1000) x) s));

-- Tope por pregunta: q3 admite 5 y el sexto se rechaza
do $$ declare i int; last jsonb; begin
  for i in 1..5 loop last := public.archivo_reservar('tplMany', 'q3', 'f' || i || '.pdf', 1000); end loop;
  perform public.t_chk('R8 la quinta de una pregunta pasa', (last ->> 'ok')::boolean);
  perform public.t_chk('R9 la sexta se rechaza (límite por pregunta)', (public.archivo_reservar('tplMany', 'q3', 'f6.pdf', 1000) ->> 'codigo') = 'limite_pregunta');
end $$;
-- Tope por cliente: 25 sin enviar entre todas las preguntas
do $$ declare n int; r jsonb; begin
  select count(*) into n from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000a' and estado in ('reservado', 'verificado');
  while n < 25 loop
    r := public.archivo_reservar('tplMany', 'q' || (4 + (n % 2)), 'g' || n || '.pdf', 1000);
    if (r ->> 'ok')::boolean then n := n + 1; else exit; end if;
  end loop;
  perform public.t_chk('R10 llega a 25 sin enviar', n = 25, n::text);
  perform public.t_chk('R11 el 26.º se rechaza aunque su pregunta esté vacía (límite por cliente)', (public.archivo_reservar('tplA', 'otra', 'z.pdf', 1000) ->> 'codigo') = 'limite_cliente');
end $$;

-- Quién más puede (o no) reservar
reset role; set local role anon;
select public.t_chk('R12 anon no puede reservar', public.t_prueba($q$select public.archivo_reservar('tplA', 'rutina', 'a.pdf', 1000)$q$) = '42501');
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.t_chk('R13 un entrenador (que no es cliente) no puede reservar', public.t_prueba($q$select public.archivo_reservar('tplA', 'rutina', 'a.pdf', 1000)$q$) = '42501');
reset role; update public.clientes set archived_at = 1 where id = '11111111-0000-0000-0000-00000000000d'; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select public.t_chk('R14 un cliente archivado no puede reservar', (public.archivo_reservar('tplA', 'rutina', 'a.pdf', 1000) ->> 'codigo') = 'archivado');

-- ═══ Datos para el resto: reservas de B y archivos de A en varios estados (como superusuario) ═══
reset role;
-- los 25 de A de antes sobran: se limpian (con otro id de prueba) para dejar sitio
delete from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000a';
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado, verificado_at) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000001.pdf', 'rutina-a1.pdf', 'pdf', 'application/pdf', 5000, 'verificado', now()),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000002.png', 'captura-a2.png', 'png', 'image/png', 6000, 'verificado', now()),
  ('a0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000a', 'tplA', 'otra', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000003.xlsx', 'otra-a3.xlsx', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 7000, 'verificado', now()),
  ('a0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000004.pdf', 'sin-verificar-a4.pdf', 'pdf', 'application/pdf', 8000, 'reservado', null),
  ('b0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/b0000000-0000-0000-0000-000000000001.pdf', 'rutina-b1.pdf', 'pdf', 'application/pdf', 9000, 'verificado', now()),
  ('b0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/b0000000-0000-0000-0000-000000000002.pdf', 'reservada-b2.pdf', 'pdf', 'application/pdf', 9000, 'reservado', null),
  ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000c', 'tplB', 'rutina', '11111111-0000-0000-0000-00000000000c/c0000000-0000-0000-0000-000000000001.pdf', 'rutina-c1.pdf', 'pdf', 'application/pdf', 9000, 'verificado', now());
-- (el objeto del a4, reservado, no existe todavía: lo sube A en P4)
insert into storage.objects (bucket_id, name) select 'cuestionario-archivos', ruta from public.archivos_cliente where id <> 'a0000000-0000-0000-0000-000000000004';

-- ═══ Quién ve las filas y los objetos ═══
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.t_chk('P1 el cliente A ve solo sus 4 filas', (select count(*) from public.archivos_cliente) = 4 and (select count(*) from public.archivos_cliente where client_id <> '11111111-0000-0000-0000-00000000000a') = 0);
select public.t_chk('P2 A ve (y puede firmar) sus 3 objetos subidos, y ninguno de B ni de C', (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 3
  and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos' and name like '11111111-0000-0000-0000-00000000000b/%') = 0);
select public.t_chk('P3 el cliente no puede escribir en la tabla (alta, cambio ni borrado)',
  public.t_prueba($q$insert into public.archivos_cliente (client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano) values ('11111111-0000-0000-0000-00000000000a','tplA','rutina','11111111-0000-0000-0000-00000000000a/x.pdf','x.pdf','pdf','application/pdf',1)$q$) = '42501'
  and public.t_prueba($q$update public.archivos_cliente set estado = 'verificado'$q$) = '42501' and public.t_prueba($q$delete from public.archivos_cliente$q$) = '42501');

-- Subida: solo sobre una ruta reservada propia
select public.t_chk('P4 A sube sobre su ruta reservada', public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000004.pdf')$q$) = 'ok');
select public.t_chk('P5 A no puede subir a una ruta de su carpeta que no ha reservado', public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/libre.pdf')$q$) = '42501');
select public.t_chk('P6 A no puede subir a la carpeta de B (ni sobre la ruta que B tiene reservada)',
  public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000b/otra.pdf')$q$) = '42501'
  and public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000b/b0000000-0000-0000-0000-000000000002.pdf')$q$) = '42501');
select public.t_chk('P7 A no puede subir a otro depósito de otro cliente tampoco con una ruta ya verificada (no hay reserva)',
  public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000001.pdf')$q$) in ('42501', '23505'));
do $$ declare u int; d int; begin
  update storage.objects set name = name where bucket_id = 'cuestionario-archivos'; get diagnostics u = row_count;
  delete from storage.objects where bucket_id = 'cuestionario-archivos'; get diagnostics d = row_count;
  perform public.t_chk('P8 lo ya subido no se sobrescribe ni se borra (sin políticas de UPDATE ni DELETE)', u = 0 and d = 0, u || ' / ' || d);
end $$;

-- Entrenador 1: ve las filas de sus clientes (con sus estados) pero solo descarga lo verificado
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.t_chk('P9 el entrenador 1 ve las filas de A y de B (6), no las de C', (select count(*) from public.archivos_cliente) = 6 and (select count(*) from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000c') = 0);
select public.t_chk('P10 el entrenador solo ve los objetos VERIFICADOS de sus clientes (a1, a2, a3, b1), nunca los reservados ni los de C',
  (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 4
  and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos' and name ~ '(a0000000-0000-0000-0000-000000000004|b0000000-0000-0000-0000-000000000002|c0000000)') = 0);
select public.t_chk('P11 el entrenador no puede subir, cambiar ni borrar archivos',
  public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/z.pdf')$q$) = '42501'
  and public.t_prueba($q$update public.archivos_cliente set estado = 'enviado'$q$) = '42501' and public.t_prueba($q$delete from public.archivos_cliente$q$) = '42501');

-- Otro entrenador, equipo, super admin y anon
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.t_chk('P12 el entrenador 2 solo ve lo de su cliente C', (select count(*) from public.archivos_cliente) = 1 and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 1
  and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos' and name like '11111111-0000-0000-0000-00000000000c/%') = 1);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.t_chk('P13 un compañero de equipo no ve filas ni objetos (igual que las respuestas)', (select count(*) from public.archivos_cliente) = 0 and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 0
  and public.is_team_member_of('aaaaaaaa-0000-0000-0000-000000000001'));
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.t_chk('P14 tampoco el compañero «solo asignados», ni con un cliente asignado a él (A)', (select count(*) from public.archivos_cliente) = 0 and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 0
  and (select count(*) from public.clientes where id = '11111111-0000-0000-0000-00000000000a') = 1);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.t_chk('P15 ni el super admin', (select count(*) from public.archivos_cliente) = 0 and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 0);
reset role; set local role anon;
select public.t_chk('P16 anon no ve la tabla ni los objetos', public.t_prueba($q$select count(*) from public.archivos_cliente$q$) = '42501' and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 0);
reset role;

-- B no ve lo de A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select public.t_chk('P17 el cliente B ve solo lo suyo (2 filas, y su objeto reservado y verificado), nada de A', (select count(*) from public.archivos_cliente) = 2
  and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos') = 2
  and (select count(*) from storage.objects where bucket_id = 'cuestionario-archivos' and name like '11111111-0000-0000-0000-00000000000a/%') = 0);
reset role;

-- Solo se sube sobre una ruta en estado «reservado». Se prueba con una fila en cada otro estado y SIN objeto (si ya existiera, el error de nombre duplicado taparía a la política)
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado) values
  ('a0000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000005.pdf', 'v.pdf', 'pdf', 'application/pdf', 1, 'verificado'),
  ('a0000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000006.pdf', 'e.pdf', 'pdf', 'application/pdf', 1, 'enviado'),
  ('a0000000-0000-0000-0000-000000000007', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000007.pdf', 'r.pdf', 'pdf', 'application/pdf', 1, 'rechazado'),
  ('a0000000-0000-0000-0000-000000000008', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000008.pdf', 'b.pdf', 'pdf', 'application/pdf', 1, 'borrando'),
  ('a0000000-0000-0000-0000-000000000009', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-000000000009.pdf', 'c.pdf', 'pdf', 'application/pdf', 1, 'caducado'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-00000000000a.pdf', 'ok.pdf', 'pdf', 'application/pdf', 1, 'reservado');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.t_chk('P18 con la ruta en estado verificado, enviado, rechazado, borrando o caducado A NO puede subir (falla la política, no un duplicado)',
  (select bool_and(public.t_prueba(format($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-00000000000%s.pdf')$q$, n)) = '42501') from unnest(array['5', '6', '7', '8', '9']) n));
select public.t_chk('P19 …y sobre la reservada sí puede (el control del caso anterior no es un falso negativo)',
  public.t_prueba($q$insert into storage.objects (bucket_id, name) values ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/a0000000-0000-0000-0000-00000000000a.pdf')$q$) = 'ok');
reset role;
-- (se limpian las filas de apoyo y el objeto, para no alterar los recuentos de después)
delete from public.archivos_cliente where id in ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-00000000000a');
delete from storage.objects where name like '%a0000000-0000-0000-0000-00000000000a.pdf';
update public.archivos_cliente set estado = 'reservado', verificado_at = null where id = 'a0000000-0000-0000-0000-000000000004';

-- ═══ La respuesta: validar, reescribir, vincular ═══
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.t_chk('V1 una respuesta con un archivo propio verificado se guarda',
  public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r1', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
    '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000001","nombre":"MENTIRA.exe","tamano":1,"tipo":"x/y"}],"texto":"hola"}')$q$) = 'ok');
reset role;
select public.t_chk('V2 el servidor reescribe nombre, tamaño y tipo con los reales',
  (select answers -> 'rutina' -> 0 ->> 'nombre' = 'rutina-a1.pdf' and (answers -> 'rutina' -> 0 ->> 'tamano')::int = 5000 and answers -> 'rutina' -> 0 ->> 'tipo' = 'application/pdf' and answers ->> 'texto' = 'hola' from public.survey_responses where id = 'r1'));
select public.t_chk('V3 el archivo pasa a «enviado» con su respuesta', (select estado = 'enviado' and response_id = 'r1' and enviado_at is not null from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000001'));

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.t_chk('V4 citar un archivo de OTRO cliente se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r2', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"b0000000-0000-0000-0000-000000000001"}]}')$q$) = '22023');
select public.t_chk('V5 citar uno sin verificar (reservado) se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r3', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000004"}]}')$q$) = '22023');
select public.t_chk('V6 citar uno de OTRA pregunta (el de «otra» en «rutina») se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r4', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000003"}]}')$q$) = '22023');
select public.t_chk('V7 citar uno ya enviado en otra respuesta se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r5', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000001"}]}')$q$) = '22023');
select public.t_chk('V8 el mismo archivo dos veces en la misma pregunta se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r6', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000002"},{"id":"a0000000-0000-0000-0000-000000000002"}]}')$q$) = '22023');
select public.t_chk('V9 más de 5 se rechazan, y también algo que no es una lista, un id mal formado o un archivo inexistente',
  public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r7', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000002"},{"id":"1"},{"id":"2"},{"id":"3"},{"id":"4"},{"id":"5"}]}')$q$) = '22023'
  and public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r8', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":"a0000000-0000-0000-0000-000000000002"}')$q$) = '22023'
  and public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r9', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"no-es-un-uuid"}]}')$q$) = '22023'
  and public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r10', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"99999999-0000-0000-0000-000000000009"}]}')$q$) = '22023');
select public.t_chk('V10 citar un archivo en una plantilla DISTINTA a la de su pregunta se rechaza', public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r11', 'tplMany', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"q1":[{"id":"a0000000-0000-0000-0000-000000000002"}]}')$q$) = '22023');
-- Un objeto con forma de archivo en una pregunta que NO es de archivos: se guarda como texto, sin vincular nada
select public.t_chk('V11 un archivo citado en una pregunta que no es de archivos no se vincula',
  public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r12', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"texto":[{"id":"a0000000-0000-0000-0000-000000000002"}]}')$q$) = 'ok');
reset role;
select public.t_chk('V12 …y ese archivo sigue «verificado», sin respuesta', (select estado = 'verificado' and response_id is null from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000002'));
select public.t_chk('V13 las respuestas rechazadas no han dejado nada', (select count(*) from public.survey_responses where id in ('r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11')) = 0
  and (select estado from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000003') = 'verificado');
select public.t_chk('V14 plantillas sin preguntas de archivos y respuestas sin archivos siguen funcionando',
  public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r13', 'tplSin', '11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', '{"x":"hola"}'), ('r14', 'tplA', '11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', '{"texto":"hola","rutina":[]}'), ('r15', 'no_existe', '11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"1"}]}')$q$) = 'ok');

-- Cambiar la respuesta: lo que ya no se cita vuelve a «sin enviar»; lo que se añade, se vincula
update public.survey_responses set answers = '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000002"}]}' where id = 'r1';
select public.t_chk('V15 al cambiar la respuesta: a1 vuelve a «verificado» (otros 30 días) y a2 pasa a «enviado»',
  (select estado = 'verificado' and response_id is null from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000001')
  and (select estado = 'enviado' and response_id = 'r1' from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000002'));
select public.t_chk('V16 una respuesta ajena no puede tocar el archivo de otra: A no puede citar a2 en otra respuesta suya',
  public.t_prueba($q$insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('r16', 'tplA', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '{"rutina":[{"id":"a0000000-0000-0000-0000-000000000002"}]}')$q$) = '22023');
delete from public.survey_responses where id = 'r1';
select public.t_chk('V17 al borrar la respuesta, sus archivos vuelven a «verificado» sin respuesta (y no se pierden de golpe)',
  (select estado = 'verificado' and response_id is null and verificado_at > now() - interval '1 minute' from public.archivos_cliente where id = 'a0000000-0000-0000-0000-000000000002'));

-- ═══ Retención (reloj simulado) ═══
update public.archivos_cliente set estado = 'verificado', response_id = null, created_at = now(), verificado_at = now() where client_id in ('11111111-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000b');
delete from public.survey_responses;
delete from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000b';
insert into public.survey_responses (id, template_id, client_id, trainer_id, answers) values ('rx', 'tplA', '11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', '{}');
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado, created_at, verificado_at, response_id) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000001.pdf', 'reservado-viejo.pdf', 'pdf', 'application/pdf', 100, 'reservado', now() - interval '25 hours', null, null),
  ('e0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000002.pdf', 'reservado-nuevo.pdf', 'pdf', 'application/pdf', 100, 'reservado', now() - interval '23 hours', null, null),
  ('e0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000003.pdf', 'rechazado.pdf', 'pdf', 'application/pdf', 100, 'rechazado', now(), null, null),
  ('e0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000004.pdf', 'sin-enviar-31d.pdf', 'pdf', 'application/pdf', 100, 'verificado', now(), now() - interval '31 days', null),
  ('e0000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000005.pdf', 'sin-enviar-29d.pdf', 'pdf', 'application/pdf', 100, 'verificado', now(), now() - interval '29 days', null),
  ('e0000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000006.pdf', 'enviado-activo-viejo.pdf', 'pdf', 'application/pdf', 100, 'enviado', now() - interval '1000 days', now() - interval '1000 days', 'rx'),
  ('e0000000-0000-0000-0000-000000000007', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/e0000000-0000-0000-0000-000000000007.pdf', 'caducado-sin-respuesta.pdf', 'pdf', 'application/pdf', 100, 'caducado', now(), now(), 'rx-no-existe');
create temp table recl as select * from public.archivos_reclamar_limpieza(now());
select public.t_chk('Z1 se reclaman: reservado de más de 24 h, rechazado, sin enviar de 31 días y caducado sin respuesta (y no lo demás)',
  (select array_agg(id::text order by id::text) from recl where id::text like 'e0000000%') = array['e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000007'],
  (select string_agg(right(id::text, 2), ',' order by id::text) from recl));
select public.t_chk('Z2 un archivo enviado de un cliente ACTIVO no se reclama nunca, por viejo que sea', not exists (select 1 from recl where id = 'e0000000-0000-0000-0000-000000000006'));
select public.t_chk('Z3 los reclamados quedan en «borrando» y nadie puede citarlos', (select bool_and(estado = 'borrando') from public.archivos_cliente where id in (select id from recl)));
select public.t_chk('Z4 si el borrado en Storage falla, se reintenta: vuelve a salir al reclamar otra vez', (select count(*) from public.archivos_reclamar_limpieza(now()) where id::text like 'e0000000%') = 4);
create temp table fin1 as select public.archivos_finalizar_limpieza((select array_agg(id) from recl)) as n;
select public.t_chk('Z5 finalizar: los de limpieza desaparecen', (select n from fin1) = (select count(*) from recl) and not exists (select 1 from public.archivos_cliente where id in (select id from recl)));

-- Clientes archivados: aviso a los ~11 meses, borrado a los 12 con el aviso de hace 30 días
update public.clientes set archived_at = (extract(epoch from now() - interval '400 days') * 1000)::bigint where id = '11111111-0000-0000-0000-00000000000a';
update public.archivos_cliente set estado = 'enviado', response_id = 'rx-a', enviado_at = now() where client_id = '11111111-0000-0000-0000-00000000000a' and estado = 'verificado';
update public.clientes set archived_at = (extract(epoch from now() - interval '200 days') * 1000)::bigint where id = '11111111-0000-0000-0000-00000000000b';
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado, response_id, aviso_borrado_at) values
  ('f0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000b', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000b/f0000000-0000-0000-0000-000000000001.pdf', 'de-b.pdf', 'pdf', 'application/pdf', 100, 'enviado', 'rx', null);
create temp table av1 as select public.archivos_avisar_caducidad(now()) as n;
select public.t_chk('Z6 se avisa solo a quien lleva 11 meses archivado (A: 400 días sí; B: 200 días no)', (select n from av1) = 1
  and (select count(*) from public.archivos_cliente where aviso_borrado_at is not null and client_id = '11111111-0000-0000-0000-00000000000a') = 4
  and (select count(*) from public.archivos_cliente where aviso_borrado_at is not null and client_id = '11111111-0000-0000-0000-00000000000b') = 0);
create temp table av2 as select public.archivos_avisar_caducidad(now()) as n;
select public.t_chk('Z7 el aviso llega al entrenador, con la cantidad y una fecha, y no se repite',
  (select count(*) = 1 and bool_and(trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tipo = 'archivos_caducidad' and titulo like '%Ana%' and mensaje like '4 archivos%' and mensaje ~ '[0-9]{2}/[0-9]{2}/[0-9]{4}' and destinatario = 'trainer') from public.notificaciones where tipo = 'archivos_caducidad')
  and (select n from av2) = 0);
select public.t_chk('Z8 con 400 días archivado pero el aviso de hoy, NO se borra todavía (hace falta el aviso de hace 30 días)', not exists (select 1 from public.archivos_reclamar_limpieza(now()) where id::text like 'a0000000%'));
create temp table recl2 as select * from public.archivos_reclamar_limpieza(now() + interval '31 days');
select public.t_chk('Z9 a los 31 días del aviso (y con más de 12 meses) se reclaman los 4 de A; los de B (231 días archivado) no', (select count(*) from recl2 where id::text like 'a0000000%') = 4 and not exists (select 1 from recl2 where id::text like 'f0000000%'));
create temp table fin2 as select public.archivos_finalizar_limpieza((select array_agg(id) from recl2)) as n;
select public.t_chk('Z10 los de caducidad quedan como «caducado» (constancia, con fecha), no se borra la fila',
  (select n from fin2) >= 4
  and (select count(*) from public.archivos_cliente where estado = 'caducado' and borrado_at is not null and client_id = '11111111-0000-0000-0000-00000000000a') = 4);
-- Desarchivar anula el aviso
update public.clientes set archived_at = null where id = '11111111-0000-0000-0000-00000000000a';
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado, response_id, aviso_borrado_at) values
  ('f0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-00000000000a', 'tplA', 'rutina', '11111111-0000-0000-0000-00000000000a/f0000000-0000-0000-0000-000000000002.pdf', 'avisado.pdf', 'pdf', 'application/pdf', 100, 'enviado', 'rx-a', now() - interval '40 days');
create temp table av3 as select public.archivos_avisar_caducidad(now()) as n;
create temp table recl3 as select * from public.archivos_reclamar_limpieza(now() + interval '60 days');
select public.t_chk('Z11 si el cliente se desarchiva, el aviso se anula y no se reclama', (select n from av3) = 0
  and (select aviso_borrado_at is null from public.archivos_cliente where id = 'f0000000-0000-0000-0000-000000000002')
  and not exists (select 1 from recl3 where id::text = 'f0000000-0000-0000-0000-000000000002'));

-- Huérfanos: objetos del depósito sin fila, de más de 24 h
insert into storage.objects (bucket_id, name, created_at) values
  ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/huerfano-viejo.pdf', now() - interval '2 days'),
  ('cuestionario-archivos', '11111111-0000-0000-0000-00000000000a/huerfano-nuevo.pdf', now() - interval '1 hour'),
  ('documentos', 'aaaaaaaa-0000-0000-0000-000000000001/otro-deposito.pdf', now() - interval '9 days');
select public.t_chk('Z12 solo se localizan los huérfanos viejos de ESTE depósito (no los nuevos, ni los que tienen fila, ni otros depósitos)',
  (select array_agg(name) from public.archivos_huerfanos(now())) = array['11111111-0000-0000-0000-00000000000a/huerfano-viejo.pdf']);

-- Nadie sin clave de servicio puede llamar a la limpieza
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.t_chk('Z13 un entrenador no puede reclamar, finalizar, avisar ni listar huérfanos, ni lanzar la tarea',
  public.t_prueba($q$select * from public.archivos_reclamar_limpieza()$q$) = '42501' and public.t_prueba($q$select public.archivos_finalizar_limpieza(array[gen_random_uuid()])$q$) = '42501'
  and public.t_prueba($q$select public.archivos_avisar_caducidad()$q$) = '42501' and public.t_prueba($q$select * from public.archivos_huerfanos()$q$) = '42501'
  and public.t_prueba($q$select public.lanzar_limpieza_archivos()$q$) = '42501');
reset role; set local role anon;
select public.t_chk('Z14 anon tampoco', public.t_prueba($q$select * from public.archivos_reclamar_limpieza()$q$) = '42501' and public.t_prueba($q$select * from public.archivos_huerfanos()$q$) = '42501');
reset role;

-- La tarea programada llama a la función con su secreto
create temp table lanz as select public.lanzar_limpieza_archivos() as ok;
select public.t_chk('Z15 lanzar_limpieza_archivos llama a la función de borde con el secreto', (select ok from lanz)
  and (select count(*) = 1 and bool_and(url like '%/functions/v1/archivos-limpieza' and headers ->> 'Authorization' = 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'archivos_limpieza')) from public.llamadas_http));
select public.t_chk('Z16 el secreto existe y es largo y aleatorio', (select length(secret) >= 60 from public.internal_webhook_secrets where name = 'archivos_limpieza'));

-- ═══ RGPD ═══
select public.t_chk('G1 archivos_cliente está en las tablas del RGPD', exists (select 1 from public.client_data_tables() where tbl = 'archivos_cliente' and col = 'client_id'));
-- (la limpieza simulada de antes ya finalizó el c1: se siembran dos archivos nuevos del cliente C)
delete from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000c';
insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano, estado) values
  ('d0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-00000000000c', 'tplB', 'rutina', '11111111-0000-0000-0000-00000000000c/d0000000-0000-0000-0000-000000000002.pdf', 'segundo.pdf', 'pdf', 'application/pdf', 100, 'enviado'),
  ('d0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-00000000000c', 'tplB', 'rutina', '11111111-0000-0000-0000-00000000000c/d0000000-0000-0000-0000-000000000001.pdf', 'para-borrar.pdf', 'pdf', 'application/pdf', 100, 'verificado');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.t_chk('G2 la exportación del cliente C incluye sus archivos (nombre y estado), sin ruta ajena',
  (select jsonb_array_length(public.export_client_data('11111111-0000-0000-0000-00000000000c') -> 'archivos_cliente') = 2));
select public.t_chk('G3 un entrenador ajeno no puede exportar ni borrar los datos (y sus archivos) de otro cliente', public.t_prueba($q$select public.export_client_data('11111111-0000-0000-0000-00000000000a')$q$) = '42501'
  and public.t_prueba($q$select public.delete_client_data('11111111-0000-0000-0000-00000000000a')$q$) = '42501');
create temp table borr as select public.delete_client_data('11111111-0000-0000-0000-00000000000c') as r;
select public.t_chk('G4 el borrado del cliente C elimina sus filas de archivos y lo anota', (select (r ->> 'archivos_cliente')::int = 2 from borr));
reset role;
select public.t_chk('G5 no queda nada de C', not exists (select 1 from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000c') and not exists (select 1 from public.clientes where id = '11111111-0000-0000-0000-00000000000c'));
select public.t_chk('G6 los archivos de los demás clientes siguen ahí', exists (select 1 from public.archivos_cliente where client_id = '11111111-0000-0000-0000-00000000000a'));

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by length(caso), caso;

rollback;
