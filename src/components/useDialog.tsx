import { tr } from '../i18n'
import { useCallback, useRef, useState } from 'react'
import { Modal } from './ui'

export interface DialogOptions {
  title: string
  message: string
  choices: { id: string; label: string; primary?: boolean; danger?: boolean }[]
}
export type AskDialog = (options: DialogOptions) => Promise<string>

export function useDialog() {
  const [options, setOptions] = useState<DialogOptions | null>(null)
  const resolve = useRef<((choice: string) => void) | null>(null)
  const finish = useCallback((choice: string) => {
    resolve.current?.(choice)
    resolve.current = null
    setOptions(null)
  }, [])
  const ask = useCallback<AskDialog>(
    (options) =>
      new Promise((done) => {
        resolve.current?.('cancel')
        resolve.current = done
        setOptions(options)
      }),
    [],
  )
  return {
    ask,
    visible: options !== null,
    element: options && (
      <Modal title={options.title} onClose={() => finish('cancel')}>
        <div className="modal-body">
          <p className="dialog-message">{tr(options.message)}</p>
          <div className="modal-actions">
            {options.choices.map((choice) => (
              <button
                key={choice.id}
                className={choice.primary ? 'primary' : choice.danger ? 'danger' : ''}
                onClick={() => finish(choice.id)}
              >
                {tr(choice.label)}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    ),
  }
}
