import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { Button } from './Button'
import { uploadFile } from '../utils/upload'
import type { UploadedFile, UploadOptions } from '../types/upload'

export type FileUploaderValidationResult = string | Error | null | undefined | void

export interface FileUploaderSlotProps {
  file: File | null
  uploading: boolean
  progress: number
  uploaded: number
  total: number
  message: string
  error: unknown
  success: boolean
  openFileSelector: () => void
}

export interface FileUploaderHandle {
  inputRef: () => HTMLInputElement | null
}

export interface FileUploaderProps {
  fileTypes?: string | string[]
  uploadArgs?: UploadOptions
  validateFile?: (file: File) => FileUploaderValidationResult | Promise<FileUploaderValidationResult>
  onSuccess?: (data: UploadedFile) => void
  onFailure?: (error: unknown) => void
  children?: ReactNode | ((props: FileUploaderSlotProps) => ReactNode)
  ref?: Ref<FileUploaderHandle>
}

interface UploadViewState {
  file: File | null
  uploading: boolean
  uploaded: number
  total: number
  error: unknown
  finished: boolean
}

const INITIAL: UploadViewState = { file: null, uploading: false, uploaded: 0, total: 0, error: null, finished: false }

function errorMessageOf(failure: unknown): string {
  if (failure instanceof Error && failure.message) return failure.message
  const response = failure as { message?: string; _server_messages?: string; exc?: string } | null
  if (response?.message) return response.message
  if (response?._server_messages) {
    try {
      return JSON.parse(JSON.parse(response._server_messages)[0]).message
    } catch {
      return 'Error Uploading File'
    }
  }
  if (response?.exc) {
    try {
      return JSON.parse(response.exc)[0].split('\n').slice(-2, -1)[0]
    } catch {
      return 'Error Uploading File'
    }
  }
  return 'Error Uploading File'
}

export function FileUploader({
  fileTypes,
  uploadArgs,
  validateFile,
  onSuccess,
  onFailure,
  children,
  ref,
}: FileUploaderProps) {
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [view, setView] = useState<UploadViewState>(INITIAL)
  const latest = useRef({ validateFile, onSuccess, onFailure, uploadArgs })

  useImperativeHandle(ref, () => ({ inputRef: () => input }), [input])

  const accept = Array.isArray(fileTypes) ? fileTypes.join(',') : fileTypes
  const progress = view.total ? Math.floor((view.uploaded / view.total) * 100) : 0
  const success = view.finished && !view.error

  const openFileSelector = useCallback(() => input?.click(), [input])

  const upload = async (selected: File) => {
    const args = latest.current.uploadArgs ?? {}
    const options: UploadOptions =
      args.private !== undefined || args.is_private !== undefined ? args : { ...args, private: true }
    setView({ ...INITIAL, file: selected })
    try {
      const data = await uploadFile(selected, {
        ...options,
        onProgress: ({ loaded, total }) =>
          setView((previous) => ({ ...previous, uploading: true, uploaded: loaded, total })),
      })
      setView((previous) => ({ ...previous, uploading: false, finished: true }))
      latest.current.onSuccess?.(data)
    } catch (failure) {
      setView((previous) => ({ ...previous, uploading: false, error: errorMessageOf(failure) }))
      latest.current.onFailure?.(failure)
    }
  }

  const onFileAdd = async (selected: File | null) => {
    latest.current = { validateFile, onSuccess, onFailure, uploadArgs }
    setView({ ...INITIAL, file: selected })
    if (!selected) return
    let validationError: FileUploaderValidationResult
    try {
      validationError = await validateFile?.(selected)
    } catch (failure) {
      validationError = failure as Error
    }
    if (validationError) {
      setView((previous) => ({ ...previous, error: validationError }))
      return
    }
    await upload(selected)
  }

  const slotProps: FileUploaderSlotProps = {
    file: view.file,
    uploading: view.uploading,
    progress,
    uploaded: view.uploaded,
    total: view.total,
    message: '',
    error: view.error,
    success,
    openFileSelector,
  }

  return (
    <div>
      <input
        ref={setInput}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null
          void onFileAdd(selected)
          event.target.value = ''
        }}
      />
      {typeof children === 'function'
        ? children(slotProps)
        : (children ?? (
            <Button onClick={openFileSelector} loading={view.uploading}>
              {view.uploading ? `Uploading ${progress}%` : 'Upload File'}
            </Button>
          ))}
    </div>
  )
}
