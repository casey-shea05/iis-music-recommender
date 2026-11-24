// The parts of the Spotify Web Playback SDK this app uses, and a one-time loader for its script.
// https://developer.spotify.com/documentation/web-playback-sdk/reference

export type SdkTrack = {
  id: string | null
  uri: string
  linked_from?: { id: string | null; uri: string | null }
  album: { images: { url: string; width?: number | null }[] }
}

export type SdkState = {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: SdkTrack | null }
}

type ErrorEvent = 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error'

export interface SdkPlayer {
  connect(): Promise<boolean>
  /** Lets the tab play audio; browsers only allow this inside a user gesture such as a click. */
  activateElement(): Promise<void>
  disconnect(): void
  addListener(event: 'ready' | 'not_ready', cb: (e: { device_id: string }) => void): boolean
  addListener(event: 'player_state_changed', cb: (state: SdkState | null) => void): boolean
  addListener(event: ErrorEvent, cb: (e: { message: string }) => void): boolean
  removeListener(event: 'player_state_changed' | ErrorEvent, cb?: (...args: never[]) => void): boolean
  getCurrentState(): Promise<SdkState | null>
  pause(): Promise<void>
  resume(): Promise<void>
  seek(positionMs: number): Promise<void>
  setVolume(volume: number): Promise<void>
}

export type SdkNamespace = {
  Player: new (options: {
    name: string
    getOAuthToken: (cb: (token: string) => void) => void
    volume?: number
  }) => SdkPlayer
}

declare global {
  interface Window {
    Spotify?: SdkNamespace
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
let loading: Promise<SdkNamespace> | null = null

export function loadSdk(): Promise<SdkNamespace> {
  loading ??= new Promise<SdkNamespace>((resolve, reject) => {
    if (window.Spotify) return resolve(window.Spotify)
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify!)
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => reject(new Error('Could not load the Spotify Web Playback SDK'))
    document.body.appendChild(script)
  }).catch((error) => {
    loading = null
    throw error
  })
  return loading
}
