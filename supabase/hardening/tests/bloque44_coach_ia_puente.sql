-- Prueba de migrations/20261121000010_coach_ia_puente.sql y de su corrección 20261121000020_coach_ia_alcance.sql
-- (el puente de Coach IA: elegibilidad en un solo sitio, el paquete que lee quien prepara el borrador solo lleva lo permitido,
-- el borrador se guarda solo si es válido y el caso es elegible, tope de 5 casos pendientes, solo el dueño aprueba o descarta,
-- y nada de esto toca `planes`).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.reg(p_caso text, p_ok boolean, p_detalle text default '') returns void language sql as
  $f$ insert into resultados values (p_caso, coalesce(p_ok, false), p_detalle) $f$;
grant execute on function pg_temp.reg(text, boolean, text) to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer',
   '{"criteriosProgramacion": {"version": 3, "metodologia": "Full-body 3 días", "limitesClinicos": "Cualquier sí del PAR-Q: revisar"}}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer', '{}');

insert into public.coach_ia_habilitados (trainer_id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('aaaaaaaa-0000-0000-0000-000000000002');

-- Respuestas de un caso limpio (sin molestias) y su PAR-Q todo «no»
create function pg_temp.resp(p_molestias boolean default false, p_detalle text default null, p_edad numeric default 30) returns jsonb language sql as $f$
  select jsonb_strip_nulls(jsonb_build_object(
    'objetivo', 'Ganar músculo', 'experiencia', 'De 6 meses a 2 años', 'dias', '3', 'duracion', '60-75 min',
    'material', jsonb_build_array('Gimnasio completo'), 'rutina_actual', 'Torso/pierna 4 días, press banca 80x5',
    'molestias', p_molestias, 'molestias_detalle', p_detalle, 'rechaza', 'Nada de dominadas',
    'peso', 78.5, 'altura', 178, 'edad', p_edad, 'sueno', 7, 'estres', 6))
$f$;
grant execute on function pg_temp.resp(boolean, text, numeric) to public;
create function pg_temp.parq(p_si int[] default '{}') returns jsonb language sql as $f$
  select jsonb_agg(i = any (p_si) order by i) from generate_series(0, 6) i
$f$;
grant execute on function pg_temp.parq(int[]) to public;

-- Un lead con su solicitud. p_id son 2 dígitos.
create function pg_temp.caso(p_id text, p_trainer text, p_resp jsonb, p_parq jsonb, p_asist boolean default true, p_alarma boolean default false) returns uuid language plpgsql as $f$
declare l uuid := ('00000000-0000-0000-0000-0000000000' || p_id)::uuid;
begin
  insert into public.leads (id, trainer_id, name, email, phone, message, status, origen, created_at)
  values (l, p_trainer::uuid, 'Adrián Gómez ' || p_id, 'a' || p_id || '@example.com', '600000' || p_id, 'Solicitud de programación inicial',
          case when p_alarma then 'revisar' else 'nuevo' end, 'programacion', (extract(epoch from now()) * 1000)::bigint);
  insert into public.solicitudes_programacion (lead_id, trainer_id, clave_envio, consentimiento_salud, consentimiento_asistente, consentimiento_version,
                                               respuestas, parq, parq_alarma, preparar_borrador)
  values (l, p_trainer::uuid, gen_random_uuid(), true, p_asist, 'prog-v1', p_resp, p_parq, p_alarma, p_asist and not p_alarma);
  return l;
end $f$;
grant execute on function pg_temp.caso(text, text, jsonb, jsonb, boolean, boolean) to public;

create function pg_temp.plan(p_semanas int default 1) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'fuerza', 'restMain', 150, 'restAcc', 90, 'restWarn', 45, 'programName', 'Inicial 3 días',
    'weeks', (select jsonb_agg(jsonb_build_object('label', 'Semana ' || i, 'rpe', '6', 'isCurrent', i = 1, 'days', jsonb_build_array(
        jsonb_build_object('title', 'Día 1', 'focus', 'Full-body', 'exercises', jsonb_build_array(
          jsonb_build_object('name', 'Sentadilla goblet', 'sets', '3x8', 'weight', '', 'isMain', true, 'comment', 'Técnica primero', 'rir', '3', 'tempo', '3-0-1-0')))))) from generate_series(1, p_semanas) i))
$f$;
grant execute on function pg_temp.plan(int) to public;
create function pg_temp.razones() returns jsonb language sql as $f$
  select '[{"decision": "3 días full-body", "porque": "Indicó 3 días y 60-75 min"}]'::jsonb
$f$;
grant execute on function pg_temp.razones() to public;

-- Llama a una función como un rol y devuelve el resultado o 'ERR: ' + mensaje
create function pg_temp.guardar(p_lead uuid, p_plan jsonb, p_razones jsonb, p_crit text default '3') returns text language plpgsql as $f$
begin
  return public.coach_ia_guardar_borrador(p_lead, p_plan, p_razones, p_crit);
exception when others then return 'ERR: ' || sqlerrm;
end $f$;
grant execute on function pg_temp.guardar(uuid, jsonb, jsonb, text) to public;

-- ═══ 1. Caso elegible: el paquete solo lleva lo permitido ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; l uuid; p jsonb; s record;
begin
  l := pg_temp.caso('01', t1, pg_temp.resp(), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('1a un caso limpio es elegible', (p ->> 'elegible')::boolean, p::text);
  perform pg_temp.reg('1b solo el nombre de pila, sin apellidos, correo ni teléfono',
    p ->> 'nombre' = 'Adrián' and p::text not like '%Gómez%' and p::text not like '%@example.com%' and p::text not like '%600000%', p ->> 'nombre');
  perform pg_temp.reg('1c no lleva molestias, detalle de molestias ni PAR-Q',
    not (p -> 'respuestas') ? 'molestias' and not (p -> 'respuestas') ? 'molestias_detalle' and not p ? 'parq' and p::text not like '%parq%', '');
  perform pg_temp.reg('1d sí lleva lo que hace falta para programar (objetivo, experiencia, días, duración, material, rutina actual)',
    (p -> 'respuestas') ?& array['objetivo', 'experiencia', 'dias', 'duracion', 'material', 'rutina_actual'], '');
  perform pg_temp.reg('1e las claves del paquete son exactamente las esperadas',
    (select array_agg(k order by k) from jsonb_object_keys(p) k) = array['criterios', 'criterios_version', 'elegible', 'lead_id', 'limites', 'mayor_de_edad', 'nombre', 'politica', 'respuestas'], '');
  perform pg_temp.reg('1f lleva los criterios del entrenador y su versión', p -> 'criterios' ->> 'metodologia' = 'Full-body 3 días' and p ->> 'criterios_version' = '3', '');
  select * into s from public.solicitudes_programacion where lead_id = l;
  perform pg_temp.reg('1g la lectura deja constancia: cuándo y qué campos', s.ia_leida_en is not null and s.ia_campos @> array['nombre', 'objetivo', 'criterios'] and s.ia_campos @> array['mayor_de_edad'] and not s.ia_campos @> array['molestias', 'edad', 'peso'], array_to_string(s.ia_campos, ','));
end $$;

-- ═══ 2. Casos que NO se preparan: solo el motivo, nunca las respuestas ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; l uuid; p jsonb;
begin
  l := pg_temp.caso('02', t1, pg_temp.resp(), pg_temp.parq('{4}'));   -- «sí» en articular (no era alarma, pero en la beta lo ve una persona)
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2a un «sí» cualquiera del PAR-Q → requiere revisión profesional (sin decir cuál), sin respuestas', p ->> 'motivo' = 'requiere_revision_profesional' and not p ? 'respuestas' and not (p ->> 'elegible')::boolean, p::text);

  l := pg_temp.caso('03', t1, pg_temp.resp(), pg_temp.parq('{1}'), true, true);  -- alarma del PAR-Q
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2b alarma del PAR-Q → requiere revisión profesional', p ->> 'motivo' = 'requiere_revision_profesional' and not p ? 'respuestas', p::text);

  l := pg_temp.caso('04', t1, pg_temp.resp(true, 'Hombro derecho'), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2c molestias declaradas → requiere revisión profesional (ni el motivo ni el detalle salen)', p ->> 'motivo' = 'requiere_revision_profesional' and p::text not like '%Hombro%' and p::text not like '%molestias%', p::text);

  l := pg_temp.caso('05', t1, pg_temp.resp(false, 'Me duele la rodilla'), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2d dice que no hay molestias pero describe una → requiere revisión profesional', p ->> 'motivo' = 'requiere_revision_profesional' and p::text not like '%rodilla%', p::text);

  l := pg_temp.caso('06', t1, pg_temp.resp(null), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2e molestias sin contestar → requiere revisión profesional', p ->> 'motivo' = 'requiere_revision_profesional', p::text);

  l := pg_temp.caso('07', t1, pg_temp.resp(), pg_temp.parq(), false);
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2f sin consentimiento del asistente → sin_consentimiento_asistente', p ->> 'motivo' = 'sin_consentimiento_asistente', p::text);

  l := pg_temp.caso('08', t1, pg_temp.resp(false, null, 17), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('2g menor de 18 → edad', p ->> 'motivo' = 'edad', p::text);

  perform pg_temp.reg('2h una lectura de un caso no elegible no entrega ningún campo', (select ia_campos = '{}' from public.solicitudes_programacion where lead_id = l), '');
  perform pg_temp.reg('2i un caso que no existe no revela nada', public.coach_ia_paquete('00000000-0000-0000-0000-0000000000ff') ->> 'motivo' = 'no_existe', '');
end $$;

-- ═══ 3. Permisos: ni anon ni authenticated llaman a las funciones de Claude ═══
do $$
declare l uuid := '00000000-0000-0000-0000-000000000001'; r text; ok boolean := true; f text;
begin
  foreach f in array array['anon', 'authenticated'] loop
    execute format('set local role %I', f);
    begin perform public.coach_ia_paquete(l); ok := false; exception when insufficient_privilege then null; end;
    begin perform public.coach_ia_guardar_borrador(l, pg_temp.plan(), pg_temp.razones(), '3'); ok := false; exception when insufficient_privilege then null; end;
    reset role;
  end loop;
  perform pg_temp.reg('3a anon y authenticated no pueden leer el paquete ni guardar un borrador', ok, '');
  perform pg_temp.reg('3b nadie puede llamar a la elegibilidad ni a la validación a mano', (
    select not has_function_privilege('authenticated', 'public.coach_ia_validar_plan(jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.coach_ia_validar_plan(jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.coach_ia_casos_activos(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.coach_ia_casos_pendientes(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.coach_ia_casos_pendientes(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.coach_ia_motivo_publico(text)', 'execute')), '');
end $$;

-- ═══ 4. Guardar el borrador: solo válido y solo para un caso elegible ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; l uuid := '00000000-0000-0000-0000-000000000001'; r text; s record; planes_antes int; p jsonb;
begin
  select count(*) into planes_antes from public.planes;
  r := pg_temp.guardar(l, pg_temp.plan(2), pg_temp.razones());
  select * into s from public.solicitudes_programacion where lead_id = l;
  perform pg_temp.reg('4a un borrador válido queda «listo para revisar» con sus razones, criterios y fecha',
    r = 'ok' and s.borrador_estado = 'listo_para_revisar' and jsonb_array_length(s.propuesta -> 'weeks') = 2 and s.criterios_version = '3' and s.borrador_generado_en is not null and jsonb_array_length(s.razones) = 1, r);
  perform pg_temp.reg('4b el contacto pasa a «Borrador listo»', (select status from public.leads where id = l) = 'borrador_listo', '');
  perform pg_temp.reg('4c guardar nunca toca los planes', (select count(*) from public.planes) = planes_antes, '');

  -- Rechazos
  p := pg_temp.plan();
  perform pg_temp.reg('4d un campo no permitido en el plan se rechaza', pg_temp.guardar(l, p || '{"macros": {"kcal": 2000}}', pg_temp.razones()) like 'ERR:%campo no permitido%', '');
  perform pg_temp.reg('4e un campo no permitido en un ejercicio (vídeo) se rechaza',
    pg_temp.guardar(l, jsonb_set(p, '{weeks,0,days,0,exercises,0,videoUrl}', '"https://x.example/v"'), pg_temp.razones()) like 'ERR:%campo no permitido%', '');
  perform pg_temp.reg('4f más de 16 semanas se rechaza', pg_temp.guardar(l, pg_temp.plan(17), pg_temp.razones()) like 'ERR:%1 a 16 semanas%', '');
  perform pg_temp.reg('4g sin razones se rechaza', pg_temp.guardar(l, p, '[]') like 'ERR:%porqué%', '');
  perform pg_temp.reg('4h una razón con campos de más se rechaza', pg_temp.guardar(l, p, '[{"decision": "a", "porque": "b", "extra": "c"}]') like 'ERR:%porqué%', '');
  perform pg_temp.reg('4i un nombre de ejercicio vacío se rechaza', pg_temp.guardar(l, jsonb_set(p, '{weeks,0,days,0,exercises,0,name}', '""'), pg_temp.razones()) like 'ERR:%nombre%', '');
  perform pg_temp.reg('4j sin versión de criterios se rechaza', pg_temp.guardar(l, p, pg_temp.razones(), '') like 'ERR:%versión%', '');
  perform pg_temp.reg('4k un plan que no es un objeto se rechaza', pg_temp.guardar(l, '[]', pg_temp.razones()) like 'ERR:%no es un plan%', '');
  perform pg_temp.reg('4l tras los rechazos el borrador anterior sigue intacto', (select jsonb_array_length(propuesta -> 'weeks') from public.solicitudes_programacion where lead_id = l) = 2, '');

  -- Casos no elegibles: no se guarda nada
  perform pg_temp.reg('4m un caso con PAR-Q «sí» no admite borrador', pg_temp.guardar('00000000-0000-0000-0000-000000000002', p, pg_temp.razones()) like 'ERR:%no apto (requiere_revision_profesional)%', '');
  perform pg_temp.reg('4n un caso con alarma no admite borrador', pg_temp.guardar('00000000-0000-0000-0000-000000000003', p, pg_temp.razones()) like 'ERR:%no apto (requiere_revision_profesional)%', '');
  perform pg_temp.reg('4o un caso con molestias no admite borrador', pg_temp.guardar('00000000-0000-0000-0000-000000000004', p, pg_temp.razones()) like 'ERR:%no apto (requiere_revision_profesional)%', '');
  perform pg_temp.reg('4p tampoco queda nada guardado en esos casos', (select count(*) from public.solicitudes_programacion where lead_id in ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004') and (propuesta is not null or borrador_estado <> 'sin_generar')) = 0, '');
end $$;

-- ═══ 5. El entrenador decide ═══
do $$
declare l uuid := '00000000-0000-0000-0000-000000000001'; r text; ok boolean; s record;
begin
  -- Otro entrenador no puede decidir
  perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.decidir_borrador_solicitud(l, 'aprobar'); ok := false; exception when others then ok := sqlstate = '42501'; end;
  reset role;
  perform pg_temp.reg('5a otro entrenador no puede aprobar', ok, '');

  perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.decidir_borrador_solicitud('00000000-0000-0000-0000-000000000002', 'aprobar'); ok := false; exception when others then ok := sqlerrm like '%No hay un borrador listo%'; end;
  perform pg_temp.reg('5b no se puede aprobar donde no hay borrador', ok, '');
  begin perform public.decidir_borrador_solicitud(l, 'publicar'); ok := false; exception when others then ok := sqlerrm like '%no válida%'; end;
  perform pg_temp.reg('5c una decisión desconocida se rechaza', ok, '');
  r := public.decidir_borrador_solicitud(l, 'aprobar');
  reset role;
  select * into s from public.solicitudes_programacion where lead_id = l;
  perform pg_temp.reg('5d el dueño aprueba: queda aprobado con su fecha', r = 'ok' and s.borrador_estado = 'aprobado' and s.borrador_decidido_en is not null, '');

  -- Aprobado: Claude no puede sobrescribirlo
  perform pg_temp.reg('5e un borrador aprobado no se sobrescribe', pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones()) like 'ERR:%ya está aprobado%', '');
  perform pg_temp.reg('5f y su paquete dice ya_aprobado', public.coach_ia_paquete(l) ->> 'motivo' = 'ya_aprobado', '');

  -- Descartar: no se conserva el borrador
  perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.decidir_borrador_solicitud(l, 'descartar');
  reset role;
  select * into s from public.solicitudes_programacion where lead_id = l;
  perform pg_temp.reg('5g descartar borra la propuesta y las razones y deja el estado «descartado»', s.borrador_estado = 'descartado' and s.propuesta is null and s.razones is null, '');
  perform pg_temp.reg('5h el contacto vuelve a «nuevo»', (select status from public.leads where id = l) = 'nuevo', '');
  perform pg_temp.reg('5i tras descartar se puede preparar otro desde cero', pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones()) = 'ok', '');

  -- Con cliente ya no admite cambios
  insert into public.clientes (id, "trainerId", name, token) values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Adrián', 'tok-1');
  update public.solicitudes_programacion set client_id = '11111111-0000-0000-0000-000000000001' where lead_id = l;
  perform set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.decidir_borrador_solicitud(l, 'descartar'); ok := false; exception when others then ok := sqlerrm like '%ya no admite%'; end;
  reset role;
  perform pg_temp.reg('5j convertida en cliente, la solicitud ya no admite decisiones', ok, '');
  perform pg_temp.reg('5k y su paquete dice ya_es_cliente', public.coach_ia_paquete(l) ->> 'motivo' = 'ya_es_cliente', '');
end $$;

-- ═══ 6. Tope de 5 casos pendientes por entrenador ═══
do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; t2 text := 'aaaaaaaa-0000-0000-0000-000000000002'; i int; l uuid; r text; n int; p jsonb;
begin
  -- Se parte de cero para este entrenador (los casos de los bloques anteriores ya cumplieron su función)
  delete from public.leads where trainer_id = t1::uuid;
  -- 5 casos con borrador listo
  for i in 10..14 loop
    l := pg_temp.caso(i::text, t1, pg_temp.resp(), pg_temp.parq());
    r := pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones());
    perform pg_temp.reg('6a caso ' || i || ' admite borrador (' || (i - 9) || ' de 5)', r = 'ok', r);
  end loop;
  select public.coach_ia_casos_activos(t1::uuid) into n;
  perform pg_temp.reg('6b hay 5 casos pendientes', n = 5, n::text);
  l := pg_temp.caso('15', t1, pg_temp.resp(), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('6c el sexto no se abre: cupo_completo', p ->> 'motivo' = 'cupo_completo' and not p ? 'respuestas', p::text);
  perform pg_temp.reg('6d y tampoco admite borrador', pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones()) like 'ERR:%5 casos pendientes%', '');
  perform pg_temp.reg('6e regenerar uno ya listo sí se puede (no abre un caso nuevo)', pg_temp.guardar('00000000-0000-0000-0000-000000000010', pg_temp.plan(2), pg_temp.razones()) = 'ok', '');
  l := pg_temp.caso('20', t2, pg_temp.resp(), pg_temp.parq());
  perform pg_temp.reg('6f el tope es por entrenador: el otro no se ve afectado', (public.coach_ia_paquete(l) ->> 'elegible')::boolean, '');
end $$;

-- ═══ 7. Casos pendientes: solo de UN entrenador, solo lo mínimo ═══
do $$
declare t1 uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; t2 uuid := 'aaaaaaaa-0000-0000-0000-000000000002'; l uuid; r jsonb; fila jsonb;
begin
  -- Del bloque 6 quedan: casos 10-14 con borrador listo (no esperan), el 15 apto sin borrador. Se añaden uno con PAR-Q «sí» y uno ya cliente.
  l := pg_temp.caso('16', t1::text, pg_temp.resp(), pg_temp.parq('{5}'));
  l := pg_temp.caso('17', t1::text, pg_temp.resp(), pg_temp.parq());
  insert into public.clientes (id, "trainerId", name, token) values ('11111111-0000-0000-0000-000000000017', t1, 'Ya cliente', 'tok-17');
  update public.solicitudes_programacion set client_id = '11111111-0000-0000-0000-000000000017' where lead_id = l;

  r := public.coach_ia_casos_pendientes(t1);
  perform pg_temp.reg('7a lista solo los casos que esperan borrador (el 15 y el 16), no los listos ni los ya clientes', jsonb_array_length(r) = 2, r::text);
  fila := r -> 0;
  perform pg_temp.reg('7b cada fila lleva solo id, nombre de pila, fecha, estado, si es apto y el motivo',
    (select array_agg(k order by k) from jsonb_object_keys(fila) k) = array['elegible', 'estado', 'lead_id', 'motivo', 'nombre', 'recibido_en'], '');
  perform pg_temp.reg('7c el apto sale como elegible y el del PAR-Q «sí» con el motivo genérico',
    (r -> 0 ->> 'elegible')::boolean and not (r -> 1 ->> 'elegible')::boolean and r -> 1 ->> 'motivo' = 'requiere_revision_profesional', r::text);
  perform pg_temp.reg('7d sin apellidos, correo, teléfono, respuestas ni PAR-Q', r::text not like '%Gómez%' and r::text not like '%@example.com%' and r::text not like '%600000%' and r::text not like '%parq%' and r::text not like '%respuestas%', '');
  perform pg_temp.reg('7e es de un entrenador: el otro solo ve el suyo (el 20), nunca los del primero',
    jsonb_array_length(public.coach_ia_casos_pendientes(t2)) = 1 and public.coach_ia_casos_pendientes(t2) -> 0 ->> 'lead_id' = '00000000-0000-0000-0000-000000000020', '');
  perform pg_temp.reg('7f un entrenador sin casos recibe una lista vacía, no null', public.coach_ia_casos_pendientes('aaaaaaaa-0000-0000-0000-0000000000ff') = '[]'::jsonb, '');
end $$;

-- ═══ 8. Corrección del alcance (migración 20261121000020) ═══
-- Todas las respuestas posibles del cuestionario, las de salud incluidas
create function pg_temp.resp_total() returns jsonb language sql as $f$
  select jsonb_build_object(
    'objetivo', 'Ganar músculo', 'objetivo_detalle', 'Más espalda', 'experiencia', 'De 6 meses a 2 años', 'rutina_actual', 'Torso/pierna',
    'dias', '3', 'duracion', '60-75 min', 'material', jsonb_build_array('Gimnasio completo'), 'marcas', 'Sentadilla 100', 'pasos', 8000,
    'cardio', 'Camino', 'prioridad', jsonb_build_array('Espalda'), 'barreras', jsonb_build_array('Tiempo'), 'extra', 'Nada más',
    'rechaza', 'Nada de dominadas por el hombro', 'molestias', false, 'peso', 78.5, 'altura', 178, 'edad', 30, 'fase', 'Mantenimiento', 'sueno', 7, 'estres', 6)
$f$;
grant execute on function pg_temp.resp_total() to public;

do $$
declare t1 text := 'aaaaaaaa-0000-0000-0000-000000000001'; t3 text := 'aaaaaaaa-0000-0000-0000-000000000003'; l uuid; p jsonb; r text; ok boolean; claves text[];
begin
  -- 8a-8c: la lista de habilitados no la lee ni la escribe la app, ni se puede llamar a su comprobación
  perform pg_temp.reg('8a anon y authenticated no tienen ningún permiso sobre la lista de habilitados', not has_table_privilege('anon', 'public.coach_ia_habilitados', 'select')
    and not has_table_privilege('authenticated', 'public.coach_ia_habilitados', 'select') and not has_table_privilege('authenticated', 'public.coach_ia_habilitados', 'insert')
    and not has_table_privilege('authenticated', 'public.coach_ia_habilitados', 'update') and not has_table_privilege('authenticated', 'public.coach_ia_habilitados', 'delete'), '');
  perform pg_temp.reg('8b nadie de la app puede llamar a coach_ia_habilitado', not has_function_privilege('anon', 'public.coach_ia_habilitado(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.coach_ia_habilitado(uuid)', 'execute'), '');
  perform pg_temp.reg('8c la lista tiene RLS activado (sin políticas)', (select relrowsecurity from pg_class where oid = 'public.coach_ia_habilitados'::regclass)
    and not exists (select 1 from pg_policies where tablename = 'coach_ia_habilitados'), '');

  -- 8d-8h: un entrenador NO habilitado: sus casos se tratan como inexistentes en las tres funciones
  insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile) values (t3::uuid, 't3@test.local', 'Entrenador 3', true, 'trainer', 'trainer', '{}');
  l := pg_temp.caso('30', t3, pg_temp.resp(), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  perform pg_temp.reg('8d el paquete de un caso de un entrenador no habilitado dice «no_existe» y no entrega nada', p ->> 'motivo' = 'no_existe' and not p ? 'respuestas' and not (p ->> 'elegible')::boolean, p::text);
  perform pg_temp.reg('8e ni siquiera deja constancia de lectura', (select ia_leida_en is null and ia_campos is null from public.solicitudes_programacion where lead_id = l), '');
  perform pg_temp.reg('8f guardar un borrador en un caso de un entrenador no habilitado falla como si no existiera', pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones()) = 'ERR: No existe esa solicitud', '');
  perform pg_temp.reg('8g el listado de un entrenador no habilitado está vacío', public.coach_ia_casos_pendientes(t3::uuid) = '[]'::jsonb, '');
  perform pg_temp.reg('8h y no queda nada guardado', (select borrador_estado = 'sin_generar' and propuesta is null from public.solicitudes_programacion where lead_id = l), '');

  -- 8i-8j: al habilitarlo funciona y al quitarlo vuelve a cerrarse (falla cerrado)
  insert into public.coach_ia_habilitados (trainer_id) values (t3::uuid);
  perform pg_temp.reg('8i habilitado, el mismo caso sí es elegible', (public.coach_ia_paquete(l) ->> 'elegible')::boolean, '');
  delete from public.coach_ia_habilitados where trainer_id = t3::uuid;
  perform pg_temp.reg('8j quitado de la lista, vuelve a cerrarse', public.coach_ia_paquete(l) ->> 'motivo' = 'no_existe' and pg_temp.guardar(l, pg_temp.plan(), pg_temp.razones()) like 'ERR:%No existe%', '');

  -- 8k-8o: el paquete es una lista blanca: ninguna respuesta de salud, aunque exista en la solicitud
  insert into public.coach_ia_habilitados (trainer_id) values (t3::uuid);
  l := pg_temp.caso('31', t3, pg_temp.resp_total(), pg_temp.parq());
  p := public.coach_ia_paquete(l);
  select array_agg(k order by k) into claves from jsonb_object_keys(p -> 'respuestas') k;
  perform pg_temp.reg('8k las respuestas del paquete son EXACTAMENTE las que no son de salud',
    claves = array['barreras', 'cardio', 'dias', 'duracion', 'experiencia', 'extra', 'marcas', 'material', 'objetivo', 'objetivo_detalle', 'pasos', 'prioridad', 'rutina_actual'], array_to_string(claves, ','));
  perform pg_temp.reg('8l no sale ninguna respuesta de salud (rechaza, molestias, peso, altura, edad, fase, sueño, estrés)',
    not (p -> 'respuestas') ?| array['rechaza', 'molestias', 'molestias_detalle', 'peso', 'altura', 'edad', 'fase', 'sueno', 'estres'], '');
  perform pg_temp.reg('8m ni sus valores aparecen en ningún sitio del paquete', p::text not like '%dominadas%' and p::text not like '%78.5%' and p::text not like '%Mantenimiento%' and p::text not like '%hombro%', '');
  perform pg_temp.reg('8n en lugar de la edad solo «mayor_de_edad: true»', p -> 'mayor_de_edad' = 'true'::jsonb and not p ? 'edad', '');
  perform pg_temp.reg('8o la constancia de lectura tampoco lista campos de salud',
    (select ia_campos @> array['nombre', 'objetivo', 'rutina_actual', 'mayor_de_edad', 'criterios'] and not ia_campos && array['rechaza', 'peso', 'altura', 'edad', 'fase', 'sueno', 'estres', 'molestias'] from public.solicitudes_programacion where lead_id = l), '');

  -- 8p-8q: coachNotes ya no se acepta en la propuesta (y el resto sigue igual)
  p := pg_temp.plan();
  perform pg_temp.reg('8p coachNotes se rechaza', pg_temp.guardar(l, p || '{"coachNotes": "nota privada"}', pg_temp.razones()) like 'ERR:%campo no permitido: coachNotes%', '');
  perform pg_temp.reg('8q el mismo plan sin coachNotes se guarda', pg_temp.guardar(l, p, pg_temp.razones()) = 'ok', '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
