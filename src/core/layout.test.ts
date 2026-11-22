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
