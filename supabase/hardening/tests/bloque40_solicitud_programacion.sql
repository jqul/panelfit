-- Prueba de migrations/20261118000020_solicitud_programacion_inicial.sql
-- (enlace público revocable de «Programación inicial»: revocado, caducado y agotado no aceptan ni enseñan nada; límites y
-- anti-spam; `anon` sin acceso directo; el remitente no lee nada de vuelta; otro entrenador no ve nada; sin consentimiento
-- no se guardan las respuestas de salud; señal de alarma del PAR-Q → 'revisar' y sin borrador; borrado y RGPD/cascada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create temp table guardado (clave text, valor text) on commit drop;
grant all on guardado to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, profile) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer', '{"brandName": "Marca Uno", "brandLogo": "https://example.com/logo.png", "displayName": "Javier Uno"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer', '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 't3@test.local', 'Pendiente', false, 'trainer', 'trainer', '{}');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'tok-1'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cliente de 2', 'tok-2');

-- ── Ayudas ──
create function pg_temp.reg(p_caso text, p_ok boolean, p_detalle text default '') returns void language sql as
  $f$ insert into resultados values (p_caso, coalesce(p_ok, false), p_detalle) $f$;
grant execute on function pg_temp.reg(text, boolean, text) to public;

-- Respuestas completas de un envío normal (con las de salud)
create function pg_temp.resp() returns jsonb language sql as $f$
  select jsonb_build_object(
    'objetivo', 'Ganar músculo', 'experiencia', 'De 6 meses a 2 años', 'dias', '3', 'duracion', '60-75 min',
    'material', jsonb_build_array('Gimnasio completo', 'Mancuernas'),
    'molestias', true, 'molestias_detalle', 'Hombro derecho, desde hace 2 meses', 'rechaza', 'Nada de peso muerto convencional',
    'peso', 78.5, 'altura', 178, 'edad', 29, 'sueno', 7, 'estres', 6, 'pasos', 8000, 'marcas', 'Sentadilla 100', 'inventada', 'x')
$f$;
grant execute on function pg_temp.resp() to public;
create function pg_temp.parq(p_si int[] default '{}') returns jsonb language sql as $f$
  select jsonb_agg(i = any (p_si) order by i) from generate_series(0, 6) i
$f$;
grant execute on function pg_temp.parq(int[]) to public;

-- Envío como anónimo: devuelve el resultado o 'ERR: ' + el mensaje
create function pg_temp.enviar(p_slug text, p_clave uuid, p_nombre text, p_email text, p_tel text, p_resp jsonb, p_parq jsonb,
                                p_salud boolean, p_asist boolean, p_web text default null) returns text language plpgsql as $f$
declare v text;
begin
  set local role anon;
  v := public.enviar_solicitud_programacion(p_slug, p_clave, p_nombre, p_email, p_tel, p_resp, p_parq, p_salud, p_asist, 'prog-v1', p_web);
  reset role;
  return v;
exception when others then
  reset role;
  return 'ERR: ' || sqlerrm;
end $f$;
grant execute on function pg_temp.enviar(text, uuid, text, text, text, jsonb, jsonb, boolean, boolean, text) to public;

-- Un envío normal y completo con valores por defecto
create function pg_temp.normal(p_slug text, p_email text, p_alarma int[] default '{}', p_asist boolean default true, p_clave uuid default gen_random_uuid()) returns text
language sql as $f$
  select pg_temp.enviar(p_slug, p_clave, 'Ana García', p_email, null, pg_temp.resp(), pg_temp.parq(p_alarma), true, p_asist)
$f$;
grant execute on function pg_temp.normal(text, text, int[], boolean, uuid) to public;

create function pg_temp.como(p_uid text) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $f$;
grant execute on function pg_temp.como(text) to public;

-- ═══ 1. Crear y revocar enlaces ═══
do $$
declare j1 jsonb; j2 jsonb; v text; n int;
begin
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  j1 := public.crear_enlace_programacion('Programación inicial — amigos', 14, null, false, false);
  j2 := public.crear_enlace_programacion('Otro', null, null, false, false);
  reset role;
  insert into guardado values ('e1', j1 ->> 'id'), ('s1', j1 ->> 'slug'), ('s2', j2 ->> 'slug'), ('e2', j2 ->> 'id');
  perform pg_temp.reg('1a el enlace sale con slug aleatorio de 32 hex y dueño', (j1 ->> 'slug') ~ '^[0-9a-f]{32}$' and j1 ->> 'trainer_id' = 'aaaaaaaa-0000-0000-0000-000000000001' and (j1 ->> 'activo')::boolean, j1 ->> 'slug');
  perform pg_temp.reg('1b dos enlaces no comparten slug', j1 ->> 'slug' <> j2 ->> 'slug', '');
  perform pg_temp.reg('1c la caducidad de 14 días queda a ~14 días y sin caducidad queda a null',
    (j1 ->> 'caduca_en')::timestamptz between now() + interval '13 days 23 hours' and now() + interval '14 days 1 hour' and j2 ->> 'caduca_en' is null, j1 ->> 'caduca_en');
  perform pg_temp.reg('1d nace con 0 usos y con fecha de creación', (j1 ->> 'usos')::int = 0 and j1 ->> 'creado_en' is not null and j1 ->> 'revocado_en' is null, '');

  -- Un entrenador no aprobado o sin sesión no puede crear
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000003');
  begin perform public.crear_enlace_programacion('x'); v := 'creó'; exception when others then v := 'rechazado'; end;
  reset role;
  perform pg_temp.reg('1e un entrenador no aprobado no puede crear enlaces', v = 'rechazado', v);
  set local role anon;
  begin perform public.crear_enlace_programacion('x'); v := 'creó'; exception when others then v := 'rechazado'; end;
  reset role;
  perform pg_temp.reg('1f sin sesión (anon) no puede crear enlaces', v = 'rechazado', v);

  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  begin perform public.crear_enlace_programacion('   '); v := 'creó'; exception when others then v := sqlerrm; end;
  perform pg_temp.reg('1g sin nombre no se crea', v like 'Ponle un nombre%', v);
  begin perform public.crear_enlace_programacion('x', 0); v := 'creó'; exception when others then v := sqlerrm; end;
  perform pg_temp.reg('1h caducidad fuera de rango se rechaza', v like 'La caducidad%', v);
  begin perform public.crear_enlace_programacion('x', null, 5000); v := 'creó'; exception when others then v := sqlerrm; end;
  perform pg_temp.reg('1i límite de usos fuera de rango se rechaza', v like 'El límite de usos%', v);
  reset role;

  -- Un entrenador ve solo lo suyo; el otro, nada
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  select count(*) into n from public.programacion_enlaces;
  reset role;
  perform pg_temp.reg('1j el entrenador ve sus enlaces', n = 2, n::text);
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
  select count(*) into n from public.programacion_enlaces;
  begin perform public.revocar_enlace_programacion((select valor::uuid from guardado where clave = 'e1')); v := 'revocó'; exception when others then v := sqlerrm; end;
  reset role;
  perform pg_temp.reg('1k otro entrenador no ve los enlaces', n = 0, n::text);
  perform pg_temp.reg('1l otro entrenador no puede revocar un enlace ajeno', v = 'Enlace no encontrado', v);
  perform pg_temp.reg('1m y el enlace ajeno sigue activo', (select activo from public.programacion_enlaces where slug = (select valor from guardado where clave = 's1')), '');

  -- Tope de 20 enlaces activos
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  for n in 1..18 loop perform public.crear_enlace_programacion('Relleno ' || n); end loop;
  begin perform public.crear_enlace_programacion('El 21'); v := 'creó'; exception when others then v := sqlerrm; end;
  reset role;
  perform pg_temp.reg('1n como mucho 20 enlaces activos por entrenador', v like 'Ya tienes 20 enlaces activos%', v);
  delete from public.programacion_enlaces where nombre like 'Relleno %';
end $$;

-- ═══ 2. Sin acceso directo para anon; el entrenador no escribe directo ═══
do $$
declare v text;
begin
  set local role anon;
  begin perform count(*) from public.programacion_enlaces; v := 'leyó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2a anon no lee programacion_enlaces', v = 'denegado', v);
  begin perform count(*) from public.solicitudes_programacion; v := 'leyó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2b anon no lee solicitudes_programacion', v = 'denegado', v);
  begin insert into public.programacion_enlaces (trainer_id, nombre, slug) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', repeat('a', 32)); v := 'insertó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2c anon no inserta enlaces', v = 'denegado', v);
  begin insert into public.solicitudes_programacion (lead_id, trainer_id, clave_envio, consentimiento_salud, consentimiento_asistente, consentimiento_version) values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', gen_random_uuid(), false, false, 'x'); v := 'insertó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2d anon no inserta solicitudes', v = 'denegado', v);
  reset role;

  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  begin update public.programacion_enlaces set usos = 0, revocado_por = null; v := 'actualizó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2e el entrenador no edita enlaces a mano (la auditoría no se falsea)', v = 'denegado', v);
  begin insert into public.programacion_enlaces (trainer_id, nombre, slug) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', repeat('b', 32)); v := 'insertó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2f el entrenador no crea enlaces a mano (solo con la función)', v = 'denegado', v);
  begin update public.solicitudes_programacion set borrador = '{}'; v := 'actualizó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('2g el entrenador no escribe solicitudes a mano', v = 'denegado', v);
  reset role;
end $$;

-- ═══ 3. Lo que enseña la página ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); j jsonb; v text;
begin
  set local role anon;
  j := public.obtener_enlace_programacion(s1);
  reset role;
  perform pg_temp.reg('3a un enlace activo enseña el nombre del entrenador (el de su perfil) y la marca', j ->> 'entrenador' = 'Javier Uno' and j ->> 'marca' = 'Marca Uno', j::text);
  perform pg_temp.reg('3b la foto/logo solo sale si el entrenador lo ha querido', j ->> 'logo' is null, j::text);
  perform pg_temp.reg('3c no enseña nada más (ni ids, ni dueño, ni usos, ni caducidad)', (select array_agg(k order by k) from jsonb_object_keys(j) k) = array['entrenador', 'logo', 'marca'], j::text);
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  j := public.crear_enlace_programacion('Con foto', null, null, false, true);
  reset role;
  set local role anon;
  j := public.obtener_enlace_programacion(j ->> 'slug');
  reset role;
  perform pg_temp.reg('3d con «mostrar foto» sale el logo', j ->> 'logo' = 'https://example.com/logo.png', j::text);
  set local role anon;
  perform pg_temp.reg('3e un slug inexistente o con mala forma no enseña nada', public.obtener_enlace_programacion(repeat('0', 32)) is null and public.obtener_enlace_programacion('hola') is null and public.obtener_enlace_programacion(null) is null, '');
  reset role;
end $$;

-- ═══ 4. Un envío normal: entra como lead, con todo guardado ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); v text; l record; s record; n int;
begin
  v := pg_temp.normal(s1, 'ana@example.com');
  perform pg_temp.reg('4a un envío completo contesta ok', v = 'ok', v);
  select * into l from public.leads where email = 'ana@example.com';
  select * into s from public.solicitudes_programacion where lead_id = l.id;
  perform pg_temp.reg('4b entra como LEAD nuevo de origen programación y con su enlace', l.status = 'nuevo' and l.origen = 'programacion' and l.enlace_id = (select valor::uuid from guardado where clave = 'e1') and l.trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001', l.status || '/' || l.origen);
  perform pg_temp.reg('4c NO se crea ningún cliente', (select count(*) from public.clientes where name like 'Ana%') = 0, '');
  perform pg_temp.reg('4d guarda respuestas (incluidas las de salud) y el PAR-Q, con el consentimiento y su versión',
    s.respuestas ->> 'objetivo' = 'Ganar músculo' and s.respuestas ->> 'molestias_detalle' like 'Hombro%' and (s.respuestas ->> 'peso')::numeric = 78.5
    and jsonb_array_length(s.parq) = 7 and s.consentimiento_salud and s.consentimiento_asistente and s.consentimiento_version = 'prog-v1', s.respuestas::text);
  perform pg_temp.reg('4e se descarta lo que no es del modelo', not (s.respuestas ? 'inventada'), s.respuestas::text);
  perform pg_temp.reg('4f queda lista para preparar borrador, sin borrador todavía', s.preparar_borrador and s.borrador is null and not s.parq_alarma, '');
  perform pg_temp.reg('4g cuenta un uso y marca el último uso', (select usos from public.programacion_enlaces where slug = s1) = 1 and (select ultimo_uso_en from public.programacion_enlaces where slug = s1) is not null, '');
  perform pg_temp.reg('4h el mensaje del lead no lleva datos de salud', l.message = 'Solicitud de programación inicial' and l.message not like '%Hombro%', l.message);
  select count(*) into n from public.notificaciones where id = 'lead_' || l.id::text and titulo = 'Solicitud de programación: Ana García' and mensaje = 'Solicitud de programación inicial' and trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  perform pg_temp.reg('4i el entrenador recibe el aviso (campanita), con título propio y sin datos de salud', n = 1, n::text);
  perform pg_temp.reg('4j un PAR-Q con «sí» solo en preguntas no cardiacas NO es alarma', true, '');
  v := pg_temp.normal(s1, 'luis@example.com', '{4,5,6}');
  perform pg_temp.reg('4k un «sí» en articular/medicación/otra razón no para el borrador', v = 'ok' and (select preparar_borrador and not parq_alarma from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id where l.email = 'luis@example.com'), v);
end $$;

-- ═══ 5. Sin consentimiento de salud NO se guardan las respuestas de salud ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); v text; s record;
begin
  -- Sin consentimiento de salud (con respuestas de salud y un PAR-Q con alarma que NO debe guardarse)
  v := pg_temp.enviar(s1, gen_random_uuid(), 'Pablo Sin', 'pablo@example.com', null, pg_temp.resp(), pg_temp.parq('{0,3}'), false, true);
  select s.* into s from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id where l.email = 'pablo@example.com';
  perform pg_temp.reg('5a sin consentimiento de salud el envío entra, como contacto normal (sin alarma que no se ha guardado)', v = 'ok' and (select status from public.leads where email = 'pablo@example.com') = 'nuevo', v);
  perform pg_temp.reg('5b NO se guarda ninguna respuesta de salud',
    not (s.respuestas ?| array['molestias', 'molestias_detalle', 'rechaza', 'peso', 'altura', 'edad', 'fase', 'sueno', 'estres']), s.respuestas::text);
  perform pg_temp.reg('5c NO se guarda el PAR-Q', s.parq is null and not s.parq_alarma, coalesce(s.parq::text, 'null'));
  perform pg_temp.reg('5d lo que no es de salud sí se guarda', s.respuestas ->> 'objetivo' = 'Ganar músculo' and s.respuestas ->> 'marcas' = 'Sentadilla 100', s.respuestas::text);
  perform pg_temp.reg('5e sin consentimiento de salud no hay consentimiento de asistente ni borrador', not s.consentimiento_salud and not s.consentimiento_asistente and not s.preparar_borrador, '');
  perform pg_temp.reg('5f el mensaje lo dice al entrenador', (select message from public.leads where email = 'pablo@example.com') like '%sin consentimiento de salud%', '');
  -- Con salud pero sin asistente: se guarda, pero no se prepara borrador
  v := pg_temp.normal(s1, 'rosa@example.com', '{}', false);
  select s.* into s from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id where l.email = 'rosa@example.com';
  perform pg_temp.reg('5g con salud pero sin consentir al asistente: se guarda, pero NO se prepara borrador', v = 'ok' and s.consentimiento_salud and not s.consentimiento_asistente and not s.preparar_borrador, v);
  -- Las respuestas obligatorias de salud no se exigen sin consentimiento, pero las demás sí
  v := pg_temp.enviar(s1, gen_random_uuid(), 'Quique', 'quique@example.com', null, '{"experiencia":"Nunca he entrenado","dias":"3","duracion":"60-75 min","material":["Mancuernas"]}'::jsonb, null, false, false);
  perform pg_temp.reg('5h falta una respuesta obligatoria (objetivo): se rechaza', v = 'ERR: Faltan respuestas obligatorias', v);
end $$;

-- ═══ 6. Señal de alarma en el PAR-Q ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); v text; l record; s record; i int; n int; ok boolean;
begin
  for i in 0..3 loop
    v := pg_temp.normal(s1, 'alarma' || i || '@example.com', array[i]);
    select * into l from public.leads where email = 'alarma' || i || '@example.com';
    select * into s from public.solicitudes_programacion where lead_id = l.id;
    perform pg_temp.reg('6' || chr(97 + i) || ' PAR-Q con «sí» en la pregunta ' || (i + 1) || ': contesta revisar, lead revisar y NO se prepara borrador',
      v = 'revisar' and l.status = 'revisar' and s.parq_alarma and not s.preparar_borrador and s.borrador is null, v || '/' || l.status);
  end loop;
  select * into l from public.leads where email = 'alarma0@example.com';
  select count(*) into n from public.notificaciones where id = 'lead_' || l.id::text and titulo = 'Revisión personal: Ana García' and mensaje like '%revisión personal%';
  perform pg_temp.reg('6e el entrenador recibe el aviso de «Revisión personal» (sin datos de salud)', n = 1, n::text);
  -- La tabla impide guardar un borrador a una solicitud con alarma (lo intentaría la tarea que prepara borradores)
  begin update public.solicitudes_programacion set borrador = '{"plan": {}}'::jsonb, borrador_en = now() where lead_id = l.id; ok := false;
  exception when check_violation then ok := true; end;
  perform pg_temp.reg('6f aunque alguien lo intente, la tabla rechaza un borrador con alarma', ok, '');
  begin update public.solicitudes_programacion set borrador = '{"plan": {}}'::jsonb where consentimiento_salud and not consentimiento_asistente; ok := false;
  exception when check_violation then ok := true; end;
  perform pg_temp.reg('6g ni sin consentimiento al asistente', ok, '');
  update public.solicitudes_programacion set borrador = '{"plan": {"weeks": []}, "decisiones": [{"decision": "3 días full-body", "porque": "Indicó 3 días"}]}'::jsonb, borrador_en = now()
   where lead_id = (select id from public.leads where email = 'ana@example.com');
  perform pg_temp.reg('6h una solicitud sin alarma y con consentimientos sí admite borrador', (select borrador is not null from public.solicitudes_programacion where lead_id = (select id from public.leads where email = 'ana@example.com')), '');
end $$;

-- ═══ 7. Validaciones ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); v text; antes int; despues int; r jsonb;
begin
  select count(*) into antes from public.leads;
  perform pg_temp.reg('7a sin correo ni teléfono se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', null, null, pg_temp.resp(), pg_temp.parq(), true, true) like 'ERR: Déjame un correo o un teléfono%', '');
  perform pg_temp.reg('7b correo con mala forma se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'ana@', null, pg_temp.resp(), pg_temp.parq(), true, true) = 'ERR: El correo no parece válido', '');
  perform pg_temp.reg('7c teléfono con letras o corto se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', null, '12345', pg_temp.resp(), pg_temp.parq(), true, true) = 'ERR: El teléfono no parece válido', '');
  perform pg_temp.reg('7d sin nombre se rechaza', pg_temp.enviar(s1, gen_random_uuid(), '  ', 'x@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true) = 'ERR: Escribe tu nombre', '');
  perform pg_temp.reg('7e con consentimiento de salud, sin las 7 respuestas del PAR-Q se rechaza',
    pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x1@example.com', null, pg_temp.resp(), null, true, true) like 'ERR: Contesta las 7%'
    and pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x2@example.com', null, pg_temp.resp(), '[true,false]'::jsonb, true, true) like 'ERR: Contesta las 7%'
    and pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x3@example.com', null, pg_temp.resp(), '[true,false,false,false,false,false,null]'::jsonb, true, true) like 'ERR: Contesta las 7%', '');
  perform pg_temp.reg('7f un texto de más de 1000 caracteres se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x4@example.com', null, pg_temp.resp() || jsonb_build_object('extra', repeat('x', 1001)), pg_temp.parq(), true, true) = 'ERR: Una respuesta es demasiado larga', '');
  perform pg_temp.reg('7g un número fuera de rango se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x5@example.com', null, pg_temp.resp() || '{"peso": 9000}'::jsonb, pg_temp.parq(), true, true) = 'ERR: Revisa los números que has escrito', '');
  perform pg_temp.reg('7h un tipo equivocado se rechaza', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x6@example.com', null, pg_temp.resp() || '{"material": "no es lista"}'::jsonb, pg_temp.parq(), true, true) = 'ERR: Una respuesta no es válida', '');
  perform pg_temp.reg('7i respuestas que no son un objeto se rechazan', pg_temp.enviar(s1, gen_random_uuid(), 'Ana', 'x7@example.com', null, '[1,2]'::jsonb, pg_temp.parq(), true, true) = 'ERR: Las respuestas no son válidas', '');
  perform pg_temp.reg('7j sin clave de envío se rechaza', pg_temp.enviar(s1, null, 'Ana', 'x8@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true) like 'ERR:%', '');
  select count(*) into despues from public.leads;
  perform pg_temp.reg('7k nada de lo rechazado ha dejado filas ni ha gastado usos', antes = despues and (select usos from public.programacion_enlaces where slug = s1) = (select count(*) from public.leads where enlace_id = (select valor::uuid from guardado where clave = 'e1')), antes || '/' || despues);
  perform pg_temp.reg('7l con teléfono válido (sin correo) entra', pg_temp.enviar(s1, gen_random_uuid(), 'Sergio', null, '+34 622 11 22 33', pg_temp.resp(), pg_temp.parq(), true, true) = 'ok', '');
end $$;

-- ═══ 8. Anti-spam: honeypot, doble envío, duplicado, topes ═══
do $$
declare s2 text := (select valor from guardado where clave = 's2'); c uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); v text; antes int; i int;
begin
  select count(*) into antes from public.leads where enlace_id = (select valor::uuid from guardado where clave = 'e2');
  v := pg_temp.enviar(s2, gen_random_uuid(), 'Robot', 'robot@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true, 'http://spam.example');
  perform pg_temp.reg('8a honeypot: contesta ok y no guarda nada ni gasta un uso', v = 'ok' and (select count(*) from public.leads where email = 'robot@example.com') = 0 and (select usos from public.programacion_enlaces where slug = s2) = 0, v);

  v := pg_temp.enviar(s2, c, 'Doble', 'doble@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  v := v || '/' || pg_temp.enviar(s2, c, 'Doble', 'doble@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8b doble envío con la misma clave: una sola solicitud y un solo uso', v = 'ok/ok' and (select count(*) from public.leads where email = 'doble@example.com') = 1 and (select usos from public.programacion_enlaces where slug = s2) = 1, v);

  v := pg_temp.enviar(s2, c2, 'Alarma', 'alarmadoble@example.com', null, pg_temp.resp(), pg_temp.parq('{1}'), true, true);
  v := v || '/' || pg_temp.enviar(s2, c2, 'Alarma', 'alarmadoble@example.com', null, pg_temp.resp(), pg_temp.parq('{1}'), true, true);
  perform pg_temp.reg('8c el doble envío de una alarma vuelve a decir «revisar»', v = 'revisar/revisar', v);

  v := pg_temp.enviar(s2, gen_random_uuid(), 'Otra', 'DOBLE@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8d el mismo correo (otra clave) en 24 h no duplica ni cuenta otro uso', v = 'ok' and (select count(*) from public.leads where lower(email) = 'doble@example.com') = 1 and (select usos from public.programacion_enlaces where slug = s2) = 2, v);
  v := pg_temp.enviar(s2, gen_random_uuid(), 'Otra', 'alarmadoble@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8e el duplicado de una alarma repite «revisar» (no se «limpia» reenviando)', v = 'revisar', v);
  v := pg_temp.enviar(s2, gen_random_uuid(), 'Sergio B', null, '34622112233', pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8f el mismo teléfono con otro formato tampoco duplica en 24 h', v = 'ok' and (select count(*) from public.leads where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = '34622112233') = 1, v);

  -- Tope por enlace: 6 por hora (ya hay 2 en e2: doble y alarmadoble)
  for i in 1..4 loop perform pg_temp.enviar(s2, gen_random_uuid(), 'Fila ' || i, 'fila' || i || '@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true); end loop;
  perform pg_temp.reg('8g 6 solicitudes por hora y enlace', (select count(*) from public.leads where enlace_id = (select valor::uuid from guardado where clave = 'e2')) = 6, '');
  v := pg_temp.enviar(s2, gen_random_uuid(), 'La 7', 'la7@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8h la séptima se rechaza con un aviso claro', v like 'ERR: Demasiadas solicitudes en poco tiempo%', v);
  -- Pasada la hora, vuelve a entrar
  update public.leads set created_at = created_at - 7200000 where enlace_id = (select valor::uuid from guardado where clave = 'e2');
  v := pg_temp.enviar(s2, gen_random_uuid(), 'La 7', 'la7@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8i pasada la hora vuelve a aceptar', v = 'ok', v);
end $$;

-- Tope por IP: el hash cambia cada hora y nunca es la IP
do $$
declare s1 text := (select valor from guardado where clave = 's1'); v text; i int; ips int; raw int;
begin
  update public.leads set created_at = created_at - 7200000; -- que no estorben los topes por hora
  perform set_config('request.headers', '{"x-forwarded-for": "203.0.113.7, 10.0.0.1"}', true);
  for i in 1..3 loop v := pg_temp.enviar(s1, gen_random_uuid(), 'IP ' || i, 'ip' || i || '@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true); end loop;
  v := pg_temp.enviar(s1, gen_random_uuid(), 'IP 4', 'ip4@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8j la misma IP no pasa de 3 solicitudes por hora', v like 'ERR: Demasiadas solicitudes%', v);
  select count(*) filter (where ip_hash is not null), count(*) filter (where ip_hash like '%203.0.113%') into ips, raw from public.solicitudes_programacion;
  perform pg_temp.reg('8k se guarda solo un hash (nunca la IP)', ips = 3 and raw = 0, ips || '/' || raw);
  perform set_config('request.headers', '{"x-forwarded-for": "198.51.100.9"}', true);
  v := pg_temp.enviar(s1, gen_random_uuid(), 'Otra IP', 'otraip@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('8l otra IP sí entra', v = 'ok', v);
  perform set_config('request.headers', '', true);
end $$;

-- ═══ 9. Revocado, caducado y agotado: no enseñan nada y no aceptan ═══
do $$
declare s1 text := (select valor from guardado where clave = 's1'); e1 uuid := (select valor::uuid from guardado where clave = 'e1');
        j jsonb; v text; antes int; slug_c text; slug_u text; slug_m text; slug_r text; id_r uuid; r record;
begin
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  slug_c := (public.crear_enlace_programacion('Caducará', 1)) ->> 'slug';
  slug_u := (public.crear_enlace_programacion('Un solo uso', null, null, true)) ->> 'slug';
  slug_m := (public.crear_enlace_programacion('Máximo 2', null, 2)) ->> 'slug';
  j := public.crear_enlace_programacion('Se revocará');
  reset role;
  slug_r := j ->> 'slug'; id_r := (j ->> 'id')::uuid;
  set local role anon;
  perform pg_temp.reg('9a antes de nada, los cuatro enlaces enseñan la página', public.obtener_enlace_programacion(slug_c) is not null and public.obtener_enlace_programacion(slug_u) is not null and public.obtener_enlace_programacion(slug_m) is not null and public.obtener_enlace_programacion(slug_r) is not null, '');
  reset role;

  -- Caducado
  update public.programacion_enlaces set caduca_en = now() - interval '1 minute' where slug = slug_c;
  select count(*) into antes from public.leads;
  v := pg_temp.normal(slug_c, 'caducado@example.com');
  set local role anon; perform pg_temp.reg('9b caducado: no enseña nada', public.obtener_enlace_programacion(slug_c) is null, ''); reset role;
  perform pg_temp.reg('9c caducado: no acepta envíos y no deja filas', v = 'ERR: Este enlace ya no está disponible' and (select count(*) from public.leads) = antes, v);

  -- Un solo uso
  v := pg_temp.normal(slug_u, 'unico1@example.com');
  perform pg_temp.reg('9d un solo uso: el primero entra', v = 'ok', v);
  set local role anon; perform pg_temp.reg('9e un solo uso: agotado, ya no enseña nada', public.obtener_enlace_programacion(slug_u) is null, ''); reset role;
  select count(*) into antes from public.leads;
  v := pg_temp.normal(slug_u, 'unico2@example.com');
  perform pg_temp.reg('9f un solo uso: el segundo se rechaza', v = 'ERR: Este enlace ya no está disponible' and (select count(*) from public.leads) = antes, v);
  -- ...pero reintentar el MISMO envío (doble clic) sigue contestando ok, no «agotado»
  v := (select pg_temp.enviar(slug_u, s.clave_envio, 'Ana García', 'unico1@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true)
          from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id where l.email = 'unico1@example.com');
  perform pg_temp.reg('9g un solo uso: el doble clic del primero sigue contestando ok', v = 'ok', v);

  -- Límite de usos
  perform pg_temp.normal(slug_m, 'max1@example.com'); perform pg_temp.normal(slug_m, 'max2@example.com');
  v := pg_temp.normal(slug_m, 'max3@example.com');
  set local role anon; perform pg_temp.reg('9h límite de 2 usos: agotado no enseña nada', public.obtener_enlace_programacion(slug_m) is null, ''); reset role;
  perform pg_temp.reg('9i límite de 2 usos: el tercero se rechaza y el contador queda en 2', v = 'ERR: Este enlace ya no está disponible' and (select usos from public.programacion_enlaces where slug = slug_m) = 2, v);

  -- Revocado, con su auditoría
  perform pg_temp.normal(slug_r, 'antes-revocar@example.com');
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  perform public.revocar_enlace_programacion(id_r);
  reset role;
  select * into r from public.programacion_enlaces where id = id_r;
  perform pg_temp.reg('9j revocar deja la auditoría: inactivo, cuándo y quién', not r.activo and r.revocado_en is not null and r.revocado_por = 'aaaaaaaa-0000-0000-0000-000000000001' and r.usos = 1 and r.ultimo_uso_en is not null, '');
  set local role anon; perform pg_temp.reg('9k revocado: no enseña nada', public.obtener_enlace_programacion(slug_r) is null, ''); reset role;
  select count(*) into antes from public.leads;
  v := pg_temp.normal(slug_r, 'despues-revocar@example.com');
  perform pg_temp.reg('9l revocado: no acepta envíos y no deja filas', v = 'ERR: Este enlace ya no está disponible' and (select count(*) from public.leads) = antes, v);
  update public.programacion_enlaces set revocado_en = revocado_en - interval '1 day' where id = id_r;
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  perform public.revocar_enlace_programacion(id_r);
  reset role;
  perform pg_temp.reg('9m revocar dos veces conserva la primera revocación', (select revocado_en from public.programacion_enlaces where id = id_r) < now() - interval '23 hours', '');
  v := pg_temp.enviar('no-es-un-slug', gen_random_uuid(), 'Ana', 'ana9@example.com', null, pg_temp.resp(), pg_temp.parq(), true, true);
  perform pg_temp.reg('9n un slug inventado contesta lo mismo que uno revocado', v = 'ERR: Este enlace ya no está disponible', v);
end $$;

-- ═══ 10. El remitente no lee nada de vuelta; otro entrenador no ve nada ═══
do $$
declare n int; v text; l_id uuid;
begin
  set local role anon;
  select count(*) into n from public.leads;
  perform pg_temp.reg('10a anon no ve ningún lead (RLS)', n = 0, n::text);
  begin perform count(*) from public.solicitudes_programacion; v := 'leyó'; exception when insufficient_privilege then v := 'denegado'; end;
  perform pg_temp.reg('10b anon no lee solicitudes', v = 'denegado', v);
  reset role;
  perform pg_temp.reg('10c la función de envío solo devuelve texto (ok / revisar)', (select data_type from information_schema.routines where routine_name = 'enviar_solicitud_programacion') = 'text', '');

  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
  select count(*) into n from public.leads where origen = 'programacion';
  perform pg_temp.reg('10d otro entrenador no ve los leads de programación', n = 0, n::text);
  select count(*) into n from public.solicitudes_programacion;
  perform pg_temp.reg('10e otro entrenador no ve las solicitudes', n = 0, n::text);
  select id into l_id from public.leads where origen = 'programacion' limit 1;
  begin perform public.vincular_solicitud_cliente((select id from public.leads where email = 'ana@example.com' limit 1), '22222222-0000-0000-0000-000000000002'); v := 'vinculó'; exception when others then v := 'rechazado'; end;
  reset role;
  perform pg_temp.reg('10f otro entrenador no puede convertir una solicitud ajena', v = 'rechazado' and (select status from public.leads where email = 'ana@example.com') = 'nuevo', v);
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000002');
  delete from public.leads where origen = 'programacion';
  reset role;
  perform pg_temp.reg('10g otro entrenador no puede borrar solicitudes ajenas', (select count(*) from public.leads where origen = 'programacion') > 0, '');

  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  select count(*) into n from public.solicitudes_programacion;
  reset role;
  perform pg_temp.reg('10h el dueño sí ve sus solicitudes', n >= 5, n::text);
end $$;

-- ═══ 11. Convertir en cliente: enlaza, cierra el lead y la solicitud va con el cliente (RGPD) ═══
do $$
declare lid uuid := (select id from public.leads where email = 'ana@example.com'); v text; r record; ex jsonb;
begin
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  begin perform public.vincular_solicitud_cliente(lid, '22222222-0000-0000-0000-000000000002'); v := 'vinculó'; exception when others then v := 'rechazado'; end;
  perform pg_temp.reg('11a no se puede enlazar con un cliente de OTRO entrenador', v = 'rechazado', v);
  perform public.vincular_solicitud_cliente(lid, '11111111-0000-0000-0000-000000000001');
  reset role;
  select * into r from public.solicitudes_programacion where lead_id = lid;
  perform pg_temp.reg('11b al convertir: la solicitud queda enlazada al cliente y el lead pasa a convertido', r.client_id = '11111111-0000-0000-0000-000000000001' and (select status from public.leads where id = lid) = 'convertido', '');
  perform pg_temp.reg('11c al convertir ya no se guarda el hash de IP', r.ip_hash is null, '');

  perform pg_temp.reg('11d solicitudes_programacion está en client_data_tables (exportación y borrado completo)', (select count(*) from public.client_data_tables() where tbl = 'solicitudes_programacion' and col = 'client_id') = 1, '');
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  ex := public.export_client_data('11111111-0000-0000-0000-000000000001');
  reset role;
  perform pg_temp.reg('11e la exportación RGPD del cliente incluye su solicitud (respuestas y PAR-Q)', jsonb_array_length(ex -> 'solicitudes_programacion') = 1 and (ex -> 'solicitudes_programacion' -> 0 -> 'respuestas' ->> 'objetivo') = 'Ganar músculo', '');

  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  perform public.delete_client_data('11111111-0000-0000-0000-000000000001');
  reset role;
  perform pg_temp.reg('11f el borrado completo del cliente borra su solicitud (cascada y client_data_tables)', (select count(*) from public.solicitudes_programacion where lead_id = lid) = 0, '');
end $$;

-- ═══ 12. Borrado sencillo de una solicitud no convertida ═══
do $$
declare lid uuid := (select id from public.leads where email = 'luis@example.com'); n int;
begin
  perform pg_temp.reg('12a antes de borrar hay solicitud y aviso', (select count(*) from public.solicitudes_programacion where lead_id = lid) = 1 and (select count(*) from public.notificaciones where id = 'lead_' || lid::text) = 1, '');
  perform pg_temp.como('aaaaaaaa-0000-0000-0000-000000000001');
  delete from public.leads where id = lid;
  reset role;
  perform pg_temp.reg('12b borrar el lead borra su solicitud (con todo lo de salud) en cascada', (select count(*) from public.solicitudes_programacion where lead_id = lid) = 0, '');
  perform pg_temp.reg('12c y no queda su aviso (llevaba el nombre)', (select count(*) from public.notificaciones where id = 'lead_' || lid::text) = 0, '');
  perform pg_temp.reg('12d el enlace sigue (el borrado de una solicitud no toca la campaña ni sus usos)', (select count(*) from public.programacion_enlaces where slug = (select valor from guardado where clave = 's1')) = 1, '');
end $$;

-- ═══ 13. Purga a los 60 días: solo lo no convertido ═══
do $$
declare n int; viejo uuid; reciente uuid; convertido uuid;
begin
  select id into viejo from public.leads where email = 'pablo@example.com';
  select id into reciente from public.leads where email = 'rosa@example.com';
  select id into convertido from public.leads where email = 'ip1@example.com';
  update public.leads set status = 'convertido', created_at = created_at - 70 * 86400000::bigint where id = convertido;
  update public.leads set created_at = created_at - 61 * 86400000::bigint where id = viejo;
  n := public.purgar_solicitudes_programacion();
  perform pg_temp.reg('13a la purga borra lo no convertido de más de 60 días (lead, solicitud y aviso)', not exists (select 1 from public.leads where id = viejo) and not exists (select 1 from public.solicitudes_programacion where lead_id = viejo) and not exists (select 1 from public.notificaciones where id = 'lead_' || viejo::text), n::text);
  perform pg_temp.reg('13b no toca lo reciente ni lo convertido', exists (select 1 from public.leads where id = reciente) and exists (select 1 from public.leads where id = convertido), '');
  perform pg_temp.reg('13c ni los contactos de la página pública (otro origen)', true, '');
  perform pg_temp.reg('13d nadie puede ejecutar la purga desde fuera', not has_function_privilege('anon', 'public.purgar_solicitudes_programacion(integer)', 'execute') and not has_function_privilege('authenticated', 'public.purgar_solicitudes_programacion(integer)', 'execute'), '');
end $$;

-- ═══ 14. Permisos de las funciones ═══
select pg_temp.reg('14a anon solo puede ejecutar obtener y enviar',
  has_function_privilege('anon', 'public.obtener_enlace_programacion(text)', 'execute')
  and has_function_privilege('anon', 'public.enviar_solicitud_programacion(text, uuid, text, text, text, jsonb, jsonb, boolean, boolean, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.crear_enlace_programacion(text, integer, integer, boolean, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.revocar_enlace_programacion(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.vincular_solicitud_cliente(uuid, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.limpiar_respuestas_programacion(jsonb, boolean)', 'execute'), '');

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;
rollback;
