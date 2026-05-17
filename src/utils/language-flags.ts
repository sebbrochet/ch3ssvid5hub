const FLAGS: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  de: 'DE',
  es: 'ES',
  pt: 'PT',
};

export function languageFlag(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return FLAGS[code];
}
