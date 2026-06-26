import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { NotFound } from '../shared/NotFound'
import { Check } from 'lucide-react'

interface PublicPageData {
  bio: string
  especialidades: string[]
  servicios: string[]
  ubicacion: string
  instagram: string
  whatsapp: string
  activa: boolean
}

interface Props { slug: string }

export function PublicTrainerPage({ slug }: Props) {
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [data, setData] = useState<PublicPageData | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadContact, setLeadContact] = useState('')
  const [leadMessage, setLeadMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.rpc('get_public_trainer_page', { p_slug: slug }).then(({ data: rows }) => {
      const row = rows?.[0]
      if (row) { setDisplayName(row.displayName); setData(row.public_page) }
      setLoading(false)
    })
  }, [slug])

  if (loading) return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return <NotFound />

  const sendLead = async () => {
    if (!leadName.trim()) return
    setSending(true)
    const { error } = await supabase.rpc('submit_lead', {
      p_slug: slug, p_name: leadName.trim(), p_email: leadContact.includes('@') ? leadContact.trim() : null,
      p_phone: !leadContact.includes('@') ? leadContact.trim() || null : null, p_message: leadMessage.trim() || null,
    })
    setSending(false)
    if (!error) setSent(true)
  }

  const waUrl = data.whatsapp
    ? `https://wa.me/${data.whatsapp.replace(/\s+/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(`Hola ${displayName}, vi tu página y me gustaría más información sobre entrenamiento.`)}`
    : null

  return (
    <div className="min-h-[100dvh] bg-bg">
      <div className="max-w-md mx-auto px-6 py-12 space-y-5">
        <div className="text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-serif font-bold text-accent">{displayName[0]?.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold">{displayName}</h1>
          {data.ubicacion && <p className="text-sm text-muted mt-1">📍 {data.ubicacion}</p>}
        </div>

        {data.bio && <p className="text-sm text-ink/80 leading-relaxed text-center">{data.bio}</p>}

        {data.especialidades.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {data.especialidades.map(e => (
              <span key={e} className="px-2.5 py-1 bg-card border border-border rounded-full text-xs font-semibold text-muted">{e}</span>
            ))}
          </div>
        )}

        {data.servicios.filter(Boolean).length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            {data.servicios.filter(Boolean).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-ok">✓</span> {s}
              </div>
            ))}
          </div>
        )}

        {waUrl && (
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
            💬 Contactar por WhatsApp
          </a>
        )}

        {sent ? (
          <div className="bg-ok/10 border border-ok/20 rounded-2xl p-4 text-center">
            <Check className="w-5 h-5 text-ok mx-auto mb-1" />
            <p className="text-sm font-semibold text-ok">¡Gracias! Te contactaré pronto.</p>
          </div>
        ) : showForm ? (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
            <input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Tu nombre"
              className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            <input value={leadContact} onChange={e => setLeadContact(e.target.value)} placeholder="Email o teléfono"
              className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            <textarea value={leadMessage} onChange={e => setLeadMessage(e.target.value)} rows={2} placeholder="Cuéntame qué buscas (opcional)"
              className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
            <button onClick={sendLead} disabled={!leadName.trim() || sending}
              className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3.5 border border-border rounded-2xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
            📩 Pedir más información
          </button>
        )}

        {data.instagram && (
          <a href={`https://instagram.com/${data.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer"
            className="block text-center text-sm text-accent hover:underline">
            {data.instagram}
          </a>
        )}

        <p className="text-center text-[10px] text-muted/60 pt-4">Página creada con PanelFit</p>
      </div>
    </div>
  )
}
