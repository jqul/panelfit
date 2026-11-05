import { Check } from 'lucide-react'
import { parrafos } from '../../../lib/sesionLibre'

// Una sesión libre en el entreno del cliente: lo que tiene que hacer, en párrafos, y un solo "hecho" (lib/sesionLibre).
// El vídeo, si lo hay, sale en la tarjeta del ejercicio como en los demás.
export function SesionLibre({ texto, hecha, onToggle, grande = false }: { texto?: string; hecha: boolean; onToggle: () => void; grande?: boolean }) {
  const ps = parrafos(texto)
  return (
    <div className="px-4 pb-3 space-y-3" data-testid="sesion-libre">
      {ps.length > 0 && (
        <div className={`space-y-2 leading-relaxed whitespace-pre-line ${grande ? 'text-base' : 'text-sm'}`}>
          {ps.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
      <button onClick={onToggle} aria-pressed={hecha}
        className={`w-full flex items-center justify-center gap-2 rounded-2xl font-bold transition-all active:scale-[0.98] ${grande ? 'py-5 text-lg' : 'py-3 text-sm'} ${
          hecha ? 'bg-ok/10 text-ok border border-ok/30' : 'bg-ink text-white'
        }`}>
        <Check className={grande ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
        {hecha ? 'Hecha · desmarcar' : 'Marcar como hecha'}
      </button>
    </div>
  )
}
