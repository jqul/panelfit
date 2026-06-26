// Editor de la página pública del entrenador (pestaña en Settings)
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { Globe, Copy, Eye, Save, Inbox } from 'lucide-react'

interface Props {
  userProfile: UserProfile
}

interface PublicPageData {
  bio: string
  especialidades: string[]
  servicios: string[]
  ubicacion: string
  instagram: string
  whatsapp: string
  activa: boolean
}

const ESPECIALIDADES_OPTIONS = [
  'Hipertrofia', 'Pérdida de grasa', 'Fuerza', 'Powerlifting',
  'Resistencia', 'Rehabilitación', 'Nutrición deportiva', 'Iniciación',
  'Rendimiento deportivo', 'Entrenamiento funcional', 'Pilates', 'Yoga',
]

const DEFAULT_PAGE: PublicPageData = {
  bio: '',
  especialidades: [],
  servicios: ['Entrenamiento online personalizado', 'Seguimiento semanal', 'Plan de nutrición'],
  ubicacion: '',
  instagram: '',
  whatsapp: '',
  activa: false,
}

interface Lead { id: string; name: string; email: string | null; phone: string | null; message: string | null; status: string; created_at: number }

export function PublicPageEditor({ userProfile }: Props) {
  const [data, setData] = useState<PublicPageData>(DEFAULT_PAGE)
  const [slug, setSlug] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [preview, setPreview] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    loadData()
    loadLeads()
  }, [userProfile.uid])

  const loadLeads = async () => {
    const { data: rows } = await supabase.from('leads').select('*').eq('trainer_id', userProfile.uid).order('created_at', { ascending: false })
    if (rows) setLeads(rows as Lead[])
  }

  const setLeadStatus = async (id: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    await supabase.from('leads').update({ status }).eq('id', id)
  }

  const loadData = async () => {
    const { data: row } = await supabase
      .from('entrenadores')
      .select('slug, public_page')
      .eq('uid', userProfile.uid)
      .maybeSingle()

    if (row?.public_page) setData({ ...DEFAULT_PAGE, ...row.public_page })
    if (row?.slug) { setSlug(row.slug); setSlugInput(row.slug) }
    else {
      // Generar slug sugerido del nombre
      const suggested = userProfile.displayName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20)
      setSlugInput(suggested)
    }
  }

  const checkSlug = async (value: string) => {
    if (!value || value === slug) { setSlugAvailable(null); return }
    setCheckingSlug(true)
    const { data } = await supabase
      .from('entrenadores')
      .select('uid')
      .eq('slug', value)
      .maybeSingle()
    setSlugAvailable(!data || data.uid === userProfile.uid)
    setCheckingSlug(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const updates: any = { public_page: data }
    if (slugInput && slugInput !== slug && slugAvailable !== false) {
      updates.slug = slugInput
    }
    const { error } = await supabase
      .from('entrenadores')
      .update(updates)
      .eq('uid', userProfile.uid)

    if (error) { toast('Error al guardar', 'warn') }
    else {
      if (updates.slug) setSlug(updates.slug)
      toast('Página guardada ✓', 'ok')
    }
    setSaving(false)
  }

  const publicUrl = slug ? `${window.location.origin}/p/${slug}` : null

  const toggleEsp = (esp: string) => {
    setData(d => ({
      ...d,
      especialidades: d.especialidades.includes(esp)
        ? d.especialidades.filter(e => e !== esp)
        : [...d.especialidades, esp]
    }))
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Página pública</h3>
          <p className="text-xs text-muted mt-0.5">Tu perfil público para captar nuevos clientes</p>
        </div>
        <div className="flex gap-2">
          {publicUrl && (
            <button onClick={() => setPreview(!preview)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent transition-colors">
              <Eye className="w-3.5 h-3.5" /> Vista previa
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-40">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Toggle activa */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Página activa</p>
          <p className="text-xs text-muted">Los visitantes pueden encontrar tu perfil</p>
        </div>
        <button onClick={() => setData(d => ({ ...d, activa: !d.activa }))}
          className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${data.activa ? 'bg-ok' : 'bg-border'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${data.activa ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* URL pública */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">Tu URL pública</label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-bg border border-border rounded-xl overflow-hidden">
            <span className="px-3 text-xs text-muted whitespace-nowrap border-r border-border py-3">
              {window.location.origin}/p/
            </span>
            <input
              value={slugInput}
              onChange={e => {
                const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                setSlugInput(v)
                setSlugAvailable(null)
              }}
              onBlur={() => checkSlug(slugInput)}
              placeholder="tu-nombre"
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
            />
            {checkingSlug && <span className="px-3 text-xs text-muted">...</span>}
            {slugAvailable === true && <span className="px-3 text-xs text-ok">✓</span>}
            {slugAvailable === false && <span className="px-3 text-xs text-warn">✗</span>}
          </div>
          {publicUrl && (
            <button onClick={() => { navigator.clipboard.writeText(publicUrl); toast('URL copiada ✓', 'ok') }}
              className="px-3 py-2 border border-border rounded-xl text-muted hover:border-accent transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
        {slugAvailable === false && (
          <p className="text-xs text-warn">Ese nombre ya está en uso, elige otro</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">Sobre mí</label>
        <textarea value={data.bio} onChange={e => setData(d => ({ ...d, bio: e.target.value }))}
          placeholder="Cuéntales a tus futuros clientes quién eres, tu experiencia y tu filosofía de entrenamiento..."
          rows={4}
          className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
      </div>

      {/* Especialidades */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES_OPTIONS.map(esp => (
            <button key={esp} onClick={() => toggleEsp(esp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                data.especialidades.includes(esp)
                  ? 'bg-ink text-white border-ink'
                  : 'border-border text-muted hover:border-accent hover:text-accent'
              }`}>
              {esp}
            </button>
          ))}
        </div>
      </div>

      {/* Servicios */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">Servicios que ofreces</label>
        {data.servicios.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input value={s}
              onChange={e => {
                const updated = [...data.servicios]
                updated[i] = e.target.value
                setData(d => ({ ...d, servicios: updated }))
              }}
              className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none" />
            <button onClick={() => setData(d => ({ ...d, servicios: d.servicios.filter((_, idx) => idx !== i) }))}
              className="px-3 py-2 text-muted hover:text-warn border border-border rounded-xl text-sm">✕</button>
          </div>
        ))}
        <button onClick={() => setData(d => ({ ...d, servicios: [...d.servicios, ''] }))}
          className="text-xs text-accent hover:underline">+ Añadir servicio</button>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Ubicación</label>
          <input value={data.ubicacion} onChange={e => setData(d => ({ ...d, ubicacion: e.target.value }))}
            placeholder="Madrid, España" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Instagram</label>
          <input value={data.instagram} onChange={e => setData(d => ({ ...d, instagram: e.target.value }))}
            placeholder="@tunombre" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">WhatsApp contacto</label>
          <input value={data.whatsapp} onChange={e => setData(d => ({ ...d, whatsapp: e.target.value }))}
            placeholder="+34 600 000 000" className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
        </div>
      </div>

      {/* Vista previa */}
      {preview && publicUrl && (
        <div className="border-2 border-accent/20 rounded-2xl overflow-hidden">
          <div className="bg-accent/5 px-4 py-2 flex items-center gap-2 border-b border-accent/10">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-accent font-semibold">{publicUrl}</span>
          </div>
          <PublicPagePreview data={data} displayName={userProfile.displayName} />
        </div>
      )}

      {/* Leads captados desde la página pública */}
      <div className="space-y-2 pt-2">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted"><Inbox className="w-3.5 h-3.5" /> Contactos recibidos ({leads.length})</label>
        {leads.length === 0 ? (
          <p className="text-xs text-muted">Aquí aparecerán las personas que rellenen el formulario de tu página pública.</p>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => (
              <div key={lead.id} className="bg-bg border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{lead.name}</p>
                  <p className="text-xs text-muted">{[lead.email, lead.phone].filter(Boolean).join(' · ') || 'Sin contacto directo'}</p>
                  {lead.message && <p className="text-xs text-ink/70 mt-1 italic">"{lead.message}"</p>}
                  <p className="text-[10px] text-muted mt-1">{new Date(lead.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <select value={lead.status} onChange={e => setLeadStatus(lead.id, e.target.value)}
                  className="text-[11px] font-semibold bg-card border border-border rounded-lg px-2 py-1 outline-none flex-shrink-0">
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="descartado">Descartado</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PublicPagePreview({ data, displayName }: { data: PublicPageData; displayName: string }) {
  return (
    <div className="p-6 space-y-4 bg-white">
      <div className="text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-serif font-bold text-accent">{displayName[0]}</span>
        </div>
        <h1 className="text-xl font-serif font-bold">{displayName}</h1>
        {data.ubicacion && <p className="text-sm text-gray-500 mt-0.5">📍 {data.ubicacion}</p>}
      </div>
      {data.bio && <p className="text-sm text-gray-600 leading-relaxed text-center">{data.bio}</p>}
      {data.especialidades.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {data.especialidades.map(e => (
            <span key={e} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{e}</span>
          ))}
        </div>
      )}
      {data.servicios.filter(Boolean).length > 0 && (
        <div className="space-y-1.5">
          {data.servicios.filter(Boolean).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-ok">✓</span> {s}
            </div>
          ))}
        </div>
      )}
      {data.whatsapp && (
        <button className="w-full py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold">
          💬 Contactar por WhatsApp
        </button>
      )}
    </div>
  )
}
