-- Prueba de migrations/20261105000003_asistencia.sql
-- (el entrenador marca "no vino" en una cita y pasa lista en una clase; el cliente no puede marcarse a sí mismo ni
-- tocar la asistencia; otro entrenador tampoco).
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
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001');
insert into public.citas (id, trainer_id, client_id, title, start_at, end_at, status) values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Ayer', now() - interval '1 day', now() - interval '23 hours', 'confirmada');
insert into public.clases (id, trainer_id, titulo, start_at, end_at, aforo) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Funcional', now() + interval '1 day', now() + interval '25 hours', 5);
insert into public.clase_plazas (clase_id, client_id, estado) values ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'reservada');
-- La clase ya pasó (se mueve después de reservar: con la fecha pasada no se podría reservar)
update public.clases set start_at = now() - interval '2 days', end_at = now() - interval '47 hours';

-- ── El cliente no se marca ni toca la asistencia ──
set local role authenticated;
select pg_temp.como('cccccccc-0000-0000-0000-000000000001');
do $$
declare st text := 'sin error'; n integer;
begin
  begin update public.citas set status = 'completada' where id = 'd0000000-0000-0000-0000-000000000001';
  exception when others then st := sqlstate; end;
  insert into resultados values ('S1 el cliente no puede marcar su cita como asistida', st = '42501', st);
  update public.clase_plazas set asistio = true;
  get diagnostics n = row_count;
  insert into resultados values ('S2 ni pasar lista en su clase', n = 0, n::text);
end $$;

-- ── Otro entrenador tampoco ──
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
do $$
declare a integer; b integer;
begin
  update public.citas set status = 'ausente' where id = 'd0000000-0000-0000-0000-000000000001';
  get diagnostics a = row_count;
  update public.clase_plazas set asistio = false;
  get diagnostics b = row_count;
  insert into resultados values ('S3 otro entrenador no toca ni citas ni listas ajenas', a = 0 and b = 0, a || ' / ' || b);
end $$;

-- ── El entrenador pasa lista ──
select pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare st text := 'sin error'; e text; v boolean;
begin
  begin update public.citas set status = 'ausente' where id = 'd0000000-0000-0000-0000-000000000001';
  exception when others then st := sqlstate; end;
  select status into e from public.citas where id = 'd0000000-0000-0000-0000-000000000001';
  insert into resultados values ('S4 el entrenador marca que no vino', st = 'sin error' and e = 'ausente', st || ' / ' || coalesce(e, 'null'));
  update public.clase_plazas set asistio = true where clase_id = 'e0000000-0000-0000-0000-000000000001';
  select asistio into v from public.clase_plazas where clase_id = 'e0000000-0000-0000-0000-000000000001';
  insert into resultados values ('S5 y pasa lista en su clase', v, coalesce(v::text, 'null'));
  st := 'sin error';
  begin update public.citas set status = 'otra cosa' where id = 'd0000000-0000-0000-0000-000000000001';
  exception when others then st := sqlstate; end;
  insert into resultados values ('S6 un estado que no existe no vale', st = '23514', st);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
