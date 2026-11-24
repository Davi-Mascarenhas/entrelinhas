import { getWritingLayout } from './layout'
import { defaultPreferences } from './preferences'

describe('coluna de escrita', () => {
  it.each([720, 900, 1180, 1500, 1920])(
    'mantém o centro da janela de %i px sem invadir painéis',
    (width) => {
      for (const sidebarSide of ['left', 'right'] as const) {
        for (const tabsPosition of ['top', 'left', 'right'] as const) {
          for (const sidebarWidth of [200, 244, 380]) {
            const layout = getWritingLayout(width, {
              ...defaultPreferences,
              sidebarSide,
              tabsPosition,
              sidebarWidth,
            })
            const left = layout.left + layout.writingOffset
            expect(left + layout.writingWidth / 2).toBeCloseTo(width / 2)
            expect(left).toBeGreaterThanOrEqual(layout.left + 31)
            expect(left + layout.writingWidth).toBeLessThanOrEqual(width - layout.right - 31)
            expect(layout.writingWidth).toBeGreaterThanOrEqual(320)
            expect(layout.writingWidth).toBeLessThanOrEqual(defaultPreferences.editorWidth)
          }
        }
      }
    },
  )
  it('usa o limite escolhido mesmo sem navegação', () => {
    const layout = getWritingLayout(1920, {
      ...defaultPreferences,
      sidebarVisible: false,
      editorWidth: 600,
    })
    expect(layout.writingWidth).toBe(600)
    expect(layout.writingOffset).toBe(660)
  })
  it('não reserva espaço lateral para guias ocultas', () => {
    const preferences = { ...defaultPreferences, tabsPosition: 'right' as const }
    const hidden = getWritingLayout(1500, preferences, false)
    expect(hidden.right).toBe(0)
    expect(hidden.writingOffset + hidden.left + hidden.writingWidth / 2).toBe(750)
    expect(getWritingLayout(1500, preferences, true).right).toBe(155)
  })
})

it.each([720, 900, 1180, 1920])(
  'reserva espaço para a barra lateral de formatação em %i px e mantém o texto centralizado',
  (width) => {
    for (const sidebarSide of ['left', 'right'] as const)
      for (const tabsPosition of ['top', 'left', 'right'] as const) {
        const preferences = {
          ...defaultPreferences,
          sidebarSide,
          tabsPosition,
          formattingPosition: 'side' as const,
        }
        const layout = getWritingLayout(width, preferences, true)
        const x = layout.left + layout.writingOffset
        expect(x + layout.writingWidth / 2).toBeCloseTo(width / 2)
        expect(layout.writingWidth).toBeGreaterThanOrEqual(320)
        if (sidebarSide === 'right') expect(x).toBeGreaterThanOrEqual(103)
        else expect(x + layout.writingWidth).toBeLessThanOrEqual(width - 103)
      }
  },
)

it.each([720, 920, 1180, 1920])(
  'libera projetos e guias no Zen em %i px e restaura a coluna ao sair',
  (width) => {
    for (const sidebarSide of ['left', 'right'] as const)
      for (const tabsPosition of ['top', 'left', 'right'] as const)
        for (const formattingPosition of ['bottom', 'side'] as const) {
          const preferences = Object.freeze({
            ...defaultPreferences,
            sidebarSide,
            tabsPosition,
            formattingPosition,
          })
          const normal = getWritingLayout(width, preferences, true)
          const zen = getWritingLayout(width, preferences, true, true)
          const dock = formattingPosition === 'side' ? 72 : 0
          expect(zen.writingWidth).toBe(Math.min(preferences.editorWidth, width - 2 * (dock + 56)))
          expect(zen.sidebarWidth).toBe(0)
          expect(zen.writingWidth).toBeGreaterThanOrEqual(normal.writingWidth)
          expect(zen.writingOffset + zen.writingWidth / 2).toBeCloseTo(width / 2)
          expect(getWritingLayout(width, preferences, true)).toEqual(normal)
          expect(preferences.sidebarVisible).toBe(true)
        }
  },
)

it('libera também a reserva da formatação oculta no Zen', () => {
  const preferences = {
    ...defaultPreferences,
    formattingPosition: 'side' as const,
    zenHideFormatting: true,
  }
  expect(getWritingLayout(720, preferences, true, true).writingWidth).toBe(608)
})

it('respeita o recuo Zen escolhido, preserva a largura mínima e não altera o modo normal', () => {
  for (const width of [720, 1180])
    for (const zenSideMargin of [16, 56, 100, 200]) {
      const p = { ...defaultPreferences, zenSideMargin, formattingPosition: 'side' as const }
      const normal = getWritingLayout(width, p, true)
      const zen = getWritingLayout(width, p, true, true)
      const inset = Math.min(zenSideMargin, (width - 320) / 2 - 72)
      expect(zen.writingWidth).toBe(Math.min(p.editorWidth, width - 2 * (inset + 72)))
      expect(zen.writingWidth).toBeGreaterThanOrEqual(320)
      expect(zen.writingOffset + zen.writingWidth / 2).toBe(width / 2)
      expect(getWritingLayout(width, { ...p, zenSideMargin: 16 }, true)).toEqual(normal)
    }
})
