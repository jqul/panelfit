import { describe, it, expect } from 'vitest'
import { detectSwipe, startsOnNoSwipe, SWIPE_MIN_DISTANCE, SWIPE_MAX_DURATION } from './swipe'

describe('detectSwipe', () => {
  it('un gesto horizontal largo y rápido es deslizar; el signo da la dirección', () => {
    expect(detectSwipe(-120, 10, 250)).toBe('left')
    expect(detectSwipe(120, -10, 250)).toBe('right')
  })
  it('un gesto corto no cuenta', () => {
    expect(detectSwipe(SWIPE_MIN_DISTANCE - 1, 0, 150)).toBeNull()
    expect(detectSwipe(SWIPE_MIN_DISTANCE, 0, 150)).toBe('right')
  })
  it('desplazar la pantalla (sobre todo vertical, o en diagonal) no cuenta', () => {
    expect(detectSwipe(80, 200, 300)).toBeNull()
    expect(detectSwipe(100, 90, 300)).toBeNull()   // diagonal
    expect(detectSwipe(100, 60, 300)).toBeNull()   // 100 < 60 × 1,8
    expect(detectSwipe(100, 40, 300)).toBe('right')
  })
  it('un arrastre lento no cuenta', () => {
    expect(detectSwipe(150, 0, SWIPE_MAX_DURATION + 1)).toBeNull()
    expect(detectSwipe(150, 0, SWIPE_MAX_DURATION)).toBe('right')
  })
})

// Sin DOM en el entorno de pruebas: un elemento falso cuyo closest() entiende los selectores simples que usa swipe.ts.
function fakeEl(tag: string, attrs: string[] = [], ancestors: { tag: string; attrs?: string[] }[] = []) {
  const chain = [{ tag, attrs }, ...ancestors]
  return {
    closest: (selector: string) => {
      const parts = selector.split(',').map(x => x.trim())
      const hit = chain.find(n => parts.some(p => p.startsWith('[') ? (n.attrs ?? []).some(a => p.includes(a)) : p === n.tag))
      return hit ?? null
    },
  } as unknown as EventTarget
}

describe('startsOnNoSwipe', () => {
  it('no desliza si el gesto empieza en un campo de texto o número', () => {
    expect(startsOnNoSwipe(fakeEl('input'))).toBe(true)
    expect(startsOnNoSwipe(fakeEl('textarea'))).toBe(true)
    expect(startsOnNoSwipe(fakeEl('select'))).toBe(true)
  })
  it('ni dentro de algo marcado con data-no-swipe', () => {
    expect(startsOnNoSwipe(fakeEl('button', [], [{ tag: 'div', attrs: ['data-no-swipe'] }]))).toBe(true)
  })
  it('sí desliza sobre el resto', () => {
    expect(startsOnNoSwipe(fakeEl('button', [], [{ tag: 'div' }]))).toBe(false)
    expect(startsOnNoSwipe(null)).toBe(false)
    expect(startsOnNoSwipe({} as EventTarget)).toBe(false)
  })
})
