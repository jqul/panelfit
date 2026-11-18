-- Prueba de migrations/20261118000002_notas_privadas_cliente.sql
-- (las notas privadas del entrenador solo las ve él o su equipo; el cliente y otro entrenador no; RGPD y cascada).
-- La migración de datos (sacar coachNotes de planes.plan sin perder nada) se prueba aparte, en el runner, porque necesita los
-- planes sembrados ANTES de aplicarla: run-pglite-notas-privadas.mjs.
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2', null);
insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Nota del otro entrenador');

-- ── El entrenador 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int; v text;
begin
  insert into public.notas_privadas_cliente (client_id, trainer_id, notas)
    values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rodilla derecha: ojo');
  select count(*) into n from public.notas_privadas_cliente;
  insert into resultados values ('E1 anota notas a su cliente y solo ve las suyas', n = 1, n::text || ' filas');

  begin
    insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'intruso');
  exception when insufficient_privilege or unique_violation then ok := true;
  end;
  insert into resultados values ('E2 no puede escribir notas sobre un cliente de otro', ok, 'RLS');

  ok := false;
  begin
    insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'segunda fila');
  exception when unique_violation then ok := true;
  end;
  insert into resultados values ('E3 una sola fila de notas por cliente', ok, 'pk');

  -- Se edita con upsert, como hace la app
  insert into public.notas_privadas_cliente (client_id, trainer_id, notas, updated_at)
    values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rodilla derecha: ojo, mejor', now())
    on conflict (client_id) do update set notas = excluded.notas, updated_at = excluded.updated_at;
  select notas into v from public.notas_privadas_cliente where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('E4 se pueden editar (upsert)', v = 'Rodilla derecha: ojo, mejor', coalesce(v, 'null'));

  ok := false;
  begin
    update public.notas_privadas_cliente set notas = repeat('x', 200001) where client_id = '11111111-0000-0000-0000-000000000001';
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('E5 hay un límite de longitud muy amplio', ok, 'check');
end $$;
reset role;

-- ── El cliente no ve nada, ni crea ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  select count(*) into n from public.notas_privadas_cliente;
  insert into resultados values ('C1 el cliente NO ve las notas privadas sobre él', n = 0, n::text || ' filas');
  begin
    update public.notas_privadas_cliente set notas = '' where client_id = '11111111-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C2 el cliente no puede modificarlas', ok, 'RLS');
  ok := false;
  begin
    insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'x');
  exception when insufficient_privilege or unique_violation then ok := true;
  end;
  insert into resultados values ('C3 el cliente no puede crearlas', ok, 'RLS');
end $$;
reset role;

-- ── El entrenador 2 no ve lo del 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.notas_privadas_cliente where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('T1 otro entrenador no ve las notas de un cliente que no es suyo', n = 0, n::text || ' filas');
end $$;
reset role;

-- ── Anónimo: sin acceso ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform count(*) from public.notas_privadas_cliente;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('A1 sin sesión no se lee nada', ok, 'revoke');
end $$;
reset role;

-- ── RGPD y cascada ──
insert into resultados select 'R1 notas_privadas_cliente está en client_data_tables (exportación y borrado completo)', count(*) = 1, string_agg(tbl, ', ')
  from public.client_data_tables() where tbl = 'notas_privadas_cliente';
delete from public.clientes where id = '11111111-0000-0000-0000-000000000001';
insert into resultados select 'R2 al borrar el cliente caen sus notas', count(*) = 0, count(*)::text || ' filas'
  from public.notas_privadas_cliente where client_id = '11111111-0000-0000-0000-000000000001';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
