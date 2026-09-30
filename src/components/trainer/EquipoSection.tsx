import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { Users2, UserPlus, X } from 'lucide-react'

interface Member { id: string; member_uid: string; displayName: string; email: string }

export function EquipoSection({ ownerId }: { ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  useEffect(() => { loadMembers() }, [ownerId])

  const loadMembers = async () => {
    setListLoading(true)
    const { data: rows } = await supabase.from('team_members').select('id, member_uid').eq('owner_id', ownerId)
    if (!rows?.length) { setMembers([]); setListLoading(false); return }
    const { data: trainers } = await supabase.from('entrenadores').select('uid, "displayName", email').in('uid', rows.map(r => r.member_uid))
    setMembers(rows.map(r => {
      const t = trainers?.find(t => t.uid === r.member_uid)
      return { id: r.id, member_uid: r.member_uid, displayName: t?.displayName || '—', email: t?.email || '' }
    }))
    setListLoading(false)
  }

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true)
    const { data: foundUid, error: rpcError } = await supabase.rpc('find_trainer_by_email', { p_email: email.trim().toLowerCase() })
    if (rpcError || !foundUid) {
      toast('Ese email no tiene cuenta de entrenador en PanelFit todavía', 'warn')
      setLoading(false)
      return
    }
    if (foundUid === ownerId) { toast('No puedes añadirte a ti mismo', 'warn'); setLoading(false); return }
    const { error } = await supabase.from('team_members').insert({ owner_id: ownerId, member_uid: foundUid, role: 'coach', created_at: Date.now() })
    setLoading(false)
    if (error) { toast(error.code === '23505' ? 'Ya está en tu equipo' : 'Error al invitar', 'warn'); return }
    setEmail('')
    toast('Compañero añadido ✓', 'ok')
    loadMembers()
  }

  const removeMember = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(m => m.filter(x => x.id !== id))
    toast('Eliminado del equipo', 'ok')
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Users2 className="w-4 h-4" /> Equipo</h3>
        <p className="text-xs text-muted mt-0.5">Añade otros entrenadores de PanelFit para que gestionen a tus clientes contigo (necesitan tener ya su propia cuenta).</p>
      </div>

      <div className="flex gap-2">
        <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && invite()}
          placeholder="email del entrenador a invitar"
          className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        <button onClick={invite} disabled={loading || !email.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          <UserPlus className="w-4 h-4" /> {loading ? 'Añadiendo...' : 'Añadir'}
        </button>
      </div>

      {listLoading ? (
        <div className="h-12 bg-bg-alt rounded-xl animate-pulse" />
      ) : members.length === 0 ? (
        <p className="text-xs text-muted">Sin compañeros de equipo todavía. Solo tú gestionas tus clientes.</p>
      ) : (
        <div className="bg-bg border border-border rounded-xl divide-y divide-border overflow-hidden">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">{m.displayName[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.displayName}</p>
                <p className="text-[10px] text-muted truncate">{m.email}</p>
              </div>
              <button onClick={() => removeMember(m.id)} className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
