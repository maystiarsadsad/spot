import { type Locale, defaultLocale } from './config'

type Dictionary = Record<string, unknown>

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import('@/../public/locales/es/common.json').then((m) => m.default),
  en: () => import('@/../public/locales/en/common.json').then((m) => m.default),
  'pt-BR': () => import('@/../public/locales/pt-BR/common.json').then((m) => m.default),
}

export async function getDictionary(locale: Locale = defaultLocale): Promise<Dictionary> {
  const loadDictionary = dictionaries[locale] ?? dictionaries[defaultLocale]
  return loadDictionary()
}
