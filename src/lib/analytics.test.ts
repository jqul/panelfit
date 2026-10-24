import { describe, it, expect, vi } from 'vitest'

const calls = vi.hoisted(() => [] as string[])
const injectOpts = vi.hoisted(() => ({ beforeSend: null as null | ((e: { type: 'pageview'; url: string }) => { url: string } | null) }))
vi.mock('@vercel/analytics', () => ({
  inject: (o: { beforeSend: typeof injectOpts.beforeSend }) => { calls.push('inject'); injectOpts.beforeSend = o.beforeSend },
  track: (name: string) => { calls.push(`track:${name}`) },
}))

import { track, loadAnalytics } from './analytics'

describe('analytics bajo demanda', () => {
  it('inicializa antes de enviar el primer evento y solo una vez', async () => {
    track('demo_clicked')
    track('register_intent')
    await loadAnalytics()
    await new Promise(r => setTimeout(r, 0))
    expect(calls).toEqual(['inject', 'track:demo_clicked', 'track:register_intent'])
  })

  it('quita el token del cliente de la URL antes de enviarla', async () => {
    await loadAnalytics()
    const sent = injectOpts.beforeSend!({ type: 'pageview', url: 'https://panelfit.app/?c=SECRETO&utm=x' })
    expect(sent!.url).toBe('https://panelfit.app/?utm=x')
  })
})
