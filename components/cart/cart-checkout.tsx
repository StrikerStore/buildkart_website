'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Briefcase, Home, Loader2, MapPin, User, Wallet } from 'lucide-react';
import {
  compareMoney,
  formatINR,
  quotePartialCod,
  quoteWalletRedemption,
  subtractMoney,
  type CartDto,
  type MyAddressDto,
  type PartialCodRules,
  type PaymentStartDto,
  type WalletSummaryDto,
} from '@StrikerStore/contract';
import { Button, buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import type { MapDefault } from '@/lib/location-shared';
import {
  confirmRazorpay,
  placeOrder,
  reportPaymentFailed,
  startPayment,
} from '@/app/cart/checkout-actions';
import { openRazorpay, submitToPayu } from '@/app/cart/gateway';
import { AddressSheet, addressLine } from './address-sheet';

type PayMode = 'ONLINE' | 'COD' | 'ADVANCE';

/**
 * The cart's checkout: where it goes, how it is paid, and the one button.
 *
 * The button says exactly what will happen next — "Login to proceed", "Add
 * address to proceed", "Pay ₹4,320" — so a tap never surprises anybody. How to
 * pay online (UPI, card, net banking…) is chosen inside the gateway's own
 * window, which knows the customer's apps and saved cards better than we do.
 */
export function CartCheckout({
  cart,
  locale,
  signedIn,
  addresses,
  selectedAddress,
  mapDefault,
  currentPin,
  receiver,
  online,
  cod,
  partialCod,
  wallet,
  askGstin,
  defaultGstin,
  storeName,
  notice,
}: {
  cart: CartDto;
  locale: Locale;
  signedIn: boolean;
  addresses: MyAddressDto[];
  selectedAddress: MyAddressDto | null;
  mapDefault: MapDefault;
  currentPin: { lat: number; lng: number } | null;
  receiver: { name: string; phone: string };
  /** Whether any online gateway is switched on. */
  online: boolean;
  /** Full cash on delivery, when switched on. */
  cod: { label: string; maxOrderValue: string } | null;
  partialCod: PartialCodRules | null;
  wallet: WalletSummaryDto | null;
  askGstin: boolean;
  defaultGstin: string | null;
  storeName: string;
  /** Why the customer is back here — a payment that did not become an order. */
  notice: string | null;
}) {
  const hi = locale === 'hi';
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(notice);
  const busy = pending || paying;

  // --- what is owed --------------------------------------------------------
  const redemption =
    wallet && wallet.enabled
      ? quoteWalletRedemption({ grandTotal: cart.grandTotal, balance: wallet.balance }, wallet.rules)
      : null;
  const [useWallet, setUseWallet] = useState(false);
  const walletApplied = useWallet && redemption?.eligible ? redemption.amount : '0.00';
  const toPay = subtractMoney(cart.grandTotal, walletApplied);

  // --- how it can be paid --------------------------------------------------
  const codTooLarge =
    cod !== null &&
    compareMoney(cod.maxOrderValue, '0.00') > 0 &&
    compareMoney(toPay, cod.maxOrderValue) > 0;
  const advance = partialCod && online ? quotePartialCod(toPay, partialCod) : null;
  const modes: PayMode[] = [
    ...(online ? (['ONLINE'] as const) : []),
    ...(advance?.eligible ? (['ADVANCE'] as const) : []),
    ...(cod ? (['COD'] as const) : []),
  ];
  const [mode, setMode] = useState<PayMode>(modes[0] ?? 'ONLINE');
  const effectiveMode: PayMode = modes.includes(mode) ? mode : (modes[0] ?? 'ONLINE');

  const [gstin, setGstin] = useState(defaultGstin ?? '');
  const [note, setNote] = useState('');

  const blocked =
    !cart.meetsMinimum ||
    cart.delivery?.serviced === false ||
    modes.length === 0 ||
    (effectiveMode === 'COD' && codTooLarge);

  // --- acting --------------------------------------------------------------
  function proceed() {
    setError(null);
    if (!selectedAddress) {
      setSheetOpen(true);
      return;
    }
    const details = {
      addressId: selectedAddress.id,
      customerNote: note.trim() || undefined,
      gstin: askGstin ? gstin.trim() || undefined : undefined,
      useWallet: walletApplied !== '0.00',
    };

    startTransition(async () => {
      if (effectiveMode === 'COD') {
        const result = await placeOrder(details);
        if (!result.ok) {
          setError(result.formErrors[0] ?? Object.values(result.fieldErrors)[0] ?? null);
          return;
        }
        router.replace(`/account/orders/${result.data.orderId}?placed=1`);
        return;
      }

      const started = await startPayment({
        ...details,
        mode: effectiveMode === 'ADVANCE' ? 'ADVANCE' : 'FULL',
      });
      if (!started.ok) {
        setError(started.formErrors[0] ?? Object.values(started.fieldErrors)[0] ?? null);
        return;
      }
      await goToGateway(started.data);
    });
  }

  async function goToGateway(start: PaymentStartDto) {
    if (start.gateway === 'NONE') {
      // The wallet covered the whole order; it is already placed.
      router.replace(`/account/orders/${start.order.orderId}?placed=1`);
      return;
    }
    if (start.gateway === 'PAYU') {
      // Left busy on purpose: the page is about to navigate to PayU.
      setPaying(true);
      submitToPayu(start);
      return;
    }

    setPaying(true);
    try {
      await openRazorpay(start, {
        storeName,
        onSuccess: (response) => {
          void (async () => {
            let confirmed;
            try {
              confirmed = await confirmRazorpay({
                sessionId: start.sessionId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            } catch {
              // The money may well have moved — the webhook and the reconcile
              // job still place the order. Do not invite a second payment.
              setPaying(false);
              setError(
                hi
                  ? 'हम आपका भुगतान पक्का कर रहे हैं। कुछ मिनट में "मेरे ऑर्डर" देखें — दोबारा भुगतान न करें।'
                  : 'We are still confirming your payment. Check My orders in a few minutes — please do not pay again.',
              );
              return;
            }
            if (confirmed.ok && confirmed.data.status === 'PAID') {
              router.replace(`/account/orders/${confirmed.data.order.orderId}?placed=1`);
              return;
            }
            setPaying(false);
            if (!confirmed.ok) setError(confirmed.formErrors[0] ?? null);
            else if (confirmed.data.status !== 'PAID') setError(confirmed.data.message);
          })();
        },
        onDismiss: () => {
          setPaying(false);
          void reportPaymentFailed(start.sessionId, 'Closed the payment window.');
          setError(
            hi
              ? 'भुगतान पूरा नहीं हुआ। आपका कार्ट सुरक्षित है — फिर से कोशिश करें।'
              : 'Payment was not completed. Your cart is safe — try again whenever you are ready.',
          );
        },
        onFailed: (reason) => void reportPaymentFailed(start.sessionId, reason),
      });
    } catch {
      setPaying(false);
      setError(
        hi
          ? 'पेमेंट विंडो नहीं खुल सकी। इंटरनेट जाँचें और फिर कोशिश करें।'
          : 'The payment window could not open. Check your connection and try again.',
      );
    }
  }

  // --- the button ----------------------------------------------------------
  const label = !signedIn
    ? hi
      ? 'आगे बढ़ने के लिए लॉगिन करें'
      : 'Login to proceed'
    : !selectedAddress
      ? hi
        ? 'आगे बढ़ने के लिए पता जोड़ें'
        : 'Add address to proceed'
      : effectiveMode === 'COD'
        ? hi
          ? 'ऑर्डर करें · डिलीवरी पर भुगतान'
          : 'Place order · Cash on delivery'
        : effectiveMode === 'ADVANCE' && advance?.eligible
          ? hi
            ? `${formatINR(advance.advance)} अग्रिम दें`
            : `Pay ${formatINR(advance.advance)} advance`
          : hi
            ? `${formatINR(toPay)} का भुगतान करें`
            : `Pay ${formatINR(toPay)}`;

  const action = !signedIn ? (
    <Link
      href="/login?next=%2Fcart"
      className={buttonClass({ variant: 'buy', size: 'lg', block: true, className: 'gap-2' })}
    >
      <User className="size-5" aria-hidden />
      {label}
    </Link>
  ) : (
    <Button
      type="button"
      variant="buy"
      size="lg"
      block
      disabled={busy || (selectedAddress !== null && blocked)}
      onClick={proceed}
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {label}
    </Button>
  );

  const deliverRow = signedIn && selectedAddress && (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      className="flex w-full items-center gap-3 text-left"
    >
      <AddressIcon label={selectedAddress.label} />
      <span className="min-w-0 flex-1">
        <span className="block text-heading6 text-ink">
          {hi ? 'डिलीवरी' : 'Delivering to'} {selectedAddress.label || (hi ? 'पता' : 'address')}
        </span>
        <span className="block truncate text-body5 text-ink-muted">{addressLine(selectedAddress)}</span>
      </span>
      <span className="shrink-0 text-cta3 text-brand-text">{hi ? 'बदलें' : 'Change'}</span>
    </button>
  );

  return (
    <>
      <div className="mt-4 space-y-4 rounded-card border border-hairline bg-surface p-4">
        {/* Desktop shows the address here; on a phone it rides in the sticky bar. */}
        {deliverRow && <div className="hidden lg:block">{deliverRow}</div>}

        {signedIn && modes.length > 1 && (
          <fieldset>
            <legend className="text-heading6 text-ink">{hi ? 'भुगतान कैसे करेंगे?' : 'How would you like to pay?'}</legend>
            <div className="mt-2 space-y-2">
              {modes.map((option) => (
                <label
                  key={option}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-box border px-3 py-2.5',
                    effectiveMode === option ? 'border-ink bg-surface-muted' : 'border-hairline-strong',
                    option === 'COD' && codTooLarge && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="payMode"
                    className="mt-1 size-4 accent-[var(--ink)]"
                    checked={effectiveMode === option}
                    disabled={option === 'COD' && codTooLarge}
                    onChange={() => setMode(option)}
                  />
                  <span className="min-w-0">
                    <span className="block text-body2 text-ink">
                      {option === 'ONLINE'
                        ? hi
                          ? 'ऑनलाइन भुगतान'
                          : 'Pay online'
                        : option === 'COD'
                          ? (cod?.label ?? (hi ? 'डिलीवरी पर भुगतान' : 'Cash on delivery'))
                          : advance?.eligible
                            ? hi
                              ? `अभी ${formatINR(advance.advance)}, बाकी ${formatINR(advance.balance)} डिलीवरी पर`
                              : `Pay ${formatINR(advance.advance)} now, ${formatINR(advance.balance)} on delivery`
                            : ''}
                    </span>
                    <span className="block text-body5 text-ink-muted">
                      {option === 'ONLINE'
                        ? hi
                          ? 'UPI, कार्ड, नेट बैंकिंग, वॉलेट, EMI'
                          : 'UPI, cards, net banking, wallets, EMI'
                        : option === 'COD'
                          ? codTooLarge && cod
                            ? hi
                              ? `${formatINR(cod.maxOrderValue)} से ऊपर उपलब्ध नहीं`
                              : `Not available above ${formatINR(cod.maxOrderValue)}`
                            : hi
                              ? 'नकद या QR से, सामान मिलने पर'
                              : 'Cash or UPI QR when the goods arrive'
                          : hi
                            ? 'अग्रिम ऑनलाइन, बाकी नकद या QR से'
                            : 'Advance online, the rest in cash or UPI QR at the door'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {signedIn && wallet && wallet.enabled && wallet.balance !== '0.00' && redemption && (
          <label
            className={cn(
              'flex items-start gap-3 rounded-box border p-3',
              redemption.eligible ? 'cursor-pointer border-hairline-strong' : 'border-hairline bg-surface-muted',
            )}
          >
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--buy)]"
              checked={redemption.eligible && useWallet}
              disabled={!redemption.eligible}
              onChange={(event) => setUseWallet(event.target.checked)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-heading6 text-ink">
                <Wallet className="size-4 shrink-0" aria-hidden />
                {hi ? 'वॉलेट बैलेंस इस्तेमाल करें' : 'Use wallet balance'}
              </span>
              <span className="mt-0.5 block text-body5 text-ink-muted">
                {redemption.eligible
                  ? hi
                    ? `${formatINR(wallet.balance)} उपलब्ध · इस ऑर्डर पर ${formatINR(redemption.amount)}`
                    : `${formatINR(wallet.balance)} available · ${formatINR(redemption.amount)} on this order`
                  : redemption.reason === 'BELOW_MINIMUM'
                    ? hi
                      ? `${formatINR(redemption.minOrderValue)} से ऊपर के ऑर्डर पर`
                      : `Usable on orders above ${formatINR(redemption.minOrderValue)}`
                    : `${formatINR(wallet.balance)} ${hi ? 'उपलब्ध' : 'available'}`}
              </span>
            </span>
          </label>
        )}

        {signedIn && (
          <div className="space-y-2">
            {askGstin && (
              <details className="rounded-box border border-hairline-strong px-3 py-2">
                <summary className="cursor-pointer text-body3 text-ink">
                  {hi ? 'GST बिल चाहिए?' : 'Need a GST invoice?'}
                </summary>
                <input
                  value={gstin}
                  onChange={(event) => setGstin(event.target.value)}
                  placeholder={hi ? '15 अक्षर — जैसे 23AABCU9603R1ZM' : 'GST number, e.g. 23AABCU9603R1ZM'}
                  aria-label={hi ? 'GST नंबर' : 'GST number'}
                  className="mt-2 h-11 w-full rounded-box border border-hairline-strong bg-surface px-3 text-body2 text-ink focus:border-ink focus:outline-none"
                />
              </details>
            )}
            <details className="rounded-box border border-hairline-strong px-3 py-2">
              <summary className="cursor-pointer text-body3 text-ink">
                {hi ? 'डिलीवरी के लिए कोई निर्देश?' : 'Delivery instructions'}
              </summary>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 2000))}
                rows={2}
                placeholder={hi ? 'जैसे: सुबह 9 बजे से पहले पहुँचा दें' : 'e.g. deliver before 9am, gate is on the side'}
                className="mt-2 w-full rounded-box border border-hairline-strong bg-surface p-3 text-body2 text-ink focus:border-ink focus:outline-none"
              />
            </details>
          </div>
        )}

        {walletApplied !== '0.00' && (
          <div className="flex justify-between text-body2">
            <span className="text-ink-muted">{hi ? 'वॉलेट के बाद देय' : 'To pay after wallet'}</span>
            <span className="text-heading5 text-ink">{formatINR(toPay)}</span>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-box bg-error-bg px-3 py-2 text-body3 text-error">
            {error}
          </p>
        )}

        <div className="hidden lg:block">{action}</div>
      </div>

      {/*
        * On a phone the address and the button ride in a bar pinned to the
        * bottom, so "Pay" is always one thumb away however long the cart is.
        */}
      <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t border-hairline bg-surface px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-sheet lg:hidden">
        {deliverRow}
        {action}
      </div>

      {sheetOpen && (
        <AddressSheet
          locale={locale}
          addresses={addresses}
          selectedId={selectedAddress?.id ?? null}
          mapDefault={mapDefault}
          currentPin={currentPin}
          receiver={receiver}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

function AddressIcon({ label }: { label: string | null }) {
  const word = (label ?? '').trim().toLowerCase();
  const Icon = word === 'home' ? Home : word === 'work' || word === 'office' ? Briefcase : MapPin;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-box bg-surface-muted">
      <Icon className="size-4 text-ink" aria-hidden />
    </span>
  );
}
