-- Prueba de migrations/20261114000002_clases_etiquetas.sql
-- (una clase con etiquetas solo la ve y la reserva quien tiene alguna; sin etiquetas, todos; quien ya tenía plaza la
-- sigue viendo aunque le quiten la etiqueta).
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
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id, label_ids) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana (VIP)', 'tok-1', 'cccccccc-0000-0000-0000-000000000001', '["vip"]'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bea', 'tok-2', 'cccccccc-0000-0000-0000-000000000002', '[]');

set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.clases (id, titulo, start_at, end_at, aforo, etiquetas) values
  ('e0000000-0000-0000-0000-000000000001', 'Abierta', now() + interval '3 days', now() + interval '3 days 1 hour', 5, '[]'),
  ('e0000000-0000-0000-0000-000000000002', 'Solo VIP', now() + interval '3 days', now() + interval '3 days 1 hour', 5, '["vip","otra"]');

select pg_temp.como('cccccccc-0000-0000-0000-000000000002');
do $$
declare a jsonb; st text := 'sin error';
begin
  a := public.clases_cliente(14);
  insert into resultados values ('C1 sin la etiqueta ve solo la abierta', jsonb_array_length(a) = 1 and a->0->>'titulo' = 'Abierta', a::text);
  begin perform public.reservar_clase('e0000000-0000-0000-0000-000000000002'); exception when others then st := sqlerrm; end;
  insert into resultados values ('C2 y no puede reservar la de VIP', st = 'clase_no_disponible', st);
end $$;

select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
do $$
declare a jsonb; e text;
begin
  a := public.clases_cliente(14);
  insert into resultados values ('C3 con la etiqueta ve las dos', jsonb_array_length(a) = 2, a::text);
  e := public.reservar_clase('e0000000-0000-0000-0000-000000000002');
  insert into resultados values ('C4 y reserva la de VIP', e = 'reservada', e);
end $$;
reset role;

-- Le quitan la etiqueta: su plaza sigue y la clase también
update public.clientes set label_ids = '[]' where id = '11111111-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
do $$
declare a jsonb;
begin
  a := public.clases_cliente(14);
  insert into resultados values ('C5 sin la etiqueta sigue viendo la que ya reservó', jsonb_array_length(a) = 2, a::text);
end $$;
reset role;

do $$
declare st text := 'sin error';
begin
  begin update public.clases set etiquetas = '"vip"' where id = 'e0000000-0000-0000-0000-000000000001'; exception when check_violation then st := 'rechazado'; end;
  insert into resultados values ('C6 las etiquetas son una lista', st = 'rechazado', st);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
