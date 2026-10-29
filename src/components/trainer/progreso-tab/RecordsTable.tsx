import { useMemo, useState } from 'react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { mejoresMarcas } from '../../../lib/mejoresMarcas'

// Mejores marcas por ejercicio con su podio (🥇🥈🥉: las tres mejores sesiones), de este año o de siempre.
const MEDALLAS = ['🥇', '🥈', '🥉']
const fecha = (f: string) => new Date(f + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export function RecordsTable({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const anio = new Date().getFullYear()
  const [periodo, setPeriodo] = useState<'anio' | 'siempre'>('anio')
  const marcas = useMemo(() => mejoresMarcas(logs, plan, periodo === 'anio' ? `${anio}-01-01` : undefined), [logs, plan, periodo, anio])

  const chip = (activo: boolean) => `px-3 min-h-[36px] rounded-full text-xs font-semibold border transition-all ${activo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink hover:text-ink'}`
  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="group" aria-label="Periodo">
        <button onClick={() => setPeriodo('anio')} aria-pressed={periodo === 'anio'} className={chip(periodo === 'anio')}>Este año ({anio})</button>
        <button onClick={() => setPeriodo('siempre')} aria-pressed={periodo === 'siempre'} className={chip(periodo === 'siempre')}>Siempre</button>
      </div>
      {!marcas.length ? (
        <div className="text-center py-8 text-muted text-sm">{periodo === 'anio' ? `Sin marcas registradas en ${anio}` : 'Sin marcas personales registradas aún'}</div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {marcas.map(({ nombre, podio }) => (
            <div key={nombre} className="px-4 py-3">
              <p className="text-sm font-semibold mb-1.5">{nombre}</p>
              <ol className="grid grid-cols-3 gap-2" aria-label={`Mejores marcas de ${nombre}`}>
                {podio.map((m, i) => (
                  <li key={m.fecha} className={`rounded-xl px-2 py-1.5 text-center ${i === 0 ? 'bg-accent/10' : 'bg-bg-alt/50'}`}>
                    <p className="text-xs"><span aria-hidden>{MEDALLAS[i]} </span><span className="font-bold">{m.peso.toLocaleString('es-ES')} kg</span>{m.reps ? ` ×${m.reps}` : ''}</p>
                    <p className="text-[11px] text-muted">{fecha(m.fecha)}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
