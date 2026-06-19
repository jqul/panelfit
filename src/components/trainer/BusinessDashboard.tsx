import { useMemo } from 'react'
import { ClientData } from '../../types'
import { TrendingUp, Users, CheckCircle2, BarChart2 } from 'lucide-react'

interface Props {
  trainerId: string
  clients: ClientData[]
  logsMap: Record<string, any>
  planName?: string
}

export function BusinessDashboard({ clients, logsMap, planName }: Props) {
  const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)

  const stats = useMemo(() => {
    let sesiones30d = 0
    let clientesActivos = 0

    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dates = [...new Set(
        Object.values(logs)
          .filter((l: any) => l.dateDone)
          .map((l: any) => l.dateDone as string)
      )]
      const recientes = dates.filter(d => new Date(d) >= hace30)
      sesiones30d += recientes.length
      if (recientes.length > 0) clientesActivos++
    })

    const retencion = clients.length > 0
      ? Math.round((clientesActivos / clients.length) * 100)
      : 0

    return { sesiones30d, clientesActivos, retencion }
  }, [clients, logsMap])

  const KPIs = [
    { label: 'Clientes totales',   value: clients.length,        icon: Users,        color: 'text-accent', border: '#6e5438' },
    { label: 'Sesiones (30 días)', value: stats.sesiones30d,     icon: CheckCircle2, color: 'text-ok',     border: '#4caf7d' },
    { label: 'Clientes activos',   value: stats.clientesActivos, icon: TrendingUp,   color: 'text-ok',     border: '#4caf7d' },
    { label: 'Retención',          value: `${stats.retencion}%`, icon: BarChart2,    color: 'text-accent', border: '#6e5438' },
  ]

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-serif font-bold">Mi negocio</h2>
        <p className="text-muted text-sm mt-1">Métricas de tu actividad como entrenador</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIs.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm overflow-hidden relative"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: border }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 mt-1"
              style={{ backgroundColor: border + '15' }}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-4xl font-serif font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-serif font-bold">Actividad por cliente (últimos 30 días)</h3>
        </div>
        <div className="divide-y divide-border/50">
          {clients.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Sin datos aún</p>
            </div>
          ) : clients.map(c => {
            const logs = logsMap[c.id] || {}
            const dates = [...new Set(
              Object.values(logs)
                .filter((l: any) => l.dateDone)
                .map((l: any) => l.dateDone as string)
            )]
            const sesiones = dates.filter(d => new Date(d) >= hace30).length
            const ultima = dates.sort().reverse()[0]
            const pct = Math.min(100, Math.round((sesiones / 12) * 100))
            const barColor = sesiones >= 8 ? '#4caf7d' : sesiones >= 4 ? '#e0a854' : '#e07b54'

            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name} {c.surname}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-bg-alt rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: barColor }}>{sesiones} ses.</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted">Última sesión</p>
                  <p className="text-xs font-semibold">
                    {ultima
                      ? new Date(ultima + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                      : '—'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {planName && (
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink">Plan activo: <span className="text-accent capitalize">{planName}</span></p>
          <p className="text-xs text-muted mt-1">Gestiona tu suscripción desde ajustes o contacta con soporte.</p>
        </div>
      )}
    </div>
  )
}
