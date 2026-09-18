'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { formatINR } from '@StrikerStore/contract';
import { cn } from '@/lib/cn';
import { tr, type Locale } from '@/lib/i18n';
import type { SuggestionRow } from '@/app/api/suggest/route';

/** A category, reduced to what the panel and the placeholder need. */
export type SearchCategory = {
  slug: string;
  name: string;
  productCount: number;
  /** Resolved by the header, because `lib/media.ts` is server-only. */
  imageSrc: string | null;
};

/** Matches `storefrontSuggestSchema`'s floor — "ppc" and "10mm" are real searches. */
const MIN_CHARS = 2;
/** Long enough that a word typed at speed is one request, short enough to feel live. */
const DEBOUNCE_MS = 300;
const ROTATE_MS = 2600;

/**
 * The header's search box.
 *
 * A **progressive enhancement**, and that word is load-bearing. The markup it
 * returns still sits inside `<form action="/search">` with `name="q"` on the
 * input, so a visitor whose JavaScript never arrives — a real case on the
 * connections this shop's customers have — gets exactly the GET form that was
 * here before, and the results page stays a shareable URL.
 *
 * Everything below only adds to that:
 *
 *   - an idle box cycles real category names, so it advertises what the yard
 *     stocks rather than a hard-coded list that drifts from the catalogue;
 *   - focusing an empty box offers those categories, for the shopper who does
 *     not yet have a word to type;
 *   - typing replaces them with products, from `/api/suggest`.
 */
export function SearchBox({
  categories,
  recent = [],
  locale,
}: {
  categories: SearchCategory[];
  /**
   * What this browser looked at recently, freshly priced by the header.
   * Shown above the categories while the box is empty.
   */
  recent?: SuggestionRow[];
  locale: Locale;
}) {
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [term, setTerm] = useState(0);

  /*
   * Set just before we move focus back to the input, so the `onFocus` that
   * follows does not undo the close that asked for it. Only set when focus is
   * actually somewhere else, or it would sit true and swallow the next genuine
   * focus instead.
   */
  const reopenBlocked = useRef(false);

  const typing = query.trim().length >= MIN_CHARS;
  /*
   * One index space across both groups, so ArrowDown walks from the last
   * recently-viewed product straight into the first category without a seam.
   */
  const items: Array<{ key: string; href: string }> = typing
    ? rows.map((row) => ({ key: row.handle, href: `/products/${row.handle}` }))
    : [
        ...recent.map((row) => ({ key: `seen-${row.handle}`, href: `/products/${row.handle}` })),
        ...categories.map((category) => ({
          key: category.slug,
          href: `/category/${category.slug}`,
        })),
      ];

  /*
   * The rotating placeholder.
   *
   * Rendered as an `aria-hidden` overlay rather than by rewriting the input's
   * `placeholder` attribute. That attribute is part of the field's accessible
   * description, and mutating it on a timer means a screen reader can announce
   * a new one mid-sentence. The real `placeholder` stays the static string it
   * has always been, which is also what a no-JS visitor sees.
   *
   * Reduced motion is checked here rather than left to CSS: the global reset in
   * `globals.css` flattens transitions, but it has no opinion about an interval
   * swapping text, which is the part that would actually be distracting.
   */
  useEffect(() => {
    if (categories.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Nothing to rotate behind: a focused or filled box hides the overlay.
    if (focused || query.length > 0) return;

    const timer = setInterval(() => setTerm((current) => current + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [categories.length, focused, query.length]);

  /*
   * Suggestions, debounced.
   *
   * `ticket` guards a slow response overwriting a newer one — two keystrokes in
   * quick succession can come back out of order, and the list must describe
   * what is in the box now. The same guard `map-picker.tsx` uses on the map's
   * place search.
   */
  const ticket = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_CHARS) {
      setRows([]);
      setLoading(false);
      return;
    }

    const mine = ++ticket.current;
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/suggest?q=${encodeURIComponent(text)}&locale=${locale}`,
          { signal: controller.signal, cache: 'no-store' },
        );
        const data: SuggestionRow[] = response.ok ? await response.json() : [];
        if (mine === ticket.current) {
          setRows(data);
          setActive(-1);
        }
      } catch {
        // An abort is the normal case here, not a failure worth surfacing.
        if (mine === ticket.current) setRows([]);
      } finally {
        if (mine === ticket.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  /* Escape closes, a click outside closes. Mirrors the mini cart next door. */
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      /*
       * A `type="search"` input clears itself on Escape. Here Escape means
       * "put the dropdown away", and losing the half-typed word with it is a
       * second, unasked-for action.
       */
      event.preventDefault();
      setOpen(false);

      if (document.activeElement !== inputRef.current) {
        reopenBlocked.current = true;
        inputRef.current?.focus();
      }
    }

    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % items.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }

    /*
     * Enter opens the highlighted row, and only then. With nothing highlighted
     * it is left alone so the form submits and the shopper lands on the results
     * page — the behaviour this box had before any of this existed.
     */
    if (event.key === 'Enter' && active >= 0) {
      const item = items[active];
      if (item) {
        event.preventDefault();
        setOpen(false);
        router.push(item.href);
      }
    }
  }

  const rotating =
    categories.length > 0 && !focused && query.length === 0
      ? tr(locale, 'search.forTerm', {
          term: categories[term % categories.length]?.name ?? '',
        })
      : null;

  const listId = `${id}-list`;

  function productRow(row: SuggestionRow, index: number) {
    return (
      <a
        key={`${typing ? 'row' : 'seen'}-${row.handle}`}
        id={`${id}-opt-${index}`}
        role="option"
        aria-selected={index === active}
        href={`/products/${row.handle}`}
        onMouseEnter={() => setActive(index)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-left',
          index === active && 'bg-surface-muted',
        )}
      >
        {row.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.imageSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-10 shrink-0 rounded-box bg-surface-muted object-cover"
          />
        ) : (
          <span className="size-10 shrink-0 rounded-box bg-surface-muted" />
        )}

        {/* No brand line, matching the product card: the name already opens
            with it, so the row underneath only repeated the first word. */}
        <span className="clamp-2 min-w-0 flex-1 text-body2 text-ink">{row.name}</span>

        {row.price && (
          <span className="shrink-0 text-heading7 text-ink">{formatINR(row.price)}</span>
        )}
      </a>
    );
  }

  function categoryTile(category: SearchCategory, index: number) {
    return (
      <a
        key={category.slug}
        id={`${id}-opt-${index}`}
        role="option"
        aria-selected={index === active}
        href={`/category/${category.slug}`}
        onMouseEnter={() => setActive(index)}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-card p-2 text-center',
          index === active && 'bg-brand-tint',
        )}
      >
        <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-card bg-brand-tint">
          {category.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            // The initial, not a generic icon: with no artwork uploaded it at
            // least tells one tile from the next.
            <span className="text-heading2 text-brand-text">{category.name.charAt(0)}</span>
          )}
        </span>

        {/* Never clamped to one line. A two-line category name is fine; a name
            cut mid-word is what gets noticed. */}
        <span className="text-heading8 text-ink">{category.name}</span>
      </a>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />

      <input
        ref={inputRef}
        type="search"
        name="q"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          if (reopenBlocked.current) {
            reopenBlocked.current = false;
            return;
          }
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={tr(locale, 'header.searchPlaceholder')}
        aria-label={tr(locale, 'header.search')}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        className={cn(
          // `pr-11` always, not only while the clear button is up: a right
          // padding that changed as you typed would shift the text under the
          // caret mid-word.
          'h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface-warm pl-11 pr-11',
          // WebKit draws its own clear button inside `type="search"`. Ours sits
          // in the same corner and is the one that also closes the panel, so
          // the native one is suppressed rather than left to double up.
          '[&::-webkit-search-cancel-button]:appearance-none',
          'text-body1 text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none',
          // The overlay stands in for the placeholder while it is showing, so
          // the real one must not print underneath it.
          rotating && 'placeholder:text-transparent',
        )}
      />

      {rotating && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 truncate pr-11 text-body1 text-ink-faint"
        >
          {rotating}
        </span>
      )}

      {/*
       * Close.
       *
       * Up whenever there is something to put away — a typed word, an open
       * panel, or both. The panel is the common case: the box opens its
       * categories on focus, so a shopper who taps the field and changes their
       * mind is looking at a screenful of tiles with no visible way out. Escape
       * closes it and so does a tap outside, but neither is discoverable on a
       * phone, where there is barely any "outside" left to tap.
       *
       * One control for both jobs rather than two, because they are one
       * intention: it clears the word if there is one and closes the panel
       * either way.
       *
       * `type="button"`, because the whole box sits inside
       * `<form action="/search">` and the default submit type would send the
       * shopper to the results page for the word they just asked to delete.
       */}
      {(open || query.length > 0) && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setRows([]);
            setActive(-1);
            setOpen(false);
            /*
             * Focus goes back to the field so the next keystroke lands in it —
             * but `reopenBlocked` first, or the `onFocus` that follows would
             * reopen the panel this tap just closed. Only set when focus is
             * genuinely elsewhere, which is the same rule the Escape handler
             * follows.
             */
            reopenBlocked.current = document.activeElement !== inputRef.current;
            inputRef.current?.focus();
          }}
          aria-label={tr(locale, query.length > 0 ? 'search.clear' : 'search.close')}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-box text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      )}

      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[60vh] overflow-y-auto',
            'rounded-card border border-hairline bg-surface py-1 shadow-sheet',
          )}
        >
          {/*
           * One listbox, two groups while the box is empty.
           *
           * Recently viewed comes first, as rows: a shopper who has already
           * looked at a product is most likely coming back for that one, and a
           * row has room for the price that tells them whether it moved.
           * Categories follow as the home page's tiles, picture over label.
           *
           * Typing replaces both with suggestion rows. `role="group"` with a
           * label is what lets a screen reader say which group an option is in.
           */}
          <div id={listId} role="listbox" aria-label={tr(locale, 'header.search')}>
            {typing ? (
              <div role="group" aria-label={tr(locale, 'search.products')}>
                <GroupHeading>{tr(locale, 'search.products')}</GroupHeading>
                {rows.map((row, index) => productRow(row, index))}
              </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <div role="group" aria-label={tr(locale, 'recent.title')}>
                    <GroupHeading>{tr(locale, 'recent.title')}</GroupHeading>
                    {recent.map((row, index) => productRow(row, index))}
                  </div>
                )}

                {categories.length > 0 && (
                  <div role="group" aria-label={tr(locale, 'search.categories')}>
                    <GroupHeading>{tr(locale, 'search.categories')}</GroupHeading>
                    <div className="grid grid-cols-3 gap-1 px-2 pb-1 sm:grid-cols-4">
                      {categories.map((category, index) =>
                        categoryTile(category, recent.length + index),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {typing && loading && items.length === 0 && (
            <p className="flex items-center gap-2 px-3 py-3 text-body3 text-ink-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {tr(locale, 'search.searching')}
            </p>
          )}

          {typing && !loading && items.length === 0 && (
            <p className="px-3 py-3 text-body3 text-ink-muted">
              {tr(locale, 'search.noMatches', { q: query.trim() })}
            </p>
          )}

          {/* Not a link: submitting the form is what keeps `/search?q=…` the
              one way this box reaches the results page. */}
          {typing && (
            <button
              type="submit"
              className="w-full border-t border-hairline px-3 py-2.5 text-left text-cta3 text-brand-text hover:bg-surface-muted"
            >
              {tr(locale, 'search.seeAll', { q: query.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A group's label inside the panel. Visual only: the group carries `aria-label`. */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      aria-hidden
      className="px-3 pb-1.5 pt-2 text-heading9 uppercase tracking-wide text-ink-faint"
    >
      {children}
    </p>
  );
}
