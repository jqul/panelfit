-- Prueba de migrations/20261118000003_clientes_notas_y_alertas_privadas.sql
-- (el cliente lee su fila de clientes sin notas ni alertas aunque el entrenador intente guardarlas ahí; observaciones y alertas
-- viven en notas_privadas_cliente: solo entrenador o equipo; los upserts parciales no se pisan entre sí).
-- La migración de datos se prueba en el runner (run-pglite-clientes-notas-alertas.mjs), que siembra antes de aplicarla.
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000b2', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-0000000000d1', 'cliente-d1@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Cliente con cuenta', 'tok-d1', 'cccccccc-0000-0000-0000-0000000000d1');

-- ── El entrenador intenta guardar notas y alertas en clientes (lo que haría una pestaña con la app antigua) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
declare n int; v text; a jsonb;
begin
  update public.clientes set notas_privadas = 'SECRETO', alerts = '[{"id":"x","note":"SECRETO"}]'::jsonb where id = '11111111-0000-0000-0000-0000000000d1';
  select notas_privadas, alerts into v, a from public.clientes where id = '11111111-0000-0000-0000-0000000000d1';
  insert into resultados values ('T1 guardar notas_privadas/alerts en clientes ya no deja nada', v = '' and a = '[]'::jsonb, coalesce(v, 'null') || ' / ' || a::text);

  insert into public.clientes (id, "trainerId", name, token, notas_privadas, alerts)
    values ('11111111-0000-0000-0000-0000000000d2', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Alta con notas', 'tok-d2', 'SECRETO', '[{"id":"y"}]'::jsonb);
  select notas_privadas, alerts into v, a from public.clientes where id = '11111111-0000-0000-0000-0000000000d2';
  insert into resultados values ('T2 un alta con notas_privadas/alerts tampoco las guarda', v = '' and a = '[]'::jsonb, coalesce(v, 'null'));

  update public.clientes set phone = '600 000' where id = '11111111-0000-0000-0000-0000000000d1';
  select count(*) into n from public.clientes where id = '11111111-0000-0000-0000-0000000000d1' and phone = '600 000';
  insert into resultados values ('T3 el disparador no estorba al resto de actualizaciones', n = 1, n::text);

  -- Lo nuevo: sus observaciones y alertas, con upserts parciales que no se pisan
  insert into public.notas_privadas_cliente (client_id, trainer_id, notas) values ('11111111-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Notas de la ficha');
  insert into public.notas_privadas_cliente (client_id, trainer_id, observaciones) values ('11111111-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Observaciones')
    on conflict (client_id) do update set observaciones = excluded.observaciones;
  insert into public.notas_privadas_cliente (client_id, trainer_id, alertas) values ('11111111-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000a1', '[{"id":"a1","note":"Llamar"}]'::jsonb)
    on conflict (client_id) do update set alertas = excluded.alertas;
  select count(*) into n from public.notas_privadas_cliente where client_id = '11111111-0000-0000-0000-0000000000d1'
    and notas = 'Notas de la ficha' and observaciones = 'Observaciones' and alertas = '[{"id":"a1","note":"Llamar"}]'::jsonb;
  insert into resultados values ('E1 notas, observaciones y alertas se guardan por separado sin pisarse', n = 1, n::text);
end $$;
reset role;

-- ── El cliente: su fila de clientes llega limpia y la tabla privada no la ve ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare n int; v text; a jsonb; ok boolean := false;
begin
  select notas_privadas, alerts into v, a from public.clientes where id = '11111111-0000-0000-0000-0000000000d1';
  insert into resultados values ('C1 el cliente lee su fila de clientes y notas_privadas/alerts van vacías', found and v = '' and a = '[]'::jsonb, coalesce(v, 'null'));
  select count(*) into n from public.notas_privadas_cliente;
  insert into resultados values ('C2 el cliente NO ve observaciones ni alertas (tabla solo entrenador)', n = 0, n::text || ' filas');
  begin
    update public.notas_privadas_cliente set alertas = '[]'::jsonb where client_id = '11111111-0000-0000-0000-0000000000d1';
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C3 el cliente no puede modificarlas', ok, 'RLS');
end $$;
reset role;

-- ── El otro entrenador no ve lo del 1 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from public.notas_privadas_cliente where client_id = '11111111-0000-0000-0000-0000000000d1';
  insert into resultados values ('O1 otro entrenador no ve observaciones ni alertas de un cliente que no es suyo', n = 0, n::text || ' filas');
  begin
    insert into public.notas_privadas_cliente (client_id, trainer_id, alertas) values ('11111111-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-0000000000b2', '[]'::jsonb);
  exception when insufficient_privilege or unique_violation then ok := true;
  end;
  insert into resultados values ('O2 ni escribir sobre él', ok, 'RLS');
end $$;
reset role;

-- ── Las alertas deben ser una lista ──
do $$
declare ok boolean := false;
begin
  begin
    update public.notas_privadas_cliente set alertas = '{"a":1}'::jsonb where client_id = '11111111-0000-0000-0000-0000000000d1';
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('K1 alertas debe ser una lista JSON', ok, 'check');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
