import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
  disabled?: boolean
  lang?: string
}

export function Select({
  label,
  value,
  options,
  onChange,
  icon,
  displayValue,
  className = '',
  lang,
}: {
  label: string
  displayValue?: string
  className?: string
  lang?: string
  icon?: ReactNode
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ left: 0, top: 0, minWidth: 0, maxHeight: 280 })
  const selected = options.findIndex((option) => option.value === value)

  const show = () => {
    setActive(
      selected >= 0 && !options[selected].disabled
        ? selected
        : options.findIndex((o) => !o.disabled),
    )
    search.current = { text: '', time: 0 }
    trigger.current?.focus({ preventScroll: true })
    setOpen(true)
  }
  const choose = (index: number) => {
    if (!options[index] || options[index].disabled) return
    setOpen(false)
    onChange(options[index].value)
  }

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = trigger.current!.getBoundingClientRect()
      const popup = list.current!
      const below = innerHeight - anchor.bottom - 14
      const above = anchor.top - 14
      const height = Math.min(280, popup.scrollHeight)
      const upward = below < height && above > below
      const maxHeight = Math.max(40, Math.min(280, upward ? above : below))
      const width = Math.max(anchor.width, popup.getBoundingClientRect().width)
      setPosition({
        left: Math.max(12, Math.min(anchor.left, innerWidth - width - 12)),
        top: upward
          ? Math.max(12, anchor.top - Math.min(height, maxHeight) - 6)
          : anchor.bottom + 6,
        minWidth: anchor.width,
        maxHeight,
      })
    }
    place()
    const onScroll = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) place()
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!trigger.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    const blur = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('blur', blur)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('blur', blur)
    }
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`select-trigger ${className}`.trim()}
        lang={lang}
        role="combobox"
        aria-label={label}
        aria-description={displayValue ? options[selected]?.label : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          } else if (event.key === 'Tab') setOpen(false)
          else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            if (!open) {
              show()
              return
            }
            const enabled = options
              .map((option, index) => (option.disabled ? -1 : index))
              .filter((index) => index >= 0)
            const current = enabled.indexOf(active)
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? enabled.length - 1
                  : (current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) %
                    enabled.length
            setActive(enabled[next] ?? -1)
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) choose(active)
            else show()
          } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault()
            if (!open) show()
            const now = Date.now()
            const text =
              (now - search.current.time > 700 ? '' : search.current.text) +
              event.key.toLocaleLowerCase()
            search.current = { text, time: now }
            const found = options.findIndex(
              (option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(text),
            )
            if (found >= 0) setActive(found)
          }
        }}
      >
        <span className="select-label">{displayValue ?? options[selected]?.label ?? value}</span>
        {icon && (
          <span className="select-choice-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={list}
            id={id}
            className="select-options"
            role="listbox"
            aria-label={label}
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                lang={option.lang}
                data-value={option.value}
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={index === active ? 'highlighted' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => !option.disabled && setActive(index)}
                onClick={(event) => {
                  event.stopPropagation()
                  choose(index)
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={14} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
