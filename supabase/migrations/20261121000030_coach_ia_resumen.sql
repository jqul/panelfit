-- Coach IA beta: el resumen que lee la app del entrenador (2026-11-21). Alimenta «Decisión de hoy» y el bloque «Coach IA» del detalle de la solicitud.
--
-- La app no puede leer `coach_ia_habilitados` (sin permisos, a propósito) ni debe bajar al navegador las respuestas de salud solo para calcular
-- si un caso es apto: la elegibilidad vive en la base de datos (`coach_ia_motivo_revision`). Esta función devuelve, SOLO para el entrenador que
-- llama (auth.uid()) y SOLO si está habilitado, el estado de sus solicitudes sin convertir: nombre, estado del contacto, estado del borrador y el
-- motivo por el que no es apto (el entrenador sí puede verlo; a quien prepara el borrador solo se le dice «requiere revisión profesional»).
-- Sin respuestas, sin PAR-Q, sin contacto. Si no está habilitado: {activo: false, casos: []}.
-- Un contacto que el entrenador marca como «descartado» (o «convertido») sale del flujo de Coach IA: es la forma de decir «a esta persona la llevo yo
-- a mano». Lo mismo vale para la lista que lee quien prepara el borrador (`coach_ia_casos_pendientes`, que se redefine aquí).
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
     where s.trainer_id = v_uid and s.client_id is null and l.status not in ('convertido', 'descartado')
       -- La retención de la solicitud: 60 días, salvo seguimiento autorizado
       and (s.created_at > now() - interval '60 days' or s.seguimiento_autorizado)
  ), '[]'::jsonb));
end;
$$;
revoke execute on function public.coach_ia_resumen() from public, anon;
grant execute on function public.coach_ia_resumen() to authenticated;

-- La lista de casos que lee quien prepara el borrador: igual que en 20261121000020, sin los contactos descartados o convertidos
create or replace function public.coach_ia_casos_pendientes(p_trainer uuid)
 returns jsonb language sql security definer stable
 set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'lead_id', s.lead_id,
           'nombre', left(split_part(btrim(l.name), ' ', 1), 40),
           'recibido_en', s.created_at,
           'estado', s.borrador_estado,
           'elegible', public.coach_ia_motivo_revision(s) is null,
           'motivo', public.coach_ia_motivo_publico(public.coach_ia_motivo_revision(s))
         ) order by s.created_at), '[]'::jsonb)
    from public.solicitudes_programacion s join public.leads l on l.id = s.lead_id
   where public.coach_ia_habilitado(p_trainer)
     and s.trainer_id = p_trainer and s.client_id is null and l.status not in ('convertido', 'descartado')
     and s.borrador_estado in ('sin_generar', 'descartado') and s.created_at > now() - interval '60 days';
$$;
revoke execute on function public.coach_ia_casos_pendientes(uuid) from public, anon, authenticated;
