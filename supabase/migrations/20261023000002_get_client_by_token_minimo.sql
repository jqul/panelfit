-- Bloque 2 de hardening (2026-10-23): get_client_by_token deja de devolver las notas
-- privadas, lesiones, precio, alerts, label_ids y equipo_disponible del entrenador.
-- Mantiene el tipo de retorno (setof clientes) con esas columnas anuladas.

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
         c.metricas_cliente, c.plan_last_opened_at, c.main_goal
  from public.clientes c
  where c.token = p_token
  limit 1;
$$;
