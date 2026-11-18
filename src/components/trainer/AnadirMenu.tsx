import { useEffect, useRef, useState } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { opcionesAnadir, type OpcionAnadir, type PestanaFicha } from '../../lib/anadirFicha'

// «Añadir» de la cabecera de la ficha: un solo botón, con las opciones agrupadas y lo relevante primero según la pestaña
// (lib/anadirFicha). Cada opción lleva al sitio donde ya se hace.
export function AnadirMenu({ tab, onElegir }: { tab: PestanaFicha; onElegir: (o: OpcionAnadir) => void }) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla) }
  }, [abierto])

  return (
    <div ref={raiz} className="relative">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="menu" aria-expanded={abierto}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
        <Plus className="w-3.5 h-3.5" aria-hidden /> Añadir <ChevronDown className="w-3 h-3" aria-hidden />
      </button>
      {abierto && (
        <div role="menu" aria-label="Añadir" className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-card border border-border rounded-xl py-1.5" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
          {opcionesAnadir(tab).map(g => (
            <div key={g.grupo} role="group" aria-label={g.grupo} className="py-1">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{g.grupo}</p>
              {g.opciones.map(o => (
                <button key={o.id} type="button" role="menuitem" onClick={() => { setAbierto(false); onElegir(o) }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-alt/60 transition-colors">
                  {o.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
