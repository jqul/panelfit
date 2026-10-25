import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { localDateKey } from '../../lib/dates'
import { applyQuickLog, buildRows, rowsAreValid, addDays, validReps, validWeight, type QuickRow } from '../../lib/quickLog'
import type { DayPlan, TrainingLogs } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  day: DayPlan
  dayKey: string
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
}

// "¿Ya lo hiciste?": registra la sesión como estaba programada y deja corregir solo lo que cambió.
export function QuickLogSheet({ open, onClose, day, dayKey, logs, onLogsChange }: Props) {
  const hoy = localDateKey()
  const [fecha, setFecha] = useState(hoy)
  const [rows, setRows] = useState<QuickRow[]>(() => buildRows(day, dayKey, logs))
  const [abierta, setAbierta] = useState<number | null>(null)

  const editable = useMemo(() => rows.filter(r => r.state === 'editable'), [rows])
  const incluidas = editable.filter(r => r.included).length
  const valido = rowsAreValid(rows) && incluidas > 0

  const patch = (ri: number, p: Partial<QuickRow>) => setRows(rs => rs.map(r => r.ri === ri ? { ...r, ...p } : r))

  const guardar = () => {
    if (!valido) return
    onLogsChange(applyQuickLog(logs, dayKey, rows, fecha))
    toast(`Entreno guardado (${incluidas} ejercicio${incluidas !== 1 ? 's' : ''}) ✓`, 'ok')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar entreno ya hecho" maxWidth="max-w-md"
      footer={
        <button onClick={guardar} disabled={!valido}
          className="w-full py-3 rounded-xl bg-ink text-white text-sm font-bold disabled:opacity-40" style={{ minHeight: '48px' }}>
          Guardar entreno{incluidas > 0 ? ` (${incluidas})` : ''}
        </button>
      }>
      <div className="space-y-4">
        <p className="text-sm text-muted leading-relaxed">
          Se guarda tal como estaba programado. Desmarca lo que no hiciste y toca un ejercicio para corregir el peso o las repeticiones. Las series quedan sin RIR.
        </p>

        <div role="group" aria-label="Día del entreno" className="grid grid-cols-2 gap-2">
          {([['Hoy', hoy], ['Ayer', addDays(hoy, -1)]] as const).map(([label, value]) => (
            <button key={value} type="button" onClick={() => setFecha(value)} aria-pressed={fecha === value}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${fecha === value ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        <ul className="space-y-2" aria-label="Ejercicios del día">
          {rows.map(r => {
            const locked = r.state !== 'editable'
            const open = abierta === r.ri && !locked && r.included
            return (
              <li key={r.ri} className={`rounded-2xl border ${r.included ? 'border-ok/40 bg-ok/5' : 'border-border bg-card'} ${locked ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button type="button" role="checkbox" aria-checked={r.included} disabled={locked}
                    aria-label={`${r.name}: ${r.included ? 'hecho' : 'no hecho'}`}
                    onClick={() => patch(r.ri, { included: !r.included })}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${r.included ? 'bg-ok border-ok text-white' : 'border-border'}`}>
                    {r.included && <Check className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-xs text-muted">
                      {r.state === 'ya-hecho' ? 'Ya registrado'
                        : r.state === 'pista' ? 'La pista se registra desde el entreno (tiempos y distancias)'
                        : `${r.numSets} × ${r.reps}${r.weight ? ` · ${r.weight} kg` : ''}`}
                    </p>
                  </div>
                  {!locked && r.included && (
                    <button type="button" onClick={() => setAbierta(open ? null : r.ri)} aria-expanded={open}
                      aria-label={`Corregir ${r.name}`} className="p-2 text-muted" style={{ minWidth: '44px', minHeight: '44px' }}>
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {open && (
                  <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                    <label className="text-xs font-semibold text-muted">
                      Peso (kg)
                      <input inputMode="decimal" value={r.weight} onChange={e => patch(r.ri, { weight: e.target.value })} aria-invalid={!validWeight(r.weight)}
                        aria-label={`Peso de ${r.name}`}
                        className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm text-ink" style={{ fontSize: '16px' }} />
                    </label>
                    <label className="text-xs font-semibold text-muted">
                      Repeticiones
                      <input inputMode="numeric" value={r.reps} onChange={e => patch(r.ri, { reps: e.target.value })} aria-invalid={!validReps(r.reps)}
                        aria-label={`Repeticiones de ${r.name}`}
                        className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm text-ink" style={{ fontSize: '16px' }} />
                    </label>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
