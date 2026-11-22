import { tr, type Language } from '../i18n'
import { invoke, isTauri } from '@tauri-apps/api/core'
import type {
  Library,
  Preferences,
  ReadResult,
  SaveRequest,
  SaveResult,
  Project,
  SearchResult,
} from '../core/types'

export interface NativeError {
  code: string
  message: string
}
export interface DefaultAppStatus {
  supported: boolean
  registered: boolean
  markdown: boolean
  text: boolean
  requiresSettings: boolean
}
export interface UpdateInfo {
  version: string
  notes: string
  mode: 'install' | 'package'
  prerelease: boolean
}
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return tr(String(error.message))
  return String(error)
}
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
}
export function native<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri())
    return Promise.reject({
      code: 'desktop',
      message: 'Esta operação requer o aplicativo desktop. Execute npm run desktop.',
    })
  return invoke<T>(command, args)
}
export const backend = {
  openLink: (href: string) => native<void>('open_link', { href }),
  languageBootstrap: () =>
    native<{ platform: string; installerLanguage: Language | null }>('language_bootstrap'),
  checkUpdate: () => native<UpdateInfo | null>('check_update'),
  dismissUpdate: () => native<void>('dismiss_update'),
  downloadUpdate: (path: string | null) => native<string | null>('download_update', { path }),
  installUpdate: () => native<void>('install_update'),
  defaultAppStatus: () => native<DefaultAppStatus>('default_app_status'),
  setDefaultApp: () => native<DefaultAppStatus>('set_default_app'),
  takeOpenRequests: () =>
    native<({ kind: 'file'; path: string } | { kind: 'error'; message: string })[]>(
      'take_open_requests',
    ),
  library: () => native<Library>('load_library'),
  preferences: (preferences: Preferences) => native<void>('save_preferences', { preferences }),
  read: (path: string) => native<ReadResult>('read_document', { path }),
  save: (request: SaveRequest) => native<SaveResult>('save_document', { request }),
  rename: (path: string, title: string) =>
    native<{ path: string; title: string }>('rename_document', { path, title }),
  image: (document: string, source: string) => native<string>('read_image', { document, source }),
  importImage: (path: string) => native<string>('import_image', { path }),
  project: (project: Project) => native<void>('upsert_project', { project }),
  deleteProject: (id: string) => native<void>('delete_project', { id }),
  associate: (path: string, projectId: string | null) =>
    native<void>('associate_document', { path, projectId }),
  forget: (path: string) => native<void>('forget_document', { path }),
  relocate: (oldPath: string, newPath: string) =>
    native<void>('relocate_document', { oldPath, newPath }),
  reorder: (ids: string[]) => native<void>('reorder_projects', { ids }),
  search: (query: string) => native<SearchResult[]>('search_documents', { query }),
}
