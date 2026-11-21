import { tr } from '../i18n'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Note } from '../core/types'
import { noteTitle } from '../core/notes'
import { IconButton } from './ui'
export function Titlebar({
  note,
  onRename,
  onError,
}: {
  note: Note
  onRename: () => void
  onError: (message: string) => void
}) {
  const cancelDrag = useRef(() => {})
  useEffect(() => () => cancelDrag.current(), [])
  const isControl = (target: EventTarget) =>
    target instanceof Element &&
    target.closest('button, a, input, select, textarea, [role="button"]')
  const run = (action: 'minimize' | 'toggleMaximize' | 'close' | 'startDragging') => {
    if (isTauri())
      void getCurrentWindow()
        [action]()
        .catch((error) => onError(String(error)))
  }
  return (
    <header
      className="titlebar chrome"
      data-tauri-drag-region="false"
      onMouseDown={(event) => {
        cancelDrag.current()
        if (event.button !== 0 || isControl(event.target)) return
        event.preventDefault()
        event.stopPropagation()
        const { clientX, clientY } = event
        const stop = () => {
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', stop)
          window.removeEventListener('blur', stop)
          cancelDrag.current = () => {}
        }
        const move = (mouse: MouseEvent) => {
          if (!(mouse.buttons & 1)) {
            stop()
            return
          }
          // Só inicia o arraste com movimento, preservando cliques e duplo clique.
          if (Math.hypot(mouse.clientX - clientX, mouse.clientY - clientY) < 6) return
          stop()
          run('startDragging')
        }
        cancelDrag.current = stop
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', stop)
        window.addEventListener('blur', stop)
      }}
      onDoubleClick={(event) => {
        if (event.button !== 0 || isControl(event.target)) return
        event.preventDefault()
        event.stopPropagation()
        cancelDrag.current()
        run('toggleMaximize')
      }}
    >
      <div className="brand">
        <span>Entrelinhas</span>
      </div>
      <button
        type="button"
        className="window-title"
        aria-label={tr('Editar título do documento')}
        data-tooltip={tr('Editar título')}
        data-shortcut={tr('Duplo clique')}
        onDoubleClick={(event) => {
          event.stopPropagation()
          onRename()
        }}
        onClick={(event) => {
          if (event.detail === 0) onRename()
        }}
      >
        {noteTitle(note)}
        <span> · {note.format.toUpperCase()}</span>
      </button>
      <div className="window-controls">
        <IconButton label={tr('Minimizar')} onClick={() => run('minimize')}>
          <Minus size={14} />
        </IconButton>
        <IconButton label={tr('Maximizar ou restaurar')} onClick={() => run('toggleMaximize')}>
          <Square size={11} />
        </IconButton>
        <IconButton label={tr('Fechar aplicativo')} onClick={() => run('close')}>
          <X size={16} />
        </IconButton>
      </div>
    </header>
  )
}
