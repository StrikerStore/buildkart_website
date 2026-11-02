'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Calculator,
  Check,
  ChevronRight,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { ContactLink } from '@/components/analytics/contact-link';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import type { Locale } from '@/lib/i18n';
import { CONTACT_FORM_ID, ContactForm, useContactForm } from './contact-form';

type Stage = 'menu' | 'help' | 'contact' | 'sent';

const ROW =
  'flex min-h-[64px] w-full items-center gap-3 rounded-card border border-hairline-strong bg-surface p-3 text-left hover:border-ink';

function RowText({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-heading6 text-ink">{title}</span>
      <span className="block text-body3 text-ink-muted">{detail}</span>
    </span>
  );
}

function Chevron() {
  return <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />;
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden />;
}

/**
 * What the floating button opens: a short menu, then Help or Contact us inside
 * the same sheet. Get a quote leaves for its own page, because it needs the room
 * and a back button that moves between its steps.
 */
export function AssistPanel({
  locale,
  supportPhone,
  whatsapp,
  customer,
  onClose,
}: {
  locale: Locale;
  supportPhone: string | null;
  whatsapp: string | null;
  customer: { name: string | null; phone: string } | null;
  onClose: () => void;
}) {
  const hi = locale === 'hi';
  const [stage, setStage] = useState<Stage>('menu');
  const [sent, setSent] = useState<{ reference: string | null; phone: string } | null>(null);

  const form = useContactForm({
    initialName: customer?.name ?? '',
    initialPhone: customer?.phone ?? '',
    locale,
    onSent: (result) => {
      setSent(result);
      setStage('sent');
    },
  });

  const titles: Record<Stage, string> = {
    menu: hi ? 'हम कैसे मदद करें?' : 'How can we help?',
    help: hi ? 'मदद' : 'Help',
    contact: hi ? 'संपर्क करें' : 'Contact us',
    sent: hi ? 'संदेश भेज दिया गया' : 'Message sent',
  };

  return (
    <Sheet
      title={titles[stage]}
      onClose={onClose}
      onBack={stage === 'help' || stage === 'contact' ? () => setStage('menu') : undefined}
      size={stage === 'contact' ? 'full' : 'half'}
      placement="corner"
      closeLabel={hi ? 'बंद करें' : 'Close'}
      backLabel={hi ? 'वापस' : 'Back'}
      footer={
        stage === 'contact' ? (
          <Button
            type="submit"
            form={CONTACT_FORM_ID}
            block
            disabled={!form.canSend || form.pending}
          >
            {form.pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {hi ? 'भेजें' : 'Send message'}
          </Button>
        ) : undefined
      }
    >
      {stage === 'menu' && (
        <div className="space-y-2 p-4">
          <button type="button" className={ROW} onClick={() => setStage('help')}>
            <RowIcon icon={LifeBuoy} />
            <RowText
              title={hi ? 'मदद' : 'Help'}
              detail={hi ? 'कॉल, व्हाट्सएप, चैट और सवाल-जवाब' : 'Call, WhatsApp, chat and FAQs'}
            />
            <Chevron />
          </button>

          <button type="button" className={ROW} onClick={() => setStage('contact')}>
            <RowIcon icon={Mail} />
            <RowText
              title={hi ? 'संपर्क करें' : 'Contact us'}
              detail={hi ? 'संदेश भेजें, हम आपसे संपर्क करेंगे' : 'Send a message and we will get back to you'}
            />
            <Chevron />
          </button>

          <Link href="/quote" className={ROW} onClick={onClose}>
            <RowIcon icon={Calculator} />
            <RowText
              title={hi ? 'कोटेशन पाएं' : 'Get a quote'}
              detail={hi ? 'अपने काम के लिए सामान का हिसाब लगाएं' : 'Work out the materials for your job'}
            />
            <Chevron />
          </Link>
        </div>
      )}

      {stage === 'help' && (
        <div className="space-y-2 p-4">
          {/* Calling first, for the reason given on the help page: for this
              audience it is the quickest way to an answer, not a fallback. */}
          {supportPhone && (
            <ContactLink method="phone" href={`tel:${supportPhone}`} className={ROW}>
              <Phone className="size-5 shrink-0 text-brand-text" aria-hidden />
              <RowText title={hi ? 'कॉल करें' : 'Call us'} detail={supportPhone} />
            </ContactLink>
          )}

          {whatsapp && (
            <ContactLink
              method="whatsapp"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={ROW}
            >
              <MessageCircle className="size-5 shrink-0 text-success" aria-hidden />
              <RowText
                title={hi ? 'व्हाट्सएप करें' : 'WhatsApp us'}
                detail={hi ? 'फ़ोटो भेज सकते हैं' : 'Send a photo of what you need'}
              />
            </ContactLink>
          )}

          <Link href="/support" className={ROW} onClick={onClose}>
            <RowIcon icon={MessageSquare} />
            <RowText
              title={hi ? 'हमसे चैट करें' : 'Chat with us'}
              detail={hi ? 'साइन इन करके सवाल पूछें' : 'Sign in and ask a question'}
            />
            <Chevron />
          </Link>

          <Link href="/account/orders" className={ROW} onClick={onClose}>
            <RowIcon icon={Package} />
            <RowText
              title={hi ? 'ऑर्डर ट्रैक करें' : 'Track an order'}
              detail={hi ? 'आपके ऑर्डर की स्थिति' : 'See where your order is'}
            />
            <Chevron />
          </Link>

          <Link href="/help" className={ROW} onClick={onClose}>
            <RowIcon icon={LifeBuoy} />
            <RowText
              title={hi ? 'सभी मदद और नीतियां' : 'All help and policies'}
              detail={hi ? 'सवाल-जवाब, डिलीवरी और वापसी' : 'FAQs, delivery and returns'}
            />
            <Chevron />
          </Link>
        </div>
      )}

      {stage === 'contact' && <ContactForm form={form} locale={locale} />}

      {stage === 'sent' && sent && (
        <div className="p-4">
          <p className="flex items-center gap-2 text-heading5 text-success">
            <Check className="size-5 shrink-0" aria-hidden />
            {hi ? 'धन्यवाद' : 'Thank you'}
          </p>
          <p className="mt-2 text-body2 text-ink">
            {hi
              ? `हम +91 ${sent.phone} पर आपसे संपर्क करेंगे।`
              : `We will get back to you on +91 ${sent.phone}.`}
          </p>
          {sent.reference && (
            <p className="mt-1 text-body3 text-ink-muted">
              {hi ? 'आपका रेफ़रेंस नंबर' : 'Your reference is'} {sent.reference}
            </p>
          )}
          <Button type="button" variant="outline" block className="mt-4" onClick={onClose}>
            {hi ? 'बंद करें' : 'Close'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
