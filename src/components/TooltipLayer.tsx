import { formatShortcut, useLanguage } from '../i18n'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Tip {
  target: HTMLElement
  label: string
  shortcut: string
}

function describe(target: HTMLElement): Tip | null {
  const copy = target.cloneNode(true) as HTMLElement
  copy
    .querySelectorAll('svg, kbd, small, .project-count, .project-icon, .cursor-sample')
    .forEach((node) => node.remove())
  const raw = (
    target.dataset.tooltip ??
    target.getAttribute('aria-label') ??
    copy.textContent ??
    ''
  ).trim()
  if (!raw) return null
  const match = raw.match(/^(.*?)\s*[(（]((?:Ctrl|Strg)\+[^)）]+)[)）]$/)
  return {
    target,
    label: match?.[1] ?? raw,
    shortcut:
      target.dataset.shortcut ?? match?.[2] ?? target.querySelector('kbd')?.textContent ?? '',
  }
}

export function TooltipLayer({ hidden = false }: { hidden?: boolean }) {
  const language = useLanguage()
  const id = useId()
  const popup = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    setTip(null)
    if (hidden) return
    let target: HTMLElement | null = null
    let visible: HTMLElement | null = null
    let pending: ReturnType<typeof setTimeout> | undefined
    let removing: ReturnType<typeof setTimeout> | undefined
    const cancel = () => {
      clearTimeout(pending)
      clearTimeout(removing)
      pending = undefined
      removing = undefined
    }
    const hide = () => {
      cancel()
      target = null
      visible = null
      setTip(null)
    }
    const hideSoon = () => {
      cancel()
      removing = setTimeout(hide, 100)
    }
    const show = (element: HTMLElement) => {
      clearTimeout(removing)
      if (element === target && (pending !== undefined || visible === element)) return
      clearTimeout(pending)
      setTip(null)
      target = element
      visible = null
      pending = setTimeout(() => {
        pending = undefined
        if (
          !element.isConnected ||
          !element.getClientRects().length ||
          getComputedStyle(element).visibility === 'hidden'
        )
          return
        visible = element
        setTip(describe(element))
      }, 420)
    }
    const over = (event: Event) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[role="tooltip"]')) {
        clearTimeout(removing)
        return
      }
      const element = event.target.closest<HTMLElement>('button, [data-tooltip], [role="tab"]')
      if (element) show(element)
      else hideSoon()
    }
    const out = (event: PointerEvent) => {
      if (target?.contains(event.relatedTarget as Node | null)) return
      hideSoon()
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('focusin', over)
    document.addEventListener('focusout', hide)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('keydown', hide, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('blur', hide)
    return () => {
      cancel()
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('focusin', over)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('keydown', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
    }
  }, [hidden, language])

  useLayoutEffect(() => {
    if (!tip || !popup.current) return
    const anchor = tip.target.getBoundingClientRect()
    const rect = popup.current.getBoundingClientRect()
    setPosition({
      left: Math.max(
        10,
        Math.min(anchor.left + (anchor.width - rect.width) / 2, innerWidth - rect.width - 10),
      ),
      top:
        anchor.bottom + rect.height + 18 <= innerHeight
          ? anchor.bottom + 8
          : Math.max(10, anchor.top - rect.height - 8),
    })
    const previous = tip.target.getAttribute('aria-describedby')
    tip.target.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '))
    return () => {
      if (previous === null) tip.target.removeAttribute('aria-describedby')
      else tip.target.setAttribute('aria-describedby', previous)
    }
  }, [tip, id])

  return tip && !hidden
    ? createPortal(
        <div ref={popup} id={id} className="app-tooltip" role="tooltip" style={position}>
          <span>{tip.label}</span>
          {tip.shortcut && <kbd>{formatShortcut(tip.shortcut)}</kbd>}
        </div>,
        document.body,
      )
    : null
}
