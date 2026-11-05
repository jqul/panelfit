-- Asistencia en la agenda (2026-11-05).
--
-- Pasar lista: el entrenador marca si el cliente vino o no.
--   - Citas: además de 'completada' (vino), el estado 'ausente' (no vino sin avisar). Un bono descuenta igual la sesión
--     (lib/bonos cuenta toda cita no cancelada), como en la mayoría de centros. El cliente sigue pudiendo solo cancelar
--     (la política client_cancels_own_citas pide status = 'cancelada').
--   - Clases de grupo: clase_plazas.asistio (null = sin pasar lista, true vino, false no vino). Lo cambia el entrenador
--     con la política de siempre de clase_plazas; el cliente solo lee sus plazas.
-- Con eso salen las cifras del mes (asistencia, cancelaciones, ausencias, ocupación), que se calculan en el panel
-- (lib/cifrasAgenda).
-- Prueba: hardening/tests/bloque37_asistencia.sql (run-pglite-asistencia.mjs).

alter table public.citas drop constraint if exists citas_status_check;
alter table public.citas add constraint citas_status_check check (status = any (array['pendiente', 'confirmada', 'cancelada', 'completada', 'ausente']));

alter table public.clase_plazas add column if not exists asistio boolean;
