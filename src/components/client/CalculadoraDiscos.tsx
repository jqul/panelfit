import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div className="bg-bg w-full max-w-lg rounded-t-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-xl">Calculadora de discos</h3>
            <p className="text-xs text-muted mt-0.5">¿Qué poner en cada lado de la barra?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input peso */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Peso objetivo (kg)</label>
          <input type="number" inputMode="decimal" value={peso}
            onChange={e => setPeso(e.target.value)}
            placeholder="Ej: 90"
            style={{ fontSize: '24px' }}
            className="w-full text-center font-serif font-bold px-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            autoFocus
          />
        </div>

        {/* Barra */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Barra</label>
          <div className="flex gap-2">
            {BARRAS.map(b => (
              <button key={b.label} onClick={() => setBarra(b)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  barra.peso === b.peso ? 'bg-ink text-white' : 'bg-card border border-border text-muted'
                }`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Discos disponibles */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Discos disponibles</label>
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
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-3 text-center">Cada lado de la barra</p>
              <div className="flex items-center justify-center gap-1 min-h-[48px]">
                {/* Barra */}
                <div className="h-4 w-12 bg-bg-alt border border-border rounded-l-full flex items-center justify-center">
                  <span className="text-[10px] text-muted font-bold">{barra.peso}kg</span>
                </div>
                {/* Discos */}
                {discos.length > 0 ? discos.map((d, i) => {
                  const h = d >= 20 ? 56 : d >= 15 ? 52 : d >= 10 ? 46 : d >= 5 ? 40 : d >= 2.5 ? 34 : 28
                  const colors: Record<number, string> = {
                    20: 'bg-red-500', 15: 'bg-yellow-500', 10: 'bg-green-500',
                    5: 'bg-blue-500', 2.5: 'bg-white border border-border', 1.25: 'bg-gray-300'
                  }
                  return (
                    <div key={i}
                      className={`rounded-sm flex items-center justify-center ${colors[d] || 'bg-accent'} text-white`}
                      style={{ width: '28px', height: `${h}px` }}>
                      <span className="text-[9px] font-bold leading-none">{d}</span>
                    </div>
                  )
                }) : (
                  <div className="text-xs text-muted px-3">Solo barra</div>
                )}
                {/* Centro */}
                <div className="h-8 w-4 bg-bg-alt border border-border" />
                {/* Espejo */}
                {discos.length > 0 && [...discos].reverse().map((d, i) => {
                  const h = d >= 20 ? 56 : d >= 15 ? 52 : d >= 10 ? 46 : d >= 5 ? 40 : d >= 2.5 ? 34 : 28
                  const colors: Record<number, string> = {
                    20: 'bg-red-500', 15: 'bg-yellow-500', 10: 'bg-green-500',
                    5: 'bg-blue-500', 2.5: 'bg-white border border-border', 1.25: 'bg-gray-300'
                  }
                  return (
                    <div key={i}
                      className={`rounded-sm flex items-center justify-center ${colors[d] || 'bg-accent'} text-white`}
                      style={{ width: '28px', height: `${h}px` }}>
                      <span className="text-[9px] font-bold leading-none">{d}</span>
                    </div>
                  )
                })}
                <div className="h-4 w-12 bg-bg-alt border border-border rounded-r-full" />
              </div>
            </div>

            {/* Resumen */}
            <div className={`rounded-2xl p-4 ${diferencia === 0 ? 'bg-ok/10 border border-ok/20' : 'bg-warn/10 border border-warn/20'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-lg">
                    {pesoReal} kg
                    {diferencia !== 0 && <span className="text-sm text-warn ml-2">({diferencia > 0 ? '+' : ''}{diferencia} kg)</span>}
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
      </div>
    </div>
  )
}
