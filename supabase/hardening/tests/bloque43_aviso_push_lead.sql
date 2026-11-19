-- Prueba de migrations/20261119000030_aviso_push_lead.sql
-- (el lead guarda el resultado técnico del aviso push con valores acotados; el trigger pasa el id del lead a la función de borde y
-- no lleva datos de salud; el entrenador solo ve lo suyo y anon no accede).
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
insert into public.leads (id, trainer_id, name, email, status, created_at) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'ana@example.com', 'nuevo', 1);

do $$
declare v text; n int;
begin
  -- Los cuatro estados valen; cualquier otro (por ejemplo «llegó») se rechaza
  foreach v in array array['sin_suscripcion', 'enviado_al_proveedor', 'fallido', 'parcial'] loop
    update public.leads set aviso_push = v, aviso_push_at = 123 where id = '11111111-0000-0000-0000-000000000001';
  end loop;
  perform set_config('t.ok', 'si', true);
  insert into resultados values ('1a los cuatro estados técnicos se guardan', (select aviso_push from public.leads where id = '11111111-0000-0000-0000-000000000001') = 'parcial' and (select aviso_push_at from public.leads where id = '11111111-0000-0000-0000-000000000001') = 123, '');
  begin update public.leads set aviso_push = 'llego_al_movil' where id = '11111111-0000-0000-0000-000000000001'; v := 'aceptó';
  exception when check_violation then v := 'rechazado'; end;
  insert into resultados values ('1b un estado inventado se rechaza (no se afirma que llegó al móvil)', v = 'rechazado', v);
  update public.leads set aviso_push = null where id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('1c sin aviso anotado es null', (select aviso_push is null from public.leads where id = '11111111-0000-0000-0000-000000000001'), '');

  -- El trigger manda el id del lead a la función de borde y nada de salud
  insert into resultados values ('2a el trigger pasa lead_id y tipo a notify-lead',
    pg_get_functiondef('public.notify_new_lead()'::regprocedure) like '%''lead_id'', new.id%'
    and pg_get_functiondef('public.notify_new_lead()'::regprocedure) like '%''tipo''%', '');
  insert into resultados values ('2b el aviso no lleva respuestas ni PAR-Q',
    pg_get_functiondef('public.notify_new_lead()'::regprocedure) not like '%respuestas%' and pg_get_functiondef('public.notify_new_lead()'::regprocedure) not like '%parq%', '');
  insert into resultados values ('2c sigue sin ser ejecutable desde fuera', not has_function_privilege('anon', 'public.notify_new_lead()', 'execute') and not has_function_privilege('authenticated', 'public.notify_new_lead()', 'execute'), '');
end $$;

-- ── Otro entrenador no ve ni toca el estado del aviso ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.leads where id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('3a otro entrenador no ve el lead ni su estado de aviso', n = 0, n::text);
end $$;
reset role;

set local role anon;
do $$
declare n int;
begin
  -- En producción anon ni tiene privilegios (anon_sin_permisos_tablas); aquí, con los de por defecto, lo frena la RLS: no ve ninguna fila
  select count(*) into n from public.leads;
  insert into resultados values ('3b anon no ve ningún lead ni su estado de aviso', n = 0, n::text);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
