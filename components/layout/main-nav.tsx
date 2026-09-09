import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { PublishedMenuItem } from '@/lib/api/server';
import type { Locale } from '@/lib/i18n';

/**
 * The desktop navigation row — the `header` menu the owner builds in the admin.
 *
 * It sits at the foot of the header, which puts it directly above the hero on
 * the home page and above the content everywhere else. Living in the header
 * rather than on the home page is what makes it navigation: a bar that appeared
 * only above the hero would vanish the moment a shopper opened a category,
 * which is precisely when they want it.
 *
 * Desktop only. A phone gets the same links through the side panel, where a row
 * of text targets 44px apart would be unusable.
 *
 * Nothing here is hard-coded, and a missing menu renders nothing rather than an
 * empty band — a fresh install should look unfinished, not broken.
 */
export function MainNav({ items, locale }: { items: PublishedMenuItem[]; locale: Locale }) {
  if (items.length === 0) return null;

  const label = (item: { labelEn: string; labelHi: string | null }) =>
    locale === 'hi' && item.labelHi ? item.labelHi : item.labelEn;

  return (
    <nav
      aria-label={locale === 'hi' ? 'मुख्य मेन्यू' : 'Main'}
      className="hidden border-t border-hairline md:block"
    >
      <ul className="flex items-stretch gap-1">
        {items.map((item) => (
          /*
           * `group` plus `focus-within` rather than a click handler: a dropdown
           * that opens on hover and on keyboard focus needs no JavaScript, so
           * this whole row stays a server component and the links are in the
           * HTML a crawler reads.
           */
          <li key={item.url} className="group relative">
            <Link
              href={item.url}
              className="flex h-11 items-center gap-1 rounded-box px-3 text-cta2 text-ink hover:bg-surface-muted"
            >
              {label(item)}
              {item.children.length > 0 && (
                <ChevronDown
                  className="size-4 text-ink-faint transition-transform group-hover:rotate-180"
                  aria-hidden
                />
              )}
            </Link>

            {item.children.length > 0 && (
              /*
               * `invisible` plus `opacity-0` rather than `hidden`, so the panel
               * has a layout box to fade. Keyboard reach comes from
               * `focus-within` on the parent `li`: tabbing to the top-level
               * link reveals the list, and the next tab lands inside it. A
               * hover-only dropdown would strand those children entirely.
               */
              <ul
                className="invisible absolute left-0 top-full z-50 min-w-[200px] rounded-card border border-hairline bg-surface py-1 opacity-0 shadow-card transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                {item.children.map((child) => (
                  <li key={child.url}>
                    <Link
                      href={child.url}
                      className="block px-3 py-2 text-body2 text-ink-muted hover:bg-surface-muted hover:text-ink"
                    >
                      {label(child)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
