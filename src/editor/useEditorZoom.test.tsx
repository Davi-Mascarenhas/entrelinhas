import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
import { useEditorZoom } from './useEditorZoom'

let editor: Editor
afterEach(() => {
  editor?.destroy()
  document.body.innerHTML = ''
})
function setup() {
  const node = document.body.appendChild(document.createElement('div'))
  editor = new Editor({ extensions: editorExtensions(false), content: '<p>Texto</p>' })
  vi.spyOn(editor.view, 'posAtCoords').mockReturnValue(null)
  const ref = { current: node }
  const hook = renderHook(
    ({ active }) => {
      const [zoom, setZoom] = useState(100)
      useEditorZoom(ref, editor, active, zoom, setZoom)
      return { zoom, setZoom }
    },
    { initialProps: { active: true } },
  )
  const wheel = (deltaY: number, ctrlKey = true, deltaMode = 0) => {
    const event = new WheelEvent('wheel', {
      deltaY,
      ctrlKey,
      deltaMode,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      node.dispatchEvent(event)
    })
    return event.defaultPrevented
  }
  return { ...hook, node, wheel }
}
it('amplia só com Ctrl, respeita 50–200 e preserva o documento', () => {
  const h = setup()
  expect(h.wheel(-120, false)).toBe(false)
  expect(h.result.current.zoom).toBe(100)
  expect(h.wheel(-120)).toBe(true)
  expect(h.result.current.zoom).toBe(110)
  for (let n = 0; n < 30; n++) h.wheel(-120)
  expect(h.result.current.zoom).toBe(200)
  for (let n = 0; n < 30; n++) h.wheel(3, true, 1)
  expect(h.result.current.zoom).toBe(50)
  expect(editor.getText()).toBe('Texto')
  h.rerender({ active: false })
  expect(h.wheel(-120)).toBe(false)
})
it('acumula pequenos movimentos do trackpad e acompanha mudanças externas de zoom', () => {
  const h = setup()
  for (let n = 0; n < 10; n++) h.wheel(-0.5)
  expect(h.result.current.zoom).toBeGreaterThan(100)
  act(() => h.result.current.setZoom(150))
  h.wheel(-120)
  expect(h.result.current.zoom).toBe(160)
})
it('aceita pinch do WebKit sem somar o wheel do mesmo gesto e encerra o gesto', () => {
  const h = setup()
  const gesture = (type: string, scale = 1) => {
    const event = new Event(type, { cancelable: true })
    Object.assign(event, { scale, clientX: 10, clientY: 10 })
    act(() => {
      h.node.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  }
  gesture('gesturestart')
  gesture('gesturechange', 1.6)
  expect(h.result.current.zoom).toBe(160)
  h.wheel(-120)
  expect(h.result.current.zoom).toBe(160)
  gesture('gesturechange', 8)
  expect(h.result.current.zoom).toBe(200)
  gesture('gestureend')
  h.wheel(120)
  expect(h.result.current.zoom).toBe(190)
})

it('acompanha Ctrl mesmo quando o WebKit omite o modificador no wheel; soltar ou perder foco encerra o zoom', () => {
  const h = setup()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
  h.wheel(-120, false)
  expect(h.result.current.zoom).toBe(110)
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }))
  expect(h.wheel(-120, false)).toBe(false)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
  window.dispatchEvent(new Event('blur'))
  expect(h.wheel(-120, false)).toBe(false)
  expect(h.result.current.zoom).toBe(110)
})

it('a prévia de link não bloqueia o zoom do texto, enquanto um painel de edição mantém prioridade', () => {
  const h = setup()
  const preview = document.body.appendChild(document.createElement('div'))
  preview.className = 'link-preview'
  preview.dataset.liveOverlay = ''
  h.wheel(-120)
  expect(h.result.current.zoom).toBe(110)
  preview.className = 'color-palette'
  h.wheel(-120)
  expect(h.result.current.zoom).toBe(110)
})
