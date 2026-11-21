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
} from 'lucide-react'
import { ThemeChoices } from './ThemeChoices'
import { AppIcon } from './AppIcon'
import { DefaultAppControl } from './DefaultAppControl'
import { UpdateControl } from './UpdateControl'
import type { UpdatesController } from '../native/useUpdates'
import { Modal } from './ui'
import { Select } from './Select'
import { eventShortcut } from '../core/shortcuts'
import type { Preferences, ShortcutAction } from '../core/types'

const sections = [
  { id: 'appearance', label: 'Aparência', icon: Paintbrush },
  { id: 'editor', label: 'Editor', icon: Type },
  { id: 'cursor', label: 'Cursor', icon: MousePointer2 },
  { id: 'files', label: 'Arquivos', icon: FileText },
  { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
  { id: 'behavior', label: 'Comportamento', icon: SlidersHorizontal },
  { id: 'about', label: 'Sobre', icon: Info },
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
    [shortcutError, setShortcutError] = useState('')
  const toggle = (
    key: 'autoImmersive' | 'askBeforeDiscard' | 'spellcheck' | 'selectionTools',
    title: string,
    description: string,
  ) => (
    <label className="setting-row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        className="switch"
        type="checkbox"
        checked={p[key]}
        onChange={(event) => onChange({ [key]: event.target.checked })}
      />
    </label>
  )
  return (
    <Modal title="Configurações" onClose={onClose} wide>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Categorias de configurações">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? 'selected' : ''}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {section === 'appearance' && (
            <>
              <h3>Seu espaço, sua luz.</h3>
              <p className="muted">Escolha a atmosfera que acompanha sua escrita.</p>
              <ThemeChoices
                value={p.theme}
                onChange={(theme) => onChange({ theme, themeChosen: true })}
              />
              <h4>Layout</h4>
              <label className="setting-row">
                <span>Posição da navegação</span>
                <Select
                  label="Posição da navegação"
                  value={p.sidebarSide}
                  options={[
                    { value: 'left', label: 'Esquerda' },
                    { value: 'right', label: 'Direita' },
                  ]}
                  onChange={(value) =>
                    onChange({ sidebarSide: value as Preferences['sidebarSide'] })
                  }
                />
              </label>
              <label className="setting-row">
                <span>Posição das abas</span>
                <Select
                  label="Posição das abas"
                  value={p.tabsPosition}
                  options={[
                    { value: 'top', label: 'Superior' },
                    { value: 'left', label: 'Lateral esquerda' },
                    { value: 'right', label: 'Lateral direita' },
                  ]}
                  onChange={(value) =>
                    onChange({ tabsPosition: value as Preferences['tabsPosition'] })
                  }
                />
              </label>
              <p className="muted small">
                Em janelas estreitas, as abas laterais voltam ao topo para preservar o espaço de
                escrita.
              </p>
            </>
          )}
          {section === 'editor' && (
            <>
              <h3>Um ritmo confortável.</h3>
              <label className="setting-row">
                <span>Fonte da escrita</span>
                <Select
                  label="Fonte da escrita"
                  value={p.fontFamily}
                  options={[
                    { value: 'serif', label: 'Serifada · Noto Serif' },
                    { value: 'sans', label: 'Sem serifa · Ubuntu' },
                    { value: 'mono', label: 'Monoespaçada' },
                  ]}
                  onChange={(value) => onChange({ fontFamily: value as Preferences['fontFamily'] })}
                />
              </label>
              <label className="setting-row">
                <span>
                  Tamanho da fonte <small>{p.fontSize} px</small>
                </span>
                <input
                  aria-label="Tamanho da fonte"
                  type="range"
                  min="12"
                  max="40"
                  value={p.fontSize}
                  onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
                />
              </label>
              <label className="setting-row">
                <span>
                  Espaçamento entre linhas <small>{p.lineHeight.toFixed(2)}</small>
                </span>
                <input
                  aria-label="Espaçamento entre linhas"
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.05"
                  value={p.lineHeight}
                  onChange={(event) => onChange({ lineHeight: Number(event.target.value) })}
                />
              </label>
              <label className="setting-row">
                <span>
                  Largura da escrita <small>{p.editorWidth} px</small>
                </span>
                <input
                  aria-label="Largura da escrita"
                  type="range"
                  min="440"
                  max="1100"
                  step="20"
                  value={p.editorWidth}
                  onChange={(event) => onChange({ editorWidth: Number(event.target.value) })}
                />
              </label>
              <label className="setting-row">
                <span>
                  Zoom <small>{p.zoom}%</small>
                </span>
                <input
                  aria-label="Zoom"
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={p.zoom}
                  onChange={(event) => onChange({ zoom: Number(event.target.value) })}
                />
              </label>
              {toggle(
                'spellcheck',
                'Verificação ortográfica',
                'Usa os idiomas disponíveis no sistema.',
              )}
              {toggle(
                'selectionTools',
                'Ferramentas ao selecionar',
                'Revela os botões de formatação na parte de baixo.',
              )}
            </>
          )}
          {section === 'cursor' && (
            <>
              <h3>O ponto de partida.</h3>
              <p className="muted">O cursor acompanha a posição real da escrita.</p>
              <div className="cursor-options">
                {[
                  { id: 'block', label: 'Em bloco', text: 'O padrão do Entrelinhas.' },
                  { id: 'thin', label: 'Fino', text: 'Uma linha discreta.' },
                  { id: 'hidden', label: 'Invisível', text: 'Apenas suas palavras.' },
                ].map((cursor) => (
                  <button
                    key={cursor.id}
                    className={`cursor-choice ${p.cursor === cursor.id ? 'selected' : ''}`}
                    aria-pressed={p.cursor === cursor.id}
                    onClick={() => onChange({ cursor: cursor.id as Preferences['cursor'] })}
                  >
                    <span className={`cursor-sample ${cursor.id}`}>
                      Entre <i />
                      linhas
                    </span>
                    <strong>{cursor.label}</strong>
                    <small>{cursor.text}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {section === 'files' && (
            <>
              <h3>Suas palavras continuam suas.</h3>
              <p className="muted">
                Documentos são arquivos comuns. Você escolhe quando e onde salvar.
              </p>
              <label className="setting-row">
                <span>Formato de novas notas</span>
                <Select
                  label="Formato de novas notas"
                  value={p.defaultFormat}
                  options={[
                    { value: 'md', label: 'Markdown (.md)' },
                    { value: 'txt', label: 'Texto simples (.txt)' },
                  ]}
                  onChange={(value) =>
                    onChange({ defaultFormat: value as Preferences['defaultFormat'] })
                  }
                />
              </label>
              <DefaultAppControl />
              <div className="info-card">
                Imagens ficam em memória até o salvamento. Ao salvar em Markdown, os recursos vão
                para uma pasta ao lado do documento.
              </div>
            </>
          )}
          {section === 'shortcuts' && (
            <>
              <h3>Ao alcance das mãos.</h3>
              <p className="muted">Clique em um atalho e pressione a nova combinação com Ctrl.</p>
              {(
                Object.entries({
                  new: 'Nova nota',
                  open: 'Abrir documento',
                  save: 'Salvar',
                  saveAs: 'Salvar como',
                  close: 'Fechar aba',
                  find: 'Pesquisar',
                  replace: 'Substituir',
                  immersive: 'Modo imersivo',
                }) as [ShortcutAction, string][]
              ).map(([action, label]) => (
                <label key={action} className="setting-row">
                  <span>{label}</span>
                  <input
                    className="shortcut-input"
                    aria-label={`Atalho: ${label}`}
                    readOnly
                    value={p.shortcuts[action]}
                    onKeyDown={(event) => {
                      if (event.key === 'Tab' || event.key === 'Escape') return
                      event.preventDefault()
                      event.stopPropagation()
                      const shortcut = eventShortcut(event.nativeEvent)
                      if (!shortcut) return
                      const reserved = [
                        'Ctrl+B',
                        'Ctrl+I',
                        'Ctrl+U',
                        'Ctrl+Z',
                        'Ctrl+Shift+Z',
                        'Ctrl+C',
                        'Ctrl+V',
                        'Ctrl+X',
                        'Ctrl+A',
                        'Ctrl+T',
                        'Ctrl+TAB',
                        'Ctrl+Shift+TAB',
                        'Ctrl+Q',
                        'Ctrl+L',
                        'Ctrl+R',
                        'Ctrl+P',
                      ]
                      if (
                        !/^Ctrl\+(Shift\+)?(Alt\+)?[A-Z0-9]$/.test(shortcut) ||
                        reserved.includes(shortcut) ||
                        Object.entries(p.shortcuts).some(
                          ([key, value]) => key !== action && value === shortcut,
                        )
                      ) {
                        setShortcutError(
                          'Escolha uma combinação com Ctrl que ainda esteja disponível.',
                        )
                        return
                      }
                      setShortcutError('')
                      onChange({ shortcuts: { ...p.shortcuts, [action]: shortcut } })
                    }}
                  />
                </label>
              ))}
              {shortcutError && (
                <p role="alert" className="error-text">
                  {shortcutError}
                </p>
              )}
              <p className="muted small">
                F11 · tela cheia &nbsp; Esc · revelar controles
                <br />
                Ctrl+Tab · próxima aba &nbsp; Ctrl+Shift+Tab · aba anterior
                <br />
                Ctrl+T · nova guia · As guias aparecem a partir da segunda nota.
              </p>
            </>
          )}
          {section === 'behavior' && (
            <>
              <h3>A interface sabe a hora.</h3>
              {toggle(
                'autoImmersive',
                'Imersão automática',
                'Oculta os controles assim que você começa a escrever.',
              )}
              {toggle(
                'askBeforeDiscard',
                'Perguntar antes de descartar',
                'Ao fechar uma aba ou o aplicativo com alterações não salvas.',
              )}
              <div className="info-card">
                Esc revela os controles. Para acessá-los com o mouse, mantenha o ponteiro junto à
                borda superior ou à borda da navegação por um instante.
              </div>
              <p className="muted small">
                O aplicativo sempre começa com uma nota vazia. Rascunhos descartados não são
                gravados nem recuperados.
              </p>
            </>
          )}
          {section === 'about' && (
            <div className="about">
              <AppIcon />
              <h3>Entrelinhas</h3>
              <p>Um espaço tranquilo para escrever.</p>
              <span className="version-pill">Versão {version}</span>
              <p className="muted">
                Feito com Tauri, React e cuidado.
                <br />
                Local, offline e com salvamento manual.
              </p>
              <p className="small muted">Por Bit-Devy · Licença MIT</p>
              <UpdateControl updates={updates} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
