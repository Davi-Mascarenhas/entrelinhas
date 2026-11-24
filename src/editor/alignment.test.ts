import type { JSONContent } from '@tiptap/core'
import { Editor } from '@tiptap/core'
import { afterEach, expect, it } from 'vitest'
import { editorExtensions } from './extensions'
import { parseDocument, serializeHtml } from './serialization'

let editor: Editor
afterEach(() => editor?.destroy())

const lists = [
  ['numerada', '<ol start="4"><li><p>Primeiro</p></li><li><p>Segundo</p></li></ol>'],
  ['marcadores', '<ul><li><p>Primeiro</p></li><li><p>Segundo</p></li></ul>'],
  [
    'tarefas',
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Primeiro</p></li><li data-type="taskItem" data-checked="false"><p>Segundo</p></li></ul>',
  ],
] as const

it.each(lists)(
  'alinha os itens da lista %s, salva, reabre e permite desfazer',
  (_name, content) => {
    editor = new Editor({ extensions: editorExtensions(false), content })
    const original = editor.getJSON()
    for (const alignment of ['center', 'right', 'left']) {
      editor.chain().selectAll().setTextAlign(alignment).run()
      const json = editor.getJSON() as JSONContent
      for (const item of json.content![0].content!) {
        expect(item.attrs?.textAlign).toBe(alignment)
        expect(item.content![0].attrs?.textAlign).toBe(alignment)
      }
      const saved = serializeHtml(editor.getHTML()).content
      expect(parseDocument(saved, 'md').content![0]).toEqual(json.content![0])
      expect(editor.getText()).toContain('Primeiro')
    }
    editor.commands.undo()
    expect((editor.getJSON() as JSONContent).content![0].content![0].attrs?.textAlign).toBe('right')
    editor.commands.undo()
    editor.commands.undo()
    expect(editor.getJSON().content![0]).toEqual(original.content![0])
  },
)

it('alinha só o item selecionado, preserva tarefas e reconhece documentos anteriores', () => {
  editor = new Editor({ extensions: editorExtensions(false), content: lists[2][1] })
  editor.chain().setTextSelection(4).setTextAlign('right').run()
  const items = (editor.getJSON() as JSONContent).content![0].content!
  expect(items[0].attrs).toMatchObject({ textAlign: 'right', checked: true })
  expect(items[1].attrs).toMatchObject({ textAlign: null, checked: false })
  const previous = parseDocument('<ol><li><p style="text-align: center">Antigo</p></li></ol>', 'md')
  expect(previous.content![0].content![0].attrs?.textAlign).toBe('center')
})

it('mantém a hierarquia de listas aninhadas ao salvar o alinhamento', () => {
  editor = new Editor({
    extensions: editorExtensions(false),
    content: '<ol><li><p>Pai</p><ul><li><p>Filho</p></li></ul></li></ol>',
  })
  editor.chain().selectAll().setTextAlign('center').run()
  expect(parseDocument(serializeHtml(editor.getHTML()).content, 'md').content![0]).toEqual(
    editor.getJSON().content![0],
  )
})
