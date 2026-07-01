import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle2, Dumbbell, TrendingUp, X } from 'lucide-react'
import { TrainingPlan, TrainingLogs, LogSet } from '../../../types'
import { supabase } from '../../../lib/supabase'

function MiniLineChart({ data, color = '#6e5438' }: { data: { x: string; y: number }[]; color?: string }) {
  if (data.length < 2) return <p className="text-xs text-muted text-center py-2">Solo 1 sesión — necesitas al menos 2 para ver la gráfica</p>
  const vals = data.map(d => d.y)
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const w = 280, h = 72, pad = 10
  const pts = data.map((d, i) => ({
    px: pad + (i / (data.length - 1)) * (w - pad * 2),
    py: h - pad - ((d.y - min) / range) * (h - pad * 2),
    val: d.y, label: d.x,
  }))
  const polyline = pts.map(p => `${p.px},${p.py}`).join(' ')
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 72 }}>
      <defs>
        <linearGradient id="exg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#exg)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r="3" fill={color} />
          {(i === 0 || i === pts.length - 1) && (
            <text x={p.px} y={p.py - 6} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{p.val}kg</text>
          )}
          {(i === 0 || i === pts.length - 1) && (
            <text x={p.px} y={h - 1} textAnchor="middle" fontSize="8" fill="#8a8278">{p.label.slice(5)}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

interface SessionReaction { date: string; emoji: string; comment: string | null }

export function EntrenosTab({ logs, plan, clientId }: { logs: TrainingLogs; plan: TrainingPlan | null; clientId?: string }) {
  const [reactions, setReactions] = useState<Record<string, SessionReaction>>({})
  const [expandedEx, setExpandedEx] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    supabase.from('session_reactions').select('date, emoji, comment').eq('clientId', clientId)
      .then(({ data }) => {
        const byDate: Record<string, SessionReaction> = {}
        ;(data || []).forEach((r: SessionReaction) => { byDate[r.date] = r })
        setReactions(byDate)
      })
  }, [clientId])

  // ── Historial por ejercicio ────────────────────────────────
  const exHistory: Record<string, { date: string; bestWeight: number }[]> = {}
  Object.entries(logs).forEach(([key, log]) => {
    if (!log.dateDone) return
    const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ri = parseInt(m[3])
    const exName = plan?.weeks?.[wi]?.days?.[di]?.exercises?.[ri]?.name || key
    const best = Math.max(0, ...Object.values(log.sets || {}).map(s => parseFloat(s.weight) || 0))
    if (best <= 0) return
    if (!exHistory[exName]) exHistory[exName] = []
    const existing = exHistory[exName].find(e => e.date === log.dateDone!)
    if (!existing) exHistory[exName].push({ date: log.dateDone!, bestWeight: best })
    else if (best > existing.bestWeight) existing.bestWeight = best
  })
  Object.values(exHistory).forEach(arr => arr.sort((a, b) => a.date.localeCompare(b.date)))

  const byDate: Record<string, { exName: string; sets: Record<number, LogSet>; key: string }[]> = {}
  Object.entries(logs).forEach(([key, log]) => {
    if (!log.dateDone) return
    const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ri = parseInt(m[3])
    const exName = plan?.weeks?.[wi]?.days?.[di]?.exercises?.[ri]?.name || key
    if (!byDate[log.dateDone]) byDate[log.dateDone] = []
    byDate[log.dateDone].push({ exName, sets: log.sets, key })
  })
  const dates = Object.keys(byDate).sort().reverse()
  if (!dates.length) return <div className="text-center py-16 text-muted"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-serif text-lg">Sin entrenamientos aún</p></div>
  return (
    <div className="max-w-2xl space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Historial</h3><p className="text-xs text-muted">{dates.length} días con actividad</p></div>
      {dates.map(fecha => (
        <div key={fecha} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-alt/30">
            <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
            <p className="text-sm font-semibold capitalize flex-1">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <span className="text-xs text-muted">{byDate[fecha].length} ejercicios</span>
          </div>
          {reactions[fecha] && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-accent/5 border-b border-border">
              <span className="text-lg flex-shrink-0">{reactions[fecha].emoji}</span>
              {reactions[fecha].comment && <p className="text-xs text-ink/80 italic mt-1">"{reactions[fecha].comment}"</p>}
            </div>
          )}
          <div className="divide-y divide-border">
            {byDate[fecha].map(({ exName, sets, key }) => {
              const setsArr = Object.values(sets || {})
              const mejor = setsArr.reduce((max, s) => Math.max(max, parseFloat(s.weight) || 0), 0)
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0"><Dumbbell className="w-3.5 h-3.5 text-muted" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exName}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">{setsArr.map((s, si) => <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">{s.weight}kg×{s.reps}</span>)}</div>
                    </div>
                    {mejor > 0 && <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-accent">{mejor}kg</p><p className="text-[9px] text-muted">mejor</p></div>}
                    {(exHistory[exName]?.length ?? 0) >= 2 && (
                      <button
                        onClick={() => setExpandedEx(expandedEx === key ? null : key)}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${expandedEx === key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-accent'}`}>
                        {expandedEx === key ? <X className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {expandedEx === key && exHistory[exName] && (
                    <div className="mx-4 mb-3 bg-bg border border-border rounded-xl p-3">
                      <p className="text-[9px] uppercase tracking-wider text-muted font-bold mb-2">Progresión · {exHistory[exName].length} sesión{exHistory[exName].length !== 1 ? 'es' : ''}</p>
                      <MiniLineChart data={exHistory[exName].map(e => ({ x: e.date, y: e.bestWeight }))} />
                      <div className="flex justify-between mt-1.5 text-[10px] text-muted">
                        <span>Inicio: <strong className="text-ink">{exHistory[exName][0].bestWeight}kg</strong></span>
                        <span>Mejor: <strong className="text-accent">{Math.max(...exHistory[exName].map(e => e.bestWeight))}kg</strong></span>
                        <span>Último: <strong className="text-ink">{exHistory[exName][exHistory[exName].length - 1].bestWeight}kg</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
