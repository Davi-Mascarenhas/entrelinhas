import { Check } from 'lucide-react'
import { languages, tr, type Language } from '../i18n'

export function LanguageChoices({
  value,
  onChange,
}: {
  value: Language
  onChange: (value: Language) => void
}) {
  return (
    <div className="language-options" role="group" aria-label={tr('Linguagem')}>
      {languages.map((language) => (
        <button
          type="button"
          className="language-choice"
          data-language={language.id}
          lang={language.id}
          key={language.id}
          aria-pressed={value === language.id}
          onClick={() => onChange(language.id)}
        >
          <span>{language.name}</span>
          {value === language.id && <Check size={16} aria-hidden="true" />}
        </button>
      ))}
    </div>
  )
}
