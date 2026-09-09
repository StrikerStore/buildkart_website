'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

/**
 * "Download invoice" — which is the browser's print dialog, set to Save as PDF.
 *
 * Not a generated PDF file, and that is a decision rather than a shortcut.
 *
 * This shop is bilingual, and every PDF library would need a Devanagari font
 * embedded and registered before "सीमेंट" rendered as anything but empty boxes —
 * a 300KB font shipped into a serverless function, per invoice, to reproduce
 * what the browser already has. The print pipeline renders the shop's real type
 * in both languages, paginates a forty-line order correctly, and every browser
 * on every phone offers "Save as PDF" from the same dialog.
 *
 * The page it prints is a complete tax invoice on its own — a customer who
 * bookmarks or shares the URL gets the document, not a button.
 */
export function PrintInvoice({ locale }: { locale: Locale }) {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden />
      {locale === 'hi' ? 'बिल डाउनलोड करें' : 'Download invoice'}
    </Button>
  );
}
