import { useMemo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HeartPulse } from 'lucide-react'
import { EmptyState } from './helpers'
import { useClientPain } from '../../../lib/clientPain'
import { TrainingLogs } from '../../../types'

const INTENSIDAD_COLOR = (v: number) => v >= 7 ? '#dc2626' : v >= 4 ? '#e0a854' : '#4caf7d'

// Mismo criterio de "semana" (lunes) que VolumenChart, para poder cruzar
// ambas series en el eje X sin desalinearlas.
function mondayKey(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const lunes = new Date(d); lunes.setDate(diff)
  return lunes.toISOString().split('T')[0]
}

function DolorTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}{p.dataKey === 'dolor' ? '/10' : ' kg'}
        </p>
      ))}
    </div>
  )
}

export function DolorChart({ clientId, logs = {} }: { clientId: string; logs?: TrainingLogs }) {
  const { entries, loading } = useClientPain(clientId)

  const zonas = useMemo(() => Array.from(new Set(entries.map(e => e.zona))), [entries])

  // Dolor (EVA, media semanal) cruzado con volumen de entreno de esa misma
  // semana — para poder enseñarle al cliente/entrenador, con datos y no de
  // memoria, que el dolor baja MIENTRAS la capacidad de carga sube (o, al
  // revés, que una subida de volumen se adelanta a un repunte de dolor).
  const weeklyData = useMemo(() => {
    const dolorPorSemana: Record<string, number[]> = {}
    entries.forEach(e => {
      const key = mondayKey(e.date)
      if (!dolorPorSemana[key]) dolorPorSemana[key] = []
      dolorPorSemana[key].push(e.intensidad)
    })

    const volumenPorSemana: Record<string, number> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const key = mondayKey(log.dateDone)
      const vol = Object.values(log.sets || {}).reduce((acc, s: any) => acc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      volumenPorSemana[key] = (volumenPorSemana[key] || 0) + vol
    })

    const semanas = Array.from(new Set([...Object.keys(dolorPorSemana), ...Object.keys(volumenPorSemana)])).sort()
    return semanas.slice(-10).map(key => {
      const doloresSemana = dolorPorSemana[key]
      return {
        semana: new Date(key + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        dolor: doloresSemana ? Math.round((doloresSemana.reduce((a, b) => a + b, 0) / doloresSemana.length) * 10) / 10 : undefined,
        volumen: volumenPorSemana[key] ? Math.round(volumenPorSemana[key]) : 0,
      }
    })
  }, [entries, logs])

  const hasVolumen = weeklyData.some(w => w.volumen > 0)

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

      {weeklyData.length >= 2 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Dolor (EVA) {hasVolumen ? 'vs. volumen de entreno' : 'por semana'}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
                <YAxis yAxisId="dolor" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#e07b54' }} width={24} />
                {hasVolumen && (
                  <YAxis yAxisId="volumen" orientation="right" axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: '#8a8278' }} width={36}
                    tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}t` : String(v)} />
                )}
                <Tooltip content={<DolorTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {hasVolumen && (
                  <Bar yAxisId="volumen" dataKey="volumen" name="Volumen" fill="#c9c2b6" radius={[4, 4, 0, 0]} barSize={18} />
                )}
                <Line yAxisId="dolor" type="monotone" dataKey="dolor" name="Dolor" stroke="#e07b54" strokeWidth={2.5}
                  dot={{ fill: '#e07b54', r: 3 }} activeDot={{ r: 5 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {hasVolumen && (
            <p className="text-[9px] text-muted mt-1 text-center">Línea: dolor medio semanal (EVA 0-10) · Barras: volumen total de la semana</p>
          )}
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
