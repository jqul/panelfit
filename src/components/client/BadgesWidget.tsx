import { TrainingLogs, TrainingPlan } from '../../types'
import { getBadgeProgress } from '../../lib/badges'
import { hitosConseguidos } from '../../lib/hitos'

// Logros: hitos (primer entreno, récords, toneladas, semanas completas, test de RM, competición — lib/hitos), insignias
// de racha y de sesiones (lib/badges) y lo próximo que está por conseguir. En Hoy del cliente y, con `enFicha`, en el
// Resumen de su ficha del entrenador.
export function BadgesWidget({ logs, plan, enFicha = false }: { logs: TrainingLogs; plan?: TrainingPlan | null; enFicha?: boolean }) {
  const { earned, nextStreak, nextSessions } = getBadgeProgress(logs)
  const hitos = hitosConseguidos(logs, plan)
  if (!hitos.length && !earned.length && !nextStreak && !nextSessions) return null

  return (
    <div className={enFicha ? '' : 'px-4 pt-4'}>
      <section aria-label="Logros" className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Logros</p>
        </div>
        <div className="p-4 space-y-3">
          {(hitos.length > 0 || earned.length > 0) && (
            <ul className="flex flex-wrap gap-2" aria-label="Logros conseguidos">
              {hitos.map(h => (
                <li key={h.id} title={h.detalle}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ok/10 text-ok rounded-full text-xs font-semibold">
                  <span className="text-base" aria-hidden>{h.emoji}</span> {h.label}
                </li>
              ))}
              {earned.map(b => (
                <li key={b.id} title={b.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-semibold">
                  <span className="text-base" aria-hidden>{b.emoji}</span> {b.label}
                </li>
              ))}
            </ul>
          )}
          {(nextStreak || nextSessions) && (
            <div className="space-y-2">
              {nextStreak && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                    <span>Próximo: {nextStreak.badge.emoji} {nextStreak.badge.label}</span>
                    <span>{nextStreak.current}/{nextStreak.badge.threshold}</span>
                  </div>
                  <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (nextStreak.current / nextStreak.badge.threshold) * 100)}%` }} />
                  </div>
                </div>
              )}
              {nextSessions && (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                    <span>Próximo: {nextSessions.badge.emoji} {nextSessions.badge.label}</span>
                    <span>{nextSessions.current}/{nextSessions.badge.threshold}</span>
                  </div>
                  <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-ok transition-all" style={{ width: `${Math.min(100, (nextSessions.current / nextSessions.badge.threshold) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
