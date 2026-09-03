import { useState } from 'react'
import { Activity, CheckCircle2 } from 'lucide-react'
import { FitnessTest, TestResultado } from '../../../lib/testCatalog'

interface Props {
  tests: FitnessTest[]
  resultadosHoy: Record<string, TestResultado>
  onSubmit: (testId: string, valor: number) => void
}

// Pruebas físicas que el entrenador pidió para el día de hoy — el cliente
// mete su propio resultado aquí y llega directo a Progreso > Pruebas del
// entrenador, sin que haya que decírselo aparte.
export function DayTestsCard({ tests, resultadosHoy, onSubmit }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  if (!tests.length) return null

  return (
    <div className="bg-accent/5 border-b border-accent/10 px-4 py-3 space-y-2">
      <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" /> Pruebas físicas de hoy
      </p>
      {tests.map(t => {
        const done = resultadosHoy[t.id]
        const draft = drafts[t.id] || ''
        const parsed = parseFloat(draft)
        return (
          <div key={t.id} className="flex items-center gap-2 bg-white border border-accent/20 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.nombre}</p>
              {!done && t.descripcion && <p className="text-[10px] text-muted leading-tight">{t.descripcion}</p>}
            </div>
            {done ? (
              <span className="flex items-center gap-1 text-xs font-bold text-ok flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> {done.valor} {t.unidad}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input type="number" inputMode="decimal" value={draft}
                  onChange={e => setDrafts(p => ({ ...p, [t.id]: e.target.value }))}
                  placeholder={t.unidad}
                  className="w-16 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-accent/20" />
                <button
                  onClick={() => { if (!isNaN(parsed)) { onSubmit(t.id, parsed); setDrafts(p => ({ ...p, [t.id]: '' })) } }}
                  disabled={!draft || isNaN(parsed)}
                  className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-bold disabled:opacity-30">
                  Guardar
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
