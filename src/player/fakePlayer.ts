import type { Player, ProgressEvent, Unsubscribe } from './player.ts'

const TICK_MS = 250

/** Timer over the track's durationMs. No audio, no login. */
export class FakePlayer implements Player {
  private durations: Map<string, number>
  private trackId: string | null = null
  private positionMs = 0
  volume = 1
  private timer: ReturnType<typeof setInterval> | null = null
  private progressListeners = new Set<(e: ProgressEvent) => void>()
  private endedListeners = new Set<() => void>()

  constructor(durations: Map<string, number>) {
    this.durations = durations
  }

  play(trackId: string) {
    this.trackId = trackId
    this.positionMs = 0
    this.emitProgress()
    this.startTimer()
  }

  pause() {
    this.stopTimer()
  }

  resume() {
    if (this.trackId) this.startTimer()
  }

  setVolume(volume: number) {
    this.volume = Math.min(Math.max(volume, 0), 1)
  }

  onProgress(listener: (e: ProgressEvent) => void): Unsubscribe {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  onEnded(listener: () => void): Unsubscribe {
    this.endedListeners.add(listener)
    return () => this.endedListeners.delete(listener)
  }

  seek(positionMs: number) {
    if (!this.trackId) return
    this.positionMs = Math.min(Math.max(positionMs, 0), this.durationMs)
    this.emitProgress()
  }

  private get durationMs() {
    return (this.trackId && this.durations.get(this.trackId)) || 0
  }

  private startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      this.positionMs += TICK_MS
      if (this.positionMs >= this.durationMs) {
        this.positionMs = this.durationMs
        this.emitProgress()
        this.stopTimer()
        this.endedListeners.forEach((l) => l())
        return
      }
      this.emitProgress()
    }, TICK_MS)
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private emitProgress() {
    const e = { positionMs: this.positionMs, durationMs: this.durationMs }
    this.progressListeners.forEach((l) => l(e))
  }
}
