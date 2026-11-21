import { useEffect, useRef, useState } from 'react'
import type { Theme } from '../core/types'
import { AppIcon } from './AppIcon'
import { DefaultAppControl } from './DefaultAppControl'
import { ThemeChoices } from './ThemeChoices'
import { LanguageChoices } from './LanguageChoices'
import { tr, type Language } from '../i18n'
import { Modal } from './ui'
export function WelcomeTheme({
  theme,
  language = 'pt-BR',
  chooseLanguage = true,
  onLanguageChange = () => {},
  onThemeChange,
  onComplete,
}: {
  theme: Theme
  language?: Language
  chooseLanguage?: boolean
  onLanguageChange?: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const page = step - (chooseLanguage ? 1 : 0)
  const steps = [
    ...(chooseLanguage ? [tr('Linguagem')] : []),
    tr('Boas-vindas'),
    tr('Seu tema'),
    tr('Seus arquivos'),
  ]
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({
      preventScroll: true,
    })
  }, [step])
  return (
    <Modal
      title={tr('Bem-vindo ao Entrelinhas')}
      className="welcome-modal"
      dismissible={false}
      onClose={() => {}}
    >
      <ol className="welcome-steps" aria-label={tr('Etapas da apresentação')}>
        {steps.map((label, index) => (
          <li key={tr(label)} aria-current={index === step ? 'step' : undefined}>
            <span aria-hidden="true">{index + 1}</span>
            {tr(label)}
          </li>
        ))}
      </ol>
      <div className="welcome-body">
        {page === -1 && (
          <>
            <h3 ref={heading} tabIndex={-1}>
              {tr('Escolha seu idioma.')}
            </h3>
            <p className="muted">{tr('Em que idioma você quer escrever sua história?')}</p>
            <LanguageChoices value={language} onChange={onLanguageChange} />
            <p className="welcome-footnote">
              {tr('Você pode mudar o idioma a qualquer momento nas configurações.')}
            </p>
          </>
        )}
        {page === 0 && (
          <>
            <AppIcon />
            <h3 ref={heading} tabIndex={-1}>
              {tr('Um espaço para suas palavras.')}
            </h3>
            <p className="muted">
              {tr('Bem-vindo ao Entrelinhas. Escreva, organize suas ideias e encontre seu ritmo.')}
            </p>
            <div className="welcome-note">
              <span>{tr('Seu texto, seu tempo.')}</span>
              <p>
                {tr('Seus documentos ficam no seu computador.')}
                <br />
                {tr('Você escolhe quando e onde salvar.')}
              </p>
            </div>
            <p className="welcome-footnote">{tr('Vamos preparar seu espaço em poucos passos.')}</p>
          </>
        )}
        {page === 1 && (
          <>
            <h3 ref={heading} tabIndex={-1}>
              {tr('Seu espaço, sua luz.')}
            </h3>
            <p className="muted">{tr('Escolha a atmosfera que acompanha sua escrita.')}</p>
            <ThemeChoices value={theme} onChange={onThemeChange} welcome />
            <p className="welcome-footnote">
              {tr('Você pode mudar o tema a qualquer momento nas configurações.')}
            </p>
          </>
        )}
        {page === 2 && (
          <>
            <h3 ref={heading} tabIndex={-1}>
              {tr('Suas ideias, a um clique.')}
            </h3>
            <p className="muted">{tr('Quer abrir seus documentos aqui por padrão?')}</p>
            <DefaultAppControl onComplete={onComplete} />
            <p className="welcome-footnote">
              {tr('A escolha é sua. Esta opção também fica em Configurações → Arquivos.')}
            </p>
          </>
        )}
      </div>
      <footer className="welcome-actions">
        <span className="muted small" aria-live="polite">
          {tr('Etapa {current} de {total}', {
            current: step + 1,
            total: steps.length,
          })}
        </span>
        <div>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}>
              {tr('Voltar')}
            </button>
          )}
          {page < 2 ? (
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (page === -1) onLanguageChange(language)
                if (page === 1) onThemeChange(theme)
                setStep(step + 1)
              }}
            >
              {tr('Continuar')}
            </button>
          ) : (
            <button type="button" onClick={onComplete}>
              {tr('Agora não')}
            </button>
          )}
        </div>
      </footer>
    </Modal>
  )
}
