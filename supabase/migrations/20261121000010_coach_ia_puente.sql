-- Coach IA beta: el puente seguro entre una solicitud de programación y quien prepara el borrador (2026-11-21).
--
-- Flujo SEMIAUTOMÁTICO, sin API de modelo ni coste por llamada: el entrenador abre Claude (su suscripción) y lanza la tarea; Claude lee
-- UN caso, prepara el borrador y lo guarda como «listo para revisar». Nada se publica: el entrenador lo aprueba o lo descarta y, al
-- convertir la solicitud en cliente, la propuesta aprobada queda como BORRADOR de su plan (flujo que ya existía, `planBorradorDe`).
--
-- Tres piezas, todas sobre `solicitudes_programacion` (no hay tablas nuevas: lo que se crea cae con el lead, la solicitud o el cliente):
--   coach_ia_motivo_revision(s)      la elegibilidad, en un solo sitio. Devuelve NULL si el caso puede prepararse sin revisión profesional
--                                    previa, o el motivo por el que NO se genera plan (PAR-Q con cualquier «sí», molestias, datos
--                                    contradictorios, edad…). Es más estricta que la alarma del PAR-Q que ya paraba el borrador.
--   coach_ia_casos_pendientes(uid)   los casos de UN entrenador que esperan borrador: solo nombre de pila, fecha, estado y si son aptos.
--   coach_ia_paquete(lead)           lo ÚNICO que lee quien prepara el borrador: nombre de pila, respuestas sin molestias, criterios del
--                                    entrenador. Nunca el PAR-Q, ni el detalle de molestias, ni correo ni teléfono. Si el caso no es
--                                    elegible no devuelve respuestas, solo un motivo (genérico, «requiere revisión profesional», si la
--                                    causa es de salud). Cada lectura deja constancia (cuándo y qué campos).
--   coach_ia_guardar_borrador(...)   acepta solo un borrador VALIDADO (forma del plan, límites de tamaño, claves permitidas) para un caso
--                                    elegible; nunca aprueba, nunca toca `planes`. Con tope de casos pendientes por entrenador.
--   decidir_borrador_solicitud(...)  aprobar o descartar, solo el dueño de la solicitud.
--
-- Las dos funciones de Claude NO se conceden a `anon` ni `authenticated`: las llama solo quien tiene acceso de servicio (la tarea que
-- lanza el entrenador). El límite de «solo este caso» lo da lo que devuelve la función, no un permiso de fila.
-- Prueba: hardening/tests/bloque44_coach_ia_puente.sql (run-pglite-coach-ia.mjs).

-- ── 1. Trazabilidad en la propia solicitud ──
alter table public.solicitudes_programacion add column if not exists ia_leida_en timestamptz;
alter table public.solicitudes_programacion add column if not exists ia_campos text[];
alter table public.solicitudes_programacion add column if not exists borrador_generado_en timestamptz;
alter table public.solicitudes_programacion add column if not exists borrador_decidido_en timestamptz;

-- ── 2. Elegibilidad: un solo sitio ──
-- El reflejo en TypeScript es src/lib/coachIa.ts (`motivoRevision`); una prueba de Vitest comprueba que coinciden los números clave.
create or replace function public.coach_ia_motivo_revision(s public.solicitudes_programacion)
 returns text language plpgsql immutable
 set search_path to 'public'
as $$
declare
  v_molestias jsonb := s.respuestas -> 'molestias';
  v_detalle text := btrim(coalesce(s.respuestas ->> 'molestias_detalle', ''));
  v_edad numeric;
begin
  if s.client_id is not null then return 'ya_es_cliente'; end if;
  if not s.consentimiento_salud then return 'sin_consentimiento_salud'; end if;
  if not s.consentimiento_asistente then return 'sin_consentimiento_asistente'; end if;
  if s.parq_alarma then return 'alarma_parq'; end if;
  -- Cualquier «sí» del PAR-Q (también articular, medicación u otra razón): en la beta lo ve una persona antes de programar nada
  if s.parq is null or jsonb_typeof(s.parq) <> 'array' or jsonb_array_length(s.parq) <> 7 then return 'datos_incompletos'; end if;
  if exists (select 1 from jsonb_array_elements(s.parq) x where x = 'true'::jsonb) then return 'parq_con_si'; end if;
  if v_molestias is null or jsonb_typeof(v_molestias) <> 'boolean' then return 'datos_incompletos'; end if;
  if v_molestias = 'true'::jsonb then return 'molestias'; end if;
  -- Dice que no tiene molestias pero describe una: contradictorio
  if v_detalle <> '' then return 'datos_contradictorios'; end if;
  begin v_edad := (s.respuestas ->> 'edad')::numeric; exception when others then v_edad := null; end;
  if v_edad is null or v_edad < 18 then return 'edad'; end if;
  return null;
end;
$$;
revoke execute on function public.coach_ia_motivo_revision(public.solicitudes_programacion) from public, anon, authenticated;

-- Lo que ve quien prepara el borrador: si la causa viene de la salud (PAR-Q, molestias, datos de salud contradictorios o incompletos) solo
-- sabe que «requiere revisión profesional», no cuál fue (eso lo ve el entrenador en la solicitud). Lo administrativo sí lo ve tal cual.
create or replace function public.coach_ia_motivo_publico(p_motivo text)
 returns text language sql immutable
 set search_path to 'public'
as $$
  select case when p_motivo in ('alarma_parq', 'parq_con_si', 'datos_incompletos', 'molestias', 'datos_contradictorios')
              then 'requiere_revision_profesional' else p_motivo end;
$$;
revoke execute on function public.coach_ia_motivo_publico(text) from public, anon, authenticated;

-- Casos pendientes de decidir (borrador listo o aprobado y aún sin convertir) de un entrenador: el tope de la beta
create or replace function public.coach_ia_casos_activos(p_trainer uuid)
 returns integer language sql stable
 set search_path to 'public'
as $$
  select count(*)::integer from public.solicitudes_programacion
   where trainer_id = p_trainer and client_id is null and borrador_estado in ('listo_para_revisar', 'aprobado');
$$;
revoke execute on function public.coach_ia_casos_activos(uuid) from public, anon, authenticated;

-- ── 3. Lo que lee quien prepara el borrador ──
create or replace function public.coach_ia_paquete(p_lead_id uuid)
 returns jsonb language plpgsql security definer
 set search_path to 'public'
as $$
declare
  s public.solicitudes_programacion;
  v_motivo text;
  v_resp jsonb;
  v_crit jsonb;
  v_nombre text;
  v_campos text[];
begin
  select * into s from public.solicitudes_programacion where lead_id = p_lead_id;
  if not found then return jsonb_build_object('elegible', false, 'motivo', 'no_existe'); end if;

  v_motivo := public.coach_ia_motivo_revision(s);
  -- Ya aprobado: no se vuelve a preparar. Cupo lleno: no se abre un caso nuevo (regenerar uno ya listo no cuenta como nuevo).
  if v_motivo is null and s.borrador_estado = 'aprobado' then v_motivo := 'ya_aprobado'; end if;
  if v_motivo is null and s.borrador_estado not in ('listo_para_revisar') and public.coach_ia_casos_activos(s.trainer_id) >= 5 then
    v_motivo := 'cupo_completo';
  end if;

  if v_motivo is not null then
    update public.solicitudes_programacion set ia_leida_en = now(), ia_campos = '{}' where lead_id = p_lead_id;
    return jsonb_build_object('elegible', false, 'motivo', public.coach_ia_motivo_publico(v_motivo));
  end if;

  -- Sin el detalle de molestias ni, por supuesto, el PAR-Q (en un caso elegible ya no hay «sí» ni molestias)
  v_resp := s.respuestas - array['molestias', 'molestias_detalle'];
  select left(split_part(btrim(name), ' ', 1), 40) into v_nombre from public.leads where id = p_lead_id;
  select profile -> 'criteriosProgramacion' into v_crit from public.entrenadores where uid = s.trainer_id;
  select coalesce(array_agg(k order by k), '{}') into v_campos from jsonb_object_keys(v_resp) k;
  v_campos := array['nombre'] || v_campos || array['criterios'];

  update public.solicitudes_programacion set ia_leida_en = now(), ia_campos = v_campos where lead_id = p_lead_id;
  return jsonb_build_object(
    'elegible', true,
    'lead_id', p_lead_id,
    'nombre', v_nombre,
    'respuestas', v_resp,
    'criterios', coalesce(v_crit, '{}'::jsonb),
    'criterios_version', coalesce(v_crit ->> 'version', '0'),
    'politica', 'coach-ia-v0-provisional-2026-11',
    'limites', jsonb_build_object('max_semanas', 16, 'max_dias_semana', 7, 'max_ejercicios_dia', 14, 'max_razones', 30)
  );
end;
$$;
revoke execute on function public.coach_ia_paquete(uuid) from public, anon, authenticated;

-- Los casos que esperan borrador, para que el entrenador no tenga que pasar identificadores a mano: solo nombre de pila, cuándo llegó y si
-- es apto (con el motivo genérico si no). Ni respuestas, ni contacto, ni PAR-Q. Solo los de los últimos 60 días (la retención de la solicitud).
create or replace function public.coach_ia_casos_pendientes(p_trainer uuid)
 returns jsonb language sql security definer stable
 set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'lead_id', s.lead_id,
           'nombre', left(split_part(btrim(l.name), ' ', 1), 40),
           'recibido_en', s.created_at,
           'estado', s.borrador_estado,
           'elegible', public.coach_ia_motivo_revision(s) is null,
           'motivo', public.coach_ia_motivo_publico(public.coach_ia_motivo_revision(s))
         ) order by s.created_at), '[]'::jsonb)
    from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id
   where s.trainer_id = p_trainer and s.client_id is null and s.borrador_estado in ('sin_generar', 'descartado') and s.created_at > now() - interval '60 days';
$$;
revoke execute on function public.coach_ia_casos_pendientes(uuid) from public, anon, authenticated;

-- ── 4. Validar la forma del plan propuesto ──
-- Solo claves conocidas y tamaños razonables: lo que se guarda acaba pudiendo ser el plan de una persona, así que no se admite nada
-- que la app no espere (ni vídeos, ni enlaces, ni macros). Devuelve NULL si es válido o el motivo.
create or replace function public.coach_ia_validar_plan(p jsonb)
 returns text language plpgsql immutable
 set search_path to 'public'
as $$
declare
  w jsonb; d jsonb; e jsonb; k text; n int := 0;
  claves_plan constant text[] := array['type', 'restMain', 'restAcc', 'restWarn', 'programName', 'coachNotes', 'weeks'];
  claves_semana constant text[] := array['label', 'rpe', 'isCurrent', 'isDeload', 'days'];
  claves_dia constant text[] := array['title', 'focus', 'warmup', 'exercises'];
  claves_ej constant text[] := array['name', 'sets', 'weight', 'isMain', 'comment', 'restSets', 'restAfter', 'tempo', 'rir', 'seriesType', 'pesoPorLado', 'papel', 'alternativas'];
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'La propuesta no es un plan'; end if;
  if length(p::text) > 300000 then return 'La propuesta es demasiado grande'; end if;
  for k in select jsonb_object_keys(p) loop
    if not (k = any (claves_plan)) then return 'La propuesta lleva un campo no permitido: ' || left(k, 40); end if;
  end loop;
  if jsonb_typeof(p -> 'weeks') <> 'array' or jsonb_array_length(p -> 'weeks') not between 1 and 16 then return 'La propuesta debe llevar de 1 a 16 semanas'; end if;
  for w in select * from jsonb_array_elements(p -> 'weeks') loop
    if jsonb_typeof(w) <> 'object' then return 'Una semana no es válida'; end if;
    for k in select jsonb_object_keys(w) loop
      if not (k = any (claves_semana)) then return 'Una semana lleva un campo no permitido: ' || left(k, 40); end if;
    end loop;
    if jsonb_typeof(w -> 'days') <> 'array' or jsonb_array_length(w -> 'days') not between 1 and 7 then return 'Cada semana lleva de 1 a 7 días'; end if;
    for d in select * from jsonb_array_elements(w -> 'days') loop
      if jsonb_typeof(d) <> 'object' then return 'Un día no es válido'; end if;
      for k in select jsonb_object_keys(d) loop
        if not (k = any (claves_dia)) then return 'Un día lleva un campo no permitido: ' || left(k, 40); end if;
      end loop;
      if jsonb_typeof(d -> 'exercises') <> 'array' or jsonb_array_length(d -> 'exercises') not between 1 and 14 then return 'Cada día lleva de 1 a 14 ejercicios'; end if;
      for e in select * from jsonb_array_elements(d -> 'exercises') loop
        if jsonb_typeof(e) <> 'object' then return 'Un ejercicio no es válido'; end if;
        for k in select jsonb_object_keys(e) loop
          if not (k = any (claves_ej)) then return 'Un ejercicio lleva un campo no permitido: ' || left(k, 40); end if;
        end loop;
        if jsonb_typeof(e -> 'name') <> 'string' or length(btrim(e ->> 'name')) not between 1 and 120 then return 'Cada ejercicio necesita un nombre (hasta 120 caracteres)'; end if;
        if jsonb_typeof(e -> 'sets') <> 'string' or length(e ->> 'sets') > 20 then return 'Cada ejercicio necesita las series como texto corto (por ejemplo «3x8»)'; end if;
        if length(e::text) > 3000 then return 'Un ejercicio es demasiado largo'; end if;
        n := n + 1;
      end loop;
    end loop;
  end loop;
  if n < 1 then return 'La propuesta no lleva ejercicios'; end if;
  return null;
end;
$$;
revoke execute on function public.coach_ia_validar_plan(jsonb) from public, anon, authenticated;

-- ── 5. Guardar el borrador (solo para un caso elegible; nunca aprueba, nunca toca planes) ──
create or replace function public.coach_ia_guardar_borrador(p_lead_id uuid, p_propuesta jsonb, p_razones jsonb, p_criterios text)
 returns text language plpgsql security definer
 set search_path to 'public'
as $$
declare
  s public.solicitudes_programacion;
  v_motivo text;
  v_error text;
begin
  select * into s from public.solicitudes_programacion where lead_id = p_lead_id for update;
  if not found then raise exception 'No existe esa solicitud'; end if;

  v_motivo := public.coach_ia_motivo_revision(s);
  if v_motivo is not null then raise exception 'No se guarda el borrador: caso no apto (%)', public.coach_ia_motivo_publico(v_motivo); end if;
  if s.borrador_estado = 'aprobado' then raise exception 'El borrador ya está aprobado'; end if;
  if s.borrador_estado <> 'listo_para_revisar' and public.coach_ia_casos_activos(s.trainer_id) >= 5 then
    raise exception 'Hay 5 casos pendientes de decidir: aprueba o descarta alguno antes de preparar otro';
  end if;

  v_error := public.coach_ia_validar_plan(p_propuesta);
  if v_error is not null then raise exception '%', v_error; end if;

  if p_razones is null or jsonb_typeof(p_razones) <> 'array' or jsonb_array_length(p_razones) not between 1 and 30
     or exists (select 1 from jsonb_array_elements(p_razones) r
                 where jsonb_typeof(r) <> 'object' or jsonb_typeof(r -> 'decision') <> 'string' or jsonb_typeof(r -> 'porque') <> 'string'
                    or length(btrim(r ->> 'decision')) not between 1 and 300 or length(btrim(r ->> 'porque')) not between 1 and 600
                    or exists (select 1 from jsonb_object_keys(r) k where k not in ('decision', 'porque'))) then
    raise exception 'Cada decisión necesita su porqué (de 1 a 30 razones, solo «decision» y «porque»)';
  end if;
  if p_criterios is null or length(btrim(p_criterios)) not between 1 and 40 then raise exception 'Indica la versión de los criterios'; end if;

  update public.solicitudes_programacion
     set propuesta = p_propuesta, razones = p_razones, criterios_version = btrim(p_criterios),
         borrador_estado = 'listo_para_revisar', borrador_generado_en = now(), borrador_decidido_en = null
   where lead_id = p_lead_id;
  -- El contacto pasa a «Borrador listo» (si el entrenador ya lo había movido a otro estado, se respeta)
  update public.leads set status = 'borrador_listo' where id = p_lead_id and status = 'nuevo';
  return 'ok';
end;
$$;
revoke execute on function public.coach_ia_guardar_borrador(uuid, jsonb, jsonb, text) from public, anon, authenticated;

-- ── 6. El entrenador decide ──
create or replace function public.decidir_borrador_solicitud(p_lead_id uuid, p_decision text)
 returns text language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  s public.solicitudes_programacion;
begin
  if v_uid is null or not exists (select 1 from public.leads where id = p_lead_id and trainer_id = v_uid and origen = 'programacion') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into s from public.solicitudes_programacion where lead_id = p_lead_id for update;
  if not found or s.client_id is not null then raise exception 'La solicitud ya no admite cambios'; end if;

  if p_decision = 'aprobar' then
    if s.borrador_estado <> 'listo_para_revisar' then raise exception 'No hay un borrador listo para aprobar'; end if;
    update public.solicitudes_programacion set borrador_estado = 'aprobado', borrador_decidido_en = now() where lead_id = p_lead_id;
  elsif p_decision = 'descartar' then
    if s.borrador_estado not in ('listo_para_revisar', 'aprobado') then raise exception 'No hay borrador que descartar'; end if;
    -- Un borrador descartado no se conserva (minimización): vuelve a poder prepararse desde cero
    update public.solicitudes_programacion
       set borrador_estado = 'descartado', borrador_decidido_en = now(), propuesta = null, razones = null
     where lead_id = p_lead_id;
    update public.leads set status = 'nuevo' where id = p_lead_id and status = 'borrador_listo';
  else
    raise exception 'Decisión no válida';
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.decidir_borrador_solicitud(uuid, text) from public, anon;
grant execute on function public.decidir_borrador_solicitud(uuid, text) to authenticated;
