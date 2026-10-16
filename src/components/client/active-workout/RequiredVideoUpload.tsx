import { SignedVideo } from '../../shared/SignedMedia'

interface Props {
  trainerMode?: boolean
  videoUploaded?: string
  uploading: boolean
  onUpload: (file: File) => void
}

// Vídeo de ejecución requerido por el entrenador para este ejercicio — se
// sube y queda adjunto de inmediato al registro, sin pasar por el ciclo de
// petición/respuesta del feedback asíncrono (VideoFeedbackButton).
export function RequiredVideoUpload({ trainerMode, videoUploaded, uploading, onUpload }: Props) {
  return (
    <div className={`mx-4 mb-3 border-2 rounded-2xl p-4 space-y-2 ${videoUploaded ? 'border-ok/30 bg-ok/5' : 'border-dashed border-warn/30 bg-warn/5'}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">📹</span>
        <div>
          <p className="text-sm font-semibold">{trainerMode ? 'Vídeo de ejecución pedido a este cliente' : 'Tu entrenador pide vídeo de este ejercicio'}</p>
          <p className="text-xs text-muted">Graba la ejecución y súbela aquí</p>
        </div>
      </div>
      {videoUploaded ? (
        <div className="flex items-center gap-2">
          <span className="text-ok text-sm font-semibold">✓ Vídeo subido</span>
          <SignedVideo bucket="exercise-videos" src={videoUploaded} className="h-16 rounded-lg" />
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 w-full py-3 bg-warn/10 border border-warn/20 rounded-xl text-sm font-semibold text-warn cursor-pointer hover:bg-warn/20 transition-colors">
          {uploading ? 'Procesando...' : '📹 Grabar / subir vídeo'}
          {/* Sin capture: con él el móvil abre la cámara directo y no deja
              elegir un vídeo ya grabado, aunque el texto diga "grabar/subir". */}
          <input type="file" accept="video/*" className="hidden"
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
        </label>
      )}
    </div>
  )
}
