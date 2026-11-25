// Playback state for the whole app. PlaybackProvider is the only owner of the queue cursor, play state,
// position, volume and mute memory; any component reads and drives it through usePlayback().
// Components never learn which engine is running beyond `status`.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { connectPlayer, startLogIn, type ConnectedPlayer, type FallbackReason } from '@/playback/connectPlayer.ts'
import type { Player } from '@/playback/player.ts'
import type { ArtistRef, CatalogueTrack, Features } from '@/recommender/catalogue.ts'
import { explain, type Explanation } from '@/recommender/scoring.ts'
import {
  catalogueChooser, createQueue, hasNext, hasPrevious, jumpToSkipping, next, nowPlaying, previous, recordHeard, remove, removeHeard, topUp, upNext,
  type Chooser, type Queue,
} from '@/recommender/queue.ts'

export type Playback = {
  status: 'connecting' | 'spotify' | 'fake'
  /** An engine is connected, so the controls work. False while `status` is 'connecting'. */
  ready: boolean
  /** Why the fake engine is running; null otherwise. */
  fallbackReason: FallbackReason | null
  nowPlaying: CatalogueTrack | null
  /** Why Now playing was picked; null when nothing plays or no profile was given. Up next and Heard have none. */
  explanation: Explanation | null
  /** The user's top artists, for naming an explanation's anchor artist. */
  topArtists: readonly ArtistRef[]
  /** From the engine once the track starts; null means show a placeholder. */
  artworkUrl: string | null
  playing: boolean
  positionMs: number
  durationMs: number
  hasPrevious: boolean
  hasNext: boolean
  /** The tracks after Now playing: 5 while the catalogue has fresh tracks to add. */
  upNext: readonly CatalogueTrack[]
  /** Tracks played this session, in order, each once. Only grows until Start new queue. */
  heard: readonly CatalogueTrack[]
  togglePlay(): void
  previous(): void
  next(): void
  /** Plays the track at this position in the queue (e.g. replaying a Heard track). */
  playAt(index: number): void
  /** Plays this track from the queue (e.g. a Heard or Up next click). */
  playTrack(track: CatalogueTrack): void
  /** Removes Now playing from the queue and from Heard (it is never recorded), plays the track below and tops up. */
  removeNowPlaying(): void
  /** Ends the session: empties Heard, rebuilds the queue from the first track and plays it. */
  startNewQueue(): void
  seek(positionMs: number): void
  /** 0 to 1; 0 while muted. */
  volume: number
  muted: boolean
  setVolume(volume: number): void
  /** Mutes, or unmutes back to the last volume above zero. */
  toggleMute(): void
  /** Starts a Spotify login, or null when Spotify isn't configured in .env. */
  logIn: (() => void) | null
}

const PlaybackContext = createContext<Playback | null>(null)

type ProviderProps = {
  tracks: readonly CatalogueTrack[]
  /** The taste profile (average features and top artists); explanations need it. Pass a stable object: a new one each render rebuilds the context value. */
  profile?: { features: Features; topArtists: ArtistRef[] }
  /** Picks fresh tracks for Up next; defaults to catalogue file order. */
  chooser?: Chooser<CatalogueTrack>
  /** Swapped in tests; defaults to trying Spotify, then the fake engine. */
  connect?: () => Promise<ConnectedPlayer>
  /** Swapped in tests; defaults to the Spotify login from .env. */
  logIn?: (() => void) | null
  children: ReactNode
}

export function PlaybackProvider({ tracks, profile, chooser, connect, logIn = startLogIn, children }: ProviderProps) {
  const [connection, setConnection] = useState<ConnectedPlayer | null>(null)
  const playerRef = useRef<Player | null>(null)
  const choose = useMemo(() => chooser ?? catalogueChooser(tracks), [chooser, tracks])
  const [queue, setQueue] = useState<Queue<CatalogueTrack>>(() => topUp(createQueue([]), chooser ?? catalogueChooser(tracks)))
  const [heard, setHeard] = useState<readonly CatalogueTrack[]>([])
  // Engine events read the ref, because they're subscribed once; the state re-renders.
  const queueRef = useRef(queue)
  /** The track the engine was last told to play, so Play knows whether to start or resume. */
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null)
  /** The engine's duration for the loaded track (Spotify's can differ slightly from the catalogue's). */
  const [engineDurationMs, setEngineDurationMs] = useState<number | null>(null)
  const [volume, setVolumeState] = useState(1)
  const volumeRef = useRef(volume)
  /** Mute memory: what unmuting returns to. */
  const unmutedVolume = useRef(volume)

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(Math.max(v, 0), 1)
    volumeRef.current = clamped
    if (clamped > 0) unmutedVolume.current = clamped
    setVolumeState(clamped)
    playerRef.current?.setVolume(clamped)
  }, [])

  const toggleMute = useCallback(
    () => setVolume(volumeRef.current > 0 ? 0 : unmutedVolume.current),
    [setVolume],
  )

  /**
   * Moves the cursor and plays the track there, topping up Up next and recording the track left as Heard.
   * A move past either end changes nothing. `restart` (Start new queue) plays even if the cursor didn't move
   * and starts Heard afresh.
   */
  const moveCursorAndPlay = useCallback((moved: Queue<CatalogueTrack>, restart = false) => {
    const player = playerRef.current
    if (!player || (moved === queueRef.current && !restart)) return
    const target = topUp(moved, choose)
    const track = nowPlaying(target)
    if (!track) return
    const left = nowPlaying(queueRef.current)
    if (restart) setHeard([])
    else if (left && moved.cursor !== queueRef.current.cursor) setHeard((h) => recordHeard(h, left))
    queueRef.current = target
    setQueue(target)
    setLoadedId(track.id)
    setPositionMs(0)
    setEngineDurationMs(null)
    setArtworkUrl(null)
    player.play(track.id)
    setPlaying(true)
  }, [choose])

  useEffect(() => {
    let cancelled = false
    let player: Player | null = null
    const connectEngine = connect ?? (() => connectPlayer({ tracks }))
    void connectEngine().then((result) => {
      player = result.player
      if (cancelled) return player.disconnect()
      playerRef.current = player
      player.setVolume(volumeRef.current)
      player.onProgress((e) => {
        setPositionMs(e.positionMs)
        setEngineDurationMs(e.durationMs)
      })
      player.onTrackStarted((e) => setArtworkUrl(e.artworkUrl))
      player.onEnded(() => {
        if (hasNext(queueRef.current)) return moveCursorAndPlay(next(queueRef.current))
        // End of the queue: unload the track, so Play starts it again rather than resuming at its end.
        setPlaying(false)
        setLoadedId(null)
      })
      setConnection(result)
    })
    return () => {
      cancelled = true
      player?.disconnect()
      playerRef.current = null
    }
    // Connect once per mount; tracks and connect are fixed for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playingTrack = nowPlaying(queue)
  const loaded = playingTrack !== null && loadedId === playingTrack.id

  const togglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player || !playingTrack) return
    if (!loaded) {
      setLoadedId(playingTrack.id)
      player.play(playingTrack.id)
      setPlaying(true)
    } else if (playing) {
      player.pause()
      setPlaying(false)
    } else {
      player.resume()
      setPlaying(true)
    }
  }, [playingTrack, loaded, playing])

  // Show the target straight away: Spotify reports the new position a moment later, and until then
  // the seek bar would flash back to the old one.
  const seek = useCallback((ms: number) => {
    const player = playerRef.current
    if (!player) return
    setPositionMs(Math.max(0, ms))
    player.seek(ms)
  }, [])

  const value = useMemo<Playback>(
    () => ({
      status: connection?.mode ?? 'connecting',
      ready: connection !== null,
      fallbackReason: connection?.mode === 'fake' ? connection.reason : null,
      nowPlaying: playingTrack,
      explanation: playingTrack && profile ? explain(playingTrack, profile.features) : null,
      topArtists: profile?.topArtists ?? [],
      artworkUrl,
      playing,
      positionMs,
      durationMs: (loaded && engineDurationMs) || (playingTrack?.durationMs ?? 0),
      hasPrevious: hasPrevious(queue),
      hasNext: hasNext(queue),
      upNext: upNext(queue),
      heard,
      togglePlay,
      previous: () => moveCursorAndPlay(previous(queueRef.current)),
      next: () => moveCursorAndPlay(next(queueRef.current)),
      playAt: (index) => moveCursorAndPlay(jumpToSkipping(queueRef.current, index, heard)),
      playTrack: (track) => {
        const index = queueRef.current.tracks.findIndex((t) => t.id === track.id)
        if (index >= 0) moveCursorAndPlay(jumpToSkipping(queueRef.current, index, heard))
      },
      removeNowPlaying: () => {
        const current = queueRef.current
        const removed = nowPlaying(current)
        if (!removed) return
        setHeard((h) => removeHeard(h, removed.id))
        const after = remove(current, current.cursor)
        if (nowPlaying(topUp(after, choose))) return moveCursorAndPlay(after)
        // Nothing left to play: empty the queue and stop.
        queueRef.current = after
        setQueue(after)
        playerRef.current?.pause()
        setPlaying(false)
        setLoadedId(null)
      },
      startNewQueue: () => moveCursorAndPlay(topUp(createQueue([]), choose), true),
      seek,
      volume,
      muted: volume === 0,
      setVolume,
      toggleMute,
      logIn,
    }),
    [connection, queue, heard, choose, profile, playingTrack, loaded, artworkUrl, playing, positionMs, engineDurationMs, togglePlay, moveCursorAndPlay, seek, volume, setVolume, toggleMute, logIn],
  )

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

// The provider and its hook belong together (ADR-0001 layout); fast refresh falls back to a full reload here.
// eslint-disable-next-line react-refresh/only-export-components
export function usePlayback(): Playback {
  const playback = useContext(PlaybackContext)
  if (!playback) throw new Error('usePlayback() must be used inside <PlaybackProvider>')
  return playback
}
