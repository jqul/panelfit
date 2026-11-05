import { useState } from 'react'
import { Target } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { localDateKey } from '../../../lib/dates'
import { conMarca, ejerciciosConMarca, marcaDeReferencia, type Marca } from '../../../lib/marcaRM'

const ORIGEN: Record<Marca['origen'], string> = { test: 'test', manual: 'puesta a mano', estimado: '1RM estimado' }
const fecha = (s?: string) => (s ? ` del ${new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : '')

// Pestaña Plan → "Marcas": con qué marca se calculan los % de cada ejercicio programado por %1RM (o con test de RM),
// de dónde sale (test, a mano o 1RM estimado) y para ponerla a mano (lib/marcaRM). Sin ejercicios por %, no sale.
export function MarcasPlan({ plan, logs, onPlanChange }: { plan: TrainingPlan; logs: TrainingLogs; onPlanChange: (p: TrainingPlan) => void }) {
  const ejercicios = ejerciciosConMarca(plan)
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  if (!ejercicios.length) return null

  const guardar = (nombre: string, kg: number | null) => {
    onPlanChange({ ...plan, marcas: conMarca(plan.marcas, nombre, kg, localDateKey()) })
    setEditando(null); setValor('')
  }

  return (
    <section aria-label="Marcas de referencia" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-muted" aria-hidden />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Marcas para los %</p>
      </div>
      <ul className="divide-y divide-border/60">
        {ejercicios.map(nombre => {
          const m = marcaDeReferencia(nombre, plan, logs)
          const aMano = !!plan.marcas?.[nombre.trim().toLowerCase()]
          return (
            <li key={nombre} className="py-2 flex items-center gap-3 flex-wrap" aria-label={`Marca de ${nombre}`}>
              <span className="text-sm font-semibold flex-1 min-w-[120px] truncate">{nombre}</span>
              {editando === nombre ? (
                <span className="flex items-center gap-2">
                  <input type="number" inputMode="decimal" min={1} step={0.5} value={valor} autoFocus aria-label={`Marca de ${nombre} en kg`}
                    onChange={e => setValor(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && parseFloat(valor) > 0) guardar(nombre, parseFloat(valor)) }}
                    className="w-20 text-sm text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20" />
                  <span className="text-xs text-muted">kg</span>
                  <button onClick={() => guardar(nombre, parseFloat(valor))} disabled={!(parseFloat(valor) > 0)}
                    className="px-2.5 py-1 bg-ink text-white rounded-lg text-xs font-bold disabled:opacity-40">Guardar</button>
                  <button onClick={() => setEditando(null)} className="text-xs text-muted hover:text-ink">Cancelar</button>
                </span>
              ) : (
                <>
                  <span className="text-sm tabular-nums">
                    {m ? <><strong>{m.kg.toLocaleString('es-ES')} kg</strong> <span className="text-xs text-muted">· {ORIGEN[m.origen]}{fecha(m.fecha)}</span></> : <span className="text-xs text-muted">Sin marca aún</span>}
                  </span>
                  <button onClick={() => { setEditando(nombre); setValor(m ? String(m.kg) : '') }} className="text-xs font-semibold text-accent">Poner a mano</button>
                  {aMano && <button onClick={() => guardar(nombre, null)} className="text-xs text-muted hover:text-warn">Quitar la de a mano</button>}
                </>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-muted mt-1.5">Manda la más reciente: el último test de RM o la que pongas a mano. Sin ninguna, su mejor 1RM estimado.</p>
    </section>
  )
}
