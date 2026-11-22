import { useEffect, useRef } from 'react'

// O keymap do ProseMirror consome Escape. A captura permite alternar o Zen
// antes dele, mas deixa os painéis abertos encerrarem sua própria interação.
export function useZenEscape(enabled: boolean, onEscape: () => void) {
  const current = useRef(onEscape)
  current.current = onEscape
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.isComposing ||
        event.defaultPrevented ||
        !enabled ||
        document.querySelector('[role=dialog], [data-live-overlay], [data-inline-rename]')
      )
        return
      event.preventDefault()
      event.stopPropagation()
      if (!event.repeat) current.current()
    }
    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [enabled])
}
