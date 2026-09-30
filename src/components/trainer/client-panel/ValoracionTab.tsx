import { useState, useEffect } from 'react'
import { ChevronLeft, Save, Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { ClientData } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../shared/Toast'

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
  created_at: number
}

function emptyValoracion(clientId: string, trainerId: string): Valoracion {
  return {
    id: `val_${Date.now()}`,
    client_id: clientId,
    trainer_id: trainerId,
    fecha: new Date().toISOString().split('T')[0],
    peso: null, imc: null, grasa_corporal: null, masa_muscular: null,
    cintura: null, cadera: null, pecho: null,
    brazo_d: null, brazo_i: null, muslo_d: null, muslo_i: null,
    notas: '', fotos: [],
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

  useEffect(() => {
    loadValoraciones()
  }, [client.id])

  const loadValoraciones = async () => {
    setLoading(true)
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
    const { error } = await supabase.from('valoraciones').upsert(editing, { onConflict: 'id' })
    if (error) { toast('Error al guardar', 'warn'); setSaving(false); return }
    setValoraciones(vs => vs.find(v => v.id === editing.id)
      ? vs.map(v => v.id === editing.id ? editing : v)
      : [editing, ...vs])
    setEditing(null)
    toast('Valoración guardada ✓', 'ok')
    setSaving(false)
  }

  const deleteValoracion = async (id: string) => {
    await supabase.from('valoraciones').delete().eq('id', id)
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
        <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
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
          <p className="text-xs text-muted mt-0.5">{valoraciones.length} valoración{valoraciones.length !== 1 ? 'es' : ''}</p>
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
                    <button onClick={() => setEditing(val)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteValoracion(val.id)} className="p-1.5 text-muted hover:text-warn rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setExpanded(isExpanded ? null : val.id)} className="p-1.5 text-muted rounded-lg">
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
                          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{c.label}</p>
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
