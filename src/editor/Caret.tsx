import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'

interface CaretRect {
  left: number
  top: number
  width: number
  height: number
}

export function Caret({ editor, enabled }: { editor: Editor; enabled: boolean }) {
  const [rect, setRect] = useState<CaretRect | null>(null)
  useEffect(() => {
    if (!enabled) {
      editor.view.dom.classList.remove('block-ready')
      setRect(null)
      return
    }
    let frame = 0,
      composing = false
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const selection = editor.state.selection
        const dom = editor.view.dom
        if (!editor.isFocused || !selection.empty || composing || !dom.getClientRects().length) {
          dom.classList.remove('block-ready')
          setRect(null)
          return
        }
        try {
          const coords = editor.view.coordsAtPos(selection.head)
          const parent = dom.closest('.editor-scroll')!.getBoundingClientRect()
          if (coords.bottom < parent.top || coords.top > parent.bottom) {
            setRect(null)
            return
          }
          const nextText = selection.$head.nodeAfter?.text ?? ''
          const grapheme =
            new Intl.Segmenter(undefined, { granularity: 'grapheme' })
              .segment(nextText)
              [Symbol.iterator]()
              .next().value?.segment ?? ''
          let width = 0
          if (grapheme) {
            const point = editor.view.domAtPos(selection.head)
            if (point.node.nodeType === Node.TEXT_NODE) {
              const range = document.createRange()
              range.setStart(point.node, point.offset)
              range.setEnd(
                point.node,
                Math.min((point.node.textContent ?? '').length, point.offset + grapheme.length),
              )
              width = range.getBoundingClientRect().width
            }
          }
          const element = editor.view.domAtPos(selection.head).node.parentElement ?? dom
          const style = getComputedStyle(element)
          if (width <= 0) {
            const canvas = document.createElement('canvas').getContext('2d')
            if (canvas) {
              canvas.font = style.font
              width = canvas.measureText(grapheme || ' ').width
            }
          }
          dom.classList.add('block-ready')
          setRect({
            left: coords.left,
            top: coords.top,
            width: Math.max(5, width),
            height: coords.bottom - coords.top,
          })
        } catch {
          dom.classList.remove('block-ready')
          setRect(null)
        }
      })
    }
    const start = () => {
      composing = true
      update()
    }
    const end = () => {
      composing = false
      update()
    }
    editor.on('transaction', update).on('focus', update).on('blur', update)
    editor.view.dom.addEventListener('compositionstart', start)
    editor.view.dom.addEventListener('compositionend', end)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(editor.view.dom)
    const viewport = editor.view.dom.closest('.editor-scroll')
    if (viewport) observer.observe(viewport)
    document.fonts?.ready.then(update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      editor.off('transaction', update).off('focus', update).off('blur', update)
      editor.view.dom.removeEventListener('compositionstart', start)
      editor.view.dom.removeEventListener('compositionend', end)
      editor.view.dom.classList.remove('block-ready')
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [editor, enabled])
  return rect && enabled ? (
    <span
      className="block-caret"
      aria-hidden="true"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    />
  ) : null
}
