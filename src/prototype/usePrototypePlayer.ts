import { useCallback, useEffect, useMemo, useState } from 'react'
import catalogue from '../../data/catalogue.json'
import type { CatalogueTrack } from '../domain/catalogue.ts'
import { FakePlayer } from '../player/fakePlayer.ts'

const tracks = (catalogue.tracks as CatalogueTrack[]).slice(0, 8)

export type PlayerView = {
  track: CatalogueTrack | null
  playing: boolean
  positionMs: number
  durationMs: number
  hasPrevious: boolean
  hasNext: boolean
  togglePlay: () => void
  previous: () => void
  next: () => void
  seek: (positionMs: number) => void
  /** 0 to 1; 0 when muted. */
  volume: number
  setVolume: (volume: number) => void
  toggleMute: () => void
}

/** Stand-in for queue + player wiring. Real queue is IIS-27. */
export function usePrototypePlayer() {
  const player = useMemo(
    () => new FakePlayer(new Map(tracks.map((t) => [t.id, t.durationMs]))),
    [],
  )
  const [index, setIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [lastVolume, setLastVolume] = useState(1)
  const applyVolume = (v: number) => {
    setVolumeState(v)
    player.setVolume(v)
    if (v > 0) setLastVolume(v)
  }

  const playIndex = useCallback(
    (i: number) => {
      setIndex(i)
      setPlaying(true)
      player.play(tracks[i].id)
    },
    [player],
  )

  useEffect(() => player.onProgress((e) => setPositionMs(e.positionMs)), [player])
  useEffect(
    () =>
      player.onEnded(() => {
        if (index !== null && index < tracks.length - 1) playIndex(index + 1)
        else setPlaying(false)
      }),
    [player, index, playIndex],
  )
  useEffect(() => () => player.pause(), [player])

  const track = index === null ? null : tracks[index]
  const view: PlayerView = {
    track,
    playing,
    positionMs,
    durationMs: track?.durationMs ?? 0,
    hasPrevious: index !== null && index > 0,
    hasNext: index !== null && index < tracks.length - 1,
    togglePlay: () => {
      if (index === null) return playIndex(0)
      if (playing) player.pause()
      else player.resume()
      setPlaying(!playing)
    },
    previous: () => index !== null && index > 0 && playIndex(index - 1),
    next: () => index !== null && index < tracks.length - 1 && playIndex(index + 1),
    seek: (ms: number) => player.seek(ms),
    volume,
    setVolume: applyVolume,
    toggleMute: () => applyVolume(volume > 0 ? 0 : lastVolume),
  }

  return {
    view,
    tracks,
    playTrack: (id: string) => playIndex(tracks.findIndex((t) => t.id === id)),
    jumpNearEnd: () => track && player.seek(track.durationMs - 3000),
  }
}
