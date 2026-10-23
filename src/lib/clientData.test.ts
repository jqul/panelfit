import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { collectFileRefs, eraseClientFiles, clientFilePrefixes } from './clientData'

describe('collectFileRefs', () => {
  it('recoge fotos y vídeos de todas las tablas que los guardan, con su bucket', () => {
    const refs = collectFileRefs({
      foto_sessions: [{ front_url: 'fotos/c/s1/front.jpg', side_url: null, back_url: 'fotos/c/s1/back.jpg' }],
      progress_photos: [{ frontUrl: 'fotos/c/old.jpg' }],
      fotos: [{ url_frente: 'fotos/c/f.jpg' }],
      video_feedback: [{ video_url: 'c/v1.mp4', trainer_comment_video_url: 'c/reply/r1.mp4' }],
      registros: [{ logs: { ex_w0_d0_r0: { videoEjecucion: 'c/d/r0.mp4' }, ex_w0_d0_r1: { done: true } } }],
    })
    expect(refs).toEqual([
      { bucket: 'media', path: 'fotos/c/s1/front.jpg' }, { bucket: 'media', path: 'fotos/c/s1/back.jpg' },
      { bucket: 'media', path: 'fotos/c/old.jpg' }, { bucket: 'media', path: 'fotos/c/f.jpg' },
      { bucket: 'client-videos', path: 'c/v1.mp4' }, { bucket: 'client-videos', path: 'c/reply/r1.mp4' },
      { bucket: 'exercise-videos', path: 'c/d/r0.mp4' },
    ])
  })
  it('sin datos no devuelve nada', () => {
    expect(collectFileRefs({})).toEqual([])
  })
})

// Storage falso: carpetas (id null) y ficheros, con paginación de 1000.
function fakeStorage(tree: Record<string, { name: string; id: string | null }[]>) {
  const removed: Record<string, string[]> = {}
  const storage = {
    from: (bucket: string) => ({
      list: async (path: string, { limit, offset }: { limit: number; offset: number }) => ({ data: (tree[`${bucket}/${path}`] ?? []).slice(offset, offset + limit), error: null }),
      remove: async (paths: string[]) => { (removed[bucket] ||= []).push(...paths); return { error: null } },
    }),
  }
  return { storage, removed }
}

describe('eraseClientFiles', () => {
  it('recorre las carpetas y borra todos los ficheros del cliente en los tres buckets', async () => {
    const c = 'cli'
    const { storage, removed } = fakeStorage({
      [`media/fotos/${c}`]: [{ name: 's1', id: null }, { name: 's2', id: null }],
      [`media/fotos/${c}/s1`]: [{ name: 'front.jpg', id: 'a' }, { name: 'back.jpg', id: 'b' }],
      [`media/fotos/${c}/s2`]: [{ name: 'front.jpg', id: 'c' }],
      [`client-videos/${c}`]: [{ name: 'v1.mp4', id: 'd' }, { name: 'reply', id: null }],
      [`client-videos/${c}/reply`]: [{ name: 'r1.mp4', id: 'e' }],
    })
    const total = await eraseClientFiles(storage as any, c)
    expect(total).toBe(5)
    expect(removed.media.sort()).toEqual([`fotos/${c}/s1/back.jpg`, `fotos/${c}/s1/front.jpg`, `fotos/${c}/s2/front.jpg`])
    expect(removed['client-videos'].sort()).toEqual([`${c}/reply/r1.mp4`, `${c}/v1.mp4`])
    expect(removed['exercise-videos']).toBeUndefined()
  })
  it('pagina cuando hay más de 1000 ficheros y borra en lotes de 100', async () => {
    const c = 'cli'
    const many = Array.from({ length: 1500 }, (_, i) => ({ name: `f${i}.jpg`, id: String(i) }))
    const { storage, removed } = fakeStorage({ [`exercise-videos/${c}`]: many })
    expect(await eraseClientFiles(storage as any, c)).toBe(1500)
    expect(removed['exercise-videos']).toHaveLength(1500)
  })
  it('si Storage falla al borrar, lanza y no sigue', async () => {
    const storage = { from: () => ({ list: async () => ({ data: [{ name: 'a.jpg', id: '1' }], error: null }), remove: async () => ({ error: { message: 'sin permiso' } }) }) }
    await expect(eraseClientFiles(storage as any, 'x')).rejects.toThrow('sin permiso')
  })
  it('las rutas coinciden con las que usan los upload de la app', () => {
    expect(clientFilePrefixes('X')).toEqual([
      { bucket: 'media', path: 'fotos/X' }, { bucket: 'client-videos', path: 'X' }, { bucket: 'exercise-videos', path: 'X' },
    ])
  })
})
