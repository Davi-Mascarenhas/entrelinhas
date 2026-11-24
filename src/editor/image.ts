import Image from '@tiptap/extension-image'
import type { ResizableNodeView } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'

// Mantém o redimensionador do editor, sincronizando desfazer/reabrir e o limite da página.
export const EdgeImage = Image.extend({
  addNodeView() {
    const render = this.parent?.()
    if (!render) return null
    return (props) => {
      const view = render(props) as ResizableNodeView
      const image = view.element as HTMLImageElement
      let node = props.node
      const sync = () => {
        const available = view.dom.parentElement?.clientWidth || undefined
        view.maxSize = available ? { width: available } : undefined
        const width = Number(node.attrs.width) || image.naturalWidth
        const height = Number(node.attrs.height) || image.naturalHeight
        if (width > 0 && height > 0) {
          const fitted = Math.min(width, available ?? width)
          image.style.width = `${fitted}px`
          image.style.height = `${(fitted * height) / width}px`
        }
      }
      // O limite é medido a cada gesto, inclusive após redimensionar a janela ou alternar o Zen.
      const limit = () => {
        const width = view.dom.parentElement?.clientWidth
        view.maxSize = width ? { width } : undefined
        props.editor.view.dispatch(closeHistory(props.editor.state.tr))
      }
      view.dom.addEventListener('mousedown', limit, true)
      view.dom.addEventListener('touchstart', limit, true)
      image.addEventListener('load', sync)
      let lastWidth = 0
      const observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.width !== lastWidth) {
          lastWidth = entry.contentRect.width
          sync()
        }
      })
      observer.observe(view.dom)
      const update = view.update.bind(view)
      view.update = (next, decorations, innerDecorations) => {
        const accepted = update(next, decorations, innerDecorations)
        if (accepted) {
          node = next
          sync()
        }
        return accepted
      }
      const destroy = view.destroy.bind(view)
      view.destroy = () => {
        observer.disconnect()
        view.dom.removeEventListener('mousedown', limit, true)
        view.dom.removeEventListener('touchstart', limit, true)
        image.removeEventListener('load', sync)
        destroy()
      }
      return view
    }
  },
})
