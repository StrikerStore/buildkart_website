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
import { Accordion } from '@/components/ui/accordion';
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
    <div className="page-w page-x py-5">
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

          <p className="mt-3 text-body3 text-success">
            {locale === 'hi'
              ? `${settings.commerce.promiseHours} घंटे में डिलीवरी`
              : `Delivery in ${settings.commerce.promiseHours} hours`}
            {settings.commerce.codEnabled &&
              (locale === 'hi' ? ' · कैश ऑन डिलीवरी' : ' · Cash on delivery available')}
          </p>

          <div className="mt-5">
            <VariantPicker
              options={product.options}
              variants={product.variants}
              quantities={quantities}
              locale={locale}
              productName={name}
              bulkUnlockCutoff={settings.commerce.bulkUnlockCutoff}
              specs={product.specs}
              hsnCode={product.hsnCode}
              description={
                body ? (
                  <section className="mt-8">
                    <h2 className="mb-2 text-heading4 text-ink">
                      {locale === 'hi' ? 'विवरण' : 'Description'}
                    </h2>
                    {/*
                      * Sanitised on write, never on read — `write/products.ts`
                      * runs every one of this product's HTML fields through
                      * `sanitizeHtml`. Re-sanitising here would be a second,
                      * divergent definition of what is safe.
                      */}
                    <div
                      className="prose-bk text-body2 text-ink"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
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


          {/*
            * FAQs and return terms, in a native disclosure stack.
            *
            * Below the specs rather than above them: a shopper who has scrolled
            * this far has decided what the product *is* and is now deciding
            * whether to trust buying it. Both sections render only when the
            * owner has written them — a "Returns" bar that opens on nothing is
            * worse than no bar.
            *
            * Both start **closed**. Two open blocks of prose push the related
            * products and everything under them off the screen, and the bars
            * only exist for the shopper who has a question — the one who does
            * not should be able to scroll past both in one flick.
            */}
          {(faqs || returnPolicy) && (
            <section className="mt-8">
              <h2 className="mb-1 text-heading4 text-ink">
                {locale === 'hi' ? 'सवाल-जवाब' : 'Questions & returns'}
              </h2>
              <div className="rounded-card border border-hairline bg-surface px-4">
                {faqs && (
                  <Accordion title={hi ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently asked questions'}>
                    {/* Sanitised on write in `write/products.ts`, like every
                        other rich text on a product. */}
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
              </div>
            </section>
          )}
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
