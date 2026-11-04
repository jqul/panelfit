import { MessageCircle, Archive, ChevronRight, Columns3 } from 'lucide-react'
import { ClientWithStats } from '../../hooks/useTrainerClients'
import { clientStatus, StatusLevel } from '../../lib/clientStatus'
import { lazy, Suspense, useState } from 'react'
import { COLUMNAS, alternarColumna, guardarColumnas, leerColumnas, plantillaColumnas, textoAlta, textoPlan, type Columna } from '../../lib/columnasClientes'
// Los 7 puntos llegan en un trozo aparte para no cargar el cumplimiento con el panel.
const PuntosSemanaCliente = lazy(() => import('./PuntosSemanaCliente').then(m => ({ default: m.PuntosSemanaCliente })))

interface Props {
  clients: ClientWithStats[]
  adherenciaMap: Record<string, number>
  formatLastActive: (date?: string) => string
  onOpen: (client: ClientWithStats) => void
  onSend: (client: ClientWithStats) => void
  /** Archivar se puede deshacer, así que va sin confirmación; borrar del todo solo desde Archivados. */
  onArchive: (id: string) => void
  /** Modo selección (acciones masivas): casilla por fila, y pulsar el nombre marca en vez de abrir la ficha. */
  selection?: { selected: ReadonlySet<string>; onToggle: (id: string) => void }
  /** Para recordar las columnas elegidas (por entrenador) y pintar las etiquetas. */
  trainerId: string
  labels?: { id: string; name: string; emoji?: string; color?: string }[]
}

const DOT: Record<StatusLevel, string> = {
  risk: 'bg-warn',
  review: 'bg-[#e0a854]',
  'no-plan': 'bg-muted/50',
  ok: 'bg-ok',
}

/** "Columnas": qué se ve en la lista (lib/columnasClientes). */
function SelectorColumnas({ cols, onChange }: { cols: Columna[]; onChange: (c: Columna[]) => void }) {
  return (
    <details className="relative">
      <summary className="list-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-ink cursor-pointer [&::-webkit-details-marker]:hidden">
        <Columns3 className="w-3.5 h-3.5" aria-hidden /> Columnas
      </summary>
      <fieldset className="absolute right-0 top-full mt-1 z-20 w-56 bg-card border border-border rounded-xl shadow-lg p-2 space-y-0.5">
        <legend className="sr-only">Columnas de la lista</legend>
        {COLUMNAS.map(c => (
          <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-bg-alt cursor-pointer">
            <input type="checkbox" checked={cols.includes(c.id)} onChange={() => onChange(alternarColumna(cols, c.id))} className="w-4 h-4 accent-accent" />
            {c.label}
          </label>
        ))}
      </fieldset>
    </details>
  )
}

// Lista de clientes pensada como centro de control: cada fila dice cómo está
// ese cliente (estado, último entreno, adherencia y qué alertas tiene) para no
// tener que abrir cada ficha. El entrenador elige qué columnas ver. En móvil
// cada fila pasa a ser una tarjeta.
export function ClientList({ clients, adherenciaMap, formatLastActive, onOpen, onSend, onArchive, selection, trainerId, labels = [] }: Props) {
  const now = new Date()
  const [cols, setCols] = useState<Columna[]>(() => leerColumnas(trainerId))
  const cambiar = (c: Columna[]) => { setCols(c); guardarColumnas(trainerId, c) }
  const ver = (c: Columna) => cols.includes(c)
  const rejilla = { gridTemplateColumns: plantillaColumnas(cols) }

  return (
    <div className="bg-card rounded-2xl" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex justify-end px-3 pt-2 md:hidden"><SelectorColumnas cols={cols} onChange={cambiar} /></div>
      <div className="hidden md:grid items-center gap-4 px-5 py-2 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted" style={rejilla}>
        <span>Cliente</span>
        {COLUMNAS.filter(c => ver(c.id)).map(c => <span key={c.id}>{c.label}</span>)}
        <span className="w-[88px] flex justify-end normal-case tracking-normal"><SelectorColumnas cols={cols} onChange={cambiar} /></span>
      </div>
      <ul className="divide-y divide-border/50">
        {clients.map(client => {
          const status = clientStatus(client, now)
          const adherencia = adherenciaMap[client.id] ?? 0
          const barColor = adherencia >= 75 ? '#4caf7d' : adherencia >= 40 ? '#e0a854' : '#e07b54'
          const fullName = `${client.name} ${client.surname || ''}`.trim()
          const isSelected = !!selection?.selected.has(client.id)
          const etiquetas = labels.filter(l => (client.label_ids || []).includes(l.id))
          const celdas: Record<Columna, JSX.Element> = {
            estado: (
              <span className="hidden md:flex items-center gap-2 text-sm font-medium">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[status.level]}`} aria-hidden />
                {status.label}
              </span>
            ),
            ultimo: <span className="hidden md:block text-sm text-muted">{client.doneToday ? <span className="text-ok font-semibold">Hoy</span> : formatLastActive(client.lastActive)}</span>,
            semana: (
              <div className="flex-1 min-w-0 md:flex-none">
                {client.hasPlan ? (
                  <div className="space-y-1.5">
                  {client.semanaFuente && (
                    <Suspense fallback={<span className="block h-2.5" aria-hidden />}>
                      <PuntosSemanaCliente plan={client.semanaFuente.plan} logs={client.semanaFuente.logs} ausencias={client.semanaFuente.ausencias} />
                    </Suspense>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 max-w-[120px] bg-bg-alt rounded-full overflow-hidden" role="progressbar" aria-valuenow={adherencia} aria-valuemin={0} aria-valuemax={100} aria-label="Cumplimiento semanal">
                      <div className="h-full rounded-full" style={{ width: `${adherencia}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-9" style={{ color: barColor }}>{adherencia}%</span>
                  </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>
            ),
            plan: <span className="hidden md:block text-sm text-muted truncate" data-columna="plan">{textoPlan(client, now)}</span>,
            etiquetas: (
              <span className="hidden md:flex flex-wrap gap-1 min-w-0" data-columna="etiquetas">
                {etiquetas.length ? etiquetas.map(l => (
                  <span key={l.id} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-bg-alt truncate max-w-full">{l.emoji} {l.name}</span>
                )) : <span className="text-sm text-muted">—</span>}
              </span>
            ),
            alta: <span className="hidden md:block text-sm text-muted" data-columna="alta">{textoAlta(client.createdAt)}</span>,
            alertas: (
              <div className="order-last w-full md:order-none md:w-auto min-w-0">
                {status.reasons.length === 0 ? (
                  <span className="hidden md:inline text-sm text-muted">Sin alertas</span>
                ) : (
                  <ul className="space-y-0.5">
                    {status.reasons.map(r => <li key={r} className="text-xs text-warn font-medium truncate">{r}</li>)}
                  </ul>
                )}
              </div>
            ),
          }
          return (
            <li key={client.id} aria-label={fullName} style={rejilla}
              className={`group flex flex-wrap items-center gap-x-3 gap-y-2 md:grid md:items-center md:gap-4 px-4 md:px-5 py-3.5 transition-colors ${isSelected ? 'bg-accent/5' : 'hover:bg-bg-alt/40'}`}>
              <div className="flex items-center gap-1 min-w-0 w-full md:w-auto">
              {selection && (
                <label className="flex items-center justify-center w-11 h-11 -ml-2.5 flex-shrink-0 cursor-pointer">
                  <input type="checkbox" checked={isSelected} onChange={() => selection.onToggle(client.id)} aria-label={`Seleccionar a ${fullName}`} className="w-5 h-5 accent-accent cursor-pointer" />
                </label>
              )}
              <button type="button" onClick={() => selection ? selection.onToggle(client.id) : onOpen(client)}
                tabIndex={selection ? -1 : undefined} aria-hidden={selection ? true : undefined}
                className="flex items-center gap-3 min-w-0 text-left flex-1" aria-label={`Abrir a ${fullName}`}>
                <span className="relative w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-serif text-base text-accent flex-shrink-0">
                  {client.name[0]?.toUpperCase()}
                  {client.doneToday && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ok rounded-full border-2 border-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif font-bold text-base truncate">{client.name} {client.surname}</span>
                  <span className="block md:hidden text-xs text-muted mt-0.5">{status.label} · {client.doneToday ? 'entrenó hoy' : formatLastActive(client.lastActive)}</span>
                </span>
                {!selection && <ChevronRight className="w-4 h-4 text-muted/40 md:hidden flex-shrink-0" />}
              </button>
              </div>

              {COLUMNAS.filter(c => ver(c.id)).map(c => <div key={c.id} className="contents">{celdas[c.id]}</div>)}

              <div className="flex items-center justify-end gap-1.5 md:w-[88px]">
                <button onClick={() => onSend(client)} aria-label={`Enviar enlace a ${client.name}`} title="Enviar enlace"
                  className="p-2 rounded-lg border border-border text-muted hover:text-ink hover:border-ink transition-colors"><MessageCircle className="w-4 h-4" /></button>
                <button onClick={() => onArchive(client.id)} aria-label={`Archivar a ${client.name}`} title="Archivar (se puede deshacer)"
                  className="p-2 rounded-lg border border-border text-muted hover:text-ink hover:border-ink transition-colors"><Archive className="w-4 h-4" /></button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
