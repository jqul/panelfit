import { useMemo } from 'react'
import { TrainingLogs } from '../../../types'
import { getBadgeProgress } from '../../../lib/badges'

export function RachaStats({ logs }: { logs: TrainingLogs }) {
  const stats = useMemo(() => {
    const dates = [...new Set(Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone as string))].sort()
    if (!dates.length) return null
    let rachaActual = 0
    const hoy = new Date().toISOString().split('T')[0]
    const checkDate = new Date()
    let checking = true
    while (checking) {
      const ds = checkDate.toISOString().split('T')[0]
      if (dates.includes(ds)) { rachaActual++; checkDate.setDate(checkDate.getDate() - 1) }
      else if (ds === hoy) { checkDate.setDate(checkDate.getDate() - 1) }
      else checking = false
    }
    let maxRacha = 0, tempRacha = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]+'T00:00:00').getTime() - new Date(dates[i-1]+'T00:00:00').getTime()) / 86400000
      if (diff === 1) { tempRacha++; maxRacha = Math.max(maxRacha, tempRacha) } else tempRacha = 1
    }
    maxRacha = Math.max(maxRacha, tempRacha)
    const diasTotal = Math.round((new Date(dates[dates.length-1]+'T00:00:00').getTime() - new Date(dates[0]+'T00:00:00').getTime()) / 86400000) + 1
    const frecuencia = diasTotal > 0 ? Math.round((dates.length / diasTotal) * 7 * 10) / 10 : 0
    return { rachaActual, maxRacha, totalSesiones: dates.length, frecuencia, primera: dates[0], ultima: dates[dates.length-1] }
  }, [logs])

  const { earned } = useMemo(() => getBadgeProgress(logs), [logs])

  if (!stats) return <div className="text-center py-8 text-muted text-sm">Sin sesiones registradas aún</div>
  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {earned.map(b => (
            <span key={b.id} title={b.label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-semibold">
              <span className="text-base">{b.emoji}</span> {b.label}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Racha actual', value: `${stats.rachaActual}d`, icon: '🔥', color: stats.rachaActual >= 7 ? 'text-warn' : 'text-ok' },
          { label: 'Racha máxima', value: `${stats.maxRacha}d`, icon: '🏆', color: 'text-accent' },
          { label: 'Total sesiones', value: stats.totalSesiones, icon: '📅', color: 'text-ok' },
          { label: 'Frec. semanal', value: `${stats.frecuencia}d/sem`, icon: '📊', color: 'text-ink' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-bg rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className={`text-2xl font-serif font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-bg rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-muted">Primera sesión</span><span className="font-semibold">{new Date(stats.primera+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted">Última sesión</span><span className="font-semibold">{new Date(stats.ultima+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      </div>
    </div>
  )
}
