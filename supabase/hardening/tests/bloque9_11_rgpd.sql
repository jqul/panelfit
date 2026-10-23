-- Prueba de los bloques 9, 10 y 11 de hardening/20261023_rgpd.sql
-- (consentimientos, exportación y borrado completo de un cliente).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar los bloques. Todo ocurre dentro de una
-- transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

-- Entrenadores 1 y 2 (aprobados) y sus cuentas. handle_new_user crea además una
-- fila "entrenador pendiente" para las cuentas de los clientes, igual que en producción.
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 't2@test.local'),
  ('1a1a1a1a-0000-0000-0000-000000000001', 'c1@test.local'),
  ('3a3a3a3a-0000-0000-0000-000000000003', 'c3@test.local');

insert into public.clientes (id, "trainerId", name, token, notas_privadas, auth_user_id) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1', 'nota secreta', '1a1a1a1a-0000-0000-0000-000000000001'),
  ('c2c2c2c2-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 2', 'tok-2', '', null),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'Cliente 3', 'tok-3', '', '3a3a3a3a-0000-0000-0000-000000000003'),
  -- cliente de t1 cuya cuenta es la de un entrenador real (t2): su cuenta no debe borrarse
  ('c4c4c4c4-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 4', 'tok-4', '', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Datos del cliente 1 en tablas con id uuid y con id text (sin clave foránea)
insert into public.registros_dolor (id, "clientId", date, zona, intensidad, created_at) values
  ('d1', 'c1c1c1c1-0000-0000-0000-000000000001', '2026-10-01', 'lumbar', 3, 1),
  ('d2', 'c2c2c2c2-0000-0000-0000-000000000002', '2026-10-01', 'rodilla', 2, 1),
  ('d3', 'c3c3c3c3-0000-0000-0000-000000000003', '2026-10-01', 'hombro', 1, 1);
insert into public.valoraciones (id, client_id, trainer_id, fecha) values
  ('v1', 'c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-01');
insert into public.foto_sessions (id, client_id, date, front_url) values
  ('f1', 'c1c1c1c1-0000-0000-0000-000000000001', '2026-10-01', 'fotos/c1c1c1c1-0000-0000-0000-000000000001/f1/front.jpg');
insert into public.notificaciones (id, trainer_id, client_id, tipo, titulo, created_at) values
  ('n1', 'aaaaaaaa-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'x', 'x', 1);
insert into public.registros_peso ("clientId", weight, date) values ('c1c1c1c1-0000-0000-0000-000000000001', 76, '2026-10-01');
insert into public.registros ("clientId", logs) values ('c1c1c1c1-0000-0000-0000-000000000001', '{"a":1}');
insert into public.checkins ("clientId", respuestas) values ('c1c1c1c1-0000-0000-0000-000000000001', '[]');
insert into public.registros_peso ("clientId", weight, date) values ('c3c3c3c3-0000-0000-0000-000000000003', 80, '2026-10-01');

-- ── Bloque 9 · consentimientos ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.consentimientos ("clientId", version, salud, fotos) values ('c1c1c1c1-0000-0000-0000-000000000001', '2026-10', true, false);
reset role;
insert into resultados select 'K1 el cliente registra su consentimiento', count(*) = 1, count(*)::text || ' filas' from public.consentimientos;

do $$
declare r text; n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  begin
    insert into public.consentimientos ("clientId", version, salud) values ('c3c3c3c3-0000-0000-0000-000000000003', '2026-10', true);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  with u as (update public.consentimientos set salud = false returning 1) select count(*) into n from u;
  reset role;
  insert into resultados values ('K2 no puede dar consentimiento en nombre de otro cliente', r = 'denegado', r);
  insert into resultados values ('K3 el cliente no puede modificar un consentimiento ya dado', n = 0, n || ' filas modificadas');
end $$;

do $$
declare n1 int; n2 int;
begin
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n1 from public.consentimientos;
  reset role;
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n2 from public.consentimientos;
  reset role;
  insert into resultados values ('K4 su entrenador ve el consentimiento y otro entrenador no', n1 = 1 and n2 = 0, 'entrenador 1: ' || n1 || ', entrenador 2: ' || n2);
end $$;

-- ── Bloque 10 · exportación ──
do $$
declare r text; j jsonb;
  c1 constant uuid := 'c1c1c1c1-0000-0000-0000-000000000001';
  c3 constant uuid := 'c3c3c3c3-0000-0000-0000-000000000003';
  esperadas text[]; recibidas text[];
begin
  -- como el propio cliente
  perform set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  j := public.export_client_data(c1);
  reset role;
  insert into resultados values ('E1 el cliente exporta sus datos de tablas con id text y uuid',
    jsonb_array_length(j->'registros_dolor') = 1 and jsonb_array_length(j->'valoraciones') = 1
    and jsonb_array_length(j->'foto_sessions') = 1 and jsonb_array_length(j->'registros_peso') = 1
    and jsonb_array_length(j->'consentimientos') = 1 and j->'clientes'->>'name' = 'Cliente 1',
    'dolor=' || jsonb_array_length(j->'registros_dolor') || ' val=' || jsonb_array_length(j->'valoraciones'));
  insert into resultados values ('E2 la exportación del cliente no incluye las notas privadas del entrenador',
    not (j->'clientes' ? 'notas_privadas') and not (j->'clientes' ? 'alerts') and not (j->'clientes' ? 'label_ids'), (j->'clientes')::text like '%secreta%' || '');
  insert into resultados values ('E2b no se cuelan datos de otros clientes',
    not (j::text like '%rodilla%') and not (j::text like '%hombro%'), 'ok');

  -- cobertura: todas las tablas con columna de cliente salen en la exportación
  select array_agg(table_name::text order by table_name) into esperadas
    from (select distinct c.table_name from information_schema.columns c
          join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
          where c.table_schema = 'public' and c.column_name in ('clientId', 'client_id', 'cliente_id')
            and c.table_name not in ('consentimientos', 'registro_borrados')) q;
  select array_agg(k order by k) into recibidas
    from jsonb_object_keys(j) k where k not in ('clientes', 'consentimientos', 'exportado_en');
  insert into resultados values ('E3 la exportación cubre todas las tablas con datos de cliente', esperadas = recibidas,
    'faltan: ' || coalesce((select string_agg(x, ',') from unnest(esperadas) x where x <> all(recibidas)), '-') ||
    ' | sobran: ' || coalesce((select string_agg(x, ',') from unnest(recibidas) x where x <> all(esperadas)), '-'));

  -- como su entrenador: completo
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  j := public.export_client_data(c1);
  reset role;
  insert into resultados values ('E4 el entrenador exporta también las notas privadas', j->'clientes'->>'notas_privadas' = 'nota secreta', 'ok');

  -- sin permiso
  begin
    perform set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    perform public.export_client_data(c3);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  reset role;
  insert into resultados values ('E5 un cliente no exporta los datos de otro cliente', r = 'denegado', r);
  begin
    perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
    set local role authenticated;
    perform public.export_client_data(c1);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  reset role;
  insert into resultados values ('E6 un entrenador no exporta clientes de otro entrenador', r = 'denegado', r);
  begin
    set local role anon;
    perform public.export_client_data(c1);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  reset role;
  insert into resultados values ('E7 sin sesión no se exporta nada', r = 'denegado', r);
end $$;

-- ── Bloque 11 · borrado completo ──
do $$
declare r text; j jsonb; n int;
  c1 constant uuid := 'c1c1c1c1-0000-0000-0000-000000000001';
  c4 constant uuid := 'c4c4c4c4-0000-0000-0000-000000000004';
begin
  begin
    perform set_config('request.jwt.claims', '{"sub":"1a1a1a1a-0000-0000-0000-000000000001","role":"authenticated"}', true);
    set local role authenticated;
    perform public.delete_client_data(c1);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  reset role;
  insert into resultados values ('D1 el propio cliente no puede borrarse por esta vía', r = 'denegado', r);
  begin
    perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
    set local role authenticated;
    perform public.delete_client_data(c1);
    r := 'permitido';
  exception when insufficient_privilege then r := 'denegado'; end;
  reset role;
  insert into resultados values ('D2 otro entrenador no puede borrar el cliente', r = 'denegado', r);

  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  j := public.delete_client_data(c1);
  reset role;

  select (select count(*) from public.registros_dolor where "clientId" = c1::text)
       + (select count(*) from public.valoraciones where client_id = c1::text)
       + (select count(*) from public.foto_sessions where client_id = c1::text)
       + (select count(*) from public.notificaciones where client_id = c1::text)
       + (select count(*) from public.registros_peso where "clientId" = c1)
       + (select count(*) from public.registros where "clientId" = c1)
       + (select count(*) from public.checkins where "clientId" = c1)
       + (select count(*) from public.consentimientos where "clientId" = c1)
       + (select count(*) from public.clientes where id = c1) into n;
  insert into resultados values ('D3 el entrenador borra todas las filas del cliente, también las de id text', n = 0, n || ' filas restantes');
  insert into resultados values ('D4 no toca los datos de otros clientes',
    (select count(*) from public.registros_dolor where id in ('d2', 'd3')) = 2 and (select count(*) from public.registros_peso) = 1, 'ok');
  insert into resultados values ('D5 borra la cuenta de acceso del cliente y su fila fantasma de entrenador',
    not exists (select 1 from auth.users where id = '1a1a1a1a-0000-0000-0000-000000000001')
    and not exists (select 1 from public.entrenadores where uid = '1a1a1a1a-0000-0000-0000-000000000001')
    and exists (select 1 from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001'),
    j::text);
  insert into resultados values ('D6 deja constancia sin datos personales',
    (select count(*) from public.registro_borrados where client_id = c1 and (filas->>'registros_dolor')::int = 1) = 1, 'ok');

  -- cliente 4: su cuenta es la de un entrenador real (t2) y no se borra
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  j := public.delete_client_data(c4);
  reset role;
  insert into resultados values ('D7 si la cuenta es también de un entrenador, se conserva',
    exists (select 1 from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002')
    and exists (select 1 from public.entrenadores where uid = 'bbbbbbbb-0000-0000-0000-000000000002')
    and not exists (select 1 from public.clientes where id = c4), j::text);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
