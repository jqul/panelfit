import { describe, it, expect } from 'vitest'
import { referralCode } from './referral'

describe('referralCode', () => {
  it('son los 16 primeros hex de sha256(token)', async () => {
    // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(await referralCode('abc')).toBe('ba7816bf8f01cfea')
  })
  it('no contiene el token y es estable', async () => {
    const token = '0123456789abcdef0123456789abcdef'
    const code = await referralCode(token)
    expect(code).toMatch(/^[0-9a-f]{16}$/)
    expect(token).not.toContain(code)
    expect(await referralCode(token)).toBe(code)
  })
  it('tokens distintos dan códigos distintos', async () => {
    expect(await referralCode('a')).not.toBe(await referralCode('b'))
  })
})
