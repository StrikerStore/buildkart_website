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

/**
 * Removes a cookie, whichever domain it was set on.
 *
 * Ours are set on this host. Meta's `_fbp` is set on the registrable domain
 * (`.buildkart.co`), and a cookie can only be removed by naming the domain it
 * was set with — so every parent of this host is tried. The browser ignores
 * the ones that are not valid, such as a bare public suffix.
 */
export function deleteCookie(name: string) {
  const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = expired;
  const labels = location.hostname.split('.');
  for (let i = 0; i < labels.length - 1; i += 1) {
    document.cookie = `${expired}; Domain=.${labels.slice(i).join('.')}`;
  }
}
