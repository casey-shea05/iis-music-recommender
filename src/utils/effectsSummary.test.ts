import { describe, expect, it } from 'vitest'
import { effectsSummary } from './effectsSummary.ts'

describe('effectsSummary', () => {
  it('says nothing is steering when there are no effects', () => {
    expect(effectsSummary([])).toBe('Nothing is steering Up next yet')
  })
  it('lists one or several effects in chip wording', () => {
    expect(effectsSummary([{ feature: 'tempo', direction: 'higher', threshold: 80 }])).toBe('Steering this session: faster tempo')
    expect(
      effectsSummary([
        { feature: 'tempo', direction: 'higher', threshold: 80 },
        { feature: 'energy', direction: 'lower', threshold: 0.7 },
      ]),
    ).toBe('Steering this session: faster tempo, less intense')
  })
})
