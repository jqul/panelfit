import { useRef, useState } from 'react'
import { Watch } from 'lucide-react'
import { leerArchivoReloj, resumenActividad, type ActividadReloj } from '../../lib/actividadReloj'

// Botón "Importar del reloj": se elige el .fit/.gpx/.tcx que exporta el reloj o su app (Garmin Connect, Coros, Polar
// Flow, Suunto, Strava…), se enseña el resumen y, al confirmar, se guarda (lib/actividadReloj, hooks/useActividades).
export function ImportarReloj({ onGuardar, etiqueta = 'Importar del reloj', compacto = false, extra }: {
  onGuardar: (a: ActividadReloj) => Promise<boolean>
  etiqueta?: string
  compacto?: boolean
  extra?: string           // texto bajo el resumen ("Se marcará «Correr 30 min» como hecha")
}) {
  const input = useRef<HTMLInputElement>(null)
  const [leida, setLeida] = useState<ActividadReloj | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const elegir = async (f: File | undefined) => {
    if (!f) return
    setError(''); setLeida(null)
    try { setLeida(await leerArchivoReloj(f.name, { texto: () => f.text(), binario: () => f.arrayBuffer() })) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer el archivo') }
    if (input.current) input.current.value = ''
  }
  const guardar = async () => {
    if (!leida) return
    setGuardando(true)
    const ok = await onGuardar(leida)
    setGuardando(false)
    if (ok) setLeida(null)
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept=".fit,.gpx,.tcx" className="hidden" aria-label="Archivo del reloj"
        onChange={e => elegir(e.target.files?.[0])} />
      {!leida && (
        <button type="button" onClick={() => input.current?.click()}
          className={compacto
            ? 'inline-flex items-center gap-1 text-xs font-semibold text-accent'
            : 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-accent/50 text-sm font-semibold text-accent hover:bg-accent/5'}>
          <Watch className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> {etiqueta}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-warn">{error}</p>}
      {leida && (
        <div role="group" aria-label="Entreno leído del reloj" className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
          <p className="text-sm font-semibold">{resumenActividad(leida)}</p>
          <p className="text-xs text-muted">
            {leida.inicio ? new Date(leida.inicio).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha: se guarda con la de hoy'}
            {leida.desnivelM ? ` · ↗ ${leida.desnivelM} m` : ''}{leida.fcMax ? ` · máx ${leida.fcMax} ppm` : ''}{leida.kcal ? ` · ${leida.kcal} kcal` : ''}
          </p>
          {extra && <p className="text-xs text-ok font-semibold">{extra}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={guardar} disabled={guardando}
              className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-bold disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar entreno'}</button>
            <button type="button" onClick={() => setLeida(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
