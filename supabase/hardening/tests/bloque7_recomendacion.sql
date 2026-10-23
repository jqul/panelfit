-- Prueba del bloque 7 de hardening/20261018_propuesta_endurecimiento.sql
-- (submit_lead atribuye la recomendación por un código derivado, no por el token).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.
--
--   1) ANTES del bloque 7: R1 y R2 deben salir en FALLO (el código derivado no
--      atribuye y el token en bruto sí: justo lo que hay que cerrar).
--   2) DESPUÉS: todos en OK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;

insert into public.entrenadores (uid, email, "displayName", approved, rol, role, slug, public_page) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer', 'mi-slug', '{"activa":true}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer', 'otro-slug', '{"activa":true}');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente Uno', 'tok-uno'),
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Cliente Dos', 'tok-dos');

-- Sin sesión (anon), como llega un visitante a la página pública.
set local role anon;
select public.submit_lead('mi-slug', 'Ana',  'a@test.local', null, 'hola', left(encode(sha256(convert_to('tok-uno', 'UTF8')), 'hex'), 16));
select public.submit_lead('mi-slug', 'Beto', 'b@test.local', null, 'hola', 'tok-uno');
select public.submit_lead('mi-slug', 'Cris', 'c@test.local', null, 'hola', left(encode(sha256(convert_to('tok-dos', 'UTF8')), 'hex'), 16));
select public.submit_lead('mi-slug', 'Dani', 'd@test.local', null, 'hola', 'no-existe');
select public.submit_lead('mi-slug', 'Eva',  'e@test.local', null, 'hola');
reset role;

insert into resultados
select 'R1 el código derivado atribuye al cliente', referred_by_client_id = '11111111-0000-0000-0000-000000000001', coalesce(referred_by_client_id::text, 'sin atribuir')
from public.leads where name = 'Ana'
union all
select 'R2 el token en bruto ya no atribuye', referred_by_client_id is null, coalesce(referred_by_client_id::text, 'sin atribuir')
from public.leads where name = 'Beto'
union all
select 'R3 el código de un cliente de otro entrenador no atribuye', referred_by_client_id is null, coalesce(referred_by_client_id::text, 'sin atribuir')
from public.leads where name = 'Cris'
union all
select 'R4 un código inválido o ausente no impide guardar el lead',
  (select count(*) from public.leads) = 5 and (select count(*) from public.leads where name in ('Dani', 'Eva') and referred_by_client_id is null) = 2,
  (select count(*) from public.leads)::text || ' leads';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
