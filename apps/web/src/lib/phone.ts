// Country metadata + phone parsing/formatting used by the PhoneInput component
// and by the WhatsApp helpers. Numbers are stored as full international digits
// (country dial code + national number, no "+"), e.g. "5511999999999".

export interface Country {
  iso: string; // ISO 3166-1 alpha-2
  name: string; // display name (pt-BR)
  dial: string; // dial code digits, no "+"
  flag: string; // emoji flag
  /** Formats the national digits for display (as the user types). */
  format: (national: string) => string;
  /** Max length of the national number (digits, excluding dial code). */
  maxNational: number;
  /** Placeholder showing the expected national format. */
  placeholder: string;
}

/** Formats digits into fixed groups, joined by `sep`, ignoring extra digits gracefully. */
function grouper(groups: number[], sep = ' ') {
  return (d: string): string => {
    const parts: string[] = [];
    let i = 0;
    for (const g of groups) {
      if (i >= d.length) break;
      parts.push(d.slice(i, i + g));
      i += g;
    }
    if (i < d.length) parts.push(d.slice(i));
    return parts.join(sep);
  };
}

// Brazilian WhatsApp numbers are mobile: (XX) XXXXX-XXXX. Masked mobile-first
// as the user types (WhatsApp doesn't use landlines).
function brFormat(d: string): string {
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 5) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

// US/Canada: (XXX) XXX-XXXX
function usFormat(d: string): string {
  d = d.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Ordered with Brazil first (default), then common destinations for this product.
export const COUNTRIES: Country[] = [
  { iso: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷', format: brFormat, maxNational: 11, placeholder: '(11) 91234-5678' },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹', format: grouper([3, 3, 3]), maxNational: 9, placeholder: '912 345 678' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸', format: usFormat, maxNational: 10, placeholder: '(201) 555-0123' },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', format: grouper([2, 4, 4]), maxNational: 11, placeholder: '11 2345 6789' },
  { iso: 'PY', name: 'Paraguai', dial: '595', flag: '🇵🇾', format: grouper([3, 3, 3]), maxNational: 9, placeholder: '961 234 567' },
  { iso: 'UY', name: 'Uruguai', dial: '598', flag: '🇺🇾', format: grouper([2, 3, 3]), maxNational: 8, placeholder: '91 234 567' },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', format: grouper([1, 4, 4]), maxNational: 9, placeholder: '9 1234 5678' },
  { iso: 'CO', name: 'Colômbia', dial: '57', flag: '🇨🇴', format: grouper([3, 3, 4]), maxNational: 10, placeholder: '321 234 5678' },
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽', format: grouper([2, 4, 4]), maxNational: 10, placeholder: '55 1234 5678' },
  { iso: 'BO', name: 'Bolívia', dial: '591', flag: '🇧🇴', format: grouper([8]), maxNational: 8, placeholder: '71234567' },
  { iso: 'PE', name: 'Peru', dial: '51', flag: '🇵🇪', format: grouper([3, 3, 3]), maxNational: 9, placeholder: '912 345 678' },
  { iso: 'ES', name: 'Espanha', dial: '34', flag: '🇪🇸', format: grouper([3, 3, 3]), maxNational: 9, placeholder: '612 345 678' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Brasil

export function findCountryByIso(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) || DEFAULT_COUNTRY;
}

/**
 * Splits a stored value into its country + national parts.
 * Handles legacy Brazilian numbers stored without a dial code (10–11 digits).
 */
export function parsePhone(value: string): { country: Country; national: string } {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return { country: DEFAULT_COUNTRY, national: '' };

  // Legacy BR: 10–11 digits stored without a country code.
  if (!digits.startsWith('55') && digits.length <= 11) {
    return { country: DEFAULT_COUNTRY, national: digits };
  }

  // Brazil explicitly (12–13 digits with the "55" code).
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return { country: DEFAULT_COUNTRY, national: digits.slice(2) };
  }

  // Otherwise match the longest known dial code prefix.
  const byLongest = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byLongest) {
    if (digits.startsWith(c.dial)) {
      return { country: c, national: digits.slice(c.dial.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, national: digits };
}

/**
 * Formats a stored value for read-only display (lists, cards). The flag already
 * identifies the country, so the dial code is left out — it only added noise.
 * `toE164Digits` remains the source of truth for anything dialled or sent.
 */
export function formatPhoneDisplay(value: string): string {
  const { country, national } = parsePhone(value);
  if (!national) return value;
  return `${country.flag} ${country.format(national)}`;
}

/** Returns the full international digits (dial code + national), no "+". */
export function toE164Digits(value: string): string {
  const { country, national } = parsePhone(value);
  return national ? country.dial + national : '';
}
