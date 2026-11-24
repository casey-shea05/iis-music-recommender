// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildAuthorizeUrl, codeChallengeFor, generateCodeVerifier } from './pkce.ts'

describe('PKCE', () => {
  it('derives the S256 challenge from the RFC 7636 test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(await codeChallengeFor(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('generates a URL-safe verifier of valid length', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/)
    expect(generateCodeVerifier()).not.toBe(verifier)
  })

  it('builds an authorize URL carrying the challenge and scopes', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'abc',
        redirectUri: 'http://127.0.0.1:8888/callback',
        scopes: ['user-top-read', 'streaming'],
        codeChallenge: 'chal',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('client_id')).toBe('abc')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('chal')
    expect(url.searchParams.get('scope')).toBe('user-top-read streaming')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:8888/callback')
  })
})
