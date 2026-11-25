import { describe, expect, it } from 'vitest'
import { catalogueChooser, createQueue, hasNext, hasPrevious, jumpTo, jumpToSkipping, next, nowPlaying, previous, recordHeard, remove, removeHeard, dropExcluded, topUp, upNext } from './queue.ts'

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

describe('top-up and Heard', () => {
  const catalogue = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}` }))
  const choose = catalogueChooser(catalogue)

  it('builds a queue of Now playing plus 5 Up next from fresh tracks in file order', () => {
    const q = topUp(createQueue([]), choose)
    expect(q.tracks.map((t) => t.id)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5'])
    expect(upNext(q)).toHaveLength(5)
  })

  it('tops up after moving and never repeats a track; stops when the catalogue runs out', () => {
    let q = topUp(createQueue([]), choose)
    for (let i = 0; i < 10; i++) q = topUp(next(q), choose)
    expect(q.tracks.map((t) => t.id)).toEqual(catalogue.map((t) => t.id))
    expect(hasNext(q)).toBe(false)
  })

  it('records a Heard track once', () => {
    const once = recordHeard(recordHeard([], { id: 'a' }), { id: 'b' })
    expect(recordHeard(once, { id: 'a' })).toBe(once)
    expect(once.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('jumping forward over Up next tracks', () => {
  const ids = (q: { tracks: readonly { id: string }[] }) => q.tracks.map((t) => t.id)

  it('drops skipped tracks that were never heard, so Previous only reaches played tracks', () => {
    const q = createQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }])
    const jumped = jumpToSkipping(q, 3, [])
    expect(ids(jumped)).toEqual(['a', 'd'])
    expect(nowPlaying(jumped)).toEqual({ id: 'd' })
    expect(nowPlaying(previous(jumped))).toEqual({ id: 'a' })
  })

  it('keeps skipped tracks that are already Heard', () => {
    const q = createQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(ids(jumpToSkipping(q, 2, [{ id: 'b' }]))).toEqual(['a', 'b', 'c'])
  })
})

describe('removing tracks', () => {
  const ids = (q: { tracks: readonly { id: string }[] }) => q.tracks.map((t) => t.id)
  const q = jumpTo(createQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]), 1)

  it('removing Now playing leaves the cursor on the track below', () => {
    const r = remove(q, 1)
    expect(ids(r)).toEqual(['a', 'c', 'd'])
    expect(nowPlaying(r)).toEqual({ id: 'c' })
  })

  it('removing a Heard track keeps Now playing; removing an Up next track keeps the cursor', () => {
    expect(nowPlaying(remove(q, 0))).toEqual({ id: 'b' })
    expect(nowPlaying(remove(q, 3))).toEqual({ id: 'b' })
  })

  it('removes a track from Heard', () => {
    expect(removeHeard([{ id: 'a' }, { id: 'b' }], 'a')).toEqual([{ id: 'b' }])
  })

  it('dropExcluded drops unheard excluded Up next tracks and tops up, keeping Now playing and Heard ones', () => {
    const catalogue = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }))
    const queue = jumpTo(createQueue(catalogue.slice(0, 4)), 1)
    const out = dropExcluded(queue, [{ id: 'd' }], (t) => ['b', 'c', 'd'].includes(t.id), catalogueChooser(catalogue.filter((t) => t.id > 'd')))
    expect(ids(out)).toEqual(['a', 'b', 'd', 'e', 'f', 'g'])
  })
})
