-- Prueba de migrations/20261105000001_avisos_clases.sql
-- (quien pasa de la espera a tener plaza queda por avisar y se llama a la función al momento; el lanzador también
-- llama por las clases que empiezan en una hora; sin nada pendiente no llama; nadie lo lanza desde fuera).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar las migraciones (sin su cron.schedule: PGlite no tiene cron).
-- net.http_post se sustituye por un registro de llamadas. Todo termina en ROLLBACK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

create schema if not exists net;
create table public.llamadas_http (url text, headers jsonb, body jsonb);
grant all on public.llamadas_http to public;
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
 returns bigint language plpgsql as $f$
begin
  insert into public.llamadas_http values (url, headers, body);
  return 1;
end $f$;
grant usage on schema net to public;
grant execute on function net.http_post(text, jsonb, jsonb, jsonb, int) to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bea', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

-- Una clase de 1 plaza dentro de 3 días: Ana tiene plaza, Bea espera
insert into public.clases (id, trainer_id, titulo, start_at, end_at, aforo) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Funcional', now() + interval '3 days', now() + interval '3 days 1 hour', 1);
insert into public.clase_plazas (clase_id, client_id, estado, created_at) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'reservada', now() - interval '2 hours'),
  ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'reservada', now() - interval '1 hour'); -- entra como espera (llena)
insert into public.internal_webhook_secrets (name, secret) values ('recordatorio_cita', 'secreto-e2e') on conflict (name) do nothing;

do $$
declare n integer; e text; p boolean;
begin
  select estado, aviso_plaza_pendiente into e, p from public.clase_plazas where client_id = '11111111-0000-0000-0000-000000000002';
  insert into resultados values ('A1 la que entra en la espera no queda por avisar', e = 'espera' and not p, e || ' / ' || p);
  select count(*) into n from public.llamadas_http;
  insert into resultados values ('A2 sin nada pendiente (clase en 3 días) no se llama a la función', n = 0 and not public.lanzar_recordatorio_citas(), n::text);
end $$;

-- Ana cancela: Bea pasa a tener plaza, queda por avisar y se llama a la función al momento
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.cancelar_clase('e0000000-0000-0000-0000-000000000001');
reset role;
do $$
declare n integer; e text; p boolean; url text;
begin
  select estado, aviso_plaza_pendiente into e, p from public.clase_plazas where client_id = '11111111-0000-0000-0000-000000000002';
  insert into resultados values ('A3 al pasar de la espera a tener plaza queda por avisar', e = 'reservada' and p, e || ' / ' || p);
  select count(*), max(l.url) into n, url from public.llamadas_http l;
  insert into resultados values ('A4 y se llama a la función de avisos en ese momento', n = 1 and url like '%/functions/v1/recordatorio-cita', n || ' ' || coalesce(url, ''));
  insert into resultados values ('A5 con un aviso pendiente, el lanzador también llama', public.lanzar_recordatorio_citas(), '');
end $$;

-- Ya avisada (lo marca la función): sin nada pendiente, no llama
update public.clase_plazas set aviso_plaza_pendiente = false;
truncate public.llamadas_http;
do $$
begin
  insert into resultados values ('A6 avisada, el lanzador no llama', not public.lanzar_recordatorio_citas(), '');
end $$;

-- Una clase que empieza dentro de una hora: el lanzador llama por el recordatorio, una vez recordada ya no
insert into public.clases (id, trainer_id, titulo, start_at, end_at, aforo) values
  ('e0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'HIIT', now() + interval '50 minutes', now() + interval '110 minutes', 5);
insert into public.clase_plazas (clase_id, client_id, estado) values ('e0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'reservada');
do $$
begin
  insert into resultados values ('A7 clase dentro de una hora con plaza sin recordar: llama', public.lanzar_recordatorio_citas(), '');
  update public.clase_plazas set recordada_at = now() where clase_id = 'e0000000-0000-0000-0000-000000000002';
  insert into resultados values ('A8 ya recordada: no llama', not public.lanzar_recordatorio_citas(), '');
  update public.clase_plazas set recordada_at = null where clase_id = 'e0000000-0000-0000-0000-000000000002';
  update public.clases set cancelada = true where id = 'e0000000-0000-0000-0000-000000000002';
  insert into resultados values ('A9 clase cancelada: no llama', not public.lanzar_recordatorio_citas(), '');
end $$;

-- Nadie lo lanza desde la app
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text := 'sin error';
begin
  begin perform public.lanzar_recordatorio_citas(); exception when others then st := sqlstate; end;
  insert into resultados values ('A10 el entrenador no puede lanzarlo', st = '42501', st);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
