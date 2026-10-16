interface Props {
  eva: number | undefined
  onSetEva: (value: number) => void
}

// Dolor EVA 0-10 en ejercicios terapéuticos/de readaptación — en fisioterapia
// deportiva moderna no se busca "cero dolor" sino dolor tolerable (≤3-4/10)
// que no empeore a las 24h, así que el color no penaliza cualquier dolor,
// solo el que se sale de esa ventana.
export function ExerciseEvaTracker({ eva, onSetEva }: Props) {
  const colorFor = (v: number) => v <= 3 ? '#4caf7d' : v <= 6 ? '#e0a854' : '#dc2626'
  return (
    <div className="mx-4 mb-3 border border-warn/20 bg-warn/5 rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">🩹</span>
        <div>
          <p className="text-sm font-semibold">Dolor durante el ejercicio (EVA)</p>
          <p className="text-[11px] text-muted">Tolerable hasta ~3-4/10 sin empeorar mañana — no hace falta llegar a 0</p>
        </div>
      </div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, v) => v).map(v => (
          <button key={v} onClick={() => onSetEva(v)}
            className="aspect-square rounded-md text-[11px] font-bold flex items-center justify-center border-2 transition-all"
            style={eva === v
              ? { backgroundColor: colorFor(v), borderColor: colorFor(v), color: '#fff' }
              : { borderColor: '#e2ddd4', color: '#8a8278' }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
