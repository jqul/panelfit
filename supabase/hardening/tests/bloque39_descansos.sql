-- Prueba de migrations/20261110000002_descansos.sql
-- (cada cliente solo marca o cancela su propio descanso; nadie lee ni escribe la tabla directamente).
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

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text; v uuid;
begin
  v := public.marcar_descanso('token-uno-123', 90);
  insert into resultados values ('D1 el cliente marca su descanso', v = '11111111-0000-0000-0000-000000000001', coalesce(v::text, 'nada'));

  st := 'sin error';
  begin perform 1 from public.descansos; exception when others then st := sqlstate; end;
  insert into resultados values ('D2 no puede leer la tabla directamente', st = '42501', st);

  st := 'sin error';
  begin insert into public.descansos values ('11111111-0000-0000-0000-000000000002', 'ajeno-12345', now()); exception when others then st := sqlstate; end;
  insert into resultados values ('D3 ni escribir el de otro', st = '42501', st);

  st := 'sin error';
  begin perform public.marcar_descanso('token-uno-123', 5000); exception when others then st := sqlstate; end;
  insert into resultados values ('D4 un descanso fuera de rango no vale', st = '22023', st);
end $$;

reset role;
do $$
declare t text;
begin
  select token into t from public.descansos where client_id = '11111111-0000-0000-0000-000000000001';
  insert into resultados values ('D5 queda su token', t = 'token-uno-123', coalesce(t, 'nada'));
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.marcar_descanso(null);
reset role;
do $$
declare n int;
begin
  select count(*) into n from public.descansos;
  insert into resultados values ('D6 al cancelarlo se borra', n = 0, n::text);
end $$;

set local role anon;
do $$
declare st text;
begin
  st := 'sin error';
  begin perform public.marcar_descanso('anonimo-123', 60); exception when others then st := sqlstate; end;
  insert into resultados values ('D7 sin sesión no se puede', st = '42501', st);
end $$;

reset role;
select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
