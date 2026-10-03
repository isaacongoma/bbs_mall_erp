import type { Listener } from './types'

export class Observable {
  private readonly listeners = new Set<Listener>()
  private versionCounter = 0

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getVersion = (): number => this.versionCounter

  readonly touch = (): void => this.notify()

  protected notify(): void {
    this.versionCounter += 1
    for (const listener of [...this.listeners]) listener()
  }

  protected forward(source: Observable): void {
    source.subscribe(() => this.notify())
  }
}

export class ObservableValue<T> extends Observable {
  private current: T

  constructor(initial: T) {
    super()
    this.current = initial
  }

  get value(): T {
    return this.current
  }

  readonly set = (next: T): void => {
    this.current = next
    this.notify()
  }
}
