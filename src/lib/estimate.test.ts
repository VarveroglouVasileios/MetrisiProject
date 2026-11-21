import { describe, expect, it } from 'vitest'
import { clampArea, estimate, formatNum, normalizePhone, range, summary, validateRequest, type Answers } from './estimate'

const bathroom: Answers = { space: 'bathroom', area: 6, level: 'mid', extras: ['heating'] }

describe('estimate', () => {
  it('splits materials, labour and extras and sums them', () => {
    const e = estimate(bathroom)
    expect(e).toMatchObject({ materials: 2880, labour: 2520, extras: 420, total: 5820 })
    expect(e.perM2).toBe(970)
  })
  it('gives a range around the total, rounded to 50 €', () => {
    const e = estimate(bathroom)
    expect(e.low).toBe(5350)
    expect(e.high).toBe(6400)
    expect(range(e)).toBe('5.350 – 6.400 €')
  })
  it('grows with area and with the material level', () => {
    const small = estimate({ ...bathroom, area: 3 }).total
    const big = estimate({ ...bathroom, area: 9 }).total
    expect(big).toBeGreaterThan(small)
    const levels = (['basic', 'mid', 'premium'] as const).map((level) => estimate({ ...bathroom, level }).total)
    expect(levels[0]).toBeLessThan(levels[1])
    expect(levels[1]).toBeLessThan(levels[2])
  })
  it('adds extras once, even if listed twice, and none when empty', () => {
    expect(estimate({ ...bathroom, extras: [] }).extras).toBe(0)
    expect(estimate({ ...bathroom, extras: ['heating', 'heating'] }).extras).toBe(estimate(bathroom).extras)
  })
  it('keeps the range ordered for every space and level', () => {
    for (const space of ['bathroom', 'kitchen', 'living', 'house'] as const)
      for (const level of ['basic', 'mid', 'premium'] as const) {
        const e = estimate({ space, area: 20, level, extras: ['plumbing', 'electrical'] })
        expect(e.low).toBeLessThan(e.total)
        expect(e.total).toBeLessThanOrEqual(e.high)
      }
  })
})

describe('input handling', () => {
  it('clamps area into the allowed range and survives NaN', () => {
    expect(clampArea('bathroom', 1)).toBe(3)
    expect(clampArea('bathroom', 400)).toBe(15)
    expect(clampArea('house', NaN)).toBe(40)
    expect(estimate({ ...bathroom, area: 400 }).total).toBe(estimate({ ...bathroom, area: 15 }).total)
  })
  it('formats numbers and summarises the answers in Greek', () => {
    expect(formatNum(5350)).toBe('5.350')
    expect(summary(bathroom)).toBe('Μπάνιο 6 m², μεσαία υλικά, θέρμανση δαπέδου.')
  })
})

describe('visit request', () => {
  it('accepts mobiles and landlines, rejects junk', () => {
    expect(normalizePhone('+30 691 234 5678')).toBe('6912345678')
    expect(normalizePhone('2510 123 456')).toBe('2510123456')
    expect(normalizePhone('12345')).toBeNull()
  })
  it('reports each missing field', () => {
    expect(validateRequest({ name: 'Ν', phone: '1', when: '' })).toEqual({ name: expect.any(String), phone: expect.any(String), when: expect.any(String) })
    expect(validateRequest({ name: 'Νίκος', phone: '6912345678', when: 'noon' })).toEqual({})
  })
})
