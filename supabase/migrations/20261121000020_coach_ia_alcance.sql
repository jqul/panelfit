-- Coach IA beta: corrige el ALCANCE del puente tras la revisión de #214 (2026-11-21). No toca la migración anterior (20261121000010).
--
-- La revisión encontró tres fallos que contradecían las garantías prometidas:
--   1. «Solo mi perfil» era una convención de la tarea, no una restricción del servidor. Ahora hay una lista de entrenadores habilitados
--      (`coach_ia_habilitados`, vacía por defecto: sin fila, Coach IA no funciona para nadie) y la comprueban `coach_ia_casos_pendientes`,
--      `coach_ia_paquete` y `coach_ia_guardar_borrador`. Un caso de un entrenador no habilitado se trata igual que uno inexistente. La fila
--      se crea a mano en la base de datos (nada en el repositorio: es un uid de persona).
--   2. El paquete llevaba campos que el propio cuestionario marca como salud (rechaza, peso, altura, edad, fase, sueño, estrés). Ahora es
--      una LISTA BLANCA de respuestas que no son de salud (lo que no esté en ella no sale nunca, aunque se añada una pregunta nueva) y, en
--      lugar de la edad, solo «mayor_de_edad: true» (la comprobación se hace dentro de la base de datos). Los campos de texto libre
--      que no son de salud (objetivo_detalle, rutina_actual, extra…) pueden contener, aun así, algo que la persona escriba: eso no se
--      puede filtrar por código y se trata en el consentimiento y en el protocolo (si el texto habla de salud, no se prepara el borrador).
--   3. `coachNotes` deja de aceptarse en la propuesta: las notas privadas se blindaron precisamente para no volver a entrar en planes.
--
-- Lo que NO resuelve esta migración (y por eso no se llama «aislamiento técnico»): quien lanza la tarea con acceso de administrador por
-- MCP puede seguir leyendo cualquier tabla. Eso solo lo arregla una credencial o herramienta que exponga ÚNICAMENTE estas tres operaciones
-- (ver docs/coach-ia.md); mientras tanto es un proceso asistido de administrador, con límites en lo que las funciones devuelven y aceptan.
-- Prueba: hardening/tests/bloque44_coach_ia_puente.sql (run-pglite-coach-ia.mjs).

-- ── 1. Lista de entrenadores habilitados ──
create table if not exists public.coach_ia_habilitados (
  trainer_id   uuid primary key references public.entrenadores(uid) on delete cascade,
  habilitado_en timestamptz not null default now()
);
comment on table public.coach_ia_habilitados is 'Entrenadores para los que funciona Coach IA beta. Se rellena a mano (insert into public.coach_ia_habilitados (trainer_id) values (...)); sin fila, las funciones coach_ia_* no devuelven ni guardan nada.';
alter table public.coach_ia_habilitados enable row level security;
-- Sin políticas y sin permisos: la app no la lee ni la escribe (solo quien tiene acceso de servicio)
revoke all on public.coach_ia_habilitados from anon, authenticated;

create or replace function public.coach_ia_habilitado(p_trainer uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from public.coach_ia_habilitados where trainer_id = p_trainer);
$$;
revoke execute on function public.coach_ia_habilitado(uuid) from public, anon, authenticated;

-- ── 2. Casos pendientes: vacío si el entrenador no está habilitado ──
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
   where public.coach_ia_habilitado(p_trainer)
     and s.trainer_id = p_trainer and s.client_id is null and s.borrador_estado in ('sin_generar', 'descartado') and s.created_at > now() - interval '60 days';
$$;
revoke execute on function public.coach_ia_casos_pendientes(uuid) from public, anon, authenticated;

-- ── 3. Paquete: habilitado, y solo respuestas que no son de salud ──
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
  -- Lista blanca: las preguntas que el cuestionario NO marca como de salud (lib/solicitudProgramacion: IDS_SALUD). Una pregunta nueva
  -- no sale hasta que alguien la añada aquí a propósito; una prueba comprueba que ninguna de salud está en la lista.
  v_permitidas constant text[] := array['objetivo', 'objetivo_detalle', 'experiencia', 'rutina_actual', 'dias', 'duracion', 'material', 'marcas', 'pasos', 'cardio', 'prioridad', 'barreras', 'extra'];
begin
  select * into s from public.solicitudes_programacion where lead_id = p_lead_id;
  -- Inexistente y de un entrenador no habilitado se responden igual: no se revela ni que existe
  if not found or not public.coach_ia_habilitado(s.trainer_id) then return jsonb_build_object('elegible', false, 'motivo', 'no_existe'); end if;

  v_motivo := public.coach_ia_motivo_revision(s);
  if v_motivo is null and s.borrador_estado = 'aprobado' then v_motivo := 'ya_aprobado'; end if;
  if v_motivo is null and s.borrador_estado not in ('listo_para_revisar') and public.coach_ia_casos_activos(s.trainer_id) >= 5 then
    v_motivo := 'cupo_completo';
  end if;

  if v_motivo is not null then
    update public.solicitudes_programacion set ia_leida_en = now(), ia_campos = '{}' where lead_id = p_lead_id;
    return jsonb_build_object('elegible', false, 'motivo', public.coach_ia_motivo_publico(v_motivo));
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_resp from jsonb_each(s.respuestas) where key = any (v_permitidas);
  select left(split_part(btrim(name), ' ', 1), 40) into v_nombre from public.leads where id = p_lead_id;
  select profile -> 'criteriosProgramacion' into v_crit from public.entrenadores where uid = s.trainer_id;
  select coalesce(array_agg(k order by k), '{}') into v_campos from jsonb_object_keys(v_resp) k;
  v_campos := array['nombre'] || v_campos || array['mayor_de_edad', 'criterios'];

  update public.solicitudes_programacion set ia_leida_en = now(), ia_campos = v_campos where lead_id = p_lead_id;
  return jsonb_build_object(
    'elegible', true,
    'lead_id', p_lead_id,
    'nombre', v_nombre,
    -- Un caso elegible ya pasó la comprobación de edad dentro de la base de datos: se entrega el resultado, no el dato
    'mayor_de_edad', true,
    'respuestas', v_resp,
    'criterios', coalesce(v_crit, '{}'::jsonb),
    'criterios_version', coalesce(v_crit ->> 'version', '0'),
    'politica', 'coach-ia-v0-provisional-2026-11',
    'limites', jsonb_build_object('max_semanas', 16, 'max_dias_semana', 7, 'max_ejercicios_dia', 14, 'max_razones', 30)
  );
end;
$$;
revoke execute on function public.coach_ia_paquete(uuid) from public, anon, authenticated;

-- ── 4. Plan propuesto: sin coachNotes ──
create or replace function public.coach_ia_validar_plan(p jsonb)
 returns text language plpgsql immutable
 set search_path to 'public'
as $$
declare
  w jsonb; d jsonb; e jsonb; k text; n int := 0;
  claves_plan constant text[] := array['type', 'restMain', 'restAcc', 'restWarn', 'programName', 'weeks'];
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

-- ── 5. Guardar: habilitado ──
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
  if not found or not public.coach_ia_habilitado(s.trainer_id) then raise exception 'No existe esa solicitud'; end if;

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
  update public.leads set status = 'borrador_listo' where id = p_lead_id and status = 'nuevo';
  return 'ok';
end;
$$;
revoke execute on function public.coach_ia_guardar_borrador(uuid, jsonb, jsonb, text) from public, anon, authenticated;
