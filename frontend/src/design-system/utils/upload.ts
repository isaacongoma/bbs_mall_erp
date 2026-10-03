import type { UploadConfig, UploadedFile, UploadOptions, UploadPrivacy, UploadState } from '../types/upload'
import { fileSizeLimitMessage, formatBytes, getMaxFileSize } from './fileSize'

let config: UploadConfig = { endpoint: '/api/method/upload_file', getHeaders: () => ({}) }

export function configureUpload(next: Partial<UploadConfig>) {
  config = { ...config, ...next }
}

export function isPrivateUpload(options: Pick<UploadOptions, 'private' | 'is_private'> = {}): boolean {
  if (options.private !== undefined) return options.private
  const value: UploadPrivacy | undefined = options.is_private
  return value === true || value === 1 || value === '1'
}

interface ServerErrorPayload {
  _server_messages?: string
  _error_message?: string
  message?: string
  exc_type?: string
  detail?: string
}

function parseServerMessages(error: ServerErrorPayload): string[] {
  if (!error._server_messages) return []
  try {
    const parsed = JSON.parse(error._server_messages) as string[]
    return parsed
      .map((message) => {
        try {
          return (JSON.parse(message) as { message?: string }).message ?? message
        } catch {
          return message
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function extractUploadErrorMessage(error: ServerErrorPayload | string): string {
  if (typeof error === 'string') return error
  const messages = parseServerMessages(error)
  if (messages.length) return messages.join('\n')
  if (error._error_message) return error._error_message
  if (error.detail) return error.detail
  if (error.message) return error.message
  if (error.exc_type === 'MaxFileSizeReachedError') {
    const limit = getMaxFileSize()
    return limit
      ? `File size exceeded the maximum allowed size of ${formatBytes(limit)}.`
      : 'File size exceeds the maximum allowed limit.'
  }
  return 'Upload failed'
}

export function initialUploadState(): UploadState {
  return { uploading: false, progress: 0, uploaded: 0, total: 0, error: null, result: null }
}

export type UploadStateListener = (patch: Partial<UploadState>) => void

export function uploadFile(
  file: File | null,
  options: UploadOptions = {},
  onState: UploadStateListener = () => undefined,
): Promise<UploadedFile> {
  const limitMessage = file ? fileSizeLimitMessage(file) : null
  if (limitMessage) {
    const error = new Error(limitMessage)
    onState({ ...initialUploadState(), error })
    return Promise.reject(error)
  }
  onState({ ...initialUploadState(), uploading: true })

  return new Promise<UploadedFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => options.signal?.removeEventListener('abort', abort)

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return
      const percent = Math.round((event.loaded / event.total) * 100)
      onState({ uploaded: event.loaded, total: event.total, progress: percent })
      options.onProgress?.({ loaded: event.loaded, total: event.total, percent })
    })
    xhr.upload.addEventListener('load', () => onState({ progress: 100 }))

    xhr.addEventListener('error', () => {
      cleanup()
      const error = new Error('Upload failed')
      onState({ uploading: false, error })
      reject(error)
    })

    xhr.addEventListener('abort', () => {
      cleanup()
      onState({ uploading: false, error: new Error('Upload cancelled') })
      reject(new DOMException('Upload cancelled', 'AbortError'))
    })

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE || xhr.status === 0) return
      cleanup()
      let payload: unknown
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = xhr.responseText
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = payload as { message?: UploadedFile } & UploadedFile
        const result = (body.message ?? body) as UploadedFile
        onState({ uploading: false, result })
        resolve(result)
        return
      }
      const error = new Error(
        xhr.status === 413
          ? extractUploadErrorMessage({ exc_type: 'MaxFileSizeReachedError' })
          : extractUploadErrorMessage(payload as ServerErrorPayload | string),
      )
      onState({ uploading: false, error })
      reject(error)
    }

    xhr.open('POST', options.upload_endpoint || config.endpoint, true)
    xhr.setRequestHeader('Accept', 'application/json')
    for (const [name, value] of Object.entries(config.getHeaders())) xhr.setRequestHeader(name, value)

    const form = new FormData()
    if (file) form.append('file', file, file.name)
    form.append('is_private', isPrivateUpload(options) ? '1' : '0')
    form.append('folder', options.folder || 'Home')
    if (options.file_url) form.append('file_url', options.file_url)
    if (options.doctype) form.append('doctype', options.doctype)
    if (options.docname) form.append('docname', options.docname)
    if (options.fieldname) form.append('fieldname', options.fieldname)
    if (options.method) form.append('method', options.method)
    if (options.type) form.append('type', options.type)
    if (options.optimize) {
      form.append('optimize', '1')
      if (options.max_width) form.append('max_width', String(options.max_width))
      if (options.max_height) form.append('max_height', String(options.max_height))
    }
    for (const [key, value] of Object.entries(options.params ?? {})) form.append(key, String(value))
    xhr.send(form)
  })
}
