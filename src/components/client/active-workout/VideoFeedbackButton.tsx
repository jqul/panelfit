import { useState, useRef } from 'react'
import { Video, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

// ── Subida de vídeo de feedback (inspirado en TrueCoach) ──
export function VideoFeedbackButton({ exerciseName, clientId, trainerId }: { exerciseName: string; clientId: string; trainerId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() || 'mp4'
      const path = `${clientId}/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('client-videos').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('client-videos').getPublicUrl(path)

      const row = {
        id: `vf_${Date.now()}`,
        trainer_id: trainerId,
        client_id: clientId,
        exercise_name: exerciseName,
        video_url: urlData.publicUrl,
        client_note: note.trim() || null,
        status: 'pendiente',
        created_at: Date.now(),
      }
      const { error: insertErr } = await supabase.from('video_feedback').insert(row)
      if (insertErr) throw insertErr

      setSent(true)
      setTimeout(() => { setShowModal(false); setSent(false); setNote('') }, 1800)
    } catch (e: any) {
      setError('No se pudo subir el vídeo. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  if (!trainerId) return null

  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent active:scale-95 transition-all">
        <Video className="w-3 h-3" /> Pedir feedback
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-ink/60 flex items-end justify-center" onClick={() => !uploading && setShowModal(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-1" />

            {sent ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-ok mx-auto" />
                <p className="font-bold text-sm">Vídeo enviado a tu entrenador</p>
                <p className="text-xs text-muted">Te avisaremos cuando te comente la técnica</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-accent" />
                  <p className="text-sm font-bold">Vídeo de tu ejecución</p>
                </div>
                <p className="text-xs text-muted">Grábate haciendo {exerciseName} y tu entrenador te comentará la técnica</p>

                <input ref={fileRef} type="file" accept="video/*" capture="user" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

                {uploading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-accent">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">Subiendo vídeo...</span>
                  </div>
                ) : (
                  <>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Nota para tu entrenador (opcional): ¿qué quieres que revise?"
                      rows={2}
                      className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white rounded-2xl text-sm font-bold">
                      <Upload className="w-4 h-4" /> Grabar o elegir vídeo
                    </button>
                  </>
                )}
                {error && <p className="text-xs text-warn text-center">{error}</p>}
                {!uploading && (
                  <button onClick={() => setShowModal(false)} className="w-full py-2 text-xs text-muted">Cancelar</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
