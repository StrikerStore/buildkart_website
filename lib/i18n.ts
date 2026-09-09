import { DEFAULT_LOCALE, type Locale } from '@buildkart/contract';

export type { Locale };

/**
 * The storefront's own strings — chrome, labels, empty states.
 *
 * Deliberately **not** named `t`. `@buildkart/contract` already exports a `t`,
 * and it does something different: it reads a translated *column pair* off a
 * database row (`t(product, 'name', locale)`). Two functions called `t` with
 * different signatures, both importable into the same file, is exactly the bug
 * `core/src/actor.ts` names when it explains why `assertPermission` is not
 * called `requirePermission`. So: `tr` for interface copy, `t` for content.
 *
 * A flat object rather than JSON files and `next-intl`. The string count is in
 * the low hundreds, every one of them is needed on the server, and a typo
 * becomes a type error here rather than a missing-key warning at runtime.
 */
const STRINGS = {
  'header.home': { en: 'Home', hi: 'होम' },
  'header.cart': { en: 'Cart', hi: 'कार्ट' },
  'header.login': { en: 'Login', hi: 'लॉगिन' },
  'header.search': { en: 'Search', hi: 'खोजें' },
  'header.searchPlaceholder': {
    en: 'Search for cement, sariya, plywood…',
    hi: 'सीमेंट, सरिया, प्लाईवुड खोजें…',
  },
  'header.deliverTo': { en: 'Delivery to', hi: 'डिलीवरी' },
  'header.setLocation': { en: 'Set your location', hi: 'अपना पता चुनें' },
  'header.language': { en: 'Language', hi: 'भाषा' },

  'delivery.inHours': { en: 'in {hours} hours', hi: '{hours} घंटे में' },
  'delivery.promise': { en: '{hours}-hour delivery', hi: '{hours} घंटे में डिलीवरी' },

  'nav.categories': { en: 'Categories', hi: 'श्रेणियाँ' },
  'nav.collections': { en: 'Collections', hi: 'कलेक्शन' },
  'nav.orders': { en: 'Orders', hi: 'ऑर्डर' },
  'nav.account': { en: 'Account', hi: 'अकाउंट' },
  'nav.help': { en: 'Help', hi: 'मदद' },

  'footer.support': { en: 'Need help?', hi: 'मदद चाहिए?' },
  'footer.callUs': { en: 'Call us', hi: 'कॉल करें' },
  'footer.whatsapp': { en: 'WhatsApp', hi: 'व्हाट्सएप' },
  'footer.rights': { en: 'All rights reserved.', hi: 'सर्वाधिकार सुरक्षित।' },
  'footer.gstin': { en: 'GSTIN', hi: 'जीएसटीआईएन' },

  /*
   * Support. Every one of these is read by someone with a problem, so the
   * Hindi is written rather than transliterated — "आपका मैसेज भेज दिया गया" is
   * what a person says, "मैसेज सेंड हो गया" is what a translation tool says.
   */
  'support.title': { en: 'Help', hi: 'मदद' },
  'support.subtitle': {
    en: 'Message us and we will reply here.',
    hi: 'हमें मैसेज करें, जवाब यहीं मिलेगा।',
  },
  'support.start': { en: 'Start a chat', hi: 'चैट शुरू करें' },
  'support.newChat': { en: 'New conversation', hi: 'नई बातचीत' },
  'support.noneTitle': { en: 'No conversations yet', hi: 'अभी कोई बातचीत नहीं' },
  'support.noneBody': {
    en: 'Ask us about an order, a delivery, or anything else.',
    hi: 'ऑर्डर, डिलीवरी या किसी और बात के बारे में पूछें।',
  },
  'support.topicQuestion': { en: 'What is this about?', hi: 'यह किस बारे में है?' },
  'support.aboutOrder': { en: 'About order {order}', hi: 'ऑर्डर {order} के बारे में' },
  'support.messageLabel': { en: 'Your message', hi: 'आपका मैसेज' },
  'support.placeholder': {
    en: 'Tell us what happened…',
    hi: 'हमें बताइए क्या हुआ…',
  },
  'support.send': { en: 'Send', hi: 'भेजें' },
  'support.sending': { en: 'Sending…', hi: 'भेजा जा रहा है…' },
  'support.reply': { en: 'Write a reply…', hi: 'जवाब लिखें…' },
  'support.attachPhoto': { en: 'Add a photo', hi: 'फोटो जोड़ें' },
  'support.removePhoto': { en: 'Remove photo', hi: 'फोटो हटाएं' },
  'support.uploading': { en: 'Uploading…', hi: 'अपलोड हो रहा है…' },
  'support.photoFailed': {
    en: 'That photo could not be uploaded. Try another one.',
    hi: 'यह फोटो अपलोड नहीं हो पाई। दूसरी कोशिश करें।',
  },
  'support.photoAlt': { en: 'Photo sent with this message', hi: 'इस मैसेज के साथ भेजी गई फोटो' },
  'support.sendFailed': {
    en: 'That did not send. Check your connection and try again.',
    hi: 'मैसेज नहीं गया। कनेक्शन जांचकर दोबारा कोशिश करें।',
  },
  'support.you': { en: 'You', hi: 'आप' },
  'support.shop': { en: 'BuildKart', hi: 'BuildKart' },
  'support.awaiting': { en: 'We will reply shortly', hi: 'हम जल्द जवाब देंगे' },
  'support.replied': { en: 'Replied', hi: 'जवाब आया' },
  'support.resolved': { en: 'Closed', hi: 'बंद' },
  'support.resolvedNote': {
    en: 'This conversation is closed. Send a message to reopen it.',
    hi: 'यह बातचीत बंद है। मैसेज भेजकर दोबारा खोल सकते हैं।',
  },
  'support.getHelpWithOrder': {
    en: 'Get help with this order',
    hi: 'इस ऑर्डर में मदद चाहिए',
  },
  'support.chatWithUs': { en: 'Chat with us', hi: 'हमसे चैट करें' },
  'support.chatWithUsHint': {
    en: 'Ask a question and we will reply in the app',
    hi: 'सवाल पूछें, जवाब ऐप में ही मिलेगा',
  },

  'trust.fastDelivery': { en: '{hours}-hour delivery', hi: '{hours} घंटे में डिलीवरी' },
  'trust.cod': { en: 'Cash on delivery', hi: 'कैश ऑन डिलीवरी' },
  'trust.genuine': { en: 'Genuine brands', hi: 'असली ब्रांड' },
  'trust.dailyRates': { en: "Today's rates", hi: 'आज के भाव' },
} as const satisfies Record<string, Record<Locale, string>>;

export type StringKey = keyof typeof STRINGS;

/**
 * An interface string, with `{placeholder}` substitution.
 *
 * Falls back to English when the Hindi entry is blank, matching how `t()`
 * treats a missing translated column — one fallback rule for the whole site.
 */
export function tr(
  locale: Locale,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const entry = STRINGS[key];
  const value = entry[locale] || entry[DEFAULT_LOCALE];
  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
