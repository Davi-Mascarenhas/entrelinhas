import type { JSONContent } from '@tiptap/core'
import type { Language } from '../i18n'

export type DocumentFormat = 'md' | 'txt'
export type Theme = 'light' | 'dark' | 'sepia'
export type ShortcutAction =
  'new' | 'open' | 'save' | 'saveAs' | 'close' | 'find' | 'replace' | 'immersive' | 'settings'

export interface Preferences {
  language: Language
  languageChosen: boolean
  theme: Theme
  themeChosen: boolean
  onboardingCompleted: boolean
  cursor: 'block' | 'thin' | 'hidden'
  autoImmersive: boolean
  askBeforeDiscard: boolean
  defaultFormat: DocumentFormat
  fontFamily: 'serif' | 'sans' | 'mono'
  fontSize: number
  lineHeight: number
  zoom: number
  editorWidth: number
  sidebarSide: 'left' | 'right'
  sidebarWidth: number
  sidebarVisible: boolean
  tabsPosition: 'top' | 'left' | 'right'
  spellcheck: boolean
  selectionTools: boolean
  shortcuts: Record<ShortcutAction, string>
}

export interface Note {
  id: string
  title: string
  titleIsDefault?: boolean
  path: string | null
  format: DocumentFormat
  content: JSONContent
  dirty: boolean
  version: string | null
  projectId: string | null
  savedContent: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  position: number
}
export interface RegisteredDocument {
  path: string
  title: string
  projectId: string | null
  updatedAt: number
}
export interface Library {
  projects: Project[]
  documents: RegisteredDocument[]
  preferences: Partial<Preferences>
}
export interface ReadResult {
  path: string
  title: string
  content: string
  version: string
  format: DocumentFormat
}
export interface ImageAsset {
  token: string
  dataUrl: string
}
export interface SaveRequest {
  path: string
  content: string
  expectedVersion: string | null
  overwrite: boolean
  projectId: string | null
  assets: ImageAsset[]
}
export interface SaveResult {
  path: string
  title: string
  content: string
  version: string
  warning: string | null
}
export interface SearchResult {
  path: string
  title: string
  excerpt: string
  missing: boolean
  error: string | null
}
