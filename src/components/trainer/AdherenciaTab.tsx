import { useMemo, useState } from 'react'
import { ClientData, TrainingLogs, TrainingPlan } from '../../types'
import { getNudge, getConsejo, OBJETIVOS, Objetivo } from '../../lib/nudges'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, MessageCircle, Bell, CheckCircle2, Clock } from 'lucide-react'

interface ClientStats {
  client: ClientData
  diasEntrenados: number
  adherencia: number
  racha: number
  ultimoEntreno: string | null
  diasSinEntrenar: number
  tendencia: 'up' | 'down' | 'stable'
}

interface Props {
  clients: ClientData[]
  logsMap: Record<string, TrainingLogs>
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
    diasUltimos7 > diasAntes7 ? 'up' : diasUltimos7 < diasAntes7 ? 'down' : 'stable'

  // Racha
  let racha = 0
  const fechaSet = new Set(fechas)
  const d = new Date(hoy)
  while (true) {
    const key = d.toISOString().split('T')[0]
    if (fechaSet.has(key)) { racha++; d.setDate(d.getDate() - 1) } else break
  }

  // Días sin entrenar
  const ultimoEntreno = fechas[fechas.length - 1] || null
  const diasSinEntrenar = ultimoEntreno
    ? Math.floor((hoy.getTime() - new Date(ultimoEntreno + 'T00:00:00').getTime()) / 86400000)
    : 999

  return { client, diasEntrenados: diasUltimos7, adherencia: Math.round(diasUltimos7 / 7 * 100), racha, ultimoEntreno, diasSinEntrenar, tendencia }
}

function getWhatsAppMsg(client: ClientData, stats: ClientStats, tipo: 'recordatorio' | 'checkin'): string {
  const url = `${window.location.origin}?c=${client.token}`
  const encuestaUrl = `${window.location.origin}?c=${client.token}&encuesta=1`
  const objetivo = ((client as any).objetivo || 'general') as Objetivo
  const ctx = { clientName: client.name, diasSinEntrenar: stats.diasSinEntrenar, racha: stats.racha, adherencia: stats.adherencia, url }
  if (tipo === 'recordatorio') return getNudge('recordatorio', objetivo, ctx)
  return getNudge('checkin', objetivo, { ...ctx, url: encuestaUrl })
}

export function AdherenciaTab({ clients, logsMap }: Props) {
  const [enviados, setEnviados] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<'todos' | 'riesgo' | 'ok'>('todos')

  const stats = useMemo(() =>
    clients.map(c => calcStats(c, logsMap[c.id] || {}))
      .sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar),
    [clients, logsMap]
  )

  const enRiesgo = stats.filter(s => s.diasSinEntrenar >= 3)
  const conRacha = stats.filter(s => s.racha >= 3)
  const mediaAdherencia = stats.length
    ? Math.round(stats.reduce((a, s) => a + s.adherencia, 0) / stats.length) : 0

  const filtered = filtro === 'riesgo' ? enRiesgo : filtro === 'ok' ? stats.filter(s => s.adherencia >= 70) : stats

  const sendWhatsApp = (client: ClientData, stats: ClientStats, tipo: 'recordatorio' | 'checkin') => {
    const msg = getWhatsAppMsg(client, stats, tipo)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    setEnviados(prev => new Set([...prev, `${client.id}_${tipo}`]))
  }

  if (!clients.length) return (
    <div className="text-center py-16 text-muted">
      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin clientes aún</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-serif font-bold">Adherencia</h2>
        <p className="text-muted text-sm mt-1">Seguimiento y recordatorios automáticos</p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className={`text-3xl font-serif font-bold ${mediaAdherencia >= 70 ? 'text-ok' : mediaAdherencia >= 40 ? 'text-accent' : 'text-warn'}`}>
            {mediaAdherencia}%
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Media global</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-serif font-bold text-warn">{enRiesgo.length}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">En riesgo</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-3xl font-serif font-bold text-ok">{conRacha.length}</p>
          <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Con racha 🔥</p>
        </div>
      </div>

      {/* Recordatorio masivo */}
      {enRiesgo.length > 0 && (
        <div className="bg-warn/5 border border-warn/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-warn" />
            <p className="text-sm font-bold">{enRiesgo.length} clientes llevan +3 días sin entrenar</p>
          </div>
          <p className="text-xs text-muted">Envía un recordatorio personalizado a cada uno con un toque.</p>
          <div className="flex gap-2">
            <button onClick={() => {
              enRiesgo.forEach(s => sendWhatsApp(s.client, s, 'recordatorio'))
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90">
              <MessageCircle className="w-4 h-4" /> Recordatorio a todos
            </button>
            <button onClick={() => {
              enRiesgo.forEach(s => sendWhatsApp(s.client, s, 'checkin'))
            }}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-alt">
              📋 Check-in a todos
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
        {[
          { id: 'todos', label: `Todos (${stats.length})` },
          { id: 'riesgo', label: `En riesgo (${enRiesgo.length})` },
          { id: 'ok', label: `Buena adherencia` },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtro === f.id ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista clientes */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {filtered.map(s => {
          const sent = enviados.has(`${s.client.id}_recordatorio`)
          const sentCheckin = enviados.has(`${s.client.id}_checkin`)
          const esRiesgo = s.diasSinEntrenar >= 3
          const esCritico = s.diasSinEntrenar >= 7

          return (
            <div key={s.client.id} className="flex items-center gap-4 px-5 py-4">
              {/* Avatar + semáforo */}
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-bold ${
                  esCritico ? 'bg-warn/10 text-warn' : esRiesgo ? 'bg-accent/10 text-accent' : 'bg-ok/10 text-ok'
                }`}>{s.client.name[0]}</div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                  esCritico ? 'bg-warn' : esRiesgo ? 'bg-accent' : 'bg-ok'
                }`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.client.name} {s.client.surname}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {s.racha > 0 && (
                    <span className="text-[10px] text-accent font-semibold">🔥 {s.racha} racha</span>
                  )}
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                    esCritico ? 'text-warn' : esRiesgo ? 'text-accent' : 'text-ok'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {s.diasSinEntrenar === 999 ? 'Sin datos' :
                     s.diasSinEntrenar === 0 ? 'Entrenó hoy' :
                     s.diasSinEntrenar === 1 ? 'Ayer' :
                     `${s.diasSinEntrenar} días sin entrenar`}
                  </span>
                </div>
              </div>

              {/* Barra + % */}
              <div className="w-20 flex-shrink-0 hidden sm:block">
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-bold ${
                    s.adherencia >= 70 ? 'text-ok' : s.adherencia >= 40 ? 'text-accent' : 'text-warn'
                  }`}>{s.adherencia}%</span>
                  {s.tendencia === 'up' && <TrendingUp className="w-3 h-3 text-ok" />}
                  {s.tendencia === 'down' && <TrendingDown className="w-3 h-3 text-warn" />}
                  {s.tendencia === 'stable' && <Minus className="w-3 h-3 text-muted" />}
                </div>
                <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    s.adherencia >= 70 ? 'bg-ok' : s.adherencia >= 40 ? 'bg-accent' : 'bg-warn'
                  }`} style={{ width: `${s.adherencia}%` }} />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => sendWhatsApp(s.client, s, 'recordatorio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sent ? 'bg-ok/10 text-ok' : 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'
                  }`}>
                  {sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  {sent ? 'Enviado' : 'Recordar'}
                </button>
                <button onClick={() => sendWhatsApp(s.client, s, 'checkin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sentCheckin ? 'bg-ok/10 text-ok' : 'border border-border text-muted hover:border-accent hover:text-accent'
                  }`}>
                  {sentCheckin ? <CheckCircle2 className="w-3.5 h-3.5" /> : '📋'}
                  {sentCheckin ? 'Enviado' : 'Check-in'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
