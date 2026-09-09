import Image from 'next/image';
import Link from 'next/link';
import { currentLocale } from '@/lib/locale';
import { buttonClass } from '@/components/ui/button';
import notFoundArt from '@/public/404_error.png';

/**
 * 404.
 *
 * Two ways out rather than one, because the two reasons people land here need
 * different answers: a mistyped or dead product URL wants the catalogue, and a
 * link from an old order or a WhatsApp message wants a phone number — which is
 * one tap further on, in Help.
 *
 * The artwork replaces the "404" numeral this page used to draw in text. It is
 * the one screen in the shop where a picture is doing a job: an error page that
 * is only words reads as a fault in the site, and a customer who thinks the
 * shop is broken does not try the second link. Hoardings and a hard hat say
 * "nothing here yet" in the vocabulary this audience works in all day.
 */
export default async function NotFound() {
  const locale = await currentLocale();
  const hi = locale === 'hi';

  return (
    <div className="page-w page-x py-10 sm:py-16">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {/*
          * `next/image`, unlike the product cards, which use a plain `<img>`.
          * Not an inconsistency: those are served through Cloudflare's resizer,
          * which already does the format negotiation and resizing next/image
          * would do, so running both would pay twice. This file is a local
          * static asset with nothing in front of it, so the optimiser is what
          * keeps a 2 MB PNG from reaching a phone — it ships a few tens of KB
          * of WebP instead.
          *
          * `priority` because on this page it is the largest element and the
          * only one worth waiting for; lazy-loading it would leave the page
          * blank above the buttons for a beat.
          *
          * Empty `alt`: the heading underneath says exactly what the hoarding
          * in the picture says. Announcing it twice is noise, and the version a
          * screen reader should hear is the one that is translated.
          */}
        <Image
          src={notFoundArt}
          alt=""
          priority
          placeholder="blur"
          sizes="(min-width: 640px) 448px, 100vw"
          className="h-auto w-full rounded-card"
        />

        <h1 className="mt-6 text-heading3 text-ink">
          {hi ? 'यह पेज नहीं मिला' : 'We could not find that page'}
        </h1>

        <p className="mt-2 text-body2 text-ink-muted">
          {hi
            ? 'हो सकता है सामान हट गया हो या लिंक पुराना हो।'
            : 'The product may have been removed, or the link may be out of date.'}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonClass({ variant: 'brand' })}>
            {hi ? 'सामान देखें' : 'Browse products'}
          </Link>
          <Link href="/help" className={buttonClass({ variant: 'quiet' })}>
            {hi ? 'मदद लें' : 'Get help'}
          </Link>
        </div>
      </div>
    </div>
  );
}
