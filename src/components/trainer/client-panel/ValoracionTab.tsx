import { useState, useEffect } from 'react'
import { ChevronLeft, Save, Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { ClientData } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../shared/Toast'
import { localDateKey } from '../../../lib/dates'
import { DEMO_VALORACIONES_MAP, isDemoClientId } from '../../../lib/demo-data-extra'
import { limpiarMetricas, nuevaMetrica, limpiarValores, evolucionMetrica, MAX_METRICAS, type MetricaPropia } from '../../../lib/metricasPropias'

// Métricas propias del entrenador (lib/metricasPropias.ts): se leen y guardan en su perfil. En la demo, en memoria.
let metricasDemo: MetricaPropia[] = [{ id: 'm_fcreposo', nombre: 'FC en reposo', unidad: 'lpm' }]
function useMetricasPropias(trainerId: string, demo: boolean) {
  const [metricas, setMetricas] = useState<MetricaPropia[]>([])
  useEffect(() => {
    if (demo) { setMetricas(metricasDemo); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      .then(({ data }) => setMetricas(limpiarMetricas((data?.profile as { metricasPropias?: unknown } | null)?.metricasPropias)))
  }, [trainerId, demo])
  const guardar = async (nuevas: MetricaPropia[]) => {
    const limpias = limpiarMetricas(nuevas)
    if (demo) { metricasDemo = limpias; setMetricas(limpias); return true }
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const { error } = await supabase.from('entrenadores').update({ profile: { ...(data?.profile || {}), metricasPropias: limpias } }).eq('uid', trainerId)
    if (error) { toast('No se pudo guardar la métrica', 'warn'); return false }
    setMetricas(limpias); return true
  }
  return { metricas, guardar }
}

interface Valoracion {
  id: string
  client_id: string
  trainer_id: string
  fecha: string
  peso: number | null
  imc: number | null
  grasa_corporal: number | null
  masa_muscular: number | null
  cintura: number | null
  cadera: number | null
  pecho: number | null
  brazo_d: number | null
  brazo_i: number | null
  muslo_d: number | null
  muslo_i: number | null
  notas: string
  fotos: string[]
  /** Valores de las métricas propias del entrenador: { idMetrica: número } */
  extra?: Record<string, number>
  created_at: number
}

function emptyValoracion(clientId: string, trainerId: string): Valoracion {
  return {
    id: `val_${Date.now()}`,
    client_id: clientId,
    trainer_id: trainerId,
    fecha: localDateKey(),
    peso: null, imc: null, grasa_corporal: null, masa_muscular: null,
    cintura: null, cadera: null, pecho: null,
    brazo_d: null, brazo_i: null, muslo_d: null, muslo_i: null,
    notas: '', fotos: [], extra: {},
    created_at: Date.now(),
  }
}

const CAMPOS_COMPOSICION = [
  { key: 'peso',           label: 'Peso',            unit: 'kg',  icon: '⚖️' },
  { key: 'imc',            label: 'IMC',             unit: '',    icon: '📊' },
  { key: 'grasa_corporal', label: '% Grasa corporal',unit: '%',   icon: '🔬' },
  { key: 'masa_muscular',  label: 'Masa muscular',   unit: 'kg',  icon: '💪' },
] as const

const CAMPOS_MEDIDAS = [
  { key: 'cintura', label: 'Cintura', unit: 'cm' },
  { key: 'cadera',  label: 'Cadera',  unit: 'cm' },
  { key: 'pecho',   label: 'Pecho',   unit: 'cm' },
  { key: 'brazo_d', label: 'Brazo D', unit: 'cm' },
  { key: 'brazo_i', label: 'Brazo I', unit: 'cm' },
  { key: 'muslo_d', label: 'Muslo D', unit: 'cm' },
  { key: 'muslo_i', label: 'Muslo I', unit: 'cm' },
] as const

export function ValoracionTab({ client, trainerId }: { client: ClientData; trainerId: string }) {
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Valoracion | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const { metricas, guardar: guardarMetricas } = useMetricasPropias(trainerId, isDemoClientId(client.id))
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [nuevaUnidad, setNuevaUnidad] = useState('')
  const anadirMetrica = async () => {
    if (!nuevaNombre.trim()) return
    if (await guardarMetricas([...metricas, nuevaMetrica(nuevaNombre, nuevaUnidad)])) { setNuevaNombre(''); setNuevaUnidad('') }
  }
  const setExtra = (id: string, valor: number | null) => {
    if (!editing) return
    const extra = { ...(editing.extra || {}) }
    if (valor === null || !Number.isFinite(valor)) delete extra[id]; else extra[id] = valor
    setEditing({ ...editing, extra })
  }

  useEffect(() => {
    loadValoraciones()
  }, [client.id])

  const loadValoraciones = async () => {
    setLoading(true)
    if (isDemoClientId(client.id)) {
      setValoraciones([...(DEMO_VALORACIONES_MAP[client.id] || [])] as Valoracion[])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('valoraciones')
      .select('*')
      .eq('client_id', client.id)
      .order('fecha', { ascending: false })
    if (data) setValoraciones(data)
    setLoading(false)
  }

  const saveValoracion = async () => {
    if (!editing) return
    setSaving(true)
    // Solo números; los de métricas que ya se quitaron se conservan (por si vuelven).
    const conservados = Object.fromEntries(Object.entries(editing.extra || {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)))
    const fila = { ...editing, extra: { ...conservados, ...limpiarValores(editing.extra, metricas) } }
    const { error } = isDemoClientId(client.id) ? { error: null } : await supabase.from('valoraciones').upsert(fila, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); setSaving(false); return }
    setValoraciones(vs => vs.find(v => v.id === editing.id)
      ? vs.map(v => v.id === editing.id ? editing : v)
      : [editing, ...vs])
    setEditing(null)
    toast('Valoración guardada ✓', 'ok')
    setSaving(false)
  }

  const deleteValoracion = async (id: string) => {
    if (!isDemoClientId(client.id)) await supabase.from('valoraciones').delete().eq('id', id)
    setValoraciones(vs => vs.filter(v => v.id !== id))
    toast('Eliminada', 'ok')
  }

  const updateField = (field: keyof Valoracion, value: any) => {
    if (!editing) return
    const updated = { ...editing, [field]: value }
    // Calcular IMC automáticamente
    if (field === 'peso' && updated.peso) {
      const altura = client.altura
      if (altura) updated.imc = Math.round((updated.peso / ((altura / 100) ** 2)) * 10) / 10
    }
    setEditing(updated)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Editor ──
  if (editing) return (
    <div className="max-w-xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing(null)} aria-label="Volver" className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-lg">Ficha de valoración</h3>
          <p className="text-xs text-muted">{client.name} {client.surname}</p>
        </div>
        <button onClick={saveValoracion} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Fecha */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Fecha de la valoración</label>
        <input type="date" value={editing.fecha} onChange={e => updateField('fecha', e.target.value)}
          className="px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {/* Composición corporal */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Composición corporal</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CAMPOS_COMPOSICION.map(campo => (
            <div key={campo.key}>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                {campo.icon} {campo.label} {campo.unit && <span className="text-muted/60">({campo.unit})</span>}
              </label>
              <input
                type="number" step="0.1"
                value={editing[campo.key] || ''}
                onChange={e => updateField(campo.key, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="—"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Medidas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Medidas (cm)</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {CAMPOS_MEDIDAS.map(campo => (
            <div key={campo.key}>
              <label className="block text-xs font-semibold text-muted mb-1.5">{campo.label}</label>
              <input
                type="number" step="0.1"
                value={editing[campo.key] || ''}
                onChange={e => updateField(campo.key, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="—"
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tus métricas (las que define el entrenador) */}
      <section aria-label="Tus métricas" className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tus métricas</p>
        </div>
        <div className="p-4 space-y-3">
          {metricas.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {metricas.map(m => (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={`metrica-${m.id}`} className="block text-xs font-semibold text-muted">{m.nombre} {m.unidad && <span className="text-muted/60">({m.unidad})</span>}</label>
                    <button type="button" onClick={() => { if (confirm(`¿Quitar «${m.nombre}» de tus métricas? Los valores ya guardados no se borran.`)) guardarMetricas(metricas.filter(x => x.id !== m.id)) }}
                      aria-label={`Quitar la métrica ${m.nombre}`} className="text-muted hover:text-warn text-xs px-1">✕</button>
                  </div>
                  <input id={`metrica-${m.id}`} type="number" step="0.1" value={editing.extra?.[m.id] ?? ''}
                    onChange={e => setExtra(m.id, e.target.value ? parseFloat(e.target.value) : null)} placeholder="—"
                    className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Añade lo que tú mides y no está arriba: FC en reposo, perímetro de cuello, salto, flexibilidad… Saldrá en todas tus valoraciones.</p>
          )}
          {metricas.length < MAX_METRICAS && (
            <div className="flex gap-2">
              <input value={nuevaNombre} onChange={e => setNuevaNombre(e.target.value)} maxLength={40} placeholder="Nueva métrica" aria-label="Nombre de la nueva métrica"
                className="flex-1 min-w-0 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
              <input value={nuevaUnidad} onChange={e => setNuevaUnidad(e.target.value)} maxLength={10} placeholder="Unidad" aria-label="Unidad de la nueva métrica"
                className="w-20 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
              <button type="button" onClick={anadirMetrica} disabled={!nuevaNombre.trim()} className="px-3 py-2 border border-border rounded-xl text-sm font-semibold disabled:opacity-40">Añadir</button>
            </div>
          )}
        </div>
      </section>

      {/* Notas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Observaciones</p>
        </div>
        <div className="p-4">
          <textarea value={editing.notas} onChange={e => updateField('notas', e.target.value)}
            placeholder="Observaciones, objetivos, notas del entrenador..."
            rows={4}
            className="w-full text-sm bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
        </div>
      </div>
    </div>
  )

  // ── Lista de valoraciones ──
  return (
    <div className="max-w-xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-lg">Fichas de valoración</h3>
          <p className="text-xs text-muted mt-0.5">{valoraciones.length} {valoraciones.length === 1 ? 'valoración' : 'valoraciones'}</p>
        </div>
        <button onClick={() => setEditing(emptyValoracion(client.id, trainerId))}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nueva valoración
        </button>
      </div>

      {valoraciones.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-serif text-lg font-bold">Sin valoraciones</p>
          <p className="text-sm mt-1">Registra la primera valoración física del cliente</p>
          <button onClick={() => setEditing(emptyValoracion(client.id, trainerId))}
            className="mt-4 px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
            Nueva valoración
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const evol = metricas.map(m => ({ m, e: evolucionMetrica(valoraciones, m.id) })).filter(x => x.e)
            return evol.length > 0 && (
              <section aria-label="Evolución de tus métricas" className="bg-card border border-border rounded-2xl px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Evolución de tus métricas</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {evol.map(({ m, e }) => (
                    <span key={m.id} className="text-sm">
                      <span className="text-muted">{m.nombre}:</span> {e!.primera} → <span className="font-semibold">{e!.ultima}</span>{m.unidad ? ` ${m.unidad}` : ''}
                      <span className="text-xs text-muted"> ({e!.diferencia > 0 ? '+' : ''}{e!.diferencia.toLocaleString('es-ES')})</span>
                    </span>
                  ))}
                </div>
              </section>
            )
          })()}
          {valoraciones.map(val => {
            const isExpanded = expanded === val.id
            const hasData = val.peso || val.grasa_corporal || val.cintura
            return (
              <div key={val.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {new Date(val.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {hasData && (
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {val.peso && <span className="text-xs text-muted">⚖️ {val.peso}kg</span>}
                        {val.grasa_corporal && <span className="text-xs text-muted">🔬 {val.grasa_corporal}% grasa</span>}
                        {val.imc && <span className="text-xs text-muted">📊 IMC {val.imc}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(val)} aria-label="Editar valoración" className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteValoracion(val.id)} aria-label="Eliminar valoración" className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setExpanded(isExpanded ? null : val.id)} aria-label={isExpanded ? 'Contraer' : 'Expandir'} className="p-1.5 text-muted rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-3">
                    {/* Composición */}
                    <div className="grid grid-cols-4 gap-2">
                      {CAMPOS_COMPOSICION.map(c => val[c.key] ? (
                        <div key={c.key} className="bg-bg border border-border rounded-xl p-2.5 text-center">
                          <p className="text-sm font-serif font-bold">{val[c.key]}{c.unit}</p>
                          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">{c.label}</p>
                        </div>
                      ) : null)}
                    </div>
                    {/* Medidas */}
                    {CAMPOS_MEDIDAS.some(c => val[c.key]) && (
                      <div className="flex flex-wrap gap-2">
                        {CAMPOS_MEDIDAS.map(c => val[c.key] ? (
                          <span key={c.key} className="text-xs bg-bg-alt border border-border px-2 py-1 rounded-lg font-medium">
                            {c.label}: {val[c.key]}cm
                          </span>
                        ) : null)}
                      </div>
                    )}
                    {/* Tus métricas */}
                    {metricas.some(m => typeof val.extra?.[m.id] === 'number') && (
                      <div className="flex flex-wrap gap-2">
                        {metricas.map(m => typeof val.extra?.[m.id] === 'number' ? (
                          <span key={m.id} className="text-xs bg-accent/5 border border-accent/20 px-2 py-1 rounded-lg font-medium">
                            {m.nombre}: {val.extra![m.id]}{m.unidad ? ` ${m.unidad}` : ''}
                          </span>
                        ) : null)}
                      </div>
                    )}
                    {/* Notas */}
                    {val.notas && (
                      <p className="text-xs text-muted leading-relaxed bg-bg-alt rounded-xl px-3 py-2">
                        {val.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
