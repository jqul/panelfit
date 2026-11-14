import { useState } from 'react'
import { toast } from '../../shared/Toast'
import {
  contribucionesDe, claveEjercicio, PESOS_POSIBLES, PESO_INDIRECTO_POR_DEFECTO,
  type Contribucion, type ContribucionesPropias,
} from '../../../lib/contribucionMuscular'

// Ajustar qué músculos ayuda cada ejercicio y cuánto cuenta una serie para ellos (lib/contribucionMuscular).
// El grupo principal siempre cuenta entero; aquí se cambian solo los indirectos. Se guarda al tocar.

const GRUPOS = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Glúteos']
const etiquetaPeso = (p: number) => (p === 0 ? '0 (no cuenta)' : p === 1 ? '1 (como directa)' : String(p).replace('.', ','))

export interface EjercicioParaAjustar { nombre: string; principal: string }

export function ContribucionesEditor({ ejercicios, propias, guardar }: {
  ejercicios: EjercicioParaAjustar[]
  propias: ContribucionesPropias
  guardar: (nuevas: ContribucionesPropias) => Promise<boolean>
}) {
  const [ocupado, setOcupado] = useState(false)
  if (!ejercicios.length) return null

  const aplicar = async (nombre: string, lista: Contribucion[] | null) => {
    const clave = claveEjercicio(nombre)
    const nuevas = { ...propias }
    if (lista) nuevas[clave] = lista; else delete nuevas[clave]
    setOcupado(true)
    const ok = await guardar(nuevas)
    setOcupado(false)
    if (!ok) toast('No se pudo guardar el ajuste', 'warn')
  }

  return (
    <details className="rounded-xl border border-border/60 bg-bg-alt/40">
      <summary className="px-3 py-2 text-xs font-semibold cursor-pointer select-none">Ajustar qué músculos ayuda cada ejercicio</summary>
      <div className="px-3 pb-3 space-y-3">
        <p className="text-[11px] text-muted leading-snug">
          Una serie suma entera a su grupo principal y esta fracción a los demás. Los valores de partida son prudentes: cámbialos si
          conoces mejor al cliente o la técnica que usa.
        </p>
        {ejercicios.map(({ nombre, principal }) => {
          const actual = contribucionesDe(nombre, principal, propias)
          const secundarios = actual.filter(c => c.grupo !== principal && c.peso > 0)
          const propio = !!propias[claveEjercicio(nombre)]
          const guardarLista = (sec: Contribucion[]) => aplicar(nombre, [{ grupo: principal, peso: 1 }, ...sec.filter(c => c.grupo !== principal)])
          const libres = GRUPOS.filter(g => g !== principal && !secundarios.some(c => c.grupo === g))
          return (
            <fieldset key={nombre} disabled={ocupado} className="space-y-1.5 border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
              <legend className="sr-only">{nombre}</legend>
              <p className="text-xs"><span className="font-semibold">{nombre}</span> <span className="text-muted">· principal: {principal}</span></p>
              <div className="flex flex-wrap items-center gap-2">
                {secundarios.map(c => (
                  <label key={c.grupo} className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted">{c.grupo}</span>
                    <select value={c.peso} aria-label={`${c.grupo} en ${nombre}`}
                      onChange={e => guardarLista(secundarios.map(x => x.grupo === c.grupo ? { ...x, peso: Number(e.target.value) } : x))}
                      className="bg-card border border-border rounded px-1 py-0.5">
                      {PESOS_POSIBLES.map(p => <option key={p} value={p}>{etiquetaPeso(p)}</option>)}
                    </select>
                  </label>
                ))}
                {libres.length > 0 && (
                  <select value="" aria-label={`Añadir un músculo a ${nombre}`}
                    onChange={e => { if (e.target.value) guardarLista([...secundarios, { grupo: e.target.value, peso: PESO_INDIRECTO_POR_DEFECTO }]) }}
                    className="bg-card border border-border rounded px-1 py-0.5 text-[11px] text-muted">
                    <option value="">+ añadir músculo</option>
                    {libres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
                {propio && (
                  <button type="button" onClick={() => aplicar(nombre, null)} className="text-[11px] text-accent font-semibold hover:underline">
                    Volver a los valores de partida
                  </button>
                )}
              </div>
            </fieldset>
          )
        })}
      </div>
    </details>
  )
}
