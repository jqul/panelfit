-- La revisión del cuestionario de salud: quién la puede dejar y a QUÉ contenido queda atada (2026-11-22).
--
-- Una fila de `checkins` con tipo 'parq_revisado' dice «el entrenador ha leído la ficha de admisión (tipo 'intake') de este cliente». Esta migración hace tres cosas:
--
--  1. SOLO el entrenador del cliente (o su equipo / un superadmin, o la base de datos sin sesión: service role, administración) puede insertar, modificar o borrar esas filas.
--     Sin esto, la política RLS de `checkins` dejaría al cliente insertarse su propia «revisión» y soltar la espera de su cuestionario de programación.
--
--  2. Una HUELLA SHA-256 de lo que contiene la ficha, calculada AQUÍ, en el servidor (columna nueva `checkins.huella`). Nunca la manda el cliente ni la app: si llega una,
--     se pisa. La huella de una ficha se recalcula en cada insert o cambio de sus respuestas.
--
--  3. La revisión queda vinculada a la VERSIÓN EXACTA que se leyó: el entrenador solo indica el id de la ficha que tiene delante (`respuestas = [{pregunta:'admision', respuesta:<id>}]`)
--     y el servidor reescribe la fila con ese id y con la huella que esa ficha tiene en ese momento. Debe ser una ficha 'intake' DEL MISMO cliente; si no, error. La app decide
--     «revisado» comparando huellas: la de la revisión con la de la ficha más reciente. Si el cliente cambia sus respuestas, la ficha cambia de huella y la revisión deja de valer.
--
-- Normalización (determinista; la misma que reproducen las pruebas con vectores fijos en supabase/hardening/tests/huella_vectores.json):
--   · solo cuentan los elementos que son objetos `{pregunta, respuesta}`; un elemento cuya respuesta queda vacía (null, ausente, '' o solo espacios) NO cuenta;
--   · en pregunta y respuesta, cualquier racha de espacios, tabuladores o saltos de línea ASCII se reduce a un espacio y se recortan los extremos; Unicode en forma NFC;
--   · se distingue mayúsculas de minúsculas y acentos (cualquier cambio visible de texto es un cambio);
--   · cada elemento se convierte en «pregunta<TAB>respuesta» y las líneas se ordenan por bytes (collate "C") y se unen con saltos de línea: reordenar las preguntas NO cambia la huella,
--     pero intercambiar respuestas entre preguntas sí; repetir un mismo elemento cuenta;
--   · SHA-256 del UTF-8 resultante, en hexadecimal minúscula (64 caracteres). Sin respuestas: el SHA-256 de la cadena vacía.
--
-- Qué NO hace: no impide que el cliente cambie SUS respuestas (la ficha es suya; la revisión deja de valer si cambian) ni protege nada más allá de estas marcas. La espera del
-- cuestionario de programación sigue siendo solo de interfaz (ver src/lib/retencionParq.ts). Cubre INSERT, UPDATE y DELETE, y un UPDATE que convierta una fila de/a 'parq_revisado'. Borrar al cliente entero (cascada) sigue funcionando: ver el comentario del trigger.
--
-- Sin esta migración la app no se fía de nada: una ficha sin huella se considera sin revisar (cierra por el lado seguro), y la columna ni siquiera existe para que un cliente
-- se escriba una huella. La columna y el trigger se crean en la misma transacción: no hay un momento en que exista la columna sin el trigger.
--
-- Orden respecto a 20261122000010_cliente_datos_basicos.sql: son independientes (esta solo usa `clientes`, `checkins`, `team_members` y las funciones is_super_admin /
-- is_team_member_of del esquema base; la otra, `clientes` y `registros_peso`); pueden aplicarse en cualquier orden.
-- Las funciones llevan `search_path` vacío: todo lo que usan va cualificado (public.*, auth.*) y lo demás son funciones y operadores de pg_catalog.
-- Pruebas: hardening/tests/bloque46_parq_revisado.sql + run-pglite-parq-revisado.mjs (incluye los vectores de la huella).

alter table public.checkins add column if not exists huella text;
comment on column public.checkins.huella is 'SHA-256 (hex) del contenido de la ficha de admisión (tipo intake) o, en una revisión (tipo parq_revisado), de la ficha que revisó. La pone el servidor; nunca el cliente.';

-- La huella de una lista de respuestas [{pregunta, respuesta}]
create or replace function public.huella_admision(p_respuestas jsonb)
returns text
language sql
immutable
set search_path to ''
as $$
  select encode(sha256(convert_to(coalesce(string_agg(t.linea, E'\n' order by t.linea collate "C"), ''), 'UTF8')), 'hex')
  from (
    select p.pregunta || E'\t' || p.respuesta as linea
    from (
      select normalize(btrim(regexp_replace(coalesce(e ->> 'pregunta', ''), E'[ \\t\\n\\r\\f\\v]+', ' ', 'g')), NFC) as pregunta,
             normalize(btrim(regexp_replace(coalesce(e ->> 'respuesta', ''), E'[ \\t\\n\\r\\f\\v]+', ' ', 'g')), NFC) as respuesta
      from jsonb_array_elements(case when jsonb_typeof(p_respuestas) = 'array' then p_respuestas else '[]'::jsonb end) e
      where jsonb_typeof(e) = 'object'
    ) p
    where p.respuesta <> ''
  ) t;
$$;

-- ¿Puede el usuario de la sesión revisar la ficha de este cliente? (su entrenador, un miembro de su equipo o un superadmin)
create or replace function public.checkins_puede_revisar(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select public.is_super_admin()
      or exists (
        select 1 from public.clientes c
        where c.id = p_cliente
          and (c."trainerId" = auth.uid() or public.is_team_member_of(c."trainerId"))
      );
$$;

create or replace function public.checkins_admision_y_revision()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_old_cliente uuid;
  v_new_cliente uuid;
  v_adm_id uuid;
  v_adm public.checkins;
begin
  -- 1. Quién: con sesión, las revisiones solo las toca el entrenador del cliente (o su equipo / un superadmin). Sin sesión (service role, SQL de administración) se permite;
  --    quien llega desde la web siempre trae sesión (anon no puede escribir en checkins por RLS).
  if auth.uid() is not null then
    -- Borrar al cliente entero: la cascada de la clave ajena borra sus checkins cuando la fila de `clientes` ya no existe y «¿es su entrenador?» no se puede responder. Sin
    -- cliente no queda ficha que proteger (y quien puede borrar la fila de `clientes` lo decide la RLS de esa tabla, no este trigger).
    if tg_op = 'DELETE' and not exists (select 1 from public.clientes where id = old."clientId") then return old; end if;
    if tg_op in ('UPDATE', 'DELETE') and old.tipo is not distinct from 'parq_revisado' then v_old_cliente := old."clientId"; end if;
    if tg_op in ('INSERT', 'UPDATE') and new.tipo is not distinct from 'parq_revisado' then v_new_cliente := new."clientId"; end if;
    if (v_old_cliente is not null and not public.checkins_puede_revisar(v_old_cliente))
       or (v_new_cliente is not null and not public.checkins_puede_revisar(v_new_cliente)) then
      raise exception 'Solo el entrenador del cliente puede marcar su ficha de admisión como revisada' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;

  -- 2. La huella de una ficha de admisión la pone SIEMPRE el servidor, con lo que lleve la fila (se pisa lo que mande quien escribe)
  if new.tipo is not distinct from 'intake' then
    new.huella := public.huella_admision(new.respuestas);

  -- 3. Una revisión: se vincula a la versión exacta de la ficha que se indica (que debe ser de este cliente) y su contenido lo escribe el servidor
  elsif new.tipo is not distinct from 'parq_revisado' then
    begin
      select (e ->> 'respuesta')::uuid into v_adm_id
        from jsonb_array_elements(case when jsonb_typeof(new.respuestas) = 'array' then new.respuestas else '[]'::jsonb end) e
       where jsonb_typeof(e) = 'object' and e ->> 'pregunta' = 'admision' limit 1;
    exception when invalid_text_representation then
      v_adm_id := null;
    end;
    select * into v_adm from public.checkins where id = v_adm_id and tipo = 'intake' and "clientId" = new."clientId";
    if not found then
      raise exception 'La revisión debe indicar una ficha de admisión de este cliente' using errcode = '23514';
    end if;
    new.huella := public.huella_admision(v_adm.respuestas);
    new.respuestas := jsonb_build_array(jsonb_build_object('pregunta', 'admision', 'respuesta', v_adm.id::text));

  -- 4. En cualquier otra fila, la huella no puede venir de fuera
  else
    new.huella := null;
  end if;

  return new;
end;
$$;

revoke all on function public.checkins_puede_revisar(uuid) from public, anon, authenticated;
revoke all on function public.checkins_admision_y_revision() from public, anon, authenticated;
revoke all on function public.huella_admision(jsonb) from public, anon, authenticated;

drop trigger if exists checkins_admision_y_revision on public.checkins;
create trigger checkins_admision_y_revision
  before insert or update or delete on public.checkins
  for each row execute function public.checkins_admision_y_revision();

-- Las fichas de admisión que ya existen reciben su huella (el trigger la calcula en el UPDATE)
update public.checkins set respuestas = respuestas where tipo = 'intake' and huella is null;
