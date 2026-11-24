import { Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { editorExtensions } from './extensions'

it('sincroniza a imagem visível com os atributos, inclusive ao desfazer/refazer', () => {
  const editor = new Editor({
    extensions: editorExtensions(false),
    content: '<img src="data:image/png;base64,eA==" width="320" height="200">',
  })
  try {
    const image = () => editor.view.dom.querySelector('img')!
    expect(image().style.width).toBe('320px')
    editor.view.dispatch(closeHistory(editor.state.tr))
    editor.chain().setNodeSelection(0).updateAttributes('image', { width: 384, height: 240 }).run()
    expect(image().style.width).toBe('384px')
    expect(image().style.height).toBe('240px')
    editor.commands.undo()
    expect(image().style.width).toBe('320px')
    expect(image().style.height).toBe('200px')
    editor.commands.redo()
    expect(image().style.width).toBe('384px')
    expect(editor.getHTML()).toContain('width="384"')
    expect(editor.getHTML()).not.toContain('resize-handle')
  } finally {
    editor.destroy()
  }
})
