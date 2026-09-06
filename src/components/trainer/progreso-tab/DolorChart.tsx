import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { HeartPulse } from 'lucide-react'
import { CustomTooltip, EmptyState } from './helpers'
import { useClientPain } from '../../../lib/clientPain'

const INTENSIDAD_COLOR = (v: number) => v >= 7 ? '#dc2626' : v >= 4 ? '#e0a854' : '#4caf7d'

export function DolorChart({ clientId }: { clientId: string }) {
  const { entries, loading } = useClientPain(clientId)

  const zonas = useMemo(() => Array.from(new Set(entries.map(e => e.zona))), [entries])
  const chartData = useMemo(() =>
    [...entries].reverse().map(e => ({ fecha: new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), intensidad: e.intensidad, zona: e.zona })),
    [entries])

  if (loading) return null
  if (!entries.length) return <EmptyState icon={<HeartPulse className="w-8 h-8 opacity-30" />} text="Sin registros de dolor aún" sub="Útil para hacer seguimiento en procesos de rehabilitación" />

  const ultimo = entries[0]
  const media = Math.round((entries.reduce((a, e) => a + e.intensidad, 0) / entries.length) * 10) / 10

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: INTENSIDAD_COLOR(ultimo.intensidad) }}>{ultimo.intensidad}/10</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Último registro</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{media}/10</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Media</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{zonas.length}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Zona{zonas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
              <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
              <Tooltip content={<CustomTooltip unit="/10" />} />
              <Line type="monotone" dataKey="intensidad" name="Dolor" stroke="#e07b54" strokeWidth={2.5} dot={{ fill: '#e07b54', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {entries.slice(0, 10).map(e => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: INTENSIDAD_COLOR(e.intensidad) + '20', color: INTENSIDAD_COLOR(e.intensidad) }}>
              {e.intensidad}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{e.zona}</p>
              {e.nota && <p className="text-xs text-muted truncate">{e.nota}</p>}
            </div>
            <p className="text-[10px] text-muted flex-shrink-0">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
