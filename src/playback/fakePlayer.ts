import { Listeners, type PlayableTrack, type Player, type ProgressEvent, type TrackStartedEvent } from './player.ts'

const TICK_MS = 250

/** Timer over the track's durationMs. No audio, no login, artwork always null. Also the Vitest test double. */
export class FakePlayer implements Player {
  private durations: Map<string, number>
  private trackId: string | null = null
  private positionMs = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private progress = new Listeners<ProgressEvent>()
  private started = new Listeners<TrackStartedEvent>()
  private ended = new Listeners<void>()

  constructor(tracks: readonly PlayableTrack[]) {
    this.durations = new Map(tracks.map((t) => [t.id, t.durationMs]))
  }

  play(trackId: string) {
    this.trackId = trackId
    this.positionMs = 0
    this.started.emit({ trackId, artworkUrl: null })
    this.emitProgress()
    this.startTimer()
  }

  pause() {
    this.stopTimer()
  }

  resume() {
    if (!this.trackId) return
    // Paused at the very end (e.g. seeked there): the track is over, so say so rather than sit still.
    if (this.positionMs >= this.durationMs) return this.ended.emit()
    this.startTimer()
  }

  seek(positionMs: number) {
    if (!this.trackId) return
    this.positionMs = Math.min(Math.max(positionMs, 0), this.durationMs)
    this.emitProgress()
  }

  /** No audio, so volume has no effect. */
  setVolume() {}

  onProgress(listener: (e: ProgressEvent) => void) {
    return this.progress.add(listener)
  }

  onTrackStarted(listener: (e: TrackStartedEvent) => void) {
    return this.started.add(listener)
  }

  onEnded(listener: () => void) {
    return this.ended.add(listener)
  }

  disconnect() {
    this.stopTimer()
    this.progress.clear()
    this.started.clear()
    this.ended.clear()
  }

  private get durationMs() {
    return (this.trackId && this.durations.get(this.trackId)) || 0
  }

  private startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      this.positionMs = Math.min(this.positionMs + TICK_MS, this.durationMs)
      this.emitProgress()
      if (this.positionMs >= this.durationMs) {
        this.stopTimer()
        this.ended.emit()
      }
    }, TICK_MS)
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private emitProgress() {
    this.progress.emit({ positionMs: this.positionMs, durationMs: this.durationMs })
  }
}
