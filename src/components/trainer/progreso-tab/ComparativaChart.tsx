import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrainingLogs } from '../../../types'
import { CustomTooltip } from './helpers'

export function ComparativaChart({ logs }: { logs: TrainingLogs }) {
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const lunesEsta = new Date(now); lunesEsta.setDate(now.getDate() + diffToMon); lunesEsta.setHours(0,0,0,0)
    const lunesAnterior = new Date(lunesEsta); lunesAnterior.setDate(lunesEsta.getDate() - 7)
    const domAnterior = new Date(lunesEsta); domAnterior.setDate(lunesEsta.getDate() - 1)
    let thisVol = 0, lastVol = 0, thisSes = new Set<string>(), lastSes = new Set<string>()
    Object.values(logs).forEach((log: any) => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const vol = Object.values(log.sets || {}).reduce((a: number, s: any) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      if (d >= lunesEsta) { thisVol += vol; thisSes.add(log.dateDone) }
      else if (d >= lunesAnterior && d <= domAnterior) { lastVol += vol; lastSes.add(log.dateDone) }
    })
    return { thisWeek: { vol: Math.round(thisVol), ses: thisSes.size }, lastWeek: { vol: Math.round(lastVol), ses: lastSes.size } }
  }, [logs])

  const volDiff = thisWeek.vol - lastWeek.vol
  const sesDiff = thisWeek.ses - lastWeek.ses
  const data = [{ label: 'Sem. pasada', vol: lastWeek.vol }, { label: 'Esta sem.', vol: thisWeek.vol }]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Volumen esta semana', value: `${thisWeek.vol.toLocaleString()} kg`, diff: volDiff, unit: 'kg' },
          { label: 'Sesiones esta semana', value: thisWeek.ses, diff: sesDiff, unit: '' },
        ].map(({ label, value, diff, unit }) => (
          <div key={label} className="bg-bg rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-ink">{value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{label}</p>
            {diff !== 0 && <p className={`text-[10px] font-bold mt-1 ${diff > 0 ? 'text-ok' : 'text-warn'}`}>{diff > 0 ? '↑' : '↓'} {Math.abs(diff)}{unit} vs ant.</p>}
          </div>
        ))}
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="vol" name="Volumen" fill="#6e5438" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
