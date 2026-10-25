import { useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, MessageCircle, Copy, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../lib/errors'
import { isDemoTrainerId } from '../../../lib/demoIds'
import { DEMO_PROGRAMS, DEMO_PLAN_TEMPLATES, DEMO_SURVEY_TEMPLATE } from '../../../lib/demo-data'
import { summarizeResult, type BulkResult, type BuiltMessage } from '../../../lib/bulkActions'
import type { ProgramLike, WorkoutLike } from '../../../lib/bulkAssign'
import type { WeekPlan } from '../../../types'

// ── Qué se afecta ──────────────────────────────────────────

/** "Afecta a N clientes" con los primeros nombres, para que no haya dudas de a quién se le va a hacer. */
export function AffectedClients({ names }: { names: string[] }) {
  const shown = names.slice(0, 4).join(', ')
  const rest = names.length - 4
  return (
    <p className="px-5 sm:px-6 pt-4 text-sm" data-testid="afectados">
      <span className="font-semibold">Afecta a {names.length} cliente{names.length === 1 ? '' : 's'}</span>
      <span className="text-muted"> · {shown}{rest > 0 ? ` y ${rest} más` : ''}</span>
    </p>
  )
}

// ── Resultado ──────────────────────────────────────────────

/** Qué pasó con cada cliente: lo hecho, lo que falló y lo omitido, cada uno con su motivo. Nada queda callado. */
export function ResultView({ result, verb, nameOf, children }: { result: BulkResult; verb: string; nameOf: (id: string) => string; children?: ReactNode }) {
  const s = summarizeResult(result, verb)
  const Icon = s.tone === 'ok' ? CheckCircle2 : AlertTriangle
  return (
    <div className="px-5 sm:px-6 py-5 space-y-4" role="status" aria-live="polite">
      <div className={`flex items-start gap-3 ${s.tone === 'ok' ? 'text-ok' : 'text-warn'}`}>
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-ink">{s.headline}</p>
          {s.detail.length > 0 && <p className="text-sm text-muted mt-0.5">{s.detail.join(' · ')}</p>}
        </div>
      </div>
      {result.failed.length > 0 && <Problems title="No se pudo" items={result.failed} nameOf={nameOf} />}
      {result.skipped.length > 0 && <Problems title="Se han omitido" items={result.skipped} nameOf={nameOf} />}
      {children}
    </div>
  )
}

function Problems({ title, items, nameOf }: { title: string; items: { id: string; reason: string }[]; nameOf: (id: string) => string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">{title}</p>
      <ul className="border border-border rounded-xl divide-y divide-border/60">
        {items.map(p => (
          <li key={p.id} className="px-3 py-2 text-sm flex flex-wrap gap-x-2 justify-between">
            <span className="font-medium">{nameOf(p.id)}</span>
            <span className="text-muted">{p.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Lista de envío por WhatsApp ────────────────────────────

/**
 * Un botón por cliente en vez de abrir N pestañas de golpe (el navegador bloquea las ventanas que no
 * nacen de un clic). Cada fila queda marcada al enviarla y se ve cuántos faltan; el que no tiene
 * teléfono se avisa y se puede copiar el mensaje.
 */
export function SendList({ items }: { items: BuiltMessage[] }) {
  const [sent, setSent] = useState<Set<string>>(new Set())
  const mark = (id: string) => setSent(prev => new Set(prev).add(id))
  const copy = async (m: BuiltMessage) => {
    try { await navigator.clipboard.writeText(m.text) } catch { /* sin permiso: se queda sin marcar */ return }
    mark(m.clientId)
  }
  const pending = items.length - sent.size
  const noPhone = items.filter(i => !i.url).length
  return (
    <div className="px-5 sm:px-6 py-4 space-y-3">
      <p className="text-sm" role="status" aria-live="polite">
        <span className="font-semibold">{sent.size} de {items.length} enviados</span>
        <span className="text-muted">{pending > 0 ? ` · faltan ${pending}` : ' · ¡todos!'}{noPhone > 0 ? ` · ${noPhone} sin teléfono` : ''}</span>
      </p>
      <ul className="border border-border rounded-xl divide-y divide-border/60">
        {items.map(m => {
          const done = sent.has(m.clientId)
          return (
            <li key={m.clientId} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted truncate">{m.url ? m.phone : 'Sin teléfono guardado'}</p>
              </div>
              {done && <span className="flex items-center gap-1 text-xs font-semibold text-ok"><Check className="w-3.5 h-3.5" />Enviado</span>}
              {m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer" onClick={() => mark(m.clientId)} aria-label={`Abrir WhatsApp con ${m.name}`}
                  className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90">
                  <MessageCircle className="w-4 h-4" />{done ? 'Otra vez' : 'WhatsApp'}
                </a>
              ) : (
                <button onClick={() => copy(m)} aria-label={`Copiar el mensaje para ${m.name}`}
                  className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt">
                  <Copy className="w-4 h-4" />Copiar
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Datos que hay que elegir (programas, workouts, encuestas) ─

export async function loadPrograms(trainerId: string): Promise<ProgramLike[] | null> {
  if (isDemoTrainerId(trainerId)) return DEMO_PROGRAMS as unknown as ProgramLike[]
  const { data, error } = await supabase.from('programs').select('id, name, tipo, weeks').eq('trainer_id', trainerId).order('created_at', { ascending: false })
  if (error) { logError('bulk:programs', error); return null }
  return (data || []) as ProgramLike[]
}

export async function loadWorkouts(trainerId: string): Promise<WorkoutLike[] | null> {
  if (isDemoTrainerId(trainerId)) return DEMO_PLAN_TEMPLATES.map(t => ({ id: t.id, name: t.name, type: t.type, weeks: t.weeks }))
  const { data, error } = await supabase.from('plan_templates').select('id, name, plan').eq('trainer_id', trainerId).order('created_at', { ascending: false })
  if (error) { logError('bulk:workouts', error); return null }
  return ((data || []) as { id: string; name: string; plan: { type?: string; weeks?: WeekPlan[] } | null }[])
    .map(r => ({ id: r.id, name: r.name, type: r.plan?.type || 'General', weeks: r.plan?.weeks || [] }))
}

export async function loadSurveys(trainerId: string): Promise<{ id: string; name: string }[] | null> {
  if (isDemoTrainerId(trainerId)) return [{ id: DEMO_SURVEY_TEMPLATE.id, name: DEMO_SURVEY_TEMPLATE.name }]
  const { data, error } = await supabase.from('survey_templates').select('id, name').eq('trainer_id', trainerId).order('created_at')
  if (error) { logError('bulk:surveys', error); return null }
  return (data || []) as { id: string; name: string }[]
}
