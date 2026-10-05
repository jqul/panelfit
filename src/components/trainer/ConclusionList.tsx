import { Conclusion } from '../../lib/conclusions'

const TONE: Record<Conclusion['tone'], { dot: string; text: string }> = {
  bad: { dot: 'bg-warn', text: 'text-warn' },
  warn: { dot: 'bg-accent', text: 'text-ink' },
  ok: { dot: 'bg-ok', text: 'text-ink' },
}

function namesLine(c: Conclusion): string {
  if (!c.names.length) return ''
  const list = c.names.length > 1 ? `${c.names.slice(0, -1).join(', ')} y ${c.names[c.names.length - 1]}` : c.names[0]
  return c.extra > 0 ? `${c.names.join(', ')} y ${c.extra} más` : list
}

// Cada conclusión en una línea con su semáforo y, debajo, a quién afecta.
export function ConclusionList({ items }: { items: Conclusion[] }) {
  if (!items.length) return <p className="text-sm text-muted">Aún no hay suficiente actividad para sacar conclusiones.</p>
  return (
    <ul className="divide-y divide-border/50">
      {items.map((c, i) => (
        <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${TONE[c.tone].dot}`} aria-hidden />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${TONE[c.tone].text}`}>{c.text}</p>
            {c.names.length > 0 && <p className="text-xs text-muted mt-0.5">{namesLine(c)}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
