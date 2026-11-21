-- Coach IA beta: el resumen que lee la app del entrenador (2026-11-21). Alimenta «Decisión de hoy» y el bloque «Coach IA» del detalle de la solicitud.
--
-- La app no puede leer `coach_ia_habilitados` (sin permisos, a propósito) ni debe bajar al navegador las respuestas de salud solo para calcular
-- si un caso es apto: la elegibilidad vive en la base de datos (`coach_ia_motivo_revision`). Esta función devuelve, SOLO para el entrenador que
-- llama (auth.uid()) y SOLO si está habilitado, el estado de sus solicitudes sin convertir: nombre, estado del contacto, estado del borrador y el
-- motivo por el que no es apto (el entrenador sí puede verlo; a quien prepara el borrador solo se le dice «requiere revisión profesional»).
-- Sin respuestas, sin PAR-Q, sin contacto. Si no está habilitado: {activo: false, casos: []}.
-- Prueba: hardening/tests/bloque44_coach_ia_puente.sql (sección 9).

create or replace function public.coach_ia_resumen()
 returns jsonb language plpgsql stable security definer
 set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.coach_ia_habilitado(v_uid) then
    return jsonb_build_object('activo', false, 'casos', '[]'::jsonb);
  end if;
  return jsonb_build_object('activo', true, 'casos', coalesce((
    select jsonb_agg(jsonb_build_object(
             'lead_id', s.lead_id,
             'nombre', left(btrim(l.name), 80),
             'estado_lead', l.status,
             'recibido_en', s.created_at,
             'estado', s.borrador_estado,
             'motivo', public.coach_ia_motivo_revision(s),
             'borrador_generado_en', s.borrador_generado_en
           ) order by s.created_at)
      from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id
     where s.trainer_id = v_uid and s.client_id is null
       -- La retención de la solicitud: 60 días, salvo seguimiento autorizado
       and (s.created_at > now() - interval '60 days' or s.seguimiento_autorizado)
  ), '[]'::jsonb));
end;
$$;
revoke execute on function public.coach_ia_resumen() from public, anon;
grant execute on function public.coach_ia_resumen() to authenticated;
