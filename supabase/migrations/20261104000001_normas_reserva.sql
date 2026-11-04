-- Normas de reserva de citas (2026-11-04).
--
-- Además de la antelación mínima para reservar (ya estaba), el entrenador decide:
--   dias_vista      hasta cuántos días en adelante se puede reservar (antes, fijo en 60).
--   cancelar_horas  hasta cuántas horas antes de la cita puede cancelarla el cliente (0 = hasta que empiece).
-- reservar_cita y agenda_cliente las usan, y un disparador impide que el CLIENTE cancele fuera de plazo (el entrenador y
-- su equipo pueden cancelar siempre). Las demás reglas de horario_citas no cambian.
-- Prueba: hardening/tests/bloque28_normas_reserva.sql (run-pglite-normas-reserva.mjs).

alter table public.horario_citas
  add column if not exists dias_vista integer not null default 60 check (dias_vista between 1 and 90),
  add column if not exists cancelar_horas integer not null default 0 check (cancelar_horas between 0 and 168);

-- Para el cliente: el horario de su entrenador (ahora con sus normas) y lo ocupado entre p_desde y p_desde + p_dias.
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
                                  'antelacion_horas', v_h.antelacion_horas, 'autoconfirmar', v_h.autoconfirmar,
                                  'dias_vista', v_h.dias_vista, 'cancelar_horas', v_h.cancelar_horas),
    'ocupado', coalesce((select jsonb_agg(jsonb_build_object('inicio', ci.start_at, 'fin', ci.end_at) order by ci.start_at)
                           from citas ci
                          where ci.trainer_id = v_trainer and ci.status <> 'cancelada'
                            and ci.end_at > v_ini and ci.start_at < v_fin), '[]'::jsonb));
end;
$$;
revoke execute on function public.agenda_cliente(date, integer) from public, anon;
grant execute on function public.agenda_cliente(date, integer) to authenticated;

-- Para el cliente: reservar el hueco que empieza en p_inicio. Igual que antes, pero con los días vista del entrenador.
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
  if p_inicio > now() + make_interval(days => v_h.dias_vista) then return jsonb_build_object('error', 'demasiado_lejos'); end if;

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

-- El cliente solo puede cancelar hasta cancelar_horas antes de la cita. Quien no es el cliente de la cita (el entrenador,
-- su equipo, el sistema) no tiene límite.
create or replace function public.plazo_cancelacion_cita()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_horas integer;
begin
  if new.status is distinct from 'cancelada' or old.status = 'cancelada' then return new; end if;
  if old.trainer_id = auth.uid() or public.is_team_member_of(old.trainer_id) then return new; end if;
  if not exists (select 1 from clientes c where c.id = old.client_id and c.auth_user_id = auth.uid()) then return new; end if;
  select h.cancelar_horas into v_horas from horario_citas h where h.trainer_id = old.trainer_id;
  if coalesce(v_horas, 0) > 0 and old.start_at < now() + make_interval(hours => v_horas) then
    raise exception 'plazo_cancelacion' using errcode = 'P0001', hint = format('Se puede cancelar hasta %s h antes', v_horas);
  end if;
  return new;
end;
$$;
revoke execute on function public.plazo_cancelacion_cita() from public, anon, authenticated;

drop trigger if exists citas_plazo_cancelacion on public.citas;
create trigger citas_plazo_cancelacion before update of status on public.citas
  for each row execute function public.plazo_cancelacion_cita();
