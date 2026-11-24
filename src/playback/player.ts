// The player boundary. No Spotify types leak out of here (IIS-56).
// The queue decides which track plays; the player only plays what it is told.

/** What an engine needs to know about a track: which one, and how long it runs. */
export type PlayableTrack = { id: string; durationMs: number }

export type ProgressEvent = { positionMs: number; durationMs: number }

export type TrackStartedEvent = { trackId: string; artworkUrl: string | null }

export type Unsubscribe = () => void

export interface Player {
  /** Start any track from the beginning. Previous, next and replay-from-Heard all use this. */
  play(trackId: string): void
  pause(): void
  resume(): void
  /** Jump within the current track. */
  seek(positionMs: number): void
  /** 0 to 1. */
  setVolume(volume: number): void
  onProgress(listener: (event: ProgressEvent) => void): Unsubscribe
  onTrackStarted(listener: (event: TrackStartedEvent) => void): Unsubscribe
  onEnded(listener: () => void): Unsubscribe
  /** Stop playback and release the engine (timers, SDK device). The player is unusable afterwards. */
  disconnect(): void
}

/** A set of listeners for one kind of event. Shared by the engines. */
export class Listeners<E> {
  private set = new Set<(event: E) => void>()

  add(listener: (event: E) => void): Unsubscribe {
    this.set.add(listener)
    return () => {
      this.set.delete(listener)
    }
  }

  emit(event: E) {
    this.set.forEach((listener) => listener(event))
  }

  clear() {
    this.set.clear()
  }
}
