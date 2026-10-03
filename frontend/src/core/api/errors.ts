export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]
  readonly excType: string | null

  constructor(message: string, status: number, messages: string[] = [], excType: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
    this.excType = excType
  }

  get isAuthError() {
    return this.status === 401 || this.excType === 'AuthenticationError'
  }

  get isPermissionError() {
    return this.status === 403 || this.excType === 'PermissionError'
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages[0] ?? error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}
