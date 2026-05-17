const FLAGS: Record<string, string> = {
  en: 'EN',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  pt: '🇵🇹',
};

export function languageFlag(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return FLAGS[code];
}
