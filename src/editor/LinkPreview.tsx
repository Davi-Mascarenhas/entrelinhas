import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/core'
import { ExternalLink, Link2 } from 'lucide-react'
import { backend, errorMessage } from '../native/api'
import { tr, useLanguage } from '../i18n'
import { normalizeLink } from './links'

export function LinkPreview({
  editor,
  onNotice,
}: {
  editor: Editor
  onNotice: (message: string) => void
}) {
  const language = useLanguage()
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const panel = useRef<HTMLDivElement>(null)
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const href = anchor ? normalizeLink(anchor.getAttribute('href') || '') : null
  const onNoticeRef = useRef(onNotice)
  onNoticeRef.current = onNotice
  const requests = useRef(new Map<string, { pending: boolean; at: number }>())
  const open = async (url: string) => {
    const previous = requests.current.get(url)
    if (previous && (previous.pending || Date.now() - previous.at < 2000)) {
      onNoticeRef.current(
        tr('Este link já foi enviado ao navegador. Aguarde um instante para abrir novamente.'),
      )
      return
    }
    const request = { pending: true, at: Date.now() }
    requests.current.set(url, request)
    onNoticeRef.current(tr('Abrindo no navegador padrão…'))
    try {
      await backend.openLink(url)
      request.pending = false
      request.at = Date.now()
      onNoticeRef.current(
        tr('Link enviado ao navegador. Se a janela não aparecer, alterne para ele.'),
      )
    } catch (error) {
      requests.current.delete(url)
      onNoticeRef.current(errorMessage(error))
    }
  }
  useEffect(() => {
    const clear = () => clearTimeout(pending.current)
    const close = () => {
      clear()
      setAnchor(null)
    }
    const linkAt = (event: Event) =>
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    const over = (event: PointerEvent) => {
      const link = linkAt(event)
      if (!link || !normalizeLink(link.getAttribute('href') || '')) return
      clear()
      pending.current = setTimeout(() => setAnchor(link), 180)
    }
    const out = (event: PointerEvent) => {
      if (panel.current?.contains(event.relatedTarget as Node | null)) return
      clear()
      pending.current = setTimeout(close, 180)
    }
    const click = (event: MouseEvent) => {
      const link = linkAt(event)
      if (!link) return
      event.preventDefault()
      const url = normalizeLink(link.getAttribute('href') || '')
      if (!url) return
      clear()
      if (event.ctrlKey || event.metaKey) {
        close()
        open(url)
      } else setAnchor(link)
    }
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !editor.view.dom.contains(event.target as Node)
      )
        close()
      else if (editor.view.dom.contains(event.target as Node) && !linkAt(event)) close()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel.current) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    const scroll = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) close()
    }
    editor.view.dom.addEventListener('pointerover', over)
    editor.view.dom.addEventListener('pointerout', out)
    editor.view.dom.addEventListener('click', click)
    editor.view.dom.addEventListener('wheel', close, { passive: true })
    editor.view.dom.addEventListener('gesturestart', close, { passive: true })
    editor.on('update', close)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      clear()
      editor.view.dom.removeEventListener('pointerover', over)
      editor.view.dom.removeEventListener('pointerout', out)
      editor.view.dom.removeEventListener('click', click)
      editor.view.dom.removeEventListener('wheel', close)
      editor.view.dom.removeEventListener('gesturestart', close)
      editor.off('update', close)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape, true)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [editor])
  useLayoutEffect(() => {
    if (!anchor || !panel.current) return
    const rect = anchor.getBoundingClientRect(),
      box = panel.current.getBoundingClientRect()
    setPosition({
      left: Math.max(12, Math.min(rect.left, innerWidth - box.width - 12)),
      top:
        rect.bottom + box.height + 20 < innerHeight
          ? rect.bottom + 8
          : Math.max(12, rect.top - box.height - 8),
    })
  }, [anchor, language])
  return anchor && href
    ? createPortal(
        <div
          className="link-preview"
          ref={panel}
          style={position}
          data-live-overlay
          role="group"
          aria-label={tr('Prévia do link')}
          onPointerEnter={() => clearTimeout(pending.current)}
          onPointerLeave={() => {
            pending.current = setTimeout(() => setAnchor(null), 180)
          }}
        >
          <div className="link-preview-heading">
            <Link2 size={15} />
            <strong>{anchor.textContent || tr('Link')}</strong>
          </div>
          <span className="link-preview-address">{href}</span>
          <div className="link-preview-actions">
            <span>{tr('Ctrl+clique para abrir')}</span>
            <button
              type="button"
              onClick={() => {
                open(href)
                setAnchor(null)
              }}
            >
              <ExternalLink size={13} />
              {tr('Abrir link')}
            </button>
          </div>
        </div>,
        document.body,
      )
    : null
}
