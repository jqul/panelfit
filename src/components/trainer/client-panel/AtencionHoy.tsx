import { AlertTriangle } from 'lucide-react'
import type { AtencionItem, Destino } from '../../../lib/atencionCliente'

// «Atención hoy»: arriba del Resumen de la ficha, SOLO si hay algo accionable (lib/atencionCliente). Cada aviso lleva al sitio
// exacto para resolverlo. Sin avisos no se pinta nada: no es una tarjeta de adorno.
export function AtencionHoy({ items, onIr }: { items: AtencionItem[]; onIr: (d: Destino) => void }) {
  if (!items.length) return null
  const urgente = items.some(i => i.urgente)
  return (
    <section aria-label="Atención hoy" className={`rounded-2xl border px-4 py-3 ${urgente ? 'bg-warn/10 border-warn/30' : 'bg-accent/5 border-accent/20'}`}>
      <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${urgente ? 'text-warn' : 'text-accent'}`}>
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Atención hoy
      </p>
      <ul className="mt-2 divide-y divide-border/50">
        {items.map(i => (
          <li key={i.kind} className="py-2 flex items-center gap-3 first:pt-0 last:pb-0">
            <span className={`flex-1 min-w-0 text-sm ${i.urgente ? 'font-semibold' : ''}`}>{i.texto}</span>
            <button type="button" onClick={() => onIr(i.destino)} aria-label={`${i.accion}: ${i.texto}`}
              className="flex-shrink-0 px-3 py-1.5 bg-card border border-border rounded-xl text-xs font-semibold hover:border-accent hover:text-accent transition-colors">
              {i.accion}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
