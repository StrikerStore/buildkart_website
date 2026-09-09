import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentLocale } from '@/lib/locale';
import { currentCustomer } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string | string[] }> };

/**
 * Sign in.
 *
 * Redirects away if there is already a session — a signed-in customer landing
 * on a login page has either bookmarked it or been sent by a stale link, and
 * showing them a phone box is a dead end either way.
 */
export default async function LoginPage({ searchParams }: Props) {
  const [locale, params, customer] = await Promise.all([
    currentLocale(),
    searchParams,
    currentCustomer(),
  ]);

  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  // Validated again in the action; checked here too so the redirect below
  // cannot be pointed off-site either.
  const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account';

  if (customer) redirect(next);

  return (
    <div className="page-w page-x py-8">
      <div className="mx-auto max-w-sm">
        <h1 className="text-heading2 text-ink">
          {locale === 'hi' ? 'लॉगिन करें' : 'Sign in'}
        </h1>
        <p className="mt-1 text-body2 text-ink-muted">
          {locale === 'hi'
            ? 'ऑर्डर देखने और तेज़ी से ऑर्डर करने के लिए।'
            : 'To track your orders and reorder in one tap.'}
        </p>

        <LoginForm locale={locale} next={next} />
      </div>
    </div>
  );
}
