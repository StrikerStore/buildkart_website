import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './locale-shared';

/*
 * The server half of the locale. The pure constants live in `locale-shared.ts`
 * so the header's toggle — a Client Component — can reach them without
 * importing this file's `server-only` cookie access.
 */
export * from './locale-shared';

/**
 * The reader's language, for this request.
 *
 * `cache`d so a header, a nav and a product grid resolve it once between them
 * rather than each reaching for the cookie store.
 */
export const currentLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});
