import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { isDemoClientId } from '../../../lib/demoIds'
import { localDateKey } from '../../../lib/dates'
import { toast } from '../../shared/Toast'

// "¿Cómo llegas hoy?" al empezar la sesión: una nota opcional para el entrenador (sueño, molestias, prisa...). Se
// guarda al momento (tabla notas_antes_sesion, una por día), así la ve aunque la sesión se quede a medias.
const DEMO: Record<string, string> = {}

export function NotaAntes({ clientId, dia }: { clientId: string; dia: string }) {
  const hoy = localDateKey()
  const demo = isDemoClientId(clientId)
  const [guardada, setGuardada] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (demo) { setGuardada(DEMO[clientId + hoy] ?? null); return }
    supabase.from('notas_antes_sesion').select('nota').eq('client_id', clientId).eq('fecha', hoy).maybeSingle()
      .then(({ data }) => setGuardada(data?.nota ?? null))
  }, [clientId, hoy, demo])

  const guardar = async () => {
    const nota = texto.trim()
    if (!nota) return
    setGuardando(true)
    const { error } = demo ? { error: null } : await supabase.from('notas_antes_sesion')
      .upsert({ client_id: clientId, fecha: hoy, dia: dia.slice(0, 120), nota: nota.slice(0, 300) }, { onConflict: 'client_id,fecha' })
    setGuardando(false)
    if (error) { toast('No se pudo guardar la nota', 'warn'); return }
    if (demo) DEMO[clientId + hoy] = nota
    setGuardada(nota); setAbierta(false)
    toast('Tu entrenador lo verá ✓', 'ok')
  }

  if (!abierta) return (
    <button onClick={() => { setTexto(guardada || ''); setAbierta(true) }}
      className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm text-left text-muted hover:border-accent transition-colors">
      <MessageCircle className="w-4 h-4 flex-shrink-0" />
      {guardada ? <span className="truncate"><span className="font-semibold text-ink">Hoy llegas:</span> {guardada}</span> : '¿Cómo llegas hoy? (opcional)'}
    </button>
  )
  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <label htmlFor="nota-antes" className="text-sm font-semibold">¿Cómo llegas hoy?</label>
      <textarea id="nota-antes" value={texto} onChange={e => setTexto(e.target.value)} maxLength={300} rows={2} autoFocus
        placeholder="Ej.: he dormido poco, me molesta el hombro, voy con prisa…"
        className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setAbierta(false)} className="px-3 min-h-[40px] text-sm text-muted">Cancelar</button>
        <button onClick={guardar} disabled={guardando || !texto.trim()} className="px-4 min-h-[40px] bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Enviar a mi entrenador'}
        </button>
      </div>
    </div>
  )
}
