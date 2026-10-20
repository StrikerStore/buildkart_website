'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { mobileInputValue } from '@StrikerStore/contract';
import { saveNominee } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

type Nominee = { name: string; relation: string; phone: string };

const BLANK: Nominee = { name: '', relation: '', phone: '' };

/**
 * The person who may use the customer's rights over their data if they die or
 * cannot act themselves (DPDP Act §14). Optional; removing them is one tap.
 */
export function NomineeForm({ initial, locale }: { initial: Nominee | null; locale: Locale }) {
  const hi = locale === 'hi';
  const [form, setForm] = useState<Nominee>(initial ?? BLANK);
  const [current, setCurrent] = useState<Nominee | null>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: Nominee) {
    setErrors({});
    setFormError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveNominee(next);
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setFormError(result.formErrors[0] ?? null);
        return;
      }
      setCurrent(result.data.nominee);
      setForm(result.data.nominee ?? BLANK);
      setSaved(true);
    });
  }

  const field = (key: keyof Nominee, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block text-body3 text-ink-muted">{label}</span>
      <input
        value={form[key]}
        onChange={(event) => {
          const value = key === 'phone' ? mobileInputValue(event.target.value) : event.target.value;
          setForm((c) => ({ ...c, [key]: value }));
          setSaved(false);
        }}
        aria-invalid={Boolean(errors[key])}
        className="mt-1 h-[var(--tap)] w-full rounded-box border border-hairline-strong bg-surface px-3 text-body1 text-ink focus:border-ink focus:outline-none"
        {...props}
      />
      {errors[key] && <span className="mt-1 block text-body4 text-error">{errors[key]}</span>}
    </label>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(form);
      }}
      className="space-y-3"
    >
      <p className="text-body3 text-ink-muted">
        {hi
          ? 'आपकी मृत्यु या असमर्थता की स्थिति में यह व्यक्ति आपकी ओर से आपके डेटा से जुड़े अधिकार इस्तेमाल कर सकता है।'
          : 'If you die or cannot act yourself, this person may use your rights over your data on your behalf.'}
      </p>
      {field('name', hi ? 'नाम' : 'Name', { autoComplete: 'off' })}
      {field('relation', hi ? 'आपसे रिश्ता' : 'Relation to you', { placeholder: hi ? 'जैसे पत्नी, बेटा' : 'e.g. wife, son' })}
      {field('phone', hi ? 'मोबाइल नंबर' : 'Mobile number', { inputMode: 'tel', placeholder: '9826000000' })}

      {formError && (
        <p role="alert" className="text-body4 text-error">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : saved ? <Check className="size-4" aria-hidden /> : null}
          {current ? (hi ? 'नॉमिनी बदलें' : 'Update nominee') : hi ? 'नॉमिनी सेव करें' : 'Save nominee'}
        </Button>
        {current && (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => save(BLANK)}>
            {hi ? 'नॉमिनी हटाएँ' : 'Remove nominee'}
          </Button>
        )}
      </div>
    </form>
  );
}
