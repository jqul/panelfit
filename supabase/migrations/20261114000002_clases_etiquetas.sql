-- Clases solo para clientes con ciertas etiquetas (2026-11-14).
-- clases.etiquetas: ids de etiquetas (como clientes.label_ids). Vacío = abierta a todos sus clientes, como hasta ahora.
-- Con etiquetas, el cliente que no tiene ninguna de ellas no la ve en clases_cliente ni puede reservarla; quien ya tenía
-- plaza (o estaba en espera) la sigue viendo. Lo demás es igual que en 20261105000002_sesiones_online.sql.

alter table public.clases add column if not exists etiquetas jsonb not null default '[]';
alter table public.clases drop constraint if exists clases_etiquetas_array;
alter table public.clases add constraint clases_etiquetas_array check (jsonb_typeof(etiquetas) = 'array' and jsonb_array_length(etiquetas) <= 20);

-- ¿Puede este cliente ver/reservar la clase por sus etiquetas?
create or replace function public.clase_para_cliente(p_etiquetas jsonb, p_label_ids jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(jsonb_array_length(p_etiquetas), 0) = 0
      or exists (
        select 1 from jsonb_array_elements_text(p_etiquetas) e
         where coalesce(p_label_ids, '[]'::jsonb) ? e
      )
$$;

create or replace function public.clases_cliente(p_dias integer default 14)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
    and (mp.estado is not null or public.clase_para_cliente(k.etiquetas, c.label_ids))
    and (k.start_at > now() or (k.enlace is not null and mp.estado = 'reservada' and k.end_at > now()))
    and k.start_at < now() + make_interval(days => least(greatest(coalesce(p_dias, 14), 1), 90))
    and (mp.estado is not null or k.start_at <= now() + make_interval(days => coalesce(h.dias_vista, 60)));
$function$;

create or replace function public.reservar_clase(p_clase uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_k clases%rowtype; v_cliente uuid; v_labels jsonb; v_vista integer; v_estado text;
begin
  select * into v_k from clases where id = p_clase;
  select c.id, c.label_ids into v_cliente, v_labels from clientes c
   where c.auth_user_id = auth.uid() and c."trainerId" = v_k.trainer_id and c.archived_at is null limit 1;
  if v_k.id is null or v_cliente is null then raise exception 'no_autorizado' using errcode = '42501'; end if;
  if v_k.cancelada or v_k.start_at <= now() then raise exception 'clase_no_disponible' using errcode = 'P0001'; end if;
  if not public.clase_para_cliente(v_k.etiquetas, v_labels)
     and not exists (select 1 from clase_plazas where clase_id = p_clase and client_id = v_cliente) then
    raise exception 'clase_no_disponible' using errcode = 'P0001';
  end if;
  select dias_vista into v_vista from horario_citas where trainer_id = v_k.trainer_id;
  if v_k.start_at > now() + make_interval(days => coalesce(v_vista, 60)) then
    raise exception 'demasiado_lejos' using errcode = 'P0001';
  end if;
  insert into clase_plazas (clase_id, client_id, estado) values (p_clase, v_cliente, 'reservada')
    on conflict (clase_id, client_id) do nothing;
  select estado into v_estado from clase_plazas where clase_id = p_clase and client_id = v_cliente;
  return v_estado;
end;
$function$;
