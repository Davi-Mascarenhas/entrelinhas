import type { Preferences } from './types'
import { isLanguage } from '../i18n'
import { isAssignableShortcut } from './shortcuts'

export const defaultPreferences: Preferences = {
  language: 'pt-BR',
  languageChosen: false,
  theme: 'light',
  themeChosen: false,
  onboardingCompleted: false,
  cursor: 'block',
  autoImmersive: true,
  askBeforeDiscard: false,
  defaultFormat: 'md',
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.85,
  zoom: 100,
  editorWidth: 740,
  sidebarSide: 'left',
  sidebarWidth: 244,
  sidebarVisible: true,
  tabsPosition: 'top',
  spellcheck: false,
  selectionTools: true,
  formattingPosition: 'bottom',
  zenHideFormatting: false,
  zenTopMargin: 56,
  zenSideMargin: 56,
  shortcuts: {
    settings: 'Ctrl+,',
    new: 'Ctrl+N',
    open: 'Ctrl+O',
    save: 'Ctrl+S',
    saveAs: 'Ctrl+Shift+S',
    close: 'Ctrl+W',
    find: 'Ctrl+F',
    replace: 'Ctrl+H',
    immersive: 'Ctrl+Shift+F',
  },
}

// A leitura também valida os dados: preferências antigas não devem quebrar a janela.
export function readPreferences(value: unknown): Preferences {
  const result = structuredClone(defaultPreferences)
  if (!value || typeof value !== 'object') return result
  const input = value as Record<string, unknown>
  // Uma instalação anterior já pode ter escolhido seu tema antes desta opção existir.
  result.themeChosen = ['light', 'dark', 'sepia'].includes(input.theme as string)
  const choices = {
    theme: ['light', 'dark', 'sepia'],
    cursor: ['block', 'thin', 'hidden'],
    defaultFormat: ['md', 'txt'],
    fontFamily: ['serif', 'sans', 'mono'],
    sidebarSide: ['left', 'right'],
    tabsPosition: ['top', 'left', 'right'],
    formattingPosition: ['bottom', 'side'],
  }
  for (const [key, options] of Object.entries(choices)) {
    if (options.includes(input[key] as string)) Object.assign(result, { [key]: input[key] })
  }
  const ranges = {
    fontSize: [12, 40],
    lineHeight: [1.2, 2.5],
    zoom: [50, 200],
    editorWidth: [440, 1100],
    sidebarWidth: [200, 380],
    zenTopMargin: [16, 200],
    zenSideMargin: [16, 200],
  }
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const n = input[key]
    if (typeof n === 'number' && Number.isFinite(n))
      Object.assign(result, { [key]: Math.min(max, Math.max(min, n)) })
  }
  for (const key of [
    'themeChosen',
    'autoImmersive',
    'askBeforeDiscard',
    'sidebarVisible',
    'spellcheck',
    'selectionTools',
    'zenHideFormatting',
  ] as const) {
    if (typeof input[key] === 'boolean') result[key] = input[key]
  }
  // Quem já usava o aplicativo mantém seu tema e não precisa repetir a apresentação.
  // Uma escolha de tema durante o novo fluxo ainda não conclui as três etapas.
  result.onboardingCompleted =
    typeof input.onboardingCompleted === 'boolean' ? input.onboardingCompleted : result.themeChosen
  if (isLanguage(input.language)) result.language = input.language
  result.languageChosen =
    typeof input.languageChosen === 'boolean'
      ? input.languageChosen
      : result.onboardingCompleted || isLanguage(input.language)
  if (input.shortcuts && typeof input.shortcuts === 'object') {
    const custom = input.shortcuts as Record<string, unknown>
    const keys = Object.keys(result.shortcuts) as (keyof Preferences['shortcuts'])[]
    const candidate = { ...result.shortcuts }
    for (const key of keys) {
      const shortcut = custom[key]
      if (typeof shortcut === 'string' && (isAssignableShortcut(shortcut) || shortcut === 'Ctrl+T'))
        candidate[key] = shortcut
    }
    // Duplicatas nunca devem bloquear ações; preserva uma atribuição e usa o padrão disponível.
    const used = new Set<string>()
    for (const key of keys) {
      if (!used.has(candidate[key])) {
        result.shortcuts[key] = candidate[key]
        used.add(candidate[key])
      } else {
        const fallback = [
          defaultPreferences.shortcuts[key],
          ...Array.from({ length: 24 }, (_, i) => `Ctrl+Alt+F${i + 1}`),
        ].find((value) => !used.has(value) && isAssignableShortcut(value))!
        result.shortcuts[key] = fallback
        used.add(fallback)
      }
    }
  }
  return result
}
