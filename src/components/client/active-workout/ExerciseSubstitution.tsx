import { useState } from 'react'
import { X, Repeat, ExternalLink, CheckCircle2, ChevronLeft } from 'lucide-react'
import { ZONAS_DOLOR } from '../../../lib/clientPain'
import { rankByQuery } from '../../../lib/exerciseSearch'
import { opcionesPorMaterial, decisionPorDolor, type Opcion } from '../../../lib/sustitucion'
import type { AltCandidate } from '../../../lib/exerciseAlternatives'
import type { Exercise, SustitucionMotivo } from '../../../types'

interface Props {
  exercise: Exercise
  /** Lo que hizo en vez del ejercicio prescrito, si ya lo cambió. */
  substitutionName?: string
  library: AltCandidate[]
  libraryMap?: Map<string, string>
  /** Zona que probablemente le duele con este ejercicio: solo preselecciona el chip. */
  zonaSugerida?: string | null
  /** Ya le ha preguntado a su entrenador por este ejercicio. */
  asked: boolean
  onSubstitute: (opcion: Opcion, reason: SustitucionMotivo, extra?: { zona: string; intensidad: number }) => void
  onRevert: () => void
  /** Registra la molestia y avisa al entrenador, sin cambiar de ejercicio. */
  onPain: (zona: string, intensidad: number) => void
  onAsk: () => void
}

type Paso = 'cerrado' | 'motivo' | 'material' | 'molesta' | 'entender'

const MOTIVOS: { id: Exclude<Paso, 'cerrado' | 'motivo'>; emoji: string; label: string }[] = [
  { id: 'material', emoji: '🏋️', label: 'Material ocupado' },
  { id: 'molesta', emoji: '🤕', label: 'Me molesta' },
  { id: 'entender', emoji: '🤔', label: 'No lo entiendo' },
]

// "¿No puedes hacerlo?" — en vez de abrirle la biblioteca entera, el cliente dice por qué no puede y la app le
// propone lo que de verdad le sirve: las alternativas que su entrenador dejó aprobadas para ESTE ejercicio, ayuda
// con la técnica, o —si le duele— parar y avisar en vez de forzar. La búsqueda libre queda al final del todo.
export function ExerciseSubstitution({
  exercise, substitutionName, library, libraryMap, zonaSugerida, asked, onSubstitute, onRevert, onPain, onAsk,
}: Props) {
  const [paso, setPaso] = useState<Paso>('cerrado')
  const [libre, setLibre] = useState(false)
  const [draft, setDraft] = useState('')
  const [zona, setZona] = useState<string | null>(null)
  const [intensidad, setIntensidad] = useState<number | null>(null)
  const [avisado, setAvisado] = useState(false)

  const cerrar = () => { setPaso('cerrado'); setLibre(false); setDraft(''); setZona(null); setIntensidad(null); setAvisado(false) }
  const abrir = () => { setZona(zonaSugerida ?? null); setPaso('motivo') }
  const elegir = (o: Opcion, reason: SustitucionMotivo, extra?: { zona: string; intensidad: number }) => { onSubstitute(o, reason, extra); cerrar() }

  const sugerencias = draft.trim().length >= 2 ? rankByQuery(library, draft).slice(0, 6) : []
  const videos = [exercise.videoUrl, ...(exercise.videoUrls ?? [])].filter((v): v is string => !!v)

  const decision = paso === 'molesta' && zona && intensidad !== null ? decisionPorDolor(exercise, zona, intensidad, library, libraryMap) : null

  const botonOpcion = (o: Opcion, reason: SustitucionMotivo, extra?: { zona: string; intensidad: number }) => (
    <button key={o.name} onClick={() => elegir(o, reason, extra)}
      className="w-full flex items-center gap-2 px-3 py-3 bg-card border border-border rounded-xl text-left text-sm font-semibold hover:border-ok hover:bg-ok/5 transition-colors">
      <Repeat className="w-4 h-4 text-ok flex-shrink-0" />
      <span className="flex-1 min-w-0 truncate">{o.name}</span>
      {o.origen === 'plan-b' && <span className="text-[11px] font-bold text-ok flex-shrink-0">de tu entrenador</span>}
    </button>
  )

  // Ya lo cambió: lo que hizo y la salida para deshacerlo.
  if (paso === 'cerrado' && substitutionName) {
    return (
      <div className="px-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button onClick={abrir} className="flex items-center gap-1.5 text-xs font-semibold text-warn hover:underline">
          <Repeat className="w-3.5 h-3.5" /> Cambiar de nuevo
        </button>
        <button onClick={onRevert} className="text-xs font-semibold text-muted hover:text-accent">Volver a «{exercise.name}»</button>
      </div>
    )
  }

  if (paso === 'cerrado') {
    return (
      <div className="px-4 mb-3">
        <button onClick={abrir} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent">
          <Repeat className="w-3.5 h-3.5" /> ¿No puedes hacerlo?
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 mb-3">
      <div role="group" aria-label="¿No puedes hacerlo?" className="border border-warn/30 bg-warn/5 rounded-2xl p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {paso !== 'motivo' && (
              <button onClick={() => { setPaso('motivo'); setLibre(false); setAvisado(false) }} aria-label="Volver" className="p-1 -ml-1 text-muted"><ChevronLeft className="w-4 h-4" /></button>
            )}
            <p className="text-sm font-semibold truncate">{paso === 'motivo' ? '¿No puedes hacerlo?' : MOTIVOS.find(m => m.id === paso)!.label}</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="p-1 -m-1 text-muted"><X className="w-4 h-4" /></button>
        </div>

        {paso === 'motivo' && (
          <div className="grid grid-cols-3 gap-2">
            {MOTIVOS.map(m => (
              <button key={m.id} onClick={() => setPaso(m.id)}
                className="flex flex-col items-center gap-1 px-2 py-3 bg-card border border-border rounded-xl text-xs font-semibold text-center hover:border-warn hover:bg-warn/5 transition-colors">
                <span className="text-lg" aria-hidden="true">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        )}

        {paso === 'material' && !libre && (
          <div className="space-y-2">
            {(() => {
              const opciones = opcionesPorMaterial(exercise, library, libraryMap)
              return opciones.length > 0 ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Alternativas para hoy</p>
                  {opciones.map(o => botonOpcion(o, 'material'))}
                </>
              ) : <p className="text-xs text-muted">No hay una alternativa clara en tu lista.</p>
            })()}
            <button onClick={() => setLibre(true)} className="w-full text-center py-1.5 text-xs font-semibold text-muted hover:text-accent">
              No encuentro una alternativa
            </button>
          </div>
        )}

        {paso === 'material' && libre && (
          <div className="space-y-2">
            <p className="text-xs text-muted">Busca el ejercicio que has hecho. Tu entrenador lo revisará.</p>
            <div className="relative">
              <div className="flex items-center gap-2">
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder="Busca el ejercicio que has hecho..." aria-label="Buscar ejercicio sustituto"
                  onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) elegir({ name: draft.trim(), origen: 'libre' }, 'material') }}
                  className="flex-1 px-3 py-2 bg-card border border-warn/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-warn/20" />
                <button onClick={() => draft.trim() && elegir({ name: draft.trim(), origen: 'libre' }, 'material')} disabled={!draft.trim()}
                  title="Usar tal cual lo has escrito, si no está en la lista" aria-label="Usar lo escrito"
                  className="p-2 bg-warn text-white rounded-xl flex-shrink-0 disabled:opacity-40"><CheckCircle2 className="w-4 h-4" /></button>
              </div>
              {sugerencias.length > 0 && (
                <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden">
                  {sugerencias.map(s => (
                    <button key={s.id} onClick={() => elegir({ name: s.name, exerciseId: s.id, origen: 'libre' }, 'material')}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-bg-alt transition-colors">
                      <span className="flex-1 truncate">{s.name}</span>
                      {s.category && <span className="text-[11px] text-muted flex-shrink-0">{s.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {paso === 'molesta' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">¿Dónde?</p>
              <div className="flex flex-wrap gap-1.5">
                {ZONAS_DOLOR.filter(z => z !== 'Otro').map(z => (
                  <button key={z} onClick={() => setZona(z)} aria-pressed={zona === z}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${zona === z ? 'bg-warn text-white border-warn' : 'border-border hover:border-warn hover:bg-warn/5'}`}>{z}</button>
                ))}
              </div>
            </div>
            {zona && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">¿Cuánto? (1 apenas · 10 insoportable)</p>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setIntensidad(n)} aria-pressed={intensidad === n} aria-label={`Intensidad ${n} de 10`}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${intensidad === n ? 'bg-warn text-white border-warn' : 'border-border hover:border-warn'}`}>{n}</button>
                  ))}
                </div>
              </div>
            )}
            {decision && zona && intensidad !== null && (
              <div className="space-y-2 pt-2 border-t border-warn/20">
                {decision.accion === 'parar' && (
                  <p className="text-sm font-semibold text-warn">Para este ejercicio. Con una molestia de {intensidad}/10 no se trabaja: descansa esa zona y avisa a tu entrenador.</p>
                )}
                {decision.accion === 'avisar' && (
                  <p className="text-sm">Tu entrenador prefiere que no cambies este ejercicio por tu cuenta cuando algo te molesta. Avísale y él decide.</p>
                )}
                {decision.accion === 'proponer' && (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Alternativas seguras para hoy</p>
                    {decision.opciones.map(o => botonOpcion(o, 'dolor', { zona, intensidad }))}
                  </>
                )}
                <button onClick={() => { onPain(zona, intensidad); setAvisado(true) }} disabled={avisado}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl border border-warn/40 text-warn hover:bg-warn/5 disabled:opacity-60">
                  {avisado ? 'Avisado ✓' : decision.accion === 'proponer' ? 'Solo avisar a mi entrenador' : 'Avisar a mi entrenador'}
                </button>
              </div>
            )}
          </div>
        )}

        {paso === 'entender' && (
          <div className="space-y-2.5">
            {exercise.comment
              ? <p className="text-sm leading-relaxed bg-card border border-border rounded-xl p-3">«{exercise.comment}»</p>
              : <p className="text-xs text-muted">Tu entrenador no ha dejado indicaciones escritas para este ejercicio.</p>}
            {videos.map((v, i) => (
              <a key={v} href={v} target="_blank" rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-3 bg-card border border-border rounded-xl text-sm font-semibold hover:border-accent">
                <ExternalLink className="w-4 h-4 text-accent flex-shrink-0" /> Ver el vídeo{videos.length > 1 ? ` ${i + 1}` : ''}
              </a>
            ))}
            <button onClick={() => { onAsk(); setAvisado(true) }} disabled={asked || avisado}
              className="w-full py-3 text-sm font-semibold rounded-xl bg-ink text-white disabled:opacity-60">
              {asked || avisado ? 'Preguntado ✓ Tu entrenador lo verá hoy' : 'Preguntar a mi entrenador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
