import { type Locale, defaultLocale } from './config'
import es from '@/../public/locales/es/marketing.json'

export type MarketingCopy = typeof es

/**
 * Copy for the marketing site (home + legal pages).
 * Only Spanish exists today; other locales fall back to it until translated.
 */
const dictionaries: Partial<Record<Locale, MarketingCopy>> = { es }

export function getMarketingCopy(locale: Locale = defaultLocale): MarketingCopy {
  return dictionaries[locale] ?? dictionaries[defaultLocale]!
}

/** Replaces `{key}` tokens in a dictionary string. */
export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`)
}
