-- Prueba de migrations/20261118000001_diario_decisiones.sql
-- (el entrenador anota y revisa decisiones solo de SUS clientes; el cliente no ve nada; otro entrenador tampoco; las
-- comprobaciones de la tabla; RGPD y cascada).
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
insert into public.decisiones_entrenador (id, trainer_id, client_id, tipo, hipotesis) values
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'mantener', 'Decisión del otro entrenador');

-- ── El entrenador 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int; v text;
begin
  insert into public.decisiones_entrenador (id, trainer_id, client_id, ejercicio, hipotesis, tipo, intervencion, revisar_el) values
    ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
     'Sentadilla', 'Duerme poco', 'no-intervenir', 'Mantener 3 semanas', (now() + interval '21 days')::date);
  select count(*) into n from public.decisiones_entrenador;
  insert into resultados values ('E1 anota una decisión a su cliente y solo ve las suyas', n = 1, n::text || ' filas');

  begin
    insert into public.decisiones_entrenador (trainer_id, client_id, tipo) values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'mantener');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('E2 no puede anotar una decisión sobre un cliente de otro', ok, 'RLS');

  ok := false;
  begin
    insert into public.decisiones_entrenador (trainer_id, client_id, tipo) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'cambiar-todo');
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('E3 el tipo debe ser uno de los de la lista', ok, 'check');

  ok := false;
  begin
    insert into public.decisiones_entrenador (trainer_id, client_id, tipo, fecha, revisar_el) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'mantener', current_date, current_date - 1);
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('E4 no se revisa antes de tomarla', ok, 'check');

  ok := false;
  begin
    insert into public.decisiones_entrenador (trainer_id, client_id, tipo, hipotesis) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'mantener', repeat('x', 1001));
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('E5 la hipótesis tiene límite de longitud', ok, 'check');

  -- La revisa: queda con su fecha y su resultado
  update public.decisiones_entrenador set revisada_el = current_date, resultado = 'Subió 2,5 kg' where id = 'dddddddd-0000-0000-0000-000000000001';
  select resultado into v from public.decisiones_entrenador where id = 'dddddddd-0000-0000-0000-000000000001';
  insert into resultados values ('E6 la revisión guarda el resultado', v = 'Subió 2,5 kg', coalesce(v, 'null'));
end $$;
reset role;

-- ── El cliente no ve nada, ni crea ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; n int;
begin
  select count(*) into n from public.decisiones_entrenador;
  insert into resultados values ('C1 el cliente NO ve las decisiones sobre él', n = 0, n::text || ' filas');
  begin
    insert into public.decisiones_entrenador (trainer_id, client_id, tipo) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'mantener');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C2 el cliente no puede crear decisiones', ok, 'RLS');
end $$;
reset role;

-- ── El entrenador 2 no ve lo del 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.decisiones_entrenador where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('T1 otro entrenador no ve las decisiones de un cliente que no es suyo', n = 0, n::text || ' filas');
end $$;
reset role;

-- ── Anónimo: sin acceso ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform count(*) from public.decisiones_entrenador;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('A1 sin sesión no se lee nada', ok, 'revoke');
end $$;
reset role;

-- ── RGPD y cascada ──
insert into resultados select 'R1 decisiones_entrenador está en client_data_tables (exportación y borrado completo)', count(*) = 1, string_agg(tbl, ', ')
  from public.client_data_tables() where tbl = 'decisiones_entrenador';
delete from public.clientes where id = '11111111-0000-0000-0000-000000000001';
insert into resultados select 'R2 al borrar el cliente caen sus decisiones', count(*) = 0, count(*)::text || ' filas'
  from public.decisiones_entrenador where client_id = '11111111-0000-0000-0000-000000000001';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
