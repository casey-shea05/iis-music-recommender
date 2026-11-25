import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeTrack } from '@/testFixtures.tsx'
import { TrackThumbnail } from './TrackThumbnail.tsx'

describe('TrackThumbnail', () => {
  it('shows the catalogue image when the track has one', () => {
    const { container } = render(<TrackThumbnail track={makeTrack({ id: 'a', imageUrl: 'https://img.test/a.jpg' })} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.test/a.jpg')
  })

  it('falls back to the placeholder when the image fails to load', () => {
    const { container } = render(<TrackThumbnail track={makeTrack({ id: 'a', imageUrl: 'https://img.test/a.jpg' })} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.firstChild).toBeInTheDocument()
  })
})
