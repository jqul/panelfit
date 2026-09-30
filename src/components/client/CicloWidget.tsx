import { useState } from 'react'
import { Moon } from 'lucide-react'
import { useCicloTracking, getCyclePhase, PHASE_INFO } from '../../lib/cyclePhase'

export function CicloWidget({ clientId, trainerId }: { clientId: string; trainerId: string }) {
  const { ciclo, loading, save } = useCicloTracking(clientId)
  const [ultimaRegla, setUltimaRegla] = useState('')
  const [duracion, setDuracion] = useState(28)

  if (loading) return null

  const activo = ciclo?.activo ?? false
  const fecha = ciclo?.ultima_regla || ultimaRegla
  const dur = ciclo?.duracion_ciclo || duracion
  const current = activo && fecha ? getCyclePhase(fecha, dur) : null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Moon className="w-4 h-4 text-muted flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Seguimiento de ciclo</p>
            <p className="text-xs text-muted">Opcional — ajusta la intensidad según tu fase</p>
          </div>
        </div>
        <button
          onClick={() => save(trainerId, { activo: !activo })}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${activo ? 'bg-accent' : 'bg-bg-alt'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {activo && (
        <div className="border-t border-border p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Última regla</label>
              <input type="date" value={ciclo?.ultima_regla || ultimaRegla}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => { setUltimaRegla(e.target.value); save(trainerId, { ultima_regla: e.target.value }) }}
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Duración del ciclo</label>
              <input type="number" min={21} max={40} value={dur}
                onChange={e => { const v = parseInt(e.target.value) || 28; setDuracion(v); save(trainerId, { duracion_ciclo: v }) }}
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>
          </div>

          {current && (
            <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: `${PHASE_INFO[current.phase].color}15` }}>
              <p className="text-xs font-bold" style={{ color: PHASE_INFO[current.phase].color }}>
                Día {current.day} · Fase {PHASE_INFO[current.phase].label}
              </p>
              <p className="text-xs text-muted leading-relaxed">{PHASE_INFO[current.phase].guidance}</p>
            </div>
          )}

          <p className="text-[10px] text-muted">Solo vosotros dos veis esto. Es una guía orientativa, no un consejo médico — puedes desactivarlo cuando quieras.</p>
        </div>
      )}
    </div>
  )
}
