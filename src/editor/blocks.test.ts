import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { documentHtml, parseDocument, serializeHtml } from './serialization'
import { filterSlashCommands, runSlashCommand, slashRange, type SlashCommand } from './slash'
import { languages, setLanguage, tr } from '../i18n'

let editor: Editor
function make(content = '<p></p>') {
  editor = new Editor({ extensions: editorExtensions(false), content })
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  return editor
}
function atEnd() {
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
}
function command(id: SlashCommand['id'], query: string) {
  if (editor.state.selection.$from.parentOffset) editor.commands.insertContent(' ')
  editor.commands.insertContent('/' + query)
  return runSlashCommand(editor, slashRange(editor.state)!, id)
}
function key(value: string) {
  return editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
  )
}
afterEach(() => {
  editor?.destroy()
  setLanguage('pt-BR')
})

it.each(languages)('encontra os nove comandos novos traduzidos em $id', ({ id }) => {
  setLanguage(id)
  const ids = [
    'toggle',
    'callout',
    'warning',
    'image',
    'link',
    'date',
    'time',
    'duplicate',
    'clear',
  ] as const
  for (const name of ids) {
    const item = filterSlashCommands('').find((item) => item.id === name)!
    expect(filterSlashCommands(tr(item.label)).some((match) => match.id === name)).toBe(true)
    expect(tr(item.description)).not.toBe('')
  }
})

it.each(['callout', 'warning', 'toggle'] as const)(
  'cria %s preservando texto, Markdown e desfazer',
  (id) => {
    make('<p>Antes</p><p>Ideia </p>')
    atEnd()
    expect(command(id, id)).toBe(true)
    expect(editor.getText()).toContain('Antes')
    expect(editor.getText()).toContain('Ideia ')
    expect(editor.commands.undo()).toBe(true)
    expect(editor.getText()).toContain('/' + id)
    expect(editor.commands.redo()).toBe(true)
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text?.startsWith('Ideia'))
        editor.commands.setTextSelection(position + node.nodeSize)
    })
    editor.commands.insertContent('detalhe')
    const node = editor.getJSON().content![1]
    expect(node.type).toBe(id === 'toggle' ? 'details' : 'callout')
    if (id !== 'toggle') expect(node.attrs?.kind).toBe(id === 'warning' ? 'warning' : 'info')
    const saved = serializeHtml(editor.getHTML()).content
    expect(parseDocument(saved, 'md').content?.slice(0, 2)).toEqual(
      editor.getJSON().content?.slice(0, 2),
    )
  },
)

it('preserva conteúdo, estado fechado, marcas e listas dentro de blocos ao salvar', () => {
  const html =
    '<details><summary><strong>Projeto</strong></summary><div data-type="detailsContent"><p>Segredo 日本語</p><ul><li><p>Item</p></li></ul><aside data-type="callout" data-kind="warning"><p>Importante</p></aside></div></details>'
  const json = parseDocument(html, 'md')
  expect(json.content![0].attrs?.open).toBe(false)
  const roundtrip = parseDocument(serializeHtml(documentHtml(json)).content, 'md')
  expect(roundtrip).toEqual(json)
  expect(JSON.stringify(roundtrip)).toContain('Segredo 日本語')
})

it('Enter leva do título recolhível ao conteúdo e sai após uma linha vazia', () => {
  make()
  command('toggle', 'recolhivel')
  editor.commands.insertContent('Título')
  expect(key('Enter')).toBe(false)
  expect(editor.state.selection.$from.node(-1).type.name).toBe('detailsContent')
  editor.commands.insertContent('Conteúdo')
  key('Enter')
  key('Enter')
  expect(editor.getJSON().content).toHaveLength(2)
  expect(editor.getJSON().content![1].type).toBe('paragraph')
})

it.each(['toggle', 'callout'] as const)(
  'Backspace remove a moldura de %s sem apagar conteúdo',
  (id) => {
    make()
    command(id, id)
    editor.commands.insertContent('Preservar')
    editor.commands.setTextSelection(2)
    expect(key('Backspace')).toBe(false)
    expect(editor.getJSON().content![0].type).toBe('paragraph')
    expect(editor.getText()).toContain('Preservar')
  },
)

it('um comando incompatível com o título recolhível mantém o texto original', () => {
  make()
  command('toggle', 'toggle')
  editor.commands.insertContent('/toggle')
  const before = editor.getJSON()
  expect(runSlashCommand(editor, slashRange(editor.state)!, 'toggle')).toBe(false)
  expect(editor.getJSON()).toEqual(before)
})

it('Ctrl+Enter recolhe sem perder texto; selecionar conteúdo escondido o revela', () => {
  make(
    '<details open><summary>Título</summary><div data-type="detailsContent"><p>Conteúdo</p></div></details>',
  )
  let body = 0
  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text === 'Conteúdo') body = position
  })
  editor.commands.setTextSelection(body)
  editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }),
  )
  expect(editor.getJSON().content![0].attrs?.open).toBe(false)
  expect(editor.state.selection.$from.parent.type.name).toBe('detailsSummary')
  editor.commands.setTextSelection(body)
  expect(editor.getJSON().content![0].attrs?.open).toBe(true)
  expect(editor.getText()).toContain('Conteúdo')
})

it('duplicar preserva as marcas, evita copiar /duplicar e é desfeito junto', () => {
  make('<p>Antes</p><p><strong>Ideia </strong></p>')
  atEnd()
  command('duplicate', 'duplicar')
  const content = editor.getJSON().content!
  expect(content).toHaveLength(3)
  expect(content[1]).toEqual(content[2])
  expect(editor.getText()).not.toContain('/duplicar')
  editor.commands.undo()
  expect(editor.getText()).toContain('/duplicar')
})

it('duplica a tarefa inteira com estado e conteúdo, em vez de um parágrafo solto', () => {
  make(
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Tarefa </p></li></ul>',
  )
  editor.commands.setTextSelection(10)
  command('duplicate', 'duplicar')
  const items = editor.getJSON().content![0].content!
  expect(items).toHaveLength(2)
  expect(items[0]).toEqual(items[1])
  expect(items[1]).toMatchObject({ attrs: { checked: true } })
})

it('limpa apenas o parágrafo atual, mantendo o conteúdo e as marcas dos outros', () => {
  make('<p><strong>Antes</strong></p><h2 style="text-align:center"><em>Ideia </em></h2>')
  editor.state.doc.descendants((node, position) => {
    if (node.isText && node.text?.startsWith('Ideia'))
      editor.commands.setTextSelection(position + node.nodeSize)
  })
  expect(command('clear', 'limpar')).toBe(true)
  expect(editor.getJSON().content![0].content![0].marks![0].type).toBe('bold')
  expect(editor.getJSON().content![1].type).toBe('paragraph')
  expect(editor.getJSON().content![1].content![0].marks).toBeUndefined()
  expect(editor.getText()).toContain('Ideia ')
})

it('cancelar imagem ou link não apaga o comando; inserir link mantém o texto e desfazer', () => {
  make('<p>Antes /link</p>')
  atEnd()
  const range = slashRange(editor.state)!,
    original = editor.getJSON()
  expect(runSlashCommand(editor, range, 'link')).toBe(false)
  expect(runSlashCommand(editor, range, 'image', { images: [] })).toBe(false)
  expect(runSlashCommand(editor, range, 'link', { href: 'javascript:alert(1)' })).toBe(false)
  expect(editor.getJSON()).toEqual(original)
  expect(runSlashCommand(editor, range, 'link', { href: 'https://example.com' })).toBe(true)
  expect(editor.getText()).toBe('Antes https://example.com')
  expect(editor.getHTML()).toContain('href="https://example.com"')
  editor.commands.undo()
  expect(editor.getJSON()).toEqual(original)
})

it('insere várias imagens em uma transação e só gera recursos ao serializar', () => {
  make('<p>/imagem</p>')
  atEnd()
  const range = slashRange(editor.state)!,
    src = 'data:image/png;base64,eA=='
  expect(
    runSlashCommand(editor, range, 'image', {
      images: [
        { src, alt: 'A' },
        { src, alt: 'B' },
      ],
    }),
  ).toBe(true)
  expect(editor.getJSON().content!.filter((n) => n.type === 'image')).toHaveLength(2)
  expect(serializeHtml(editor.getHTML()).assets).toHaveLength(2)
  editor.commands.undo()
  expect(editor.getText()).toBe('/imagem')
})

it.each(languages)('data e hora usam o idioma $id e ficam como texto comum', ({ id }) => {
  setLanguage(id)
  make()
  const now = new Date('2026-11-22T15:42:00Z')
  editor.commands.insertContent('/date')
  runSlashCommand(editor, slashRange(editor.state)!, 'date', { now })
  expect(editor.getText()).toBe(new Intl.DateTimeFormat(id, { dateStyle: 'long' }).format(now))
  editor.commands.setContent('<p>/time</p>')
  atEnd()
  runSlashCommand(editor, slashRange(editor.state)!, 'time', { now })
  expect(editor.getText()).toBe(new Intl.DateTimeFormat(id, { timeStyle: 'short' }).format(now))
})
