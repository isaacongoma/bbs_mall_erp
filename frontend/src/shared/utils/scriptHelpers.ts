import { __ } from '@/core/i18n'

export function getClassNames(script: string): string[] {
  const withoutComments = script.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return [...withoutComments.matchAll(/class\s+([A-Za-z0-9_]+)/g)].map((match) => match[1] ?? '')
}

type DocSource<T extends object> = (() => T | null | undefined) | T

export function createDocProxy<T extends object>(
  source: DocSource<T>,
  instance: Record<string, any>,
  childInstance: Record<string, any> | null = null,
  onSet?: (prop: string | symbol, value: unknown) => void,
): T {
  const getCurrentData = (): T | null | undefined => (typeof source === 'function' ? (source as () => T)() : source)

  return new Proxy({} as T, {
    get(_target, prop) {
      const currentDocData = getCurrentData()
      if (!currentDocData) return undefined

      if (prop === 'trigger') {
        if ('trigger' in currentDocData) {
          console.warn(
            __('⚠️ Avoid using "trigger" as a field name — it conflicts with the built-in trigger() method.'),
          )
        }
        return (methodName: string, ...args: unknown[]) => {
          const method = instance[methodName]
          if (typeof method === 'function') return method.apply(instance, args)
          console.warn(__('⚠️ Method "{0}" not found in class.', [methodName]))
          return undefined
        }
      }

      if (prop === 'getRow') {
        return instance.getRow.bind(childInstance || instance._childInstances || instance)
      }

      return (currentDocData as Record<string | symbol, unknown>)[prop]
    },
    set(_target, prop, value) {
      const currentDocData = getCurrentData()
      if (!currentDocData) return false
      if (onSet) onSet(prop, value)
      else (currentDocData as Record<string | symbol, unknown>)[prop] = value
      return true
    },
    has(_target, prop) {
      const currentDocData = getCurrentData()
      if (!currentDocData) return false
      return prop in currentDocData
    },
    ownKeys() {
      const currentDocData = getCurrentData()
      if (!currentDocData) return []
      return Reflect.ownKeys(currentDocData)
    },
    getOwnPropertyDescriptor(_target, prop) {
      const currentDocData = getCurrentData()
      if (!currentDocData) return undefined
      return Reflect.getOwnPropertyDescriptor(currentDocData, prop)
    },
  })
}
