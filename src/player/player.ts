// The player boundary. No Spotify types leak out of here (IIS-56).
// The queue decides which track plays; the player only plays what it is told.

export type ProgressEvent = { positionMs: number; durationMs: number }

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
  onEnded(listener: () => void): Unsubscribe
}
