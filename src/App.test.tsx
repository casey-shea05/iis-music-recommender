import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('smoke: App renders its heading', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { name: /iis music recommender/i }),
  ).toBeInTheDocument()
})
