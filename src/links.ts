import { randomInt } from 'node:crypto';
import { getShortenedUrl, putShortenedUrl } from './repo.js';

/** No vowels and no look-alike characters, so an id is safe to read aloud or retype. */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const ID_LENGTH = 8;
const MAX_ATTEMPTS = 5;

export const generateId = (): string =>
  Array.from({ length: ID_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/**
 * Paths the shortener must never hand out, because the domain root is shared with everything
 * else served from it: ACME and autoconfig discovery live under /.well-known, and browsers ask
 * for the rest unprompted.
 */
const RESERVED = new Set(['', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'index.html', 'health']);

export const isReserved = (id: string): boolean =>
  RESERVED.has(id.toLowerCase()) || id.toLowerCase().startsWith('.well-known');

export type Rejection = { ok: false; reason: string };
export type Accepted = { ok: true; url: string };

/**
 * Accepts only what is safe to send a browser to. An open redirector is worth guarding even
 * behind authentication: javascript: and data: URLs turn a link into script execution on this
 * origin, and a link back to the shortener itself can be chained into a loop.
 */
export const validateUrl = (raw: string, ownHosts: string[]): Accepted | Rejection => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'no URL given' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: `not a URL: ${trimmed.slice(0, 80)}` };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `only http and https are allowed, not ${parsed.protocol}` };
  }
  if (ownHosts.includes(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'that points back at the shortener' };
  }
  return { ok: true, url: parsed.toString() };
};

/** Claims a free id for {@code url}. Retries on the (rare) collision rather than overwriting. */
export const shorten = async (url: string, createdBy?: string): Promise<string> => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const id = generateId();
    if (isReserved(id)) continue;
    if (await putShortenedUrl(id, url, createdBy)) return id;
  }
  throw new Error('could not allocate a free id');
};

export const resolve = async (id: string): Promise<string | undefined> =>
  (await getShortenedUrl(id))?.url;
