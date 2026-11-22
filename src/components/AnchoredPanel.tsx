import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

// Painel local: não escurece a janela, não prende o foco e não bloqueia a escrita.
export function AnchoredPanel({
  anchor,
  label,
  children,
  onClose,
  className = '',
}: {
  anchor: RefObject<HTMLElement | null>
  label: string
  children: ReactNode
  onClose: (reason: 'outside' | 'escape') => void
  className?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const current = useRef(onClose)
  current.current = onClose
  const [position, setPosition] = useState({ left: 12, top: 12, maxHeight: 400 })
  useLayoutEffect(() => {
    const place = () => {
      if (!anchor.current || !panel.current) return
      const a = anchor.current.getBoundingClientRect(),
        p = panel.current.getBoundingClientRect()
      const below = innerHeight - a.bottom - 12,
        above = a.top - 12
      const upward = below < p.height && above > below
      const maxHeight = Math.max(80, upward ? above : below)
      setPosition({
        left: Math.max(10, Math.min(innerWidth - p.width - 10, a.left)),
        top: upward ? Math.max(10, a.top - Math.min(p.height, maxHeight) - 7) : a.bottom + 7,
        maxHeight,
      })
    }
    place()
    const observer = new ResizeObserver(place)
    if (panel.current) observer.observe(panel.current)
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !anchor.current?.contains(event.target as Node)
      )
        current.current('outside')
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        current.current('escape')
      }
    }
    const scroll = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) place()
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', key, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', scroll, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', key, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [anchor])
  return createPortal(
    <div
      ref={panel}
      className={`anchored-panel ${className}`}
      role="region"
      aria-label={label}
      data-live-overlay
      style={position}
    >
      {children}
    </div>,
    document.body,
  )
}
