import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { summarizeRunSessions, formatDistance, formatPace, formatDuration } from '../../../lib/run'
import { EmptyState } from './helpers'

// Carrera / pista: distancia por sesión (barras) y ritmo medio (línea, más
// arriba = más rápido) a partir de los tiempos que anota el cliente en cada
// tirada. Los tests de tiempo fijo (Cooper) salen aparte con sus metros.
export function CardioChart({ logs }: { logs: TrainingLogs }) {
  const sessions = useMemo(() => summarizeRunSessions(logs), [logs])

  if (sessions.length === 0) {
    return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin carreras registradas"
      sub='Añade un ejercicio "🏃 carrera" al plan y anota los tiempos en la sesión' />
  }

  const data = sessions.map(s => ({
    fecha: new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    km: Math.round(s.distanceM) / 1000,
    ritmo: s.paceSecPerKm ? Math.round(s.paceSecPerKm) : null,
    distanciaM: s.distanceM, test: s.isTest,
  }))
  const totalM = sessions.reduce((a, s) => a + s.distanceM, 0)
  const paces = sessions.map(s => s.paceSecPerKm).filter((p): p is number => p !== null)
  const bestPace = paces.length ? Math.min(...paces) : null
  const lastTest = [...sessions].reverse().find(s => s.isTest)
  const firstPace = paces[0], lastPace = paces[paces.length - 1]
  const paceDelta = paces.length >= 2 ? Math.round(lastPace - firstPace) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Sesiones', value: String(sessions.length), color: 'text-ink' },
          { label: 'Distancia total', value: formatDistance(totalM), color: 'text-accent' },
          { label: 'Mejor ritmo', value: formatPace(bestPace), color: 'text-ok' },
          { label: 'Último Cooper', value: lastTest ? formatDistance(lastTest.distanceM) : '—', color: 'text-ink' },
        ].map((k, i) => (
          <div key={i} className="bg-bg rounded-xl p-3 text-center">
            <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {paceDelta !== null && (
        <p className={`text-xs font-semibold ${paceDelta <= 0 ? 'text-ok' : 'text-warn'}`}>
          {paceDelta <= 0 ? '▲' : '▼'} Ritmo {paceDelta <= 0 ? 'mejorado' : 'más lento'} {formatDuration(Math.abs(paceDelta))} /km desde la primera sesión con tiempos
        </p>
      )}

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis yAxisId="km" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} unit=" km" />
            <YAxis yAxisId="ritmo" orientation="right" reversed axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }}
              domain={['dataMin - 20', 'dataMax + 20']} tickFormatter={(v: number) => formatDuration(v)} />
            <Tooltip content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                  <p className="text-muted mb-1">{label}{p.test ? ' · test Cooper' : ''}</p>
                  <p className="font-bold text-accent">{formatDistance(p.distanciaM)}</p>
                  {p.ritmo && <p className="font-bold text-ok">{formatPace(p.ritmo)}</p>}
                </div>
              )
            }} />
            <Bar yAxisId="km" dataKey="km" name="Distancia" fill="#6e5438" radius={[4, 4, 0, 0]} />
            <Line yAxisId="ritmo" dataKey="ritmo" name="Ritmo" stroke="#4caf7d" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted">Barras: distancia por sesión · Línea verde: ritmo medio (más arriba = más rápido).</p>
    </div>
  )
}
