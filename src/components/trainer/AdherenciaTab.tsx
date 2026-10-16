import { useMemo, useState } from 'react'
import { ClientData, TrainingLogs } from '../../types'
import { getNudge, Objetivo } from '../../lib/nudges'
import { TrendingUp, TrendingDown, Minus, MessageCircle, Bell, CheckCircle2, Clock } from 'lucide-react'
import { buildConclusions, rankAdherence, ConclusionRow } from '../../lib/conclusions'
import { ConclusionList } from './ConclusionList'
import { localDateKey } from '../../lib/dates'

interface ClientStats {
  client: ClientData
  diasEntrenados: number
  adherencia: number
  compliance30: number
  compliance90: number
  needsAttention: boolean
  racha: number
  ultimoEntreno: string | null
  diasSinEntrenar: number
  tendencia: 'up' | 'down' | 'stable'
  mejora: number  // días entrenados en los últimos 7 menos los 7 anteriores
}

// Cuántos días de entreno se esperan en una ventana de N días — misma referencia de
// 4 días/semana que ya usa el resto del panel (adherenciaMap en useClientStats.ts).
const EXPECTED_DAYS_PER_WEEK = 4
function complianceForWindow(diasEnVentana: number, ventanaDias: number): number {
  const esperados = Math.max(1, Math.round(EXPECTED_DAYS_PER_WEEK * (ventanaDias / 7)))
  return Math.min(100, Math.round((diasEnVentana / esperados) * 100))
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
  const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30)
  const hace90 = new Date(hoy); hace90.setDate(hace90.getDate() - 90)

  const diasUltimos7 = fechas.filter(f => new Date(f) >= hace7).length
  const diasAntes7 = fechas.filter(f => new Date(f) >= hace14 && new Date(f) < hace7).length
  const diasUltimos30 = fechas.filter(f => new Date(f) >= hace30).length
  const diasUltimos90 = fechas.filter(f => new Date(f) >= hace90).length

  const tendencia: 'up' | 'down' | 'stable' =
    diasUltimos7 > diasAntes7 ? 'up' : diasUltimos7 < diasAntes7 ? 'down' : 'stable'

  // "Needs attention" — caída brusca de cumplimiento (no solo inactividad total):
  // compara el cumplimiento de los últimos 7 días contra los 7 anteriores.
  const complianceAntes7 = complianceForWindow(diasAntes7, 7)
  const complianceUltimos7 = complianceForWindow(diasUltimos7, 7)
  const needsAttention = complianceAntes7 - complianceUltimos7 >= 20

  // Racha
  let racha = 0
  const fechaSet = new Set(fechas)
  const d = new Date(hoy)
  while (true) {
    const key = localDateKey(d)
    if (fechaSet.has(key)) { racha++; d.setDate(d.getDate() - 1) } else break
  }

  // Días sin entrenar
  const ultimoEntreno = fechas[fechas.length - 1] || null
  const diasSinEntrenar = ultimoEntreno
    ? Math.floor((hoy.getTime() - new Date(ultimoEntreno + 'T00:00:00').getTime()) / 86400000)
    : client.createdAt
      ? Math.floor((hoy.getTime() - client.createdAt) / 86400000)
      : 0  // cliente nuevo sin entrenos: contar desde creación

  return {
    client, diasEntrenados: diasUltimos7, adherencia: Math.round(diasUltimos7 / 7 * 100),
    compliance30: complianceForWindow(diasUltimos30, 30), compliance90: complianceForWindow(diasUltimos90, 90),
    needsAttention, racha, ultimoEntreno, diasSinEntrenar, tendencia, mejora: diasUltimos7 - diasAntes7,
  }
}

function getWhatsAppMsg(client: ClientData, stats: ClientStats, tipo: 'recordatorio' | 'checkin'): string {
  const url = `${window.location.origin}?c=${client.token}`
  const encuestaUrl = `${window.location.origin}?c=${client.token}&encuesta=1`
  const objetivo = (client.objetivo as Objetivo) || 'general'
  const ctx = { clientName: client.name, diasSinEntrenar: stats.diasSinEntrenar, racha: stats.racha, adherencia: stats.adherencia, url }
  if (tipo === 'recordatorio') return getNudge('recordatorio', objetivo, ctx)
  return getNudge('checkin', objetivo, { ...ctx, url: encuestaUrl })
}

export function AdherenciaTab({ clients, logsMap }: Props) {
  const [enviados, setEnviados] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<'todos' | 'riesgo' | 'atencion' | 'ok'>('todos')

  const stats = useMemo(() =>
    clients.map(c => calcStats(c, logsMap[c.id] || {}))
      .sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar),
    [clients, logsMap]
  )

  const enRiesgo = stats.filter(s => s.diasSinEntrenar >= 3 && s.client.createdAt < Date.now() - 3 * 86400000)
  const necesitanAtencion = stats.filter(s => s.needsAttention)
  const rows: ConclusionRow[] = useMemo(() => stats.map(s => ({
    id: s.client.id, name: s.client.name, adherencia7: s.adherencia, diasSinEntrenar: s.diasSinEntrenar,
    racha: s.racha, mejora: s.mejora, esNuevo: s.client.createdAt >= Date.now() - 3 * 86400000,
  })), [stats])
  const conclusiones = useMemo(() => buildConclusions(rows), [rows])
  const { mejores, atencion, media: mediaAdherencia } = useMemo(() => rankAdherence(rows), [rows])
  const byId = useMemo(() => new Map(stats.map(s => [s.client.id, s])), [stats])

  const filtered = filtro === 'riesgo' ? enRiesgo : filtro === 'atencion' ? necesitanAtencion : filtro === 'ok' ? stats.filter(s => s.adherencia >= 70) : stats

  const sendWhatsApp = (client: ClientData, stats: ClientStats, tipo: 'recordatorio' | 'checkin') => {
    const msg = getWhatsAppMsg(client, stats, tipo)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    setEnviados(prev => new Set([...prev, `${client.id}_${tipo}`]))
  }

  if (!clients.length) return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/8 flex items-center justify-center mx-auto mb-5">
        <TrendingUp className="w-8 h-8 text-accent opacity-60" />
      </div>
      <p className="font-serif text-2xl font-bold mb-2">Seguimiento de adherencia</p>
      <p className="text-sm text-muted leading-relaxed mb-6">
        Aquí verás qué clientes están en racha, cuáles llevan días sin entrenar y mensajes automáticos de motivación que puedes enviar con un clic.
      </p>
      <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-2.5">
        {[
          { icon: '🔥', t: 'Rachas y cumplimiento', d: 'Cumplimiento en ventanas de 7, 30 y 90 días por cliente.' },
          { icon: '⚠️', t: 'Alertas de inactividad y caídas', d: 'Detecta clientes sin actividad y también caídas bruscas de cumplimiento, aunque sigan entrenando algo.' },
          { icon: '💬', t: 'Mensajes con un clic', d: 'Envía un recordatorio personalizado por WhatsApp directo desde aquí.' },
        ].map(({ icon, t, d }) => (
          <div key={t} className="flex items-start gap-3">
            <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
            <div>
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-serif font-bold">Adherencia</h2>
        <p className="text-muted text-sm mt-1">Seguimiento y recordatorios automáticos</p>
      </div>

      {/* Resumen: un número y qué hacer con él */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-end gap-4 flex-wrap mb-5">
          <p className={`text-5xl font-serif font-bold leading-none ${mediaAdherencia >= 70 ? 'text-ok' : mediaAdherencia >= 40 ? 'text-accent' : 'text-warn'}`}>
            {mediaAdherencia}%
          </p>
          <p className="text-sm text-muted pb-1">adherencia media de tus clientes los últimos 7 días</p>
        </div>
        <ConclusionList items={conclusiones} />
      </div>

      {(atencion.length > 0 || mejores.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { titulo: 'Necesitan atención', lista: atencion, vacio: 'Nadie por ahora', tono: 'text-warn' },
            { titulo: 'Mejores esta semana', lista: mejores, vacio: 'Aún sin datos', tono: 'text-ok' },
          ].map(col => (
            <div key={col.titulo} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3">{col.titulo}</p>
              {col.lista.length === 0 ? (
                <p className="text-sm text-muted">{col.vacio}</p>
              ) : (
                <ul className="space-y-2.5">
                  {col.lista.map(r => {
                    const s = byId.get(r.id)
                    return (
                      <li key={r.id} className="flex items-center gap-3">
                        <span className="flex-1 min-w-0 text-sm font-semibold truncate">{s?.client.name} {s?.client.surname}</span>
                        {col.titulo === 'Necesitan atención' && r.diasSinEntrenar >= 3 && (
                          <span className="text-xs text-muted flex-shrink-0">{r.diasSinEntrenar === 999 ? 'sin entrenar' : `${r.diasSinEntrenar} días sin entrenar`}</span>
                        )}
                        <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${col.tono}`}>{r.adherencia7}%</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recordatorio masivo */}
      {enRiesgo.length > 0 && (
        <div className="bg-warn/5 border border-warn/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-warn" />
            <p className="text-sm font-bold">{enRiesgo.length} {enRiesgo.length === 1 ? 'cliente lleva' : 'clientes llevan'} +3 días sin entrenar</p>
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
        {([
          { id: 'todos', label: `Todos (${stats.length})` },
          { id: 'riesgo', label: `En riesgo (${enRiesgo.length})` },
          { id: 'atencion', label: `⚠️ En caída (${necesitanAtencion.length})` },
          { id: 'ok', label: `Buena adherencia` },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
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
                    <span className="text-[11px] text-accent font-semibold">🔥 {s.racha} racha</span>
                  )}
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                    esCritico ? 'text-warn' : esRiesgo ? 'text-accent' : 'text-ok'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {s.diasSinEntrenar === 999 ? 'Sin datos' :
                     s.diasSinEntrenar === 0 ? 'Entrenó hoy' :
                     s.diasSinEntrenar === 1 ? 'Ayer' :
                     `${s.diasSinEntrenar} días sin entrenar`}
                  </span>
                  {s.needsAttention && (
                    <span className="text-[11px] text-warn font-bold">⚠️ Cumplimiento en caída</span>
                  )}
                </div>
              </div>

              {/* Barra + % */}
              <div className="w-24 flex-shrink-0 hidden sm:block">
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
                <p className="text-[11px] text-muted mt-1">30d: {s.compliance30}% · 90d: {s.compliance90}%</p>
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
