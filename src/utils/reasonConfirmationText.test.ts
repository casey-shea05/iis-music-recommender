import { describe, expect, it } from 'vitest'
import { reasonConfirmationText } from './reasonConfirmationText.ts'

describe('reasonConfirmationText', () => {
  it('lists what the chips ask for', () => {
    const reasons = [
      { kind: 'feature', feature: 'tempo', direction: 'higher' },
      { kind: 'feature', feature: 'energy', direction: 'lower' },
    ] as const
    expect(reasonConfirmationText(reasons, '')).toBe('Noted: faster tempo, less intense.')
  })

  it('says nothing else changes when no reason is given', () => {
    expect(reasonConfirmationText([], '  ')).toBe('Removed. No reason given, so nothing else changes.')
  })

  it("says typed reasons don't steer", () => {
    expect(reasonConfirmationText([], 'too repetitive')).toBe("Saved. Typed reasons are listed but don't steer yet.")
  })
})
