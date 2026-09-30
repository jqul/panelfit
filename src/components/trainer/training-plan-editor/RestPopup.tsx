import { Clock, X } from 'lucide-react'

export const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180, 240, 300]

export function fmtRest(s: number) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m${r}s` : `${m}m`
}

export function RestPopup({ value, onChange, onClose, label }: {
  value: number; onChange: (v: number) => void; onClose: () => void; label: string
}) {
  return (
    <div className="absolute z-30 top-full mt-1 right-0 bg-card border border-border rounded-2xl shadow-xl p-3 w-56"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <button onClick={onClose} className="p-0.5 text-muted hover:text-ink"><X className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {REST_PRESETS.map(p => (
          <button key={p} onClick={() => { onChange(p); onClose() }}
            className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              value === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-accent'
            }`}>
            {fmtRest(p)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1.5">
        <Clock className="w-3 h-3 text-muted flex-shrink-0" />
        <input type="number" value={value} min={0} max={600} step={5}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 text-xs bg-transparent outline-none font-bold" />
        <span className="text-[10px] text-muted">seg</span>
      </div>
    </div>
  )
}
