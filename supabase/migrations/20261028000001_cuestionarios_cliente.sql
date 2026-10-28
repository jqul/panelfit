-- Cuestionarios que el cliente responde de verdad, 2026-10-28.
--
-- Hasta ahora el entrenador creaba encuestas (survey_templates) y las programaba (survey_schedules), pero el
-- cliente no podía leerlas: su pestaña de encuesta mostraba un check-in fijo que iba a otra tabla. Esto lo arregla:
--
-- `encuestas_pendientes()`: lo que le toca responder al cliente con sesión, sin abrirle las tablas del entrenador.
--   Le toca una encuesta si…
--   · tiene un envío activo para él o para todos: semanal / quincenal / mensual → si no la ha respondido en ese
--     plazo; una vez → si no la ha respondido desde que se programó;
--   · lleva una etiqueta vinculada a esa encuesta → si no la ha respondido nunca;
--   · la encuesta está marcada «a clientes nuevos» y el cliente se dio de alta después → si no la ha respondido nunca.
-- `survey_templates.auto_nuevos_desde`: desde cuándo (ms) la encuesta se asigna sola a los clientes que lleguen.
-- `survey_responses`: el cliente solo puede guardar respuestas a nombre de SU entrenador (antes valía cualquiera).
-- Prueba: hardening/tests/bloque18_cuestionarios.sql (run-pglite-cuestionarios.mjs). Aplicada el 2026-10-28.

alter table public.survey_templates add column if not exists auto_nuevos_desde bigint;

drop policy if exists trainer_or_client_owns_survey_responses on public.survey_responses;
create policy trainer_or_client_owns_survey_responses on public.survey_responses for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = survey_responses.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = survey_responses.client_id
    and c.auth_user_id = (select auth.uid()) and c."trainerId"::text = survey_responses.trainer_id));

create or replace function public.encuestas_pendientes()
 returns table (template_id text, schedule_id text, nombre text, preguntas jsonb, trainer_id text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with c as (
    select id::text as cid, "trainerId"::text as tid, coalesce("createdAt", 0) as creado, coalesce(label_ids, '[]'::jsonb) as etiquetas
      from clientes where auth_user_id = auth.uid() and archived_at is null
     limit 1
  ),
  ultima as (
    select r.template_id, max(r.completed_at) as at from survey_responses r join c on r.client_id = c.cid group by r.template_id
  ),
  candidatas as (
    -- dias: plazo entre respuestas (null = basta con una); desde: lo respondido antes de esto no cuenta
    select s.template_id, s.id as schedule_id,
           case s.frequency when 'weekly' then 7 when 'biweekly' then 14 when 'monthly' then 30 end as dias,
           case when s.frequency in ('weekly', 'biweekly', 'monthly') then 0 else coalesce(s.created_at, 0) end as desde
      from survey_schedules s join c on s.trainer_id = c.tid
     where s.active and (s.client_id = c.cid or s.client_id is null)
    union all
    select l.survey_template_id, null, null, 0
      from labels l join c on l.trainer_id = c.tid
     where l.survey_template_id is not null and c.etiquetas ? l.id
    union all
    select t.id, null, null, 0
      from survey_templates t join c on t.trainer_id = c.tid
     where t.auto_nuevos_desde is not null and c.creado >= t.auto_nuevos_desde
  )
  select distinct on (t.id) t.id, k.schedule_id, t.name, t.questions, t.trainer_id
    from candidatas k
    join survey_templates t on t.id = k.template_id
    join c on t.trainer_id = c.tid
    left join ultima u on u.template_id = t.id
   where jsonb_array_length(coalesce(t.questions, '[]'::jsonb)) > 0
     and (u.at is null
          or (k.dias is null and u.at < k.desde)
          -- un día de margen: quien respondió el viernes por la tarde la tiene otra vez el viernes siguiente
          or (k.dias is not null and u.at < (extract(epoch from now()) * 1000)::bigint - (k.dias - 1) * 86400000::bigint))
   order by t.id, k.schedule_id nulls last
$function$;

revoke all on function public.encuestas_pendientes() from public, anon;
grant execute on function public.encuestas_pendientes() to authenticated;
