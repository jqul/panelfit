-- Sesiones online (2026-11-05).
--
-- Una cita o una clase de grupo puede llevar el enlace de su videollamada (Meet, Zoom, Teams...): con enlace es online,
-- sin él, presencial. Solo https y sin espacios, como mucho 500 caracteres.
--   - citas.enlace: el cliente lo lee con la RLS de siempre (solo sus citas).
--   - clases.enlace: el cliente no lee clases directamente; clases_cliente() le dice si la clase es online a todos, y
--     le da el enlace solo si tiene plaza (quien está en la lista de espera no lo recibe).
-- Prueba: hardening/tests/bloque36_sesiones_online.sql (run-pglite-sesiones-online.mjs).

alter table public.citas add column if not exists enlace text;
alter table public.citas drop constraint if exists citas_enlace_valido;
alter table public.citas add constraint citas_enlace_valido check (enlace is null or (length(enlace) <= 500 and enlace ~ '^https://[^[:space:]]+$'));

alter table public.clases add column if not exists enlace text;
alter table public.clases drop constraint if exists clases_enlace_valido;
alter table public.clases add constraint clases_enlace_valido check (enlace is null or (length(enlace) <= 500 and enlace ~ '^https://[^[:space:]]+$'));

create or replace function public.clases_cliente(p_dias integer default 14)
 returns jsonb language sql stable security definer
 set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', k.id, 'titulo', k.titulo, 'start_at', k.start_at, 'end_at', k.end_at, 'notas', k.notas,
    'aforo', k.aforo,
    'ocupadas', (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'reservada'),
    'en_espera', (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'espera'),
    'mi_estado', mp.estado,
    'mi_puesto', case when mp.estado = 'espera' then
      (select count(*) from clase_plazas p where p.clase_id = k.id and p.estado = 'espera' and p.created_at <= mp.created_at) end,
    'cancelar_horas', coalesce(h.cancelar_horas, 0),
    'online', k.enlace is not null,
    'enlace', case when mp.estado = 'reservada' then k.enlace end
  ) order by k.start_at), '[]'::jsonb)
  from clientes c
  join clases k on k.trainer_id = c."trainerId"
  left join horario_citas h on h.trainer_id = k.trainer_id
  left join clase_plazas mp on mp.clase_id = k.id and mp.client_id = c.id
  where c.auth_user_id = auth.uid() and c.archived_at is null
    and not k.cancelada
    -- Una online se sigue viendo hasta que acaba (para poder entrar tarde); una presencial, hasta que empieza
    and (k.start_at > now() or (k.enlace is not null and mp.estado = 'reservada' and k.end_at > now()))
    and k.start_at < now() + make_interval(days => least(greatest(coalesce(p_dias, 14), 1), 90))
    and (mp.estado is not null or k.start_at <= now() + make_interval(days => coalesce(h.dias_vista, 60)));
$$;
revoke all on function public.clases_cliente(integer) from public, anon;
grant execute on function public.clases_cliente(integer) to authenticated;
