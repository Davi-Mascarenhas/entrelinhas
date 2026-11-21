import { renderHook, act } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { useDocuments } from './useDocuments'
import { backend } from '../native/api'
import { save } from '@tauri-apps/plugin-dialog'
import { documentDir } from '@tauri-apps/api/path'
import { createNote } from '../core/notes'
import { defaultPreferences } from '../core/preferences'
import { editorExtensions } from '../editor/extensions'

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }))
vi.mock('@tauri-apps/api/path', () => ({
  documentDir: vi.fn().mockResolvedValue('/tmp/Documentos'),
  join: vi.fn().mockImplementation(async (...parts: string[]) => parts.join('/')),
}))
vi.mock('../native/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../native/api')>()),
  backend: { save: vi.fn(), read: vi.fn(), rename: vi.fn() },
}))

function setup(format: 'md' | 'txt' = 'md') {
  const note = createNote(format)
  const editor = new Editor({ extensions: editorExtensions(false), content: '<p>Olá, mundo.</p>' })
  const options = {
    notes: [note],
    setNotes: vi.fn(),
    setActiveId: vi.fn(),
    editors: { current: new Map([[note.id, editor]]) },
    preferences: structuredClone(defaultPreferences),
    documents: [],
    ask: vi.fn().mockResolvedValue('text'),
    notify: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(save).mockResolvedValue('/tmp/Manual.' + format)
  vi.mocked(backend.save).mockImplementation(async (request) => ({
    path: request.path,
    title: 'Manual.' + format,
    content: request.content,
    version: 'versão',
    warning: null,
  }))
  const hook = renderHook(() => useDocuments(options))
  return { note, editor, options, hook }
}

beforeEach(() => vi.clearAllMocks())

it('uma atualização sempre pergunta sobre alterações, mesmo com a confirmação comum desativada', async () => {
  const { note, editor, options, hook } = setup()
  note.dirty = true
  options.preferences.askBeforeDiscard = false
  options.ask.mockResolvedValue('cancel')
  await act(async () => {
    expect(await hook.result.current.mayDiscard(note)).toBe(true)
    expect(await hook.result.current.mayDiscard(note, true)).toBe(false)
  })
  expect(options.ask).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Salvar antes de atualizar?' }),
  )
  options.ask.mockResolvedValue('discard')
  await act(async () => {
    expect(await hook.result.current.mayDiscard(note, true)).toBe(true)
  })
  options.ask.mockResolvedValue('save')
  vi.mocked(backend.save).mockRejectedValueOnce({ message: 'Sem permissão para salvar.' })
  await act(async () => {
    expect(await hook.result.current.mayDiscard(note, true)).toBe(false)
  })
  hook.unmount()
  editor.destroy()
})

it('permite salvar quando a pasta Documentos não está configurada', async () => {
  const { note, editor, hook } = setup()
  vi.mocked(documentDir).mockRejectedValueOnce(new Error('Sem pasta Documentos'))
  await act(async () => {
    expect(await hook.result.current.saveNote(note.id)).toBe(true)
  })
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: 'Sem título.md' }))
  hook.unmount()
  editor.destroy()
})

it('renomear um rascunho só muda a memória e o nome sugerido ao salvar', async () => {
  const { note, editor, options, hook } = setup()
  await act(async () => {
    await hook.result.current.renameNote(note.id, 'Ideias novas')
  })
  const renamed = options.setNotes.mock.calls[0][0]([note])[0]
  expect(renamed).toMatchObject({ title: 'Ideias novas', dirty: true, path: null })
  expect(backend.rename).not.toHaveBeenCalled()
  expect(backend.save).not.toHaveBeenCalled()
  options.notes = [renamed]
  hook.rerender()
  await act(async () => {
    await hook.result.current.saveNote(note.id)
  })
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ defaultPath: '/tmp/Documentos/Ideias novas.md' }),
  )
  hook.unmount()
  editor.destroy()
})

it('renomeia o arquivo sem salvar o editor nem mudar a versão ou o estado de alterações', async () => {
  const { note, editor, options, hook } = setup()
  note.path = '/tmp/Original.md'
  note.dirty = true
  note.version = 'conteúdo-original'
  vi.mocked(backend.rename).mockResolvedValue({ path: '/tmp/Novo.md', title: 'Novo.md' })
  await act(async () => {
    await hook.result.current.renameNote(note.id, 'Novo')
  })
  expect(options.setNotes.mock.calls[0][0]([note])[0]).toMatchObject({
    path: '/tmp/Novo.md',
    title: 'Novo.md',
    dirty: true,
    version: 'conteúdo-original',
  })
  expect(backend.save).not.toHaveBeenCalled()
  expect(options.refresh).toHaveBeenCalledOnce()
  hook.unmount()
  editor.destroy()
})

it.each([false, true])('abrir o primeiro arquivo preserva texto existente: %s', async (hasText) => {
  const { note, editor, options, hook } = setup()
  if (!hasText) editor.commands.clearContent()
  vi.mocked(backend.read).mockResolvedValue({
    path: '/tmp/aberto.md',
    title: 'aberto.md',
    content: 'Arquivo aberto',
    format: 'md',
    version: 'v1',
  })
  await act(async () => {
    expect(await hook.result.current.openPath('/tmp/aberto.md')).toBe(true)
  })
  const updater = options.setNotes.mock.calls[0][0]
  const result = updater([note])
  expect(result).toHaveLength(hasText ? 2 : 1)
  expect(result.at(-1).path).toBe('/tmp/aberto.md')
  if (hasText) expect(result[0].id).toBe(note.id)
  hook.unmount()
  editor.destroy()
})

it('não substitui a nota se o usuário escrever enquanto o arquivo carrega', async () => {
  const { note, editor, options, hook } = setup()
  editor.commands.clearContent()
  let finish!: (value: Awaited<ReturnType<typeof backend.read>>) => void
  vi.mocked(backend.read).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  let opening!: Promise<boolean>
  act(() => {
    opening = hook.result.current.openPath('/tmp/aberto.md')
  })
  editor.commands.insertContent('Continuei escrevendo')
  await act(async () => {
    finish({
      path: '/tmp/aberto.md',
      title: 'aberto.md',
      content: 'Arquivo aberto',
      format: 'md',
      version: 'v1',
    })
    await opening
  })
  expect(options.setNotes.mock.calls[0][0]([note])).toHaveLength(2)
  hook.unmount()
  editor.destroy()
})

it('digitar e desmontar não grava o rascunho nem chama o backend', () => {
  const { editor, hook } = setup()
  editor.commands.insertContent('Rascunho secreto')
  hook.unmount()
  editor.destroy()
  expect(backend.save).not.toHaveBeenCalled()
  expect(save).not.toHaveBeenCalled()
  expect(createNote().content.content?.[0].content).toBeUndefined()
})

it('salva somente depois da ação explícita, com o Markdown real', async () => {
  const { note, editor, options, hook } = setup()
  let success = false
  await act(async () => {
    success = await hook.result.current.saveNote(note.id)
  })
  expect(success).toBe(true)
  expect(backend.save).toHaveBeenCalledWith(
    expect.objectContaining({
      path: '/tmp/Manual.md',
      content: 'Olá, mundo.\n',
      expectedVersion: null,
      overwrite: false,
    }),
  )
  expect(options.setNotes).toHaveBeenCalled()
  hook.unmount()
  editor.destroy()
})

it('pede uma decisão antes de perder formatação em TXT', async () => {
  const { note, editor, options, hook } = setup('txt')
  editor.commands.selectAll()
  editor.commands.toggleBold()
  options.ask.mockResolvedValue('cancel')
  await act(async () => {
    expect(await hook.result.current.saveNote(note.id)).toBe(false)
  })
  expect(options.ask).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Salvar como texto simples?' }),
  )
  expect(backend.save).not.toHaveBeenCalled()
  options.ask.mockResolvedValue('text')
  await act(async () => {
    expect(await hook.result.current.saveNote(note.id)).toBe(true)
  })
  expect(backend.save).toHaveBeenCalledWith(
    expect.objectContaining({ content: 'Olá, mundo.', assets: [] }),
  )
  hook.unmount()
  editor.destroy()
})

it('não sobrescreve um conflito quando o usuário cancela', async () => {
  const { note, editor, options, hook } = setup()
  vi.mocked(backend.save).mockRejectedValue({ code: 'conflict', message: 'Alteração externa' })
  options.ask.mockResolvedValue('cancel')
  await act(async () => {
    expect(await hook.result.current.saveNote(note.id)).toBe(false)
  })
  expect(backend.save).toHaveBeenCalledTimes(1)
  hook.unmount()
  editor.destroy()
})

it('aguarda uma gravação manual em andamento antes de permitir o fechamento', async () => {
  const { note, editor, hook } = setup()
  let finish!: (value: Awaited<ReturnType<typeof backend.save>>) => void
  vi.mocked(backend.save).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  let writing!: Promise<boolean>
  act(() => {
    writing = hook.result.current.saveNote(note.id)
  })
  await vi.waitFor(() => expect(backend.save).toHaveBeenCalled())
  let finished = false
  const waiting = hook.result.current.waitForSaves().then(() => {
    finished = true
  })
  await Promise.resolve()
  expect(finished).toBe(false)
  await act(async () => {
    finish({
      path: '/tmp/Manual.md',
      title: 'Manual.md',
      content: 'Olá, mundo.',
      version: 'v1',
      warning: null,
    })
    await writing
    await waiting
  })
  expect(finished).toBe(true)
  hook.unmount()
  editor.destroy()
})
