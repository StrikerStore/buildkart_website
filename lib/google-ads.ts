/**
 * Google Ads' conversion destination, as gtag needs it: "AW-<id>/<label>".
 *
 * Google's event snippet shows it that way, but the Ads screens also show the
 * conversion id and label apart, and a value set without "AW-" reaches no tag
 * at all: gtag takes the event, Tag Assistant shows it, and Google Ads never
 * hears of it, so the Purchase action stays Inactive. So the setting is taken
 * in any of the shapes it is likely to arrive in:
 *
 *   "AW-18554607980/a59J…"   as Google gives it
 *   "18554607980/a59J…"      without the prefix
 *   "a59J…"                  the label alone, with GOOGLE_TAG_ID's id
 *
 * Anything else is refused (null), so a typo reports nothing rather than a
 * conversion Google silently drops. No imports: the order page reads it on
 * the server.
 */
export function googleAdsSendTo(setting: string | undefined, tagId: string | null | undefined): string | null {
  const value = setting?.trim().replace(/^["']|["']$/g, '');
  if (!value) return null;
  const full = /^(?:AW-)?(\d+)\/([\w-]+)$/i.exec(value);
  if (full) return `AW-${full[1]}/${full[2]}`;
  const tag = tagId ? /^AW-(\d+)$/i.exec(tagId.trim()) : null;
  // A label, and not the tag id itself pasted without one.
  if (tag && /^(?!AW-)[\w-]+$/i.test(value)) return `AW-${tag[1]}/${value}`;
  return null;
}
