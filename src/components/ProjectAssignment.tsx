import { tr } from '../i18n'
import { useState, type CSSProperties } from 'react'
import { Check, ChevronDown, Folder, FolderOpen, Search } from 'lucide-react'
import type { Project } from '../core/types'
import { errorMessage } from '../native/api'
import { Modal } from './ui'
interface Props {
  projects: Project[]
  value: string | null
  onChange: (projectId: string | null) => Promise<void> | void
  label?: string
  onDone?: () => void
}
export function ProjectAssignment({
  projects,
  value,
  onChange,
  label = tr('Projeto do documento atual'),
  onDone,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = projects.find((project) => project.id === value)
  const close = () => {
    setOpen(false)
    if (onDone)
      requestAnimationFrame(() => {
        if (!document.querySelector('[role=dialog]')) onDone()
      })
  }
  const choose = async (projectId: string | null) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await onChange(projectId)
      close()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const option = (project: Project | null) => (
    <button
      type="button"
      key={project?.id ?? 'none'}
      role="option"
      aria-selected={project ? value === project.id : !value}
      data-project-id={project?.id ?? ''}
      disabled={busy}
      className="project-choice"
      onClick={() => void choose(project?.id ?? null)}
    >
      <span
        className="project-choice-icon"
        style={
          {
            '--project-color': project?.color ?? 'var(--muted)',
          } as CSSProperties
        }
      >
        {project?.icon || (project ? <Folder size={19} /> : <FolderOpen size={19} />)}
      </span>
      <span>
        <strong>{project?.name ?? tr('Sem projeto')}</strong>
        <small>{project ? tr('Organizar nesta coleção') : tr('Sem atalho na lateral')}</small>
      </span>
      {(project ? value === project.id : !value) && <Check size={17} className="chosen-check" />}
    </button>
  )
  const filtered = projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  return (
    <>
      <button
        type="button"
        className="project-assignment"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setQuery('')
          setError('')
          setOpen(true)
        }}
      >
        {selected ? (
          <span
            className="project-color-dot"
            style={{
              backgroundColor: selected.color,
            }}
          />
        ) : (
          <Folder size={13} />
        )}
        <span>{selected?.name ?? tr('Sem projeto')}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <Modal title={tr('Organizar documento')} onClose={close}>
          <div className="project-picker-body">
            <p className="muted">{tr('Escolha onde esta página aparece.')}</p>
            <label className="project-filter">
              <Search size={16} />
              <input
                autoFocus
                aria-label={tr('Filtrar projetos')}
                placeholder={tr('Encontrar um projeto…')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    event.currentTarget
                      .closest('.project-picker-body')
                      ?.querySelector<HTMLButtonElement>('[role=option]')
                      ?.focus()
                  }
                }}
              />
            </label>
            <div
              className="project-choices"
              role="listbox"
              aria-label={tr('Projetos disponíveis')}
              aria-busy={busy}
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const options = [
                  ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role=option]:not(:disabled)',
                  ),
                ]
                const current = options.indexOf(document.activeElement as HTMLButtonElement)
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? options.length - 1
                      : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
                        options.length
                options[next]?.focus()
              }}
            >
              {option(null)}
              {filtered.map(option)}
            </div>
            {!filtered.length && (
              <p className="project-picker-empty">
                {projects.length
                  ? tr('Nenhum projeto com esse nome.')
                  : tr('Crie seu primeiro projeto na navegação.')}
              </p>
            )}
            {error && (
              <p className="error-text" role="alert">
                {tr(error)}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
