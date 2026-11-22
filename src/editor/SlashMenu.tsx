import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import {
  CheckSquare,
  Table2,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code2,
  Minus,
  Type,
  ChevronRight,
  Info,
  TriangleAlert,
  ImagePlus,
  Link,
  CalendarDays,
  Clock3,
  Copy,
  RemoveFormatting,
} from 'lucide-react'
import {
  filterSlashCommands,
  runSlashCommand,
  slashRange,
  type SlashRange,
  type SlashCommand,
} from './slash'
import { tr, useLanguage } from '../i18n'
const icons = {
  tasks: CheckSquare,
  table: Table2,
  bullet: List,
  number: ListOrdered,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  quote: Quote,
  code: Code2,
  divider: Minus,
  text: Type,
  toggle: ChevronRight,
  callout: Info,
  warning: TriangleAlert,
  image: ImagePlus,
  link: Link,
  date: CalendarDays,
  time: Clock3,
  duplicate: Copy,
  clear: RemoveFormatting,
}
const key = new PluginKey('entrelinhasSlash')

export function SlashMenu({
  editor,
  onImage,
  onLink,
}: {
  editor: Editor
  onImage: (range: SlashRange) => void
  onLink: (range: SlashRange) => void
}) {
  const language = useLanguage(),
    id = useId()
  const [range, setRange] = useState<SlashRange | null>(null)
  const [selected, setSelected] = useState(0)
  const [position, setPosition] = useState({ left: 10, top: 10, maxHeight: 320 })
  const menu = useRef<HTMLDivElement>(null)
  const dismissed = useRef<number | null>(null)
  const composing = useRef(false)
  const current = useRef({ range, selected, items: filterSlashCommands(range?.query ?? '') })
  const items = filterSlashCommands(range?.query ?? '')
  current.current = { range, selected, items }
  const close = () => {
    dismissed.current = current.current.range?.from ?? null
    current.current = { ...current.current, range: null }
    setRange(null)
  }
  const choose = (command: SlashCommand) => {
    const match = current.current.range
    if (!match) return
    close()
    if (command.id === 'image') onImage(match)
    else if (command.id === 'link') onLink(match)
    else runSlashCommand(editor, match, command.id)
  }
  const chooseRef = useRef(choose)
  chooseRef.current = choose
  useEffect(() => {
    let disposed = false
    const refresh = () => {
      if (disposed || editor.isDestroyed) return
      const next =
        editor.isFocused && !editor.view.composing && !composing.current
          ? slashRange(editor.state)
          : null
      if (!next) {
        if (!composing.current) dismissed.current = null
        current.current = { ...current.current, range: null }
        setRange(null)
        return
      }
      if (dismissed.current === next.from) return
      const previous = current.current.range
      const changed = previous?.query !== next.query || previous?.from !== next.from
      current.current = {
        range: next,
        selected: changed ? 0 : current.current.selected,
        items: filterSlashCommands(next.query),
      }
      if (changed) setSelected(0)
      setRange(next)
    }
    const compositionStart = () => {
      composing.current = true
      setRange(null)
    }
    const compositionEnd = () => {
      composing.current = false
      queueMicrotask(refresh)
    }
    const plugin = new Plugin({
      key,
      props: {
        handleKeyDown: (_view, event) => {
          const state = current.current
          if (!state.range || event.isComposing || editor.view.composing || composing.current)
            return false
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
            return true
          }
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            if (state.items.length) {
              const next =
                (state.selected + (event.key === 'ArrowDown' ? 1 : -1) + state.items.length) %
                state.items.length
              current.current = { ...state, selected: next }
              setSelected(next)
            }
            return true
          }
          if (event.key === 'Enter' && state.items[state.selected]) {
            event.preventDefault()
            chooseRef.current(state.items[state.selected])
            return true
          }
          return false
        },
      },
      view: () => ({ update: refresh }),
    })
    const dom = editor.view.dom
    editor.registerPlugin(plugin, (next, plugins) => [next, ...plugins])
    editor.on('focus', refresh)
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && current.current.range) close()
    }
    document.addEventListener('pointerdown', outside, true)
    dom.addEventListener('compositionstart', compositionStart)
    dom.addEventListener('compositionend', compositionEnd)
    refresh()
    return () => {
      disposed = true
      editor.off('focus', refresh)
      if (!editor.isDestroyed) editor.unregisterPlugin(key)
      document.removeEventListener('pointerdown', outside, true)
      dom.removeEventListener('compositionstart', compositionStart)
      dom.removeEventListener('compositionend', compositionEnd)
    }
  }, [editor])
  useLayoutEffect(() => {
    if (!range || !menu.current) return
    const place = () => {
      const coords = editor.view.coordsAtPos(range.to),
        rect = menu.current!.getBoundingClientRect()
      const scroll = editor.view.dom.closest('.editor-scroll')!.getBoundingClientRect()
      if (coords.bottom < scroll.top || coords.top > scroll.bottom) {
        close()
        return
      }
      const below = innerHeight - coords.bottom - 12,
        above = coords.top - 12
      const upward = below < Math.min(240, rect.height) && above > below
      const maxHeight = Math.max(90, Math.min(340, upward ? above : below))
      setPosition({
        left: Math.max(10, Math.min(coords.left, innerWidth - rect.width - 10)),
        top: upward
          ? Math.max(10, coords.top - Math.min(rect.height, maxHeight) - 6)
          : coords.bottom + 6,
        maxHeight,
      })
    }
    place()
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) place()
    }
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', place)
    const observer = new ResizeObserver(place)
    observer.observe(editor.view.dom)
    observer.observe(editor.view.dom.closest('.editor-scroll')!)
    observer.observe(menu.current)
    editor.view.dom.setAttribute('aria-controls', id)
    if (items[selected]) editor.view.dom.setAttribute('aria-activedescendant', `${id}-${selected}`)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', place)
      editor.view.dom.removeAttribute('aria-controls')
      editor.view.dom.removeAttribute('aria-activedescendant')
    }
  }, [editor, range, selected, language, id])
  useEffect(() => {
    menu.current?.querySelector('[aria-selected=true]')?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])
  return range
    ? createPortal(
        <div
          ref={menu}
          className="slash-menu anchored-panel"
          role="listbox"
          id={id}
          aria-label={tr('Comandos de escrita')}
          data-live-overlay
          style={position}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="slash-heading">
            {tr('Comandos de escrita')} <span aria-hidden="true">{items.length}</span>
          </div>
          {items.map((command, index) => {
            const Icon = icons[command.id]
            return (
              <button
                key={command.id}
                type="button"
                role="option"
                id={`${id}-${index}`}
                aria-selected={selected === index}
                data-command={command.id}
                onPointerMove={() => {
                  current.current = { ...current.current, selected: index }
                  setSelected(index)
                }}
                onClick={() => choose(command)}
              >
                <Icon size={18} />
                <span>
                  <strong>{tr(command.label)}</strong>
                  <small>{tr(command.description)}</small>
                </span>
              </button>
            )
          })}
          {!items.length && (
            <p className="muted">{tr('Nenhum comando encontrado. Esc mantém o texto.')}</p>
          )}
          <footer>{tr('↑ ↓ escolher · Enter aplicar · Esc fechar')}</footer>
        </div>,
        document.body,
      )
    : null
}
