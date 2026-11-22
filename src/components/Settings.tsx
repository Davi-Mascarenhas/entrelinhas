import { version } from '../../package.json'
import { useState } from 'react'
import {
  Paintbrush,
  Type,
  MousePointer2,
  FileText,
  Keyboard,
  SlidersHorizontal,
  Info,
  Languages,
  PanelBottom,
} from 'lucide-react'
import { ThemeChoices } from './ThemeChoices'
import { AppIcon } from './AppIcon'
import { DefaultAppControl } from './DefaultAppControl'
import { UpdateControl } from './UpdateControl'
import type { UpdatesController } from '../native/useUpdates'
import { Modal } from './ui'
import { Select } from './Select'
import { ShortcutCapture, shortcutLabels } from './ShortcutCapture'
import { LanguageChoices } from './LanguageChoices'
import { formatShortcut, tr } from '../i18n'
import type { Preferences, ShortcutAction } from '../core/types'
const sections = [
  {
    id: 'appearance',
    label: 'Aparência',
    icon: Paintbrush,
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: Type,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    icon: MousePointer2,
  },
  { id: 'toolbar', label: 'Barra de formatação', icon: PanelBottom },
  {
    id: 'files',
    label: 'Arquivos',
    icon: FileText,
  },
  {
    id: 'shortcuts',
    label: 'Atalhos',
    icon: Keyboard,
  },
  {
    id: 'behavior',
    label: 'Comportamento',
    icon: SlidersHorizontal,
  },
  {
    id: 'language',
    label: 'Linguagem',
    icon: Languages,
  },
  {
    id: 'about',
    label: 'Sobre',
    icon: Info,
  },
]
export function Settings({
  preferences: p,
  onChange,
  onClose,
  updates,
}: {
  preferences: Preferences
  onChange: (change: Partial<Preferences>) => void
  onClose: () => void
  updates: UpdatesController
}) {
  const [section, setSection] = useState('appearance'),
    [capturing, setCapturing] = useState<ShortcutAction | null>(null)
  const toggle = (
    key:
      'autoImmersive' | 'askBeforeDiscard' | 'spellcheck' | 'selectionTools' | 'zenHideFormatting',
    title: string,
    description: string,
  ) => (
    <label className="setting-row">
      <span>
        <strong>{tr(title)}</strong>
        <small>{tr(description)}</small>
      </span>
      <input
        className="switch"
        data-preference={key}
        type="checkbox"
        checked={p[key]}
        onChange={(event) =>
          onChange({
            [key]: event.target.checked,
          })
        }
      />
    </label>
  )
  return (
    <Modal title={tr('Configurações')} onClose={onClose} wide>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label={tr('Categorias de configurações')}>
          {sections.map((item) => (
            <button
              key={item.id}
              data-section={item.id}
              className={section === item.id ? 'selected' : ''}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={16} />
              {tr(item.label)}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {section === 'appearance' && (
            <>
              <h3>{tr('Seu espaço, sua luz.')}</h3>
              <p className="muted">{tr('Escolha a atmosfera que acompanha sua escrita.')}</p>
              <ThemeChoices
                value={p.theme}
                onChange={(theme) =>
                  onChange({
                    theme,
                    themeChosen: true,
                  })
                }
              />
              <h4>{tr('Layout')}</h4>
              <label className="setting-row">
                <span>{tr('Posição da navegação')}</span>
                <Select
                  label={tr('Posição da navegação')}
                  value={p.sidebarSide}
                  options={[
                    {
                      value: 'left',
                      label: tr('Esquerda'),
                    },
                    {
                      value: 'right',
                      label: tr('Direita'),
                    },
                  ]}
                  onChange={(value) =>
                    onChange({
                      sidebarSide: value as Preferences['sidebarSide'],
                    })
                  }
                />
              </label>
              <label className="setting-row">
                <span>{tr('Posição das abas')}</span>
                <Select
                  label={tr('Posição das abas')}
                  value={p.tabsPosition}
                  options={[
                    {
                      value: 'top',
                      label: tr('Superior'),
                    },
                    {
                      value: 'left',
                      label: tr('Lateral esquerda'),
                    },
                    {
                      value: 'right',
                      label: tr('Lateral direita'),
                    },
                  ]}
                  onChange={(value) =>
                    onChange({
                      tabsPosition: value as Preferences['tabsPosition'],
                    })
                  }
                />
              </label>
              <p className="muted small">
                {tr(
                  'Em janelas estreitas, as abas laterais voltam ao topo para preservar o espaço de escrita.',
                )}
              </p>
            </>
          )}
          {section === 'editor' && (
            <>
              <h3>{tr('Um ritmo confortável.')}</h3>
              <label className="setting-row">
                <span>{tr('Fonte da escrita')}</span>
                <Select
                  label={tr('Fonte da escrita')}
                  value={p.fontFamily}
                  options={[
                    {
                      value: 'serif',
                      label: tr('Serifada · Noto Serif'),
                    },
                    {
                      value: 'sans',
                      label: tr('Sem serifa · Ubuntu'),
                    },
                    {
                      value: 'mono',
                      label: tr('Monoespaçada'),
                    },
                  ]}
                  onChange={(value) =>
                    onChange({
                      fontFamily: value as Preferences['fontFamily'],
                    })
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  {tr('Tamanho da fonte')}
                  <small>{p.fontSize} px</small>
                </span>
                <input
                  aria-label={tr('Tamanho da fonte')}
                  type="range"
                  min="12"
                  max="40"
                  value={p.fontSize}
                  onChange={(event) =>
                    onChange({
                      fontSize: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  {tr('Espaçamento entre linhas')}
                  <small>{p.lineHeight.toFixed(2)}</small>
                </span>
                <input
                  aria-label={tr('Espaçamento entre linhas')}
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.05"
                  value={p.lineHeight}
                  onChange={(event) =>
                    onChange({
                      lineHeight: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  {tr('Largura da escrita')}
                  <small>{p.editorWidth} px</small>
                </span>
                <input
                  aria-label={tr('Largura da escrita')}
                  type="range"
                  min="440"
                  max="1100"
                  step="20"
                  value={p.editorWidth}
                  onChange={(event) =>
                    onChange({
                      editorWidth: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  {tr('Zoom')}
                  <small>{p.zoom}%</small>
                </span>
                <input
                  aria-label={tr('Zoom')}
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={p.zoom}
                  onChange={(event) =>
                    onChange({
                      zoom: Number(event.target.value),
                    })
                  }
                />
              </label>
              {toggle(
                'spellcheck',
                tr('Verificação ortográfica'),
                tr('Usa os idiomas disponíveis no sistema.'),
              )}
              {toggle(
                'selectionTools',
                tr('Ferramentas ao selecionar'),
                tr('Revela os botões de formatação na parte de baixo.'),
              )}
            </>
          )}
          {section === 'cursor' && (
            <>
              <h3>{tr('O ponto de partida.')}</h3>
              <p className="muted">{tr('O cursor acompanha a posição real da escrita.')}</p>
              <div className="cursor-options">
                {[
                  {
                    id: 'block',
                    label: tr('Em bloco'),
                    text: tr('O padrão do Entrelinhas.'),
                  },
                  {
                    id: 'thin',
                    label: tr('Fino'),
                    text: tr('Uma linha discreta.'),
                  },
                  {
                    id: 'hidden',
                    label: tr('Invisível'),
                    text: tr('Apenas suas palavras.'),
                  },
                ].map((cursor) => (
                  <button
                    key={cursor.id}
                    className={`cursor-choice ${p.cursor === cursor.id ? 'selected' : ''}`}
                    aria-pressed={p.cursor === cursor.id}
                    onClick={() =>
                      onChange({
                        cursor: cursor.id as Preferences['cursor'],
                      })
                    }
                  >
                    <span className={`cursor-sample ${cursor.id}`}>
                      Entre <i />
                      linhas
                    </span>
                    <strong>{tr(cursor.label)}</strong>
                    <small>{tr(cursor.text)}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {section === 'files' && (
            <>
              <h3>{tr('Suas palavras continuam suas.')}</h3>
              <p className="muted">
                {tr('Documentos são arquivos comuns. Você escolhe quando e onde salvar.')}
              </p>
              <label className="setting-row">
                <span>{tr('Formato de novas notas')}</span>
                <Select
                  label={tr('Formato de novas notas')}
                  value={p.defaultFormat}
                  options={[
                    {
                      value: 'md',
                      label: tr('Markdown (.md)'),
                    },
                    {
                      value: 'txt',
                      label: tr('Texto simples (.txt)'),
                    },
                  ]}
                  onChange={(value) =>
                    onChange({
                      defaultFormat: value as Preferences['defaultFormat'],
                    })
                  }
                />
              </label>
              <DefaultAppControl />
              <div className="info-card">
                {tr(
                  'Imagens ficam em memória até o salvamento. Ao salvar em Markdown, os recursos vão para uma pasta ao lado do documento.',
                )}
              </div>
            </>
          )}
          {section === 'shortcuts' && (
            <>
              <h3>{tr('Ao alcance das mãos.')}</h3>
              <p className="muted">
                {tr('Clique em um atalho para escolher uma nova combinação.')}
              </p>
              {(Object.entries(shortcutLabels) as [ShortcutAction, string][]).map(
                ([action, label]) => (
                  <div key={action} className="setting-row">
                    <span>{tr(label)}</span>
                    <button
                      type="button"
                      className="shortcut-input"
                      data-action={action}
                      aria-label={`${tr('Atalho: {0}', {
                        0: tr(label),
                      })}`}
                      onClick={() => setCapturing(action)}
                    >
                      <kbd>{formatShortcut(p.shortcuts[action])}</kbd>
                    </button>
                  </div>
                ),
              )}
              <p className="muted small">
                {tr('F11 · tela cheia · Esc · alternar modo Zen')}
                <br />
                {tr('Ctrl+Tab · próxima aba · Ctrl+Shift+Tab · aba anterior')}
                <br />
                {tr('Ctrl+T · nova guia · As guias aparecem a partir da segunda nota.')}
              </p>
            </>
          )}
          {section === 'toolbar' && (
            <>
              <h3>{tr('Ferramentas no seu lugar.')}</h3>
              <p className="muted">
                {tr('Escolha onde a barra de formatação acompanha sua escrita.')}
              </p>
              <h4>{tr('Posição da formatação')}</h4>
              <div
                className="toolbar-choices"
                role="group"
                aria-label={tr('Posição da formatação')}
              >
                {(['bottom', 'side'] as const).map((position) => (
                  <button
                    type="button"
                    key={position}
                    data-formatting-position={position}
                    className={p.formattingPosition === position ? 'selected' : ''}
                    aria-pressed={p.formattingPosition === position}
                    onClick={() => onChange({ formattingPosition: position })}
                  >
                    <span
                      className={`toolbar-preview toolbar-preview-${position} projects-${p.sidebarSide}`}
                      aria-hidden="true"
                    >
                      <span className="preview-projects" />
                      <span className="preview-lines">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="preview-tools">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                    <span>{tr(position === 'bottom' ? 'Na parte de baixo' : 'Na lateral')}</span>
                  </button>
                ))}
              </div>
              <p className="muted small">
                {tr('Na lateral, a formatação fica do lado oposto aos projetos.')}
              </p>
              {toggle(
                'zenHideFormatting',
                'Ocultar formatação no modo Zen',
                'Por padrão, as ferramentas continuam disponíveis no modo Zen.',
              )}
            </>
          )}
          {section === 'behavior' && (
            <>
              <h3>{tr('A interface sabe a hora.')}</h3>
              {toggle(
                'autoImmersive',
                tr('Modo Zen automático'),
                tr('Oculta os controles assim que você começa a escrever.'),
              )}
              {toggle(
                'askBeforeDiscard',
                tr('Perguntar antes de descartar'),
                tr('Ao fechar uma aba ou o aplicativo com alterações não salvas.'),
              )}
              <div className="info-card">
                {tr(
                  'Esc alterna o modo Zen quando há texto. Os painéis abertos têm prioridade. Para revelar os controles com o mouse, aproxime o ponteiro da borda da janela.',
                )}
              </div>
              <p className="muted small">
                {tr(
                  'O aplicativo sempre começa com uma nota vazia. Rascunhos descartados não são gravados nem recuperados.',
                )}
              </p>
            </>
          )}
          {section === 'language' && (
            <>
              <h3>{tr('Escolha seu idioma.')}</h3>
              <p className="muted">
                {tr('A interface muda imediatamente. Seus documentos continuam como estão.')}
              </p>
              <LanguageChoices
                value={p.language}
                onChange={(language) =>
                  onChange({
                    language,
                    languageChosen: true,
                  })
                }
              />
            </>
          )}
          {section === 'about' && (
            <div className="about">
              <AppIcon />
              <h3>Entrelinhas</h3>
              <p>{tr('Um espaço tranquilo para escrever.')}</p>
              <span className="version-pill">
                {tr('Versão {version}', {
                  version,
                })}
              </span>
              <p className="muted">
                {tr('Feito com Tauri, React e cuidado.')}
                <br />
                {tr('Local, offline e com salvamento manual.')}
              </p>
              <p className="small muted">{tr('Por Davi Mascarenhas · Licença MIT')}</p>
              <UpdateControl updates={updates} />
            </div>
          )}
        </div>
      </div>
      {capturing && (
        <ShortcutCapture
          action={capturing}
          shortcuts={p.shortcuts}
          onClose={() => setCapturing(null)}
          onSave={(value) =>
            onChange({
              shortcuts: {
                ...p.shortcuts,
                [capturing]: value,
              },
            })
          }
        />
      )}
    </Modal>
  )
}
