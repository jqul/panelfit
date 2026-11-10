-- Prueba de migrations/20261110000003_actividades.sql
-- (entrenos del reloj: los ve y los sube el cliente, su entrenador o el equipo; nadie más; entran en el RGPD).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar las migraciones. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Uno', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Dos', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text;
begin
  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, inicio, deporte, duracion_s, distancia_m, fc_media)
    values ('11111111-0000-0000-0000-000000000001', '2026-11-10', '2026-11-10T08:00:00Z', 'correr', 3000, 10000, 150);
  exception when others then st := sqlstate; end;
  insert into resultados values ('A1 el cliente sube su entreno', st = 'sin error', st);

  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, inicio, deporte, duracion_s) values ('11111111-0000-0000-0000-000000000001', '2026-11-10', '2026-11-10T08:00:00Z', 'correr', 3000);
  exception when others then st := sqlstate; end;
  insert into resultados values ('A2 el mismo entreno no se sube dos veces', st = '23505', st);

  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, deporte, duracion_s) values ('11111111-0000-0000-0000-000000000002', '2026-11-10', 'bici', 600);
  exception when others then st := sqlstate; end;
  insert into resultados values ('A3 no puede subir uno a otro cliente', st = '42501', st);

  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, deporte, duracion_s) values ('11111111-0000-0000-0000-000000000001', '2026-11-10', 'patinaje', 600);
  exception when others then st := sqlstate; end;
  insert into resultados values ('A4 un deporte desconocido no vale', st = '23514', st);
end $$;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.actividades;
  insert into resultados values ('A5 su entrenador lo ve', n = 1, n::text);
end $$;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.actividades;
  insert into resultados values ('A6 otro entrenador no', n = 0, n::text);
end $$;

reset role;
do $$
declare b boolean;
begin
  select exists (select 1 from public.client_data_tables() where tbl = 'actividades') into b;
  insert into resultados values ('A7 entran en el RGPD', b, b::text);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
