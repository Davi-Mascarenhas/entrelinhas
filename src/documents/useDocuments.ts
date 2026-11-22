import { useCallback, useRef, type Dispatch, type SetStateAction, type RefObject } from 'react'
import type { Editor, JSONContent } from '@tiptap/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { documentDir, join } from '@tauri-apps/api/path'
import { createNote, hasFormatting, textFromDocument, updateNote } from '../core/notes'
import { tr } from '../i18n'
import { noteTitle } from '../core/notes'
import { documentTitle, suggestedFilename } from '../core/titles'
import type { Note, Preferences, RegisteredDocument } from '../core/types'
import { backend, errorCode, errorMessage } from '../native/api'
import { parseDocument, serializeHtml } from '../editor/serialization'
import type { AskDialog } from '../components/useDialog'

interface Options {
  notes: Note[]
  setNotes: Dispatch<SetStateAction<Note[]>>
  setActiveId: Dispatch<SetStateAction<string>>
  editors: RefObject<Map<string, Editor>>
  preferences: Preferences
  documents: RegisteredDocument[]
  ask: AskDialog
  notify: (message: string) => void
  refresh: () => Promise<void>
}

export function useDocuments(options: Options) {
  const current = useRef(options)
  current.current = options
  const saving = useRef(new Set<string>())
  const renaming = useRef(new Set<Promise<void>>())
  const saveWaiters = useRef<(() => void)[]>([])
  const opening = useRef(new Set<string>())

  const openPath = useCallback(async function openPath(path: string): Promise<boolean> {
    const { notes, setNotes, setActiveId, notify, refresh } = current.current
    const duplicate = notes.find((note) => note.path === path)
    if (duplicate) {
      setActiveId(duplicate.id)
      return true
    }
    if (opening.current.has(path)) return false
    opening.current.add(path)
    try {
      const read = await backend.read(path)
      const canonical = current.current.notes.find((note) => note.path === read.path)
      if (canonical) {
        setActiveId(canonical.id)
        return true
      }
      const content = parseDocument(read.content, read.format)
      let unavailable = 0
      const hydrate = async (node: JSONContent): Promise<void> => {
        if (
          node.type === 'image' &&
          node.attrs?.src &&
          !String(node.attrs.src).startsWith('data:')
        ) {
          try {
            node.attrs.src = await backend.image(read.path, node.attrs.src)
          } catch {
            unavailable++
          }
        }
        await Promise.all((node.content ?? []).map(hydrate))
      }
      await hydrate(content)
      const note: Note = {
        ...createNote(read.format),
        title: read.title,
        path: read.path,
        version: read.version,
        content,
        savedContent: JSON.stringify(content),
        projectId:
          current.current.documents.find((item) => item.path === read.path)?.projectId ?? null,
      }
      setNotes((existing) => {
        const first = existing[0]
        const replaceEmpty =
          existing.length === 1 &&
          !first.path &&
          !first.dirty &&
          !first.projectId &&
          current.current.editors.current.get(first.id)?.isEmpty === true
        return replaceEmpty ? [note] : [...existing, note]
      })
      setActiveId(note.id)
      if (unavailable)
        notify(
          `${unavailable} imagem(ns) indisponível(is). As referências foram mantidas. Imagens remotas não são baixadas automaticamente.`,
        )
      await refresh()
      return true
    } catch (error) {
      if (errorCode(error) === 'missing') {
        const choice = await current.current.ask({
          title: 'Arquivo não encontrado',
          message:
            'O arquivo pode ter sido movido ou apagado. Escolha seu novo local para atualizar a referência; nenhum arquivo será movido.',
          choices: [
            { id: 'cancel', label: 'Cancelar' },
            { id: 'locate', label: 'Localizar novamente', primary: true },
          ],
        })
        if (choice === 'locate') {
          try {
            const selected = await open({
              title: tr('Localizar documento'),
              filters: [{ name: tr('Documentos'), extensions: ['md', 'markdown', 'txt'] }],
            })
            if (typeof selected === 'string') {
              await backend.relocate(path, selected)
              await refresh()
              return await openPath(selected)
            }
          } catch (locateError) {
            notify(errorMessage(locateError))
          }
        }
      } else notify(`Não foi possível abrir o documento: ${errorMessage(error)}`)
      return false
    } finally {
      opening.current.delete(path)
    }
  }, [])

  const openDocument = useCallback(async () => {
    try {
      const selected = await open({
        title: tr('Abrir documento'),
        multiple: true,
        defaultPath: await documentDir().catch(() => undefined),
        filters: [{ name: tr('Documentos'), extensions: ['md', 'markdown', 'txt'] }],
      })
      for (const path of Array.isArray(selected) ? selected : selected ? [selected] : [])
        await openPath(path)
    } catch (error) {
      current.current.notify(errorMessage(error))
    }
  }, [openPath])

  const saveNote = useCallback(async (id: string, saveAs = false): Promise<boolean> => {
    if (saving.current.has(id)) return false
    saving.current.add(id)
    if (renaming.current.size) {
      await Promise.allSettled([...renaming.current])
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    const { notes, editors, setNotes, ask, notify, refresh } = current.current
    const note = notes.find((note) => note.id === id),
      editor = editors.current.get(id)
    if (!note || !editor) {
      saving.current.delete(id)
      if (!saving.current.size && !renaming.current.size)
        saveWaiters.current.splice(0).forEach((resolve) => resolve())
      return false
    }
    try {
      let path = note.path
      if (!path || saveAs) {
        let defaultPath = note.path ?? suggestedFilename(note)
        if (!note.path) {
          try {
            defaultPath = await join(await documentDir(), defaultPath)
          } catch {
            /* O seletor escolhe a pasta inicial se Documentos não estiver configurada. */
          }
        }
        const filters = [
          { name: 'Markdown (.md)', extensions: ['md'] },
          { name: 'Texto simples (.txt)', extensions: ['txt'] },
        ]
        path = await save({
          title: tr('Salvar como'),
          defaultPath,
          filters: note.format === 'txt' ? [...filters].reverse() : filters,
        })
        if (!path) return false
        if (!/\.[^/]+$/.test(path)) path += `.${note.format}`
      }
      if (!/\.(md|markdown|txt)$/i.test(path)) {
        notify('Use a extensão .md ou .txt para escolher o formato.')
        return false
      }
      if (current.current.notes.some((other) => other.id !== id && other.path === path)) {
        notify('Este arquivo já está aberto em outra aba. Salve com outro nome.')
        return false
      }
      const format = /\.txt$/i.test(path) ? 'txt' : 'md'
      const snapshot = editor.state.doc
      const json = editor.getJSON()
      if (format === 'md' && path !== note.path) {
        const unresolved: string[] = []
        const inspect = (node: JSONContent) => {
          const source = String(node.attrs?.src ?? '')
          if (node.type === 'image' && source && !/^(data:|https?:|\/)/i.test(source))
            unresolved.push(source)
          node.content?.forEach(inspect)
        }
        inspect(json)
        if (unresolved.length) {
          const choice = await ask({
            title: 'Há imagens indisponíveis',
            message: `${unresolved.length} imagem(ns) têm referências relativas que não puderam ser carregadas. Ao salvar em outra pasta, essas referências podem deixar de apontar para o local correto. Deseja preservá-las mesmo assim?`,
            choices: [
              { id: 'cancel', label: 'Cancelar' },
              { id: 'references', label: 'Preservar referências', primary: true },
            ],
          })
          if (choice !== 'references') return false
        }
      }
      if (format === 'txt' && hasFormatting(json)) {
        const choice = await ask({
          title: 'Salvar como texto simples?',
          message:
            'TXT preserva somente o texto. Formatação, tabelas e imagens não serão mantidas no arquivo. O documento aberto continuará com a formatação até ser fechado.',
          choices: [
            { id: 'cancel', label: 'Cancelar' },
            { id: 'text', label: 'Salvar somente o texto', primary: true },
          ],
        })
        if (choice !== 'text') return false
      }
      const serialized =
        format === 'txt'
          ? { content: textFromDocument(json), assets: [] }
          : serializeHtml(editor.getHTML())
      let result
      const request = {
        path,
        ...serialized,
        expectedVersion: path === note.path ? note.version : null,
        overwrite: false,
        projectId: note.projectId,
      }
      try {
        result = await backend.save(request)
      } catch (error) {
        if (errorCode(error) !== 'conflict') throw error
        const choice = await ask({
          title: 'O arquivo no disco é diferente',
          message: `${errorMessage(error)}\n\nDeseja substituir o arquivo por esta versão? Você também pode cancelar e usar Salvar como.`,
          choices: [
            { id: 'cancel', label: 'Cancelar' },
            { id: 'overwrite', label: 'Substituir arquivo', danger: true },
          ],
        })
        if (choice !== 'overwrite') return false
        result = await backend.save({ ...request, overwrite: true })
      }
      setNotes((existing) =>
        updateNote(existing, id, {
          path: result.path,
          title: result.title,
          titleIsDefault: false,
          version: result.version,
          format,
          dirty: !editor.state.doc.eq(snapshot),
          savedContent: JSON.stringify(json),
        }),
      )
      notify(result.warning ?? `Salvo · ${result.title}`)
      await refresh()
      return true
    } catch (error) {
      notify(`Não foi possível salvar: ${errorMessage(error)}`)
      return false
    } finally {
      saving.current.delete(id)
      if (!saving.current.size && !renaming.current.size)
        saveWaiters.current.splice(0).forEach((resolve) => resolve())
    }
  }, [])

  // Fechar a janela deve aguardar uma gravação manual que já foi solicitada.
  const waitForSaves = useCallback(async (): Promise<void> => {
    while (saving.current.size || renaming.current.size)
      await new Promise<void>((resolve) => saveWaiters.current.push(resolve))
  }, [])

  const mayDiscard = useCallback(
    async (note: Note, forUpdate = false): Promise<boolean> => {
      const { preferences, ask } = current.current
      note = current.current.notes.find((currentNote) => currentNote.id === note.id) ?? note
      if ((!preferences.askBeforeDiscard && !forUpdate) || !note.dirty) return true
      const choice = await ask({
        title: forUpdate ? 'Salvar antes de atualizar?' : 'Salvar antes de fechar?',
        message: `“${noteTitle(note)}” tem alterações não salvas. Ao descartar, o texto não poderá ser recuperado.`,
        choices: [
          { id: 'cancel', label: 'Cancelar' },
          { id: 'discard', label: forUpdate ? 'Descartar e continuar' : 'Descartar', danger: true },
          { id: 'save', label: forUpdate ? 'Salvar e continuar' : 'Salvar', primary: true },
        ],
      })
      return choice === 'discard' || (choice === 'save' && (await saveNote(note.id)))
    },
    [saveNote],
  )
  const renameNote = useCallback(
    async (id: string, value: string): Promise<void> => {
      const title = documentTitle(value)
      if (saving.current.size || renaming.current.size) {
        await waitForSaves()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      const { notes, setNotes, refresh } = current.current
      const note = notes.find((note) => note.id === id)
      if (!note) return
      if (!note.path) {
        setNotes((existing) =>
          updateNote(existing, id, { title, titleIsDefault: false, dirty: true }),
        )
        return
      }
      const operation = (async () => {
        const renamed = await backend.rename(note.path!, title)
        // Renomear não grava o editor nem altera a versão usada para detectar conflitos.
        setNotes((existing) => updateNote(existing, id, { ...renamed, titleIsDefault: false }))
        await refresh()
      })()
      renaming.current.add(operation)
      try {
        await operation
      } finally {
        renaming.current.delete(operation)
        if (!saving.current.size && !renaming.current.size)
          saveWaiters.current.splice(0).forEach((resolve) => resolve())
      }
    },
    [waitForSaves],
  )
  return { openPath, openDocument, saveNote, mayDiscard, waitForSaves, renameNote }
}
