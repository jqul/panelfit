import { useState } from 'react'
import { Zap } from 'lucide-react'
import { RIR_OPTIONS } from '../../../lib/strength'

// ── Selector RIR inline (aparece tras marcar check) ───────
export function RirSelector({ value, onSelect, onClose }: { value: number | undefined; onSelect: (rir: number) => void; onClose: () => void }) {
  // El valor entero seleccionado se ve directamente en los botones grandes;
  // "+0.5" es un ajuste fino aparte, para no duplicar la rejilla a 11 opciones
  // (imprescindible para powerlifters/halterófilos, pero solo ellos lo necesitan).
  const initialHalf = value !== undefined && value % 1 !== 0
  const [half, setHalf] = useState(initialHalf)
  const baseValue = value !== undefined ? Math.floor(value) : undefined

  return (
    <div className="fixed inset-0 z-[55] bg-ink/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-3 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-1" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <p className="text-sm font-bold">¿Cuánto te quedaba? (RIR)</p>
        </div>
        <p className="text-xs text-muted">Repeticiones en reserva — cuántas más podrías haber hecho</p>
        <div className="grid grid-cols-3 gap-2">
          {RIR_OPTIONS.map(opt => {
            const canHalf = opt.value < 5 // "5+" es abierto, no tiene sentido un "5.5+"
            const selected = baseValue === opt.value
            return (
              <button key={opt.value} onClick={() => { onSelect(opt.value + (canHalf && half ? 0.5 : 0)); onClose() }}
                className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95"
                style={{
                  borderColor: selected ? opt.color : '#e5e7eb',
                  backgroundColor: selected ? opt.color + '15' : 'transparent',
                }}>
                <span className="text-xl font-bold" style={{ color: opt.color }}>{selected && half ? `${opt.value}.5` : opt.label}</span>
                <span className="text-[10px] text-muted text-center leading-tight">{opt.desc}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => setHalf(h => !h)}
          className={`w-full py-2 rounded-xl text-xs font-semibold border transition-all ${half ? 'bg-accent/15 border-accent text-accent' : 'border-border text-muted'}`}>
          {half ? '✓ ' : ''}+0.5 (precisión powerlifting/halterofilia)
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-xs text-muted">Omitir</button>
      </div>
    </div>
  )
}
