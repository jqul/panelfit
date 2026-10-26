-- Archivar un cliente: deja de contar en el límite del plan y pierde el acceso
-- a su panel, pero se conservan todos sus datos hasta que se reactive.
alter table public.clientes add column archived_at bigint;
comment on column public.clientes.archived_at is 'ms epoch en que se archivó; null = activo';

-- get_client_by_token devuelve SETOF clientes: la lista de columnas tiene que
-- seguir el orden de la tabla, así que archived_at va al final. Si se añade la
-- columna sin rehacer esta función, el panel de todos los clientes deja de cargar.
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
         c.archived_at
  from public.clientes c
  where c.token = p_token
    and (c.token_expires_at is null or c.token_expires_at > now())
    and c.archived_at is null
  limit 1;
$function$;

create or replace function public.mark_plan_opened(p_token text)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  update public.clientes set plan_last_opened_at = now()
  where token = p_token and (token_expires_at is null or token_expires_at > now())
    and archived_at is null;
$function$;

create or replace function public.claim_client_by_token(p_token text)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  update public.clientes
  set auth_user_id = auth.uid()
  where token = p_token and auth_user_id is null
    and (token_expires_at is null or token_expires_at > now())
    and archived_at is null;
$function$;

-- El panel del cliente la usa para distinguir "acceso pausado" de "enlace no válido".
create or replace function public.get_client_link_status(p_token text)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
           when c.archived_at is not null then 'archived'
           when c.token_expires_at is not null and c.token_expires_at <= now() then 'expired'
           else 'ok'
         end
  from public.clientes c
  where c.token = p_token
  limit 1;
$function$;
