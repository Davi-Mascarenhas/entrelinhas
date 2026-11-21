import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Editor } from '@tiptap/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'
import {
  FolderOpen,
  Save,
  Plus,
  X,
  PanelLeftOpen,
  Settings2,
  Search,
  FileText,
  ChevronDown,
  Maximize2,
  SlidersHorizontal,
  Keyboard,
  Focus,
  Check,
} from 'lucide-react'
import { createNote, countText, moveItem, updateNote, noteTitle } from './core/notes'
import { getWritingLayout } from './core/layout'
import { defaultPreferences, readPreferences } from './core/preferences'
import { shortcutAction } from './core/shortcuts'
import type { Note, Preferences, RegisteredDocument, Project } from './core/types'
import { backend, errorMessage } from './native/api'
import { useDocuments } from './documents/useDocuments'
import { useDialog } from './components/useDialog'
import { open as openNative } from '@tauri-apps/plugin-dialog'
import { EditorPane } from './editor/EditorPane'
import { ProjectAssignment } from './components/ProjectAssignment'
import { Formatting } from './components/Formatting'
import { WindowResize } from './native/WindowResize'
import { useIncomingFiles } from './native/useIncomingFiles'
import { useUpdates } from './native/useUpdates'
import { Sidebar } from './components/Sidebar'
import { LibrarySearch } from './components/LibrarySearch'
import { FindBar } from './components/FindBar'
import { WelcomeTheme } from './components/WelcomeTheme'
import { Settings } from './components/Settings'
import { TooltipLayer } from './components/TooltipLayer'
import { Titlebar } from './components/Titlebar'
import { RenameDocument } from './components/RenameDocument'
import { IconButton, Modal } from './components/ui'
import { tr, setLanguage, useLanguage, isLanguage, formatShortcut, formatCount } from './i18n'
export default function App() {
  const language = useLanguage()
  const [platform, setPlatform] = useState('linux')
  const [preferences, setPreferences] = useState<Preferences>(() =>
    structuredClone(defaultPreferences),
  )
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    let frame = 0
    const resize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setWindowWidth(window.innerWidth))
    }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [])
  const [notes, setNotes] = useState<Note[]>(() => [createNote()])
  const [documents, setDocuments] = useState<RegisteredDocument[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [updateInstalling, setUpdateInstalling] = useState(false)
  const updateLock = useRef(false)
  const notesRef = useRef(notes)
  notesRef.current = notes
  const preferencesQueue = useRef<Promise<void>>(Promise.resolve())
  const dialog = useDialog()
  const [activeId, setActiveId] = useState(() => notes[0].id)
  const [immersive, setImmersive] = useState(false),
    [settings, setSettings] = useState(false)
  const [librarySearch, setLibrarySearch] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [toolbar, setToolbar] = useState(false),
    [menu, setMenu] = useState(false)
  const [find, setFind] = useState<'find' | 'replace' | null>(null)
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
  })
  const [editorVersion, setEditorVersion] = useState(0)
  const [link, setLink] = useState<string | null>(null)
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null)
  const [notice, setNotice] = useState('')
  const editors = useRef(new Map<string, Editor>())
  const edgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dragged = useRef<string | null>(null)
  const activeNote = notes.find((note) => note.id === activeId) ?? notes[0]
  const activeEditor = editors.current.get(activeId)
  const onReady = useCallback((id: string, editor: Editor | null) => {
    if (editor) editors.current.set(id, editor)
    else editors.current.delete(id)
    setEditorVersion((value) => value + 1)
  }, [])
  void editorVersion
  useEffect(() => {
    if (!menu) return
    const frame = requestAnimationFrame(() =>
      menuRef.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus(),
    )
    const outside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.document-menu-wrapper')) setMenu(false)
    }
    window.addEventListener('mousedown', outside)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousedown', outside)
    }
  }, [menu])
  const closeSettings = useCallback(() => setSettings(false), [])
  const newNote = useCallback(
    (projectId: string | null = null) => {
      const note = createNote(preferences.defaultFormat, projectId)
      setNotes((current) => [...current, note])
      setActiveId(note.id)
      setImmersive(false)
    },
    [preferences.defaultFormat],
  )
  const notify = useCallback((message: string) => setNotice(message), [])
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [notice])
  const refresh = useCallback(async () => {
    try {
      const library = await backend.library()
      setDocuments(library.documents)
      setProjects(library.projects)
    } catch (error) {
      notify(
        tr('Biblioteca indisponível: {0}', {
          0: errorMessage(error),
        }),
      )
    }
  }, [notify])
  const fileOps = useDocuments({
    notes,
    setNotes,
    setActiveId,
    editors,
    preferences,
    documents,
    ask: dialog.ask,
    notify,
    refresh,
  })
  const openIncoming = useCallback(
    async (path: string) => {
      setImmersive(false)
      setMenu(false)
      setFind(null)
      setSelectionRect(null)
      return fileOps.openPath(path)
    },
    [fileOps.openPath],
  )
  useIncomingFiles(
    preferencesLoaded && preferences.onboardingCompleted && !updateInstalling,
    openIncoming,
    notify,
  )
  const updates = useUpdates(
    dialog.ask,
    async () => {
      updateLock.current = true
      setUpdateInstalling(true)
      editors.current.forEach((editor) => editor.setEditable(false))
      await fileOps.waitForSaves()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      for (const note of notesRef.current) {
        if (!(await fileOps.mayDiscard(note, true))) return false
      }
      await preferencesQueue.current
      return true
    },
    () => {
      updateLock.current = false
      setUpdateInstalling(false)
      editors.current.forEach((editor) => editor.setEditable(true))
    },
  )
  const closeNote = useCallback(
    async (id: string) => {
      await fileOps.waitForSaves()
      const note = notes.find((note) => note.id === id)
      if (!note || !(await fileOps.mayDiscard(note))) return
      const remaining = notes.filter((note) => note.id !== id)
      if (!remaining.length) {
        const blank = createNote(preferences.defaultFormat)
        setNotes([blank])
        setActiveId(blank.id)
      } else {
        setNotes(remaining)
        if (id === activeId)
          setActiveId(remaining[Math.max(0, notes.findIndex((note) => note.id === id) - 1)].id)
      }
    },
    [notes, activeId, preferences.defaultFormat, fileOps.mayDiscard, fileOps.waitForSaves],
  )
  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    void Promise.all([backend.library(), backend.languageBootstrap()])
      .then(([library, bootstrap]) => {
        if (cancelled) return
        const loaded = readPreferences(library.preferences)
        if (
          !isLanguage((library.preferences as Record<string, unknown>)?.language) &&
          isLanguage(bootstrap.installerLanguage)
        ) {
          loaded.language = bootstrap.installerLanguage
          loaded.languageChosen = true
        }
        setPlatform(bootstrap.platform)
        setLanguage(loaded.language)
        setPreferences(loaded)
        setProjects(library.projects)
        setDocuments(library.documents)
        setNotes((current) =>
          current.map((note) =>
            !note.path && !note.dirty
              ? {
                  ...note,
                  format: loaded.defaultFormat,
                }
              : note,
          ),
        )
        setPreferencesLoaded(true)
      })
      .catch((error) =>
        notify(
          tr('Não foi possível ler as preferências: {0}', {
            0: errorMessage(error),
          }),
        ),
      )
    return () => {
      cancelled = true
    }
  }, [notify])
  useEffect(() => {
    if (!preferencesLoaded || (!preferences.themeChosen && !preferences.languageChosen)) return
    preferencesQueue.current = preferencesQueue.current
      .catch(() => {})
      .then(() => backend.preferences(preferences))
      .catch((error) =>
        notify(
          tr('Não foi possível guardar as preferências: {0}', {
            0: errorMessage(error),
          }),
        ),
      )
  }, [preferences, preferencesLoaded, notify])
  const lifecycle = useRef({
    notes,
    mayDiscard: fileOps.mayDiscard,
    waitForSaves: fileOps.waitForSaves,
  })
  lifecycle.current = {
    notes,
    mayDiscard: fileOps.mayDiscard,
    waitForSaves: fileOps.waitForSaves,
  }
  useEffect(() => {
    if (!isTauri()) return
    let closing = false
    const unsubscribe = getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault()
      if (updateLock.current || document.querySelector('[data-shortcut-capture]')) return
      if (closing) return
      closing = true
      try {
        await lifecycle.current.waitForSaves()
        for (const note of lifecycle.current.notes) {
          setImmersive(false)
          if (!(await lifecycle.current.mayDiscard(note))) return
        }
        await preferencesQueue.current
        await getCurrentWindow().destroy()
      } catch (error) {
        notify(errorMessage(error))
      } finally {
        closing = false
      }
    })
    return () => {
      void unsubscribe.then((fn) => fn())
    }
  }, [notify])
  const chooseImage = useCallback(async () => {
    const editor = editors.current.get(activeId)
    if (!editor) return
    try {
      const selected = await openNative({
        title: tr('Inserir imagem'),
        multiple: true,
        filters: [
          {
            name: tr('Imagens'),
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'],
          },
        ],
      })
      for (const path of Array.isArray(selected) ? selected : selected ? [selected] : []) {
        const src = await backend.importImage(path)
        editor
          .chain()
          .focus()
          .setImage({
            src,
            alt: path.split('/').pop() ?? '',
          })
          .run()
      }
    } catch (error) {
      notify(errorMessage(error))
    }
  }, [activeId, notify])
  const insertImages = useCallback(
    async (files: File[], editor: Editor) => {
      for (const file of files) {
        if (
          ![
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp',
            'image/avif',
            'image/bmp',
          ].includes(file.type)
        ) {
          notify(tr('Use uma imagem PNG, JPEG, GIF, WebP, AVIF ou BMP.'))
          continue
        }
        if (file.size > 20 * 1024 * 1024) {
          notify(tr('A imagem excede o limite de 20 MB.'))
          continue
        }
        const reader = new FileReader()
        reader.onload = () => {
          if (!editor.isDestroyed)
            editor
              .chain()
              .focus()
              .setImage({
                src: String(reader.result),
                alt: file.name,
              })
              .run()
        }
        reader.onerror = () => notify(tr('Não foi possível ler a imagem.'))
        reader.readAsDataURL(file)
      }
    },
    [notify],
  )
  const onStats = useCallback((text: string) => setStats(countText(text)), [])
  const onChange = useCallback(
    (id: string) =>
      setNotes((current) =>
        current.find((note) => note.id === id)?.dirty
          ? current
          : updateNote(current, id, {
              dirty: true,
            }),
      ),
    [],
  )
  const onTyping = useCallback(() => {
    if (
      preferences.onboardingCompleted &&
      preferences.autoImmersive &&
      !settings &&
      !find &&
      !dialog.visible &&
      !librarySearch &&
      link === null
    ) {
      setImmersive(true)
      setMenu(false)
      setSelectionRect(null)
    }
  }, [
    preferences.onboardingCompleted,
    preferences.autoImmersive,
    settings,
    find,
    link,
    dialog.visible,
    librarySearch,
  ])
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.style.colorScheme = preferences.theme === 'light' ? 'light' : 'dark'
    if (isTauri())
      void getCurrentWindow()
        .setTheme(preferences.theme === 'light' ? 'light' : 'dark')
        .catch((error) => notify(errorMessage(error)))
  }, [preferences.theme, notify])
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (updateLock.current) return
      if (event.key === 'Escape') {
        setImmersive(false)
        setMenu(false)
        setFind(null)
        setSelectionRect(null)
        return
      }
      if (document.querySelector('[data-shortcut-capture]')) return
      if (event.key === 'F11') {
        event.preventDefault()
        if (isTauri())
          void getCurrentWindow()
            .isFullscreen()
            .then((full) => getCurrentWindow().setFullscreen(!full))
        return
      }
      const action = shortcutAction(event, preferences)
      if (
        action === 'settings' &&
        preferences.onboardingCompleted &&
        !dialog.visible &&
        !librarySearch &&
        link === null &&
        !renameId
      ) {
        event.preventDefault()
        setSettings(true)
        setImmersive(false)
        setMenu(false)
        return
      }
      if (
        !preferences.onboardingCompleted ||
        settings ||
        dialog.visible ||
        librarySearch ||
        link !== null ||
        (event.target as HTMLElement).closest?.('[role=dialog]')
      )
        return
      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setImmersive(false)
        setMenu((value) => !value)
        return
      }
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault()
        const index = notes.findIndex((note) => note.id === activeId)
        setActiveId(notes[(index + (event.shiftKey ? -1 : 1) + notes.length) % notes.length].id)
        return
      }
      if (event.ctrlKey && ['+', '=', '-', '0'].includes(event.key)) {
        event.preventDefault()
        setPreferences((current) => ({
          ...current,
          zoom:
            event.key === '0'
              ? 100
              : Math.min(200, Math.max(50, current.zoom + (event.key === '-' ? -10 : 10))),
        }))
        return
      }
      if (!action) return
      event.preventDefault()
      if (action === 'new') newNote()
      if (action === 'open') {
        setImmersive(false)
        void fileOps.openDocument()
      }
      if (action === 'save' || action === 'saveAs') {
        setImmersive(false)
        void fileOps.saveNote(activeId, action === 'saveAs')
      }
      if (action === 'close') closeNote(activeId)
      if (action === 'find' || action === 'replace') {
        setImmersive(false)
        setFind(action)
      }
      if (action === 'immersive') {
        setImmersive((value) => !value)
        editors.current.get(activeId)?.commands.focus()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [
    preferences,
    notes,
    activeId,
    settings,
    dialog.visible,
    librarySearch,
    link,
    newNote,
    closeNote,
    renameId,
    fileOps.openDocument,
    fileOps.saveNote,
  ])
  useEffect(() => {
    if (!immersive) return
    const move = (event: MouseEvent) => {
      const nearEdge =
        event.clientY < 12 ||
        (preferences.sidebarSide === 'left'
          ? event.clientX < 8
          : event.clientX > window.innerWidth - 8)
      if (nearEdge && !edgeTimer.current)
        edgeTimer.current = setTimeout(() => {
          setImmersive(false)
          edgeTimer.current = null
        }, 400)
      if (!nearEdge && edgeTimer.current) {
        clearTimeout(edgeTimer.current)
        edgeTimer.current = null
      }
    }
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('mousemove', move)
      if (edgeTimer.current) clearTimeout(edgeTimer.current)
      edgeTimer.current = null
    }
  }, [immersive, preferences.sidebarSide])
  const selectionToolsVisible = Boolean(
    selectionRect &&
    preferences.selectionTools &&
    !immersive &&
    !settings &&
    !find &&
    !dialog.visible &&
    !librarySearch &&
    link === null,
  )
  const formattingVisible = toolbar || selectionToolsVisible
  const tabsVisible = notes.length > 1
  const newTabShortcut = Object.entries(preferences.shortcuts).some(
    ([action, shortcut]) => action !== 'new' && shortcut === 'Ctrl+T',
  )
    ? preferences.shortcuts.new
    : 'Ctrl+T'
  const layout = getWritingLayout(windowWidth, preferences, tabsVisible)
  const style = {
    '--sidebar-width': `${layout.sidebarWidth}px`,
    '--writing-width': `${layout.writingWidth}px`,
    '--writing-offset': `${layout.writingOffset}px`,
    '--editor-width': `${preferences.editorWidth}px`,
    '--editor-font-size': `${(preferences.fontSize * preferences.zoom) / 100}px`,
    '--editor-line-height': preferences.lineHeight,
    '--editor-font':
      preferences.fontFamily === 'serif'
        ? "'Noto Serif', 'DejaVu Serif', Georgia, serif"
        : preferences.fontFamily === 'mono'
          ? "'Ubuntu Mono', 'DejaVu Sans Mono', monospace"
          : "'Ubuntu', 'Noto Sans', sans-serif",
  } as CSSProperties
  return (
    <div
      className={`app ${immersive ? 'immersive' : ''} sidebar-${preferences.sidebarSide} tabs-${layout.tabsPosition} ${preferences.sidebarVisible ? '' : 'sidebar-hidden'}`}
      style={style}
    >
      <Titlebar
        note={activeNote}
        onError={notify}
        onRename={() => {
          setRenameId(activeId)
          setImmersive(false)
        }}
      />
      <Sidebar
        preferences={preferences}
        projects={projects}
        documents={documents}
        activePath={activeNote.path}
        newNote={newNote}
        openDocument={() => void fileOps.openDocument()}
        openPath={fileOps.openPath}
        settings={() => {
          setSettings(true)
          setImmersive(false)
        }}
        search={() => {
          setLibrarySearch(true)
          setImmersive(false)
        }}
        changePreferences={(change) =>
          setPreferences((current) => ({
            ...current,
            ...change,
          }))
        }
        refresh={refresh}
        notify={notify}
        ask={dialog.ask}
        onDeletedProject={(id) =>
          setNotes((current) =>
            current.map((note) =>
              note.projectId === id
                ? {
                    ...note,
                    projectId: null,
                  }
                : note,
            ),
          )
        }
        onAssociate={(path, projectId) =>
          setNotes((current) =>
            current.map((note) =>
              note.path === path
                ? {
                    ...note,
                    projectId,
                  }
                : note,
            ),
          )
        }
      />
      <section className="workspace">
        {tabsVisible && (
          <div className="tabs chrome" role="tablist" aria-label={tr('Documentos abertos')}>
            {notes.map((note) => (
              <div
                key={note.id}
                className={`tab ${note.id === activeId ? 'active' : ''}`}
                role="tab"
                tabIndex={0}
                aria-selected={note.id === activeId}
                draggable
                onDragStart={() => {
                  dragged.current = note.id
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  setNotes((current) =>
                    moveItem(
                      current,
                      current.findIndex((item) => item.id === dragged.current),
                      current.findIndex((item) => item.id === note.id),
                    ),
                  )
                  dragged.current = null
                }}
                onClick={() => {
                  setActiveId(note.id)
                  setSelectionRect(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setActiveId(note.id)
                }}
              >
                <FileText size={14} />
                <span>{noteTitle(note)}</span>
                {note.dirty && (
                  <i className="dirty-dot" data-tooltip={tr('Alterações não salvas')} />
                )}
                <IconButton
                  label={tr('Fechar {0}', {
                    0: noteTitle(note),
                  })}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeNote(note.id)
                  }}
                >
                  <X size={13} />
                </IconButton>
              </div>
            ))}
            <IconButton
              label={tr('Nova guia ({0})', {
                0: newTabShortcut,
              })}
              onClick={() => newNote()}
            >
              <Plus size={16} />
            </IconButton>
          </div>
        )}
        <div className="document-area">
          <div className="document-toolbar chrome">
            <div className="document-navigation">
              {!preferences.sidebarVisible && (
                <IconButton
                  label={tr('Mostrar navegação')}
                  onClick={() =>
                    setPreferences((current) => ({
                      ...current,
                      sidebarVisible: true,
                    }))
                  }
                >
                  <PanelLeftOpen size={17} />
                </IconButton>
              )}
              <div className="document-menu-wrapper">
                <button
                  className="document-menu"
                  aria-label={tr('Opções do documento')}
                  aria-expanded={menu}
                  onClick={() => setMenu((value) => !value)}
                >
                  <FileText size={15} />
                  <span>{activeNote.path ? activeNote.title : tr('Rascunho')}</span>
                  <ChevronDown size={13} />
                </button>
                {menu && (
                  <div
                    ref={menuRef}
                    className="dropdown"
                    role="menu"
                    onKeyDown={(event) => {
                      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                      event.preventDefault()
                      const items = [
                        ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                          '[role=menuitem]',
                        ),
                      ]
                      const index = items.indexOf(document.activeElement as HTMLButtonElement)
                      const next =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? items.length - 1
                            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
                              items.length
                      items[next]?.focus()
                    }}
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        newNote()
                        setMenu(false)
                      }}
                    >
                      <Plus size={15} />
                      {tr('Nova nota')}
                      <kbd>{formatShortcut(preferences.shortcuts.new)}</kbd>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        void fileOps.openDocument()
                        setMenu(false)
                      }}
                    >
                      <FolderOpen size={15} />
                      {tr('Abrir documento')}
                      <kbd>{formatShortcut(preferences.shortcuts.open)}</kbd>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        void fileOps.saveNote(activeId)
                        setMenu(false)
                      }}
                    >
                      <Save size={15} />
                      {tr('Salvar')}
                      <kbd>{formatShortcut(preferences.shortcuts.save)}</kbd>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        void fileOps.saveNote(activeId, true)
                        setMenu(false)
                      }}
                    >
                      <Save size={15} />
                      {tr('Salvar como')}
                      <kbd>{formatShortcut(preferences.shortcuts.saveAs)}</kbd>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setFind('find')
                        setMenu(false)
                      }}
                    >
                      <Search size={15} />
                      {tr('Pesquisar')}
                      <kbd>{formatShortcut(preferences.shortcuts.find)}</kbd>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setSettings(true)
                        setMenu(false)
                      }}
                    >
                      <Settings2 size={15} />
                      {tr('Configurações')}
                      <kbd>{formatShortcut(preferences.shortcuts.settings)}</kbd>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="document-actions">
              {!tabsVisible && (
                <IconButton
                  label={tr('Nova guia ({0})', {
                    0: newTabShortcut,
                  })}
                  onClick={() => newNote()}
                >
                  <Plus size={16} />
                </IconButton>
              )}
              <ProjectAssignment
                projects={projects}
                value={activeNote.projectId}
                onChange={async (projectId) => {
                  if (activeNote.path) await backend.associate(activeNote.path, projectId)
                  setNotes((current) =>
                    updateNote(current, activeId, {
                      projectId,
                    }),
                  )
                  if (activeNote.path) await refresh()
                }}
                onDone={() => {
                  activeEditor?.commands.focus()
                }}
              />
              <IconButton
                label={tr('Salvar documento')}
                data-shortcut={preferences.shortcuts.save}
                onClick={() => void fileOps.saveNote(activeId)}
              >
                <Save size={16} />
              </IconButton>
              <IconButton
                label={tr('Ferramentas de formatação')}
                data-tooltip={toolbar ? tr('Ocultar formatação') : tr('Mostrar formatação')}
                aria-pressed={toolbar}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setToolbar((value) => !value)
                  activeEditor?.commands.focus(undefined, {
                    scrollIntoView: false,
                  })
                }}
              >
                <SlidersHorizontal size={17} />
              </IconButton>
              <IconButton
                label={tr('Modo Zen')}
                data-shortcut={formatShortcut(preferences.shortcuts.immersive)}
                onClick={() => {
                  setImmersive(true)
                  activeEditor?.commands.focus()
                }}
              >
                <Maximize2 size={16} />
              </IconButton>
            </div>
          </div>
          <div className="editor-top-space" aria-hidden="true" />
          {notes.map((note) => (
            <EditorPane
              key={note.id}
              note={note}
              active={note.id === activeId}
              preferences={preferences}
              onReady={onReady}
              onChange={onChange}
              onTyping={onTyping}
              onImages={insertImages}
              onStats={note.id === activeId ? onStats : () => {}}
              onSelection={note.id === activeId ? setSelectionRect : () => {}}
            />
          ))}
          {find && activeEditor && (
            <FindBar
              editor={activeEditor}
              replace={find === 'replace'}
              onClose={() => {
                setFind(null)
                activeEditor.commands.focus()
              }}
            />
          )}
          <div className="formatting-dock chrome">
            {formattingVisible && activeEditor && (
              <Formatting
                editor={activeEditor}
                compact={!toolbar}
                insertImage={() => void chooseImage()}
                insertLink={() => setLink(activeEditor.getAttributes('link').href || '')}
              />
            )}
          </div>
          <footer className="statusbar chrome">
            <span className="save-status">
              {activeNote.dirty ? (
                <>
                  <span className="unsaved-dot" />
                  {tr('Não salvo')}
                </>
              ) : (
                <>
                  <Check size={13} />
                  {activeNote.path ? tr('Salvo') : tr('Pronto para escrever')}
                </>
              )}
            </span>
            <span className="word-count">
              {formatCount(stats.words, 'words')}
              <span className="status-dot">·</span>
              {formatCount(stats.characters, 'characters')}
            </span>
            <div className="status-right">
              <button
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    zoom: current.zoom >= 150 ? 100 : current.zoom + 10,
                  }))
                }
                aria-label={tr('Alterar zoom')}
                data-tooltip={tr('Zoom')}
                data-shortcut="Ctrl+ / Ctrl−"
              >
                {preferences.zoom}%
              </button>
              <span>{activeNote.format.toUpperCase()}</span>
              <Focus size={13} />
            </div>
          </footer>
          {!activeNote.dirty && !activeNote.path && !formattingVisible && (
            <div className="writing-hint chrome">
              <Keyboard size={13} />
              <span>{tr('Comece a escrever. O resto desaparece.')}</span>
            </div>
          )}
        </div>
      </section>
      {preferencesLoaded && !preferences.onboardingCompleted && (
        <WelcomeTheme
          theme={preferences.theme}
          language={preferences.language}
          chooseLanguage={platform !== 'windows'}
          onLanguageChange={(language) => {
            setLanguage(language)
            setPreferences((current) => ({
              ...current,
              language,
              languageChosen: true,
            }))
          }}
          onThemeChange={(theme) => {
            setPreferences((current) => ({
              ...current,
              theme,
              themeChosen: true,
            }))
          }}
          onComplete={() => {
            setPreferences((current) => ({
              ...current,
              onboardingCompleted: true,
              themeChosen: true,
              languageChosen: true,
            }))
            requestAnimationFrame(() => editors.current.get(activeId)?.commands.focus())
          }}
        />
      )}
      {librarySearch && (
        <LibrarySearch onClose={() => setLibrarySearch(false)} onOpen={fileOps.openPath} />
      )}
      {settings && (
        <Settings
          updates={updates}
          preferences={preferences}
          onChange={(change) => {
            if (change.language) setLanguage(change.language)
            setPreferences((current) => ({
              ...current,
              ...change,
            }))
          }}
          onClose={closeSettings}
        />
      )}
      {link !== null && (
        <Modal title={tr('Inserir link')} onClose={() => setLink(null)}>
          <form
            className="modal-body"
            onSubmit={(event) => {
              event.preventDefault()
              if (link && !/^(https?:\/\/|mailto:)/i.test(link)) {
                notify(tr('Use um endereço https://, http:// ou mailto:.'))
                return
              }
              if (link)
                activeEditor
                  ?.chain()
                  .focus()
                  .extendMarkRange('link')
                  .setLink({
                    href: link,
                  })
                  .run()
              else activeEditor?.chain().focus().unsetLink().run()
              setLink(null)
            }}
          >
            <label>
              {tr('Endereço')}
              <input
                autoFocus
                type="text"
                placeholder="https://"
                value={link}
                onChange={(event) => setLink(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setLink(null)}>
                {tr('Cancelar')}
              </button>
              <button className="primary" type="submit">
                {tr('Aplicar')}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {renameId && notes.find((note) => note.id === renameId) && (
        <RenameDocument
          note={notes.find((note) => note.id === renameId)!}
          onRename={(title) => fileOps.renameNote(renameId, title)}
          onClose={() => setRenameId(null)}
        />
      )}
      {dialog.element}
      <WindowResize onError={notify} />
      <TooltipLayer hidden={immersive} />
      {notice && (
        <div className="toast chrome" role="status">
          {tr(notice)}
          <button aria-label={tr('Dispensar aviso')} onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
