-- Programas enlazados (2026-11-04).
--
-- El entrenador deja preparado en la ficha del cliente lo que viene después del plan actual («Cuando termine este
-- plan»): se guarda una copia de las semanas del workout en planes.siguiente, así que cambiar la plantilla después no
-- cambia lo preparado. Cada noche, empezar_planes_enlazados() mira los planes que ya han terminado y tienen algo
-- preparado: guarda una copia del plan en plan_history y pone las semanas nuevas empezando el lunes de esta semana (el
-- lunes siguiente al fin, si la tarea corre a diario). Lo demás del plan (días elegidos, avisos, mensajes...) se
-- conserva; las sesiones movidas a mano (fechasSesion) eran del plan anterior y se quitan.
--
-- No se toca: el plan sin fecha de inicio (no se sabe cuándo acaba), el que tiene un borrador abierto (se haría al
-- publicarlo, en la siguiente pasada) ni el de un cliente archivado.
-- planes ya tiene RLS (entrenador, su equipo y el propio cliente): la columna nueva entra con ella.
-- Prueba: hardening/tests/bloque31_programas_enlazados.sql (run-pglite-programas-enlazados.mjs).

alter table public.planes add column if not exists siguiente jsonb;
alter table public.planes drop constraint if exists planes_siguiente_valido;
alter table public.planes add constraint planes_siguiente_valido check (
  siguiente is null or (jsonb_typeof(siguiente->'weeks') = 'array' and jsonb_array_length(siguiente->'weeks') > 0)
);

create or replace function public.empezar_planes_enlazados(p_hoy date default (now() at time zone 'Europe/Madrid')::date)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  r record;
  lunes date := date_trunc('week', p_hoy)::date;
  p jsonb;
  semanas jsonb;
  n integer := 0;
begin
  for r in
    select pl."clientId" as id, pl.plan, pl.siguiente
    from public.planes pl
    join public.clientes c on c.id = pl."clientId"
    where pl.siguiente is not null
      and coalesce(pl.borrador_activo, false) = false
      and c.archived_at is null
      and pl.plan->'P'->>'fechaInicio' ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(pl.plan->'P'->'weeks') = 'array'
      and jsonb_array_length(pl.plan->'P'->'weeks') > 0
      and date_trunc('week', (pl.plan->'P'->>'fechaInicio')::date)::date
          + 7 * jsonb_array_length(pl.plan->'P'->'weeks') <= p_hoy
    for update of pl
  loop
    select jsonb_agg(w || jsonb_build_object('isCurrent', i = 1) order by i) into semanas
    from jsonb_array_elements(r.siguiente->'weeks') with ordinality t(w, i);
    p := ((r.plan->'P') - 'fechasSesion')
         || jsonb_build_object('weeks', semanas, 'fechaInicio', to_char(lunes, 'YYYY-MM-DD'));
    if r.siguiente ? 'type' then p := p || jsonb_build_object('type', r.siguiente->'type'); end if;

    insert into public.plan_history ("clientId", plan, note, published_by)
    values (r.id, r.plan->'P', 'Antes de empezar «' || coalesce(r.siguiente->>'nombre', 'el siguiente plan') || '»', 'Programa enlazado');
    update public.planes
      set plan = jsonb_build_object('P', p), siguiente = null, "updatedAt" = (extract(epoch from now()) * 1000)::bigint
      where "clientId" = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.empezar_planes_enlazados(date) from public, anon, authenticated;

-- Tarea programada: cada noche a las 02:00 UTC (las 3 o las 4 en Madrid)
select cron.unschedule('programas-enlazados') where exists (select 1 from cron.job where jobname = 'programas-enlazados');
select cron.schedule('programas-enlazados', '0 2 * * *', $cron$select public.empezar_planes_enlazados();$cron$);
