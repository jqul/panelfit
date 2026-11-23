-- get_client_by_token vuelve a funcionar: le faltaba la columna `archivado_motivo` (2026-11-23).
--
-- Qué pasaba: get_client_by_token(p_token) devuelve SETOF clientes y escribe a mano la lista de columnas, EN EL ORDEN de la tabla (es la única forma de enmascarar las columnas
-- privadas devolviéndolas a null). La migración 20261114000001_archivar_terminados.sql añadió `clientes.archivado_motivo` (la columna 33) y no rehízo la función, que seguía
-- devolviendo 32. Desde entonces CADA llamada falla con:
--     ERROR 42P13: return type mismatch in function declared to return clientes — Final statement returns too few columns
-- y el enlace /?c=<token> no resuelve a ningún cliente. Nadie lo notó porque (1) los e2e usan una Supabase simulada que no ejecuta esta función SQL y (2) quien ya había abierto su
-- enlace conserva una copia local que la app usa cuando la llamada falla: solo se rompe para un cliente NUEVO (o un dispositivo nuevo), justo el que acaba de darse de alta.
--
-- Arreglo: la misma función, con la columna que faltaba al final y a null (es un dato interno del entrenador, como las demás columnas enmascaradas; además, quien está archivado ya
-- no sale por aquí). No cambia ni el filtro (token exacto, enlace sin caducar, cliente no archivado) ni los permisos: CREATE OR REPLACE conserva los que tiene.
--
-- Regla para la próxima vez: toda migración que añada una columna a `clientes` debe rehacer esta función con la columna nueva al final. Lo comprueba la prueba
-- hardening/tests/bloque47_get_client_by_token.sql (+ run-pglite-get-client-by-token.mjs): número, orden, nombre y tipo de las columnas del resultado frente a los de `clientes`.

create or replace function public.get_client_by_token(p_token text)
 returns setof clientes
 language sql
 security definer
 set search_path to 'public'
as $function$
  select c.id, c."trainerId", c.name, c.surname, c.weight, c."fatPercentage", c."muscleMass",
         c."totalLifted", c."planDescription", c.token, c."createdAt", c.objetivo, c.phone,
         c.altura, c.genero, c.fechanacimiento,
         null::text        as notas_privadas,
         '[]'::jsonb       as alerts,
         c.auth_user_id,
         '[]'::jsonb       as label_ids,
         c.notif_email, c.notif_prefs,
         null::numeric     as precio_mensual,
         null::text        as lesiones,
         null::text        as equipo_disponible,
         c.metricas_cliente, c.plan_last_opened_at, c.main_goal,
         c.token_expires_at,
         c.archived_at,
         c.recordatorio_diario,
         null::uuid        as profesional_id,
         null::text        as archivado_motivo
  from public.clientes c
  where c.token = p_token
    and (c.token_expires_at is null or c.token_expires_at > now())
    and c.archived_at is null
  limit 1;
$function$;
