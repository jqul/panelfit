import { useMemo } from 'react'
import type { ClientData } from '../../types'
import { contarMotivos } from '../../lib/motivosBaja'

// Negocio → «Por qué se van»: reparto de motivos de los clientes archivados en los últimos 12 meses (lib/motivosBaja).
export function MotivosBaja({ archivados }: { archivados: ClientData[] }) {
  const reparto = useMemo(() => contarMotivos(archivados, Date.now() - 365 * 86400000), [archivados])
  if (!reparto.length) return null
  const total = reparto.reduce((s, r) => s + r.n, 0)
  return (
    <section aria-label="Por qué se van" className="bg-card rounded-2xl p-5 space-y-3" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif font-bold">Por qué se van</h3>
        <span className="text-xs text-muted">{total} baja{total === 1 ? '' : 's'} en 12 meses</span>
      </div>
      <ul className="space-y-1.5">
        {reparto.map(r => (
          <li key={r.id} className="text-xs">
            <div className="flex justify-between mb-0.5"><span>{r.label}</span><span className="tabular-nums text-muted">{r.n} · {r.pct} %</span></div>
            <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${r.pct}%` }} /></div>
          </li>
        ))}
      </ul>
      {reparto.some(r => r.id === 'sin') && <p className="text-[11px] text-muted">Al archivar a alguien puedes marcar por qué se va: así este reparto dice algo.</p>}
    </section>
  )
}
