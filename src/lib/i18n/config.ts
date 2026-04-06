export const locales = ['es', 'en', 'pt-BR'] as const
export const defaultLocale = 'es' as const

export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  'pt-BR': 'Português',
}

export const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  'pt-BR': '🇧🇷',
}
