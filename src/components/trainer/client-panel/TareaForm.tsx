import { useState } from 'react'
import { TIPOS_TAREA, diaSemanaDe, describirRepeticion, type Tarea, type Repetir } from '../../../lib/tareas'
import type { TareaNueva } from '../../../hooks/useTareasCliente'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const REPETIR: { id: Repetir; label: string }[] = [
  { id: 'una', label: 'Una vez' }, { id: 'diaria', label: 'Cada día' }, { id: 'semanal', label: 'Cada semana' },
]

const opcion = (activa: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activa ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent hover:text-ink'}`
const campo = 'w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20'

/** Crear o cambiar una tarea suelta del calendario del cliente. */
export function TareaForm({ fecha, inicial, onGuardar, onCancelar }: {
  fecha: string
  inicial?: Tarea
  onGuardar: (t: TareaNueva) => Promise<boolean>
  onCancelar: () => void
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [tipo, setTipo] = useState(inicial?.tipo || 'tarea')
  const [desde, setDesde] = useState(inicial?.fecha || fecha)
  const [repetir, setRepetir] = useState<Repetir>(inicial?.repetir || 'una')
  const [dias, setDias] = useState<number[]>(inicial?.dias?.length ? inicial.dias : [diaSemanaDe(fecha)])
  const [hasta, setHasta] = useState(inicial?.hasta || '')
  const [nota, setNota] = useState(inicial?.nota || '')
  const [enlace, setEnlace] = useState(inicial?.enlace || '')
  const [guardando, setGuardando] = useState(false)

  const enlaceMal = !!enlace && !/^https:\/\/\S+$/.test(enlace.trim())
  const hastaMal = repetir !== 'una' && !!hasta && hasta < desde
  const valida = titulo.trim().length > 0 && !enlaceMal && !hastaMal && (repetir !== 'semanal' || dias.length > 0)
  const datos: TareaNueva = { titulo, tipo, fecha: desde, repetir, dias: [...dias].sort((a, b) => a - b), hasta: repetir === 'una' || !hasta ? null : hasta, nota: nota.trim(), enlace: enlace.trim() }

  const guardar = async () => {
    if (!valida) return
    setGuardando(true)
    const ok = await onGuardar(datos)
    setGuardando(false)
    if (ok) onCancelar()
  }

  return (
    <div className="bg-card border border-accent/30 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold">{inicial ? 'Editar tarea' : 'Nueva tarea'}</p>
      <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={80} autoFocus placeholder="Ej.: Caminar 30 minutos" aria-label="Tarea" className={campo} />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
        {TIPOS_TAREA.map(t => (
          <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)} className={opcion(tipo === t.id)}>{t.icono} {t.nombre}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">{repetir === 'una' ? 'Día' : 'Desde'}</span>
          <input type="date" value={desde} onChange={e => e.target.value && setDesde(e.target.value)} className={campo} />
        </label>
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Repetir</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Repetir">
            {REPETIR.map(r => <button key={r.id} type="button" role="radio" aria-checked={repetir === r.id} onClick={() => setRepetir(r.id)} className={opcion(repetir === r.id)}>{r.label}</button>)}
          </div>
        </div>
      </div>
      {repetir === 'semanal' && (
        <div className="flex gap-1" role="group" aria-label="Días de la semana">
          {DIAS.map((d, i) => {
            const on = dias.includes(i)
            return <button key={d} type="button" aria-pressed={on} onClick={() => setDias(on ? dias.filter(x => x !== i) : [...dias, i])}
              className={`w-9 h-9 rounded-lg text-xs font-bold border ${on ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>{d}</button>
          })}
        </div>
      )}
      {repetir !== 'una' && (
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Hasta (opcional)</span>
          <input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)} className={`${campo} sm:max-w-[200px]`} />
          {hastaMal && <span className="block text-xs text-warn mt-1">Tiene que ser después del primer día</span>}
        </label>
      )}
      <textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={500} rows={2} placeholder="Indicaciones (opcional)" aria-label="Indicaciones" className={`${campo} resize-none`} />
      <div>
        <input value={enlace} onChange={e => setEnlace(e.target.value)} placeholder="Enlace a un vídeo o documento (opcional, https://…)" aria-label="Enlace" inputMode="url" className={campo} />
        {enlaceMal && <span className="block text-xs text-warn mt-1">Tiene que empezar por https://</span>}
      </div>
      {repetir !== 'una' && valida && <p className="text-xs text-muted">{describirRepeticion(datos)}</p>}
      <div className="flex gap-2">
        <button onClick={onCancelar} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
        <button onClick={guardar} disabled={!valida || guardando} className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Añadir tarea'}
        </button>
      </div>
    </div>
  )
}
