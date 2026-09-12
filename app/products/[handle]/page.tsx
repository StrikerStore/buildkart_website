import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, storeSettings } from '@/lib/api/server';
import { currentCart } from '@/lib/cart';
import { currentLocale } from '@/lib/locale';
import { imageUrl, IMAGE } from '@/lib/media';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/catalog/breadcrumb';
import { ProductCard } from '@/components/catalog/product-card';
import { RateStamp } from '@/components/catalog/rate-stamp';
import { Gallery } from '@/components/product/gallery';
import { DeliveryLine } from '@/components/product/delivery-line';
import { Accordion } from '@/components/ui/accordion';
import { SpecsTable } from '@/components/product/specs-table';
import { VariantPicker } from '@/components/product/variant-picker';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ handle }, locale] = await Promise.all([params, currentLocale()]);
  const product = await (await api()).storefront.product.query({ handle });
  if (!product) return {};

  const name = (locale === 'hi' && product.nameHi) || product.nameEn;
  const description =
    (locale === 'hi' && product.seoDescriptionHi) || product.seoDescriptionEn;
  const image = await imageUrl(product.images[0]?.key, IMAGE.gallery);

  return {
    title: product.seoTitle ?? name,
    description: description ?? undefined,
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      title: product.seoTitle ?? name,
      description: description ?? undefined,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [{ handle }, locale] = await Promise.all([params, currentLocale()]);

  const [product, cart, settings] = await Promise.all([
    (await api()).storefront.product.query({ handle }),
    currentCart(),
    storeSettings(),
  ]);

  if (!product) notFound();

  const name = (locale === 'hi' && product.nameHi) || product.nameEn;
  const body = (locale === 'hi' && product.bodyHtmlHi) || product.bodyHtmlEn;
  const hi = locale === 'hi';
  const returnPolicy = (hi && product.returnPolicyHi) || product.returnPolicyEn;
  const faqs = (hi && product.faqsHi) || product.faqsEn;

  /*
   * Cart quantities resolved here and handed down as a map, because the picker
   * is a Client Component that cannot read the cookie and the selected variant
   * changes without a round trip. The map is small — one entry per line already
   * in the cart, not per variant on the page.
   */
  const quantities = Object.fromEntries(cart.map((line) => [line.variantId, line.qty]));

  // The freshest price stamp across variants: on a rate-volatile line the
  // owner edits every size in one pass, so any of them answers "is this
  // today's rate?".
  const newestPrice = product.variants
    .map((variant) => variant.priceUpdatedAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);

  return (
    /*
     * Extra bottom room on phones, because this is the one route with two
     * stacked fixed bars: the sticky buy bar, and the cart capsule above it.
     * The layout's own `pb-24` clears a single bar, which is right everywhere
     * else — widening it globally would leave every other page with a gap that
     * nothing occupies.
     */
    <div className="page-w page-x pt-5 pb-[calc(var(--buy-bar-h)+5rem)] md:pb-5">
      <Breadcrumb
        trail={
          product.category
            ? [
                {
                  href: `/category/${product.category.slug}`,
                  label: (locale === 'hi' && product.category.nameHi) || product.category.nameEn,
                },
              ]
            : []
        }
        current={name}
        locale={locale}
      />

      <div className="gap-8 lg:flex lg:items-start">
        <div className="lg:w-1/2 lg:max-w-lg">
          <Gallery images={product.images} name={name} locale={locale} />
        </div>

        <div className="mt-5 min-w-0 flex-1 lg:mt-0">
          {/* Above the brand: delivery is what this audience checks first. */}
          <div className="mb-2">
            <DeliveryLine
              fallbackHours={settings.commerce.promiseHours}
              codEnabled={settings.commerce.codEnabled}
              locale={locale}
            />
          </div>

          {product.brandName && (
            <p className="text-body4 uppercase tracking-wide text-ink-faint">
              {product.brandName}
            </p>
          )}

          <h1 className="mt-0.5 text-heading2 text-ink">{name}</h1>

          {product.badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.badges.map((badge) => (
                <Badge key={badge.id} tone={badge.tone}>
                  {(locale === 'hi' && badge.labelHi) || badge.labelEn}
                </Badge>
              ))}
            </div>
          )}

          {product.isRateVolatile && newestPrice && (
            <RateStamp updatedAt={newestPrice} locale={locale} />
          )}

          <div className="mt-5">
            <VariantPicker
              options={product.options}
              variants={product.variants}
              quantities={quantities}
              locale={locale}
              productName={name}
              bulkTierBasis={product.bulkTierBasis}
              details={
                /*
                  * Everything worth reading about this product, as one closed
                  * stack: description, specifications, FAQs, return terms.
                  *
                  * All four start closed. This is a phone-first shop and the
                  * ADD button is what the page is for — four open blocks of
                  * prose push it, the suggestions rail and everything under
                  * them off the screen for a shopper who only wanted the price.
                  * A closed bar costs one tap for the shopper who does want the
                  * detail, and costs nothing for the one who does not.
                  *
                  * Each bar renders only when the owner has written it: a
                  * "Returns" row that opens on nothing is worse than no row.
                  *
                  * The HTML is sanitised on write in `write/products.ts`, never
                  * on read — re-sanitising here would be a second, divergent
                  * definition of what is safe.
                  */
                body || product.specs.length > 0 || faqs || returnPolicy ? (
                  <section className="mt-8 rounded-card border border-hairline bg-surface px-4">
                    {body && (
                      <Accordion title={hi ? 'विवरण' : 'Description'}>
                        <div
                          className="prose-bk text-body2 text-ink"
                          dangerouslySetInnerHTML={{ __html: body }}
                        />
                      </Accordion>
                    )}

                    {product.specs.length > 0 && (
                      <Accordion title={hi ? 'जानकारी' : 'Specifications'}>
                        <SpecsTable specs={product.specs} />
                      </Accordion>
                    )}

                    {faqs && (
                      <Accordion
                        title={hi ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently asked questions'}
                      >
                        <div className="prose-bk" dangerouslySetInnerHTML={{ __html: faqs }} />
                      </Accordion>
                    )}

                    {returnPolicy && (
                      <Accordion title={hi ? 'वापसी और बदली' : 'Returns & exchange'}>
                        <div
                          className="prose-bk"
                          dangerouslySetInnerHTML={{ __html: returnPolicy }}
                        />
                      </Accordion>
                    )}
                  </section>
                ) : null
              }
              suggestions={
                product.related.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-heading4 text-ink">
                      {locale === 'hi' ? 'यह भी पसंद आ सकता है' : 'You may also like'}
                    </h2>
                    <div className="rail flex -mx-4 gap-3 px-4 pb-1 [--rail-pad:16px] sm:mx-0 sm:px-0 sm:[--rail-pad:0px]">
                      {product.related.map((related) => (
                        <div key={related.handle} className="w-[160px] sm:w-[180px]">
                          <ProductCard product={related} locale={locale} />
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null
              }
            />
          </div>
        </div>
      </div>

      {/*
        * The related-products shelf moved *into* the buy column, where
        * `VariantPicker` reveals it after the first add — see the `suggestions`
        * prop above. It used to sit here at the foot of the page, and one copy
        * is right: two shelves of the same six products on one page is the same
        * recommendation made twice, and the one nobody scrolled to was this.
        */}

      {/*
        * Product structured data. Rendered from the same DTO the page uses, so
        * the price Google reads and the price the shopper sees cannot diverge —
        * which is the failure that gets a merchant's rich results suspended.
        */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name,
            ...(product.brandName ? { brand: { '@type': 'Brand', name: product.brandName } } : {}),
            ...(product.variants.length > 0
              ? {
                  offers: product.variants.map((variant) => ({
                    '@type': 'Offer',
                    price: variant.price,
                    priceCurrency: 'INR',
                    availability: variant.inStock
                      ? 'https://schema.org/InStock'
                      : 'https://schema.org/OutOfStock',
                    ...(variant.sku ? { sku: variant.sku } : {}),
                  })),
                }
              : {}),
          }),
        }}
      />
    </div>
  );
}
