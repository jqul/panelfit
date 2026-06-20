import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { EmptyState } from './helpers'

export function FatigaChart({ logs }: { logs: TrainingLogs }) {
  const analysis = useMemo(() => {
    const now = new Date()
    const hace7 = new Date(now); hace7.setDate(now.getDate() - 7)
    const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)

    let rirsThisWeek: number[] = []
    let rirsLastWeek: number[] = []
    let volThisWeek = 0
    let volLastWeek = 0
    let sesionesThisWeek = 0

    Object.values(logs).forEach(log => {
      if (!log.done || !log.dateDone) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const setsArr = Object.values(log.sets || {})
      const vol = setsArr.reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      const rirs = setsArr.filter(s => s.rir !== undefined).map(s => s.rir as number)

      if (d >= hace7) {
        rirsThisWeek.push(...rirs)
        volThisWeek += vol
      } else if (d >= hace14 && d < hace7) {
        rirsLastWeek.push(...rirs)
        volLastWeek += vol
      }
    })

    const datesThisWeek = new Set(Object.values(logs).filter((l: any) => l.dateDone && new Date(l.dateDone + 'T00:00:00') >= hace7).map((l: any) => l.dateDone))
    sesionesThisWeek = datesThisWeek.size

    const avgRirThis = rirsThisWeek.length ? rirsThisWeek.reduce((a, b) => a + b, 0) / rirsThisWeek.length : null
    const avgRirLast = rirsLastWeek.length ? rirsLastWeek.reduce((a, b) => a + b, 0) / rirsLastWeek.length : null
    const volChangePct = volLastWeek > 0 ? Math.round(((volThisWeek - volLastWeek) / volLastWeek) * 100) : null

    // Heurística de riesgo: RIR bajando + volumen subiendo mucho = riesgo
    let riskLevel: 'bajo' | 'moderado' | 'alto' = 'bajo'
    let riskReasons: string[] = []

    if (avgRirThis !== null && avgRirThis <= 1.5) {
      riskLevel = 'alto'
      riskReasons.push('RIR medio muy bajo esta semana (entrenando casi al fallo constantemente)')
    }
    if (avgRirThis !== null && avgRirLast !== null && avgRirThis < avgRirLast - 1) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push('El RIR ha bajado significativamente respecto a la semana anterior (más fatiga acumulada)')
    }
    if (volChangePct !== null && volChangePct > 30) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push(`El volumen ha subido un ${volChangePct}% respecto a la semana anterior`)
    }
    if (sesionesThisWeek >= 6) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push('6 o más sesiones esta semana sin días claros de descanso')
    }

    return { avgRirThis, avgRirLast, volChangePct, sesionesThisWeek, riskLevel, riskReasons, hasData: rirsThisWeek.length > 0 }
  }, [logs])

  if (!analysis.hasData) return (
    <EmptyState icon={<AlertTriangle className="w-8 h-8 opacity-30" />} text="Sin datos suficientes"
      sub="Necesita RIR registrado en la última semana para analizar fatiga" />
  )

  const RISK_META = {
    bajo: { color: '#22c55e', bg: '#f0fdf4', label: 'Riesgo bajo', emoji: '✅' },
    moderado: { color: '#f59e0b', bg: '#fffbeb', label: 'Riesgo moderado', emoji: '⚠️' },
    alto: { color: '#ef4444', bg: '#fef2f2', label: 'Riesgo alto', emoji: '🚨' },
  }
  const meta = RISK_META[analysis.riskLevel]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: meta.bg }}>
        <p className="text-3xl mb-1">{meta.emoji}</p>
        <p className="text-xl font-serif font-bold" style={{ color: meta.color }}>{meta.label}</p>
        <p className="text-xs text-muted mt-1">Basado en RIR, volumen y frecuencia de la última semana</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{analysis.avgRirThis !== null ? analysis.avgRirThis.toFixed(1) : '—'}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">RIR medio semana</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${analysis.volChangePct !== null && analysis.volChangePct > 20 ? 'text-warn' : 'text-ink'}`}>
            {analysis.volChangePct !== null ? `${analysis.volChangePct >= 0 ? '+' : ''}${analysis.volChangePct}%` : '—'}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Cambio volumen</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{analysis.sesionesThisWeek}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Sesiones semana</p>
        </div>
      </div>

      {analysis.riskReasons.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Por qué este nivel de riesgo</p>
          </div>
          <div className="divide-y divide-border/50">
            {analysis.riskReasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                <p className="text-sm text-ink/80">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.riskLevel !== 'bajo' && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink">💡 Recomendación</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {analysis.riskLevel === 'alto'
              ? 'Considera programar una semana de descarga (reducir volumen o intensidad) para que el cliente recupere.'
              : 'Vigila la evolución la próxima semana. Si el RIR sigue bajando, programa descanso adicional.'}
          </p>
        </div>
      )}
    </div>
  )
}
