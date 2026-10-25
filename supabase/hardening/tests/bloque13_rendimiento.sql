-- Prueba de migrations/20261025000004_rendimiento_politicas_e_indices.sql
-- (el rendimiento mejora SIN cambiar quién ve o escribe qué en plan_history y weekly_reviews).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2');
insert into public.plan_history (id, "clientId", plan, note, published_by) values
  ('b1111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '{}', 'de 1', 't'),
  ('b2222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '{}', 'de 2', 't');

-- ── El entrenador 1 solo ve lo suyo, y solo puede escribir sobre sus clientes ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultados select 'W1 el entrenador ve su historial y no el de otro', count(*) = 1 and bool_and(note = 'de 1'), count(*)::text || ' filas' from public.plan_history;
do $$
declare ok boolean := false;
begin
  begin
    insert into public.plan_history (id, "clientId", plan, note, published_by) values ('b3333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', '{}', 'intruso', 't');
  exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('W2 no puede escribir en el historial de un cliente ajeno', ok, case when ok then 'denegado' else 'pudo escribir' end);
  begin
    insert into public.plan_history (id, "clientId", plan, note, published_by) values ('b4444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '{}', 'propio', 't');
    insert into resultados values ('W3 sí puede escribir en el de su cliente', true, 'ok');
  exception when others then insert into resultados values ('W3 sí puede escribir en el de su cliente', false, sqlerrm); end;
end $$;
reset role;

-- ── Sin sesión no se ve nada ──
select set_config('request.jwt.claims', '{"role":"anon"}', true); -- sin "sub": nadie ha iniciado sesión
set local role anon;
do $$
declare ok boolean := false; n int := -1;
begin
  -- Sin sesión no se ve nada: o el permiso está denegado (bloque 6) o la política devuelve 0 filas.
  begin select count(*) into n from public.plan_history; ok := (n = 0); exception when insufficient_privilege then ok := true; end;
  insert into resultados values ('W4 sin sesión no se ve ninguna fila', ok, case when n = -1 then 'denegado' else n::text || ' filas' end);
end $$;
reset role;

-- ── Lo que cambia: el texto de las políticas y los índices ──
insert into resultados select 'W5 las dos políticas evalúan auth.uid() una vez por consulta',
  bool_and(coalesce(qual, '') like '%SELECT auth.uid()%' and coalesce(with_check, '') like '%SELECT auth.uid()%'),
  string_agg(tablename || '=' || (coalesce(qual, '') like '%SELECT auth.uid()%')::text, ', ')
  from pg_policies where schemaname = 'public' and policyname in ('trainer manages own plan_history', 'trainer manages own weekly_reviews');
insert into resultados select 'W6 las dos claves foráneas tienen índice', count(*) = 2, count(*)::text || ' índices'
  from pg_indexes where schemaname = 'public' and indexname in ('idx_fv_profile_trials_trainer_id', 'idx_leads_referred_by_client_id');

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
