-- Notas privadas del entrenador sobre un cliente (2026-11-18).
--
-- Hallazgo: las «Notas privadas» (la UI promete «Solo las ves tú») vivían en planes.plan -> P -> coachNotes, y el cliente lee
-- su fila de planes entera (ClientView: from('planes').select('plan')). Las notas viajaban en la respuesta de red al cliente
-- aunque no se pintaran. Se sacan del plan a una tabla propia sin política para el cliente (mismo patrón que
-- decisiones_entrenador).
--
--   notas_privadas_cliente   una fila por cliente; SOLO el entrenador (o su equipo), solo para SUS clientes.
-- Entra en el RGPD (client_data_tables) y cae en cascada si se borra el cliente.
--
-- Datos existentes: se copian a la tabla nueva, se COMPRUEBA que cada nota quedó idéntica (si no, la migración aborta sin
-- tocar nada) y solo entonces se quitan de planes.plan / plan_borrador / siguiente. plan_history (solo entrenador) conserva
-- las copias antiguas con la clave: no se borra nada de ahí.
-- También se corrige export_client_data: el cliente ya no recibe en SU exportación estas notas, el diario de decisiones ni
-- coachNotes dentro de las copias antiguas de plan_history.
-- Prueba: hardening/tests/bloque30_notas_privadas.sql (run-pglite-notas-privadas.mjs).

create table if not exists public.notas_privadas_cliente (
  client_id  uuid primary key references public.clientes(id) on delete cascade,
  trainer_id uuid not null references public.entrenadores(uid) on delete cascade,
  -- Hay notas de decenas de miles de caracteres (el historial acumulado de un cliente): el límite solo evita abusos
  notas      text not null default '' check (char_length(notas) <= 200000),
  updated_at timestamptz not null default now()
);
create index if not exists notas_privadas_cliente_trainer_idx on public.notas_privadas_cliente (trainer_id);

alter table public.notas_privadas_cliente enable row level security;

-- Solo el entrenador o su equipo, y solo para clientes suyos. No hay política para el cliente: no ve nada.
create policy "entrenador_gestiona_notas_privadas" on public.notas_privadas_cliente for all to authenticated
  using (trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
  with check ((trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
    and exists (select 1 from public.clientes c where c.id = notas_privadas_cliente.client_id and c."trainerId" = notas_privadas_cliente.trainer_id));

revoke all on public.notas_privadas_cliente from anon;

-- ── Migración de datos ──
-- 1) Copiar las notas existentes (solo las que tienen texto; las vacías no hacen falta). Normalmente la nota es la del plan
--    vivo; si ese no tiene y el borrador sí, se rescata la del borrador para no perder nada.
create temp table _notas_origen on commit drop as
select p."clientId" as client_id, c."trainerId" as trainer_id,
       case when nullif(btrim(p.plan -> 'P' ->> 'coachNotes'), '') is not null and jsonb_typeof(p.plan -> 'P' -> 'coachNotes') = 'string'
            then p.plan -> 'P' ->> 'coachNotes'
            else p.plan_borrador -> 'P' ->> 'coachNotes' end as notas
from public.planes p
join public.clientes c on c.id = p."clientId";
delete from _notas_origen where nullif(btrim(notas), '') is null;

insert into public.notas_privadas_cliente (client_id, trainer_id, notas)
select client_id, trainer_id, notas from _notas_origen
on conflict (client_id) do nothing;

-- 2) Comprobar que NINGUNA nota con texto se queda sin copia idéntica; si falla, se aborta y no se quita nada
do $$
declare n int;
begin
  select count(*) into n
  from _notas_origen o
  where not exists (select 1 from public.notas_privadas_cliente x where x.client_id = o.client_id and x.notas = o.notas);
  if n > 0 then
    raise exception 'notas_privadas_cliente: % notas sin copia fiel; no se quita nada de planes', n;
  end if;
end $$;

-- 3) Quitar la clave de los planes que el cliente puede leer (el plan vivo, el borrador y el siguiente)
update public.planes set plan = plan #- '{P,coachNotes}' where plan -> 'P' ? 'coachNotes';
update public.planes set plan_borrador = plan_borrador #- '{P,coachNotes}' where plan_borrador -> 'P' ? 'coachNotes';
update public.planes set siguiente = siguiente #- '{P,coachNotes}' where siguiente -> 'P' ? 'coachNotes';

-- 4) Cinturón y tirantes: el plan que lee el cliente NO puede volver a llevar coachNotes. Una pestaña del entrenador abierta
--    con la versión antigua de la app (o cualquier otro escritor) lo reintroduciría al guardar el plan; el disparador lo quita
--    siempre. (Esas notas editadas desde una pestaña antigua no se guardan: la app nueva ya las escribe en notas_privadas_cliente.)
create or replace function public.planes_sin_notas_privadas()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  new.plan := new.plan #- '{P,coachNotes}';
  new.plan_borrador := new.plan_borrador #- '{P,coachNotes}';
  new.siguiente := new.siguiente #- '{P,coachNotes}';
  return new;
end;
$function$;
revoke execute on function public.planes_sin_notas_privadas() from public, anon, authenticated;

drop trigger if exists planes_sin_notas_privadas on public.planes;
create trigger planes_sin_notas_privadas
  before insert or update on public.planes
  for each row
  when ((new.plan -> 'P') ? 'coachNotes' or (new.plan_borrador -> 'P') ? 'coachNotes' or (new.siguiente -> 'P') ? 'coachNotes')
  execute function public.planes_sin_notas_privadas();

-- 5) La exportación RGPD recorre client_data_tables() con security definer. Lo que el entrenador guarda sobre el cliente (estas
--    notas y el diario de decisiones) no debe salir en la exportación que pide el PROPIO cliente (docs/rgpd.md: «no incluye las
--    notas privadas»), y las copias antiguas de plan_history aún llevan coachNotes dentro del plan. El entrenador, su equipo y el
--    super admin siguen recibiendo todo.
create or replace function public.export_client_data(p_client_id uuid)
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  r record;
  v jsonb;
  v_row jsonb;
  v_out jsonb;
  v_expr text;
  v_manager boolean := public.can_manage_client(p_client_id);
  v_self boolean := auth.uid() is not null and exists (
    select 1 from public.clientes c where c.id = p_client_id and c.auth_user_id = auth.uid());
begin
  if not (v_manager or v_self) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select to_jsonb(c) into v_row from public.clientes c where c.id = p_client_id;
  if v_row is null then raise exception 'Cliente no encontrado'; end if;
  if not v_manager then v_row := v_row - 'notas_privadas' - 'alerts' - 'label_ids'; end if;
  v_out := jsonb_build_object('clientes', v_row);

  for r in select * from public.client_data_tables() loop
    if not v_manager and r.tbl in ('notas_privadas_cliente', 'decisiones_entrenador') then continue; end if;
    v_expr := case when not v_manager and r.tbl = 'plan_history' then 'to_jsonb(t) #- ''{plan,P,coachNotes}''' else 'to_jsonb(t)' end;
    execute format('select coalesce(jsonb_agg(%s), ''[]''::jsonb) from public.%I t where t.%I::text = $1', v_expr, r.tbl, r.col)
      into v using p_client_id::text;
    v_out := v_out || jsonb_build_object(r.tbl, v);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.accepted_at), '[]'::jsonb) into v
    from public.consentimientos t where t."clientId" = p_client_id;
  return v_out || jsonb_build_object('consentimientos', v, 'exportado_en', now());
end;
$$;
revoke execute on function public.export_client_data(uuid) from public, anon;
grant execute on function public.export_client_data(uuid) to authenticated;

-- RGPD: la exportación y el borrado completo del cliente la incluyen
create or replace function public.client_data_tables()
 returns table(tbl text, col text)
 language sql
 immutable
 set search_path to 'public'
as $function$
  values
    ('actividades', 'client_id'),
    ('ausencias', 'client_id'), ('bonos_cliente', 'client_id'), ('calendario_enlaces', 'client_id'),
    ('checkins', 'clientId'), ('ciclo_tracking', 'client_id'), ('citas', 'client_id'),
    ('clase_plazas', 'client_id'),
    ('cohorte_clientes', 'client_id'), ('decisiones_entrenador', 'client_id'), ('descansos', 'client_id'), ('dietas', 'cliente_id'), ('encuestas', 'cliente_id'),
    ('eventos_cliente', 'client_id'),
    ('exercise_usage_events', 'client_id'), ('foto_sessions', 'client_id'), ('fotos', 'cliente_id'),
    ('fv_profile_trials', 'client_id'), ('habitos', 'clientId'), ('notas_antes_sesion', 'client_id'),
    ('notas_privadas_cliente', 'client_id'),
    ('notificaciones', 'client_id'),
    ('plan_history', 'clientId'), ('planes', 'clientId'), ('programacion_mensajes', 'clientId'),
    ('progress_photos', 'clientId'), ('push_subscriptions', 'client_id'), ('readiness_checkins', 'clientId'),
    ('recordatorios_enviados', 'client_id'),
    ('registros', 'clientId'), ('registros_dolor', 'clientId'), ('registros_habitos', 'clientId'),
    ('registros_peso', 'clientId'), ('session_load', 'client_id'), ('session_reactions', 'clientId'),
    ('strava_conexiones', 'client_id'),
    ('survey_responses', 'client_id'), ('survey_schedules', 'client_id'),
    ('tareas_cliente', 'client_id'), ('tareas_hechas', 'client_id'), ('test_resultados', 'client_id'),
    ('valoraciones', 'client_id'), ('video_feedback', 'client_id'), ('waivers', 'clientId'),
    ('weekly_reviews', 'clientId')
$function$;
