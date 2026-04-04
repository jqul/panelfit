import { useState, useEffect } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClienteRow } from '../../lib/supabase-types'

interface Props { client: ClienteRow }

export function EncuestaClienteTab({ client }: Props) {
  const LS_KEY = `pf_encuesta_${client.id}`
  const preguntas: string[] = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || [
      '¿Cómo te has sentido esta semana en los entrenamientos?',
      '¿Has tenido alguna molestia o dolor?',
      '¿Estás descansando bien?',
      '¿Cómo ha ido la dieta?',
    ]} catch { return [] }
  })()

  const [respuestas, setRespuestas] = useState<Record<number, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [ultimoCheckin, setUltimoCheckin] = useState<string | null>(null)

  useEffect(() => {
    // Cargar último check-in
    supabase.from('checkins').select('createdAt')
      .eq('clientId', client.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.createdAt) {
          setUltimoCheckin(new Date(data.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }))
        }
      })
  }, [client.id])

  const enviar = async () => {
    setEnviando(true)
    const { error } = await supabase.from('checkins').insert({
      clientId: client.id,
      respuestas: preguntas.map((p, i) => ({ pregunta: p, respuesta: respuestas[i] || '' })),
      createdAt: Date.now()
    })
    if (!error) {
      setEnviado(true)
      // También enviar por WhatsApp
      const texto = preguntas.map((p, i) => `${i+1}. ${p}\n→ ${respuestas[i] || '—'}`).join('\n\n')
      const msg = encodeURIComponent(`📋 Check-in semanal — ${client.name}\n\n${texto}`)
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }
    setEnviando(false)
  }

  if (enviado) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="w-16 h-16 bg-ok/10 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-ok" />
      </div>
      <h3 className="font-serif font-bold text-xl">¡Check-in enviado!</h3>
      <p className="text-sm text-muted">Tu entrenador verá tus respuestas en su panel.</p>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-4">
      <div>
        <h3 className="font-serif font-bold text-xl">Check-in semanal</h3>
        <p className="text-sm text-muted mt-1">Cuéntale a tu entrenador cómo ha ido la semana.</p>
        {ultimoCheckin && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
            <Clock className="w-3.5 h-3.5" />
            Último check-in: {ultimoCheckin}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {preguntas.map((p, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold">{i+1}. {p}</p>
            <textarea rows={2} value={respuestas[i] || ''}
              onChange={e => setRespuestas(r => ({ ...r, [i]: e.target.value }))}
              placeholder="Tu respuesta..."
              style={{ fontSize: '16px' }}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ))}
      </div>

      <button onClick={enviar} disabled={enviando} style={{ minHeight: '52px' }}
        className="w-full flex items-center justify-center gap-2 bg-ink text-white rounded-2xl font-bold text-base disabled:opacity-50">
        {enviando ? 'Enviando...' : '✓ Enviar check-in'}
      </button>
    </div>
  )
}
