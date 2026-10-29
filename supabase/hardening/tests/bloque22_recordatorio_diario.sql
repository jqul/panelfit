-- Prueba de migrations/20261029000002_recordatorio_diario.sql
-- (el cliente enciende y apaga solo su aviso; nadie ve ni escribe recordatorios_enviados; uno por día; el lanzador
-- solo llama a la función a las 18 y con el secreto; RGPD y cascada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración (sin su línea de cron.schedule: PGlite no tiene cron).
-- net.http_post se sustituye por un registro de llamadas. Todo termina en ROLLBACK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

create schema if not exists net;
create table public.llamadas_http (url text, headers jsonb, body jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
 returns bigint language plpgsql as $f$
begin
  insert into public.llamadas_http values (url, headers, body);
  return 1;
end $f$;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'),
  ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 1', 'tok-1', 'cccccccc-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente 2', 'tok-2', 'cccccccc-0000-0000-0000-000000000002');

insert into resultados select 'A1 el aviso viene encendido por defecto', bool_and(recordatorio_diario), count(*)::text || ' clientes' from public.clientes;
insert into resultados select 'A0 get_client_by_token sigue funcionando y trae el aviso', count(*) = 1 and bool_and(recordatorio_diario), count(*)::text || ' fila'
  from public.get_client_by_token('tok-1');
insert into resultados select 'A2 el secreto existe y es largo', length(secret) >= 60, length(secret)::text || ' caracteres'
  from public.internal_webhook_secrets where name = 'recordatorio_diario';

-- ── El cliente 1 apaga su aviso; no puede tocar el del 2 ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare cambio boolean; n int; ok boolean := false;
begin
  cambio := public.recordatorio_diario_cliente(false);
  insert into resultados values ('B1 el cliente apaga su aviso', cambio, cambio::text);
  begin
    select count(*) into n from public.recordatorios_enviados;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('B2 el cliente no puede leer recordatorios_enviados', ok, 'sin permiso');
  ok := false;
  begin
    insert into public.recordatorios_enviados (client_id, fecha) values ('11111111-0000-0000-0000-000000000001', '2026-11-03');
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('B3 el cliente no puede apuntar envíos', ok, 'sin permiso');
end $$;
reset role;
insert into resultados select 'B4 solo cambió el suyo', count(*) = 1 and bool_and(id = '11111111-0000-0000-0000-000000000001'), string_agg(name, ', ')
  from public.clientes where not recordatorio_diario;

-- ── Sin sesión, nada; y el entrenador no puede llamar al lanzador ──
set local role anon;
do $$
declare ok boolean := false;
begin
  begin
    perform public.recordatorio_diario_cliente(true);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C1 sin sesión no se puede cambiar el aviso', ok, 'sin permiso');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare ok boolean := false;
begin
  begin
    perform public.lanzar_recordatorio_diario(18);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados values ('C2 un usuario no puede lanzar el aviso', ok, 'sin permiso');
end $$;
reset role;

-- ── El lanzador: solo a las 18, con el secreto ──
insert into resultados select 'L1 a las 17 no llama a nadie', not public.lanzar_recordatorio_diario(17) and (select count(*) = 0 from public.llamadas_http), '17 h';
create temp table lanzado on commit drop as select public.lanzar_recordatorio_diario(18) as ok;
-- (en otra sentencia: la misma no ve la llamada que acaba de apuntar)
insert into resultados select 'L2 a las 18 llama a la función con el secreto',
  (select ok from lanzado)
  and (select count(*) = 1 from public.llamadas_http where url like '%/functions/v1/recordatorio-diario'
       and headers->>'Authorization' = 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'recordatorio_diario')),
  '18 h';

-- ── Uno por día; RGPD y cascada ──
insert into public.recordatorios_enviados (client_id, fecha) values ('22222222-0000-0000-0000-000000000002', '2026-11-03');
do $$
declare ok boolean := false;
begin
  begin
    insert into public.recordatorios_enviados (client_id, fecha) values ('22222222-0000-0000-0000-000000000002', '2026-11-03');
  exception when unique_violation then ok := true;
  end;
  insert into resultados values ('D1 no se apunta dos veces el mismo día', ok, 'clave primaria');
end $$;
insert into resultados select 'R1 recordatorios_enviados está en client_data_tables', count(*) = 1, 'RGPD'
  from public.client_data_tables() where tbl = 'recordatorios_enviados';
delete from public.clientes where id = '22222222-0000-0000-0000-000000000002';
insert into resultados select 'R2 borrar un cliente borra sus envíos', count(*) = 0, 'cascada' from public.recordatorios_enviados;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
