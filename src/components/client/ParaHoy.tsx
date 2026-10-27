import { useEffect, useState } from 'react'
import { Dumbbell, HeartPulse, ListChecks, CalendarDays, Check, ChevronRight, Moon } from 'lucide-react'
import { estadoHoy, alCambiarHoy, irABloqueHoy, type EstadoHoy } from '../../lib/hoyEventos'

export interface EntrenoHoy {
  titulo: string
  hechos: number
  total: number
  completo: boolean
}

interface Fila {
  id: string
  icono: typeof Dumbbell
  titulo: string
  detalle: string
  hecho: boolean
  destino: string
}

// "Para hoy": todo lo que toca hoy en una lista corta, arriba del todo, para no tener que bajar por
// cada bloque para saber qué falta. Cada fila lleva a su bloque. Solo aparece con dos o más cosas:
// con una sola sería repetir la tarjeta del entreno.
export function ParaHoy({ clientId, entreno }: { clientId: string; entreno: EntrenoHoy | null }) {
  const [estado, setEstado] = useState<EstadoHoy>(() => estadoHoy(clientId))
  useEffect(() => {
    setEstado(estadoHoy(clientId))
    return alCambiarHoy(clientId, setEstado)
  }, [clientId])

  const filas: Fila[] = []
  filas.push(entreno
    ? {
        id: 'entreno', icono: Dumbbell, titulo: entreno.titulo, destino: 'hoy-entreno', hecho: entreno.completo,
        detalle: entreno.completo ? 'Hecho' : entreno.hechos > 0 ? `${entreno.hechos} de ${entreno.total} ejercicios` : `${entreno.total} ejercicios`,
      }
    : { id: 'entreno', icono: Moon, titulo: 'Día de descanso', detalle: 'Hoy no toca entrenar', hecho: true, destino: 'hoy-entreno' })
  if (estado.checkinHecho !== undefined) filas.push({
    id: 'checkin', icono: HeartPulse, titulo: '¿Cómo te encuentras?', destino: 'hoy-checkin',
    hecho: estado.checkinHecho, detalle: estado.checkinHecho ? 'Enviado' : '10 segundos',
  })
  if (estado.habitos && estado.habitos.total > 0) filas.push({
    id: 'habitos', icono: ListChecks, titulo: 'Hábitos', destino: 'hoy-habitos',
    hecho: estado.habitos.hechos >= estado.habitos.total, detalle: `${estado.habitos.hechos} de ${estado.habitos.total}`,
  })
  if (estado.citaHoy) filas.push({
    id: 'cita', icono: CalendarDays, titulo: 'Sesión con tu entrenador', destino: 'hoy-citas',
    hecho: false, detalle: `Hoy a las ${estado.citaHoy}`,
  })

  if (filas.length < 2) return null
  const hechas = filas.filter(f => f.hecho).length

  return (
    <section aria-labelledby="para-hoy-titulo" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <h3 id="para-hoy-titulo" className="font-serif font-bold text-base">Para hoy</h3>
        <span className="text-xs font-semibold text-muted tabular-nums" aria-live="polite">{hechas} de {filas.length} hecho{hechas === 1 ? '' : 's'}</span>
      </div>
      <ul className="divide-y divide-border/60">
        {filas.map(f => {
          const Icono = f.icono
          return (
            <li key={f.id}>
              <button type="button" onClick={() => irABloqueHoy(f.destino)}
                className={`w-full flex items-center gap-3 px-4 min-h-[56px] py-2.5 text-left transition-colors ${f.hecho ? 'bg-ok/5' : 'hover:bg-bg-alt/50'}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${f.hecho ? 'bg-ok/15 text-ok' : 'bg-bg-alt text-ink'}`} aria-hidden>
                  <Icono className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold truncate ${f.hecho ? 'text-muted' : ''}`}>{f.titulo}</span>
                  <span className={`block text-xs ${f.hecho ? 'text-ok font-semibold' : 'text-muted'}`}>{f.detalle}</span>
                </span>
                {f.hecho
                  ? <span className="w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center flex-shrink-0" aria-label="Hecho"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
                  : <ChevronRight className="w-4 h-4 text-muted/50 flex-shrink-0" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
