-- Eventos propios en la agenda (2026-11-10): reuniones, ratos personales y recordatorios del entrenador, sin cliente.
-- citas.evento: null = sesión (con cliente) o bloqueo de siempre; 'reunion' y 'personal' ocupan el hueco como un
-- bloqueo; 'recordatorio' es una nota a una hora y NO ocupa: el cliente puede reservar encima. Un evento nunca lleva
-- cliente (así un cliente no puede marcar su propia solicitud como recordatorio para saltarse los huecos).

alter table public.citas add column if not exists evento text;
alter table public.citas drop constraint if exists citas_evento_check;
alter table public.citas add constraint citas_evento_check
  check (evento is null or (evento in ('reunion', 'personal', 'recordatorio') and client_id is null));

-- Lo mismo que en 20261104000001_normas_reserva.sql, sin contar los recordatorios como ocupado
create or replace function public.agenda_cliente(p_desde date, p_dias integer default 14)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
                            and ci.evento is distinct from 'recordatorio'
                            and ci.end_at > v_ini and ci.start_at < v_fin), '[]'::jsonb));
end;
$function$;

create or replace function public.reservar_cita(p_inicio timestamp with time zone)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  perform pg_advisory_xact_lock(hashtext('reservar_cita:' || v_trainer::text));

  select * into v_h from horario_citas where trainer_id = v_trainer;
  if not found or jsonb_array_length(v_h.franjas) = 0 then return jsonb_build_object('error', 'sin_horario'); end if;
  if p_inicio < now() + make_interval(hours => v_h.antelacion_horas) then return jsonb_build_object('error', 'antelacion'); end if;
  if p_inicio > now() + make_interval(days => v_h.dias_vista) then return jsonb_build_object('error', 'demasiado_lejos'); end if;

  v_local := p_inicio at time zone 'Europe/Madrid';
  v_dia := extract(isodow from v_local)::integer - 1;
  v_t_ini := v_local::time;
  v_t_fin := v_t_ini + make_interval(mins => v_h.duracion_min);
  if v_t_fin <= v_t_ini or not exists (
    select 1 from jsonb_array_elements(v_h.franjas) f
     where (f->>'dia')::integer = v_dia and (f->>'desde')::time <= v_t_ini and v_t_fin <= (f->>'hasta')::time
  ) then return jsonb_build_object('error', 'fuera_de_horario'); end if;

  v_fin := p_inicio + make_interval(mins => v_h.duracion_min);
  v_margen := make_interval(mins => v_h.margen_min);
  if exists (
    select 1 from citas ci
     where ci.trainer_id = v_trainer and ci.status <> 'cancelada'
       and ci.evento is distinct from 'recordatorio'
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
$function$;
