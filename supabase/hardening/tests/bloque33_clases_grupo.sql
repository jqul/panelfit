-- Prueba de migrations/20261104000004_clases_grupo.sql
-- (aforo y lista de espera: nunca más reservadas que plazas, la espera avanza al cancelar, al quitar a alguien o al
-- subir el aforo; el cliente solo entra y sale con las funciones, no ve a los demás apuntados y respeta las normas de
-- reserva; otro entrenador, el cliente de otro entrenador y anon no tocan nada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.como(sub text) returns void language sql as $f$
  select set_config('request.jwt.claims', json_build_object('sub', sub, 'role', 'authenticated')::text, true)
$f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local'),
  ('cccccccc-0000-0000-0000-000000000003', 'c3@test.local'), ('cccccccc-0000-0000-0000-000000000009', 'otro@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bea', 'tok-2', 'cccccccc-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Carla', 'tok-3', 'cccccccc-0000-0000-0000-000000000003'),
  ('11111111-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002', 'De otro', 'tok-9', 'cccccccc-0000-0000-0000-000000000009');
insert into public.horario_citas (trainer_id, dias_vista, cancelar_horas) values ('aaaaaaaa-0000-0000-0000-000000000001', 30, 24);

-- ── El entrenador 1 programa clases ──
set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.clases (id, titulo, start_at, end_at, aforo) values
  ('e0000000-0000-0000-0000-000000000001', 'Funcional', now() + interval '3 days', now() + interval '3 days 1 hour', 2),
  ('e0000000-0000-0000-0000-000000000002', 'Pronto', now() + interval '12 hours', now() + interval '13 hours', 1),
  ('e0000000-0000-0000-0000-000000000003', 'Lejos', now() + interval '45 days', now() + interval '45 days 1 hour', 5),
  ('e0000000-0000-0000-0000-000000000004', 'Cancelada', now() + interval '2 days', now() + interval '2 days 1 hour', 5);
update public.clases set cancelada = true where id = 'e0000000-0000-0000-0000-000000000004';

select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
do $$
declare n integer; st text := 'sin error';
begin
  select count(*) into n from public.clases;
  begin insert into public.clase_plazas (clase_id, client_id) values ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000009');
  exception when others then st := sqlstate; end;
  insert into resultados values ('G1 otro entrenador no ve las clases ni apunta a nadie', n = 0 and st = '42501', n || ' / ' || st);
end $$;

-- ── Tres clientes para dos plazas ──
do $$
declare a text; b text; c text;
begin
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000001'); a := public.reservar_clase('e0000000-0000-0000-0000-000000000001');
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000002'); b := public.reservar_clase('e0000000-0000-0000-0000-000000000001');
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000003'); c := public.reservar_clase('e0000000-0000-0000-0000-000000000001');
  insert into resultados values ('G2 dos con plaza y la tercera a la espera', a = 'reservada' and b = 'reservada' and c = 'espera', a || ', ' || b || ', ' || c);
  c := public.reservar_clase('e0000000-0000-0000-0000-000000000001');
  insert into resultados values ('G3 reservar otra vez no cambia nada', c = 'espera', c);
end $$;

-- Lo que ve la tercera
do $$
declare j jsonb; k jsonb; n integer; st text := 'sin error';
begin
  j := public.clases_cliente(60);
  select x into k from jsonb_array_elements(j) x where x->>'titulo' = 'Funcional';
  insert into resultados values ('G4 ve plazas ocupadas y su puesto en la espera',
    (k->>'ocupadas')::int = 2 and (k->>'aforo')::int = 2 and k->>'mi_estado' = 'espera' and (k->>'mi_puesto')::int = 1, coalesce(k::text, 'null'));
  insert into resultados values ('G5 no ve la cancelada ni la que pasa de los días vista',
    not exists (select 1 from jsonb_array_elements(j) x where x->>'titulo' in ('Cancelada', 'Lejos')), (select string_agg(x->>'titulo', ', ') from jsonb_array_elements(j) x));
  select count(*) into n from public.clase_plazas;
  insert into resultados values ('G6 en la tabla solo ve su propia plaza', n = 1, n::text);
  begin insert into public.clase_plazas (clase_id, client_id) values ('e0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003');
  exception when others then st := sqlstate; end;
  insert into resultados values ('G7 no se apunta sin pasar por reservar_clase', st = '42501', st);
end $$;

do $$
declare st text := 'sin error';
begin
  begin perform public.reservar_clase('e0000000-0000-0000-0000-000000000003'); exception when others then st := sqlerrm; end;
  insert into resultados values ('G8 no reserva más allá de los días vista', st = 'demasiado_lejos', st);
  st := 'sin error';
  begin perform public.reservar_clase('e0000000-0000-0000-0000-000000000004'); exception when others then st := sqlerrm; end;
  insert into resultados values ('G9 no reserva una clase cancelada', st = 'clase_no_disponible', st);
end $$;

-- ── Bea cancela a tiempo: Carla pasa a tener plaza ──
do $$
declare ok boolean; e text;
begin
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000002');
  ok := public.cancelar_clase('e0000000-0000-0000-0000-000000000001');
  select estado into e from public.clase_plazas where client_id = '11111111-0000-0000-0000-000000000003' and clase_id = 'e0000000-0000-0000-0000-000000000001';
  insert into resultados values ('G10 al cancelar, la primera de la espera pasa a tener plaza', ok and e is null, coalesce(e, 'no la ve (bien: es de otra)'));
end $$;
reset role;
do $$
declare e text;
begin
  select estado into e from public.clase_plazas where client_id = '11111111-0000-0000-0000-000000000003' and clase_id = 'e0000000-0000-0000-0000-000000000001';
  insert into resultados values ('G11 (comprobado como admin) Carla tiene plaza', e = 'reservada', coalesce(e, 'null'));
end $$;

-- ── Plazo de cancelación: clase dentro de 12 h, con 24 h de plazo ──
set local role authenticated;
do $$
declare st text := 'sin error'; ok boolean;
begin
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000001'); perform public.reservar_clase('e0000000-0000-0000-0000-000000000002');
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000002'); perform public.reservar_clase('e0000000-0000-0000-0000-000000000002');
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000001');
  begin perform public.cancelar_clase('e0000000-0000-0000-0000-000000000002'); exception when others then st := sqlerrm; end;
  insert into resultados values ('G12 fuera de plazo no puede cancelar su plaza', st = 'plazo_cancelacion', st);
  perform pg_temp.como('cccccccc-0000-0000-0000-000000000002');
  ok := public.cancelar_clase('e0000000-0000-0000-0000-000000000002');
  insert into resultados values ('G13 salir de la espera se puede siempre', ok, ok::text);
end $$;

-- ── El de otro entrenador no reserva; anon no entra ──
select pg_temp.como('cccccccc-0000-0000-0000-000000000009');
do $$
declare st text := 'sin error';
begin
  begin perform public.reservar_clase('e0000000-0000-0000-0000-000000000001'); exception when others then st := sqlstate; end;
  insert into resultados values ('G14 un cliente de otro entrenador no reserva', st = '42501', st);
end $$;
reset role;
set local role anon;
do $$
declare st text := 'sin error';
begin
  begin perform public.clases_cliente(14); exception when others then st := sqlstate; end;
  insert into resultados values ('G15 anon no ve clases', st = '42501', st);
end $$;
reset role;

-- ── El entrenador: con la clase llena, quien apunta va a la espera; quitar a alguien o subir el aforo la mueve ──
set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare e text; n integer;
begin
  insert into public.clase_plazas (clase_id, client_id, estado) values ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'reservada');
  select estado into e from public.clase_plazas where clase_id = 'e0000000-0000-0000-0000-000000000001' and client_id = '11111111-0000-0000-0000-000000000002';
  insert into resultados values ('G16 con la clase llena, el entrenador tampoco cuela a nadie con plaza', e = 'espera', e);

  delete from public.clase_plazas where clase_id = 'e0000000-0000-0000-0000-000000000001' and client_id = '11111111-0000-0000-0000-000000000001';
  select estado into e from public.clase_plazas where clase_id = 'e0000000-0000-0000-0000-000000000001' and client_id = '11111111-0000-0000-0000-000000000002';
  insert into resultados values ('G17 al quitar a alguien con plaza, entra la primera de la espera', e = 'reservada', e);

  insert into public.clase_plazas (clase_id, client_id) values ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001');
  update public.clases set aforo = 3 where id = 'e0000000-0000-0000-0000-000000000001';
  select count(*) into n from public.clase_plazas where clase_id = 'e0000000-0000-0000-0000-000000000001' and estado = 'reservada';
  insert into resultados values ('G18 al subir el aforo, la espera ocupa las plazas nuevas', n = 3, n::text);
end $$;
reset role;

do $$
begin
  insert into resultados values ('G19 las plazas entran en el RGPD', exists (select 1 from public.client_data_tables() where tbl = 'clase_plazas'), '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
