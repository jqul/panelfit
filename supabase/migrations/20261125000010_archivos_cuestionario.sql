-- Archivos en los cuestionarios (2026-11-25).
--
-- Una pregunta de tipo `archivos` deja que el cliente suba su rutina actual o programas anteriores (PDF, imagen, Excel…): hasta 5 archivos de 20 MB. Diseño, amenazas y
-- retención en docs/archivos-cuestionarios.md. Esta migración pone todo lo que vive en la base de datos:
--
--   · el depósito PRIVADO `cuestionario-archivos` (20 MB, solo estos tipos);
--   · la tabla `archivos_cliente`, que es la que decide quién lee (como `documentos`): cliente, solo los suyos; su entrenador, los de sus clientes; nadie más. Es la misma regla que
--     `survey_responses`, así que el equipo y el super admin no los leen (un archivo no se lee con más permisos que la respuesta que lo cita);
--   · `archivo_reservar`: el cliente reserva una ruta ANTES de subir (solo para una pregunta de archivos de una plantilla de SU entrenador, con tope por pregunta y por cliente);
--   · las políticas del depósito: sube solo sobre una ruta reservada; lee solo lo verificado (el cliente, también lo suyo recién subido); sin UPDATE (un archivo ya validado no se
--     puede sobrescribir) y sin DELETE (todo borrado pasa por la función de borde, con la Storage API: borrar de `storage.objects` por SQL deja el archivo físico huérfano);
--   · un trigger en `survey_responses` que valida y reescribe los archivos citados en la respuesta (el cliente inserta con PostgREST, sin RPC) y otro que los vincula;
--   · la retención: reclamar / finalizar la limpieza, avisar de la caducidad y localizar objetos huérfanos (las llama la función de borde `archivos-limpieza`, cada día);
--   · el RGPD: `archivos_cliente` entra en `client_data_tables()` (borrado y exportación).
--
-- Estados de un archivo: reservado → verificado (lo comprobó la función `archivos-cliente`) → enviado (lo cita una respuesta). Rechazado/borrando/caducado son del final de su vida.
-- Prueba: hardening/tests/run-pglite-archivos.mjs (con un esquema `storage` simulado, como `documentos`).

-- ── El depósito ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('cuestionario-archivos', 'cuestionario-archivos', false, 20971520, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = 20971520, allowed_mime_types = excluded.allowed_mime_types;

-- ── La tabla ──
create table if not exists public.archivos_cliente (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clientes(id) on delete cascade,
  template_id    text not null,
  question_id    text not null,
  ruta           text not null unique,
  nombre         text not null check (length(nombre) between 1 and 120),
  ext            text not null,
  -- Con el que se sube y se guarda: lo fija el servidor por la extensión, no lo que diga el navegador
  tipo           text not null,
  -- Lo declarado al reservar; la función de borde lo sustituye por el real al verificar
  tamano         bigint not null check (tamano between 1 and 20971520),
  estado         text not null default 'reservado' check (estado in ('reservado', 'verificado', 'enviado', 'rechazado', 'borrando', 'caducado')),
  motivo         text,
  borrado_motivo text check (borrado_motivo in ('limpieza', 'caducidad')),
  -- Sin clave ajena a propósito: si se borra la respuesta, el archivo vuelve a ser «sin enviar» (ver archivos_desvincular_respuesta)
  response_id    text,
  created_at     timestamptz not null default now(),
  verificado_at  timestamptz,
  enviado_at     timestamptz,
  aviso_borrado_at timestamptz,
  borrado_at     timestamptz,
  constraint archivos_cliente_ruta_del_cliente check (split_part(ruta, '/', 1) = client_id::text)
);
create index if not exists archivos_cliente_cliente_idx on public.archivos_cliente (client_id, estado);
create index if not exists archivos_cliente_respuesta_idx on public.archivos_cliente (response_id) where response_id is not null;
create index if not exists archivos_cliente_estado_idx on public.archivos_cliente (estado, created_at);

alter table public.archivos_cliente enable row level security;
revoke all on public.archivos_cliente from anon, authenticated;
grant select on public.archivos_cliente to authenticated;

-- Quien lo ve: el propio cliente y su entrenador (clientes."trainerId"). Igual que survey_responses: el equipo y el super admin no.
drop policy if exists archivos_cliente_lee on public.archivos_cliente;
create policy archivos_cliente_lee on public.archivos_cliente for select to authenticated
  using (exists (
    select 1 from public.clientes c
     where c.id = archivos_cliente.client_id
       and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()))));

-- ── Reservar una subida ──
-- Devuelve { ok: true, id, ruta, tipo, nombre } o { ok: false, codigo } con el motivo (formato, tamano, limite_pregunta, limite_cliente, archivado, pregunta).
create or replace function public.archivo_reservar(p_template_id text, p_question_id text, p_nombre text, p_tamano bigint)
 returns jsonb language plpgsql security definer
 set search_path to ''
as $$
declare
  v_cid uuid; v_tid uuid; v_arch bigint;
  v_nombre text; v_ext text; v_mime text; v_id uuid := gen_random_uuid(); v_n integer;
begin
  if auth.uid() is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  select c.id, c."trainerId", c.archived_at into v_cid, v_tid, v_arch from public.clientes c where c.auth_user_id = auth.uid() limit 1;
  if v_cid is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if v_arch is not null then return jsonb_build_object('ok', false, 'codigo', 'archivado'); end if;

  -- Una pregunta de archivos que exista en una plantilla de SU entrenador (no se reserva espacio para otra cosa)
  if not exists (
    select 1 from public.survey_templates t, jsonb_array_elements(case when jsonb_typeof(t.questions) = 'array' then t.questions else '[]'::jsonb end) q
     where t.id = p_template_id and t.trainer_id = v_tid::text and q ->> 'id' = p_question_id and q ->> 'type' = 'archivos'
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'pregunta');
  end if;

  -- El nombre solo se enseña (la ruta no lo usa): sin rutas, sin caracteres de control ni marcas de dirección de texto
  v_nombre := btrim(regexp_replace(regexp_replace(coalesce(p_nombre, ''), '^.*[\\/]', ''), '[\u0001-\u001f\u007f‎‏‪-‮⁦-⁩]+', '', 'g'));
  v_nombre := btrim(regexp_replace(v_nombre, '\s+', ' ', 'g'));
  if v_nombre = '' then v_nombre := 'archivo'; end if;
  v_ext := lower(coalesce(substring(v_nombre from '\.([A-Za-z0-9]{1,8})$'), ''));
  v_mime := case v_ext
    when 'pdf' then 'application/pdf'
    when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg'
    when 'png' then 'image/png' when 'webp' then 'image/webp'
    when 'heic' then 'image/heic' when 'heif' then 'image/heif'
    when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    when 'csv' then 'text/csv' when 'txt' then 'text/plain'
    else null end;
  if v_mime is null then return jsonb_build_object('ok', false, 'codigo', 'formato'); end if;
  if p_tamano is null or p_tamano < 1 or p_tamano > 20971520 then return jsonb_build_object('ok', false, 'codigo', 'tamano'); end if;
  if length(v_nombre) > 120 then v_nombre := left(v_nombre, 120 - length(v_ext) - 2) || '…' || '.' || v_ext; end if;

  -- Los topes se cuentan de uno en uno por cliente: sin este cerrojo, dos reservas a la vez se saltarían el límite
  perform pg_advisory_xact_lock(hashtextextended('archivos_cliente:' || v_cid::text, 0));
  select count(*) into v_n from public.archivos_cliente
   where client_id = v_cid and template_id = p_template_id and question_id = p_question_id and estado in ('reservado', 'verificado');
  if v_n >= 5 then return jsonb_build_object('ok', false, 'codigo', 'limite_pregunta'); end if;
  select count(*) into v_n from public.archivos_cliente where client_id = v_cid and estado in ('reservado', 'verificado');
  if v_n >= 25 then return jsonb_build_object('ok', false, 'codigo', 'limite_cliente'); end if;

  insert into public.archivos_cliente (id, client_id, template_id, question_id, ruta, nombre, ext, tipo, tamano)
  values (v_id, v_cid, p_template_id, p_question_id, v_cid::text || '/' || v_id::text || '.' || v_ext, v_nombre, v_ext, v_mime, p_tamano);
  return jsonb_build_object('ok', true, 'id', v_id, 'ruta', v_cid::text || '/' || v_id::text || '.' || v_ext, 'tipo', v_mime, 'nombre', v_nombre);
end;
$$;
revoke execute on function public.archivo_reservar(text, text, text, bigint) from public, anon;
grant execute on function public.archivo_reservar(text, text, text, bigint) to authenticated;

-- ── Políticas del depósito ──
-- Sube: solo sobre una ruta que ese cliente tiene reservada (y mientras no esté archivado).
drop policy if exists cuestionario_archivos_sube on storage.objects;
create policy cuestionario_archivos_sube on storage.objects for insert to authenticated
  with check (bucket_id = 'cuestionario-archivos' and exists (
    select 1 from public.archivos_cliente a join public.clientes c on c.id = a.client_id
     where a.ruta = objects.name and a.estado = 'reservado' and c.auth_user_id = (select auth.uid()) and c.archived_at is null));

-- Lee: lo verificado o enviado (la fila, vista con las reglas de la tabla, decide quién) y, solo el propio cliente, lo que acaba de subir y aún no se ha comprobado
-- (Storage lee la fila al subirla). El entrenador nunca recibe un archivo sin verificar.
drop policy if exists cuestionario_archivos_lee on storage.objects;
create policy cuestionario_archivos_lee on storage.objects for select to authenticated
  using (bucket_id = 'cuestionario-archivos' and exists (
    select 1 from public.archivos_cliente a
     where a.ruta = objects.name
       and (a.estado in ('verificado', 'enviado')
            or (a.estado = 'reservado' and exists (select 1 from public.clientes c where c.id = a.client_id and c.auth_user_id = (select auth.uid()))))));
-- (sin políticas de UPDATE ni de DELETE a propósito)

-- ── Validar y reescribir los archivos de una respuesta ──
-- Antes de guardar: cada archivo citado en una pregunta de archivos tiene que ser de ese cliente, de esa pregunta y de esa plantilla, estar verificado (o ser ya de esta respuesta),
-- no repetirse y no pasar de 5. Nombre, tamaño y tipo se reescriben con los de la base de datos: el cliente no los puede inventar.
create or replace function public.archivos_validar_respuesta()
 returns trigger language plpgsql security definer
 set search_path to ''
as $$
declare
  v_tpl jsonb; v_q jsonb; v_val jsonb; v_e jsonb; v_arr jsonb; v_cid uuid; v_row public.archivos_cliente%rowtype; v_vistos uuid[];
begin
  select t.questions into v_tpl from public.survey_templates t where t.id = new.template_id;
  if v_tpl is null or jsonb_typeof(v_tpl) <> 'array' then return new; end if;
  begin v_cid := new.client_id::uuid; exception when others then v_cid := null; end;

  for v_q in select q.value from jsonb_array_elements(v_tpl) q where q.value ->> 'type' = 'archivos' loop
    v_val := new.answers -> (v_q ->> 'id');
    continue when v_val is null or v_val = 'null'::jsonb or v_val = '[]'::jsonb;
    if jsonb_typeof(v_val) <> 'array' or jsonb_array_length(v_val) > 5 then
      raise exception 'Archivos no válidos' using errcode = '22023';
    end if;
    v_arr := '[]'::jsonb; v_vistos := '{}';
    for v_e in select e.value from jsonb_array_elements(v_val) e loop
      if jsonb_typeof(v_e) <> 'object' or (v_e ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Archivo no válido' using errcode = '22023';
      end if;
      select * into v_row from public.archivos_cliente a where a.id = (v_e ->> 'id')::uuid for update;
      if not found
         or v_row.client_id is distinct from v_cid
         or v_row.template_id <> new.template_id
         or v_row.question_id <> (v_q ->> 'id')
         or not (v_row.estado = 'verificado' or (v_row.estado in ('enviado', 'caducado') and v_row.response_id = new.id))
         or v_row.id = any(v_vistos) then
        raise exception 'Archivo no válido' using errcode = '22023';
      end if;
      v_vistos := v_vistos || v_row.id;
      v_arr := v_arr || jsonb_build_array(jsonb_build_object('id', v_row.id, 'nombre', v_row.nombre, 'tamano', v_row.tamano, 'tipo', v_row.tipo));
    end loop;
    new.answers := jsonb_set(new.answers, array[v_q ->> 'id'], v_arr);
  end loop;
  return new;
end;
$$;
revoke execute on function public.archivos_validar_respuesta() from public, anon, authenticated;

drop trigger if exists archivos_validar_respuesta on public.survey_responses;
create trigger archivos_validar_respuesta before insert or update of answers on public.survey_responses
  for each row execute function public.archivos_validar_respuesta();

-- Después de guardar: los archivos citados pasan a «enviado» (con su respuesta); los que esta respuesta citaba antes y ya no, vuelven a «verificado» (otros 30 días).
create or replace function public.archivos_vincular_respuesta()
 returns trigger language plpgsql security definer
 set search_path to ''
as $$
declare v_ids uuid[];
begin
  -- Solo cuentan las preguntas de archivos de la plantilla: un objeto con forma de archivo en otra pregunta no vincula nada
  select coalesce(array_agg((e.value ->> 'id')::uuid), '{}') into v_ids
    from public.survey_templates t,
         jsonb_array_elements(case when jsonb_typeof(t.questions) = 'array' then t.questions else '[]'::jsonb end) q,
         jsonb_array_elements(case when jsonb_typeof(new.answers -> (q.value ->> 'id')) = 'array' then new.answers -> (q.value ->> 'id') else '[]'::jsonb end) e
   where t.id = new.template_id and q.value ->> 'type' = 'archivos' and jsonb_typeof(e.value) = 'object';

  update public.archivos_cliente set estado = 'enviado', response_id = new.id, enviado_at = now()
   where id = any(v_ids) and estado = 'verificado';
  update public.archivos_cliente set estado = 'verificado', response_id = null, enviado_at = null, verificado_at = now()
   where response_id = new.id and estado = 'enviado' and not (id = any(v_ids));
  return null;
end;
$$;
revoke execute on function public.archivos_vincular_respuesta() from public, anon, authenticated;

drop trigger if exists archivos_vincular_respuesta on public.survey_responses;
create trigger archivos_vincular_respuesta after insert or update of answers on public.survey_responses
  for each row execute function public.archivos_vincular_respuesta();

-- Si se borra la respuesta, sus archivos no se pierden de golpe: vuelven a «sin enviar» y caducan a los 30 días
create or replace function public.archivos_desvincular_respuesta()
 returns trigger language plpgsql security definer
 set search_path to ''
as $$
begin
  update public.archivos_cliente set estado = 'verificado', response_id = null, enviado_at = null, verificado_at = now()
   where response_id = old.id and estado = 'enviado';
  return null;
end;
$$;
revoke execute on function public.archivos_desvincular_respuesta() from public, anon, authenticated;

drop trigger if exists archivos_desvincular_respuesta on public.survey_responses;
create trigger archivos_desvincular_respuesta after delete on public.survey_responses
  for each row execute function public.archivos_desvincular_respuesta();

-- ── Retención ──
-- La llama cada día la función de borde `archivos-limpieza` con la clave de servicio. `p_ahora` solo sirve para probar con otro reloj.

-- 1) Avisar al entrenador de los archivos de clientes archivados desde hace ~11 meses (se borran a los 12 y, como pronto, 30 días después del aviso).
create or replace function public.archivos_avisar_caducidad(p_ahora timestamptz default now())
 returns integer language plpgsql security definer
 set search_path to ''
as $$
declare r record; v_avisados integer := 0; v_fecha date;
begin
  -- Si el cliente se desarchivó, el aviso ya no vale
  update public.archivos_cliente a set aviso_borrado_at = null
    from public.clientes c where c.id = a.client_id and c.archived_at is null and a.aviso_borrado_at is not null;

  for r in
    select c.id as cid, c."trainerId" as tid, btrim(c.name || ' ' || coalesce(c.surname, '')) as nombre, c.archived_at, count(*) as n
      from public.archivos_cliente a join public.clientes c on c.id = a.client_id
     where a.estado = 'enviado' and a.aviso_borrado_at is null and c.archived_at is not null
       and to_timestamp(c.archived_at / 1000.0) <= p_ahora - interval '335 days'
     group by c.id, c."trainerId", c.name, c.surname, c.archived_at
  loop
    v_fecha := (greatest(to_timestamp(r.archived_at / 1000.0) + interval '365 days', p_ahora + interval '30 days') at time zone 'Europe/Madrid')::date;
    insert into public.notificaciones (id, trainer_id, client_id, tipo, titulo, mensaje, leida, created_at, destinatario)
    values ('arch_' || gen_random_uuid()::text, r.tid::text, r.cid::text, 'archivos_caducidad',
            'Se borrarán los archivos de ' || r.nombre,
            r.n || (case when r.n = 1 then ' archivo que subió' else ' archivos que subió' end) || ' en sus cuestionarios se borrarán el ' || to_char(v_fecha, 'DD/MM/YYYY')
              || ' (12 meses desde que archivaste su ficha). Descarga lo que necesites antes.',
            false, (extract(epoch from p_ahora) * 1000)::bigint, 'trainer');
    update public.archivos_cliente set aviso_borrado_at = p_ahora
     where client_id = r.cid and estado = 'enviado' and aviso_borrado_at is null;
    v_avisados := v_avisados + 1;
  end loop;
  return v_avisados;
end;
$$;
revoke execute on function public.archivos_avisar_caducidad(timestamptz) from public, anon, authenticated;

-- 2) Reclamar lo que toca borrar: pasa a «borrando» (así nadie lo vincula mientras se borra) y se devuelve para que la función de borde borre el objeto con la Storage API.
--    Sin enviar y sin comprobar de más de 24 h, rechazados, sin enviar de más de 30 días, los de clientes archivados 12 meses con aviso de hace 30 días, lo que se quedó a medias.
create or replace function public.archivos_reclamar_limpieza(p_ahora timestamptz default now())
 returns table (id uuid, ruta text) language plpgsql security definer
 set search_path to ''
as $$
begin
  return query
  with candidatas as (
    select a.id from public.archivos_cliente a left join public.clientes c on c.id = a.client_id
     where (a.estado = 'reservado' and a.created_at < p_ahora - interval '24 hours')
        or a.estado = 'rechazado'
        or (a.estado = 'verificado' and coalesce(a.verificado_at, a.created_at) < p_ahora - interval '30 days')
        or (a.estado = 'enviado' and c.archived_at is not null and a.aviso_borrado_at is not null
            and to_timestamp(c.archived_at / 1000.0) <= p_ahora - interval '365 days'
            and a.aviso_borrado_at <= p_ahora - interval '30 days')
        or a.estado = 'borrando'
        or (a.estado = 'caducado' and not exists (select 1 from public.survey_responses r where r.id = a.response_id))
     for update of a skip locked
  )
  update public.archivos_cliente a
     set estado = 'borrando',
         borrado_motivo = case when a.estado = 'enviado' then 'caducidad' when a.estado = 'borrando' then a.borrado_motivo else 'limpieza' end
    from candidatas where a.id = candidatas.id
  returning a.id, a.ruta;
end;
$$;
revoke execute on function public.archivos_reclamar_limpieza(timestamptz) from public, anon, authenticated;

-- 3) Cerrar lo ya borrado en Storage: las de caducidad quedan como constancia («caducado»), el resto desaparece.
create or replace function public.archivos_finalizar_limpieza(p_ids uuid[])
 returns integer language sql security definer
 set search_path to ''
as $$
  with caducar as (
    update public.archivos_cliente set estado = 'caducado', borrado_at = now()
     where id = any(p_ids) and estado = 'borrando' and borrado_motivo = 'caducidad' returning 1),
  quitar as (
    delete from public.archivos_cliente where id = any(p_ids) and estado = 'borrando' and borrado_motivo = 'limpieza' returning 1)
  select ((select count(*) from caducar) + (select count(*) from quitar))::integer;
$$;
revoke execute on function public.archivos_finalizar_limpieza(uuid[]) from public, anon, authenticated;

-- 4) Objetos del depósito que no tienen fila (de más de 24 h): se borran con la Storage API.
create or replace function public.archivos_huerfanos(p_ahora timestamptz default now())
 returns table (name text) language sql security definer
 set search_path to ''
as $$
  select o.name from storage.objects o
   where o.bucket_id = 'cuestionario-archivos' and o.created_at < p_ahora - interval '24 hours'
     and not exists (select 1 from public.archivos_cliente a where a.ruta = o.name);
$$;
revoke execute on function public.archivos_huerfanos(timestamptz) from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.archivos_avisar_caducidad(timestamptz), public.archivos_reclamar_limpieza(timestamptz),
      public.archivos_finalizar_limpieza(uuid[]), public.archivos_huerfanos(timestamptz) to service_role;
  end if;
end $$;

-- ── RGPD: borrado y exportación ──
-- La lista completa de tablas con datos de un cliente (la última, de 20261118000020) más `archivos_cliente`. Los archivos físicos los borra la función de borde antes (borrar-cliente).
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('actividades', 'client_id'), ('archivos_cliente', 'client_id'),
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

-- ── Tarea programada ──
insert into public.internal_webhook_secrets (name, secret)
values ('archivos_limpieza', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function public.lanzar_limpieza_archivos()
 returns boolean language plpgsql security definer
 set search_path to ''
as $$
declare v_secret text;
begin
  select secret into v_secret from public.internal_webhook_secrets where name = 'archivos_limpieza';
  if v_secret is null then return false; end if;
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/archivos-limpieza',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  return true;
end;
$$;
revoke execute on function public.lanzar_limpieza_archivos() from public, anon, authenticated;

-- Tarea programada: cada día a las 03:00 UTC (04:00 o 05:00 en Madrid).
select cron.schedule('archivos-limpieza', '0 3 * * *', $cron$select public.lanzar_limpieza_archivos();$cron$);
