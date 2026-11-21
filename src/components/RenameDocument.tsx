import { tr } from '../i18n'
import { useState } from 'react'
import type { Note } from '../core/types'
import { noteTitle } from '../core/notes'
import { documentTitle, editableTitle } from '../core/titles'
import { errorMessage } from '../native/api'
import { Modal } from './ui'
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
  return (
    <Modal title={tr('Editar título')} onClose={onClose} dismissible={!busy}>
      <form
        className="modal-body"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError('')
          try {
            await onRename(documentTitle(title))
            onClose()
          } catch (error) {
            setError(errorMessage(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          {tr('Título do documento')}
          <input
            autoFocus
            aria-label={tr('Título do documento')}
            value={title}
            maxLength={120}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
          />
        </label>
        <p className="muted small">
          {note.path
            ? tr('O arquivo será renomeado na mesma pasta, mantendo a extensão e o conteúdo salvo.')
            : tr('Este será o nome sugerido quando você salvar a nota.')}
        </p>
        {error && (
          <p role="alert" className="error-text">
            {tr(error)}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            {tr('Cancelar')}
          </button>
          <button type="submit" className="primary" disabled={busy || !title.trim()}>
            {busy ? tr('Aplicando…') : note.path ? tr('Renomear arquivo') : tr('Usar título')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
