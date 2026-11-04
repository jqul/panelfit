-- Prueba de migrations/20261104000005_checkin_configurable.sql
-- (las escalas que no se preguntan quedan vacías; las respuestas propias van en extra, siempre de 1 a 5; cada check-in
-- responde algo; el cliente solo escribe el suyo, como antes).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bea', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text;
begin
  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, sleep, motivation, extra)
    values ('11111111-0000-0000-0000-000000000001', '2026-11-01', 4, 3, '{"x1": 5}');
  exception when others then st := sqlstate; end;
  insert into resultados values ('K1 solo sueño y energía, con una pregunta propia', st = 'sin error', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, sleep, soreness, stress, motivation)
    values ('11111111-0000-0000-0000-000000000001', '2026-11-02', 3, 3, 3, 3);
  exception when others then st := sqlstate; end;
  insert into resultados values ('K2 el check-in de siempre sigue valiendo', st = 'sin error', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date) values ('11111111-0000-0000-0000-000000000001', '2026-11-03');
  exception when others then st := sqlstate; end;
  insert into resultados values ('K3 un check-in sin ninguna respuesta no se guarda', st = '23514', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, extra) values ('11111111-0000-0000-0000-000000000001', '2026-11-04', '{"x1": 9}');
  exception when others then st := sqlstate; end;
  insert into resultados values ('K4 una respuesta propia fuera de 1-5 no se guarda', st = '23514', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, extra) values ('11111111-0000-0000-0000-000000000001', '2026-11-05', '{"x1": "mucho"}');
  exception when others then st := sqlstate; end;
  insert into resultados values ('K5 ni una que no sea un número', st = '23514', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, extra) values ('11111111-0000-0000-0000-000000000001', '2026-11-06', '[1,2]');
  exception when others then st := sqlstate; end;
  insert into resultados values ('K6 extra tiene que ser un objeto', st = '23514', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, sleep) values ('11111111-0000-0000-0000-000000000001', '2026-11-07', 7);
  exception when others then st := sqlstate; end;
  insert into resultados values ('K7 las escalas de siempre siguen entre 1 y 5', st = '23514', st);

  st := 'sin error';
  begin insert into public.readiness_checkins ("clientId", date, sleep) values ('11111111-0000-0000-0000-000000000002', '2026-11-01', 3);
  exception when others then st := sqlstate; end;
  insert into resultados values ('K8 no escribe el check-in de otro cliente', st = '42501', st);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
