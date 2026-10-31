import { useState } from 'react'
import { ListChecks, Focus } from 'lucide-react'

// Cómo se ve el entreno: toda la rutina en una lista o una serie cada vez (foco). Se guarda en este dispositivo (la
// misma preferencia que el botón de dentro del entreno, `pf_workout_view`).
const CLAVE = 'pf_workout_view'
type Vista = 'lista' | 'foco'

const leer = (): Vista => { try { return localStorage.getItem(CLAVE) === 'lista' ? 'lista' : 'foco' } catch { return 'foco' } }

export function VistaEntreno() {
  const [vista, setVista] = useState<Vista>(leer)
  const elegir = (v: Vista) => { setVista(v); try { localStorage.setItem(CLAVE, v) } catch { /* sin almacenamiento: no se recuerda */ } }
  const opcion = (v: Vista, Icono: typeof Focus, titulo: string, texto: string) => (
    <button type="button" role="radio" aria-checked={vista === v} onClick={() => elegir(v)}
      className={`flex-1 text-left p-3 rounded-xl border transition-all ${vista === v ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}>
      <Icono className={`w-4 h-4 mb-1 ${vista === v ? 'text-accent' : 'text-muted'}`} />
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="text-xs text-muted">{texto}</p>
    </button>
  )
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold" id="vista-entreno">Vista del entreno</p>
        <p className="text-xs text-muted">Cómo se abre al empezar. Dentro del entreno también puedes cambiarla.</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-labelledby="vista-entreno">
        {opcion('lista', ListChecks, 'Toda la rutina', 'Todos los ejercicios y series en una lista')}
        {opcion('foco', Focus, 'Una serie cada vez', 'Grande y sin distracciones')}
      </div>
    </div>
  )
}
