import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Scale } from 'lucide-react'
import { useWeightHistory, CustomTooltip, EmptyState } from './helpers'

export function PesoChart({ clientId }: { clientId: string }) {
  const weights = useWeightHistory(clientId)
  if (weights.length < 2) return <EmptyState icon={<Scale className="w-8 h-8 opacity-30" />} text="Sin historial de peso aún" sub="El cliente registra su peso desde su panel" />
  const data = [...weights].reverse().map(w => ({ fecha: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), kg: w.weight }))
  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const cambio = data[data.length - 1].kg - data[0].kg
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso inicial', value: `${data[0].kg} kg`, color: 'text-muted' },
          { label: 'Peso actual', value: `${data[data.length-1].kg} kg`, color: 'text-ink' },
          { label: 'Cambio total', value: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)} kg`, color: cambio <= 0 ? 'text-ok' : 'text-warn' },
        ].map((k, i) => <div key={i} className="bg-bg rounded-xl p-3 text-center"><p className={`text-lg font-bold ${k.color}`}>{k.value}</p><p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p></div>)}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="gPeso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4caf7d" stopOpacity={0.2} /><stop offset="95%" stopColor="#4caf7d" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.98, max * 1.02]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#4caf7d" strokeWidth={2.5} fill="url(#gPeso)" dot={{ fill: '#4caf7d', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
