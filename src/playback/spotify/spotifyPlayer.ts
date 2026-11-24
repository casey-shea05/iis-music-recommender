// The Spotify engine: full tracks in this browser tab through the Web Playback SDK (Premium needed).
// Only this folder knows about Spotify; the rest of the app sees the Player interface.
import { Listeners, type Player, type ProgressEvent, type TrackStartedEvent } from '../player.ts'
import { loadSdk, type SdkPlayer, type SdkState, type SdkTrack } from './sdk.ts'

const API = 'https://api.spotify.com/v1'
// The SDK only reports state changes, so poll while playing to drive the seek bar.
const POLL_MS = 500
// A track that pauses at 0 having last been seen this close to its end has finished.
const END_WINDOW_MS = 3000

type Device = { sdk: SdkPlayer; deviceId: string }

// One SDK device per page. A second Spotify.Player on the same page reports ready, but Spotify then answers
// "Device not found" when asked to play on it, so React's StrictMode double mount broke playback in dev.
let device: Promise<Device> | null = null

/**
 * Connects this tab as a Spotify device (once per page) and resolves with a Player once it is ready.
 * Rejects on SDK errors. Disconnecting the returned Player releases it but keeps the shared device.
 */
export async function connectSpotifyPlayer(getAccessToken: () => Promise<string | null>): Promise<Player> {
  device ??= openDevice(getAccessToken).catch((error) => {
    device = null
    throw error
  })
  const { sdk, deviceId } = await device
  return new SpotifyPlayer(sdk, deviceId, getAccessToken)
}

async function openDevice(getAccessToken: () => Promise<string | null>): Promise<Device> {
  const Spotify = await loadSdk()
  const sdk = new Spotify.Player({
    name: 'IIS Music Recommender',
    getOAuthToken: (cb) => {
      void getAccessToken().then((token) => token && cb(token))
    },
  })

  const deviceId = await new Promise<string>((resolve, reject) => {
    sdk.addListener('ready', ({ device_id }) => resolve(device_id))
    for (const event of ['initialization_error', 'authentication_error', 'account_error'] as const) {
      sdk.addListener(event, ({ message }) => reject(new Error(`${event}: ${message}`)))
    }
    sdk.connect().then((ok) => ok || reject(new Error('The Spotify SDK refused to connect')), reject)
  }).catch((error) => {
    sdk.disconnect()
    throw error
  })

  return { sdk, deviceId }
}

class SpotifyPlayer implements Player {
  private progress = new Listeners<ProgressEvent>()
  private started = new Listeners<TrackStartedEvent>()
  private ended = new Listeners<void>()
  private poll: ReturnType<typeof setInterval> | null = null
  /** The track last asked for, and how far it has got. */
  private requested: string | null = null
  private startedFor: string | null = null
  private endedFor: string | null = null
  private lastPositionMs = 0
  /** When lastPositionMs was seen, and whether the track was moving then. */
  private lastSeenAt = 0
  private lastSeenPlaying = false

  private sdk: SdkPlayer
  private deviceId: string
  private getAccessToken: () => Promise<string | null>

  private onState = (state: SdkState | null) => this.handleState(state)
  private onPlaybackError = ({ message }: { message: string }) => console.warn('Spotify playback error:', message)

  constructor(sdk: SdkPlayer, deviceId: string, getAccessToken: () => Promise<string | null>) {
    this.sdk = sdk
    this.deviceId = deviceId
    this.getAccessToken = getAccessToken
    sdk.addListener('player_state_changed', this.onState)
    sdk.addListener('playback_error', this.onPlaybackError)
  }

  play(trackId: string) {
    // play() and resume() run inside the click handler, so the browser allows audio from here on.
    void this.sdk.activateElement()
    this.requested = trackId
    this.startedFor = null
    this.endedFor = null
    this.lastPositionMs = 0
    this.lastSeenPlaying = false
    void this.startOnDevice(trackId)
  }

  pause() {
    void this.sdk.pause()
  }

  resume() {
    void this.sdk.activateElement()
    void this.sdk.resume()
  }

  seek(positionMs: number) {
    void this.sdk.seek(Math.max(0, positionMs))
  }

  setVolume(volume: number) {
    void this.sdk.setVolume(Math.min(Math.max(volume, 0), 1))
  }

  onProgress(listener: (e: ProgressEvent) => void) {
    return this.progress.add(listener)
  }

  onTrackStarted(listener: (e: TrackStartedEvent) => void) {
    return this.started.add(listener)
  }

  onEnded(listener: () => void) {
    return this.ended.add(listener)
  }

  /** Releases this Player. The page's SDK device stays connected for the next one (see `device`). */
  disconnect() {
    this.stopPolling()
    this.progress.clear()
    this.started.clear()
    this.ended.clear()
    this.sdk.removeListener('player_state_changed', this.onState)
    this.sdk.removeListener('playback_error', this.onPlaybackError)
    if (this.requested) void this.sdk.pause()
    this.requested = null
  }

  /** The SDK can't start a chosen track itself; the Web API tells this tab's device to play it. */
  private async startOnDevice(trackId: string) {
    const token = await this.getAccessToken()
    if (!token) return console.warn('Spotify login expired; cannot start playback.')
    const res = await fetch(`${API}/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    }).catch((error: unknown) => error)
    if (!(res instanceof Response) || !res.ok) console.warn('Spotify could not start the track.', res)
  }

  private handleState(state: SdkState | null) {
    const requested = this.requested
    if (!state || !requested || this.endedFor === requested) return
    const current = state.track_window.current_track
    const isRequested = current !== null && isTrack(current, requested)

    if (isRequested && this.startedFor !== requested) {
      this.startedFor = requested
      this.started.emit({ trackId: requested, artworkUrl: largestImage(current) })
    }
    if (this.startedFor !== requested) return

    // Background tabs slow timers down, so estimate where the track got to rather than trusting the last poll.
    const reachedMs = this.lastPositionMs + (this.lastSeenPlaying ? Date.now() - this.lastSeenAt : 0)
    const finishedHere =
      isRequested && state.paused && state.position === 0 && reachedMs >= state.duration - END_WINDOW_MS
    // With autoplay on, Spotify may move on to a track of its own choosing; the queue decides instead.
    const movedOn = current !== null && !isRequested
    if (finishedHere || movedOn) {
      this.endedFor = requested
      this.stopPolling()
      if (movedOn) void this.sdk.pause()
      this.ended.emit()
      return
    }

    this.lastPositionMs = state.position
    this.lastSeenAt = Date.now()
    this.lastSeenPlaying = !state.paused
    this.progress.emit({ positionMs: state.position, durationMs: state.duration })
    if (state.paused) this.stopPolling()
    else this.startPolling()
  }

  private startPolling() {
    this.poll ??= setInterval(() => {
      void this.sdk.getCurrentState().then((state) => this.handleState(state))
    }, POLL_MS)
  }

  private stopPolling() {
    if (this.poll) clearInterval(this.poll)
    this.poll = null
  }
}

/** Spotify can relink a track to another ID for the user's market; linked_from keeps the one we asked for. */
function isTrack(track: SdkTrack, trackId: string) {
  return track.id === trackId || track.linked_from?.id === trackId
}

function largestImage(track: SdkTrack): string | null {
  const [largest] = [...track.album.images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return largest?.url ?? null
}
