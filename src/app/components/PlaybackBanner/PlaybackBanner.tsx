// Tells the user when the fake engine is running (tracks play silently) and why.
// Hidden while connecting and while Spotify is playing.
import { usePlayback } from '@/hooks/usePlayback.tsx'
import type { FallbackReason } from '@/playback/connectPlayer.ts'
import { Button } from '@/shadcn/button.tsx'

const MESSAGES: Record<FallbackReason, string> = {
  'logged-out': 'Playing without sound. Log in with Spotify Premium to hear full tracks.',
  unavailable: "Playback unavailable: Spotify didn't connect, so tracks play without sound.",
  'not-configured':
    "Playback unavailable: Spotify isn't set up (SPOTIFY_CLIENT_ID and SPOTIFY_REDIRECT_URI in .env), so tracks play without sound.",
}

export function PlaybackBanner() {
  const { fallbackReason, logIn } = usePlayback()
  if (!fallbackReason) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted px-4 py-2 text-sm text-muted-foreground"
    >
      <span>{MESSAGES[fallbackReason]}</span>
      {fallbackReason === 'logged-out' && logIn && (
        <Button size="sm" onClick={logIn}>
          Log in with Spotify
        </Button>
      )}
    </div>
  )
}
