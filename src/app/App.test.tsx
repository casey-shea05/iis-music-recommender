import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, test } from 'vitest'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import App from './App.tsx'

test('smoke: App renders its heading, the player and the banner', async () => {
  await renderWithPlayback(<App />, { tracks: [makeTrack({ id: 'a', title: 'Alpha' })] })
  expect(screen.getByRole('heading', { name: /^music recommender$/i })).toBeInTheDocument()
  expect(screen.getByText('Alpha')).toBeInTheDocument()
  expect(screen.getByRole('status')).toBeInTheDocument()
})

const ann = { id: 'ann', name: 'Ann' }
const bo = { id: 'bo', name: 'Bo' }
const catalogue = [
  makeTrack({ id: 'a', title: 'Alpha', artists: [ann] }),
  makeTrack({ id: 'b', title: 'Bravo', artists: [bo] }),
  makeTrack({ id: 'c', title: 'Charlie', artists: [ann] }),
  makeTrack({ id: 'd', title: 'Delta', artists: [bo] }),
]
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const dislikeWith = (...chips: (string | RegExp)[]) => {
  if (screen.queryByRole('dialog')) press('Collapse player')
  press('Dislike this track')
  chips.forEach(press)
  press(/^(submit|dislike without a reason)$/i)
}

describe('disliking from the Reason panel', () => {
  beforeEach(() => localStorage.clear())

  it('removes the track and plays the next', async () => {
    await renderWithPlayback(<App />, { tracks: catalogue })
    dislikeWith('Too slow')
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
  })

  it('blocking an artist drops their Up next tracks, a replayed Heard track can be disliked, and Start new queue keeps only the block', async () => {
    await renderWithPlayback(<App />, { tracks: catalogue })
    press('Next') // Bravo; Alpha is Heard
    dislikeWith('Not a fan of this artist') // blocks Bo, drops Delta
    expect(screen.queryByText('Delta')).not.toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('region', { name: 'Heard' })).getByText('Alpha')) // replay
    dislikeWith() // removes Alpha from Heard as well
    expect(within(screen.getByRole('region', { name: 'Heard' })).queryByText('Alpha')).not.toBeInTheDocument()
    press('Start new queue')
    expect(JSON.parse(localStorage.getItem('blockedArtists')!).map((b: { tracks: { id: string }[] }) => b.tracks[0].id)).toEqual(['b'])
    expect(screen.getByText('Alpha')).toBeInTheDocument() // Alpha's dislike ended with the session
  })
})

describe('steering Up next after a dislike', () => {
  beforeEach(() => localStorage.clear())
  const slow = (id: string, tempo: number) => makeTrack({ id, title: id, features: { tempo, energy: 0.5, valence: 0.5, acousticness: 0.5 } })

  it('replaces a slow unheard Up next track with a faster candidate', async () => {
    // After Alpha goes, the top-up pulls in Fast, so Fast2 is the only candidate left to replace Slow.
    const tracks = [slow('Alpha', 100), slow('Mid', 120), slow('Slow', 70), slow('M1', 120), slow('M2', 120), slow('M3', 120), slow('Fast', 115), slow('Fast2', 118)]
    await renderWithPlayback(<App />, { tracks })
    dislikeWith('Too slow')
    expect(screen.queryByText('Slow')).not.toBeInTheDocument()
    expect(screen.getByText('Fast2')).toBeInTheDocument()
  })

  it('changes nothing when no candidate scores higher', async () => {
    const tracks = [slow('Alpha', 100), slow('Mid', 120), slow('Slow', 70), slow('M1', 120), slow('M2', 120), slow('M3', 120), slow('Fast', 115)]
    await renderWithPlayback(<App />, { tracks })
    dislikeWith('Too slow')
    expect(screen.getByText('Slow')).toBeInTheDocument()
  })
})
