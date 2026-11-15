-- Prueba de migrations/20261114000004_respuestas_sesion.sql
-- (el entrenador responde a sesiones de SUS clientes; el cliente ve las suyas y solo puede marcarlas como leídas;
-- otro entrenador y anon no ven nada).
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
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'De otro', 'tok-2', null);

set local role authenticated;
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare ok boolean := false;
begin
  insert into public.respuestas_sesion (id, client_id, trainer_id, fecha, texto) values
    ('f0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', current_date, '💪 ¡Buen trabajo!');
  insert into resultados values ('R1 el entrenador responde a su cliente', true, '');
  begin
    insert into public.respuestas_sesion (client_id, trainer_id, fecha, texto) values
      ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', current_date, 'intruso');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('R2 no responde a clientes de otro', ok, '');
end $$;

select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
do $$ begin
  insert into resultados values ('R3 otro entrenador no ve la respuesta', (select count(*) from public.respuestas_sesion) = 0, '');
end $$;

select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
do $$
declare n int;
begin
  select count(*) into n from public.respuestas_sesion;
  insert into resultados values ('R4 el cliente ve la suya', n = 1, n::text);
  update public.respuestas_sesion set texto = 'cambiado';
  perform public.marcar_respuesta_leida('f0000000-0000-0000-0000-000000000001');
end $$;
reset role;
do $$ begin
  insert into resultados values ('R5 el cliente no cambia el texto', (select texto from public.respuestas_sesion) = '💪 ¡Buen trabajo!', '');
  insert into resultados values ('R6 pero sí la marca como leída', (select leida_at from public.respuestas_sesion) is not null, '');
end $$;

set local role anon;
do $$
declare n int := -1;
begin
  begin select count(*) into n from public.respuestas_sesion; exception when insufficient_privilege then n := 0; end;
  insert into resultados values ('R7 anon no ve nada', n = 0, n::text);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
