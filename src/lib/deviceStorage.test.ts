import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  cacheSet, cacheGet, isDeviceCacheEnabled, setDeviceCacheEnabled, hasPendingLogs, getPendingKeys, addPendingKeys, clearPendingKeys,
  clearClientDeviceData, sweepExpiredCaches, clearTrainerDeviceData, deviceKeys, CACHE_TTL_MS,
} from './deviceStorage'

function installLocalStorage() {
  const m = new Map<string, string>()
  const ls = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
  vi.stubGlobal('localStorage', ls)
  return m
}

describe('deviceStorage', () => {
  let store: Map<string, string>
  beforeEach(() => { store = installLocalStorage() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('guarda con marca de tiempo y devuelve el valor', () => {
    expect(cacheSet('pf_plan_cache_1', { a: 1 })).toBe(true)
    expect(cacheGet('pf_plan_cache_1')).toEqual({ a: 1 })
    expect(JSON.parse(store.get('pf_plan_cache_1')!)).toMatchObject({ v: { a: 1 } })
  })

  it('caduca a los 30 días y borra la copia', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    cacheSet('pf_plan_cache_1', { a: 1 })
    vi.setSystemTime(new Date(Date.now() + CACHE_TTL_MS - 1000))
    expect(cacheGet('pf_plan_cache_1')).toEqual({ a: 1 })
    vi.setSystemTime(new Date(Date.now() + 2000))
    expect(cacheGet('pf_plan_cache_1')).toBeNull()
    expect(store.has('pf_plan_cache_1')).toBe(false)
  })

  it('ignoreTtl no caduca (entrenos pendientes de subir)', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    cacheSet('pf_logs_1', { ex_w0_d0_r0: { done: true } })
    vi.setSystemTime(new Date(Date.now() + CACHE_TTL_MS * 3))
    expect(cacheGet('pf_logs_1', { ignoreTtl: true })).toEqual({ ex_w0_d0_r0: { done: true } })
  })

  it('acepta el formato antiguo sin marca de tiempo', () => {
    store.set('pf_logs_1', JSON.stringify({ ex_w0_d0_r0: { done: true } }))
    expect(cacheGet('pf_logs_1')).toEqual({ ex_w0_d0_r0: { done: true } })
  })

  it('un objeto de entrenos con claves t y v propias no se confunde con el envoltorio', () => {
    store.set('pf_logs_1', JSON.stringify({ t: { done: true }, v: { done: false } }))
    expect(cacheGet('pf_logs_1')).toEqual({ t: { done: true }, v: { done: false } })
  })

  it('JSON corrupto devuelve null sin lanzar', () => {
    store.set('pf_logs_1', '{no es json')
    expect(cacheGet('pf_logs_1')).toBeNull()
  })

  it('con la copia local desactivada no se guarda nada', () => {
    expect(isDeviceCacheEnabled()).toBe(true)
    setDeviceCacheEnabled(false)
    expect(isDeviceCacheEnabled()).toBe(false)
    expect(cacheSet('pf_plan_cache_1', { a: 1 })).toBe(false)
    expect(store.has('pf_plan_cache_1')).toBe(false)
    setDeviceCacheEnabled(true)
    expect(isDeviceCacheEnabled()).toBe(true)
  })

  it('al cerrar sesión borra ficha, plan y entrenos de ese cliente y deja el resto', () => {
    cacheSet(deviceKeys.client('tok'), { id: 'c1' })
    cacheSet(deviceKeys.plan('c1'), { weeks: [] })
    cacheSet(deviceKeys.logs('c1'), {})
    store.set('pf_dark_mode', '1')
    store.set(deviceKeys.plan('c2'), '{}')
    clearClientDeviceData('c1', 'tok')
    expect([...store.keys()].sort()).toEqual(['pf_dark_mode', 'pf_plan_cache_c2'])
  })

  it('keepPending conserva los entrenos sin subir pero borra ficha y plan', () => {
    cacheSet(deviceKeys.client('tok'), { id: 'c1' })
    cacheSet(deviceKeys.plan('c1'), { weeks: [] })
    cacheSet(deviceKeys.logs('c1'), { x: 1 })
    store.set(deviceKeys.pending('c1'), '1')
    expect(hasPendingLogs('c1')).toBe(true)
    clearClientDeviceData('c1', 'tok', { keepPending: true })
    expect(store.has(deviceKeys.logs('c1'))).toBe(true)
    expect(store.has(deviceKeys.pending('c1'))).toBe(true)
    expect(store.has(deviceKeys.plan('c1'))).toBe(false)
    expect(store.has(deviceKeys.client('tok'))).toBe(false)
  })

  it('keepPending sin pendientes borra también los entrenos', () => {
    cacheSet(deviceKeys.logs('c1'), { x: 1 })
    clearClientDeviceData('c1', undefined, { keepPending: true })
    expect(store.has(deviceKeys.logs('c1'))).toBe(false)
  })

  it('sweepExpiredCaches elimina solo las copias de ficha y plan caducadas', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    cacheSet('pf_plan_cache_viejo', { a: 1 })
    cacheSet('pf_logs_viejo', { a: 1 })
    vi.setSystemTime(new Date(Date.now() + CACHE_TTL_MS + 1000))
    cacheSet('pf_plan_cache_nuevo', { a: 2 })
    sweepExpiredCaches()
    expect(store.has('pf_plan_cache_viejo')).toBe(false)
    expect(store.has('pf_plan_cache_nuevo')).toBe(true)
    expect(store.has('pf_logs_viejo')).toBe(true) // los entrenos nunca se barren: pueden estar sin subir
  })

  it('clearTrainerDeviceData borra la nota rápida', () => {
    store.set('pf_quick_note', 'María: rodilla'); store.set('pf_dark_mode', '1')
    clearTrainerDeviceData()
    expect([...store.keys()]).toEqual(['pf_dark_mode'])
  })
})

describe('entrenos pendientes por ejercicio', () => {
  let store: Map<string, string>
  beforeEach(() => { store = installLocalStorage() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('acumula las claves cambiadas sin duplicarlas', () => {
    expect(getPendingKeys('c1')).toBeNull()
    addPendingKeys('c1', ['ex_w0_d0_r0'])
    addPendingKeys('c1', ['ex_w0_d0_r1', 'ex_w0_d0_r0'])
    expect(getPendingKeys('c1')).toEqual(['ex_w0_d0_r0', 'ex_w0_d0_r1'])
    expect(hasPendingLogs('c1')).toBe(true)
  })

  it('no crea un pendiente vacío', () => {
    addPendingKeys('c1', [])
    expect(hasPendingLogs('c1')).toBe(false)
  })

  it('al subir solo se quitan las claves subidas; lo añadido entretanto sigue pendiente', () => {
    addPendingKeys('c1', ['a', 'b'])
    addPendingKeys('c1', ['c']) // se marcó mientras se subían a y b
    clearPendingKeys('c1', ['a', 'b'])
    expect(getPendingKeys('c1')).toEqual(['c'])
    clearPendingKeys('c1', ['c'])
    expect(getPendingKeys('c1')).toBeNull()
    expect(hasPendingLogs('c1')).toBe(false)
  })

  it('el formato antiguo ("1") se trata como "todo" y se limpia al subir', () => {
    store.set(deviceKeys.pending('c1'), '1')
    expect(getPendingKeys('c1')).toBe('all')
    addPendingKeys('c1', ['a']) // sigue siendo "todo"
    expect(getPendingKeys('c1')).toBe('all')
    clearPendingKeys('c1', ['a'])
    expect(hasPendingLogs('c1')).toBe(false)
  })

  it('cerrar sesión con keepPending conserva las claves pendientes', () => {
    cacheSet(deviceKeys.logs('c1'), { a: 1 })
    addPendingKeys('c1', ['a'])
    clearClientDeviceData('c1', undefined, { keepPending: true })
    expect(getPendingKeys('c1')).toEqual(['a'])
    clearClientDeviceData('c1', undefined)
    expect(getPendingKeys('c1')).toBeNull()
  })
})
