import { RunSpec } from '../../../types'
import { runLabel } from '../../../lib/run'

interface Props { run: RunSpec; onChange: (patch: Partial<RunSpec>) => void }

const num = (v: string, min = 0) => { const n = parseInt(v, 10); return isNaN(n) ? min : Math.max(min, n) }

const inputCls = 'w-full text-sm font-semibold text-center bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20'
const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block'

// Editor de un ejercicio de carrera: "6 × 200 m · rec 100 m andando" o un test
// de tiempo fijo (Cooper) — en vez de series × reps × kg.
export function RunEditor({ run, onChange }: Props) {
  const isTest = !!run.durationSec
  return (
    <div className="px-4 py-3 border-b border-accent/10 bg-accent/5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-accent">🏃 Ejercicio de carrera · {runLabel(run)}</p>
        <div className="flex rounded-lg overflow-hidden border border-accent/20 text-[10px] font-bold flex-shrink-0">
          <button onClick={() => onChange({ durationSec: undefined, reps: run.reps || 6, distanceM: run.distanceM || 200 })}
            className={`px-2.5 py-1 ${!isTest ? 'bg-accent text-white' : 'bg-white text-muted'}`}>Tiradas</button>
          <button onClick={() => onChange({ durationSec: run.durationSec || 720, reps: 1, distanceM: 0 })}
            className={`px-2.5 py-1 ${isTest ? 'bg-accent text-white' : 'bg-white text-muted'}`}>Test de tiempo</button>
        </div>
      </div>

      {isTest ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Duración (min)</label>
            <input type="number" min={1} value={Math.round((run.durationSec || 720) / 60)}
              onChange={e => onChange({ durationSec: num(e.target.value, 1) * 60 })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Intensidad</label>
            <input value={run.intensity || ''} placeholder="Máxima distancia"
              onChange={e => onChange({ intensity: e.target.value })} className={inputCls} />
          </div>
          <p className="col-span-2 text-[10px] text-muted">El cliente corre el tiempo indicado y anota los metros que consigue (test Cooper: 12 min).</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className={labelCls}>Tiradas</label>
            <input type="number" min={1} value={run.reps} onChange={e => onChange({ reps: num(e.target.value, 1) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Distancia (m)</label>
            <input type="number" min={10} step={50} value={run.distanceM} onChange={e => onChange({ distanceM: num(e.target.value, 10) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Recup. (m)</label>
            <input type="number" min={0} step={50} value={run.recoveryM || 0} onChange={e => onChange({ recoveryM: num(e.target.value) || undefined })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Intensidad</label>
            <input value={run.intensity || ''} placeholder="RPE 5-6"
              onChange={e => onChange({ intensity: e.target.value })} className={inputCls} />
          </div>
          <p className="col-span-4 text-[10px] text-muted">Una tirada continua = 1 tirada. La recuperación es andando esa distancia entre tiradas (0 = sin recuperación medida). El cliente anota el tiempo de cada tirada y ve su ritmo.</p>
        </div>
      )}
    </div>
  )
}
