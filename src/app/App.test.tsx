import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { makeTrack, renderWithPlayback } from '@/testFixtures.tsx'
import App from './App.tsx'

test('smoke: App renders its heading, the player and the banner', async () => {
  await renderWithPlayback(<App />, { tracks: [makeTrack({ id: 'a', title: 'Alpha' })] })
  expect(screen.getByRole('heading', { name: /^music recommender$/i })).toBeInTheDocument()
  expect(screen.getByText('Alpha')).toBeInTheDocument()
  expect(screen.getByRole('status')).toBeInTheDocument()
})
