// Compresión de vídeo 100% en el navegador — sin librerías externas (nada de
// ffmpeg.wasm, que añadiría ~25-30MB al bundle). Reproduce el vídeo original en
// un <video> oculto, dibuja cada fotograma en un <canvas> a menor resolución, y
// vuelve a grabar ese canvas con MediaRecorder. Reduce mucho el peso de vídeos
// grabados a 4K/60fps desde el móvil sin depender de nada pesado.
//
// Importante: esto reduce resolución y, opcionalmente, fps. Para vídeos que se
// vayan a analizar fotograma a fotograma (p.ej. el cálculo de altura de salto),
// usa un `fps` alto (o evita comprimir) para no perder precisión — el cálculo
// depende de los fps reales del vídeo, no de su resolución.

interface CompressOptions {
  maxDimension?: number   // lado largo máximo en px
  fps?: number            // fps de salida (techo, no sube fps si el original es menor)
  videoBitsPerSecond?: number
  skipBelowBytes?: number // no merece la pena comprimir archivos ya pequeños
}

export async function compressVideo(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxDimension = 960,
    fps = 30,
    videoBitsPerSecond = 1_800_000,
    skipBelowBytes = 8 * 1024 * 1024,
  } = opts

  if (!file.type.startsWith('video/')) return file
  if (file.size < skipBelowBytes) return file
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return file

  return new Promise<File>(resolve => {
    let settled = false
    const finish = (result: File) => { if (!settled) { settled = true; resolve(result) } }
    const giveUp = () => finish(file)

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = URL.createObjectURL(file)

    const safetyTimeout = setTimeout(giveUp, 120000) // nunca bloquear más de 2 min

    video.onloadedmetadata = () => {
      const srcW = video.videoWidth, srcH = video.videoHeight
      if (!srcW || !srcH) { giveUp(); return }
      const scale = Math.min(1, maxDimension / Math.max(srcW, srcH))
      const w = Math.max(2, Math.round(srcW * scale / 2) * 2)
      const h = Math.max(2, Math.round(srcH * scale / 2) * 2)

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { giveUp(); return }

      const outStream = canvas.captureStream(fps)

      // Conservar audio si el navegador lo permite (Chrome/Firefox sí, Safari no siempre)
      try {
        const src = video as HTMLVideoElement & { captureStream?: () => MediaStream }
        const audioSrc = src.captureStream?.()
        audioSrc?.getAudioTracks().forEach(t => outStream.addTrack(t))
      } catch { /* sin audio si no está soportado — no es crítico para vídeos de técnica */ }

      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
        .find(t => MediaRecorder.isTypeSupported(t))
      if (!mimeType) { giveUp(); return }

      const recorder = new MediaRecorder(outStream, { mimeType, videoBitsPerSecond })
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onerror = giveUp

      recorder.onstop = () => {
        clearTimeout(safetyTimeout)
        URL.revokeObjectURL(video.src)
        const blob = new Blob(chunks, { type: mimeType })
        if (blob.size === 0 || blob.size >= file.size) { finish(file); return }
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const name = file.name.replace(/\.\w+$/, '') + `.${ext}`
        finish(new File([blob], name, { type: mimeType }))
      }

      let raf = 0
      const draw = () => {
        if (video.paused || video.ended) return
        ctx.drawImage(video, 0, 0, w, h)
        raf = requestAnimationFrame(draw)
      }

      video.onplay = () => { recorder.start(); draw() }
      video.onended = () => { cancelAnimationFrame(raf); if (recorder.state === 'recording') recorder.stop() }
      video.onerror = giveUp

      video.play().catch(giveUp)
    }
    video.onerror = giveUp
  })
}
