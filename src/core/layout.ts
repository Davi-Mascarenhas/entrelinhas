import type { Preferences } from './types'

type LayoutPreferences = Pick<
  Preferences,
  'sidebarVisible' | 'sidebarWidth' | 'sidebarSide' | 'tabsPosition' | 'editorWidth'
> &
  Partial<Pick<Preferences, 'formattingPosition'>>

export function getWritingLayout(
  windowWidth: number,
  preferences: LayoutPreferences,
  tabsVisible = true,
) {
  const padding = 32
  const minimumWritingWidth = 320
  const sidebarWidth = preferences.sidebarVisible
    ? Math.min(
        preferences.sidebarWidth,
        Math.max(160, (windowWidth - minimumWritingWidth) / 2 - padding),
      )
    : 0
  const tabWidth = tabsVisible ? (windowWidth <= 900 ? 120 : 155) : 0
  let tabsPosition = preferences.tabsPosition
  const edges = (position: Preferences['tabsPosition']) => ({
    left:
      (preferences.sidebarSide === 'left' ? sidebarWidth : 0) +
      (position === 'left' ? tabWidth : 0),
    right:
      (preferences.sidebarSide === 'right' ? sidebarWidth : 0) +
      (position === 'right' ? tabWidth : 0),
  })

  const obstacles = (position: Preferences['tabsPosition']) => {
    const edge = edges(position)
    const dock = preferences.formattingPosition === 'side' ? 72 : 0
    return {
      left: edge.left + (preferences.sidebarSide === 'right' ? dock : 0),
      right: edge.right + (preferences.sidebarSide === 'left' ? dock : 0),
    }
  }
  // As abas laterais voltam ao topo se comprimirem demais a coluna central.
  const preferred = obstacles(tabsPosition)
  if (windowWidth - 2 * (Math.max(preferred.left, preferred.right) + padding) < minimumWritingWidth)
    tabsPosition = 'top'
  const occupied = edges(tabsPosition)
  const room = obstacles(tabsPosition)
  const writingWidth = Math.min(
    preferences.editorWidth,
    windowWidth - 2 * (Math.max(room.left, room.right) + padding),
  )
  const writingLeft = (windowWidth - writingWidth) / 2
  return {
    sidebarWidth,
    tabsPosition,
    writingWidth,
    writingOffset: writingLeft - occupied.left,
    ...occupied,
  }
}
