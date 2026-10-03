export function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    ''
  if (/Mac|iPod|iPhone|iPad/i.test(platform)) return true
  return /Mac OS X|Macintosh|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export interface Part {
  raw: string
  type: 'cmd' | 'ctrl' | 'shift' | 'alt' | 'win' | 'key'
  display: string
}

const keyMap: Record<string, string> = {
  esc: 'Esc',
  escape: 'Esc',
  enter: '↵',
  return: '↵',
  space: 'Space',
  ' ': 'Space',
  tab: 'Tab',
  plus: '+',
  '=': '+',
  backspace: '⌫',
  delete: '⌦',
  del: '⌦',
  up: '↑',
  arrowup: '↑',
  down: '↓',
  arrowdown: '↓',
  left: '←',
  arrowleft: '←',
  right: '→',
  arrowright: '→',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  home: 'Home',
  end: 'End',
}

export const keyIconMap: Record<string, string> = {
  '↑': 'arrow-up',
  '↓': 'arrow-down',
  '←': 'arrow-left',
  '→': 'arrow-right',
  '↵': 'corner-down-left',
  '⌫': 'delete',
  '⌦': 'arrow-big-right-dash',
}

export const wordMap: Record<string, string> = {
  '⌘': 'Command',
  Shift: 'Shift',
  '⌥': 'Option',
  Alt: 'Alt',
  Ctrl: 'Control',
  Win: 'Windows',
  '↵': 'Enter',
  '⌫': 'Backspace',
  '⌦': 'Delete',
  '↑': 'Up Arrow',
  '↓': 'Down Arrow',
  '←': 'Left Arrow',
  '→': 'Right Arrow',
}

export function parseCombo(raw: string | undefined, isMac: boolean): Part[] {
  if (!raw) return []
  const aliases: Record<string, Part['type']> = {
    mod: isMac ? 'cmd' : 'ctrl',
    command: 'cmd',
    cmd: 'cmd',
    '⌘': 'cmd',
    control: 'ctrl',
    ctrl: 'ctrl',
    option: 'alt',
    opt: 'alt',
    alt: 'alt',
    '⌥': 'alt',
    shift: 'shift',
    '⇧': 'shift',
    meta: isMac ? 'cmd' : 'win',
    win: 'win',
    windows: 'win',
  }

  return raw
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((original) => {
      const lower = original.toLowerCase()
      const type = aliases[lower] ?? 'key'
      let display = original
      if (type === 'cmd') display = '⌘'
      else if (type === 'shift') display = 'Shift'
      else if (type === 'alt') display = isMac ? '⌥' : 'Alt'
      else if (type === 'ctrl') display = 'Ctrl'
      else if (type === 'win') display = 'Win'
      else if (keyMap[lower]) display = keyMap[lower]
      else if (/^[a-z]$/.test(lower)) display = lower.toUpperCase()
      else if (/^f\d{1,2}$/i.test(original)) display = original.toUpperCase()
      return { raw: original, type, display }
    })
}
