import { useEffect, useRef, useState } from 'react'
import type { Preferences, ShortcutAction } from '../core/types'
import { eventShortcut, isAssignableShortcut } from '../core/shortcuts'
import { defaultPreferences } from '../core/preferences'
import { formatShortcut, tr } from '../i18n'
import { Modal } from './ui'

export const shortcutLabels: Record<ShortcutAction, string> = {
  new: 'Nova nota',
  open: 'Abrir documento',
  save: 'Salvar',
  saveAs: 'Salvar como',
  close: 'Fechar aba',
  find: 'Pesquisar',
  replace: 'Substituir',
  immersive: 'Modo Zen',
  settings: 'Configurações',
}
export function ShortcutCapture({
  action,
  shortcuts,
  onSave,
  onClose,
}: {
  action: ShortcutAction
  shortcuts: Preferences['shortcuts']
  onSave: (value: string) => void
  onClose: () => void
}) {
  const [candidate, setCandidate] = useState(shortcuts[action])
  const [error, setError] = useState('')
  const capture = useRef<HTMLDivElement>(null)
  useEffect(() => {
    capture.current?.focus()
  }, [])
  const choose = (value: string) => {
    if (!isAssignableShortcut(value)) {
      setError(tr('Essa combinação está reservada ou não pode ser usada.'))
      return
    }
    const duplicate = Object.entries(shortcuts).find(
      ([key, shortcut]) => key !== action && shortcut === value,
    )
    if (duplicate) {
      setError(
        tr('Atalho já utilizado por {action}.', {
          action: tr(shortcutLabels[duplicate[0] as ShortcutAction]),
        }),
      )
      return
    }
    setError('')
    setCandidate(value)
  }
  return (
    <Modal title={tr('Alterar atalho')} onClose={onClose}>
      <div className="modal-body" data-shortcut-capture>
        <h3>{tr(shortcutLabels[action])}</h3>
        <p className="muted">{tr('Pressione a combinação desejada. Depois, clique em Salvar.')}</p>
        <div
          ref={capture}
          className="shortcut-capture"
          tabIndex={0}
          role="group"
          aria-label={tr('Capturar novo atalho')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              onClose()
              return
            }
            if (event.key === 'Tab') return
            event.preventDefault()
            event.stopPropagation()
            if (event.nativeEvent.isComposing) return
            const value = eventShortcut(event.nativeEvent)
            if (value) choose(value)
          }}
        >
          <kbd>{formatShortcut(candidate)}</kbd>
        </div>
        <p className="muted small">{tr('Use Ctrl, Alt ou uma tecla de função. Esc cancela.')}</p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={() => choose(defaultPreferences.shortcuts[action])}>
            {tr('Restaurar padrão')}
          </button>
          <button type="button" onClick={onClose}>
            {tr('Cancelar')}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!!error}
            onClick={() => {
              onSave(candidate)
              onClose()
            }}
          >
            {tr('Salvar')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
