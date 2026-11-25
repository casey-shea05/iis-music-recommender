import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import { ExplanationText } from './ExplanationText.tsx'

const tracks = [makeTrack({ id: 'a', anchorArtistId: 'x' })]
const profile = { features: tracks[0].features, topArtists: [{ id: 'x', name: 'Ann' }] }
const full = /^Because you listen to Ann\. Closest to your taste in /

describe('ExplanationText', () => {
  it('shows the full wording in the bar strip', async () => {
    await renderWithPlayback(<ExplanationText />, { tracks, profile })
    expect(screen.getByText(full)).toBeInTheDocument()
  })

  it('shows the full wording in the expanded view', async () => {
    await renderWithPlayback(<ExplanationText variant="expanded" />, { tracks, profile })
    expect(screen.getByText(full)).toBeInTheDocument()
  })

  it('shows nothing without an explanation', async () => {
    const { container } = await renderWithPlayback(<ExplanationText />, { tracks })
    expect(container.querySelector('p')).toBeNull()
  })
})
