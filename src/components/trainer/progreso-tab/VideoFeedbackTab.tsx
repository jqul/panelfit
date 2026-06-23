import { useState, useEffect, useRef } from 'react'
import { Video, Clock, MessageCircle, Send, X, Upload, Loader2 } from 'lucide-react'
import { ClientData } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { EmptyState } from './helpers'

interface VideoFeedbackRow {
  id: string
  trainer_id: string
  client_id: string
  exercise_name: string
  video_url: string
  client_note: string | null
  trainer_comment: string | null
  trainer_comment_video_url: string | null
  status: 'pendiente' | 'comentado'
  created_at: number
  commented_at: number | null
}

export function VideoFeedbackTab({ client }: { client: ClientData }) {
  const [videos, setVideos] = useState<VideoFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState<VideoFeedbackRow | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingReply, setUploadingReply] = useState(false)
  const replyFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadVideos() }, [client.id])

  const loadVideos = async () => {
    setLoading(true)
    const { data } = await supabase.from('video_feedback').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    if (data) setVideos(data as VideoFeedbackRow[])
    setLoading(false)
  }

  const sendComment = async (videoId: string) => {
    if (!comment.trim()) return
    setSending(true)
    const { error } = await supabase.from('video_feedback')
      .update({ trainer_comment: comment.trim(), status: 'comentado', commented_at: Date.now() })
      .eq('id', videoId)
    setSending(false)
    if (error) return
    setVideos(v => v.map(vid => vid.id === videoId ? { ...vid, trainer_comment: comment.trim(), status: 'comentado', commented_at: Date.now() } : vid))
    setComment('')
    setActiveVideo(null)
  }

  const uploadReplyVideo = async (videoId: string, file: File) => {
    setUploadingReply(true)
    try {
      const ext = file.name.split('.').pop() || 'mp4'
      const path = `reply/${videoId}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('client-videos').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('client-videos').getPublicUrl(path)
      const { error } = await supabase.from('video_feedback')
        .update({ trainer_comment_video_url: urlData.publicUrl, status: 'comentado', commented_at: Date.now() })
        .eq('id', videoId)
      if (error) throw error
      setVideos(v => v.map(vid => vid.id === videoId ? { ...vid, trainer_comment_video_url: urlData.publicUrl, status: 'comentado', commented_at: Date.now() } : vid))
      setActiveVideo(v => v && v.id === videoId ? { ...v, trainer_comment_video_url: urlData.publicUrl, status: 'comentado' } : v)
    } catch {
      // silencioso: el botón vuelve a estar disponible para reintentar
    } finally {
      setUploadingReply(false)
    }
  }

  if (loading) return (
    <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
  )

  if (!videos.length) return (
    <EmptyState icon={<Video className="w-8 h-8 opacity-30" />} text="Sin vídeos enviados aún"
      sub="Aparecerán aquí cuando el cliente pida feedback de técnica desde su entreno" />
  )

  const pendientes = videos.filter(v => v.status === 'pendiente')
  const comentados = videos.filter(v => v.status === 'comentado')

  return (
    <div className="space-y-5">
      {pendientes.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-warn mb-2">Pendientes de comentar ({pendientes.length})</p>
          <div className="space-y-2">
            {pendientes.map(v => (
              <VideoFeedbackCard key={v.id} video={v} onOpen={() => { setActiveVideo(v); setComment('') }} />
            ))}
          </div>
        </div>
      )}

      {comentados.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Ya comentados ({comentados.length})</p>
          <div className="space-y-2">
            {comentados.map(v => (
              <VideoFeedbackCard key={v.id} video={v} onOpen={() => { setActiveVideo(v); setComment(v.trainer_comment || '') }} />
            ))}
          </div>
        </div>
      )}

      {/* Modal de revisión */}
      {activeVideo && (
        <div className="fixed inset-0 z-[60] bg-ink/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActiveVideo(null)}>
          <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-3 border-b border-border flex-shrink-0">
              <div>
                <p className="font-serif font-bold text-lg">{activeVideo.exercise_name}</p>
                <p className="text-[10px] text-muted">{new Date(activeVideo.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => setActiveVideo(null)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 pt-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <video src={activeVideo.video_url} controls className="w-full rounded-2xl bg-black max-h-80" />

              {activeVideo.client_note && (
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Nota del cliente</p>
                  <p className="text-sm">{activeVideo.client_note}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu comentario sobre la técnica</p>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Ej: Baja un poco más la cadera en la sentadilla, las rodillas se van hacia dentro..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
                <button onClick={() => sendComment(activeVideo.id)} disabled={!comment.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
                  <Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar comentario'}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">O responde con vídeo</p>
                {activeVideo.trainer_comment_video_url && (
                  <video src={activeVideo.trainer_comment_video_url} controls className="w-full rounded-2xl bg-black max-h-60" />
                )}
                <input ref={replyFileRef} type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadReplyVideo(activeVideo.id, f) }} />
                <button onClick={() => replyFileRef.current?.click()} disabled={uploadingReply}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-all disabled:opacity-50">
                  {uploadingReply ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Grabar o subir vídeo de respuesta</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VideoFeedbackCard({ video, onOpen }: { video: VideoFeedbackRow; onOpen: () => void }) {
  const isPending = video.status === 'pendiente'
  return (
    <button onClick={onOpen}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
        isPending ? 'bg-warn/5 border-warn/20' : 'bg-card border-border'
      }`}>
      <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center flex-shrink-0">
        <Video className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{video.exercise_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-muted" />
          <p className="text-[10px] text-muted">{new Date(video.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
          {video.client_note && <MessageCircle className="w-2.5 h-2.5 text-accent ml-1" />}
        </div>
      </div>
      {isPending ? (
        <span className="text-[9px] font-bold text-warn bg-warn/10 px-2 py-1 rounded-full flex-shrink-0">Pendiente</span>
      ) : (
        <span className="text-[9px] font-bold text-ok bg-ok/10 px-2 py-1 rounded-full flex-shrink-0">✓ Comentado</span>
      )}
    </button>
  )
}
