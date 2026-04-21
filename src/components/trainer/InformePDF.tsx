import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs } from '../../types'
import { X, Download } from 'lucide-react'

interface Props {
  client: ClientData
  plan?: TrainingPlan | null
  logs?: TrainingLogs
  trainerProfile?: Record<string, any>
  onClose: () => void
}

interface WeightEntry { date: string; weight: number }

function useWeights(clientId: string) {
  try {
    const raw = localStorage.getItem(`pf_weight_${clientId}`)
    return raw ? JSON.parse(raw) as WeightEntry[] : []
  } catch { return [] }
}

export function InformePDF({ client, plan, logs = {}, trainerProfile = {}, onClose }: Props) {
  const weights = useWeights(client.id)
  const [responses, setResponses] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    // Cargar últimas respuestas de encuestas
    Promise.all([
      supabase.from('survey_responses').select('*').eq('client_id', client.id).order('completed_at', { ascending: false }).limit(4),
      supabase.from('survey_templates').select('*').eq('trainer_id', client.trainerId)
    ]).then(([respRes, tmplRes]) => {
      if (respRes.data) setResponses(respRes.data)
      if (tmplRes.data) setTemplates(tmplRes.data)
    })
  }, [client.id])

  // Calcular datos
  const pesoActual = weights[0]?.weight
  const pesoInicial = weights[weights.length - 1]?.weight
  const pesoCambio = pesoInicial && pesoActual ? (pesoActual - pesoInicial).toFixed(1) : null

  // Adherencia
  const trainingDates = new Set(Object.values(logs).filter(l => l.dateDone && l.done).map(l => l.dateDone!))
  const totalSesiones = trainingDates.size

  // Récords personales
  const records: Record<string, number> = {}
  plan?.weeks?.forEach((week, wi) => {
    week.days.forEach((day, di) => {
      day.exercises.forEach((ex, ri) => {
        const key = `ex_w${wi}_d${di}_r${ri}`
        const log = logs[key]
        if (!log?.done) return
        Object.values(log.sets || {}).forEach((s: any) => {
          const w = parseFloat(s.weight) || 0
          if (!records[ex.name] || w > records[ex.name]) records[ex.name] = w
        })
      })
    })
  })
  const topRecords = Object.entries(records).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const brandColor = trainerProfile.brandColor || '#6e5438'
  const brandName = trainerProfile.brandName || trainerProfile.displayName || 'PanelFit'
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const handlePrint = () => window.print()

  return (
    <>
      {/* Overlay con botones — no se imprime */}
      <div className="fixed inset-0 z-50 bg-ink/60 flex items-start justify-center pt-8 print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Barra superior */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
            <p className="text-sm font-semibold text-gray-700">Vista previa del informe</p>
            <div className="flex gap-2">
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor }}>
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenido del informe */}
          <div id="informe-pdf" className="p-8 space-y-6 text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b-4" style={{ borderColor: brandColor }}>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: brandColor }}>{brandName}</h1>
                <p className="text-sm text-gray-500 mt-0.5">Informe de progreso del cliente</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{today}</p>
                {trainerProfile.phone && <p className="text-xs text-gray-400">{trainerProfile.phone}</p>}
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Cliente</h2>
                <p className="text-xl font-bold">{client.name} {client.surname}</p>
                {plan?.type && <p className="text-sm text-gray-500 mt-0.5 capitalize">Objetivo: {plan.type}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sesiones', value: totalSesiones, suffix: '' },
                  { label: 'Peso actual', value: pesoActual ? `${pesoActual}` : '—', suffix: pesoActual ? 'kg' : '' },
                  { label: 'Variación', value: pesoCambio !== null ? `${Number(pesoCambio) > 0 ? '+' : ''}${pesoCambio}` : '—', suffix: pesoCambio !== null ? 'kg' : '' },
                ].map((k, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xl font-bold" style={{ color: brandColor }}>{k.value}<span className="text-sm">{k.suffix}</span></p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Evolución de peso */}
            {weights.length >= 2 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Evolución del peso</h2>
                <div className="flex items-end gap-1.5 h-16 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  {weights.slice(0, 12).reverse().map((w, i) => {
                    const min = Math.min(...weights.map(x => x.weight))
                    const max = Math.max(...weights.map(x => x.weight))
                    const range = max - min || 1
                    const h = Math.max(8, ((w.weight - min) / range) * 40 + 8)
                    const isLast = i === Math.min(weights.length, 12) - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm" style={{ height: h, backgroundColor: isLast ? brandColor : '#e5e7eb' }} />
                        {(i === 0 || isLast) && <p className="text-[8px] text-gray-400">{w.weight}</p>}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                  <span>{new Date(weights[weights.length-1].date+'T00:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                  <span>{new Date(weights[0].date+'T00:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
                </div>
              </div>
            )}

            {/* Récords personales */}
            {topRecords.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Marcas personales</h2>
                <div className="grid grid-cols-3 gap-2">
                  {topRecords.map(([name, best], i) => (
                    <div key={name} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{name}</p>
                        <p className="text-sm font-bold" style={{ color: brandColor }}>{best} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plan actual */}
            {plan?.weeks && plan.weeks.length > 0 && (() => {
              const currentWeek = plan.weeks.find(w => w.isCurrent) || plan.weeks[0]
              return (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Plan actual — {currentWeek.label}
                  </h2>
                  <div className="space-y-2">
                    {currentWeek.days.map((day, di) => (
                      <div key={di} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: brandColor + '15' }}>
                          <p className="text-xs font-bold">{day.title}</p>
                          {day.focus && <p className="text-[10px] text-gray-400">{day.focus}</p>}
                        </div>
                        <div className="divide-y divide-gray-50">
                          {day.exercises.map((ex, ri) => (
                            <div key={ri} className="flex items-center gap-3 px-3 py-1.5">
                              <span className="text-[10px] text-gray-400 w-4">{ri+1}</span>
                              <p className="flex-1 text-xs">{ex.name}</p>
                              <p className="text-xs font-bold text-gray-600">{ex.sets}</p>
                              {ex.weight && <p className="text-[10px] text-gray-400">{ex.weight}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Últimas encuestas */}
            {responses.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Últimas encuestas</h2>
                <div className="space-y-3">
                  {responses.slice(0, 2).map(resp => {
                    const tmpl = templates.find(t => t.id === resp.template_id)
                    if (!tmpl) return null
                    return (
                      <div key={resp.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex justify-between mb-2">
                          <p className="text-xs font-bold">{tmpl.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(resp.completed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {tmpl.questions.filter((q: any) => q.type === 'scale').slice(0, 4).map((q: any) => {
                            const val = resp.answers[q.id]
                            if (!val) return null
                            return (
                              <div key={q.id} className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${(val/10)*100}%`, backgroundColor: brandColor }} />
                                </div>
                                <span className="text-xs font-bold w-4 text-right" style={{ color: brandColor }}>{val}</span>
                                <span className="text-[9px] text-gray-400 flex-1 truncate">{q.label.split('?')[0].slice(-20)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notas del entrenador */}
            {(plan as any)?.coachNotes && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Notas del entrenador</h2>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{(plan as any).coachNotes}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-300">Generado con PanelFit · panelfit.vercel.app</p>
              <p className="text-[10px] text-gray-300">{today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #informe-pdf, #informe-pdf * { visibility: visible; }
          #informe-pdf { position: fixed; left: 0; top: 0; width: 100%; padding: 20px; }
        }
      `}</style>
    </>
  )
}
