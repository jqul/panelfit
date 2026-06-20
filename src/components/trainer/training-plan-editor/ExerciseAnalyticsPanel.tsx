import { X, Timer } from 'lucide-react'
import { Exercise, LibraryExercise, TrainingLogs, TrainingPlan, LogSet } from '../../../types'
import { SeriesTypeDef, DEFAULT_SERIES_TYPES } from './seriesTypes'
import { getYTId } from './utils'

interface AnalyticsPanelProps {
  ex: Exercise; libEx: LibraryExercise | undefined
  logs: TrainingLogs; plan: TrainingPlan
  exName: string; clientName: string
  seriesTypes: SeriesTypeDef[]
  onClose: () => void
}

function fmtRestLocal(s: number) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m${r}s` : `${m}m`
}

function MiniLineChart({ data, color = '#6e5438' }: { data: { x: string; y: number }[]; color?: string }) {
  if (data.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-muted">Sin suficientes datos</div>
  const vals = data.map(d => d.y)
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const w = 260, h = 80, pad = 8
  const points = data.map((d, i) => ({
    px: pad + (i / (data.length - 1)) * (w - pad * 2),
    py: h - pad - ((d.y - min) / range) * (h - pad * 2),
    label: d.x, val: d.y
  }))
  const polyline = points.map(p => `${p.px},${p.py}`).join(' ')
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace('#','')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r="3" fill={color} />
          {(i === 0 || i === points.length - 1) && (
            <text x={p.px} y={p.py - 6} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{p.val}kg</text>
          )}
        </g>
      ))}
      {points.filter((_, i) => i === 0 || i === points.length - 1).map((p, i) => (
        <text key={i} x={p.px} y={h - 1} textAnchor="middle" fontSize="8" fill="#8a8278">{p.label.slice(5)}</text>
      ))}
    </svg>
  )
}

export function ExerciseAnalyticsPanel({ ex, libEx, logs, plan, exName, clientName, seriesTypes, onClose }: AnalyticsPanelProps) {
  const exLogs: { date: string; sets: LogSet[]; bestWeight: number }[] = []
  plan.weeks.forEach((week, wi) => {
    week.days.forEach((day, di) => {
      day.exercises.forEach((planEx, ri) => {
        if (planEx.name.toLowerCase() !== exName.toLowerCase()) return
        const key = `ex_w${wi}_d${di}_r${ri}`
        const log = logs[key]
        if (!log?.dateDone) return
        const sets = Object.values(log.sets || {}).map(s => ({ weight: s.weight || '0', reps: s.reps || '0' }))
        const bestWeight = Math.max(0, ...sets.map(s => parseFloat(s.weight) || 0))
        exLogs.push({ date: log.dateDone, sets, bestWeight })
      })
    })
  })
  exLogs.sort((a, b) => a.date.localeCompare(b.date))
  const byDate: Record<string, typeof exLogs[0]> = {}
  exLogs.forEach(l => { if (!byDate[l.date] || l.bestWeight > byDate[l.date].bestWeight) byDate[l.date] = l })
  const chartData = Object.entries(byDate).map(([date, l]) => ({ x: date, y: l.bestWeight }))
  const lastLog = exLogs[exLogs.length - 1]
  const prevLog = exLogs[exLogs.length - 2]
  const bestEver = Math.max(0, ...exLogs.map(l => l.bestWeight))
  const est1RM = lastLog ? Math.round(lastLog.sets.reduce((best, s) => {
    const w = parseFloat(s.weight) || 0, r = parseInt(s.reps) || 1
    return Math.max(best, w * (1 + r / 30))
  }, 0)) : 0
  const trend = lastLog && prevLog ? lastLog.bestWeight - prevLog.bestWeight : 0
  const ytId = ex.videoUrl ? getYTId(ex.videoUrl) : null
  const seriesTypeId = ex.seriesType || 'normal'
  const seriesMeta = seriesTypes.find(s => s.id === seriesTypeId) || DEFAULT_SERIES_TYPES[0]

  return (
    <div className="w-72 space-y-2.5 overflow-y-auto max-h-full pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Analytics</p>
          <p className="font-serif font-bold text-base leading-tight mt-0.5">{exName || 'Ejercicio'}</p>
          {clientName && <p className="text-[10px] text-muted">{clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-base">{seriesMeta?.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-accent">{seriesMeta?.label}</p>
          <p className="text-[9px] text-muted leading-tight truncate">{seriesMeta?.desc}</p>
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Timer className="w-3 h-3 text-accent" /><span className="text-[10px] text-accent font-bold">Descansos</span></div>
        <div className="flex gap-3 text-[10px]">
          <span className="text-muted">series: <span className="font-bold text-ink">{fmtRestLocal(ex.restSets ?? 90)}</span></span>
          <span className="text-muted">tras: <span className="font-bold text-ink">{fmtRestLocal(ex.restAfter ?? 120)}</span></span>
        </div>
      </div>

      {exLogs.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Mejor', value: bestEver > 0 ? `${bestEver}kg` : '—', color: 'text-accent' },
              { label: '1RM est.', value: est1RM > 0 ? `~${est1RM}kg` : '—', color: 'text-ok' },
              { label: 'Tendencia', value: trend !== 0 ? `${trend > 0 ? '+' : ''}${trend}kg` : '—', color: trend > 0 ? 'text-ok' : trend < 0 ? 'text-warn' : 'text-muted' },
            ].map((k, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-2 text-center">
                <p className={`font-bold text-sm ${k.color}`}>{k.value}</p>
                <p className="text-[8px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          {chartData.length >= 2 && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Progresión de peso</p>
              <MiniLineChart data={chartData} />
            </div>
          )}
          {lastLog && (
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">
                Última sesión · {new Date(lastLog.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
              <div className="space-y-1">
                {lastLog.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-bg-alt text-[9px] font-bold flex items-center justify-center text-muted flex-shrink-0">{i+1}</span>
                    <div className="flex-1 bg-bg rounded px-2 py-1 flex justify-between">
                      <span className="text-xs font-bold">{s.weight}kg</span>
                      <span className="text-xs text-muted">×{s.reps}</span>
                    </div>
                  </div>
                ))}
              </div>
              {prevLog && (
                <p className="text-[10px] text-muted mt-1.5">
                  Anterior: <span className="font-semibold">{prevLog.bestWeight}kg</span>
                  {trend !== 0 && <span className={`ml-1 font-bold ${trend > 0 ? 'text-ok' : 'text-warn'}`}>{trend > 0 ? `↑+${trend}kg` : `↓${trend}kg`}</span>}
                </p>
              )}
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Historial</p>
            <div className="flex items-end gap-0.5 h-10">
              {chartData.slice(-10).map((d, i) => {
                const maxY = Math.max(...chartData.map(c => c.y), 1)
                const h = Math.max(3, Math.round((d.y / maxY) * 36))
                const isLast = i === chartData.slice(-10).length - 1
                return (
                  <div key={i} className="flex-1">
                    <div className={`w-full rounded-sm ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border/50'}`} style={{ height: h }} />
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-muted mt-1">{exLogs.length} sesión{exLogs.length !== 1 ? 'es' : ''}</p>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <p className="text-xl mb-1.5">📊</p>
          <p className="text-sm font-semibold">Sin historial aún</p>
          <p className="text-xs text-muted mt-1">Los datos aparecen cuando el cliente completa sesiones.</p>
        </div>
      )}

      {ytId && (
        <div className="rounded-xl overflow-hidden border border-border">
          <a href={ex.videoUrl} target="_blank" rel="noreferrer">
            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full aspect-video object-cover" alt="" />
          </a>
          <p className="text-[10px] text-muted px-3 py-1.5">📹 Ver vídeo de referencia</p>
        </div>
      )}

      {libEx?.description && (
        <div className="bg-accent/5 border border-accent/15 rounded-xl p-3">
          <p className="text-[9px] uppercase tracking-wider text-accent font-bold mb-1">Notas técnicas</p>
          <p className="text-xs leading-relaxed">{libEx.description}</p>
        </div>
      )}

      {ex.comment && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Indicaciones al cliente</p>
          <p className="text-xs text-muted leading-relaxed">{ex.comment}</p>
        </div>
      )}
    </div>
  )
}
