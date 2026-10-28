-- Prueba de migrations/20261027000002_calendario_ical.sql
-- (la dirección secreta del calendario solo da lo que va al calendario del cliente; sin token válido, nada;
-- la tabla de tokens no se puede leer sin sesión; cada uno gestiona solo el suyo).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Javi', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Otro', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id, notas_privadas, lesiones) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001', 'NOTA PRIVADA', 'LESION'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Bea', 'tok-2', null, '', '');
insert into public.calendario_enlaces (client_id, token) values
  ('11111111-0000-0000-0000-000000000001', repeat('a', 32)),
  ('22222222-0000-0000-0000-000000000002', repeat('b', 32));
insert into public.citas (trainer_id, client_id, title, start_at, end_at, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Sesión', now() + interval '2 days', now() + interval '2 days 1 hour', 'confirmada'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Pedida', now() + interval '3 days', now() + interval '3 days 1 hour', 'pendiente');
insert into public.eventos_cliente (client_id, fecha, nombre, prioridad) values ('11111111-0000-0000-0000-000000000001', current_date + 40, '10K', 'A');
insert into public.ausencias (client_id, desde, hasta, motivo) values ('11111111-0000-0000-0000-000000000001', current_date + 10, current_date + 12, 'viaje');
insert into public.planes ("clientId", plan) values ('11111111-0000-0000-0000-000000000001', '{"P":{"diasElegidos":[0,2,4],"fechaInicio":"2026-10-19","weeks":[{},{},{},{}],"programName":"Fuerza"}}');

-- ── Sin sesión, con la dirección secreta ──
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare d jsonb; ok boolean := false; n int := -1;
begin
  d := public.calendario_datos(repeat('a', 32));
  insert into resultados values ('K1 con su token se obtienen su sesión confirmada, su fecha clave, su ausencia y sus días',
    jsonb_array_length(d->'citas') = 1 and d->'citas'->0->>'titulo' = 'Sesión' and jsonb_array_length(d->'eventos') = 1
    and jsonb_array_length(d->'ausencias') = 1 and d->'entreno'->>'semanas' = '4' and d->>'entrenador' = 'Javi', left(d::text, 80));
  insert into resultados values ('K2 solo devuelve lo del calendario: ni notas privadas ni lesiones ni token de acceso',
    (select array_agg(k order by k) from jsonb_object_keys(d) k) = array['ausencias','citas','entrenador','entreno','eventos']
    and d::text not like '%NOTA PRIVADA%' and d::text not like '%LESION%' and d::text not like '%tok-1%', 'claves: ' || (select string_agg(k, ',') from jsonb_object_keys(d) k));
  insert into resultados values ('K3 un token con forma rara no devuelve nada', public.calendario_datos('abc'' or 1=1 --') is null and public.calendario_datos(null) is null, 'null');
  insert into resultados values ('K4 un token que no existe no devuelve nada', public.calendario_datos(repeat('c', 32)) is null, 'null');
  begin select count(*) into n from public.calendario_enlaces; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('K5 sin sesión no se pueden leer los tokens', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
end $$;
reset role;

-- Un cliente archivado deja de publicar su calendario
update public.clientes set archived_at = 1 where id = '22222222-0000-0000-0000-000000000002';
set local role anon;
insert into resultados select 'K6 el calendario de un cliente archivado no devuelve nada', public.calendario_datos(repeat('b', 32)) is null, 'null';
reset role;

-- ── El cliente y los entrenadores ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  select count(*) into n from public.calendario_enlaces;
  insert into resultados values ('K7 el cliente ve su token y no el de otro', n = 1, n::text || ' filas');
  update public.calendario_enlaces set token = repeat('d', 32) where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados select 'K8 el cliente puede cambiar su token', token = repeat('d', 32), token from public.calendario_enlaces;
  begin
    insert into public.calendario_enlaces (client_id, token) values ('22222222-0000-0000-0000-000000000002', repeat('e', 32))
      on conflict (client_id) do update set token = excluded.token;
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('K9 el cliente no puede tocar el token de otro', ok, case when ok then 'denegado' else 'pudo' end);
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'K10 otro entrenador solo ve el token de su cliente', count(*) = 1 and bool_and(client_id = '22222222-0000-0000-0000-000000000002'), count(*)::text || ' filas' from public.calendario_enlaces;
reset role;

insert into resultados select 'K11 el token entra en la exportación y el borrado del RGPD', count(*) = 1, 'client_data_tables' from public.client_data_tables() where tbl = 'calendario_enlaces';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
