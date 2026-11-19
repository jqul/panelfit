import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  ETIQUETA_BORRADOR, filasParq, filasRespuestas, type SolicitudProgramacion,
} from '../../lib/solicitudProgramacion'

// Detalle de una solicitud de programación inicial, solo para el entrenador: respuestas estructuradas, PAR-Q, consentimientos y el
// sitio del borrador. Las respuestas completas y el PAR-Q se quedan aquí (en la solicitud): al convertir en cliente NO se copian a su ficha.
// El borrador no se promete automático: en v1 el hueco está vacío («Sin generar») hasta que lo prepares tú.
export function SolicitudDetalle({ leadId }: { leadId: string }) {
  const [s, setS] = useState<SolicitudProgramacion | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    supabase.from('solicitudes_programacion').select('*').eq('lead_id', leadId).maybeSingle().then(({ data }) => { if (vivo) setS((data as SolicitudProgramacion | null) ?? null) })
    return () => { vivo = false }
  }, [leadId])

  if (s === undefined) return <p className="text-xs text-muted">Cargando solicitud…</p>
  if (s === null) return <p className="text-xs text-muted">No se encontró la solicitud.</p>

  const respuestas = filasRespuestas(s.respuestas)
  const parq = filasParq(s.parq)
  return (
    <div className="space-y-3 text-sm border-t border-border/40 pt-3" role="region" aria-label="Detalle de la solicitud">
      {s.parq_alarma && (
        <p className="flex items-start gap-2 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2 text-xs font-semibold text-warn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          El cuestionario de salud tiene una señal de alarma. No se prepara borrador: necesita tu revisión personal antes de programar.
        </p>
      )}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Consentimiento ({s.consentimiento_version})</h4>
        <p className="text-xs">
          Datos de salud: <strong>{s.consentimiento_salud ? 'sí' : 'no (no se pidieron ni se guardaron respuestas de salud)'}</strong>
          {' · '}Herramienta de apoyo para el borrador: <strong>{s.consentimiento_asistente ? 'sí' : 'no'}</strong>
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Respuestas</h4>
        <dl className="space-y-1.5">
          {respuestas.map(r => (
            <div key={r.pregunta}><dt className="text-[11px] text-muted">{r.pregunta}</dt><dd className="text-sm">{r.respuesta}</dd></div>
          ))}
        </dl>
      </div>
      {parq.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">PAR-Q</h4>
          <ul className="space-y-1">
            {parq.map(f => (
              <li key={f.pregunta} className={`text-xs flex gap-2 ${f.alarma ? 'text-warn font-semibold' : ''}`}>
                <span className="w-6 flex-shrink-0 font-bold">{f.respuesta}</span><span>{f.pregunta}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Borrador de programa (privado)</h4>
        <p className="text-xs">
          Estado: <strong>{ETIQUETA_BORRADOR[s.borrador_estado]}</strong>
          {s.criterios_version ? <> · criterios v{s.criterios_version}</> : null}
        </p>
        {s.borrador_estado === 'sin_generar' && (
          <p className="text-xs text-muted mt-1">
            {s.parq_alarma ? 'No se prepara borrador por la señal de alarma.' : 'Todavía no hay propuesta. La preparas tú con tus criterios (Ajustes → Criterios para programación inicial).'}
          </p>
        )}
        {s.razones && s.razones.length > 0 && (
          <ul className="mt-1 space-y-1 text-xs">{s.razones.map((r, i) => <li key={i}><strong>{r.decision}</strong>: {r.porque}</li>)}</ul>
        )}
        {s.propuesta && <p className="text-xs text-muted mt-1">{Array.isArray(s.propuesta.weeks) ? `${s.propuesta.weeks.length} semana(s) en la propuesta.` : 'Propuesta guardada.'}</p>}
      </div>
      <p className="text-[11px] text-muted">Al convertir en cliente solo pasan su nombre y su contacto. Estas respuestas y el PAR-Q se quedan aquí, solo para ti. Si no llega a ser cliente, se borran a los 60 días, o antes con «Eliminar solicitud».</p>
    </div>
  )
}
