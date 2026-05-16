import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'
import { TrendingUp, Users, Zap, Target, Award, Calendar, Download } from 'lucide-react'

interface Props {
  trainerId: string
  clients: ClientData[]
  logsMap: Record<string, any>
  planName?: string | null
}

interface WeekStats {
  week: string
  sessions: number
  activeClients: number
}

export function BusinessDashboard({ trainerId, clients, logsMap, planName }: Props) {
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('survey_responses')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('completed_at', { ascending: false })
      .then(({ data }) => { if (data) setSurveys(data); setLoading(false) })
  }, [trainerId])

  // ── Métricas principales ──────────────────────────────
  const metrics = useMemo(() => {
    const now = Date.now()
    const msPerDay = 86400000
    const haceUnaS = now - 7 * msPerDay
    const hace2S = now - 14 * msPerDay

    // Sesiones esta semana vs semana pasada
    let sessionsThisWeek = 0
    let sessionsLastWeek = 0
    let activeThisWeek = new Set<string>()
    let activeLastWeek = new Set<string>()

    Object.entries(logsMap).forEach(([clientId, logs]) => {
      Object.values(logs as any).forEach((log: any) => {
        if (!log.done || !log.dateDone) return
        const d = new Date(log.dateDone + 'T00:00:00').getTime()
        if (d >= haceUnaS) { sessionsThisWeek++; activeThisWeek.add(clientId) }
        else if (d >= hace2S) { sessionsLastWeek++; activeLastWeek.add(clientId) }
      })
    })

    // Tasa de completado (clientes que entrenaron esta semana / total)
    const completionRate = clients.length
      ? Math.round((activeThisWeek.size / clients.length) * 100)
      : 0

    // Clientes inactivos >7 días
    const inactive = clients.filter(c => {
      const logs = logsMap[c.id] || {}
      const dates = Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone)
      if (!dates.length) return true
      const last = dates.sort().reverse()[0] as string
      return new Date(last + 'T00:00:00').getTime() < haceUnaS
    })

    // Clientes con plan asignado
    const withPlan = clients.filter(c => (c as any).hasPlan).length

    // NPS de encuestas (media de energía última semana)
    const recentSurveys = surveys.filter(s => s.completed_at > haceUnaS)
    const avgEnergy = recentSurveys.length
      ? recentSurveys.reduce((acc, s) => acc + (s.answers?.q1 || 0), 0) / recentSurveys.length
      : null

    // Tendencia sesiones
    const trend = sessionsLastWeek > 0
      ? Math.round(((sessionsThisWeek - sessionsLastWeek) / sessionsLastWeek) * 100)
      : null

    // Últimas 8 semanas de actividad
    const weeklyData: WeekStats[] = []
    for (let w = 7; w >= 0; w--) {
      const from = now - (w + 1) * 7 * msPerDay
      const to   = now - w * 7 * msPerDay
      let sessions = 0
      const active = new Set<string>()
      Object.entries(logsMap).forEach(([clientId, logs]) => {
        Object.values(logs as any).forEach((log: any) => {
          if (!log.done || !log.dateDone) return
          const d = new Date(log.dateDone + 'T00:00:00').getTime()
          if (d >= from && d < to) { sessions++; active.add(clientId) }
        })
      })
      const date = new Date(to)
      weeklyData.push({
        week: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        sessions,
        activeClients: active.size,
      })
    }

    return {
      sessionsThisWeek, sessionsLastWeek, trend,
      activeThisWeek: activeThisWeek.size,
      completionRate, inactive: inactive.length,
      withPlan, avgEnergy, weeklyData, recentSurveys: recentSurveys.length,
    }
  }, [clients, logsMap, surveys])

  // Exportar CSV
  const exportCSV = () => {
    const rows = [
      ['Cliente', 'Última sesión', 'Sesiones semana', 'Tiene plan', 'Energía media'],
      ...clients.map(c => {
        const logs = logsMap[c.id] || {}
        const dates = Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone as string).sort().reverse()
        const clientSurveys = surveys.filter(s => s.client_id === c.id)
        const avgE = clientSurveys.length
          ? (clientSurveys.reduce((a, s) => a + (s.answers?.q1 || 0), 0) / clientSurveys.length).toFixed(1)
          : '—'
        const haceUnaS = Date.now() - 7 * 86400000
        const sessW = Object.values(logs).filter((l: any) =>
          l.done && l.dateDone && new Date(l.dateDone + 'T00:00:00').getTime() >= haceUnaS
        ).length
        return [
          `${c.name} ${c.surname}`,
          dates[0] || '—',
          sessW,
          (c as any).hasPlan ? 'Sí' : 'No',
          avgE,
        ]
      })
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `panelfit_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const maxSessions = Math.max(...metrics.weeklyData.map(w => w.sessions), 1)

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Mi negocio</h2>
          <p className="text-muted text-sm mt-1">Métricas de rendimiento de tu cartera de clientes</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Clientes activos',
            value: `${metrics.activeThisWeek}/${clients.length}`,
            sub: 'esta semana',
            icon: <Users className="w-4 h-4 text-accent" />,
            color: 'text-accent',
          },
          {
            label: 'Sesiones',
            value: metrics.sessionsThisWeek,
            sub: metrics.trend !== null
              ? `${metrics.trend >= 0 ? '+' : ''}${metrics.trend}% vs semana anterior`
              : 'esta semana',
            icon: <Zap className="w-4 h-4 text-ok" />,
            color: 'text-ok',
          },
          {
            label: 'Tasa completado',
            value: `${metrics.completionRate}%`,
            sub: 'clientes que entrenaron',
            icon: <Target className="w-4 h-4 text-warn" />,
            color: metrics.completionRate >= 70 ? 'text-ok' : metrics.completionRate >= 40 ? 'text-warn' : 'text-red-500',
          },
          {
            label: 'Inactivos',
            value: metrics.inactive,
            sub: 'más de 7 días sin entreno',
            icon: <Calendar className="w-4 h-4 text-muted" />,
            color: metrics.inactive === 0 ? 'text-ok' : 'text-warn',
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">{kpi.label}</p>
              {kpi.icon}
            </div>
            <p className={`text-2xl font-serif font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Gráfica de sesiones 8 semanas ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold text-sm">Sesiones por semana</h3>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded-full inline-block"/> Sesiones</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {metrics.weeklyData.map((w, i) => {
            const h = Math.max(4, (w.sessions / maxSessions) * 100)
            const isLast = i === metrics.weeklyData.length - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[9px] text-muted">{w.sessions > 0 ? w.sessions : ''}</p>
                <div className="w-full rounded-lg transition-all"
                  style={{ height: `${h}%`, backgroundColor: isLast ? 'var(--color-accent)' : 'var(--color-bg-alt)', minHeight: 4 }} />
                <p className="text-[9px] text-muted text-center leading-tight">{w.week}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bienestar clientes ── */}
      {metrics.avgEnergy !== null && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-ok" />
            <h3 className="font-serif font-bold text-sm">Bienestar de clientes esta semana</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-serif font-bold text-ok">{metrics.avgEnergy!.toFixed(1)}</p>
              <p className="text-xs text-muted">Energía media /10</p>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-bg-alt rounded-full overflow-hidden">
                  <div className="h-full bg-ok rounded-full" style={{ width: `${(metrics.avgEnergy! / 10) * 100}%` }} />
                </div>
                <span className="text-xs text-muted w-16">{metrics.recentSurveys} respuesta{metrics.recentSurveys !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-muted">
                {metrics.avgEnergy! >= 7 ? '😊 Tus clientes tienen buena energía esta semana' :
                 metrics.avgEnergy! >= 5 ? '😐 Energía moderada — revisa si alguien necesita ajustes' :
                 '😟 Energía baja — considera reducir la intensidad esta semana'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Estado por cliente ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-serif font-bold text-sm">Estado por cliente</h3>
        </div>
        <div className="divide-y divide-border">
          {clients.length === 0 ? (
            <p className="px-5 py-8 text-center text-muted text-sm">Sin clientes todavía</p>
          ) : clients.map(c => {
            const logs = logsMap[c.id] || {}
            const dates = Object.values(logs)
              .filter((l: any) => l.done && l.dateDone)
              .map((l: any) => l.dateDone as string)
              .sort().reverse()
            const lastDate = dates[0]
            const haceUnaS = Date.now() - 7 * 86400000
            const sessW = Object.values(logs).filter((l: any) =>
              l.done && l.dateDone &&
              new Date(l.dateDone + 'T00:00:00').getTime() >= haceUnaS
            ).length
            const isInactive = !lastDate || new Date(lastDate + 'T00:00:00').getTime() < haceUnaS
            const clientSurveys = surveys.filter(s => s.client_id === c.id)
            const lastSurvey = clientSurveys[0]

            return (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isInactive ? 'bg-warn' : sessW >= 3 ? 'bg-ok' : 'bg-accent'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                  <p className="text-xs text-muted">
                    {lastDate
                      ? `Última sesión: ${new Date(lastDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                      : 'Sin sesiones registradas'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <div className="text-right">
                    <p className="text-sm font-bold">{sessW}</p>
                    <p className="text-[10px] text-muted">sesiones/sem</p>
                  </div>
                  {lastSurvey && (
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        lastSurvey.answers?.q1 >= 7 ? 'text-ok' :
                        lastSurvey.answers?.q1 >= 5 ? 'text-warn' : 'text-red-500'
                      }`}>{lastSurvey.answers?.q1}/10</p>
                      <p className="text-[10px] text-muted">energía</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Resumen quick ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ok/5 border border-ok/20 rounded-2xl p-4">
          <p className="text-xs text-muted mb-1">Con plan asignado</p>
          <p className="text-2xl font-serif font-bold text-ok">{metrics.withPlan}/{clients.length}</p>
          <div className="mt-2 h-1.5 bg-bg-alt rounded-full overflow-hidden">
            <div className="h-full bg-ok rounded-full" style={{ width: `${clients.length ? (metrics.withPlan / clients.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
          <p className="text-xs text-muted mb-1">Encuestas respondidas</p>
          <p className="text-2xl font-serif font-bold text-accent">{surveys.length}</p>
          <p className="text-xs text-muted mt-1">total histórico</p>
        </div>
      </div>
    </div>
  )
}
