import { TrainingLogs } from '../../types'
import { getBadgeProgress } from '../../lib/badges'

export function BadgesWidget({ logs }: { logs: TrainingLogs }) {
  const { earned, nextStreak, nextSessions } = getBadgeProgress(logs)
  if (!earned.length && !nextStreak && !nextSessions) return null

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Logros</p>
        </div>
        <div className="p-4 space-y-3">
          {earned.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {earned.map(b => (
                <span key={b.id} title={b.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-semibold">
                  <span className="text-base">{b.emoji}</span> {b.label}
                </span>
              ))}
            </div>
          )}
          {(nextStreak || nextSessions) && (
            <div className="space-y-2">
              {nextStreak && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1">
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
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1">
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
      </div>
    </div>
  )
}
