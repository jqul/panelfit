import { useMemo } from 'react'
import { ClientData, TrainingLogs } from '../../types'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'
import { Zap, BarChart2 } from 'lucide-react'
import { buildConclusions } from '../../lib/conclusions'
import { ConclusionList } from './ConclusionList'
import { localDateKey } from '../../lib/dates'

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
    const key = localDateKey(d)
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
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/8 flex items-center justify-center mx-auto mb-5">
        <BarChart2 className="w-8 h-8 text-accent opacity-60" />
      </div>
      <p className="font-serif text-2xl font-bold mb-2">Los insights se generan solos</p>
      <p className="text-sm text-muted leading-relaxed mb-6">
        En cuanto añadas clientes y empiecen a registrar entrenamientos verás aquí adherencia, rachas, récords y alertas de inactividad — sin que tengas que hacer nada.
      </p>
      <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
        {[
          { n: '1', t: 'Añade un cliente', d: 'Nombre, objetivo y ya está dado de alta.' },
          { n: '2', t: 'Asígnale un plan', d: 'Usa una plantilla o créala desde cero en menos de 2 min.' },
          { n: '3', t: 'Envíale el enlace', d: 'El cliente empieza a entrenar y los datos fluyen aquí automáticamente.' },
        ].map(({ n, t, d }) => (
          <div key={n} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
            <div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const mediaAdherencia7 = stats.length ? Math.round(stats.reduce((a, s) => a + s.adherencia7, 0) / stats.length) : 0
  const mediaAdherencia30 = stats.length ? Math.round(stats.reduce((a, s) => a + s.adherencia30, 0) / stats.length) : 0
  const mejorCliente = [...stats].sort((a, b) => b.adherencia30 - a.adherencia30)[0]

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
  const conclusiones = buildConclusions(conTendencia.map(s => ({
    id: s.client.id, name: s.client.name, adherencia7: s.adherencia7, diasSinEntrenar: s.diasSinEntrenar,
    racha: s.racha, mejora: s.mejora, esNuevo: s.client.createdAt >= Date.now() - 3 * 86400000,
  })))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-serif font-bold">Insights</h2>
        <p className="text-muted text-sm mt-1">Análisis de rendimiento de tu negocio</p>
      </div>

      {/* Conclusiones: lo que está pasando, en frases */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-4">Lo que importa esta semana</p>
        <ConclusionList items={conclusiones} />
        <p className="text-xs text-muted mt-5 pt-4 border-t border-border/50">
          Adherencia media: <span className="font-semibold text-ink">{mediaAdherencia7}%</span> en 7 días · <span className="font-semibold text-ink">{mediaAdherencia30}%</span> en 30 días
          {mejorCliente && mejorCliente.adherencia30 > 0 && <> · Más constante: <span className="font-semibold text-ink">{mejorCliente.client.name} {mejorCliente.client.surname}</span> ({mejorCliente.adherencia30}% este mes)</>}
        </p>
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
                  <p className="text-[11px] text-muted capitalize">{dia.slice(0, 3)}</p>
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
                <p className="text-[11px] text-muted">30 días</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
