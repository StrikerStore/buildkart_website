'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PublishedMenuItem } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * The menu mark, left of the logo.
 *
 * Two short bars rather than the three full-width ones of a hamburger. The
 * hamburger's problem on this header is that it competes: it is the same weight
 * as the cart and the account icon beside it, on a site whose primary
 * navigation is the search box and the category tiles. A smaller mark still
 * says "there is a menu here" without claiming to be the way in.
 *
 * Drawn inline rather than pulled from lucide because no icon in the set is
 * this — every menu glyph there is a full three-bar stack or a panel outline.
 */
function MenuMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h9" />
      <path d="M4 13h12" />
    </svg>
  );
}

/**
 * The `mobile` menu the owner builds in the admin, as a side panel.
 *
 * Phones only — a desktop gets the same links along the header in `MainNav`.
 * It slides from the left because that is the edge the button is on, and a
 * panel that appears somewhere other than where you tapped reads as a different
 * control answering.
 *
 * Items arrive as props rather than being fetched on open, unlike the mini cart
 * next to it. A menu is a handful of labels the header's own request already
 * paid for; the cart is a priced basket with images, which is why that one
 * waits.
 */
export function MobileMenu({ items, locale }: { items: PublishedMenuItem[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const hi = locale === 'hi';

  // Navigating is the panel's whole purpose, so arriving somewhere closes it.
  // Without this the panel survives the client-side transition and covers the
  // page it was asked to open.
  useEffect(() => setOpen(false), [pathname]);

  /*
   * Escape closes and hands focus back to the button, and the page behind does
   * not scroll while the panel is up — the same three behaviours the location
   * sheet implements, for the same reason: a `<dialog>` would give them free
   * but has no hook for the slide transition.
   */
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const label = (item: { labelEn: string; labelHi: string | null }) =>
    hi && item.labelHi ? item.labelHi : item.labelEn;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={hi ? 'मेन्यू खोलें' : 'Open menu'}
        aria-expanded={open}
        className="-ml-1 grid size-9 shrink-0 place-items-center rounded-box text-ink hover:bg-surface-muted md:hidden"
      >
        <MenuMark />
      </button>

      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-50 bg-ink/50" onClick={() => setOpen(false)} aria-hidden />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={hi ? 'मेन्यू' : 'Menu'}
            /* `shadow-raised`, not `shadow-sheet`: that one offsets upward for a
               bottom sheet, which on a full-height left panel puts the drop on
               the wrong edge. */
            className="fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col bg-surface shadow-raised"
          >
            <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
              <h2 className="text-heading4 text-ink">{hi ? 'मेन्यू' : 'Menu'}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={hi ? 'बंद करें' : 'Close'}
                className="grid size-9 shrink-0 place-items-center rounded-box text-ink hover:bg-surface-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <ul>
                {items.map((item) => {
                  const isOpen = expanded === item.url;
                  return (
                    <li key={item.url} className="border-b border-hairline last:border-b-0">
                      {/*
                        * A parent is still a link, with the disclosure as a
                        * separate control beside it. Making the whole row a
                        * toggle would strand the parent's own page — a Cement
                        * category with three sub-categories under it is
                        * somewhere a shopper goes, not just a heading.
                        */}
                      <div className="flex items-center">
                        <Link
                          href={item.url}
                          className="min-h-[var(--tap)] flex-1 rounded-box px-3 py-3 text-cta2 text-ink hover:bg-surface-muted"
                        >
                          {label(item)}
                        </Link>

                        {item.children.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : item.url)}
                            aria-expanded={isOpen}
                            aria-label={
                              hi ? `${label(item)} के अंदर` : `Show more under ${label(item)}`
                            }
                            className="grid size-[var(--tap)] shrink-0 place-items-center rounded-box text-ink-muted hover:bg-surface-muted"
                          >
                            <ChevronDown
                              className={cn('size-5 transition-transform', isOpen && 'rotate-180')}
                              aria-hidden
                            />
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        <ul className="pb-1 pl-3">
                          {item.children.map((child) => (
                            <li key={child.url}>
                              <Link
                                href={child.url}
                                className="block min-h-[var(--tap)] rounded-box px-3 py-3 text-body2 text-ink-muted hover:bg-surface-muted hover:text-ink"
                              >
                                {label(child)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
