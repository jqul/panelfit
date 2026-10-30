-- Horario de citas y reserva desde la app del cliente (2026-10-30).
--
-- El entrenador fija cuándo se le puede reservar (franjas por día de la semana), cuánto dura cada cita, el margen
-- entre citas, con cuánta antelación como mínimo y si se confirman solas. El cliente ve los huecos libres y reserva.
--
--   horario_citas           una fila por entrenador; la gestionan él y su equipo. El cliente NO la lee directamente.
--   agenda_cliente()        para el cliente: el horario de SU entrenador y los tramos ocupados (solo inicio y fin, sin
--                           de quién son), para calcular los huecos en la app (src/lib/huecosCitas.ts).
--   reservar_cita()         para el cliente: vuelve a comprobar que el hueco está dentro del horario, con la antelación
--                           mínima y libre (con el margen), y crea la cita (confirmada si el entrenador lo quiere así).
--                           Un bloqueo por entrenador evita que dos clientes se queden el mismo hueco. Como mucho 3 citas
--                           futuras por cliente.
-- Las horas son las de Madrid (como el resto de tareas programadas).
-- Prueba: hardening/tests/bloque26_horario_citas.sql (run-pglite-horario-citas.mjs).

create table if not exists public.horario_citas (
  trainer_id      uuid primary key references public.entrenadores(uid) on delete cascade,
  -- [{ "dia": 0..6 (0 = lunes), "desde": "09:00", "hasta": "14:00" }, ...]
  franjas         jsonb not null default '[]'::jsonb check (jsonb_typeof(franjas) = 'array' and jsonb_array_length(franjas) <= 28),
  duracion_min    integer not null default 60 check (duracion_min between 15 and 240),
  margen_min      integer not null default 0 check (margen_min between 0 and 120),
  antelacion_horas integer not null default 12 check (antelacion_horas between 0 and 168),
  autoconfirmar   boolean not null default false,
  updated_at      timestamptz not null default now()
);

alter table public.horario_citas enable row level security;
create policy "entrenador_gestiona_su_horario" on public.horario_citas for all to authenticated
  using (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
  with check (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id));
revoke all on public.horario_citas from anon;

-- Para el cliente: horario de su entrenador y lo ocupado entre p_desde y p_desde + p_dias (como mucho 28 días).
create or replace function public.agenda_cliente(p_desde date, p_dias integer default 14)
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  v_trainer uuid;
  v_h horario_citas%rowtype;
  v_ini timestamptz;
  v_fin timestamptz;
begin
  select c."trainerId" into v_trainer from clientes c
   where c.auth_user_id = auth.uid() and c.archived_at is null limit 1;
  if v_trainer is null then return null; end if;
  select * into v_h from horario_citas where trainer_id = v_trainer;
  if not found or jsonb_array_length(v_h.franjas) = 0 then return jsonb_build_object('horario', null, 'ocupado', '[]'::jsonb); end if;
  v_ini := (p_desde::timestamp) at time zone 'Europe/Madrid';
  v_fin := v_ini + make_interval(days => least(greatest(coalesce(p_dias, 14), 1), 28));
  return jsonb_build_object(
    'horario', jsonb_build_object('franjas', v_h.franjas, 'duracion_min', v_h.duracion_min, 'margen_min', v_h.margen_min,
                                  'antelacion_horas', v_h.antelacion_horas, 'autoconfirmar', v_h.autoconfirmar),
    'ocupado', coalesce((select jsonb_agg(jsonb_build_object('inicio', ci.start_at, 'fin', ci.end_at) order by ci.start_at)
                           from citas ci
                          where ci.trainer_id = v_trainer and ci.status <> 'cancelada'
                            and ci.end_at > v_ini and ci.start_at < v_fin), '[]'::jsonb));
end;
$$;
revoke execute on function public.agenda_cliente(date, integer) from public, anon;
grant execute on function public.agenda_cliente(date, integer) to authenticated;

-- Para el cliente: reservar el hueco que empieza en p_inicio. Devuelve { id, status } o { error }.
create or replace function public.reservar_cita(p_inicio timestamptz)
 returns jsonb language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_cliente uuid;
  v_trainer uuid;
  v_h horario_citas%rowtype;
  v_local timestamp;
  v_dia integer;
  v_t_ini time;
  v_t_fin time;
  v_fin timestamptz;
  v_margen interval;
  v_estado text;
  v_id uuid;
begin
  select c.id, c."trainerId" into v_cliente, v_trainer from clientes c
   where c.auth_user_id = auth.uid() and c.archived_at is null limit 1;
  if v_cliente is null then return jsonb_build_object('error', 'sin_cliente'); end if;
  if p_inicio is null then return jsonb_build_object('error', 'fuera_de_horario'); end if;

  -- Un cliente a la vez por entrenador: dos reservas al mismo hueco no pasan las dos.
  perform pg_advisory_xact_lock(hashtext('reservar_cita:' || v_trainer::text));

  select * into v_h from horario_citas where trainer_id = v_trainer;
  if not found or jsonb_array_length(v_h.franjas) = 0 then return jsonb_build_object('error', 'sin_horario'); end if;
  if p_inicio < now() + make_interval(hours => v_h.antelacion_horas) then return jsonb_build_object('error', 'antelacion'); end if;
  if p_inicio > now() + interval '60 days' then return jsonb_build_object('error', 'fuera_de_horario'); end if;

  v_local := p_inicio at time zone 'Europe/Madrid';
  v_dia := extract(isodow from v_local)::integer - 1;
  v_t_ini := v_local::time;
  v_t_fin := v_t_ini + make_interval(mins => v_h.duracion_min);
  -- Dentro de una franja de ese día (y sin pasar de medianoche)
  if v_t_fin <= v_t_ini or not exists (
    select 1 from jsonb_array_elements(v_h.franjas) f
     where (f->>'dia')::integer = v_dia and (f->>'desde')::time <= v_t_ini and v_t_fin <= (f->>'hasta')::time
  ) then return jsonb_build_object('error', 'fuera_de_horario'); end if;

  v_fin := p_inicio + make_interval(mins => v_h.duracion_min);
  v_margen := make_interval(mins => v_h.margen_min);
  if exists (
    select 1 from citas ci
     where ci.trainer_id = v_trainer and ci.status <> 'cancelada'
       and ci.start_at < v_fin + v_margen and ci.end_at + v_margen > p_inicio
  ) then return jsonb_build_object('error', 'ocupado'); end if;

  if (select count(*) from citas ci where ci.client_id = v_cliente and ci.status in ('pendiente', 'confirmada') and ci.start_at > now()) >= 3 then
    return jsonb_build_object('error', 'demasiadas');
  end if;

  v_estado := case when v_h.autoconfirmar then 'confirmada' else 'pendiente' end;
  insert into citas (trainer_id, client_id, title, start_at, end_at, status, notes)
  values (v_trainer, v_cliente, 'Cita reservada', p_inicio, v_fin, v_estado, '')
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', v_estado);
end;
$$;
revoke execute on function public.reservar_cita(timestamptz) from public, anon;
grant execute on function public.reservar_cita(timestamptz) to authenticated;
