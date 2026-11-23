import { Check } from 'lucide-react'
import { languageFamilies, languages, tr, type Language } from '../i18n'
import { Select } from './Select'

export function LanguageChoices({
  value,
  onChange,
}: {
  value: Language
  onChange: (value: Language) => void
}) {
  return (
    <div className="language-options" role="group" aria-label={tr('Linguagem')}>
      {languageFamilies.map((family) => {
        const selected = family.locales.includes(value)
        const options = family.locales.map((locale) => {
          const item = languages.find((language) => language.id === locale)!
          return { value: item.id, label: item.name, lang: item.id }
        })
        if (options.length > 1)
          return (
            <div
              className="language-family"
              key={family.id}
              data-language-family={family.id}
              data-locales={family.locales.join(' ')}
              data-selected={selected}
            >
              <Select
                label={family.name}
                displayValue={family.name}
                className="language-choice"
                lang={selected ? value : family.locales[0]}
                value={selected ? value : ''}
                options={options}
                onChange={(language) => onChange(language as Language)}
              />
            </div>
          )
        const language = options[0]
        return (
          <button
            type="button"
            className="language-choice"
            data-language={language.value}
            lang={language.lang}
            key={family.id}
            aria-pressed={selected}
            onClick={() => onChange(language.value)}
          >
            <span>{family.name}</span>
            {selected && <Check size={16} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
