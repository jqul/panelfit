-- BASELINE (producción, 2026-10-18): políticas RLS del esquema public.
-- Se reproducen TAL CUAL están desplegadas, incluidos sus defectos conocidos
-- (ver supabase/README.md y supabase/hardening/). No se corrige nada aquí.
-- Sin cláusula TO = rol PUBLIC (incluye anon; auth.uid() es NULL para anon).

-- ── entrenadores / clientes / equipo ─────────────────────
create policy trainer_owns_entrenadores on public.entrenadores for all
  using (uid = (select auth.uid()) or is_client_of_trainer(uid) or is_super_admin() or is_teammate_of(uid))
  with check (uid = (select auth.uid()) or is_super_admin());

create policy trainer_or_client_owns_clientes on public.clientes for all
  using ("trainerId" = (select auth.uid()) or auth_user_id = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"))
  with check ("trainerId" = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"));

create policy member_reads_own_membership on public.team_members for select
  using (member_uid = (select auth.uid()));
create policy owner_manages_team_members on public.team_members for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ── Tablas de cliente con clientId uuid ──────────────────
create policy trainer_or_client_owns_checkins on public.checkins for all
  using (exists (select 1 from clientes c where c.id = checkins."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = checkins."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_habitos on public.habitos for all
  using (exists (select 1 from clientes c where c.id = habitos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = habitos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_progress_photos on public.progress_photos for all
  using (exists (select 1 from clientes c where c.id = progress_photos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = progress_photos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_readiness_checkins on public.readiness_checkins for all
  using (exists (select 1 from clientes c where c.id = readiness_checkins."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = readiness_checkins."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_registros_habitos on public.registros_habitos for all
  using (exists (select 1 from clientes c where c.id = registros_habitos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = registros_habitos."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_registros_peso on public.registros_peso for all
  using (exists (select 1 from clientes c where c.id = registros_peso."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = registros_peso."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_session_reactions on public.session_reactions for all
  using (exists (select 1 from clientes c where c.id = session_reactions."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = session_reactions."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_waivers on public.waivers for all
  using (exists (select 1 from clientes c where c.id = waivers."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = waivers."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_session_load on public.session_load for all
  using (exists (select 1 from clientes c where c.id = session_load.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = session_load.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_fv_profile_trials on public.fv_profile_trials for all
  using (exists (select 1 from clientes c where c.id = fv_profile_trials.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = fv_profile_trials.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_encuestas on public.encuestas for all
  using (exists (select 1 from clientes c where c.id = encuestas.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = encuestas.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_fotos on public.fotos for all
  using (exists (select 1 from clientes c where c.id = fotos.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id = fotos.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

-- plan y registros: entrenador, cliente y equipo del entrenador.
create policy trainer_or_client_owns_planes on public.planes for all
  using (exists (select 1 from clientes c where c.id = planes."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()) or is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from clientes c where c.id = planes."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()) or is_team_member_of(c."trainerId"))));

create policy trainer_or_client_owns_registros on public.registros for all
  using (exists (select 1 from clientes c where c.id = registros."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()) or is_team_member_of(c."trainerId"))))
  with check (exists (select 1 from clientes c where c.id = registros."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()) or is_team_member_of(c."trainerId"))));

-- Solo entrenador (sin acceso del cliente). Usan auth.uid() sin envolver en select.
create policy "trainer manages own plan_history" on public.plan_history for all
  using (exists (select 1 from clientes c where c.id = plan_history."clientId" and c."trainerId" = auth.uid()))
  with check (exists (select 1 from clientes c where c.id = plan_history."clientId" and c."trainerId" = auth.uid()));

create policy "trainer manages own weekly_reviews" on public.weekly_reviews for all
  using (exists (select 1 from clientes c where c.id = weekly_reviews."clientId" and c."trainerId" = auth.uid()))
  with check (exists (select 1 from clientes c where c.id = weekly_reviews."clientId" and c."trainerId" = auth.uid()));

-- ── Tablas de cliente con id en text (comparan con ::text) ─
create policy trainer_or_client_owns_dietas on public.dietas for all
  using (exists (select 1 from clientes c where c.id::text = dietas.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id::text = dietas.cliente_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_foto_sessions on public.foto_sessions for all
  using (exists (select 1 from clientes c where c.id::text = foto_sessions.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id::text = foto_sessions.client_id and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

create policy trainer_or_client_owns_registros_dolor on public.registros_dolor for all to authenticated
  using (exists (select 1 from clientes c where c.id::text = registros_dolor."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))
  with check (exists (select 1 from clientes c where c.id::text = registros_dolor."clientId" and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))));

-- ── Tablas con trainer_id text + acceso del cliente ──────
create policy trainer_or_client_owns_ciclo_tracking on public.ciclo_tracking for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = ciclo_tracking.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = ciclo_tracking.client_id and c.auth_user_id = (select auth.uid())));

create policy trainer_or_client_owns_notificaciones on public.notificaciones for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = notificaciones.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = notificaciones.client_id and c.auth_user_id = (select auth.uid())));

create policy trainer_or_client_owns_survey_responses on public.survey_responses for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = survey_responses.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = survey_responses.client_id and c.auth_user_id = (select auth.uid())));

create policy trainer_or_client_owns_test_resultados on public.test_resultados for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = test_resultados.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = test_resultados.client_id and c.auth_user_id = (select auth.uid())));

create policy trainer_or_client_owns_valoraciones on public.valoraciones for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = valoraciones.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = valoraciones.client_id and c.auth_user_id = (select auth.uid())));

create policy trainer_or_client_owns_video_feedback on public.video_feedback for all
  using (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = video_feedback.client_id and c.auth_user_id = (select auth.uid())))
  with check (trainer_id = (select auth.uid())::text or exists (select 1 from clientes c where c.id::text = video_feedback.client_id and c.auth_user_id = (select auth.uid())));

-- ── Citas ────────────────────────────────────────────────
create policy trainer_owns_citas on public.citas for all
  using (trainer_id = (select auth.uid()) or is_super_admin() or is_team_member_of(trainer_id))
  with check (trainer_id = (select auth.uid()) or is_super_admin() or is_team_member_of(trainer_id));
create policy client_views_own_citas on public.citas for select
  using (exists (select 1 from clientes c where c.id = citas.client_id and c.auth_user_id = (select auth.uid())));
create policy client_requests_own_cita on public.citas for insert
  with check (status = 'pendiente' and exists (select 1 from clientes c where c.id = citas.client_id and c."trainerId" = citas.trainer_id and c.auth_user_id = (select auth.uid())));
create policy client_cancels_own_citas on public.citas for update
  using (exists (select 1 from clientes c where c.id = citas.client_id and c.auth_user_id = (select auth.uid())))
  with check (exists (select 1 from clientes c where c.id = citas.client_id and c.auth_user_id = (select auth.uid())) and status = 'cancelada');

-- ── Solo entrenador (trainer_id text o uuid) ─────────────
create policy trainer_owns_cohortes on public.cohortes for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy trainer_owns_cohorte_clientes on public.cohorte_clientes for all
  using (exists (select 1 from cohortes c where c.id = cohorte_clientes.cohorte_id and c.trainer_id = (select auth.uid())::text))
  with check (exists (select 1 from cohortes c where c.id = cohorte_clientes.cohorte_id and c.trainer_id = (select auth.uid())::text));
create policy trainer_owns_conditioning_blocks on public.conditioning_blocks for all
  using (trainer_id = (select auth.uid()) or is_team_member_of(trainer_id))
  with check (trainer_id = (select auth.uid()) or is_team_member_of(trainer_id));
create policy trainer_owns_encuestas_biblioteca on public.encuestas_biblioteca for all
  using ("trainerId" = (select auth.uid())) with check ("trainerId" = (select auth.uid()));
create policy trainer_owns_exercise_library on public.exercise_library for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy client_reads_trainer_exercise_library on public.exercise_library for select to authenticated
  using (exists (select 1 from clientes c where c."trainerId"::text = exercise_library.trainer_id and c.auth_user_id = (select auth.uid())));
create policy trainer_owns_exercise_usage_events on public.exercise_usage_events for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy trainer_owns_labels on public.labels for all
  using (trainer_id = (select auth.uid())::text or is_team_member_of(trainer_id::uuid))
  with check (trainer_id = (select auth.uid())::text or is_team_member_of(trainer_id::uuid));
create policy trainer_owns_leads on public.leads for all
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy trainer_owns_plan_templates on public.plan_templates for all
  using (trainer_id = (select auth.uid())::text or is_team_member_of(trainer_id::uuid))
  with check (trainer_id = (select auth.uid())::text or is_team_member_of(trainer_id::uuid));
create policy anyone_reads_public_plan_templates on public.plan_templates for select
  using (is_public = true);
create policy trainer_owns_plantillas_mensajes on public.plantillas_mensajes for all
  using ("trainerId" = (select auth.uid())) with check ("trainerId" = (select auth.uid()));
create policy client_reads_own_trainer_plantillas_mensajes on public.plantillas_mensajes for select
  using (is_client_of_trainer("trainerId"));
create policy trainer_owns_programacion_mensajes on public.programacion_mensajes for all
  using ("trainerId" = (select auth.uid())) with check ("trainerId" = (select auth.uid()));
create policy trainer_owns_programs on public.programs for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy trainer_owns_survey_schedules on public.survey_schedules for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy trainer_owns_survey_templates on public.survey_templates for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy trainer_owns_test_catalogo on public.test_catalogo for all
  using (trainer_id = (select auth.uid())::text) with check (trainer_id = (select auth.uid())::text);
create policy client_can_read_own_trainer_test_catalogo on public.test_catalogo for select
  using (exists (select 1 from clientes c where c."trainerId"::text = test_catalogo.trainer_id and c.auth_user_id = (select auth.uid())));

-- ── Notificaciones push ──────────────────────────────────
create policy trainer_manages_own_push_subscriptions on public.push_subscriptions for all
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy client_manages_own_push_subscriptions on public.push_subscriptions for all
  using (exists (select 1 from clientes c where c.id = push_subscriptions.client_id and c.auth_user_id = (select auth.uid())))
  with check (exists (select 1 from clientes c where c.id = push_subscriptions.client_id and c.auth_user_id = (select auth.uid())));

-- internal_webhook_secrets: RLS activado y SIN políticas (denegado a todos los roles de la API).
