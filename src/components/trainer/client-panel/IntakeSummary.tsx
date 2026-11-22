import { useState, useEffect } from 'react'
import { ClipboardList, AlertTriangle, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { DEMO_INTAKE_MAP } from '../../../lib/demo-data-extra'
import { TEXTO_NIVEL_PARQ, resumenParq } from '../../../lib/intakeQuestions'
import { estadoParq, respuestasDeRevision, type EstadoParq, type FilaAdmision } from '../../../lib/retencionParq'
import { toast } from '../../shared/Toast'

interface CheckinRespuesta { pregunta: string; respuesta: string }

// La ficha va plegada para no alargar el Resumen, pero su cabecera dice SIEMPRE lo que importa del PAR-Q
// (lib/intakeQuestions → resumenParq): un «Sí» relevante no se esconde tras un título neutro.
export function IntakeSummary({ clientId }: { clientId: string }) {
  const [respuestas, setRespuestas] = useState<CheckinRespuesta[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState(false)
  // Si el entrenador ya revisó ESTA ficha (lib/retencionParq): una fila de checkins con tipo 'parq_revisado' que lleva la huella de su contenido
  const [filas, setFilas] = useState<FilaAdmision[]>([])
  const esDemo = clientId.startsWith('demo-client-')

  // select('*'): si la columna `huella` aún no existe (migración sin aplicar) la lectura no falla y la ficha cuenta como sin revisar
  const cargar = async (primera: boolean) => {
    const { data } = await supabase.from('checkins').select('*').eq('clientId', clientId).in('tipo', ['intake', 'parq_revisado'])
      .order('createdAt', { ascending: false }).limit(10)
    const rows = (data || []) as FilaAdmision[]
    setFilas(rows)
    setRespuestas(rows.find(r => r.tipo === 'intake')?.respuestas || null)
    // Con algo sin revisar, la ficha se enseña abierta
    if (primera && estadoParq(rows).pendienteDeRevisar) setAbierta(true)
    setLoading(false)
    return rows
  }
  useEffect(() => {
    if (esDemo) { setRespuestas(DEMO_INTAKE_MAP[clientId] || null); setLoading(false); return }
    void cargar(true)
  }, [clientId, esDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // La revisión se ata a la versión EXACTA que se tiene delante: solo se manda el id de la ficha; la huella (SHA-256 del contenido) y el resto de la fila los escribe el servidor.
  // Si el cliente cambia sus respuestas después, la huella de la ficha cambia y esta revisión deja de valer. Solo el entrenador del cliente puede escribirla (trigger de la base de
  // datos). Después se vuelve a leer del servidor: lo que cuenta es lo que ESTE guardó, no lo que se mandó.
  const marcarRevisado = async (admisionId: string) => {
    const { error } = await supabase.from('checkins').insert({ id: crypto.randomUUID(), clientId, respuestas: respuestasDeRevision(admisionId), tipo: 'parq_revisado', createdAt: Date.now() })
    if (error) { toast('No se pudo marcar como revisado. Inténtalo de nuevo.', 'warn'); return }
    const rows = await cargar(false)
    if (estadoParq(rows).revisado) toast('Cuestionario de salud revisado', 'ok')
    else toast('Se guardó, pero la ficha cambió mientras la leías: vuelve a leerla.', 'warn')
  }

  if (loading || !respuestas?.length) return null

  const parq = resumenParq(respuestas)
  const estado: EstadoParq | null = esDemo ? null : estadoParq(filas)

  return (
    <div id="ficha-admision" className={`bg-card border rounded-2xl overflow-hidden scroll-mt-4 ${parq.atencion ? 'border-warn/40' : 'border-border'}`} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <button type="button" onClick={() => setAbierta(a => !a)} aria-expanded={abierta} aria-controls="ficha-admision-detalle"
        className={`w-full px-5 py-3 flex items-center gap-2 text-left ${parq.atencion ? 'bg-warn/10' : 'bg-bg-alt/30'}`}>
        <ClipboardList className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden />
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Ficha de admisión</span>
        <span className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${parq.atencion ? 'text-warn' : 'text-muted'}`}>
          {parq.atencion && <AlertTriangle className="w-3.5 h-3.5" aria-hidden />}
          {parq.texto}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {abierta && (
        <div id="ficha-admision-detalle" className="p-4 space-y-2 border-t border-border/50">
          {parq.atencion && (
            <div className="flex items-start gap-2 bg-warn/10 border border-warn/20 rounded-xl px-3 py-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warn font-medium">Revisa estas respuestas antes de programar esfuerzo alto; si hay síntomas cardíacos o de mareo, que lo valore antes un profesional sanitario.</p>
            </div>
          )}
          {estado && estado.nivel !== 'ninguno' && (
            <div role="group" aria-label="Revisión del cuestionario de salud" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 mb-2">
              <p className="text-xs flex-1 min-w-[12rem]">
                <span className="font-semibold">{TEXTO_NIVEL_PARQ[estado.nivel]}.</span>
                {estado.retenido && ' Su cuestionario de programación está en espera hasta que lo marques como revisado.'}
                <span className="block text-muted mt-0.5">Revisado significa que has leído estas respuestas; no certifica que pueda hacer cualquier entrenamiento. Si las cambia, tendrás que revisarlas otra vez.</span>
              </p>
              {estado.revisado
                ? <p className="text-xs font-semibold text-ok">Revisado el {new Date(estado.revisadoEn as number).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                : <button type="button" disabled={!estado.admisionId} onClick={() => void marcarRevisado(estado.admisionId as string)} className="px-3 py-1.5 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-50">Marcar como revisado</button>}
            </div>
          )}
          {respuestas.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm py-1">
              <p className="text-muted flex-1">{r.pregunta}</p>
              <p className={`font-semibold flex-shrink-0 ${r.respuesta === 'Sí' ? 'text-warn' : ''}`}>{r.respuesta}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
