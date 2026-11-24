// Spotify Authorization Code + PKCE helpers. Uses WebCrypto only, so the same
// code runs in the browser (playback) and in Node (scripts/fetch-catalogue.ts).

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(64)))
}

export async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function buildAuthorizeUrl(options: {
  clientId: string
  redirectUri: string
  scopes: string[]
  codeChallenge: string
  state?: string
}): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    response_type: 'code',
    redirect_uri: options.redirectUri,
    scope: options.scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: options.codeChallenge,
  })
  if (options.state) params.set('state', options.state)
  return `${AUTHORIZE_URL}?${params}`
}
