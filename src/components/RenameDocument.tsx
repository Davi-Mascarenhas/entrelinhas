import { tr } from '../i18n'
import { useRef, useState, type FormEvent } from 'react'
import type { Note } from '../core/types'
import { noteTitle } from '../core/notes'
import { documentTitle, editableTitle } from '../core/titles'
import { errorMessage } from '../native/api'
import { Check, X } from 'lucide-react'
import { IconButton } from './ui'
export function RenameDocument({
  note,
  onRename,
  onClose,
}: {
  note: Note
  onRename: (title: string) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(() => editableTitle(noteTitle(note)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (busy) return
    if (editableTitle(noteTitle(note)) === title.trim()) {
      onClose()
      return
    }
    setBusy(true)
    setError('')
    try {
      await onRename(documentTitle(title))
      onClose()
    } catch (error) {
      setError(errorMessage(error))
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="window-title inline-rename"
      data-inline-rename
      data-rename-busy={busy || undefined}
      onSubmit={(event) => void submit(event)}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          if (!busy) onClose()
        }
      }}
    >
      <input
        ref={input}
        autoFocus
        aria-label={tr('Título do documento')}
        value={title}
        maxLength={120}
        onFocus={(event) => event.target.select()}
        onChange={(event) => setTitle(event.target.value)}
        readOnly={busy}
        aria-invalid={!!error}
      />
      <button
        type="submit"
        className="icon-button"
        disabled={busy || !title.trim()}
        aria-label={tr('Salvar título')}
        data-tooltip={tr('Salvar título')}
      >
        <Check size={14} />
      </button>
      <IconButton
        label={tr('Cancelar')}
        disabled={busy}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClose}
      >
        <X size={14} />
      </IconButton>
      {error && (
        <span className="rename-error" role="alert">
          {tr(error)}
        </span>
      )}
    </form>
  )
}
