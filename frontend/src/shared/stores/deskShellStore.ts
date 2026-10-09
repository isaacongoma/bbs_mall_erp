import { create } from 'zustand'

interface DeskShellState {
  activeApp: string
  activeShell: string
  setApp: (app: string, shell?: string) => void
  setShell: (shell: string) => void
}

function read(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

export const useDeskShellStore = create<DeskShellState>((set) => ({
  activeApp: read('desk-active-app', 'erpnext'),
  activeShell: read('desk-active-shell', ''),
  setApp(app, shell) {
    write('desk-active-app', app)
    if (shell !== undefined) write('desk-active-shell', shell)
    set((state) => ({ activeApp: app, activeShell: shell ?? state.activeShell }))
  },
  setShell(shell) {
    write('desk-active-shell', shell)
    set({ activeShell: shell })
  },
}))
