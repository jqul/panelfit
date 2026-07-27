import { useState, useEffect } from 'react'
import { Gift, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ReferralWidget({ trainerId, token }: { trainerId: string; token: string }) {
  const [slug, setSlug] = useState<string | null | 'loading'>('loading')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.rpc('get_trainer_referral_slug', { p_trainer_id: trainerId }).then(({ data }) => setSlug(data || null))
  }, [trainerId])

  if (slug === 'loading' || !slug) return null

  const link = `${window.location.origin}/p/${slug}?ref=${token}`
  const waText = encodeURIComponent(`¡Hola! Te recomiendo a mi entrenador/a, a mí me está yendo genial. Échale un vistazo:\n\n${link}`)

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Gift className="w-4 h-4 text-accent flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Invita a un amigo</p>
            <p className="text-xs text-muted">Comparte tu enlace y tu entrenador/a sabrá que fuiste tú</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
            💬 Compartir
          </a>
          <button onClick={copyLink}
            className="px-3 py-2.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
            {copied ? <><Check className="w-3.5 h-3.5 text-ok" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
