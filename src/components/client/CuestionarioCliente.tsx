import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { faltan, respondida, type Pregunta } from '../../lib/cuestionarios'
import { toast } from '../shared/Toast'

/** Lo que devuelve `encuestas_pendientes()`: una encuesta que le toca responder al cliente. */
export interface CuestionarioPendiente {
  template_id: string
  schedule_id: string | null
  nombre: string
  preguntas: Pregunta[]
  trainer_id: string
}

const opcion = (activa: boolean) =>
  `min-h-[44px] px-3 rounded-xl text-sm font-semibold border transition-colors ${activa ? 'bg-ink text-white border-ink' : 'bg-bg border-border text-ink hover:border-accent'}`
const campo = 'w-full px-3 py-2.5 bg-bg border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20'

function Respuesta({ q, valor, onChange }: { q: Pregunta; valor: any; onChange: (v: any) => void }) {
  switch (q.type) {
    case 'scale':
      return (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5" role="radiogroup" aria-label={q.label}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" role="radio" aria-checked={valor === n} onClick={() => onChange(n)} className={opcion(valor === n)}>{n}</button>
          ))}
        </div>
      )
    case 'yesno':
      return (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={q.label}>
          {[true, false].map(v => (
            <button key={String(v)} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)} className={opcion(valor === v)}>{v ? 'Sí' : 'No'}</button>
          ))}
        </div>
      )
    case 'choice':
      return (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={q.label}>
          {(q.options || []).map(o => (
            <button key={o} type="button" role="radio" aria-checked={valor === o} onClick={() => onChange(o)} className={`${opcion(valor === o)} text-left`}>{o}</button>
          ))}
        </div>
      )
    case 'multi': {
      const marcadas: string[] = Array.isArray(valor) ? valor : []
      return (
        <div className="flex flex-col gap-2" role="group" aria-label={q.label}>
          {(q.options || []).map(o => {
            const on = marcadas.includes(o)
            return (
              <button key={o} type="button" role="checkbox" aria-checked={on} className={`${opcion(on)} text-left`}
                onClick={() => onChange(on ? marcadas.filter(x => x !== o) : [...marcadas, o])}>
                {on ? '✓ ' : ''}{o}
              </button>
            )
          })}
          <p className="text-xs text-muted">Puedes marcar varias.</p>
        </div>
      )
    }
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input type="number" inputMode="decimal" step="any" value={valor ?? ''} aria-label={q.label} style={{ fontSize: '16px' }}
            onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={`${campo} max-w-[160px]`} />
          {q.unit && <span className="text-sm text-muted">{q.unit}</span>}
        </div>
      )
    case 'date':
      return <input type="date" value={valor ?? ''} aria-label={q.label} style={{ fontSize: '16px' }} onChange={e => onChange(e.target.value)} className={`${campo} max-w-[200px]`} />
    case 'short':
      return <input value={valor ?? ''} aria-label={q.label} maxLength={200} placeholder="Tu respuesta…" style={{ fontSize: '16px' }} onChange={e => onChange(e.target.value)} className={campo} />
    default:
      return <textarea rows={3} value={valor ?? ''} aria-label={q.label} placeholder="Tu respuesta…" style={{ fontSize: '16px' }} onChange={e => onChange(e.target.value)} className={`${campo} resize-none`} />
  }
}

/** Un cuestionario del entrenador, con todos sus tipos de pregunta. Al enviarlo se guarda en survey_responses. */
export function CuestionarioCliente({ cuestionario, clientId, onEnviado }: { cuestionario: CuestionarioPendiente; clientId: string; onEnviado: () => void }) {
  const [respuestas, setRespuestas] = useState<Record<string, any>>({})
  const [enviando, setEnviando] = useState(false)
  const [marcarFaltan, setMarcarFaltan] = useState(false)
  const pendientes = faltan(cuestionario.preguntas, respuestas)

  const enviar = async () => {
    if (pendientes.length) {
      setMarcarFaltan(true)
      document.getElementById(`preg-${pendientes[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    const answers = Object.fromEntries(Object.entries(respuestas).filter(([, v]) => respondida(v)))
    const { error } = await supabase.from('survey_responses').insert({
      id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      schedule_id: cuestionario.schedule_id, template_id: cuestionario.template_id,
      client_id: clientId, trainer_id: cuestionario.trainer_id, answers, completed_at: Date.now(),
    })
    setEnviando(false)
    if (error) { toast('No se pudo enviar. Inténtalo de nuevo', 'warn'); return }
    onEnviado()
  }

  return (
    <div className="space-y-3">
      {cuestionario.preguntas.map((q, i) => {
        const falta = marcarFaltan && pendientes.includes(q)
        return (
          <div key={q.id} id={`preg-${q.id}`} className={`bg-card border rounded-2xl p-4 space-y-3 ${falta ? 'border-warn' : 'border-border'}`}>
            <p className="text-sm font-semibold">
              {i + 1}. {q.label}{q.required && <span className="text-warn" aria-label="obligatoria"> *</span>}
            </p>
            <Respuesta q={q} valor={respuestas[q.id]} onChange={v => setRespuestas(r => ({ ...r, [q.id]: v }))} />
            {falta && <p className="text-xs text-warn font-medium">Esta pregunta es obligatoria</p>}
          </div>
        )
      })}
      <button onClick={enviar} disabled={enviando} style={{ minHeight: '52px' }}
        className="w-full flex items-center justify-center gap-2 bg-ink text-white rounded-2xl font-bold text-base disabled:opacity-50">
        {enviando ? 'Enviando…' : '✓ Enviar respuestas'}
      </button>
    </div>
  )
}
