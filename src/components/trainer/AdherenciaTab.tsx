import { useMemo } from 'react'
import { ClientData, TrainingLogs, TrainingPlan } from '../../types'
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react'

interface ClientStats {
  client: ClientData
  diasEntrenados: number
  diasTotales: number
  adherencia: number
  racha: number
  ultimoEntreno: string | null
  tendencia: 'up' | 'down' | 'stable'
}

interface Props {
  clients: ClientData[]
  logsMap: Record<string, TrainingLogs>
  plansMap: Record<string, TrainingPlan>
}

function calcStats(client: ClientData, logs: TrainingLogs): ClientStats {
  const fechas = Object.values(logs)
    .filter(l => l.done && l.dateDone)
    .map(l => l.dateDone!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  const hoy = new Date()
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7)
  const hace14 = new Date(hoy); hace14.setDate(hace14.getDate() - 14)

  const diasUltimos7 = fechas.filter(f => new Date(f) >= hace7).length
  const diasAntes7 = fechas.filter(f => new Date(f) >= hace14 && new Date(f) < hace7).length

  const tendencia: 'up' | 'down' | 'stable' =
    diasUltimos7 > diasAntes7 ? 'up' :
    diasUltimos7 < diasAntes7 ? 'down' : 'stable'

  // Racha actual
  let racha = 0
  const fechaSet = new Set(fechas)
  let d = new Date(hoy)
  while (true) {
    const key = d.toISOString().split('T')[0]
    if (fechaSet.has(key)) { racha++; d.setDate(d.getDate() - 1) }
    else break
  }

  return {
    client,
    diasEntrenados: diasUltimos7,
    diasTotales: 7,
    adherencia: Math.round(diasUltimos7 / 7 * 100),
    racha,
    ultimoEntreno: fechas[fechas.length - 1] || null,
    tendencia,
  }
}

export function AdherenciaTab({ clients, logsMap, plansMap }: Props) {
  const stats = useMemo(() => {
    return clients
      .map(c => calcStats(c, logsMap[c.id] || {}))
      .sort((a, b) => b.adherencia - a.adherencia)
  }, [clients, logsMap])

  const top = stats.filter(s => s.adherencia >= 70)
  const atencion = stats.filter(s => s.adherencia < 30)
  const mediaAdherencia = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.adherencia, 0) / stats.length)
    : 0

  if (!clients.length) return (
    <div className="text-center py-16 text-muted">
      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin clientes aún</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold">Adherencia</h2>
        <p className="text-muted text-sm mt-1">Seguimiento semanal de todos tus clientes</p>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className={`text-3xl font-serif font-bold ${mediaAdherencia >= 70 ? 'text-ok' : mediaAdherencia >= 40 ? 'text-accent' : 'text-warn'}`}>
            {mediaAdherencia}%
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Media global</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-serif font-bold text-ok">{top.length}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Alta adherencia</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className={`text-3xl font-serif font-bold ${atencion.length > 0 ? 'text-warn' : 'text-ok'}`}>{atencion.length}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Necesitan atención</p>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-serif font-bold">Ranking semanal</h3>
          <p className="text-xs text-muted">Últimos 7 días</p>
        </div>
        <div className="divide-y divide-border">
          {stats.map((s, i) => (
            <div key={s.client.id} className="flex items-center gap-4 px-5 py-3">
              {/* Posición */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                i === 1 ? 'bg-gray-100 text-gray-600' :
                i === 2 ? 'bg-orange-100 text-orange-600' :
                'bg-bg-alt text-muted'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                {s.client.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.client.name} {s.client.surname}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted">{s.diasEntrenados}/7 días</p>
                  {s.racha > 1 && <p className="text-[10px] text-accent">🔥 {s.racha} racha</p>}
                  {s.ultimoEntreno && (
                    <p className="text-[10px] text-muted">
                      Último: {new Date(s.ultimoEntreno + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Barra adherencia */}
              <div className="w-24 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${
                    s.adherencia >= 70 ? 'text-ok' :
                    s.adherencia >= 40 ? 'text-accent' : 'text-warn'
                  }`}>{s.adherencia}%</span>
                  {s.tendencia === 'up' && <TrendingUp className="w-3 h-3 text-ok" />}
                  {s.tendencia === 'down' && <TrendingDown className="w-3 h-3 text-warn" />}
                  {s.tendencia === 'stable' && <Minus className="w-3 h-3 text-muted" />}
                </div>
                <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    s.adherencia >= 70 ? 'bg-ok' :
                    s.adherencia >= 40 ? 'bg-accent' : 'bg-warn'
                  }`} style={{ width: `${s.adherencia}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta clientes sin actividad */}
      {atencion.length > 0 && (
        <div className="bg-warn/5 border border-warn/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warn" />
            <h4 className="font-semibold text-sm">Clientes que necesitan atención</h4>
          </div>
          <div className="space-y-2">
            {atencion.map(s => (
              <div key={s.client.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                  {s.client.name[0]}
                </div>
                <p className="text-sm flex-1">{s.client.name} {s.client.surname}</p>
                <p className="text-xs text-warn font-semibold">{s.adherencia}%</p>
                <button onClick={() => {
                  const url = `${window.location.origin}?c=${s.client.token}`
                  const msg = encodeURIComponent(`Hola ${s.client.name} 👋 Te echamos de menos. ¡Vuelve a entrenar cuando puedas! 💪\n\n${url}`)
                  window.open(`https://wa.me/?text=${msg}`, '_blank')
                }} className="text-[11px] text-[#25D366] font-semibold hover:underline flex-shrink-0">
                  WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
