import { useCallback, useState } from 'react'
import type { UploadOptions, UploadState } from '../types/upload'
import { initialUploadState, uploadFile } from '../utils/upload'

export type { UploadedFile, UploadOptions, UploadState } from '../types/upload'

export function useFileUpload() {
  const [state, setState] = useState<UploadState>(initialUploadState)

  const reset = useCallback(() => setState(initialUploadState()), [])

  const upload = useCallback(
    (file: File, options?: UploadOptions) =>
      uploadFile(file, options, (patch) => setState((previous) => ({ ...previous, ...patch }))),
    [],
  )

  return {
    upload,
    reset,
    state,
    isUploading: state.uploading,
    progress: state.progress,
    error: state.error,
    result: state.result,
  }
}
