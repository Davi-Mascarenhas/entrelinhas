import { tr } from '../i18n'
import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Link,
  ImagePlus,
  Minus,
  Highlighter,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { IconButton } from './ui'
import { Select } from './Select'
export function Formatting({
  editor,
  insertImage,
  insertLink,
  compact = false,
}: {
  editor: Editor
  insertImage: () => void
  insertLink: () => void
  compact?: boolean
}) {
  const [, update] = useState(0)
  useEffect(() => {
    const refresh = () => update((value) => value + 1)
    editor.on('transaction', refresh)
    return () => {
      editor.off('transaction', refresh)
    }
  }, [editor])
  const tools = [
    {
      label: tr('Negrito (Ctrl+B)'),
      icon: Bold,
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: tr('Itálico (Ctrl+I)'),
      icon: Italic,
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: tr('Sublinhado (Ctrl+U)'),
      icon: Underline,
      active: editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: tr('Tachado'),
      icon: Strikethrough,
      active: editor.isActive('strike'),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: tr('Destaque'),
      icon: Highlighter,
      active: editor.isActive('highlight'),
      run: () =>
        editor
          .chain()
          .focus()
          .toggleHighlight({
            color: '#d4b66a66',
          })
          .run(),
    },
  ]
  return (
    <div
      className={`formatting ${compact ? 'compact' : ''}`}
      role="toolbar"
      aria-label={tr('Formatação')}
      onMouseDown={(event) => {
        if (
          event.currentTarget.contains(event.target as Node) &&
          (event.target as HTMLElement).closest('button')
        )
          event.preventDefault()
      }}
    >
      <Select
        label={tr('Estilo do parágrafo')}
        value={
          editor.isActive('heading', {
            level: 1,
          })
            ? '1'
            : editor.isActive('heading', {
                  level: 2,
                })
              ? '2'
              : editor.isActive('heading', {
                    level: 3,
                  })
                ? '3'
                : 'p'
        }
        onChange={(value) => {
          const level = Number(value) as 1 | 2 | 3
          if (value === 'p') editor.chain().focus().setParagraph().run()
          else
            editor
              .chain()
              .focus()
              .toggleHeading({
                level,
              })
              .run()
        }}
        options={[
          {
            value: 'p',
            label: tr('Texto'),
          },
          {
            value: '1',
            label: tr('Título 1'),
          },
          {
            value: '2',
            label: tr('Título 2'),
          },
          {
            value: '3',
            label: tr('Título 3'),
          },
        ]}
      />
      <span className="tool-divider" />
      {tools.map((tool) => (
        <IconButton
          key={tool.label}
          label={tool.label}
          aria-pressed={tool.active}
          onClick={tool.run}
        >
          <tool.icon size={16} />
        </IconButton>
      ))}
      {!compact && (
        <>
          <ColorPicker
            label={tr('Cor do texto')}
            value={editor.getAttributes('textStyle').color || '#61755b'}
            textTool
            onChange={(color) => {
              editor.chain().focus().setColor(color).run()
            }}
            onClear={() => {
              editor.chain().focus().unsetColor().run()
            }}
            onDone={() => {
              editor.commands.focus()
            }}
          />
          <Select
            label={tr('Tamanho do texto selecionado')}
            value={editor.getAttributes('textStyle').fontSize || ''}
            onChange={(value) =>
              value
                ? editor.chain().focus().setFontSize(value).run()
                : editor.chain().focus().unsetFontSize().run()
            }
            options={[
              {
                value: '',
                label: tr('Tamanho'),
              },
              ...[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => ({
                value: `${size}px`,
                label: String(size),
              })),
            ]}
          />
          <span className="tool-divider" />
          <IconButton
            label={tr('Lista com marcadores')}
            aria-pressed={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </IconButton>
          <IconButton
            label={tr('Lista numerada')}
            aria-pressed={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </IconButton>
          <IconButton
            label={tr('Checklist')}
            aria-pressed={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListTodo size={16} />
          </IconButton>
          <IconButton
            label={tr('Citação')}
            aria-pressed={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={16} />
          </IconButton>
          <IconButton
            label={tr('Bloco de código')}
            aria-pressed={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 size={16} />
          </IconButton>
          <IconButton
            label={tr('Alinhar à esquerda')}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft size={16} />
          </IconButton>
          <IconButton
            label={tr('Centralizar')}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={16} />
          </IconButton>
          <IconButton
            label={tr('Alinhar à direita')}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight size={16} />
          </IconButton>
          <IconButton
            label={tr('Inserir separador')}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={16} />
          </IconButton>
        </>
      )}
      <IconButton label={tr('Inserir link')} onClick={insertLink}>
        <Link size={16} />
      </IconButton>
      {!compact && (
        <>
          <IconButton label={tr('Inserir imagem')} onClick={insertImage}>
            <ImagePlus size={16} />
          </IconButton>
          <IconButton
            label={tr('Inserir tabela')}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({
                  rows: 3,
                  cols: 3,
                  withHeaderRow: true,
                })
                .run()
            }
          >
            <Table2 size={16} />
          </IconButton>
          {editor.isActive('table') && (
            <Select
              label={tr('Editar tabela')}
              value=""
              onChange={(value) => {
                const commands = editor.chain().focus()
                if (value === 'row') commands.addRowAfter().run()
                if (value === 'column') commands.addColumnAfter().run()
                if (value === 'delete-row') commands.deleteRow().run()
                if (value === 'delete-column') commands.deleteColumn().run()
                if (value === 'delete') commands.deleteTable().run()
              }}
              options={[
                {
                  value: '',
                  label: tr('Tabela'),
                },
                {
                  value: 'row',
                  label: tr('Adicionar linha'),
                },
                {
                  value: 'column',
                  label: tr('Adicionar coluna'),
                },
                {
                  value: 'delete-row',
                  label: tr('Remover linha'),
                },
                {
                  value: 'delete-column',
                  label: tr('Remover coluna'),
                },
                {
                  value: 'delete',
                  label: tr('Remover tabela'),
                },
              ]}
            />
          )}
          <span className="tool-divider" />
          <IconButton
            label={tr('Desfazer (Ctrl+Z)')}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </IconButton>
          <IconButton
            label={tr('Refazer (Ctrl+Shift+Z)')}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </IconButton>
        </>
      )}
    </div>
  )
}
