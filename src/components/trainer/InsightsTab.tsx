import { useMemo } from 'react'
import { ClientData, TrainingLogs, TrainingPlan } from '../../types'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'
import { TrendingUp, TrendingDown, Award, Users, Zap, AlertTriangle, BarChart2 } from 'lucide-react'

interface Props {
  clients: ClientData[]
  logsMap: Record<string, TrainingLogs>
  especialidades?: Especialidad[]
}

function calcClientStats(client: ClientData, logs: TrainingLogs) {
  const fechas = Object.values(logs)
    .filter(l => l.done && l.dateDone)
    .map(l => l.dateDone!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  const hoy = new Date()
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7)
  const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30)

  const diasUltimos7 = fechas.filter(f => new Date(f) >= hace7).length
  const diasUltimos30 = fechas.filter(f => new Date(f) >= hace30).length
  const totalEjerciciosHechos = Object.values(logs).filter(l => l.done).length

  const ultimoEntreno = fechas[fechas.length - 1] || null
  const diasSinEntrenar = ultimoEntreno
    ? Math.floor((hoy.getTime() - new Date(ultimoEntreno + 'T00:00:00').getTime()) / 86400000)
    : 999

  // Mejor peso por ejercicio
  const records: Record<string, number> = {}
  Object.values(logs).forEach(log => {
    Object.values(log.sets || {}).forEach((s: any) => {
      const w = parseFloat(s.weight) || 0
      if (w > 0) {
        const key = 'record'
        if (!records[key] || w > records[key]) records[key] = w
      }
    })
  })

  // Racha
  let racha = 0
  const fechaSet = new Set(fechas)
  const d = new Date(hoy)
  while (true) {
    const key = d.toISOString().split('T')[0]
    if (fechaSet.has(key)) { racha++; d.setDate(d.getDate() - 1) } else break
  }

  return {
    client, diasUltimos7, diasUltimos30, totalEjerciciosHechos,
    adherencia7: Math.round(diasUltimos7 / 7 * 100),
    adherencia30: Math.round(diasUltimos30 / 30 * 100),
    diasSinEntrenar, racha, ultimoEntreno, fechas
  }
}

export function InsightsTab({ clients, logsMap, especialidades = [] }: Props) {
  const stats = useMemo(() =>
    clients.map(c => calcClientStats(c, logsMap[c.id] || {})),
    [clients, logsMap]
  )

  if (!clients.length) return (
    <div className="text-center py-16 text-muted">
      <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin datos aún</p>
      <p className="text-sm mt-1">Los insights aparecerán cuando tus clientes empiecen a entrenar.</p>
    </div>
  )

  const mediaAdherencia7 = stats.length ? Math.round(stats.reduce((a, s) => a + s.adherencia7, 0) / stats.length) : 0
  const mediaAdherencia30 = stats.length ? Math.round(stats.reduce((a, s) => a + s.adherencia30, 0) / stats.length) : 0
  const totalEjercicios = stats.reduce((a, s) => a + s.totalEjerciciosHechos, 0)
  const enRiesgo = stats.filter(s => s.diasSinEntrenar >= 7)
  const mejorCliente = [...stats].sort((a, b) => b.adherencia30 - a.adherencia30)[0]
  const masConstante = [...stats].sort((a, b) => b.racha - a.racha)[0]

  // Día de la semana con más actividad
  const actividadPorDia: Record<string, number> = {}
  stats.forEach(s => {
    s.fechas.forEach(f => {
      const dia = new Date(f + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })
      actividadPorDia[dia] = (actividadPorDia[dia] || 0) + 1
    })
  })
  const diaMasActivo = Object.entries(actividadPorDia).sort((a, b) => b[1] - a[1])[0]

  // Clientes que más mejoran vs más bajan
  const conTendencia = stats.map(s => {
    const hace14 = new Date(); hace14.setDate(hace14.getDate() - 14)
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)
    const semana1 = s.fechas.filter(f => new Date(f) >= hace14 && new Date(f) < hace7).length
    const semana2 = s.fechas.filter(f => new Date(f) >= hace7).length
    return { ...s, mejora: semana2 - semana1 }
  })
  const masImproved = conTendencia.filter(s => s.mejora > 0).sort((a, b) => b.mejora - a.mejora)[0]
  const masDropped = conTendencia.filter(s => s.mejora < 0).sort((a, b) => a.mejora - b.mejora)[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-serif font-bold">Insights</h2>
        <p className="text-muted text-sm mt-1">Análisis de rendimiento de tu negocio</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Adherencia 7 días', value: `${mediaAdherencia7}%`, color: mediaAdherencia7 >= 60 ? 'text-ok' : 'text-warn', sub: 'media de todos' },
          { label: 'Adherencia 30 días', value: `${mediaAdherencia30}%`, color: mediaAdherencia30 >= 60 ? 'text-ok' : 'text-warn', sub: 'tendencia mensual' },
          { label: 'Ejercicios totales', value: totalEjercicios, color: 'text-accent', sub: 'completados en total' },
          { label: 'En riesgo abandono', value: enRiesgo.length, color: enRiesgo.length > 0 ? 'text-warn' : 'text-ok', sub: '+7 días sin entrenar' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <p className={`text-3xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mt-1">{s.label}</p>
            <p className="text-[10px] text-muted mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cliente estrella */}
        {mejorCliente && (
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-ok/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-ok" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Cliente más constante</p>
              <p className="font-serif font-bold text-lg mt-0.5">{mejorCliente.client.name} {mejorCliente.client.surname}</p>
              <p className="text-xs text-ok font-semibold">{mejorCliente.adherencia30}% adherencia este mes</p>
            </div>
          </div>
        )}

        {/* Mayor racha */}
        {masConstante && masConstante.racha > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-warn/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Mayor racha activa</p>
              <p className="font-serif font-bold text-lg mt-0.5">{masConstante.client.name} {masConstante.client.surname}</p>
              <p className="text-xs text-warn font-semibold">{masConstante.racha} días consecutivos</p>
            </div>
          </div>
        )}

        {/* Mejora semanal */}
        {masImproved && (
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Mejor mejora esta semana</p>
              <p className="font-serif font-bold text-lg mt-0.5">{masImproved.client.name} {masImproved.client.surname}</p>
              <p className="text-xs text-accent font-semibold">+{masImproved.mejora} días más que la semana anterior</p>
            </div>
          </div>
        )}

        {/* Bajada */}
        {masDropped && (
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-warn/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-6 h-6 text-warn" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Mayor caída esta semana</p>
              <p className="font-serif font-bold text-lg mt-0.5">{masDropped.client.name} {masDropped.client.surname}</p>
              <p className="text-xs text-warn font-semibold">{masDropped.mejora} días menos que la semana anterior</p>
            </div>
          </div>
        )}
      </div>

      {/* Día más activo */}
      {diaMasActivo && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-4 h-4 text-accent" />
            <h3 className="font-serif font-bold">Actividad por día de la semana</h3>
          </div>
          <div className="flex gap-2 items-end h-20">
            {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map(dia => {
              const count = actividadPorDia[dia] || 0
              const max = Math.max(...Object.values(actividadPorDia), 1)
              const h = Math.max(4, Math.round((count / max) * 64))
              const isMax = dia === diaMasActivo[0]
              return (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-lg transition-all ${isMax ? 'bg-accent' : 'bg-bg-alt border border-border'}`}
                    style={{ height: `${h}px` }} />
                  <p className="text-[9px] text-muted capitalize">{dia.slice(0, 3)}</p>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-3">
            El <span className="font-semibold text-ink capitalize">{diaMasActivo[0]}</span> es el día con más entrenamientos completados ({diaMasActivo[1]} sesiones).
          </p>
        </div>
      )}

      {/* KPIs por especialidad */}
      {especialidades.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-serif font-bold">Métricas relevantes para tu especialidad</h3>
          <div className="flex flex-wrap gap-2">
            {especialidades.map(esp => {
              const info = ESPECIALIDADES.find(e => e.value === esp)
              if (!info) return null
              return (
                <div key={esp} className="flex-1 min-w-[140px] bg-bg border border-border rounded-xl p-3">
                  <p className="text-sm font-semibold mb-2">{info.emoji} {info.label}</p>
                  <div className="space-y-1">
                    {info.kpis.map(kpi => (
                      <p key={kpi} className="text-xs text-muted flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {kpi}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-serif font-bold">Detalle por cliente</h3>
        </div>
        <div className="divide-y divide-border">
          {stats.sort((a, b) => b.adherencia30 - a.adherencia30).map((s, i) => (
            <div key={s.client.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
                i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-orange-600' : 'text-muted'
              }`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.client.name} {s.client.surname}</p>
                <p className="text-xs text-muted">{s.totalEjerciciosHechos} ejercicios · {s.racha > 0 ? `🔥 ${s.racha} racha` : 'sin racha'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${s.adherencia30 >= 60 ? 'text-ok' : s.adherencia30 >= 30 ? 'text-accent' : 'text-warn'}`}>
                  {s.adherencia30}%
                </p>
                <p className="text-[10px] text-muted">30 días</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
