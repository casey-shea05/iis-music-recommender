import { describe, expect, it } from 'vitest'
import { createQueue, hasNext, hasPrevious, jumpTo, next, nowPlaying, previous } from './queue.ts'

const tracks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('queue', () => {
  it('starts with the first track Now playing', () => {
    expect(nowPlaying(createQueue(tracks))).toEqual({ id: 'a' })
  })

  it('next and previous move the cursor one track', () => {
    const atB = next(createQueue(tracks))
    expect(nowPlaying(atB)).toEqual({ id: 'b' })
    expect(nowPlaying(previous(atB))).toEqual({ id: 'a' })
  })

  it('stays on the first track at the start and the last track at the end', () => {
    const start = createQueue(tracks)
    expect(previous(start)).toBe(start)
    expect(hasPrevious(start)).toBe(false)

    const end = next(next(start))
    expect(nowPlaying(end)).toEqual({ id: 'c' })
    expect(hasNext(end)).toBe(false)
    expect(next(end)).toBe(end)
  })

  it('jumping back to a Heard track keeps every track in the queue', () => {
    const atC = jumpTo(createQueue(tracks), 2)
    const replay = jumpTo(atC, 0)
    expect(nowPlaying(replay)).toEqual({ id: 'a' })
    expect(replay.tracks).toEqual(tracks)
    expect(hasNext(replay)).toBe(true)
  })

  it('ignores a jump outside the queue', () => {
    const start = createQueue(tracks)
    expect(jumpTo(start, 3)).toBe(start)
    expect(jumpTo(start, -1)).toBe(start)
  })

  it('an empty queue has nothing Now playing and cannot move', () => {
    const empty = createQueue([])
    expect(nowPlaying(empty)).toBeNull()
    expect(hasNext(empty)).toBe(false)
    expect(hasPrevious(empty)).toBe(false)
    expect(next(empty)).toBe(empty)
  })
})
