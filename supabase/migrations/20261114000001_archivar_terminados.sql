-- Archivar solos a los clientes que han terminado su plan (2026-11-14).
-- El entrenador lo enciende en Ajustes (entrenadores.profile.autoArchivar = { activo: true, dias: N }). Cada noche, a
-- quien terminó su plan hace N días o más, no tiene otro plan enlazado (planes.siguiente) y no ha registrado nada desde
-- entonces, se le archiva con motivo 'plan_terminado' (sale en la Bandeja del entrenador para recuperarlo si quiere).
-- El fin del plan es el mismo que calcula la app: fechaInicio + semanas × 7. Al recuperar a alguien, el motivo se borra.

alter table public.clientes add column if not exists archivado_motivo text;
comment on column public.clientes.archivado_motivo is 'por qué se archivó solo (plan_terminado); null si lo archivó el entrenador o está activo';

create or replace function public.limpiar_motivo_archivo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.archived_at is null then new.archivado_motivo := null; end if;
  return new;
end;
$$;
drop trigger if exists clientes_motivo_archivo on public.clientes;
create trigger clientes_motivo_archivo before update of archived_at on public.clientes
  for each row execute function public.limpiar_motivo_archivo();

create or replace function public.archivar_planes_terminados(p_hoy date default (now() at time zone 'Europe/Madrid')::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with ajustes as (
    select e.uid,
           least(greatest(case when e.profile->'autoArchivar'->>'dias' ~ '^\d{1,3}$' then (e.profile->'autoArchivar'->>'dias')::int else 14 end, 1), 90) as dias
      from entrenadores e
     where e.profile->'autoArchivar'->>'activo' = 'true'
  ), candidatos as (
    select c.id
      from clientes c
      join ajustes a on a.uid = c."trainerId"
      join planes pl on pl."clientId" = c.id
      left join registros r on r."clientId" = c.id
     where c.archived_at is null
       and pl.siguiente is null
       and pl.plan->'P'->>'fechaInicio' ~ '^\d{4}-\d{2}-\d{2}$'
       and jsonb_typeof(pl.plan->'P'->'weeks') = 'array'
       and jsonb_array_length(pl.plan->'P'->'weeks') > 0
       and (pl.plan->'P'->>'fechaInicio')::date + 7 * jsonb_array_length(pl.plan->'P'->'weeks') + a.dias <= p_hoy
       and coalesce(r."updatedAt", 0) < extract(epoch from (((p_hoy - a.dias)::timestamp) at time zone 'Europe/Madrid')) * 1000
  )
  update clientes c
     set archived_at = (extract(epoch from now()) * 1000)::bigint, archivado_motivo = 'plan_terminado'
    from candidatos k
   where c.id = k.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.archivar_planes_terminados(date) from public, anon, authenticated;

-- Tarea programada: cada noche a las 03:00 UTC, después de empezar los programas enlazados (02:00): quien tenía el siguiente ya lo empezó
select cron.unschedule('archivar-terminados') where exists (select 1 from cron.job where jobname = 'archivar-terminados');
select cron.schedule('archivar-terminados', '0 3 * * *', $cron$select public.archivar_planes_terminados();$cron$);
