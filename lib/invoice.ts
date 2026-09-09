import 'server-only';
import QRCode from 'qrcode';
import { siteUrl } from './site';

/**
 * The public URL a printed invoice's QR code points at.
 *
 * Absolute, and it has to be: a QR carries no origin of its own, and a relative
 * path scanned off a sheet of paper resolves against nothing. `siteUrl()` is the
 * one place that knows this deployment's domain.
 */
export function invoiceVerifyUrl(token: string): string {
  return `${siteUrl().replace(/\/$/, '')}/invoice/${token}`;
}

/**
 * A QR code as an inline SVG string.
 *
 * **SVG, not a PNG data URI.** It is a fraction of the bytes, and more to the
 * point it stays crisp at whatever DPI the printer decides on — a rasterised QR
 * scaled up by a print driver is one a phone camera gives up on, which defeats
 * the entire purpose of putting it there.
 *
 * Error correction level M: enough redundancy to survive a fold, a smudge or a
 * thumbprint on a delivery note, without the density that level H would add for
 * a code this short.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    // No quiet zone from the library — the layout supplies the white margin,
    // and a doubled one wastes a third of the printed square.
    margin: 0,
    color: { dark: '#2d333a', light: '#ffffff' },
  });
}
