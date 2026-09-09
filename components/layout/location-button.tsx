import { ChevronDown, MapPin, Zap } from 'lucide-react';
import { currentLocation, locationLabel } from '@/lib/location';
import { tr, type Locale } from '@/lib/i18n';
import { LocationTrigger } from './location-trigger';

/**
 * The header's address-and-ETA control.
 *
 * A Server Component reading the cookie, not a client one reading
 * `localStorage`. That is the whole reason the area is stored in a cookie: the
 * first HTML the customer receives already names their area and the delivery
 * promise, instead of flashing "Set your location" and correcting itself after
 * hydration. On a budget Android phone on site that flash is most of the page's
 * perceived load.
 *
 * The lightning bolt and the hour count are the site's central claim, so they
 * sit in the header on every page rather than only on the home page.
 *
 * It opens the location **sheet**, not `/location`. Changing where an order is
 * going should not cost the page somebody was reading — losing a half-scrolled
 * category or a filled cart to a navigation is the friction the sheet removes.
 * `LocationTrigger` is the thin client wrapper that reaches the provider; the
 * label stays server-rendered.
 */
export async function LocationButton({
  locale,
  promiseHours,
}: {
  locale: Locale;
  promiseHours: number;
}) {
  const location = await currentLocation();

  return (
    <LocationTrigger
      label={
        location
          ? `${tr(locale, 'header.deliverTo')}: ${locationLabel(location)}`
          : tr(locale, 'header.setLocation')
      }
    >
      <MapPin className="size-5 shrink-0 text-ink-muted" aria-hidden />

      <span className="min-w-0">
        {location ? (
          <>
            <span className="flex items-center gap-1 text-heading9 text-success">
              <Zap className="size-3 fill-current" aria-hidden />
              {tr(locale, 'delivery.inHours', { hours: promiseHours })}
            </span>
            <span className="clamp-1 block text-heading7 text-ink">
              {locationLabel(location)}
            </span>
          </>
        ) : (
          <>
            <span className="block text-heading9 text-ink-muted">
              {tr(locale, 'header.deliverTo')}
            </span>
            <span className="block text-heading7 text-ink">
              {tr(locale, 'header.setLocation')}
            </span>
          </>
        )}
      </span>

      <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
    </LocationTrigger>
  );
}
