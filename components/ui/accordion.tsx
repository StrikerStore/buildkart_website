import { ChevronDown } from 'lucide-react';

/**
 * A disclosure row, built on `<details>`.
 *
 * No state, no client component, no JavaScript. `<details>`/`<summary>` is a
 * native disclosure widget: it opens without hydration, it is keyboard operable
 * and screen-reader announced for free, and it works on the first paint rather
 * than after the bundle arrives. On the connection this shop's customers have,
 * an FAQ that cannot be opened until React boots is an FAQ nobody reads.
 *
 * Every row starts closed. These sit under the specs on a page that already
 * carries a description and a related-products rail, and an open block of prose
 * pushes all of it off the screen for a shopper who never had a question.
 */
export function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-hairline last:border-b-0">
      {/*
        * `list-none` plus the webkit pseudo-element rule kills the browser's
        * default triangle, which cannot be styled and sits in the wrong place
        * next to a 48px tap target.
        */}
      <summary className="flex min-h-[var(--tap)] cursor-pointer list-none items-center justify-between gap-3 py-3 text-heading6 text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="pb-4 text-body2 text-ink-muted">{children}</div>
    </details>
  );
}
