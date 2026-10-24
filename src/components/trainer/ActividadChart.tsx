import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

// Gráfica de actividad semanal del panel. Vive aparte para que recharts (~105 kB gzip) se cargue
// bajo demanda y no bloquee la apertura del panel del entrenador.
export function ActividadChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6e5438" stopOpacity={0.2} /><stop offset="95%" stopColor="#6e5438" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'white', border: 'none', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
        <Area type="monotone" dataKey="count" name="Clientes" stroke="#6e5438" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: '#6e5438', r: 3 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
