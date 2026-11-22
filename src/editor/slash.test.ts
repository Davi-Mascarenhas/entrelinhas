import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { filterSlashCommands, slashRange, runSlashCommand } from './slash'
import { setLanguage } from '../i18n'
import { serializeHtml, parseDocument } from './serialization'
let editor: Editor
const make = (content = '<p></p>') => {
  editor = new Editor({ extensions: editorExtensions(false), content })
  return editor
}
afterEach(() => {
  editor?.destroy()
  setLanguage('pt-BR')
})
it.each([
  ['pt-BR', 'lista'],
  ['en', 'list'],
  ['ja', 'リスト'],
  ['zh-CN', '清单'],
  ['de', 'liste'],
] as const)('encontra tarefas em %s e salva uma checklist real', (language, query) => {
  setLanguage(language)
  make()
  editor.commands.insertContent('/' + query)
  const range = slashRange(editor.state)!
  expect(filterSlashCommands(range.query)[0].id).toBe('tasks')
  expect(runSlashCommand(editor, range, 'tasks')).toBe(true)
  expect(editor.getJSON().content?.[0].type).toBe('taskList')
  editor.commands.insertContent('Comprar pão')
  const reopened = parseDocument(serializeHtml(editor.getHTML()).content, 'md')
  expect(reopened.content?.[0].type).toBe('taskList')
  expect(JSON.stringify(reopened)).toContain('Comprar pão')
})
it.each(['tabela', 'table', 'テーブル', '表格', 'tabelle'])(
  'insere tabela com /%s sem perder os outros parágrafos',
  (query) => {
    make('<p>Antes</p><p></p>')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.commands.insertContent('/' + query)
    const range = slashRange(editor.state)!
    expect(filterSlashCommands(range.query).some((c) => c.id === 'table')).toBe(true)
    runSlashCommand(editor, range, 'table')
    expect(editor.getText()).toContain('Antes')
    expect(editor.getJSON().content?.some((n) => n.type === 'table')).toBe(true)
    expect(
      parseDocument(serializeHtml(editor.getHTML()).content, 'md').content?.some(
        (n) => n.type === 'table',
      ),
    ).toBe(true)
  },
)
it('desfazer restaura o comando, sem apagar o texto anterior', () => {
  make('<p>Um texto</p><p></p>')
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  editor.commands.insertContent('/lista')
  runSlashCommand(editor, slashRange(editor.state)!, 'tasks')
  expect(editor.commands.undo()).toBe(true)
  expect(editor.getText()).toContain('Um texto')
  expect(editor.getText()).toContain('/lista')
})
it.each(['https://example.com', '/pasta/arquivo.md', '<code>/lista</code>'])(
  'não trata links, caminhos ou código como comandos: %s',
  (text) => {
    make('<p>' + text + '</p>')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    expect(slashRange(editor.state)).toBeNull()
  },
)
it('ignora blocos de código e seleção não vazia; filtra acentos sem modificar o texto', () => {
  make('<pre><code>/lista</code></pre>')
  editor.commands.setTextSelection(4)
  expect(slashRange(editor.state)).toBeNull()
  editor.commands.setContent('<p>/citação</p>')
  editor.commands.selectAll()
  expect(slashRange(editor.state)).toBeNull()
  expect(filterSlashCommands('citacao')[0].id).toBe('quote')
})

it.each(['チェックリスト', '列表', '待办', 'checkliste'])(
  'aceita o nome local de checklist: %s',
  (query) => {
    expect(filterSlashCommands(query)[0].id).toBe('tasks')
  },
)

it('não executa uma escolha antiga se o cursor ou o texto mudou', () => {
  make('<p>/lista</p>')
  editor.commands.setTextSelection(7)
  const range = slashRange(editor.state)!
  editor.commands.setContent('<p>Meu texto deve continuar aqui.</p>')
  const before = editor.getJSON()
  expect(runSlashCommand(editor, range, 'tasks')).toBe(false)
  expect(editor.getJSON()).toEqual(before)
})
