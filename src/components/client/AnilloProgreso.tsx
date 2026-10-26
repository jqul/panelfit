import type { ReactNode } from 'react'

// Anillo de progreso: un círculo que se llena (de 0 a 1) con algo corto en el centro. Es solo dibujo: quien lo usa
// pone el texto accesible (el centro va oculto a los lectores de pantalla para no repetir lo que dice el pie).
export function AnilloProgreso({ valor, color, tamano = 56, grosor = 5, children }: {
  valor: number; color: string; tamano?: number; grosor?: number; children?: ReactNode
}) {
  const v = Math.min(1, Math.max(0, Number.isFinite(valor) ? valor : 0))
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={grosor} />
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums">{children}</div>
    </div>
  )
}
