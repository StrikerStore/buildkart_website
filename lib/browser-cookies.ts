/**
 * Reading and writing first-party cookies from the browser.
 *
 * For the analytics cookies only (`bk_attr`, `bk_vid`, `bk_sid`, `_fbc`):
 * plain values the page itself owns. Credentials never go through here — the
 * session cookie is `httpOnly` and written by the server.
 */

export function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}
