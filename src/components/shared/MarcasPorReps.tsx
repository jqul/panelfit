import { useMemo } from 'react'
import type { SesionEjercicio } from '../../lib/historialEjercicio'
import { marcasPorReps } from '../../lib/marcasPorReps'

const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const fecha = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })

// Mejores marcas de 1 a 12 repeticiones (lib/marcasPorReps), plegadas: solo se ven si se abren, para no cargar la ficha.
export function MarcasPorReps({ nombre, sesiones, desde }: { nombre: string; sesiones: SesionEjercicio[]; desde?: string }) {
  const marcas = useMemo(() => marcasPorReps(sesiones, 12, desde), [sesiones, desde])
  if (marcas.length < 2) return null
  return (
    <details className="group rounded-xl bg-bg-alt/40 px-3 py-2">
      <summary className="text-xs font-semibold text-muted cursor-pointer select-none list-none flex items-center justify-between">
        Mejores marcas por repeticiones <span className="text-[11px] group-open:rotate-180 transition-transform" aria-hidden>▾</span>
      </summary>
      <ol className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1" aria-label={`Mejores marcas por repeticiones de ${nombre}`}>
        {marcas.map(m => (
          <li key={m.reps} className="flex items-baseline gap-2 text-xs tabular-nums">
            <span className="text-muted w-12 flex-shrink-0">{m.reps} {m.reps === 1 ? 'rep' : 'reps'}</span>
            <span className="font-bold">{kg(m.kg)} kg</span>
            <span className="text-[11px] text-muted ml-auto">{fecha(m.fecha)}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
