-- Prueba de migrations/20261029000005_valoraciones_metricas_propias.sql
-- (las valoraciones guardan los valores de las métricas propias; solo un objeto y pequeño; las de antes quedan con
-- un objeto vacío; las políticas siguen igual: otro entrenador no ve ni escribe).
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
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1');
insert into public.valoraciones (id, client_id, trainer_id, fecha) values
  ('val_antigua', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-09-01');

insert into resultados select 'V1 una valoración sin métricas queda con un objeto vacío', extra = '{}'::jsonb, extra::text from public.valoraciones where id = 'val_antigua';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false; v jsonb;
begin
  insert into public.valoraciones (id, client_id, trainer_id, fecha, extra) values
    ('val_nueva', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-29', '{"m_fc": 58, "m_cuello": 38.5}');
  select extra into v from public.valoraciones where id = 'val_nueva';
  insert into resultados values ('V2 el entrenador guarda los valores de sus métricas', (v->>'m_fc')::numeric = 58, v::text);
  begin
    insert into public.valoraciones (id, client_id, trainer_id, fecha, extra) values ('val_lista', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-29', '[1,2]');
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('V3 solo un objeto', ok, 'check');
  ok := false;
  begin
    insert into public.valoraciones (id, client_id, trainer_id, fecha, extra) values ('val_grande', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-10-29',
      jsonb_build_object('m_x', repeat('a', 5000)));
  exception when check_violation then ok := true;
  end;
  insert into resultados values ('V4 y pequeño', ok, 'check');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultados select 'P1 otro entrenador no ve las valoraciones', count(*) = 0, count(*)::text || ' filas' from public.valoraciones;
do $$
declare n int;
begin
  update public.valoraciones set extra = '{"m_fc": 1}' where id = 'val_nueva';
  get diagnostics n = row_count;
  insert into resultados values ('P2 ni las cambia', n = 0, n::text || ' filas');
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
