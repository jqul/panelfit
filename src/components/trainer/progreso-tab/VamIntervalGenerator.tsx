import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import { generateVamIntervals } from '../../../lib/vam'

interface Props {
  masInicial: number
  onClose: () => void
}

// Convierte la VAM del atleta en objetivos de ritmo por %VAM — pensado para
// prescribir series a deportistas de campo directamente desde su última
// prueba registrada, sin que el entrenador tenga que hacer la cuenta a mano.
export function VamIntervalGenerator({ masInicial, onClose }: Props) {
  const [mas, setMas] = useState(String(masInicial))
  const masNum = parseFloat(mas) || 0
  const rows = generateVamIntervals(masNum)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-white">
          <h3 className="font-bold flex items-center gap-1.5"><Zap className="w-4 h-4 text-accent" /> Series por %VAM</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted">VAM / MAS del atleta (km/h)</label>
            <input type="number" step="0.1" value={mas} onChange={e => setMas(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>

          {masNum > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted uppercase tracking-wider">
                    <th className="py-1.5 pr-2 font-semibold">Zona</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">km/h</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">min/km</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">400m</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">200m</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.pct} className={`border-t border-border/60 ${r.pct === 100 ? 'bg-accent/5' : ''}`}>
                      <td className="py-1.5 pr-2">
                        <p className="font-semibold">{r.pct}% VAM</p>
                        <p className="text-[10px] text-muted">{r.label}</p>
                      </td>
                      <td className="py-1.5 pr-2 text-right font-semibold">{r.speedKmh}</td>
                      <td className="py-1.5 pr-2 text-right">{r.paceMinPerKm}</td>
                      <td className="py-1.5 pr-2 text-right">{r.secPer400m}s</td>
                      <td className="py-1.5 pr-2 text-right">{r.secPer200m}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted">Introduce la VAM para generar la tabla de ritmos.</p>
          )}

          <p className="text-[10px] text-muted leading-relaxed">
            Tiempos por tramo asumiendo ritmo constante a esa %VAM — para series de campo, ajusta con la recuperación entre repeticiones según el objetivo (aeróbico extensivo: recuperación corta; velocidad/potencia: recuperación completa).
          </p>
        </div>
      </div>
    </div>
  )
}
