import { useSyncExternalStore } from 'react'
import rows from './messages.json'

export const languages = [
  { id: 'pt-BR', name: 'Português (Brasil)' },
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
  { id: 'zh-CN', name: '简体中文' },
  { id: 'de', name: 'Deutsch' },
] as const
export type Language = (typeof languages)[number]['id']
let language: Language = 'pt-BR'
const listeners = new Set<() => void>()
export const isLanguage = (value: unknown): value is Language =>
  languages.some((item) => item.id === value)
export const getLanguage = () => language
export function setLanguage(value: Language) {
  if (language === value) return
  language = value
  cache.clear()
  for (const listener of listeners) listener()
}
export function useLanguage() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, getLanguage)
}
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const catalogs = new Map((rows as string[][]).map((row) => [normalize(row[0]), row]))
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = [...catalogs.entries()]
  .filter(([key]) => /\{\w+\}/.test(key))
  .map(([key, row]) => {
    const slots: string[] = []
    let offset = 0,
      expression = '^'
    for (const match of key.matchAll(/\{(\w+)\}/g)) {
      expression += escape(key.slice(offset, match.index)).replace(/\s+/g, '\\s+') + '([\\s\\S]*?)'
      slots.push(match[1])
      offset = match.index! + match[0].length
    }
    return {
      row,
      slots,
      regex: new RegExp(expression + escape(key.slice(offset)).replace(/\s+/g, '\\s+') + '$'),
    }
  })
  .sort((a, b) => b.row[0].length - a.row[0].length)
const cache = new Map<string, string>()
export function tr(text: string, values?: Record<string, string | number>): string {
  const index = languages.findIndex((item) => item.id === language)
  const key = normalize(text)
  let row = catalogs.get(key)
  let parameters = values
  if (!row && index !== 0) {
    const cached = cache.get(text)
    if (cached !== undefined) return cached
    for (const pattern of patterns) {
      const match = pattern.regex.exec(text)
      if (match) {
        row = pattern.row
        parameters = Object.fromEntries(pattern.slots.map((slot, i) => [slot, match[i + 1]]))
        break
      }
    }
  }
  const result = (row?.[index] ?? text).replace(/\{(\w+)\}/g, (original, slot) =>
    parameters?.[slot] === undefined ? original : String(parameters[slot]),
  )
  if (!values && index !== 0) {
    if (cache.size > 1500) cache.clear()
    cache.set(text, result)
  }
  return result
}
export function formatShortcut(value: string) {
  return language === 'de' ? value.replace(/Ctrl/g, 'Strg').replace(/Shift/g, 'Umschalt') : value
}

export function formatCount(count: number, kind: 'words' | 'characters') {
  const unit =
    kind === 'words'
      ? count === 1
        ? 'palavra'
        : 'palavras'
      : count === 1
        ? 'caractere'
        : 'caracteres'
  return tr(`{count} ${unit}`, { count: count.toLocaleString(language) })
}
