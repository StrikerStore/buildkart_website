'use client';

import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { tr, type Locale } from '@/lib/i18n';
import type { useAttachment } from './use-attachment';

/**
 * The photo control, shared by the new-chat form and the reply box.
 *
 * `capture` is deliberately absent from the input. On a phone, omitting it lets
 * the browser offer both the camera and the gallery; setting it to
 * "environment" forces the camera and takes away the photo they already took of
 * the damaged delivery, which is the more common case.
 */
export function PhotoField({
  attachment,
  locale,
  disabled,
}: {
  attachment: ReturnType<typeof useAttachment>;
  locale: Locale;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void attachment.choose(file);
          // Cleared so choosing the same file twice in a row still fires.
          event.target.value = '';
        }}
      />

      {attachment.previewUrl ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.previewUrl}
            alt={tr(locale, 'support.photoAlt')}
            className="max-h-32 w-auto rounded-box border border-hairline object-contain"
          />

          {attachment.uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-box bg-ink/50 text-body4 text-ink-inverted">
              {tr(locale, 'support.uploading')}
            </span>
          )}

          <button
            type="button"
            onClick={attachment.clear}
            className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border border-hairline-strong bg-surface text-ink shadow-raised"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">{tr(locale, 'support.removePhoto')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          className="inline-flex h-[var(--tap)] w-fit items-center gap-2 rounded-box border border-hairline-strong px-4 text-cta2 text-ink hover:bg-surface-muted disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden />
          {tr(locale, 'support.attachPhoto')}
        </button>
      )}

      {attachment.error && <p className="text-body4 text-error">{attachment.error}</p>}
    </div>
  );
}
