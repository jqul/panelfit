-- Prueba del bloque 1 de hardening/20261018_propuesta_endurecimiento.sql
-- (trigger protect_entrenadores_privileged_columns).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.
--
-- Úsalo dos veces:
--   1) ANTES de aplicar el bloque 1: los casos A1 a A4 deben salir en FALLO
--      (demuestran la vulnerabilidad) y B1, C1, D1, E1 y A5 en OK.
--   2) DESPUÉS de aplicarlo: todos deben salir en OK.
--
-- Cómo simula usuarios: cambia al rol `authenticated` y fija los claims JWT, que
-- es lo que lee auth.uid() cuando la petición llega por la API.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

-- El alta de un entrenador dispara un email de bienvenida (pg_net). Dentro de esta
-- transacción se desactiva el trigger para no encolar nada, aunque se haga ROLLBACK.
alter table public.entrenadores disable trigger welcome_email_trigger;

-- ── Datos de prueba (como postgres: auth.uid() es NULL, el trigger no actúa) ──
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'pendiente@test.local', 'Pendiente', false, 'trainer', 'trainer',
     '{"planName":"free","clientLimit":3,"tier":"basic","brandName":"Marca"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'otro@test.local', 'Otro', true, 'trainer', 'trainer', '{}'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@test.local', 'Admin', true, 'super_admin', 'trainer', '{}');

-- ── D · Otro entrenador intenta tocar la fila ajena (RLS: 0 filas) ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
update public.entrenadores set approved = true where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;

insert into resultados
select 'D1 otro entrenador no modifica filas ajenas', approved = false, 'approved=' || approved
from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── A · Ataques de un entrenador pendiente sobre su propia fila ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

update public.entrenadores set approved = true where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.entrenadores set rol = 'super_admin' where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.entrenadores set profile = profile || '{"planName":"studio","clientLimit":99999,"tier":"pro"}'
  where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── B · Cambios legítimos del propio entrenador ──
update public.entrenadores
  set "displayName" = 'Nombre nuevo', profile = profile || '{"brandName":"Marca nueva","brandColor":"#112233"}'
  where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

reset role;

insert into resultados
select 'A1 no puede aprobarse a sí mismo', approved = false, 'approved=' || approved from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'A2 no puede hacerse super_admin', rol = 'trainer', 'rol=' || rol from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'A3 no puede cambiarse plan ni límite',
  profile->>'planName' = 'free' and (profile->>'clientLimit')::int = 3 and profile->>'tier' = 'basic',
  profile::text from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'B1 sí puede cambiar nombre y marca',
  "displayName" = 'Nombre nuevo' and profile->>'brandName' = 'Marca nueva' and profile->>'brandColor' = '#112233',
  "displayName" || ' / ' || (profile->>'brandName') from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── A4 · Alta nueva: no puede nacer aprobado, super_admin ni con plan ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile)
  values ('dddddddd-0000-0000-0000-000000000004', 'nuevo@test.local', 'Nuevo', true, 'super_admin', 'super_admin',
          '{"planName":"studio","clientLimit":99999,"brandName":"Mi marca"}');
reset role;

insert into resultados
select 'A4 el alta propia sale sin privilegios',
  approved = false and rol = 'trainer' and role = 'trainer' and profile->>'planName' is null and profile->>'clientLimit' is null,
  'approved=' || approved || ' rol=' || rol || ' profile=' || profile::text
from public.entrenadores where uid = 'dddddddd-0000-0000-0000-000000000004'
union all
select 'A5 el alta conserva datos no protegidos', profile->>'brandName' = 'Mi marca', profile::text
from public.entrenadores where uid = 'dddddddd-0000-0000-0000-000000000004';

-- ── C · El super admin sí puede aprobar y asignar plan ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
update public.entrenadores
  set approved = true, profile = profile || '{"planName":"pro","clientLimit":50,"tier":"pro"}'
  where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;

insert into resultados
select 'C1 el super admin aprueba y asigna plan',
  approved = true and profile->>'planName' = 'pro' and (profile->>'clientLimit')::int = 50 and profile->>'tier' = 'pro',
  'approved=' || approved || ' ' || (profile::text)
from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── E · Sin JWT (service role / Edge Functions / triggers internos): sin restricción ──
select set_config('request.jwt.claims', '', true);
update public.entrenadores set approved = false, rol = 'trainer' where uid = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into resultados
select 'E1 service role puede cambiar columnas protegidas', approved = false and rol = 'trainer', 'approved=' || approved
from public.entrenadores where uid = 'aaaaaaaa-0000-0000-0000-000000000001';

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
