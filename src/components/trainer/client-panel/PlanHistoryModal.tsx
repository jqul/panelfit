import { useState, useEffect } from 'react'
import { History, RotateCcw, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Modal } from '../../shared/Modal'
import { TrainingPlan } from '../../../types'

interface HistoryRow { id: string; plan: { P: TrainingPlan }; note: string | null; published_by: string | null; published_at: string }

// Quién cambió qué y cuándo, y si el cliente ya abrió la versión publicada —
// cada "Publicar cambios" deja una entrada aquí (ver ClientPanel.publishBorrador).
export function PlanHistoryModal({ clientId, onClose, onRestore }: {
  clientId: string
  onClose: () => void
  onRestore: (plan: TrainingPlan) => void
}) {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [lastOpened, setLastOpened] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('plan_history').select('id, plan, note, published_by, published_at').eq('clientId', clientId).order('published_at', { ascending: false }).limit(30),
      supabase.from('clientes').select('plan_last_opened_at').eq('id', clientId).maybeSingle(),
    ]).then(([hist, cliente]) => {
      setRows((hist.data as HistoryRow[]) || [])
      setLastOpened((cliente.data as any)?.plan_last_opened_at || null)
      setLoading(false)
    })
  }, [clientId])

  return (
    <Modal open onClose={onClose} title="Historial del plan" maxWidth="max-w-lg">
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-bg-alt rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-muted">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Sin publicaciones registradas todavía</p>
          <p className="text-xs mt-1">Cada vez que publiques cambios desde un borrador, quedará aquí.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
          {rows.map((r, i) => {
            const seen = !!lastOpened && lastOpened >= r.published_at
            const isCurrent = i === 0
            return (
              <div key={r.id} className={`border rounded-2xl p-3.5 ${isCurrent ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">
                      {new Date(r.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      <span className="text-muted font-normal"> · {new Date(r.published_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                    {r.published_by && <p className="text-[10px] text-muted mt-0.5">Publicado por {r.published_by}</p>}
                  </div>
                  {isCurrent && (
                    seen
                      ? <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-ok bg-ok/10 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Visto</span>
                      : <span className="flex-shrink-0 text-[10px] font-bold text-warn bg-warn/10 px-2 py-1 rounded-full">Sin abrir</span>
                  )}
                </div>
                <p className="text-sm mt-2">{r.note ? `"${r.note}"` : <span className="text-muted italic">Sin nota de cambios</span>}</p>
                {!isCurrent && (
                  <button onClick={() => onRestore(r.plan.P)}
                    className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar esta versión como borrador
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
