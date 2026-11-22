import { act, renderHook } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { useZenEscape } from './useZenEscape'

let editor: Editor
afterEach(() => {
  editor?.destroy()
  document.body.innerHTML = ''
})

function press(options: KeyboardEventInit = {}) {
  return editor.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...options }),
  )
}

it('recebe Esc dentro do editor antes do keymap e mantém a seleção e o conteúdo', () => {
  const element = document.body.appendChild(document.createElement('div'))
  editor = new Editor({ element, extensions: editorExtensions(false), content: '<p>Texto</p>' })
  editor.commands.setTextSelection(3)
  const callback = vi.fn()
  const { rerender } = renderHook(({ enabled }) => useZenEscape(enabled, callback), {
    initialProps: { enabled: true },
  })
  for (let n = 0; n < 6; n++)
    act(() => {
      press()
    })
  expect(callback).toHaveBeenCalledTimes(6)
  expect(editor.state.selection.from).toBe(3)
  expect(editor.state.selection.empty).toBe(true)
  expect(editor.getText()).toBe('Texto')
  act(() => {
    press({ repeat: true })
    press({ isComposing: true })
  })
  expect(callback).toHaveBeenCalledTimes(6)
  rerender({ enabled: false })
  act(() => {
    press()
  })
  expect(callback).toHaveBeenCalledTimes(6)
})

it.each(['role="dialog"', 'data-live-overlay', 'data-inline-rename'])(
  'deixa %s consumir Esc sem alternar o modo Zen',
  (attribute) => {
    editor = new Editor({ extensions: editorExtensions(false) })
    const callback = vi.fn(),
      panel = document.createElement('div')
    panel.innerHTML = `<div ${attribute}><input /></div>`
    document.body.appendChild(panel)
    const input = panel.querySelector('input')!
    const local = vi.fn()
    input.addEventListener('keydown', local)
    renderHook(() => useZenEscape(true, callback))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(local).toHaveBeenCalledOnce()
    expect(callback).not.toHaveBeenCalled()
  },
)
