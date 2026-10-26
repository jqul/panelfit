// Anillo de porcentaje: un número de un vistazo (constancia, lo hecho hoy) en vez de una frase.
// El color sigue los mismos cortes que la barra de cumplimiento de la lista de clientes (75 / 40).
export function ProgressRing({ pct, size = 64, stroke = 7, label }: { pct: number; size?: number; stroke?: number; label?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = p >= 75 ? 'text-ok' : p >= 40 ? 'text-[#e0a854]' : 'text-warn'
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${p}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-bg-alt" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke="currentColor" className={`${tone} transition-[stroke-dashoffset] duration-500`}
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-serif font-bold tabular-nums" style={{ fontSize: size * 0.26 }} aria-hidden>
        {p}%
      </span>
    </div>
  )
}
