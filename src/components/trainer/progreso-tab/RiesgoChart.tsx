import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Moon } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { computeTrainingSignal, computeReadinessSignal, combineRisk } from '../../../lib/loadRisk'
import { EmptyState } from './helpers'

const RISK_META = {
  bajo: { color: '#22c55e', bg: '#f0fdf4', label: 'Riesgo bajo', emoji: '✅' },
  moderado: { color: '#f59e0b', bg: '#fffbeb', label: 'Riesgo moderado', emoji: '⚠️' },
  alto: { color: '#ef4444', bg: '#fef2f2', label: 'Riesgo alto', emoji: '🚨' },
}

export function RiesgoChart({ clientId, logs }: { clientId: string; logs: TrainingLogs }) {
  const [readinessRows, setReadinessRows] = useState<{ sleep: number; soreness: number; stress: number; motivation: number }[]>([])
  const [loadingReadiness, setLoadingReadiness] = useState(true)

  useEffect(() => {
    const since = new Date(); since.setDate(since.getDate() - 7)
    supabase.from('readiness_checkins').select('sleep, soreness, stress, motivation')
      .eq('clientId', clientId).gte('date', since.toISOString().split('T')[0])
      .then(({ data }) => { setReadinessRows(data || []); setLoadingReadiness(false) })
  }, [clientId])

  const training = useMemo(() => computeTrainingSignal(logs), [logs])
  const readiness = useMemo(() => computeReadinessSignal(readinessRows), [readinessRows])
  const { level, reasons } = useMemo(() => combineRisk(training, readiness), [training, readiness])

  if (loadingReadiness) return <div className="py-8 text-center text-muted text-sm">Calculando...</div>

  if (!training.hasData && !readiness.hasData) return (
    <EmptyState icon={<AlertTriangle className="w-8 h-8 opacity-30" />} text="Sin datos suficientes"
      sub="Necesita RIR registrado o check-ins de readiness en la última semana" />
  )

  const meta = RISK_META[level]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: meta.bg }}>
        <p className="text-3xl mb-1">{meta.emoji}</p>
        <p className="text-xl font-serif font-bold" style={{ color: meta.color }}>{meta.label}</p>
        <p className="text-xs text-muted mt-1">Combina carga de entrenamiento (RIR, volumen, frecuencia) y bienestar (sueño, dolor, estrés, motivación)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Entrenamiento</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted">RIR medio</span><span className="font-bold">{training.avgRirThis !== null ? training.avgRirThis.toFixed(1) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Cambio volumen</span><span className="font-bold">{training.volChangePct !== null ? `${training.volChangePct >= 0 ? '+' : ''}${training.volChangePct}%` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Sesiones/sem</span><span className="font-bold">{training.sesionesThisWeek}</span></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1"><Moon className="w-3 h-3" /> Bienestar</p>
          {readiness.hasData ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted">Sueño</span><span className="font-bold">{readiness.avgSleep}/5</span></div>
              <div className="flex justify-between"><span className="text-muted">Sin dolor</span><span className="font-bold">{readiness.avgSoreness}/5</span></div>
              <div className="flex justify-between"><span className="text-muted">Motivación</span><span className="font-bold">{readiness.avgMotivation}/5</span></div>
            </div>
          ) : (
            <p className="text-xs text-muted">Sin check-ins recientes</p>
          )}
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Por qué este nivel de riesgo</p>
          </div>
          <div className="divide-y divide-border/50">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                <p className="text-sm text-ink/80">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {level !== 'bajo' && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink">💡 Recomendación</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {level === 'alto'
              ? 'Considera programar una semana de descarga o reducir intensidad/volumen para que el cliente recupere.'
              : 'Vigila la evolución la próxima semana. Si los indicadores no mejoran, programa descanso adicional.'}
          </p>
        </div>
      )}
    </div>
  )
}
