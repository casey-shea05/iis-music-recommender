import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import { MusicPlayer } from '../../MusicPlayer.tsx'

const tracks = ['a', 'b', 'c', 'd'].map((id) => makeTrack({ id, title: id.toUpperCase(), artists: [{ id: `artist-${id}`, name: `Artist ${id}` }] }))
const tab = (name: string) => screen.getByRole('tab', { name })
const button = (name: string | RegExp) => screen.getByRole('button', { name })

async function openPanel() {
  await renderWithPlayback(<MusicPlayer />, { tracks })
  fireEvent.click(button('Expand player'))
}

describe('PlayerTabs', () => {
  beforeEach(() => localStorage.clear())

  it('opens on Reason with Dislikes and Blocked artists disabled while empty', async () => {
    await openPanel()
    expect(tab('Reason')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Dislikes')).toBeDisabled()
    expect(tab('Blocked artists')).toBeDisabled()
  })

  it('lists a dislike, then removes it', async () => {
    await openPanel()
    fireEvent.click(button('Too slow'))
    fireEvent.click(button('Submit'))
    expect(tab('Reason')).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(tab('Dislikes'))
    expect(screen.getByText('Too slow', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(button(/Remove dislike of/))
    // The tab stays open for batch edits, and can't be reopened once left.
    expect(tab('Dislikes')).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(tab('Reason'))
    expect(tab('Dislikes')).toBeDisabled()
  })

  it('keeps an artist-only block in Blocked artists, and unblocks from there', async () => {
    await openPanel()
    fireEvent.click(button('Not a fan of this artist'))
    fireEvent.click(button('Submit'))
    expect(tab('Dislikes')).toBeDisabled()
    fireEvent.click(tab('Blocked artists'))
    fireEvent.click(button(/Unblock/))
    expect(tab('Blocked artists')).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(tab('Reason'))
    expect(tab('Blocked artists')).toBeDisabled()
  })

  it('lists a dislike that has the artist reason plus another, and removing it keeps the block', async () => {
    await openPanel()
    fireEvent.click(button('Too slow'))
    fireEvent.click(button('Not a fan of this artist'))
    fireEvent.click(button('Submit'))
    fireEvent.click(tab('Dislikes'))
    fireEvent.click(button(/Remove dislike of/))
    expect(tab('Blocked artists')).toBeEnabled()
  })
})
