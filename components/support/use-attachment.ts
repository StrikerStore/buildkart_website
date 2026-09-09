'use client';

import { useCallback, useRef, useState } from 'react';
import type { SupportAttachmentInput } from '@StrikerStore/contract';

export type AttachmentState = {
  /** What the message will carry, once the bytes are actually in the bucket. */
  value: SupportAttachmentInput | null;
  /** A local object URL, so the customer sees the photo before it finishes. */
  previewUrl: string | null;
  uploading: boolean;
  error: string | null;
};

const EMPTY: AttachmentState = { value: null, previewUrl: null, uploading: false, error: null };

/** Reads intrinsic dimensions so the bubble can reserve the right aspect box. */
async function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    // Cosmetic only — an unreadable image still uploads fine.
    return {};
  }
}

/**
 * One photo, uploaded straight to storage.
 *
 * Deliberately one, not many. A support message is "here is what arrived
 * broken", and a multi-file queue with per-file progress — which the admin's
 * media uploader needs and has — would be a larger control than the message it
 * is attached to.
 *
 * The upload starts the moment a file is chosen rather than on send, so the
 * waiting happens while the customer is still typing. By the time they press
 * send there is usually nothing left to wait for.
 */
export function useAttachment(failureMessage: string) {
  const [state, setState] = useState<AttachmentState>(EMPTY);
  const objectUrl = useRef<string | null>(null);

  const clear = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setState(EMPTY);
  }, []);

  const choose = useCallback(
    async (file: File) => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const preview = URL.createObjectURL(file);
      objectUrl.current = preview;

      setState({ value: null, previewUrl: preview, uploading: true, error: null });

      try {
        const presign = await fetch('/api/support/attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });

        if (!presign.ok) {
          const body = (await presign.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? failureMessage);
        }

        const { uploadUrl, r2Key } = (await presign.json()) as {
          uploadUrl: string;
          r2Key: string;
        };

        const put = await fetch(uploadUrl, {
          method: 'PUT',
          // Must match the Content-Type that was signed, or the signature is
          // invalid and R2 refuses the object.
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!put.ok) throw new Error(failureMessage);

        const dimensions = await readDimensions(file);

        setState({
          value: { r2Key, mime: file.type, sizeBytes: file.size, ...dimensions },
          previewUrl: preview,
          uploading: false,
          error: null,
        });
      } catch (error) {
        setState({
          value: null,
          previewUrl: null,
          uploading: false,
          error: error instanceof Error ? error.message : failureMessage,
        });
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
    },
    [failureMessage],
  );

  return { ...state, choose, clear };
}
