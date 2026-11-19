-- Prueba de migrations/20261119000010_solicitud_revision_aviso.sql
-- (el push dice de qué tipo es el aviso; recordatorio propio y único para las solicitudes «a revisar»; la purga de 60 días borra
-- también las «a revisar» salvo las de seguimiento autorizado; solo el dueño autoriza).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.reg(p_caso text, p_ok boolean, p_detalle text default '') returns void language sql as
  $f$ insert into resultados values (p_caso, coalesce(p_ok, false), p_detalle) $f$;
grant execute on function pg_temp.reg(text, boolean, text) to public;

-- pg_net no existe en PGlite: se sustituye por un registro de las llamadas
create schema if not exists net;
create table public.llamadas_push (id serial, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language plpgsql as
  $f$ begin insert into public.llamadas_push (body) values (body); return 1; end $f$;
insert into public.internal_webhook_secrets (name, secret) values ('new_lead', 'secreto-de-prueba') on conflict (name) do update set secret = excluded.secret;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');

-- Un lead (con su solicitud si es de programación), con created_at de hace p_horas
create function pg_temp.sol(p_id text, p_trainer text, p_status text, p_horas numeric, p_origen text default 'programacion') returns void language plpgsql as $f$
declare l uuid := ('00000000-0000-0000-0000-0000000000' || p_id)::uuid;
begin
  insert into public.leads (id, trainer_id, name, email, message, status, origen, created_at)
  values (l, p_trainer::uuid, 'Lead ' || p_id, 'l' || p_id || '@example.com', 'Solicitud de programación inicial', p_status, p_origen,
          (extract(epoch from now()) * 1000)::bigint - (p_horas * 3600000)::bigint);
  if p_origen = 'programacion' then
    insert into public.solicitudes_programacion (lead_id, trainer_id, clave_envio, consentimiento_salud, consentimiento_asistente, consentimiento_version, respuestas, parq, parq_alarma, preparar_borrador)
    values (l, p_trainer::uuid, gen_random_uuid(), true, true, 'v', '{"molestias_detalle": "dato de salud"}', '[true,false,false,false,false,false,false]', p_status = 'revisar', false);
  end if;
end $f$;

-- ═══ 1. El push dice de qué tipo es (sin datos de salud) ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001';
begin
  perform pg_temp.sol('01', t1, 'revisar', 0);
  perform pg_temp.sol('02', t1, 'nuevo', 0);
  perform pg_temp.sol('03', t1, 'nuevo', 0, 'pagina');
  perform pg_temp.reg('1a una solicitud con alarma avisa con tipo «revision»', (select body ->> 'tipo' from public.llamadas_push where body ->> 'name' = 'Lead 01') = 'revision', '');
  perform pg_temp.reg('1b una solicitud normal avisa con tipo «solicitud»', (select body ->> 'tipo' from public.llamadas_push where body ->> 'name' = 'Lead 02') = 'solicitud', '');
  perform pg_temp.reg('1c un contacto de la página sigue con tipo «contacto»', (select body ->> 'tipo' from public.llamadas_push where body ->> 'name' = 'Lead 03') = 'contacto', '');
  perform pg_temp.reg('1d el aviso solo lleva trainer_id, nombre y tipo (nada de salud)',
    (select count(*) from public.llamadas_push) = 3 and not exists (select 1 from public.llamadas_push p where (select array_agg(k order by k) from jsonb_object_keys(p.body) k) <> array['name', 'tipo', 'trainer_id']), '');
  delete from public.leads;
  delete from public.llamadas_push;
end $$;

-- ═══ 2. Recordatorio específico de «a revisar» ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; n int; r record;
begin
  perform pg_temp.sol('11', t1, 'revisar', 25);               -- toca
  perform pg_temp.sol('12', t1, 'revisar', 2);                -- demasiado reciente
  perform pg_temp.sol('13', t1, 'nuevo', 30);                 -- «nuevo»: lo recuerda el de contactos sin contestar, no este
  perform pg_temp.sol('14', t1, 'revisar', 24 * 20);          -- de hace 20 días: ya no se reclama
  perform pg_temp.sol('15', t1, 'nuevo', 30, 'pagina');       -- de la página pública
  delete from public.llamadas_push;
  n := public.recordar_solicitudes_revision(3);
  perform pg_temp.reg('2a fuera de horario (3:00) no avisa', n = 0 and (select count(*) from public.llamadas_push) = 0, n::text);
  n := public.recordar_solicitudes_revision(10);
  perform pg_temp.reg('2b avisa solo de la «a revisar» de más de un día', n = 1 and (select recordado_at is not null from public.leads where email = 'l11@example.com'), n::text);
  perform pg_temp.reg('2c ni la reciente, ni la «nuevo», ni la vieja, ni la de la página', (select count(*) from public.leads where recordado_at is not null) = 1, '');
  select * into r from public.notificaciones where id = 'revision_recuerdo_00000000-0000-0000-0000-000000000011';
  perform pg_temp.reg('2d deja su notificación, con título propio y sin datos de salud', r.titulo = 'Pendiente de revisión personal: Lead 11' and r.mensaje = 'Lleva más de un día esperando tu revisión' and r.trainer_id = t1, coalesce(r.titulo, 'sin fila'));
  perform pg_temp.reg('2e pide el push con tipo «revision» y recordatorio', (select body ->> 'tipo' = 'revision' and (body ->> 'recordatorio')::boolean from public.llamadas_push where body ->> 'name' = 'Lead 11'), '');
  n := public.recordar_solicitudes_revision(10);
  perform pg_temp.reg('2f no repite el aviso', n = 0, n::text);
  delete from public.leads where email = 'l11@example.com';
  perform pg_temp.reg('2g al borrar la solicitud se va también su recordatorio', (select count(*) from public.notificaciones where id like 'revision_recuerdo_%') = 0, '');
  perform pg_temp.reg('2h nadie puede ejecutar el recordatorio desde fuera', not has_function_privilege('anon', 'public.recordar_solicitudes_revision(integer)', 'execute') and not has_function_privilege('authenticated', 'public.recordar_solicitudes_revision(integer)', 'execute'), '');
  delete from public.leads;
end $$;

-- ═══ 3. Seguimiento autorizado y purga de 60 días ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; t2 text := 'aaaaaaaa-0000-0000-0000-000000000002'; v text; n int;
begin
  perform pg_temp.sol('21', t1, 'revisar', 24 * 61);          -- se borra (alarma sin autorizar)
  perform pg_temp.sol('22', t1, 'revisar', 24 * 61);          -- se queda: seguimiento autorizado
  perform pg_temp.sol('23', t1, 'nuevo', 24 * 61);            -- se borra
  perform pg_temp.sol('24', t1, 'convertido', 24 * 70);       -- se queda: convertida
  perform pg_temp.sol('25', t1, 'revisar', 24 * 10);          -- se queda: reciente
  perform pg_temp.sol('26', t1, 'nuevo', 24 * 61, 'pagina');  -- contacto de la página: no es de esta purga

  -- Solo el dueño autoriza
  perform set_config('request.jwt.claims', json_build_object('sub', t1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.autorizar_seguimiento_solicitud('00000000-0000-0000-0000-000000000022', true);
  reset role;
  perform pg_temp.reg('3a el dueño marca el seguimiento autorizado', (select seguimiento_autorizado from public.solicitudes_programacion where lead_id = '00000000-0000-0000-0000-000000000022'), '');
  perform set_config('request.jwt.claims', json_build_object('sub', t2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.autorizar_seguimiento_solicitud('00000000-0000-0000-0000-000000000021', true); v := 'autorizó'; exception when others then v := 'rechazado'; end;
  reset role;
  perform pg_temp.reg('3b otro entrenador no puede autorizar una solicitud ajena', v = 'rechazado' and not (select seguimiento_autorizado from public.solicitudes_programacion where lead_id = '00000000-0000-0000-0000-000000000021'), v);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin perform public.autorizar_seguimiento_solicitud('00000000-0000-0000-0000-000000000021', true); v := 'autorizó'; exception when others then v := 'rechazado'; end;
  reset role;
  perform pg_temp.reg('3c sin sesión no se puede autorizar', v = 'rechazado', v);
  perform set_config('request.jwt.claims', json_build_object('sub', t1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin update public.solicitudes_programacion set seguimiento_autorizado = true; v := 'actualizó'; exception when insufficient_privilege then v := 'denegado'; end;
  reset role;
  perform pg_temp.reg('3d no se marca a mano: solo con la función', v = 'denegado', v);

  n := public.purgar_solicitudes_programacion();
  perform pg_temp.reg('3e la purga borra la «a revisar» y la «nuevo» de más de 60 días sin autorizar', n = 2 and not exists (select 1 from public.leads where email in ('l21@example.com', 'l23@example.com')), n::text);
  perform pg_temp.reg('3f se quedan la autorizada, la convertida, la reciente y el contacto de la página',
    (select count(*) from public.leads where email in ('l22@example.com', 'l24@example.com', 'l25@example.com', 'l26@example.com')) = 4, '');
  -- Quitar la autorización la deja otra vez a merced de la purga
  perform set_config('request.jwt.claims', json_build_object('sub', t1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.autorizar_seguimiento_solicitud('00000000-0000-0000-0000-000000000022', false);
  reset role;
  n := public.purgar_solicitudes_programacion();
  perform pg_temp.reg('3g sin autorización, la siguiente purga también la borra', n = 1 and not exists (select 1 from public.leads where email = 'l22@example.com'), n::text);
  perform pg_temp.reg('3h el borrado se lleva su solicitud', not exists (select 1 from public.solicitudes_programacion where lead_id = '00000000-0000-0000-0000-000000000022'), '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
