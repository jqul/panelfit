-- Prueba de migrations/20261105000002_sesiones_online.sql
-- (solo enlaces https sin espacios; el enlace de una clase solo llega a quien tiene plaza, no a la lista de espera; una
-- clase online se sigue viendo mientras dura; el enlace de una cita solo lo ve su cliente).
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

-- ── Enlaces que no valen ──
do $$
declare st text;
begin
  st := 'sin error';
  begin insert into public.citas (trainer_id, client_id, title, start_at, end_at, enlace) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'X', now(), now() + interval '1 hour', 'http://meet.google.com/abc');
  exception when others then st := sqlstate; end;
  insert into resultados values ('O1 un enlace sin https no se guarda', st = '23514', st);
  st := 'sin error';
  begin insert into public.clases (trainer_id, titulo, start_at, end_at, aforo, enlace) values ('aaaaaaaa-0000-0000-0000-000000000001', 'X', now() + interval '1 day', now() + interval '25 hours', 5, 'https://zoom.us/j/1 ?pwd=x');
  exception when others then st := sqlstate; end;
  insert into resultados values ('O2 ni uno con espacios', st = '23514', st);
end $$;

-- ── Una clase online de 1 plaza dentro de 2 días: Ana con plaza, Bea en espera; y una online que está pasando ahora ──
insert into public.clases (id, trainer_id, titulo, start_at, end_at, aforo, enlace) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Yoga online', now() + interval '2 days', now() + interval '2 days 1 hour', 1, 'https://meet.google.com/abc-defg-hij'),
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'En directo', now() - interval '10 minutes', now() + interval '50 minutes', 5, 'https://zoom.us/j/123'),
  ('e0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Presencial empezada', now() - interval '10 minutes', now() + interval '50 minutes', 5, null);
insert into public.clase_plazas (clase_id, client_id, estado, created_at) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'reservada', now() - interval '2 hours'),
  ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'reservada', now() - interval '1 hour'), -- llena: a la espera
  ('e0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'reservada', now() - interval '1 day'),
  ('e0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'reservada', now() - interval '1 day');
insert into public.citas (id, trainer_id, client_id, title, start_at, end_at, status, enlace) values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Revisión', now() + interval '1 day', now() + interval '25 hours', 'confirmada', 'https://meet.google.com/xyz');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare j jsonb; k jsonb; e text;
begin
  j := public.clases_cliente(14);
  select x into k from jsonb_array_elements(j) x where x->>'titulo' = 'Yoga online';
  insert into resultados values ('O3 con plaza recibe el enlace', (k->>'online')::boolean and k->>'enlace' = 'https://meet.google.com/abc-defg-hij', coalesce(k::text, 'null'));
  insert into resultados values ('O4 la online que está pasando se sigue viendo (para entrar)', exists (select 1 from jsonb_array_elements(j) x where x->>'titulo' = 'En directo'), '');
  insert into resultados values ('O5 la presencial ya empezada no sale', not exists (select 1 from jsonb_array_elements(j) x where x->>'titulo' = 'Presencial empezada'), '');
  select enlace into e from public.citas where id = 'd0000000-0000-0000-0000-000000000001';
  insert into resultados values ('O6 el cliente ve el enlace de su cita', e = 'https://meet.google.com/xyz', coalesce(e, 'null'));
end $$;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare j jsonb; k jsonb; n integer;
begin
  j := public.clases_cliente(14);
  select x into k from jsonb_array_elements(j) x where x->>'titulo' = 'Yoga online';
  insert into resultados values ('O7 en la lista de espera sabe que es online pero no recibe el enlace',
    (k->>'online')::boolean and k->>'mi_estado' = 'espera' and (k->'enlace' is null or k->'enlace' = 'null'::jsonb), coalesce(k::text, 'null'));
  insert into resultados values ('O8 sin plaza no ve la online que está pasando', not exists (select 1 from jsonb_array_elements(j) x where x->>'titulo' = 'En directo'), '');
  select count(*) into n from public.citas where id = 'd0000000-0000-0000-0000-000000000001';
  insert into resultados values ('O9 otro cliente no ve la cita ni su enlace', n = 0, n::text);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
