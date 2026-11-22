import { tr, useLanguage } from '../i18n'
import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import type { Note, Preferences } from '../core/types'
import { editorExtensions } from './extensions'
import { SlashMenu } from './SlashMenu'
import { Caret } from './Caret'

interface Props {
  note: Note
  active: boolean
  preferences: Preferences
  onReady: (id: string, editor: Editor | null) => void
  onChange: (id: string) => void
  onTyping: () => void
  onImages: (files: File[], editor: Editor) => void
  onStats: (text: string) => void
  onSelection: (rect: DOMRect | null) => void
}

export function EditorPane(props: Props) {
  const language = useLanguage()
  const current = useRef(props)
  current.current = props
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editor = useEditor({
    extensions: editorExtensions(),
    content: props.note.content,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Área de escrita',
        'aria-multiline': 'true',
        lang: props.preferences.language,
      },
      handleDOMEvents: {
        beforeinput: () => {
          current.current.onTyping()
          return false
        },
        compositionstart: () => {
          current.current.onTyping()
          return false
        },
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((file) =>
          file.type.startsWith('image/'),
        )
        if (!files.length) return false
        event.preventDefault()
        if (current.current.active && view.editable)
          current.current.onImages(files, currentEditor()!)
        return true
      },
      handleDrop: (_view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((file) =>
          file.type.startsWith('image/'),
        )
        if (!files.length) return false
        event.preventDefault()
        const target = currentEditor()!
        const position = target.view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (position) target.commands.setTextSelection(position.pos)
        current.current.onImages(files, target)
        return true
      },
    },
    onUpdate: ({ editor: updated }) => {
      current.current.onChange(current.current.note.id)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => current.current.onStats(updated.getText()), 180)
    },
    onSelectionUpdate: ({ editor: updated }) => {
      const selection = window.getSelection()
      current.current.onSelection(
        !updated.state.selection.empty && selection?.rangeCount
          ? selection.getRangeAt(0).getBoundingClientRect()
          : null,
      )
    },
  })
  const editorRef = useRef<Editor | null>(null)
  editorRef.current = editor
  function currentEditor() {
    return editorRef.current
  }
  useEffect(() => {
    if (!editor) return
    props.onReady(props.note.id, editor)
    return () => {
      props.onReady(props.note.id, null)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [editor, props.note.id, props.onReady])
  useEffect(() => {
    if (props.active && editor) {
      requestAnimationFrame(() => editor.commands.focus())
      props.onStats(editor.getText())
    }
  }, [props.active, editor]) // O conteúdo e o histórico continuam vivos ao trocar de aba.
  useEffect(() => {
    editor?.view.dom.setAttribute('spellcheck', String(props.preferences.spellcheck))
  }, [editor, props.preferences.spellcheck])
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('lang', language)
    editor.view.dom.setAttribute('aria-label', tr('Área de escrita'))
    editor.view.dispatch(
      editor.state.tr.setMeta('language', language).setMeta('addToHistory', false),
    )
  }, [editor, language])
  return (
    <div
      className={`editor-scroll ${props.active ? '' : 'inactive'}`}
      data-cursor={props.preferences.cursor}
    >
      <div className="writing-paper">
        <EditorContent editor={editor} />
      </div>
      {editor && props.active && <SlashMenu editor={editor} />}
      {editor && props.active && (
        <Caret editor={editor} enabled={props.preferences.cursor === 'block'} />
      )}
    </div>
  )
}
