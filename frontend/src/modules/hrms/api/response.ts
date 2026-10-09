export interface MethodEnvelope<T> {
  message?: T
}

export function unwrapMessage<T>(value: unknown): T {
  if (value && typeof value === 'object' && 'message' in value) {
    return (value as MethodEnvelope<T>).message as T
  }
  return value as T
}
