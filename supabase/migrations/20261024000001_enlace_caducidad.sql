-- Bloque 8 de hardening (2026-10-24): caducidad opcional del enlace de cliente.
-- token_expires_at NULL = no caduca (como hasta ahora). get_client_by_token, claim_client_by_token y
-- mark_plan_opened la respetan; get_client_link_status distingue "caducado" de "no existe".
-- Incluye el recorte de columnas privadas del bloque 2 (ya aplicado). Prueba: hardening/tests/bloque8_caducidad.sql

alter table public.clientes add column if not exists token_expires_at timestamptz;

create or replace function public.get_client_by_token(p_token text)
 returns setof clientes language sql security definer
 set search_path to 'public'
as $$
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
         c.token_expires_at
  from public.clientes c
  where c.token = p_token
    and (c.token_expires_at is null or c.token_expires_at > now())
  limit 1;
$$;

create or replace function public.claim_client_by_token(p_token text)
 returns void language sql security definer
 set search_path to 'public'
as $$
  update public.clientes
  set auth_user_id = auth.uid()
  where token = p_token and auth_user_id is null
    and (token_expires_at is null or token_expires_at > now());
$$;

create or replace function public.mark_plan_opened(p_token text)
 returns void language sql security definer
 set search_path to 'public'
as $$
  update public.clientes set plan_last_opened_at = now()
  where token = p_token and (token_expires_at is null or token_expires_at > now());
$$;

-- Estado del enlace, para que la pantalla del cliente diga "ha caducado" en vez del
-- mismo error que un enlace inexistente. Solo responde a quien ya tiene el token
-- (32 caracteres al azar), y no devuelve ningún dato del cliente: 'ok', 'expired' o null.
create or replace function public.get_client_link_status(p_token text)
 returns text language sql security definer stable
 set search_path to 'public'
as $$
  select case when c.token_expires_at is not null and c.token_expires_at <= now() then 'expired' else 'ok' end
  from public.clientes c
  where c.token = p_token
  limit 1;
$$;
grant execute on function public.get_client_link_status(text) to anon, authenticated;
