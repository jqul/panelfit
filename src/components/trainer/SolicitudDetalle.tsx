import { useEffect, useState } from 'react'
import { toast } from '../shared/Toast'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCoachIa } from '../../hooks/useCoachIa'
import {
  ETIQUETA_BORRADOR, POLITICA_RETENCION, filasParq, filasRespuestas, type SolicitudProgramacion,
} from '../../lib/solicitudProgramacion'
import { TEXTO_MOTIVO, estadoCasoIa, resumenPropuesta, textoDatosEntregados, totalEjercicios } from '../../lib/coachIa'

// Detalle de una solicitud de programación inicial, solo para el entrenador: respuestas estructuradas, PAR-Q, consentimientos y el
// borrador de programa. Las respuestas completas y el PAR-Q se quedan aquí (en la solicitud): al convertir en cliente NO se copian a su ficha.
// El borrador no se promete automático: lo prepara Claude cuando TÚ lo lanzas (Coach IA beta, lib/coachIa), solo si el caso es apto, y
// aquí lo lees y lo apruebas o lo descartas. Nada llega a un plan sin que lo actives tú.

const dia = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '')

/** El estado del caso de Coach IA y, si hay borrador, la propuesta con sus razones y los botones para decidir. */
function CasoCoachIa({ s, leadId, onCambio }: { s: SolicitudProgramacion; leadId: string; onCambio: (s: SolicitudProgramacion) => void }) {
  const [enviando, setEnviando] = useState(false)
  const estado = estadoCasoIa(s)
  const semanas = resumenPropuesta(s.propuesta)
  const hayBorrador = estado.tipo === 'borrador_listo' || estado.tipo === 'aprobado'

  const decidir = async (decision: 'aprobar' | 'descartar') => {
    setEnviando(true)
    const { error } = await supabase.rpc('decidir_borrador_solicitud', { p_lead_id: leadId, p_decision: decision })
    setEnviando(false)
    if (error) { toast('No se pudo guardar tu decisión', 'warn'); return }
    const ahora = new Date().toISOString()
    onCambio(decision === 'aprobar'
      ? { ...s, borrador_estado: 'aprobado', borrador_decidido_en: ahora }
      : { ...s, borrador_estado: 'descartado', propuesta: null, razones: null, borrador_decidido_en: ahora })
    toast(decision === 'aprobar' ? 'Borrador aprobado' : 'Borrador descartado', 'ok')
  }

  return (
    <div role="group" aria-label="Coach IA: borrador de programa">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Borrador de programa (Coach IA, privado)</h4>
      <p className="text-xs">
        Estado: <strong>{ETIQUETA_BORRADOR[s.borrador_estado]}</strong>
        {s.criterios_version ? <> · criterios v{s.criterios_version}</> : null}
        {s.borrador_generado_en ? <> · preparado el {dia(s.borrador_generado_en)}</> : null}
      </p>

      {estado.tipo === 'requiere_revision' && (
        <p className="mt-1 flex items-start gap-2 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2 text-xs font-semibold text-warn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Plan no generado: requiere revisión profesional. Motivo: {TEXTO_MOTIVO[estado.motivo]}.</span>
        </p>
      )}
      {estado.tipo === 'sin_caso' && <p className="text-xs text-muted mt-1">No se prepara borrador: {TEXTO_MOTIVO[estado.motivo]}.</p>}
      {(estado.tipo === 'listo_para_preparar' || estado.tipo === 'descartado') && (
        <p className="text-xs text-muted mt-1">
          {estado.tipo === 'descartado' ? 'Borrador descartado. ' : ''}Caso apto para preparar: abre Claude y lanza la tarea de Coach IA para este caso.
          Solo lee su nombre de pila, sus respuestas que no son de salud (objetivo, experiencia, tiempo, material, rutina actual…) y tus criterios (Ajustes → Criterios para programación inicial);
          ninguna respuesta de salud ni el cuestionario de salud. Los textos libres los escribe la persona: si ahí cuenta algo de salud, no se prepara el borrador y lo ves tú.
        </p>
      )}

      {hayBorrador && (
        <div className="mt-2 space-y-2">
          {s.razones && s.razones.length > 0 && (
            <ul className="space-y-1 text-xs">{s.razones.map((r, i) => <li key={i}><strong>{r.decision}</strong>: {r.porque}</li>)}</ul>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold">Ver la propuesta ({semanas.length} {semanas.length === 1 ? 'semana' : 'semanas'}, {totalEjercicios(semanas)} ejercicios)</summary>
            <div className="mt-1 space-y-2">
              {semanas.map((w, i) => (
                <div key={i}>
                  <p className="font-bold">{w.etiqueta}</p>
                  {w.dias.map((d, j) => (
                    <div key={j} className="ml-2">
                      <p className="font-semibold text-muted">{d.titulo}</p>
                      <ul className="ml-2 list-disc list-inside">
                        {d.ejercicios.map((e, k) => (
                          <li key={k}>{e.nombre} · {e.series}{e.peso ? ` · ${e.peso}` : ''}{e.rir ? ` · RIR ${e.rir}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>
          {s.ia_campos && s.ia_campos.length > 0 && (
            <p className="text-[11px] text-muted">Datos entregados al prepararlo: {textoDatosEntregados(s.ia_campos)}. Ninguna respuesta de salud (ni molestias, peso, altura, edad, sueño o estrés, ni lo que quiere evitar).</p>
          )}
          {typeof s.respuestas?.rechaza === 'string' && s.respuestas.rechaza.trim() !== '' && (
            <p className="text-xs rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">
              <strong>Revisa la propuesta contra esto, que quien la preparó no ha visto</strong> (lo que la persona dice que prefiere evitar): {s.respuestas.rechaza}
            </p>
          )}
          {estado.tipo === 'borrador_listo' ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void decidir('aprobar')} disabled={enviando} className="px-3 py-2 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-50">Aprobar borrador</button>
              <button onClick={() => void decidir('descartar')} disabled={enviando} className="px-3 py-2 rounded-xl border border-border text-xs font-semibold text-warn hover:bg-bg-alt disabled:opacity-50">Descartar borrador</button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs">Aprobado{s.borrador_decidido_en ? ` el ${dia(s.borrador_decidido_en)}` : ''}. Al convertir la solicitud en cliente quedará como borrador de su plan; lo activas tú.</p>
              <button onClick={() => void decidir('descartar')} disabled={enviando} className="px-3 py-2 rounded-xl border border-border text-xs font-semibold text-warn hover:bg-bg-alt disabled:opacity-50">Descartar borrador</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SolicitudDetalle({ leadId }: { leadId: string }) {
  const [s, setS] = useState<SolicitudProgramacion | null | undefined>(undefined)
  // Coach IA beta solo se enseña a las cuentas que lo tienen habilitado (lo decide la base de datos)
  const coachIa = useCoachIa()

  useEffect(() => {
    let vivo = true
    supabase.from('solicitudes_programacion').select('*').eq('lead_id', leadId).maybeSingle().then(({ data }) => { if (vivo) setS((data as SolicitudProgramacion | null) ?? null) })
    return () => { vivo = false }
  }, [leadId])

  // Conservar una solicitud no convertida más allá de la purga es una decisión explícita del entrenador (y se puede quitar)
  const autorizar = async (valor: boolean) => {
    if (!s) return
    setS({ ...s, seguimiento_autorizado: valor })
    const { error } = await supabase.rpc('autorizar_seguimiento_solicitud', { p_lead_id: leadId, p_autorizado: valor })
    if (error) { setS(s); toast('No se pudo cambiar el seguimiento', 'warn') }
  }

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
      {coachIa.activo && <CasoCoachIa s={s} leadId={leadId} onCambio={setS} />}
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={s.seguimiento_autorizado} disabled={!!s.client_id} onChange={e => void autorizar(e.target.checked)} className="mt-0.5" />
        <span><strong>Seguimiento autorizado</strong>: conservarla más de 60 días aunque no llegue a ser cliente (también si está a revisar). Sin marcar, se elimina sola.</span>
      </label>
      <p className="text-[11px] text-muted">Al convertir en cliente solo pasan su nombre y su contacto. Estas respuestas y el PAR-Q se quedan aquí, solo para ti. {POLITICA_RETENCION} Puedes eliminarla antes con «Eliminar solicitud».</p>
    </div>
  )
}
