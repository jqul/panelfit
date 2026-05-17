import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  pesoObjetivo?: number
  onClose: () => void
}

const DISCOS_DEFAULT = [20, 15, 10, 5, 2.5, 1.25]
const BARRAS = [
  { label: 'Estándar (20kg)', peso: 20 },
  { label: 'Corta (10kg)', peso: 10 },
  { label: 'Sin barra (0kg)', peso: 0 },
]

function calcularDiscos(pesoTotal: number, pesoBarra: number, discosDisponibles: number[]): number[] {
  const pesoLado = (pesoTotal - pesoBarra) / 2
  if (pesoLado <= 0) return []
  let restante = pesoLado
  const resultado: number[] = []
  for (const disco of discosDisponibles.sort((a, b) => b - a)) {
    while (restante >= disco - 0.001) {
      resultado.push(disco)
      restante -= disco
      restante = Math.round(restante * 1000) / 1000
    }
  }
  return resultado
}

export function CalculadoraDiscos({ pesoObjetivo, onClose }: Props) {
  const [peso, setPeso] = useState(pesoObjetivo?.toString() || '')
  const [barra, setBarra] = useState(BARRAS[0])
  const [discosActivos, setDiscosActivos] = useState<number[]>([20, 15, 10, 5, 2.5, 1.25])

  const pesoNum = parseFloat(peso) || 0
  const discos = calcularDiscos(pesoNum, barra.peso, discosActivos)
  const pesoReal = barra.peso + discos.reduce((a, d) => a + d, 0) * 2
  const diferencia = Math.round((pesoNum - pesoReal) * 1000) / 1000

  const toggleDisco = (d: number) => {
    setDiscosActivos(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  const COLORS: Record<number, string> = {
    20: 'bg-red-500', 15: 'bg-yellow-500', 10: 'bg-green-500',
    5: 'bg-blue-500', 2.5: 'bg-white border border-gray-300', 1.25: 'bg-gray-300'
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      {/* Panel — altura fija con estructura header + scroll interior */}
      <div
        className="bg-bg w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ height: '85dvh', maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header FIJO — siempre visible, nunca scrollea */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-border">
          <div>
            <h3 className="font-serif font-bold text-xl">Calculadora de discos</h3>
            <p className="text-xs text-muted mt-0.5">¿Qué poner en cada lado de la barra?</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-bg-alt hover:bg-border text-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {/* Input peso */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Peso objetivo (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              placeholder="Ej: 90"
              style={{ fontSize: '24px' }}
              className="w-full text-center font-serif font-bold px-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          {/* Barra */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Barra</label>
            <div className="flex gap-2">
              {BARRAS.map(b => (
                <button key={b.label} onClick={() => setBarra(b)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    barra.peso === b.peso ? 'bg-ink text-white' : 'bg-card border border-border text-muted'
                  }`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discos disponibles */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Discos disponibles
            </label>
            <div className="flex gap-2 flex-wrap">
              {DISCOS_DEFAULT.map(d => (
                <button key={d} onClick={() => toggleDisco(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    discosActivos.includes(d) ? 'bg-accent text-white' : 'bg-card border border-border text-muted'
                  }`}>
                  {d}kg
                </button>
              ))}
            </div>
          </div>

          {/* Resultado */}
          {pesoNum > 0 && (
            <div className="space-y-3">
              {/* Visualización barra */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-3 text-center">
                  Cada lado de la barra
                </p>
                <div className="flex items-center justify-center gap-1 min-h-[56px] overflow-x-auto py-2">
                  <div className="h-4 w-10 bg-bg-alt border border-border rounded-l-full flex-shrink-0" />
                  {discos.length > 0 ? discos.map((d, i) => {
                    const h = d >= 20 ? 56 : d >= 15 ? 50 : d >= 10 ? 44 : d >= 5 ? 38 : d >= 2.5 ? 32 : 26
                    return (
                      <div key={i}
                        className={`rounded-sm flex items-center justify-center flex-shrink-0 ${COLORS[d] || 'bg-accent'} text-white`}
                        style={{ width: '24px', height: `${h}px` }}>
                        <span className="text-[8px] font-bold leading-none">{d}</span>
                      </div>
                    )
                  }) : (
                    <div className="text-xs text-muted px-3">Solo barra</div>
                  )}
                  <div className="h-8 w-3 bg-bg-alt border border-border flex-shrink-0" />
                  {discos.length > 0 && [...discos].reverse().map((d, i) => {
                    const h = d >= 20 ? 56 : d >= 15 ? 50 : d >= 10 ? 44 : d >= 5 ? 38 : d >= 2.5 ? 32 : 26
                    return (
                      <div key={i}
                        className={`rounded-sm flex items-center justify-center flex-shrink-0 ${COLORS[d] || 'bg-accent'} text-white`}
                        style={{ width: '24px', height: `${h}px` }}>
                        <span className="text-[8px] font-bold leading-none">{d}</span>
                      </div>
                    )
                  })}
                  <div className="h-4 w-10 bg-bg-alt border border-border rounded-r-full flex-shrink-0" />
                </div>
              </div>

              {/* Resumen */}
              <div className={`rounded-2xl p-4 ${diferencia === 0 ? 'bg-ok/10 border border-ok/20' : 'bg-warn/10 border border-warn/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif font-bold text-lg">
                      {pesoReal} kg
                      {diferencia !== 0 && (
                        <span className="text-sm text-warn ml-2">
                          ({diferencia > 0 ? '+' : ''}{diferencia} kg)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Barra {barra.peso}kg + {discos.reduce((a, d) => a + d, 0) * 2}kg en discos
                    </p>
                  </div>
                  {diferencia === 0
                    ? <span className="text-ok font-bold text-sm">✓ Exacto</span>
                    : <span className="text-warn font-bold text-xs">No exacto</span>
                  }
                </div>
                {discos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Cada lado:</p>
                    <p className="text-sm font-semibold">
                      {discos.map(d => `${d}kg`).join(' + ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Espacio extra al fondo para que se vea bien en iOS */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  )
}
