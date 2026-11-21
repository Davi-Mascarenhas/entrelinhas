import { tr } from '../i18n'
import { Sun, Moon, Coffee } from 'lucide-react'
import type { Theme } from '../core/types'

const themes = [
  { id: 'light', label: 'Claro', icon: Sun, description: 'Leve e luminoso.' },
  { id: 'dark', label: 'Escuro', icon: Moon, description: 'Contraste suave para a noite.' },
  {
    id: 'sepia',
    label: 'Sépia Noturno',
    icon: Coffee,
    description: 'Tons quentes para escrever com calma.',
  },
] as const

export function ThemeChoices({
  value,
  onChange,
  welcome = false,
}: {
  value: Theme | null
  onChange: (theme: Theme) => void
  welcome?: boolean
}) {
  return (
    <div className="theme-options">
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={`theme-choice ${value === theme.id ? 'selected' : ''}`}
          aria-pressed={value === theme.id}
          aria-label={
            welcome ? tr('Usar tema {theme}', { theme: tr(theme.label) }) : tr(theme.label)
          }
          onClick={() => onChange(theme.id)}
        >
          <span className={`theme-preview ${theme.id}`} aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
          </span>
          <span className="theme-choice-label">
            <theme.icon size={14} />
            {tr(theme.label)}
          </span>
          {welcome && <small>{tr(theme.description)}</small>}
        </button>
      ))}
    </div>
  )
}
