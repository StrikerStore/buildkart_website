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

/** The longest edge a support photo is kept at — plenty to see a crack or a label. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

type Prepared = { file: File; width?: number; height?: number };

/**
 * The photo as it will be stored: re-drawn onto a canvas, scaled down to
 * `MAX_EDGE`, and saved as a JPEG.
 *
 * Re-drawing is the point, not only the size. A phone photo carries EXIF
 * metadata — often the GPS position it was taken at, which for a building
 * site is the customer's address. A canvas copy keeps the pixels and nothing
 * else. It also keeps the file small, since stored photos are served as-is
 * rather than resized on the way out.
 *
 * Falls back to the original when the browser cannot decode or encode it; the
 * upload must still work.
 */
async function prepare(file: File): Promise<Prepared> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    // A transparent screenshot would otherwise turn black as a JPEG.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) throw new Error('No blob');

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
    return { file: new File([blob], name, { type: 'image/jpeg' }), width, height };
  } catch {
    return { file };
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
    async (original: File) => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const preview = URL.createObjectURL(original);
      objectUrl.current = preview;

      setState({ value: null, previewUrl: preview, uploading: true, error: null });

      try {
        const { file, width, height } = await prepare(original);

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

        setState({
          value: { r2Key, mime: file.type, sizeBytes: file.size, width, height },
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
