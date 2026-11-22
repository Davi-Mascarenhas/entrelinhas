import { useEffect, useRef, type RefObject } from 'react'
import type { Editor } from '@tiptap/core'

export const clampZoom = (value: number) => Math.min(200, Math.max(50, Math.round(value)))

export function useEditorZoom(
  scroll: RefObject<HTMLDivElement | null>,
  editor: Editor | null,
  active: boolean,
  zoom: number,
  onZoom: (zoom: number) => void,
) {
  const current = useRef({ zoom, onZoom })
  current.current = { zoom, onZoom }
  useEffect(() => {
    const node = scroll.current
    if (!node || !active || !editor) return
    let value = current.current.zoom,
      reported = value,
      gestureStart = value,
      gesturing = false,
      frame = 0
    let controlHeld = false
    const modifiers = (event: KeyboardEvent) => {
      if (event.key === 'Control') controlHeld = event.type === 'keydown'
    }
    const blur = () => {
      controlHeld = false
      gesturing = false
    }
    const apply = (next: number, x: number, y: number) => {
      if (document.querySelector('[role=dialog], [data-live-overlay]')) return
      value = Math.min(200, Math.max(50, next))
      reported = clampZoom(value)
      if (reported === current.current.zoom) return
      const point = editor.view.posAtCoords({ left: x, top: y })
      const before = point ? editor.view.coordsAtPos(point.pos).top : null
      current.current.zoom = reported
      current.current.onZoom(reported)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (point && before !== null && !editor.isDestroyed)
          node.scrollTop +=
            editor.view.coordsAtPos(Math.min(point.pos, editor.state.doc.content.size)).top - before
      })
    }
    const synchronize = () => {
      if (current.current.zoom !== reported) value = reported = current.current.zoom
    }
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !controlHeld) || !event.deltaY || !event.cancelable) return
      event.preventDefault()
      if (gesturing) return
      synchronize()
      const stepped = event.deltaMode !== 0 || Math.abs(event.deltaY) >= 40
      apply(
        stepped ? value - Math.sign(event.deltaY) * 10 : value * Math.exp(-event.deltaY * 0.005),
        event.clientX,
        event.clientY,
      )
    }
    const start = (event: Event) => {
      event.preventDefault()
      synchronize()
      gesturing = true
      gestureStart = value
    }
    const change = (event: Event) => {
      event.preventDefault()
      const gesture = event as Event & { scale: number; clientX: number; clientY: number }
      if (Number.isFinite(gesture.scale) && gesture.scale > 0)
        apply(gestureStart * gesture.scale, gesture.clientX, gesture.clientY)
    }
    const end = (event: Event) => {
      event.preventDefault()
      gesturing = false
    }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('gesturestart', start, { passive: false })
    node.addEventListener('gesturechange', change, { passive: false })
    node.addEventListener('gestureend', end, { passive: false })
    window.addEventListener('keydown', modifiers, true)
    window.addEventListener('keyup', modifiers, true)
    window.addEventListener('blur', blur)
    return () => {
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('gesturestart', start)
      node.removeEventListener('gesturechange', change)
      node.removeEventListener('gestureend', end)
      window.removeEventListener('keydown', modifiers, true)
      window.removeEventListener('keyup', modifiers, true)
      window.removeEventListener('blur', blur)
      cancelAnimationFrame(frame)
    }
  }, [scroll, editor, active])
}
