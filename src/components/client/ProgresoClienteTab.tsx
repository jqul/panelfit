import { useState, useEffect, useMemo, useRef } from 'react'
import { Scale, Camera, Trophy, Plus, Trash2, ChevronDown, ChevronUp, Dumbbell, Video, Clock, Upload, Loader2, HeartPulse } from 'lucide-react'
import { TrainingPlan, TrainingLogs, LogSet } from '../../types'
import { supabase } from '../../lib/supabase'
import { DEMO_VIDEO_FEEDBACK_MAP } from '../../lib/demo-data'
import { compressVideo } from '../../lib/videoCompress'
import { useClientWeights } from '../../lib/clientWeight'
import { useClientPain, ZONAS_DOLOR } from '../../lib/clientPain'
import { Section, SECTIONS, CLIENT_SHAREABLE_SECTIONS, useTrainerMetricSettings } from '../../lib/progresoSections'
import { FuerzaChart } from '../trainer/progreso-tab/FuerzaChart'
import { CardioChart } from '../trainer/progreso-tab/CardioChart'
import { RMChart } from '../trainer/progreso-tab/RMChart'
import { VolumenChart } from '../trainer/progreso-tab/VolumenCharts'
import { AdherenciaChart } from '../trainer/progreso-tab/AdherenciaChart'
import { RachaStats } from '../trainer/progreso-tab/RachaStats'
import { RiesgoChart } from '../trainer/progreso-tab/RiesgoChart'
import { MonthlyRecap } from '../trainer/progreso-tab/MonthlyRecap'
import { SignedVideo, SignedImage } from '../shared/SignedMedia'
import { collectSessionBests, recordHistory, strengthChange, adherence28, streakDays } from '../../lib/progressSummary'
import { localDateKey } from '../../lib/dates'
import { buildGroups, groupOf, leafForGroup } from '../../lib/progressTabs'


interface Props {
  clientId: string
  trainerId: string
  logs: TrainingLogs
  plan?: TrainingPlan | null
  onOpenCalendar?: () => void   // el calendario vive en la pestaña Entreno
}

interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

// ── Helpers ───────────────────────────────────────────────
function getExerciseName(key: string, plan?: TrainingPlan | null): string {
  const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
  if (!m || !plan) return key
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || key
}

// ── Historial de entrenos ─────────────────────────────────
function HistorialTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const sessions = useMemo(() => {
    const byDate: Record<string, { exercises: { name: string; sets: LogSet[]; best: number }[]; volume: number }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.dateDone || !log.done) return
      if (!byDate[log.dateDone]) byDate[log.dateDone] = { exercises: [], volume: 0 }
      const name = getExerciseName(key, plan)
      const sets = Object.values(log.sets || {})
      const best = Math.max(0, ...sets.map((s: any) => parseFloat(s.weight) || 0))
      const vol = sets.reduce((a, s: any) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      byDate[log.dateDone].exercises.push({ name, sets, best })
      byDate[log.dateDone].volume += vol
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ date, ...data, volume: Math.round(data.volume) }))
  }, [logs, plan])

  if (!sessions.length) return (
    <div className="text-center py-12 text-muted">
      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Completa entrenamientos para ver tu historial</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {sessions.map(session => (
        <div key={session.date} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/30 transition-colors"
            onClick={() => setExpanded(expanded === session.date ? null : session.date)}>
            {/* Fecha */}
            <div className="bg-accent/10 rounded-xl px-2.5 py-1.5 text-center flex-shrink-0">
              <p className="text-[10px] font-bold text-accent uppercase">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}
              </p>
              <p className="text-lg font-serif font-bold text-accent leading-tight">
                {new Date(session.date + 'T00:00:00').getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold capitalize">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {session.exercises.length} ejercicios · {session.volume.toLocaleString()} kg volumen
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-ok/10 flex items-center justify-center">
                <span className="text-ok text-sm">✓</span>
              </div>
              {expanded === session.date
                ? <ChevronUp className="w-4 h-4 text-muted" />
                : <ChevronDown className="w-4 h-4 text-muted" />}
            </div>
          </div>

          {expanded === session.date && (
            <div className="border-t border-border divide-y divide-border">
              {session.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {ex.sets.map((s, si) => (
                        <span key={si} className="text-[10px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">
                          {s.weight}kg×{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                  {ex.best > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-accent">{ex.best}kg</p>
                      <p className="text-[10px] text-muted">mejor</p>
                    </div>
                  )}
                </div>
              ))}
              {/* Volumen total */}
              <div className="px-4 py-2 bg-bg-alt/50 flex justify-between">
                <span className="text-xs text-muted">Volumen total</span>
                <span className="text-xs font-bold">{session.volume.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const fmtKg = (n: number) => String(n).replace('.', ',')
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

// ── Resumen: la conclusión primero, los datos después ──────
function ResumenTab({ logs, plan, pesoActual, pesoCambio, onGo, onOpenCalendar, showRecords, showPeso }: {
  logs: TrainingLogs; plan?: TrainingPlan | null
  pesoActual?: number; pesoCambio: number | null
  onGo: (t: 'records' | 'peso') => void
  onOpenCalendar?: () => void
  showRecords: boolean; showPeso: boolean
}) {
  const s = useMemo(() => {
    const bests = collectSessionBests(logs, plan)
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const desde = localDateKey(hace30)
    return {
      records: recordHistory(bests).filter(r => r.date >= desde),
      fuerza: strengthChange(bests),
      adh: adherence28(plan, logs),
      racha: streakDays(logs, new Date(), false, true),
      hayDatos: Object.values(logs).some(l => l.done),
    }
  }, [logs, plan])

  if (!s.hayDatos) return (
    <div className="text-center py-12 text-muted">
      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Cuando completes tu primer entrenamiento verás aquí cómo progresas.</p>
    </div>
  )

  const fuerzaTexto = s.fuerza === null
    ? 'Repite un ejercicio en dos sesiones y verás aquí cuánto ha subido tu fuerza.'
    : s.fuerza.pct > 0 ? `Tu fuerza ha subido un ${s.fuerza.pct}% en las últimas 8 semanas.`
    : s.fuerza.pct === 0 ? 'Tu fuerza se mantiene estable en las últimas 8 semanas.'
    : `Tus pesos máximos están un ${Math.abs(s.fuerza.pct)}% por debajo de hace 8 semanas.`

  return (
    <div className="space-y-4">
      {showRecords && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">🏆 Nuevos récords</p>
          {s.records.length === 0 ? (
            <p className="text-sm text-muted">Sin récords nuevos este mes. Cada sesión te acerca al siguiente.</p>
          ) : (
            <ul className="space-y-2.5">
              {s.records.slice(0, 3).map((r, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.name}</span>
                  <span className="text-sm font-bold text-ok flex-shrink-0">+{fmtKg(r.delta)} kg</span>
                  <span className="text-xs text-muted flex-shrink-0">{fmtDate(r.date)}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => onGo('records')} className="mt-4 text-sm font-semibold text-accent hover:underline">Ver todos los récords →</button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">💪 Fuerza</p>
        <p className="text-base font-serif font-bold leading-snug">{fuerzaTexto}</p>
        {s.fuerza && <p className="text-xs text-muted mt-1.5">Calculado con {s.fuerza.exercises} {s.fuerza.exercises === 1 ? 'ejercicio' : 'ejercicios'} que has repetido.</p>}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">🎯 Constancia</p>
        {s.adh !== null ? (
          <p className="text-base font-serif font-bold leading-snug">Has hecho el {s.adh}% de tus sesiones de las últimas 4 semanas.</p>
        ) : (
          <p className="text-sm text-muted">Cuando tengas un plan asignado verás tu constancia aquí.</p>
        )}
        {s.racha >= 2 && <p className="text-sm text-accent font-semibold mt-1.5">🔥 {s.racha} días seguidos entrenando</p>}
        {onOpenCalendar && <button onClick={onOpenCalendar} className="mt-3 text-sm font-semibold text-accent hover:underline">Ver calendario →</button>}
      </div>

      {showPeso && pesoActual !== undefined && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">⚖️ Peso</p>
          <p className="text-3xl font-serif font-bold">{fmtKg(pesoActual)} kg</p>
          {pesoCambio !== null && Math.abs(pesoCambio) >= 0.1 && (
            <p className="text-sm text-muted mt-1">{pesoCambio < 0 ? '↓' : '↑'} {fmtKg(Math.round(Math.abs(pesoCambio) * 10) / 10)} kg desde que empezaste a registrarte</p>
          )}
          <button onClick={() => onGo('peso')} className="mt-3 text-sm font-semibold text-accent hover:underline">Ver evolución →</button>
        </div>
      )}
    </div>
  )
}

// ── Récords ───────────────────────────────────────────────
function RecordsTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const ultimos = useMemo(() => recordHistory(collectSessionBests(logs, plan)).slice(0, 5), [logs, plan])
  const records = useMemo(() => {
    const r: Record<string, { best: number; date: string; reps: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExerciseName(key, plan)
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        if (!r[name] || w > r[name].best) {
          r[name] = { best: w, date: log.dateDone || '', reps: s.reps || '?' }
        }
      })
    })
    return Object.entries(r).filter(([, v]) => v.best > 0).sort((a, b) => b[1].best - a[1].best)
  }, [logs, plan])

  if (!records.length) return (
    <div className="text-center py-12 text-muted">
      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Completa entrenamientos para ver tus récords</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {ultimos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">🏆 Últimos récords</p>
          <ul className="space-y-2.5">
            {ultimos.map((r, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.name}</span>
                <span className="text-sm font-bold text-ok flex-shrink-0">+{fmtKg(r.delta)} kg</span>
                <span className="text-xs text-muted flex-shrink-0">{fmtDate(r.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">Tus mejores marcas · {records.length} ejercicios</p>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {records.map(([name, rec], i) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold ${
              i === 0 ? 'bg-yellow-100 text-yellow-700' :
              i === 1 ? 'bg-gray-100 text-gray-600' :
              i === 2 ? 'bg-orange-100 text-orange-600' :
              'bg-bg-alt text-muted text-xs'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              {rec.date && (
                <p className="text-[10px] text-muted">
                  {new Date(rec.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-accent">{rec.best} kg</p>
              <p className="text-[10px] text-muted">×{rec.reps} reps</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dolor (seguimiento de rehabilitación) ─────────────────
function DolorTab({ clientId, trainerId }: { clientId: string; trainerId?: string }) {
  const { entries, addEntry, deleteEntry } = useClientPain(clientId, trainerId)
  const [zona, setZona] = useState(ZONAS_DOLOR[0])
  const [intensidad, setIntensidad] = useState(3)
  const [nota, setNota] = useState('')

  const registrar = () => {
    addEntry(zona, intensidad, nota.trim() || undefined)
    setNota('')
  }

  const colorFor = (v: number) => v >= 7 ? 'text-warn' : v >= 4 ? 'text-accent' : 'text-ok'

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold">Registrar dolor de hoy</p>
        <div>
          <label className="block text-xs font-bold text-muted mb-1.5">Zona</label>
          <select value={zona} onChange={e => setZona(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" style={{ fontSize: '16px' }}>
            {ZONAS_DOLOR.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-bold text-muted">Intensidad</label>
            <span className={`text-sm font-bold ${colorFor(intensidad)}`}>{intensidad}/10</span>
          </div>
          <input type="range" min={0} max={10} value={intensidad} onChange={e => setIntensidad(+e.target.value)} className="w-full" />
        </div>
        <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional): cuándo duele, qué lo provoca..."
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" style={{ fontSize: '16px' }} />
        <button onClick={registrar} className="w-full py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">+ Registrar</button>
      </div>

      {entries.length === 0
        ? <div className="text-center py-8 text-muted"><HeartPulse className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin registros aún</p></div>
        : <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full bg-bg-alt flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorFor(e.intensidad)}`}>{e.intensidad}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{e.zona}</p>
                  {e.nota && <p className="text-xs text-muted truncate">{e.nota}</p>}
                  <p className="text-[10px] text-muted mt-0.5">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                </div>
                <button onClick={() => deleteEntry(e.id)} aria-label="Eliminar registro" className="p-2 text-muted hover:text-warn flex-shrink-0" style={{ minWidth: '44px', minHeight: '44px' }}>
                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Métricas compartidas por el entrenador ────────────────
function MetricasTab({ clientId, logs, plan, visible }: { clientId: string; logs: TrainingLogs; plan?: TrainingPlan | null; visible: Section[] }) {
  return (
    <div className="space-y-4">
      {visible.map(id => {
        const meta = SECTIONS.find(s => s.id === id)!
        return (
          <div key={id} className="bg-card border border-border rounded-2xl p-4">
            <div className="mb-3">
              <p className="text-sm font-bold">{meta.icon} {meta.label}</p>
              <p className="text-xs text-muted mt-0.5">{meta.desc}</p>
            </div>
            {id === 'fuerza' && <FuerzaChart logs={logs} plan={plan} />}
            {id === 'cardio' && <CardioChart logs={logs} />}
            {id === 'rm' && <RMChart logs={logs} plan={plan} />}
            {id === 'volumen' && <VolumenChart logs={logs} />}
            {id === 'adherencia' && <AdherenciaChart logs={logs} plan={plan} />}
            {id === 'racha' && <RachaStats logs={logs} />}
            {id === 'fatiga' && <RiesgoChart clientId={clientId} logs={logs} />}
            {id === 'resumen_mensual' && <MonthlyRecap logs={logs} plan={plan} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Feedback de técnica ───────────────────────────────────
interface VideoFeedbackRow {
  id: string; exercise_name: string; video_url: string; client_note: string | null
  trainer_comment: string | null; trainer_comment_video_url: string | null
  status: 'pendiente' | 'comentado'; created_at: number
}

function UploadVideoButton({ clientId, trainerId, onUploaded }: { clientId: string; trainerId: string; onUploaded: () => void }) {
  const [showModal, setShowModal] = useState(false)
  const [label, setLabel] = useState('Salto vertical')
  const [skipCompression, setSkipCompression] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (rawFile: File) => {
    if (!trainerId) return
    setError('')
    try {
      // Compresión más suave que en el resto de la app (más fps, más resolución):
      // este botón también se usa para vídeos que luego se analizan fotograma a
      // fotograma (p.ej. altura de salto), donde perder fps rompe la precisión.
      // Va dentro del try: si compressVideo rechazara, sin esto el spinner de
      // "Optimizando..." se quedaría colgado para siempre.
      let file = rawFile
      if (!skipCompression) {
        setCompressing(true)
        file = await compressVideo(rawFile, { maxDimension: 1080, fps: 60 })
        setCompressing(false)
      }
      setUploading(true)

      const ext = file.name.split('.').pop() || 'mp4'
      const path = `${clientId}/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('client-videos').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('client-videos').getPublicUrl(path)
      const { error: insertErr } = await supabase.from('video_feedback').insert({
        id: `vf_${Date.now()}`, trainer_id: trainerId, client_id: clientId,
        exercise_name: label.trim() || 'Vídeo', video_url: urlData.publicUrl,
        status: 'pendiente', created_at: Date.now(),
      })
      if (insertErr) throw insertErr
      setShowModal(false); setLabel('Salto vertical'); setSkipCompression(false)
      onUploaded()
    } catch (e: any) {
      console.error('[PanelFit] Error al subir vídeo:', e)
      const detail = e?.message || e?.error_description || (typeof e === 'string' ? e : '')
      setError(`No se pudo subir el vídeo.${detail ? ` (${detail})` : ''} Inténtalo de nuevo.`)
    } finally {
      setCompressing(false)
      setUploading(false)
    }
  }

  if (!trainerId) return null

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-all">
        <Upload className="w-4 h-4" /> Subir vídeo (ej: salto, técnica...)
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-ink/60 flex items-end justify-center" onClick={() => !uploading && setShowModal(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-serif font-bold text-lg">Subir vídeo</p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5">¿De qué es el vídeo?</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Salto vertical"
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={skipCompression} onChange={e => setSkipCompression(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0" />
              <span className="text-xs text-muted">No comprimir — voy a analizar el vídeo fotograma a fotograma (ej: medir un salto) y necesito máxima precisión</span>
            </label>
            {error && <p className="text-xs text-warn">{error}</p>}
            {/* Sin capture: con él el móvil abre la cámara directo y no deja elegir
                un vídeo ya grabado de la galería, aunque el botón diga "elegir". */}
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading || compressing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {compressing ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizando...</> : uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Grabar o elegir vídeo</>}
            </button>
            <button onClick={() => setShowModal(false)} disabled={uploading || compressing} className="w-full py-2 text-xs text-muted">Cancelar</button>
          </div>
        </div>
      )}
    </>
  )
}

function FeedbackTab({ clientId, trainerId }: { clientId: string; trainerId: string }) {
  const [videos, setVideos] = useState<VideoFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadVideos = () => {
    if (clientId.startsWith('demo-client-')) {
      setVideos((DEMO_VIDEO_FEEDBACK_MAP[clientId] || []) as VideoFeedbackRow[]); setLoading(false)
      return
    }
    supabase.from('video_feedback').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      .then(({ data }) => { setVideos((data || []) as VideoFeedbackRow[]); setLoading(false) })
  }

  useEffect(loadVideos, [clientId])

  if (loading) return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>

  if (!videos.length) return (
    <div className="space-y-4">
      <div className="text-center py-8 text-muted">
        <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Pide feedback de técnica desde un ejercicio en tu entreno, o sube un vídeo directamente (ej: para que tu entrenador analice un salto).</p>
      </div>
      <UploadVideoButton clientId={clientId} trainerId={trainerId} onUploaded={loadVideos} />
    </div>
  )

  return (
    <div className="space-y-3">
      <UploadVideoButton clientId={clientId} trainerId={trainerId} onUploaded={loadVideos} />
      {videos.map(v => (
        <div key={v.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-alt/30">
            <p className="text-sm font-semibold">{v.exercise_name}</p>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${v.status === 'pendiente' ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>
              {v.status === 'pendiente' ? 'Pendiente' : '✓ Comentado'}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <SignedVideo bucket="client-videos" src={v.video_url} className="w-full rounded-xl bg-black max-h-60" />
            <p className="text-[10px] text-muted flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
            {v.trainer_comment && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">Comentario del entrenador</p>
                <p className="text-sm">{v.trainer_comment}</p>
              </div>
            )}
            {v.trainer_comment_video_url && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Vídeo de respuesta</p>
                <SignedVideo bucket="client-videos" src={v.trainer_comment_video_url} className="w-full rounded-xl bg-black max-h-60" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export function ProgresoClienteTab({ clientId, trainerId, logs, plan, onOpenCalendar }: Props) {
  const lastLeafRef = useRef<Record<string, string>>({})
  const [subtab, setSubtab] = useState<'resumen' | 'historial' | 'peso' | 'fotos' | 'records' | 'feedback' | 'dolor' | 'metricas'>('resumen')
  const { weights, addWeight: addWeightEntry, deleteWeight } = useClientWeights(clientId)
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [uploading, setUploading] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [metricasVisibles, setMetricasVisibles] = useState<Section[]>([])
  // Preferencia global del entrenador (Ajustes → Métricas activas) — si ha
  // desactivado "Peso"/"Récords"/"Fotos"/"Vídeos" porque no las usa, tampoco
  // tiene sentido que el cliente vea esas pestañas de toma de datos.
  const metricasActivasEntrenador = useTrainerMetricSettings(trainerId) // null = todas activas

  useEffect(() => {
    loadPhotos()
  }, [clientId])

  // Métricas que el entrenador ha decidido enseñar a este cliente en concreto
  // (lib/trainer/client-panel/ConfigTab) — el cliente no elige, solo consulta.
  useEffect(() => {
    if (!clientId) return
    if (clientId.startsWith('demo-client-')) { setMetricasVisibles(CLIENT_SHAREABLE_SECTIONS); return }
    supabase.from('clientes').select('metricas_cliente').eq('id', clientId).maybeSingle()
      .then(({ data }) => setMetricasVisibles(((data?.metricas_cliente || []) as Section[]).filter(id => CLIENT_SHAREABLE_SECTIONS.includes(id))))
  }, [clientId])

  const dolorVisible = metricasVisibles.includes('dolor')
  const otrasMetricasVisibles = metricasVisibles.filter(id => id !== 'dolor')

  const loadPhotos = async () => {
    setLoadingPhotos(true)
    const { data, error } = await supabase
      .from('foto_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
    if (!error && data) {
      setPhotos(data.map((r: any) => ({
        id: r.id, date: r.date,
        front: r.front_url, side: r.side_url, back: r.back_url,
        note: r.note || ''
      })))
    }
    setLoadingPhotos(false)
  }

  const createSession = async () => {
    const id = `s_${Date.now()}`
    const date = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('foto_sessions').insert({ id, client_id: clientId, date, created_at: Date.now() })
    if (!error) { await loadPhotos(); setExpandedSession(id) }
  }

  const deleteSession = async (id: string) => {
    await supabase.from('foto_sessions').delete().eq('id', id)
    setPhotos(p => p.filter(s => s.id !== id))
  }

  const updateNote = async (sessionId: string, note: string) => {
    setPhotos(p => p.map(s => s.id === sessionId ? { ...s, note } : s))
    await supabase.from('foto_sessions').update({ note }).eq('id', sessionId)
  }

  const addWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) return
    addWeightEntry(w)
    setNewWeight('')
  }

  const uploadPhoto = async (sessionId: string, type: 'front' | 'side' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) return
    setUploading(true)
    const path = `fotos/${clientId}/${sessionId}/${type}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      const url = data.publicUrl
      const col = type === 'front' ? 'front_url' : type === 'side' ? 'side_url' : 'back_url'
      await supabase.from('foto_sessions').update({ [col]: url }).eq('id', sessionId)
      setPhotos(p => p.map(s => s.id === sessionId ? { ...s, [type]: url } : s))
    }
    setUploading(false)
  }

  const pesoInicial = weights[weights.length - 1]?.weight
  const pesoActual = weights[0]?.weight
  const pesoCambio = pesoInicial && pesoActual ? pesoActual - pesoInicial : null

  // null (todavía sin cargar, o entrenador sin preferencia guardada) = activa
  const metricaActiva = (id: Section) => !metricasActivasEntrenador || metricasActivasEntrenador.has(id)

  type SubtabId = typeof subtab
  // Cinco grupos arriba (Resumen, Entrenos, Fuerza, Cuerpo, Más) y, dentro del
  // que tenga varias vistas, un segundo nivel. Las vistas son las de siempre.
  const available: SubtabId[] = [
    'resumen', 'historial',
    ...(metricaActiva('records') ? ['records' as const] : []),
    ...(metricaActiva('peso') ? ['peso' as const] : []),
    ...(dolorVisible ? ['dolor' as const] : []),
    ...(metricaActiva('fotos') ? ['fotos' as const] : []),
    ...(metricaActiva('videos') ? ['feedback' as const] : []),
    ...(otrasMetricasVisibles.length > 0 ? ['metricas' as const] : []),
  ]
  const groups = buildGroups(available)
  const activeGroup = groupOf(groups, subtab) ?? groups[0]
  // Si la vista actual deja de estar disponible (p. ej. el entrenador la
  // desactiva), se muestra el resumen en vez de una pantalla vacía.
  const currentLeaf = (activeGroup.leaves.some(l => l.id === subtab) ? subtab : 'resumen') as SubtabId
  lastLeafRef.current[activeGroup.id] = currentLeaf

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-4">
      <h3 className="font-serif font-bold text-xl">Tu progreso</h3>

      {/* Nivel 1: cinco grupos */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Secciones de tu progreso">
        {groups.map(g => (
          <button key={g.id} role="tab" aria-selected={activeGroup.id === g.id}
            onClick={() => setSubtab(leafForGroup(g, lastLeafRef.current[g.id]) as SubtabId)}
            className={`px-0.5 py-2 rounded-xl text-xs font-semibold truncate transition-all ${
              activeGroup.id === g.id ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'
            }`}
            style={{ minHeight: '40px' }}>
            {g.label}
          </button>
        ))}
      </div>
      {/* Nivel 2: solo si el grupo tiene varias vistas */}
      {activeGroup.leaves.length > 1 && (
        <div className="flex gap-4 border-b border-border/70 -mt-1" role="tablist" aria-label={activeGroup.label}>
          {activeGroup.leaves.map(l => (
            <button key={l.id} role="tab" aria-selected={currentLeaf === l.id} onClick={() => setSubtab(l.id as SubtabId)}
              className={`pb-2 -mb-px text-sm font-medium border-b-2 transition-colors ${currentLeaf === l.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}

      {currentLeaf === 'resumen'    && (
        <ResumenTab logs={logs} plan={plan} pesoActual={pesoActual} pesoCambio={pesoCambio} onGo={setSubtab} onOpenCalendar={onOpenCalendar}
          showRecords={metricaActiva('records')} showPeso={metricaActiva('peso')} />
      )}
      {currentLeaf === 'historial'  && <HistorialTab  logs={logs} plan={plan} />}
      {currentLeaf === 'records'    && <RecordsTab    logs={logs} plan={plan} />}
      {currentLeaf === 'feedback'   && <FeedbackTab    clientId={clientId} trainerId={trainerId} />}
      {currentLeaf === 'dolor'      && <DolorTab       clientId={clientId} trainerId={trainerId} />}
      {currentLeaf === 'metricas'   && <MetricasTab    clientId={clientId} logs={logs} plan={plan} visible={otrasMetricasVisibles} />}

      {currentLeaf === 'peso' && (
        <div className="space-y-4">
          {weights.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{pesoActual}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">kg actual</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-serif font-bold ${pesoCambio === null ? 'text-muted' : pesoCambio < 0 ? 'text-ok' : pesoCambio > 0 ? 'text-warn' : 'text-muted'}`}>
                  {pesoCambio === null ? '—' : `${pesoCambio > 0 ? '+' : ''}${pesoCambio.toFixed(1)}`}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">cambio total</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{weights.length}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">registros</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWeight()}
              placeholder="Registrar peso de hoy (kg)" aria-label="Registrar peso de hoy en kg"
              className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-base outline-none focus:ring-2 focus:ring-accent/20"
              style={{ fontSize: '16px' }} />
            <button onClick={addWeight} className="px-5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0" style={{ minHeight: '44px' }}>
              + Añadir
            </button>
          </div>
          {weights.length >= 3 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted mb-3">Evolución</p>
              <div className="flex items-end gap-1 h-16">
                {weights.slice(0, 12).reverse().map((w, i) => {
                  const min = Math.min(...weights.map(x => x.weight))
                  const max = Math.max(...weights.map(x => x.weight))
                  const range = max - min || 1
                  const h = Math.max(8, ((w.weight - min) / range) * 48 + 8)
                  const isLast = i === Math.min(weights.length, 12) - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-sm ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border'}`} style={{ height: `${h}px` }} />
                      <p className="text-[8px] text-muted">{w.weight}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {weights.length > 0 && (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {weights.map((w, i) => (
                <div key={w.date} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-accent' : 'bg-bg-alt border border-border'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{w.weight} kg</p>
                    <p className="text-xs text-muted">{new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  {i > 0 && (
                    <p className={`text-xs font-bold ${w.weight > weights[i-1].weight ? 'text-warn' : w.weight < weights[i-1].weight ? 'text-ok' : 'text-muted'}`}>
                      {w.weight > weights[i-1].weight ? '+' : ''}{(w.weight - weights[i-1].weight).toFixed(1)}
                    </p>
                  )}
                  <button onClick={() => deleteWeight(w.date)} aria-label="Eliminar peso" className="p-2 text-muted hover:text-warn" style={{ minWidth: '44px', minHeight: '44px' }}>
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {weights.length === 0 && <div className="text-center py-10 text-muted"><Scale className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Registra tu peso para ver tu evolución</p></div>}
        </div>
      )}

      {currentLeaf === 'fotos' && (
        <div className="space-y-4">
          <button onClick={createSession} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-muted hover:border-accent hover:text-accent transition-all text-sm font-semibold" style={{ minHeight: '44px' }}>
            <Plus className="w-4 h-4" /> Nueva sesión de fotos
          </button>
          {loadingPhotos && <div className="text-center py-6 text-muted text-sm">Cargando fotos...</div>}
          {!loadingPhotos && photos.length === 0 && <div className="text-center py-10 text-muted"><Camera className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin fotos aún.</p></div>}
          {photos.map(session => (
            <div key={session.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                <Camera className="w-4 h-4 text-muted" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-xs text-muted">{[session.front, session.side, session.back].filter(Boolean).length}/3 fotos</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSession(session.id) }} aria-label="Eliminar sesión de fotos" className="p-2 text-muted hover:text-warn" style={{ minWidth: '44px', minHeight: '44px' }}><Trash2 className="w-3.5 h-3.5" /></button>
                {expandedSession === session.id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </div>
              {expandedSession === session.id && (
                <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(['front', 'side', 'back'] as const).map(type => {
                      const labels = { front: 'Frente', side: 'Lado', back: 'Espalda' }
                      const url = session[type]
                      return (
                        <div key={type} className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{labels[type]}</p>
                          <label className={`block cursor-pointer rounded-xl overflow-hidden border-2 aspect-[3/4] ${url ? 'border-border' : 'border-dashed border-border hover:border-accent'}`}>
                            {url ? <SignedImage bucket="media" src={url} alt={`Foto de progreso - ${labels[type]}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted p-2"><Camera className="w-5 h-5 opacity-40" /><span className="text-[10px] text-center">Toca para subir</span></div>}
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(session.id, type, f) }} />
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {uploading && <p className="text-xs text-accent text-center">Subiendo foto...</p>}
                  <textarea rows={2} value={session.note || ''} onChange={e => updateNote(session.id, e.target.value)}
                    placeholder="Nota de esta sesión..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" style={{ fontSize: '16px' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
