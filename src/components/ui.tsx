import { tr } from '../i18n'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
export function IconButton({
  label,
  children,
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={tr(label)}
      data-tooltip={tr(title ?? label)}
      {...props}
    >
      {children}
    </button>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  dismissible = true,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  dismissible?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current!
    const first =
      node.querySelector<HTMLElement>('[autofocus]') ??
      node.querySelector<HTMLElement>('input, [role="combobox"], textarea') ??
      node.querySelector<HTMLElement>('button')
    first?.focus({
      preventScroll: true,
    })
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ((event.target as HTMLElement).closest('[role="combobox"][aria-expanded="true"]')) return
        event.stopPropagation()
        event.preventDefault()
        if (dismissible) closeRef.current()
      }
      if (event.key !== 'Tab') return
      const elements = [
        ...node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length)
      if (!elements.length) return
      const first = elements[0],
        last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    node.addEventListener('keydown', handle)
    return () => {
      node.removeEventListener('keydown', handle)
      previous?.focus()
    }
  }, [])
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={tr(title)}
      >
        <header className="modal-header">
          <h2>{tr(title)}</h2>
          {dismissible && (
            <IconButton label={tr('Fechar painel')} onClick={onClose}>
              <X size={18} />
            </IconButton>
          )}
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}
