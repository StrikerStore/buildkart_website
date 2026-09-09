import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatINR, type StorefrontFacetsDto } from '@StrikerStore/contract';
import { activeFilterCount, buildHref, type SearchParams } from '@/lib/list-query';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';

/**
 * Brands, option axes and stock — every one of them a link.
 *
 * No `use client`, no state, no form. Toggling a filter is a navigation, so the
 * server re-runs the query and the URL ends up describing exactly what is on
 * screen. That is the same property `list-query.ts` exists to preserve, and it
 * means the filter panel costs zero JavaScript on a phone that has to download
 * it over a site connection.
 *
 * Facet counts come from the same pass that produced the rows, so a value shown
 * here always returns something — a filter that leads to "no results" is a bug
 * the server prevents rather than the UI apologises for.
 */
export function FilterPanel({
  pathname,
  params,
  facets,
  locale,
}: {
  pathname: string;
  params: SearchParams;
  facets: StorefrontFacetsDto;
  locale: Locale;
}) {
  const active = activeFilterCount(params);
  const selectedBrands = new Set(
    Array.isArray(params.brand) ? params.brand : params.brand ? [params.brand] : [],
  );
  const selectedOptions = new Set(
    Array.isArray(params.opt) ? params.opt : params.opt ? [params.opt] : [],
  );
  const stockOn = params.stock === '1';

  const nothingToFilter =
    facets.brands.length === 0 && facets.options.length === 0;

  return (
    <div className="space-y-6">
      {active > 0 && (
        <Link
          href={buildHref(pathname, params, { clear: true })}
          className="inline-flex h-10 items-center rounded-box border border-hairline-strong px-3 text-cta3 text-ink hover:bg-surface-muted"
        >
          {locale === 'hi' ? `सब हटाएँ (${active})` : `Clear all (${active})`}
        </Link>
      )}

      <FilterGroup title={locale === 'hi' ? 'उपलब्धता' : 'Availability'}>
        <Option
          href={buildHref(pathname, params, { stock: !stockOn })}
          checked={stockOn}
          label={locale === 'hi' ? 'सिर्फ़ स्टॉक में' : 'In stock only'}
        />
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title={locale === 'hi' ? 'ब्रांड' : 'Brand'}>
          {facets.brands.map((brand) => (
            <Option
              key={brand.slug}
              href={buildHref(pathname, params, { brand: brand.slug })}
              checked={selectedBrands.has(brand.slug)}
              label={brand.name}
              count={brand.count}
            />
          ))}
        </FilterGroup>
      )}

      {facets.options.map((axis) => (
        <FilterGroup key={axis.name} title={axis.name}>
          {axis.values.map((value) => {
            const token = `${axis.name}:${value.value}`;
            return (
              <Option
                key={token}
                href={buildHref(pathname, params, { opt: token })}
                checked={selectedOptions.has(token)}
                label={value.value}
                count={value.count}
              />
            );
          })}
        </FilterGroup>
      ))}

      {/* Stated rather than left blank: an empty sidebar reads as a failed
          load, and the price range is genuinely useful on its own. */}
      {nothingToFilter && facets.priceMin && facets.priceMax && (
        <p className="text-body3 text-ink-muted">
          {locale === 'hi' ? 'भाव' : 'Prices'} {formatINR(facets.priceMin)} –{' '}
          {formatINR(facets.priceMax)}
        </p>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-heading7 text-ink">{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Option({
  href,
  checked,
  label,
  count,
}: {
  href: string;
  checked: boolean;
  label: string;
  count?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        // `aria-pressed` rather than a checkbox role: this is a link that
        // toggles, and announcing it as a checkbox would promise a form.
        aria-pressed={checked}
        className="flex min-h-[40px] items-center gap-2 rounded-box px-1 py-1 text-body2 text-ink hover:bg-surface-muted"
      >
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-[4px] border',
            checked ? 'border-ink bg-ink text-ink-inverted' : 'border-hairline-strong',
          )}
        >
          {checked && <Check className="size-3.5" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="shrink-0 text-body5 tabular-nums text-ink-faint">{count}</span>
        )}
      </Link>
    </li>
  );
}
