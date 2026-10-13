import { api, storeSettings } from '@/lib/api/server';
import { imageUrl } from '@/lib/media';
import { absoluteUrl } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The product catalog for Meta Commerce Manager, as CSV.
 *
 * Register `https://<site>/feeds/meta.csv` as a scheduled data feed (Commerce
 * Manager → Catalog → Data sources), fetched daily. Every `id` is the product's
 * handle — the same id the Meta Pixel sends as `content_ids` — so catalog ads
 * can retarget a shopper with the product they viewed, and purchases are
 * credited to the product they were.
 *
 * Images at 1024px: Meta wants at least 500×500 and crops to square, and the
 * gallery size is the sharpest the storefront already serves. Brand falls back
 * to the shop's own name, since Meta rejects an item with neither a brand nor
 * a GTIN.
 *
 * Built per request with a one-hour cache header; Meta fetches it once a day.
 */
const COLUMNS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'google_product_category',
  'product_type',
] as const;

function cell(value: string | null | undefined): string {
  const text = (value ?? '').replace(/\r\n?/g, '\n');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const inr = (amount: string) => `${amount} INR`;

export async function GET() {
  const [items, settings] = await Promise.all([
    (await api()).storefront.catalogFeed.query(),
    storeSettings(),
  ]);
  const fallbackBrand = settings.store.nameEn || 'BuildKart';

  const rows = await Promise.all(
    items.map(async (item) => {
      const images = (
        await Promise.all(item.imageKeys.map((key) => imageUrl(key, { w: 1024, q: 85 })))
      ).filter((url): url is string => Boolean(url));
      if (images.length === 0) return null;

      const row: Record<(typeof COLUMNS)[number], string> = {
        id: item.handle,
        title: item.title,
        description: item.description,
        availability: item.inStock ? 'in stock' : 'out of stock',
        condition: 'new',
        price: inr(item.price),
        sale_price: item.salePrice ? inr(item.salePrice) : '',
        link: absoluteUrl(`/products/${item.handle}`),
        image_link: images[0]!,
        // Meta takes extra images as one comma-separated cell.
        additional_image_link: images.slice(1).join(','),
        brand: item.brand ?? fallbackBrand,
        google_product_category: item.googleProductCategory ?? '',
        product_type: item.productType ?? '',
      };
      return COLUMNS.map((column) => cell(row[column])).join(',');
    }),
  );

  const body = [COLUMNS.join(','), ...rows.filter((row): row is string => row !== null)].join('\n');

  return new Response(`${body}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      // A feed, not a page: keep it out of search results.
      'x-robots-tag': 'noindex',
    },
  });
}
