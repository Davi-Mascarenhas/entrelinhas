import type { Preferences, ShortcutAction } from './types'

export function eventShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>,
): string {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return ''
  if (['Process', 'Dead', 'Unidentified'].includes(event.key)) return ''
  return `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${event.key.toUpperCase()}`
}

const reserved = new Set([
  'Ctrl+B',
  'Ctrl+I',
  'Ctrl+U',
  'Ctrl+Z',
  'Ctrl+Shift+Z',
  'Ctrl+C',
  'Ctrl+V',
  'Ctrl+X',
  'Ctrl+A',
  'Ctrl+T',
  'Ctrl+TAB',
  'Ctrl+Shift+TAB',
  'Ctrl+Q',
  'Ctrl+L',
  'Ctrl+R',
  'Ctrl+P',
  'Ctrl+0',
  'Ctrl++',
  'Ctrl+=',
  'Ctrl+-',
  'Alt+F',
  'Alt+F4',
  'F11',
])
export function isAssignableShortcut(value: string): boolean {
  if (reserved.has(value)) return false
  return (
    /^(?:Ctrl\+(?:Shift\+)?(?:Alt\+)?|(?:Shift\+)?Alt\+)[^\s+]$/u.test(value) ||
    /^(?:Ctrl\+)?(?:Shift\+)?(?:Alt\+)?F(?:[1-9]|1\d|2[0-4])$/.test(value)
  )
}

export function shortcutAction(
  event: KeyboardEvent,
  preferences: Preferences,
): ShortcutAction | null {
  if (event.isComposing || event.key === 'Process') return null
  const shortcut = eventShortcut(event)
  return (
    (Object.entries(preferences.shortcuts).find(
      ([, value]) => value === shortcut,
    )?.[0] as ShortcutAction) ?? (shortcut === 'Ctrl+T' ? 'new' : null)
  )
}
