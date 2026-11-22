import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { normalizeLink, captureLinkSelection, applyLinkSelection } from './links'
import { parseDocument, serializeHtml } from './serialization'

it.each([
  ['example.com/path?q=1#parte', 'https://example.com/path?q=1#parte'],
  ['  example.com  ', 'https://example.com/'],
  ['http://localhost:3000/test', 'http://localhost:3000/test'],
  ['localhost:3000/test', 'https://localhost:3000/test'],
  ['//example.com', 'https://example.com/'],
  ['davi@example.com', 'mailto:davi@example.com'],
  ['mailto:davi@example.com?subject=Entrelinhas', 'mailto:davi@example.com?subject=Entrelinhas'],
  ['https://例え.jp/日本語', 'https://xn--r8jz45g.jp/%E6%97%A5%E6%9C%AC%E8%AA%9E'],
])('aceita %s e normaliza sem exigir prefixo', (input, expected) => {
  expect(normalizeLink(input)).toBe(expected)
})
it.each([
  '',
  'javascript:alert(1)',
  'data:text/html,test',
  'file:///tmp/a',
  'ftp://example.com',
  'https://',
  'https://user:pass@example.com',
  '/local/file',
  '../file',
  'https://examp\nle.com',
  'https://example.com\\evil',
  'mailto:invalid',
])('recusa endereço inválido: %s', (value) => {
  expect(normalizeLink(value)).toBeNull()
})

let editor: Editor
afterEach(() => editor?.destroy())
it('aplica ao texto capturado mesmo após mudar o foco/seleção; salva e permite desfazer', () => {
  editor = new Editor({
    extensions: editorExtensions(false),
    content: '<p>Antes palavra depois</p>',
  })
  editor.commands.setTextSelection({ from: 7, to: 14 })
  const target = captureLinkSelection(editor)
  editor.commands.setTextSelection(1)
  expect(applyLinkSelection(target, 'example.com')).toBe(true)
  expect(editor.getHTML()).toMatch(/<a [^>]*href="https:\/\/example.com\/"[^>]*>palavra<\/a>/)
  const reopened = parseDocument(serializeHtml(editor.getHTML()).content, 'md')
  expect(JSON.stringify(reopened)).toContain('https://example.com/')
  expect(editor.commands.undo()).toBe(true)
  expect(editor.getHTML()).not.toContain('<a ')
  expect(editor.getText()).toBe('Antes palavra depois')
})
it('edita/remove o link completo pelo cursor, sem afetar outras palavras', () => {
  editor = new Editor({
    extensions: editorExtensions(false),
    content: '<p><a href="https://example.com">Site</a> depois</p>',
  })
  editor.commands.setTextSelection(3)
  expect(applyLinkSelection(captureLinkSelection(editor), 'other.example')).toBe(true)
  expect(editor.getHTML()).toContain('href="https://other.example/"')
  editor.commands.setTextSelection(3)
  expect(applyLinkSelection(captureLinkSelection(editor), '')).toBe(true)
  expect(editor.getHTML()).not.toContain('<a ')
  expect(editor.getText()).toBe('Site depois')
})
it('não aplica um formulário antigo a um documento alterado', () => {
  editor = new Editor({ extensions: editorExtensions(false), content: '<p>Texto</p>' })
  const target = captureLinkSelection(editor)
  editor.commands.setContent('<p>Outro documento</p>')
  expect(applyLinkSelection(target, 'example.com')).toBe(false)
  expect(editor.getHTML()).toBe('<p>Outro documento</p>')
})
