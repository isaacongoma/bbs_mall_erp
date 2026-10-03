import { create } from 'zustand'
import { createDialog } from '@/design-system'

export interface SocketClient {
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler?: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => void
  connected: boolean
}

export function initSocket(): SocketClient {
  return {
    on() {
      return undefined
    },
    off() {
      return undefined
    },
    emit() {
      return undefined
    },
    connected: false,
  }
}

type MakeCall = (number: string) => void

interface GlobalState {
  $dialog: typeof createDialog
  $socket: SocketClient
  callMethod: MakeCall
  setMakeCall: (value: MakeCall) => void
  makeCall: (number: string) => void
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  $dialog: createDialog,
  $socket: initSocket(),
  callMethod: () => undefined,
  setMakeCall: (value) => set({ callMethod: value }),
  makeCall: (number) => get().callMethod(number),
}))
