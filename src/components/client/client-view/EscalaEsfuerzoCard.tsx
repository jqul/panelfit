import { useState } from 'react'
import { escalaEsfuerzo, guardarEscalaEsfuerzo, type EscalaEsfuerzo } from '../../../lib/escalaEsfuerzo'

// Cómo apunta el cliente el esfuerzo de cada serie: RIR o RPE. Se guarda en este dispositivo (lib/escalaEsfuerzo); los
// datos van siempre en RIR, así que cambiar no afecta a lo ya apuntado ni a lo que ve el entrenador.
export function EscalaEsfuerzoCard() {
  const [escala, setEscala] = useState<EscalaEsfuerzo>(escalaEsfuerzo)
  const elegir = (e: EscalaEsfuerzo) => { setEscala(e); guardarEscalaEsfuerzo(e) }
  const opcion = (e: EscalaEsfuerzo, titulo: string, texto: string) => (
    <button type="button" role="radio" aria-checked={escala === e} onClick={() => elegir(e)}
      className={`flex-1 text-left p-3 rounded-xl border transition-all ${escala === e ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="text-xs text-muted">{texto}</p>
    </button>
  )
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold" id="escala-esfuerzo">Cómo apuntas el esfuerzo</p>
        <p className="text-xs text-muted">En cada serie. Es lo mismo contado de dos formas: RPE 8 = RIR 2.</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-labelledby="escala-esfuerzo">
        {opcion('rir', 'RIR', 'Cuántas repeticiones te quedaban (0 = al fallo)')}
        {opcion('rpe', 'RPE', 'Cuánto te ha costado, del 1 al 10 (10 = al fallo)')}
      </div>
    </div>
  )
}
