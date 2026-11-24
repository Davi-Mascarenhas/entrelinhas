import {
  createNote,
  updateNote,
  moveItem,
  countText,
  hasFormatting,
  textFromDocument,
} from './notes'
import { defaultPreferences, readPreferences } from './preferences'
import { shortcutAction } from './shortcuts'

describe('notas e abas em memória', () => {
  it('cada inicialização cria uma nota vazia e independente', () => {
    const previous = createNote()
    previous.content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rascunho descartado' }] }],
    }
    const next = createNote('txt', 'escola')
    expect(next).toMatchObject({ path: null, format: 'txt', dirty: false, projectId: 'escola' })
    expect(textFromDocument(next.content)).toBe('')
    expect(next.id).not.toBe(previous.id)
    expect(localStorage.length).toBe(0)
  })
  it('atualiza somente a aba escolhida e permite reordenar sem perder conteúdo', () => {
    const notes = [createNote(), createNote()]
    const changed = updateNote(notes, notes[1].id, { dirty: true })
    expect(changed[0].dirty).toBe(false)
    expect(moveItem(changed, 1, 0)[0].id).toBe(notes[1].id)
  })
  it('conta caracteres Unicode e palavras japonesas', () => {
    expect(countText('Olá 🌿').characters).toBe(5)
    expect(countText('日本語の文章').words).toBeGreaterThan(0)
  })
  it('detecta conteúdo que perde formatação em TXT', () => {
    expect(hasFormatting(createNote().content)).toBe(false)
    expect(hasFormatting({ type: 'text', text: 'Oi', marks: [{ type: 'bold' }] })).toBe(true)
    expect(hasFormatting({ type: 'image', attrs: { src: 'data:image/png;base64,x' } })).toBe(true)
  })
})

describe('preferências e atalhos', () => {
  it('valida temas, formatos e limites', () => {
    expect(
      readPreferences({ theme: 'sepia', fontSize: 500, cursor: 'hidden', defaultFormat: 'txt' }),
    ).toMatchObject({ theme: 'sepia', fontSize: 40, cursor: 'hidden', defaultFormat: 'txt' })
    expect(readPreferences({ theme: 'verde', fontSize: 'x' })).toEqual(defaultPreferences)
  })
  it('distingue salvar e salvar como, e respeita composição IME', () => {
    expect(
      shortcutAction(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }), defaultPreferences),
    ).toBe('save')
    expect(
      shortcutAction(
        new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true }),
        defaultPreferences,
      ),
    ).toBe('saveAs')
    expect(
      shortcutAction(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, isComposing: true }),
        defaultPreferences,
      ),
    ).toBeNull()
  })
  it('aceita um atalho personalizado', () => {
    const p = readPreferences({ shortcuts: { immersive: 'Ctrl+Shift+J' } })
    expect(
      shortcutAction(new KeyboardEvent('keydown', { key: 'J', ctrlKey: true, shiftKey: true }), p),
    ).toBe('immersive')
  })
  it('abre uma guia com Ctrl+T e preserva atalhos personalizados anteriores', () => {
    const event = new KeyboardEvent('keydown', { key: 't', ctrlKey: true })
    expect(shortcutAction(event, defaultPreferences)).toBe('new')
    expect(shortcutAction(event, readPreferences({ shortcuts: { find: 'Ctrl+T' } }))).toBe('find')
    expect(
      shortcutAction(
        new KeyboardEvent('keydown', { key: 't', ctrlKey: true, isComposing: true }),
        defaultPreferences,
      ),
    ).toBeNull()
  })
})

describe('primeira escolha de tema', () => {
  it('não conclui a apresentação sem uma escolha explícita', () => {
    expect(readPreferences({}).themeChosen).toBe(false)
    expect(readPreferences({}).onboardingCompleted).toBe(false)
  })
  it.each(['light', 'dark', 'sepia'])('preserva o tema %s de instalações anteriores', (theme) => {
    expect(readPreferences({ theme })).toMatchObject({
      theme,
      themeChosen: true,
      onboardingCompleted: true,
    })
  })
  it('respeita uma apresentação ainda não concluída', () => {
    expect(readPreferences({ theme: 'dark', themeChosen: false }).themeChosen).toBe(false)
    expect(
      readPreferences({ theme: 'dark', themeChosen: true, onboardingCompleted: false }),
    ).toMatchObject({ theme: 'dark', themeChosen: true, onboardingCompleted: false })
    expect(readPreferences({ theme: 'light', themeChosen: false }).onboardingCompleted).toBe(false)
  })
  it('lembra a conclusão sem depender de associações de arquivos', () => {
    expect(
      readPreferences({ theme: 'sepia', themeChosen: true, onboardingCompleted: true })
        .onboardingCompleted,
    ).toBe(true)
  })
})

it('preserva as preferências antigas e valida posição/visibilidade da formatação no Zen', () => {
  expect(readPreferences({ theme: 'sepia' })).toMatchObject({
    formattingPosition: 'bottom',
    zenHideFormatting: false,
  })
  expect(readPreferences({ formattingPosition: 'side', zenHideFormatting: true })).toMatchObject({
    formattingPosition: 'side',
    zenHideFormatting: true,
  })
  expect(
    readPreferences({ formattingPosition: 'diagonal', zenHideFormatting: 'yes' }),
  ).toMatchObject({ formattingPosition: 'bottom', zenHideFormatting: false })
})

it('migra as margens Zen com valores iguais e valida ajustes independentes', () => {
  const previous = { theme: 'sepia', editorWidth: 600, sidebarSide: 'right' }
  const migrated = readPreferences(previous)
  expect(migrated).toMatchObject({ ...previous, zenTopMargin: 56, zenSideMargin: 56 })
  expect(readPreferences({ ...previous, zenTopMargin: 100, zenSideMargin: 80 })).toMatchObject({
    zenTopMargin: 100,
    zenSideMargin: 80,
  })
  expect(readPreferences({ zenTopMargin: -1, zenSideMargin: 500 })).toMatchObject({
    zenTopMargin: 16,
    zenSideMargin: 200,
  })
  expect(readPreferences({ zenTopMargin: NaN, zenSideMargin: '80' })).toMatchObject({
    zenTopMargin: 56,
    zenSideMargin: 56,
  })
})
