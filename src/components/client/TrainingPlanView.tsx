import { useState } from 'react'
import { ChevronDown, ChevronUp, Play, Dumbbell, Info, Flame, X, Calculator } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { ActiveWorkout } from './ActiveWorkout'
import { VideoModal } from './VideoModal'
import { CalculadoraDiscos } from './CalculadoraDiscos'
import { DEFAULT_SERIES_TYPES, SeriesTypeDef } from '../trainer/TrainingPlanEditor'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  seriesTypes?: SeriesTypeDef[]
  trainerId?: string
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ── Modal info tipo de serie ──────────────────────────────
function SeriesTypeInfoModal({ type, onClose }: { type: SeriesTypeDef; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-ink/60 flex items-end justify-center p-4">
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{type.emoji}</span>
            <div>
              <h3 className="font-serif font-bold text-lg">{type.label}</h3>
              <p className="text-xs text-muted">{type.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-bg border border-border rounded-2xl p-4">
          <p className="text-sm leading-relaxed text-muted">{type.detail}</p>
        </div>
        <button onClick={onClose}
          className="w-full py-3 bg-ink text-white rounded-2xl font-bold text-sm">
          Entendido
        </button>
      </div>
    </div>
  )
}

export function TrainingPlanView({ plan, logs, onLogsChange, seriesTypes, trainerId }: Props) {
  const [activeWorkout, setActiveWorkout] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({})
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [seriesInfoModal, setSeriesInfoModal] = useState<SeriesTypeDef | null>(null)
  const [calcWeight, setCalcWeight] = useState<number | null>(null)

  const allSeriesTypes = seriesTypes?.length ? seriesTypes : DEFAULT_SERIES_TYPES

  const currentWeek = plan.weeks?.find(w => w.isCurrent) || plan.weeks?.[0]
  const weekIdx = plan.weeks?.indexOf(currentWeek) ?? 0

  if (activeWorkout) return (
    <ActiveWorkout
      plan={plan}
      weekIdx={activeWorkout.weekIdx}
      dayIdx={activeWorkout.dayIdx}
      logs={logs}
      onLogsChange={onLogsChange}
      onFinish={() => setActiveWorkout(null)}
      trainerId={trainerId}
    />
  )

  if (!currentWeek) return (
    <div className="p-8 text-center text-muted">
      <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan asignado</p>
      <p className="text-sm mt-1">Tu entrenador aún no ha creado tu rutina.</p>
    </div>
  )

  return (
    <div className="pb-24">
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
      {seriesInfoModal && <SeriesTypeInfoModal type={seriesInfoModal} onClose={() => setSeriesInfoModal(null)} />}
      {calcWeight !== null && (
        <CalculadoraDiscos pesoObjetivo={calcWeight} onClose={() => setCalcWeight(null)} />
      )}

      <div className="px-4 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Semana actual</p>
        <h2 className="font-serif font-bold text-xl mt-0.5">{currentWeek.label}</h2>
        {currentWeek.rpe && <p className="text-xs text-muted mt-0.5">Intensidad objetivo: {currentWeek.rpe}</p>}
        {currentWeek.isDeload && (
          <div className="mt-2 px-3 py-2 bg-warn/10 border border-warn/20 rounded-xl text-xs text-warn font-medium">
            Semana de descarga: baja un poco la intensidad para recuperar antes del siguiente bloque.
          </div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {currentWeek.days.map((day, di) => {
          const dayKey = `w${weekIdx}_d${di}`
          const done = day.exercises.filter((_, ri) => logs[`ex_${dayKey}_r${ri}`]?.done).length
          const total = day.exercises.length
          const pct = total ? Math.round(done / total * 100) : 0
          const isOpen = openDays[dayKey]
          const isComplete = pct === 100
          const warmup = (day as any).warmup as string | undefined
          const warmupExercises = (day as any).warmupExercises as any[] | undefined

          return (
            <div key={di} className={`bg-card border rounded-2xl overflow-hidden transition-all ${isComplete ? 'border-ok/40' : 'border-border'}`}>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  isComplete ? 'bg-ok text-white' : pct > 0 ? 'bg-accent/10 text-accent border-2 border-accent/30' : 'bg-bg-alt text-muted'
                }`}>
                  {isComplete ? '✓' : di + 1}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setOpenDays(p => ({ ...p, [dayKey]: !p[dayKey] }))}>
                  <p className="font-semibold text-sm">{day.title}</p>
                  {day.focus && <p className="text-xs text-muted truncate">{day.focus}</p>}
                  <p className="text-[10px] text-muted mt-0.5">{total} ejercicios · {done > 0 ? `${done}/${total} completados` : 'Sin empezar'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveWorkout({ weekIdx, dayIdx: di })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isComplete ? 'bg-ok/10 text-ok border border-ok/30' :
                      pct > 0 ? 'bg-accent text-white' : 'bg-ink text-white'
                    }`}>
                    <Play className="w-3.5 h-3.5" />
                    {isComplete ? 'Repetir' : pct > 0 ? 'Continuar' : 'Empezar'}
                  </button>
                  <button onClick={() => setOpenDays(p => ({ ...p, [dayKey]: !p[dayKey] }))} className="p-1.5 text-muted">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {pct > 0 && (
                <div className="px-4 pb-3 -mt-1">
                  <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="border-t border-border">

                  {/* CALENTAMIENTO */}
                  {(warmup || (warmupExercises && warmupExercises.length > 0)) && (
                    <div className="bg-orange-50/60 border-b border-orange-100 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Calentamiento</p>
                      </div>

                      {/* Ejercicios de calentamiento si los hay */}
                      {warmupExercises && warmupExercises.length > 0 && (
                        <div className="space-y-1.5">
                          {warmupExercises.map((ex: any, ei: number) => {
                            const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
                            return (
                              <div key={ei} className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 border border-orange-100">
                                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-500 flex-shrink-0">
                                  {ei + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{ex.name}</p>
                                  {ex.sets && <p className="text-xs text-orange-400">{ex.sets}{ex.weight ? ` · ${ex.weight}` : ''}</p>}
                                  {ex.comment && <p className="text-xs text-gray-400 italic mt-0.5">"{ex.comment}"</p>}
                                </div>
                                {ytId && (
                                  <button onClick={() => setVideoUrl(ex.videoUrl)}
                                    className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-orange-200 active:scale-95 transition-transform">
                                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Texto libre de calentamiento */}
                      {warmup && (
                        <div className="text-xs text-orange-700 leading-relaxed whitespace-pre-line bg-white/50 rounded-xl px-3 py-2 border border-orange-100">
                          {warmup}
                        </div>
                      )}
                    </div>
                  )}

                  {/* EJERCICIOS */}
                  <div className="divide-y divide-border">
                    {day.exercises.map((ex, ri) => {
                      const log = logs[`ex_${dayKey}_r${ri}`]
                      const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
                      const seriesTypeId = (ex as any).seriesType || 'normal'
                      const seriesMeta = allSeriesTypes.find(s => s.id === seriesTypeId)
                      const showSeriesType = seriesTypeId !== 'normal' && seriesMeta

                      // Peso numérico para calculadora
                      const weightNum = parseFloat(ex.weight || '0') || null

                      return (
                        <div key={ri} className={`px-4 py-3 ${log?.done ? 'opacity-60' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                              log?.done ? 'bg-ok text-white' : 'bg-bg border border-border text-muted'
                            }`}>
                              {log?.done ? '✓' : ri + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{ex.name}</p>
                                {ex.isMain && <span className="text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-1.5 py-0.5 rounded-full">Principal</span>}
                                {/* Badge tipo serie con botón ℹ️ */}
                                {showSeriesType && (
                                  <button
                                    onClick={() => setSeriesInfoModal(seriesMeta!)}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-bg border border-border rounded-full text-[10px] font-semibold text-muted hover:border-accent hover:text-accent transition-colors active:scale-95">
                                    <span>{seriesMeta!.emoji}</span>
                                    <span>{seriesMeta!.label}</span>
                                    <Info className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>

                              {/* Series y peso con botón calculadora */}
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <p className="text-xs text-muted">{ex.sets}</p>
                                {ex.weight && (
                                  <button
                                    onClick={() => setCalcWeight(weightNum || 0)}
                                    className="flex items-center gap-1 text-xs text-accent font-semibold hover:underline active:scale-95 transition-transform">
                                    <span>{ex.weight}</span>
                                    <Calculator className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Comentario del entrenador */}
                              {ex.comment && (
                                <p className="text-xs text-muted italic mt-1 leading-relaxed">"{ex.comment}"</p>
                              )}

                              {/* Sets completados */}
                              {log?.sets && Object.keys(log.sets).length > 0 && (
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                  {Object.values(log.sets).map((s, si) => (
                                    <span key={si} className="text-[9px] bg-ok/10 text-ok px-1.5 py-0.5 rounded font-medium">{s.weight}×{s.reps}</span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Miniatura video */}
                            {ytId && (
                              <button onClick={() => setVideoUrl(ex.videoUrl!)}
                                className="w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border active:scale-95 transition-transform">
                                <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
