-- Prueba de migrations/20261111000001_strava.sql
-- (nadie lee los tokens de Strava desde la app; cada cliente ve solo su estado; las actividades de Strava no se repiten).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar las migraciones. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Uno', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dos', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');
-- Lo que haría la función de Edge con la clave de servicio
insert into public.strava_conexiones (client_id, athlete_id, access_token, refresh_token, expires_at, ultima_sync)
values ('11111111-0000-0000-0000-000000000001', 123, 'acceso-secreto', 'refresco-secreto', now() + interval '6 hours', now());
insert into public.actividades (client_id, fecha, deporte, duracion_s, origen, external_id)
values ('11111111-0000-0000-0000-000000000001', '2026-11-10', 'correr', 1800, 'strava', '987');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text; c boolean;
begin
  st := 'sin error';
  begin perform access_token from public.strava_conexiones; exception when others then st := sqlstate; end;
  insert into resultados values ('S1 el cliente no puede leer sus tokens', st = '42501', st);

  select conectado into c from public.strava_estado();
  insert into resultados values ('S2 pero sí sabe que está conectado', c, coalesce(c::text, 'nada'));

  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, deporte, duracion_s, origen, external_id) values ('11111111-0000-0000-0000-000000000001', '2026-11-10', 'correr', 1800, 'strava', '987');
  exception when others then st := sqlstate; end;
  insert into resultados values ('S3 la misma actividad de Strava no entra dos veces', st = '23505', st);

  st := 'sin error';
  begin insert into public.actividades (client_id, fecha, deporte, duracion_s, origen) values ('11111111-0000-0000-0000-000000000001', '2026-11-10', 'correr', 1800, 'garmin');
  exception when others then st := sqlstate; end;
  insert into resultados values ('S4 un origen desconocido no vale', st = '23514', st);
end $$;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare c boolean;
begin
  select conectado into c from public.strava_estado();
  insert into resultados values ('S5 otro cliente no aparece conectado', not c, c::text);
end $$;

set local role anon;
do $$
declare st text;
begin
  st := 'sin error';
  begin perform * from public.strava_estado(); exception when others then st := sqlstate; end;
  insert into resultados values ('S6 sin sesión no hay estado', st = '42501', st);
end $$;

reset role;
do $$
declare b boolean;
begin
  select exists (select 1 from public.client_data_tables() where tbl = 'strava_conexiones') into b;
  insert into resultados values ('S7 los tokens entran en el borrado RGPD', b, b::text);
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
