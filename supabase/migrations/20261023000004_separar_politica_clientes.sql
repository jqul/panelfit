-- Bloque 3 de hardening (2026-10-23): un cliente ya no puede borrar ni editar su propia fila de
-- `clientes`; solo la lee. El entrenador y su equipo conservan todo.

drop policy if exists trainer_or_client_owns_clientes on public.clientes;

create policy trainer_owns_clientes on public.clientes for all
  using ("trainerId" = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"))
  with check ("trainerId" = (select auth.uid()) or is_super_admin() or is_team_member_of("trainerId"));

create policy client_reads_own_cliente on public.clientes for select to authenticated
  using (auth_user_id = (select auth.uid()));
