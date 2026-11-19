-- Solicitud de programación inicial por enlace público revocable (2026-11-18).
--
-- Una puerta de entrada CONTROLADA al servicio del entrenador: él crea un enlace (con caducidad, límite de usos, revocable),
-- lo comparte, y quien lo abre rellena una solicitud breve SIN cuenta. La solicitud entra como lead (NO como cliente) y,
-- si el PAR-Q no da señal de alarma, queda a la espera de un borrador privado que el entrenador revisa. Solo al
-- «Convertir en cliente y enviar acceso» se crea la ficha.
--
-- Piezas:
--   programacion_enlaces        el enlace/campaña: slug aleatorio no adivinable, dueño, caducidad, límite de usos, un solo uso,
--                               activo/revocado y auditoría (creación, usos, último uso, quién y cuándo lo revocó).
--   leads (ampliada)            + origen ('pagina' | 'programacion') + enlace_id; estados nuevos 'revisar' y 'borrador_listo'.
--                               Se reutiliza `leads` (no una tabla nueva) porque ahí ya viven la Bandeja, Contactos, el aviso
--                               (trigger leads_notify), la conversión a cliente y el borrado: una sola bandeja para todo lo que entra.
--   solicitudes_programacion    1:1 con el lead, EN CASCADA. Las respuestas, el PAR-Q, los consentimientos y el borrador privado
--                               van aparte para que ningún `select * from leads` (Bandeja, Hoy…) arrastre datos de salud.
--   entrenadores.profile        los «criterios para programación inicial» se guardan en el perfil (ya es solo del dueño): no
--                               hace falta migración, solo lo escribe la pantalla.
--
-- Seguridad:
--   · `anon` no tiene permisos directos sobre ninguna de las dos tablas nuevas. Entra solo por dos funciones security definer
--     mínimas: `obtener_enlace_programacion` (lo que la página enseña) y `enviar_solicitud_programacion`.
--   · Un enlace revocado, caducado o agotado responde igual que uno inexistente: no enseña nada y no acepta envíos.
--   · El remitente no lee nada de vuelta: solo recibe 'ok' o 'revisar'.
--   · El entrenador (solo el dueño, no el equipo, como `leads`) solo LEE las tablas nuevas; crea y revoca enlaces con funciones.
--   · Sin consentimiento de salud NO se guardan las respuestas de salud ni el PAR-Q (se descartan en el servidor).
--   · Señal de alarma en el PAR-Q (problema cardiaco, dolor torácico, mareo con pérdida de conocimiento): el lead queda
--     'revisar' y la tabla IMPIDE (CHECK) que se guarde un borrador.
--   · Anti-spam: honeypot, clave de envío única (doble clic), duplicado por correo/teléfono en 24 h, y topes por enlace, por
--     entrenador y por IP (solo un hash que cambia cada hora, para no poder seguir a nadie entre horas).
--
-- RGPD: la solicitud entra en client_data_tables (exportación y borrado completo del cliente) y cae en cascada si se borra el
-- cliente o el lead. Un contacto que no llega a cliente se borra a mano (botón) o solo a los 60 días (tarea semanal).
-- Prueba: hardening/tests/bloque40_solicitud_programacion.sql (run-pglite-solicitud-programacion.mjs).

-- ── 1. Enlaces ──
create table if not exists public.programacion_enlaces (
  id             uuid primary key default gen_random_uuid(),
  trainer_id     uuid not null references public.entrenadores(uid) on delete cascade,
  nombre         text not null check (char_length(btrim(nombre)) between 1 and 80),
  slug           text not null unique check (slug ~ '^[0-9a-f]{32}$'),
  caduca_en      timestamptz,
  max_usos       integer check (max_usos is null or max_usos between 1 and 1000),
  un_solo_uso    boolean not null default false,
  mostrar_foto   boolean not null default false,
  activo         boolean not null default true,
  usos           integer not null default 0 check (usos >= 0),
  ultimo_uso_en  timestamptz,
  creado_en      timestamptz not null default now(),
  revocado_en    timestamptz,
  revocado_por   uuid,
  -- Un enlace desactivado siempre dice cuándo (la auditoría no queda a medias)
  check (activo or revocado_en is not null)
);
create index if not exists programacion_enlaces_trainer_idx on public.programacion_enlaces (trainer_id, creado_en desc);

alter table public.programacion_enlaces enable row level security;
create policy "entrenador_lee_enlaces_programacion" on public.programacion_enlaces for select to authenticated
  using (trainer_id = (select auth.uid()));
-- Sin políticas de escritura: se crea y se revoca solo con las funciones de abajo (así la auditoría no se puede falsear).
revoke all on public.programacion_enlaces from anon, authenticated;
grant select on public.programacion_enlaces to authenticated;

-- ── 2. leads: origen, enlace y dos estados nuevos ──
alter table public.leads add column if not exists origen text not null default 'pagina';
alter table public.leads drop constraint if exists leads_origen_check;
alter table public.leads add constraint leads_origen_check check (origen in ('pagina', 'programacion'));
alter table public.leads add column if not exists enlace_id uuid references public.programacion_enlaces(id) on delete set null;

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status = any (array['nuevo', 'contactado', 'convertido', 'descartado', 'revisar', 'borrador_listo']));

-- ── 3. La solicitud ──
create table if not exists public.solicitudes_programacion (
  lead_id                   uuid primary key references public.leads(id) on delete cascade,
  trainer_id                uuid not null references public.entrenadores(uid) on delete cascade,
  -- Se rellena al convertir en cliente; si el cliente se borra (RGPD), la solicitud se va con él.
  client_id                 uuid references public.clientes(id) on delete cascade,
  clave_envio               uuid not null unique,
  consentimiento_salud      boolean not null,
  consentimiento_asistente  boolean not null,
  consentimiento_version    text not null check (char_length(consentimiento_version) between 1 and 30),
  consentimiento_en         timestamptz not null default now(),
  respuestas                jsonb not null default '{}'::jsonb,
  parq                      jsonb,
  parq_alarma               boolean not null default false,
  -- Verdadero si se puede preparar un borrador: consintió salud Y asistente, y el PAR-Q no dio alarma. Lo lee la tarea que lo prepara.
  preparar_borrador         boolean not null default false,
  ip_hash                   text,
  -- Hueco del borrador privado (solo el sitio donde irá; v1 no lo genera nadie, ni se promete automático). Solo lo ve el entrenador.
  --   borrador_estado: sin generar / listo para revisar / aprobado / descartado
  --   propuesta: el plan propuesto (vacío por ahora)   razones: el «porqué» de cada decisión (vacío por ahora)
  --   criterios_version: versión de los criterios del entrenador con que se preparó
  borrador_estado           text not null default 'sin_generar' check (borrador_estado in ('sin_generar', 'listo_para_revisar', 'aprobado', 'descartado')),
  propuesta                 jsonb,
  razones                   jsonb,
  criterios_version         text check (criterios_version is null or char_length(criterios_version) <= 40),
  created_at                timestamptz not null default now(),
  -- Sin consentimiento de salud no hay PAR-Q guardado
  check (consentimiento_salud or (parq is null and not parq_alarma)),
  -- El asistente solo ayuda si hay consentimiento de salud
  check (consentimiento_salud or not consentimiento_asistente),
  -- Con alarma NO se prepara borrador, y lo impide la propia tabla
  check (not parq_alarma or (not preparar_borrador and borrador_estado = 'sin_generar' and propuesta is null)),
  check (borrador_estado = 'sin_generar' or preparar_borrador)
);
create index if not exists solicitudes_programacion_trainer_idx on public.solicitudes_programacion (trainer_id);
create index if not exists solicitudes_programacion_client_idx on public.solicitudes_programacion (client_id) where client_id is not null;
create index if not exists solicitudes_programacion_borrador_idx on public.solicitudes_programacion (created_at) where preparar_borrador and borrador_estado = 'sin_generar';

alter table public.solicitudes_programacion enable row level security;
create policy "entrenador_lee_solicitudes_programacion" on public.solicitudes_programacion for select to authenticated
  using (trainer_id = (select auth.uid()));
revoke all on public.solicitudes_programacion from anon, authenticated;
grant select on public.solicitudes_programacion to authenticated;

-- ── 4. Crear y revocar enlaces (solo el entrenador aprobado; la auditoría la pone el servidor) ──
create or replace function public.crear_enlace_programacion(
  p_nombre text, p_dias_caducidad integer default null, p_max_usos integer default null,
  p_un_solo_uso boolean default false, p_mostrar_foto boolean default false)
 returns jsonb language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_slug text;
  v_row public.programacion_enlaces;
begin
  if v_uid is null or not exists (select 1 from public.entrenadores where uid = v_uid and approved) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if length(v_nombre) < 1 or length(v_nombre) > 80 then raise exception 'Ponle un nombre al enlace (hasta 80 caracteres)'; end if;
  if p_dias_caducidad is not null and (p_dias_caducidad < 1 or p_dias_caducidad > 365) then raise exception 'La caducidad va de 1 a 365 días'; end if;
  if p_max_usos is not null and (p_max_usos < 1 or p_max_usos > 1000) then raise exception 'El límite de usos va de 1 a 1000'; end if;
  if (select count(*) from public.programacion_enlaces where trainer_id = v_uid and activo) >= 20 then
    raise exception 'Ya tienes 20 enlaces activos: revoca alguno antes de crear otro';
  end if;
  -- 32 caracteres hexadecimales de un generador criptográfico (dos UUID v4): no adivinable
  v_slug := substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 32);
  insert into public.programacion_enlaces (trainer_id, nombre, slug, caduca_en, max_usos, un_solo_uso, mostrar_foto)
  values (v_uid, v_nombre, v_slug,
          case when p_dias_caducidad is null then null else now() + make_interval(days => p_dias_caducidad) end,
          p_max_usos, coalesce(p_un_solo_uso, false), coalesce(p_mostrar_foto, false))
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.revocar_enlace_programacion(p_id uuid)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists (select 1 from public.programacion_enlaces where id = p_id and trainer_id = v_uid) then
    raise exception 'Enlace no encontrado';
  end if;
  -- Ya revocado: se deja como está (se conserva quién y cuándo lo revocó la primera vez)
  update public.programacion_enlaces
     set activo = false, revocado_en = now(), revocado_por = v_uid
   where id = p_id and trainer_id = v_uid and activo;
end;
$$;

-- ── 5. Lo que enseña la página pública ──
-- Devuelve null si el enlace no existe, está revocado, caducado o agotado: no se distingue (no se enseña nada).
create or replace function public.obtener_enlace_programacion(p_slug text)
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  e public.programacion_enlaces;
  t record;
  v_logo text;
begin
  if p_slug is null or p_slug !~ '^[0-9a-f]{32}$' then return null; end if;
  select * into e from public.programacion_enlaces where slug = p_slug;
  if not found or not e.activo
     or (e.caduca_en is not null and e.caduca_en <= now())
     or e.usos >= coalesce(case when e.un_solo_uso then 1 end, e.max_usos, 2147483647) then
    return null;
  end if;
  select coalesce(nullif(btrim(profile ->> 'displayName'), ''), "displayName") as nombre,
         nullif(btrim(profile ->> 'brandName'), '') as marca,
         nullif(profile ->> 'brandLogo', '') as logo
    into t from public.entrenadores where uid = e.trainer_id;
  -- La foto/logo solo si el entrenador lo ha querido y es una imagen razonable
  v_logo := case when e.mostrar_foto and t.logo ~ '^(https://|data:image/)' and length(t.logo) <= 300000 then t.logo end;
  return jsonb_build_object('entrenador', left(t.nombre, 80), 'marca', left(t.marca, 80), 'logo', v_logo);
end;
$$;

-- ── 6. Enviar la solicitud ──
-- Las preguntas del modelo «Programación inicial» (src/lib/modelosEncuesta.ts). La prueba de Vitest comprueba que esta lista
-- coincide con la del modelo: si cambias una, cambia la otra. (id, tipo, es de salud, obligatoria, mínimo, máximo)
create or replace function public.limpiar_respuestas_programacion(p_resp jsonb, p_salud boolean)
 returns jsonb language plpgsql immutable
 set search_path to 'public'
as $$
declare
  v_out jsonb := '{}'::jsonb;
  r record;
  v jsonb;
  v_txt text;
  v_num numeric;
begin
  if p_resp is null or jsonb_typeof(p_resp) <> 'object' then raise exception 'Las respuestas no son válidas'; end if;
  if length(p_resp::text) > 20000 then raise exception 'Las respuestas son demasiado largas'; end if;
  for r in select * from (values
    ('objetivo',          'choice', false, true,  null::numeric, null::numeric),
    ('objetivo_detalle',  'text',   false, false, null, null),
    ('experiencia',       'choice', false, true,  null, null),
    ('rutina_actual',     'text',   false, false, null, null),
    ('dias',              'choice', false, true,  null, null),
    ('duracion',          'choice', false, true,  null, null),
    ('material',          'multi',  false, true,  null, null),
    ('rechaza',           'text',   true,  false, null, null),
    ('molestias',         'yesno',  true,  false, null, null),
    ('molestias_detalle', 'text',   true,  false, null, null),
    ('marcas',            'text',   false, false, null, null),
    ('peso',              'number', true,  false, 20, 400),
    ('altura',            'number', true,  false, 100, 250),
    ('edad',              'number', true,  false, 14, 100),
    ('fase',              'choice', true,  false, null, null),
    ('sueno',             'number', true,  false, 0, 24),
    ('estres',            'scale',  true,  false, 1, 10),
    ('pasos',             'number', false, false, 0, 100000),
    ('cardio',            'text',   false, false, null, null),
    ('prioridad',         'multi',  false, false, null, null),
    ('barreras',          'multi',  false, false, null, null),
    ('extra',             'text',   false, false, null, null)
  ) as q(id, tipo, salud, obligatoria, minimo, maximo) loop
    -- Lo de salud, sin consentimiento, se descarta aquí: nunca llega a guardarse
    if r.salud and not p_salud then continue; end if;
    v := p_resp -> r.id;
    if v is null or v = 'null'::jsonb
       or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
       or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0) then
      if r.obligatoria then raise exception 'Faltan respuestas obligatorias'; end if;
      continue;
    end if;
    if r.tipo = 'text' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 1000 then raise exception 'Una respuesta es demasiado larga'; end if;
      v_out := v_out || jsonb_build_object(r.id, btrim(v #>> '{}'));
    elsif r.tipo = 'choice' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 200 then raise exception 'Una respuesta no es válida'; end if;
      v_out := v_out || jsonb_build_object(r.id, btrim(v #>> '{}'));
    elsif r.tipo = 'yesno' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'Una respuesta no es válida'; end if;
      v_out := v_out || jsonb_build_object(r.id, v);
    elsif r.tipo = 'multi' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 12
         or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 100) then
        raise exception 'Una respuesta no es válida';
      end if;
      v_out := v_out || jsonb_build_object(r.id, v);
    else -- number, scale
      if jsonb_typeof(v) <> 'number' then raise exception 'Revisa los números que has escrito'; end if;
      v_num := (v #>> '{}')::numeric;
      if v_num < r.minimo or v_num > r.maximo then raise exception 'Revisa los números que has escrito'; end if;
      v_out := v_out || jsonb_build_object(r.id, v_num);
    end if;
  end loop;
  return v_out;
end;
$$;
revoke execute on function public.limpiar_respuestas_programacion(jsonb, boolean) from public, anon, authenticated;

create or replace function public.enviar_solicitud_programacion(
  p_slug text, p_clave uuid, p_nombre text, p_email text, p_telefono text,
  p_respuestas jsonb, p_parq jsonb, p_consiente_salud boolean, p_consiente_asistente boolean,
  p_version text, p_web text default null)
 returns text language plpgsql security definer
 set search_path to 'public'
as $$
declare
  e public.programacion_enlaces;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_phone text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_digits text;
  v_salud boolean := coalesce(p_consiente_salud, false);
  v_asistente boolean := coalesce(p_consiente_asistente, false) and coalesce(p_consiente_salud, false);
  v_resp jsonb;
  v_alarma boolean := false;
  v_previa boolean;
  v_ip text;
  v_ip_hash text;
  v_lead_id uuid;
  v_ahora bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  -- Trampa para robots: un campo que una persona no ve. Se contesta como si hubiera ido bien, sin guardar nada.
  if btrim(coalesce(p_web, '')) <> '' then return 'ok'; end if;
  if p_clave is null then raise exception 'No se pudo enviar. Inténtalo de nuevo.'; end if;

  -- Doble envío (doble clic, reintento por mala cobertura): se contesta lo mismo que la primera vez, sin duplicar ni contar otro uso
  select s.parq_alarma into v_previa from public.solicitudes_programacion s where s.clave_envio = p_clave;
  if found then return case when v_previa then 'revisar' else 'ok' end; end if;

  if p_slug is null or p_slug !~ '^[0-9a-f]{32}$' then raise exception 'Este enlace ya no está disponible'; end if;
  -- Se bloquea la fila del enlace: dos envíos a la vez no pueden pasarse del límite de usos
  select * into e from public.programacion_enlaces where slug = p_slug for update;
  if not found or not e.activo
     or (e.caduca_en is not null and e.caduca_en <= now())
     or e.usos >= coalesce(case when e.un_solo_uso then 1 end, e.max_usos, 2147483647) then
    raise exception 'Este enlace ya no está disponible';
  end if;

  -- Datos de contacto: mismas reglas que submit_lead
  if length(v_nombre) < 1 or length(v_nombre) > 100 then raise exception 'Escribe tu nombre'; end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'El correo no parece válido';
  end if;
  if v_phone is not null then
    v_digits := regexp_replace(v_phone, '\D', '', 'g');
    if v_phone !~ '^[0-9+().\s-]{8,25}$' or length(v_digits) < 8 or length(v_digits) > 15 then
      raise exception 'El teléfono no parece válido';
    end if;
  end if;
  if v_email is null and v_phone is null then raise exception 'Déjame un correo o un teléfono para poder contestarte'; end if;
  if p_version is null or length(btrim(p_version)) < 1 or length(p_version) > 30 then raise exception 'No se pudo enviar. Inténtalo de nuevo.'; end if;

  v_resp := public.limpiar_respuestas_programacion(p_respuestas, v_salud);

  -- PAR-Q: solo se guarda con consentimiento de salud, y entonces hacen falta las 7 respuestas (sí/no)
  if v_salud then
    if p_parq is null or jsonb_typeof(p_parq) <> 'array' or jsonb_array_length(p_parq) <> 7
       or exists (select 1 from jsonb_array_elements(p_parq) x where jsonb_typeof(x) <> 'boolean') then
      raise exception 'Contesta las 7 preguntas del cuestionario de salud';
    end if;
    -- Señal de alarma: 1 problema cardiaco, 2 dolor torácico al hacer ejercicio, 3 dolor torácico en reposo, 4 mareo con pérdida de conocimiento.
    -- Las preguntas 5-7 (articular, medicación, otra razón) las lee el entrenador, pero no paran el borrador por sí solas.
    v_alarma := (p_parq -> 0) = 'true'::jsonb or (p_parq -> 1) = 'true'::jsonb
             or (p_parq -> 2) = 'true'::jsonb or (p_parq -> 3) = 'true'::jsonb;
  end if;

  -- El mismo correo o teléfono en las últimas 24 h no se duplica: se repite el resultado de la primera vez
  select coalesce(bool_or(s.parq_alarma), false) into v_previa
    from public.leads l left join public.solicitudes_programacion s on s.lead_id = l.id
   where l.trainer_id = e.trainer_id and l.origen = 'programacion' and l.created_at > v_ahora - 86400000
     and ((v_email is not null and lower(l.email) = v_email)
       or (v_digits is not null and regexp_replace(coalesce(l.phone, ''), '\D', '', 'g') = v_digits))
  having count(*) > 0;
  if found then return case when v_previa then 'revisar' else 'ok' end; end if;

  -- Topes por enlace y por entrenador (cada solicitud aceptada cuenta); por IP, solo con un hash que cambia cada hora
  if (select count(*) from public.leads where enlace_id = e.id and created_at > v_ahora - 3600000) >= 6
     or (select count(*) from public.leads where trainer_id = e.trainer_id and origen = 'programacion' and created_at > v_ahora - 3600000) >= 8 then
    raise exception 'Demasiadas solicitudes en poco tiempo. Inténtalo de nuevo más tarde.';
  end if;
  begin
    v_ip := nullif(btrim(split_part(coalesce((nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1)), '');
  exception when others then v_ip := null;
  end;
  if v_ip is not null then
    v_ip_hash := left(encode(sha256(convert_to(v_ip || '|' || e.trainer_id::text || '|' || to_char(now(), 'YYYYMMDDHH24'), 'UTF8')), 'hex'), 20);
    if (select count(*) from public.solicitudes_programacion where ip_hash = v_ip_hash) >= 3 then
      raise exception 'Demasiadas solicitudes en poco tiempo. Inténtalo de nuevo más tarde.';
    end if;
  end if;

  insert into public.leads (trainer_id, name, email, phone, message, status, origen, enlace_id, created_at)
  values (e.trainer_id, v_nombre, v_email, v_phone,
          -- Sin ningún dato de salud: este texto sale en el aviso (campanita y push)
          case when v_alarma then 'Solicitud de programación inicial: necesita revisión personal antes de programar'
               when not v_salud then 'Solicitud de programación inicial (sin consentimiento de salud: sin cuestionario)'
               else 'Solicitud de programación inicial' end,
          case when v_alarma then 'revisar' else 'nuevo' end, 'programacion', e.id, v_ahora)
  returning id into v_lead_id;

  insert into public.solicitudes_programacion (lead_id, trainer_id, clave_envio, consentimiento_salud, consentimiento_asistente,
    consentimiento_version, respuestas, parq, parq_alarma, preparar_borrador, ip_hash)
  values (v_lead_id, e.trainer_id, p_clave, v_salud, v_asistente, btrim(p_version), v_resp,
          case when v_salud then p_parq end, v_alarma, v_asistente and not v_alarma, v_ip_hash);

  update public.programacion_enlaces set usos = usos + 1, ultimo_uso_en = now() where id = e.id;
  return case when v_alarma then 'revisar' else 'ok' end;
end;
$$;

-- ── 7. Convertir en cliente: enlaza la solicitud con la ficha y cierra el lead ──
create or replace function public.vincular_solicitud_cliente(p_lead_id uuid, p_client_id uuid)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null
     or not exists (select 1 from public.leads where id = p_lead_id and trainer_id = v_uid and origen = 'programacion')
     or not exists (select 1 from public.clientes where id = p_client_id and "trainerId" = v_uid) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  -- ip_hash solo servía para el antispam: al convertir ya no hace falta
  update public.solicitudes_programacion set client_id = p_client_id, ip_hash = null where lead_id = p_lead_id;
  update public.leads set status = 'convertido' where id = p_lead_id;
end;
$$;

-- ── 8. Permisos de las funciones ──
revoke execute on function
  public.crear_enlace_programacion(text, integer, integer, boolean, boolean),
  public.revocar_enlace_programacion(uuid),
  public.obtener_enlace_programacion(text),
  public.enviar_solicitud_programacion(text, uuid, text, text, text, jsonb, jsonb, boolean, boolean, text, text),
  public.vincular_solicitud_cliente(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.crear_enlace_programacion(text, integer, integer, boolean, boolean),
  public.revocar_enlace_programacion(uuid),
  public.vincular_solicitud_cliente(uuid, uuid)
  to authenticated;
grant execute on function
  public.obtener_enlace_programacion(text),
  public.enviar_solicitud_programacion(text, uuid, text, text, text, jsonb, jsonb, boolean, boolean, text, text)
  to anon, authenticated;

-- ── 9. Aviso al entrenador: el mismo trigger leads_notify, con título propio ──
-- Para una solicitud de programación, el título lo dice («Solicitud de programación: Ana»); si necesita revisión personal,
-- («Revisión personal: Ana»). Nunca lleva datos de salud: el mensaje es el texto fijo que puso la función de envío.
-- El push (función de borde notify-lead) sigue siendo el genérico de «contacto nuevo».
create or replace function public.notify_new_lead()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_secret text;
begin
  begin
    insert into notificaciones (id, trainer_id, client_id, tipo, titulo, mensaje, leida, created_at, destinatario)
    values (
      'lead_' || new.id::text,
      new.trainer_id::text,
      null,
      'nuevo_contacto',
      case when new.status = 'revisar' then 'Revisión personal: '
           when new.origen = 'programacion' then 'Solicitud de programación: '
           else 'Nuevo contacto: ' end || left(new.name, 80),
      left(coalesce(nullif(btrim(new.message), ''), 'Te ha escrito desde tu página pública'), 200),
      false,
      new.created_at,
      'trainer'
    )
    on conflict (id) do nothing;

    select secret into v_secret from internal_webhook_secrets where name = 'new_lead';
    if v_secret is not null then
      perform net.http_post(
        url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/notify-lead',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
        body := jsonb_build_object('trainer_id', new.trainer_id, 'name', left(new.name, 80))
      );
    end if;
  exception when others then
    null; -- el aviso es secundario: el contacto ya está guardado
  end;
  return new;
end;
$$;
revoke execute on function public.notify_new_lead() from public, anon, authenticated;

-- ── 10. Al borrar un lead no queda su aviso (llevaba el nombre) ──
create or replace function public.limpiar_avisos_lead()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  delete from public.notificaciones where id in ('lead_' || old.id::text, 'lead_recuerdo_' || old.id::text);
  return old;
end;
$$;
revoke execute on function public.limpiar_avisos_lead() from public, anon, authenticated;
drop trigger if exists leads_limpiar_avisos on public.leads;
create trigger leads_limpiar_avisos after delete on public.leads for each row execute function public.limpiar_avisos_lead();

-- ── 11. Minimización: un contacto que no llega a cliente no conserva sus datos de salud para siempre ──
-- Cada lunes a las 3:00 se borran (lead, solicitud y aviso, en cascada) las solicitudes de programación que no se convirtieron
-- y llevan más de 60 días. Las convertidas se quedan con su cliente (y se van con él si se borra).
create or replace function public.purgar_solicitudes_programacion(p_dias integer default 60)
 returns integer language plpgsql security definer
 set search_path to 'public'
as $$
declare n integer;
begin
  delete from public.leads
   where origen = 'programacion' and status <> 'convertido'
     and created_at < (extract(epoch from now()) * 1000)::bigint - p_dias::bigint * 86400000;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purgar_solicitudes_programacion(integer) from public, anon, authenticated;

-- ── 12. RGPD: la solicitud entra en la exportación y el borrado completo del cliente ──
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('actividades', 'client_id'),
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('clase_plazas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('decisiones_entrenador', 'client_id'), ('descansos', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'), ('notas_privadas_cliente', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('solicitudes_programacion', 'client_id'),
    ('strava_conexiones', 'client_id'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;

-- Tarea programada: cada lunes a las 3:00.
select cron.schedule('purgar-solicitudes-programacion', '0 3 * * 1', $cron$select public.purgar_solicitudes_programacion();$cron$);
