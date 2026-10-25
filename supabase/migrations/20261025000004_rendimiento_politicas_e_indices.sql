-- Rendimiento (2026-10-25), a partir de los avisos del asesor de Supabase. No cambia quién puede ver o escribir qué.
--
-- 1) Dos políticas (plan_history, weekly_reviews) llamaban a auth.uid() sin envolver: Postgres lo reevalúa por cada
--    fila. Con (select auth.uid()) se evalúa una vez por consulta. Mismo criterio que ya usan el resto de políticas.
-- 2) Dos claves foráneas sin índice que las cubra (fv_profile_trials.trainer_id, leads.referred_by_client_id): sin él,
--    borrar o actualizar la fila referenciada recorre toda la tabla.
--
-- Prueba: hardening/tests/bloque13_rendimiento.sql (run-pglite-rendimiento.mjs).

alter policy "trainer manages own plan_history" on public.plan_history
  using (exists (select 1 from public.clientes c where c.id = plan_history."clientId" and c."trainerId" = (select auth.uid())))
  with check (exists (select 1 from public.clientes c where c.id = plan_history."clientId" and c."trainerId" = (select auth.uid())));

alter policy "trainer manages own weekly_reviews" on public.weekly_reviews
  using (exists (select 1 from public.clientes c where c.id = weekly_reviews."clientId" and c."trainerId" = (select auth.uid())))
  with check (exists (select 1 from public.clientes c where c.id = weekly_reviews."clientId" and c."trainerId" = (select auth.uid())));

create index if not exists idx_fv_profile_trials_trainer_id on public.fv_profile_trials (trainer_id);
create index if not exists idx_leads_referred_by_client_id on public.leads (referred_by_client_id);
