import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Scale } from 'lucide-react'
import { CustomTooltip, EmptyState } from './helpers'
import { useClientWeights } from '../../../lib/clientWeight'
import { semanasDePeso, avisoRitmo, mediaMovil, UMBRAL_PERDIDA_PCT, UMBRAL_GANANCIA_PCT } from '../../../lib/ritmoPeso'

const SEMANAS_VISIBLES = 6
const num = (x: number, dec = 1) => x.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: dec })
const con = (x: number, dec = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + num(Math.abs(x), dec)

export function PesoChart({ clientId }: { clientId: string }) {
  const { weights, loading } = useClientWeights(clientId)
  if (loading) return null
  if (weights.length < 2) return <EmptyState icon={<Scale className="w-8 h-8 opacity-30" />} text="Sin historial de peso aún" sub="El cliente registra su peso desde su panel" />
  const ordenados = [...weights].reverse() // vienen del más reciente al más antiguo
  const mm = mediaMovil(weights)
  const data = ordenados.map(w => ({
    fecha: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    kg: w.weight,
    media: mm.has(w.date) ? Math.round((mm.get(w.date) as number) * 100) / 100 : undefined,
  }))
  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const cambio = data[data.length - 1].kg - data[0].kg

  // Ritmo: medias de semanas naturales (lunes a domingo), no pesajes sueltos, que oscilan por agua y glucógeno
  const semanas = semanasDePeso(weights)
  const ultima = semanas[semanas.length - 1]
  const aviso = avisoRitmo(semanas)
  const visibles = semanas.slice(-SEMANAS_VISIBLES)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso inicial', value: `${data[0].kg} kg`, color: 'text-muted' },
          { label: 'Peso actual', value: `${data[data.length-1].kg} kg`, color: 'text-ink' },
          { label: 'Cambio total', value: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)} kg`, color: cambio <= 0 ? 'text-ok' : 'text-warn' },
        ].map((k, i) => <div key={i} className="bg-bg rounded-xl p-3 text-center"><p className={`text-lg font-bold ${k.color}`}>{k.value}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p></div>)}
      </div>

      {ultima && (
        <p className="text-sm" data-testid="ritmo-actual">
          <span className="font-semibold">Ritmo: </span>
          {ultima.cambioPct === null
            ? <span className="text-muted">aún no hay dos semanas seguidas con pesajes para calcularlo.</span>
            : <span><span className="font-bold">{con(ultima.cambioPct, 2)} % por semana</span> <span className="text-muted">({con(ultima.cambioKg as number, 2)} kg: media de la semana del {new Date(ultima.semana + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} frente a la anterior{ultima.poco ? ', con pocos pesajes: poco fiable' : ''})</span></span>}
        </p>
      )}

      {aviso && (
        <div role="note" data-testid="aviso-ritmo" className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs">
          <p className="font-semibold text-warn">{aviso.tipo === 'perdida-rapida' ? 'Ritmo de pérdida alto' : 'Ritmo de ganancia alto'}</p>
          <p className="text-ink mt-0.5">{aviso.texto}</p>
          <p className="text-muted mt-0.5">Referencia habitual ({num(aviso.tipo === 'perdida-rapida' ? UMBRAL_PERDIDA_PCT : UMBRAL_GANANCIA_PCT, 2)} % por semana), no una regla: depende del punto de partida y del objetivo.</p>
        </div>
      )}

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="gPeso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4caf7d" stopOpacity={0.2} /><stop offset="95%" stopColor="#4caf7d" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.98, max * 1.02]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} tickFormatter={v => String(Math.round(v * 10) / 10)} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#4caf7d" strokeWidth={2.5} fill="url(#gPeso)" dot={{ fill: '#4caf7d', r: 3 }} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="media" name="Media de 7 días" stroke="#6e5438" strokeWidth={2} strokeDasharray="5 3" fill="none" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted -mt-1">Línea verde: cada pesaje. Línea discontinua: media de los últimos 7 días.</p>

      {visibles.length > 0 && (
        <section aria-label="Peso medio por semana" className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Peso medio por semana</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Peso medio, número de pesajes y cambio respecto a la semana anterior</caption>
              <thead>
                <tr className="text-left text-[11px] text-muted uppercase tracking-wider">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Semana</th>
                  <th scope="col" className="py-1.5 px-2 text-right font-semibold">Media</th>
                  <th scope="col" className="py-1.5 px-2 text-right font-semibold">Pesajes</th>
                  <th scope="col" className="py-1.5 px-2 text-right font-semibold">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(s => (
                  <tr key={s.semana} className="border-t border-border/50">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">{new Date(s.semana + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</th>
                    <td className="py-2 px-2 text-right tabular-nums">{num(s.media, 2)} kg</td>
                    <td className={`py-2 px-2 text-right tabular-nums ${s.poco ? 'text-muted' : ''}`}>{s.pesajes}{s.poco ? ' (pocos)' : ''}</td>
                    <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{s.cambioPct === null ? '—' : `${con(s.cambioKg as number, 2)} kg · ${con(s.cambioPct, 2)} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted leading-snug">
            Un pesaje aislado oscila varios cientos de gramos por agua, glucógeno y comida: por eso se miran las medias de la semana. El cambio es
            la media frente a la de la semana inmediatamente anterior, en % del peso.
          </p>
        </section>
      )}
    </div>
  )
}
