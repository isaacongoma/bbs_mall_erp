import { useSyncExternalStore } from 'react'
import {
  getUploadProgress,
  subscribeUploadProgress,
  type UploadProgressEntry,
} from '../extensions/shared/media-upload-state'

export function useUploadProgress(uploadId: string | null | undefined): UploadProgressEntry | undefined {
  return useSyncExternalStore(
    subscribeUploadProgress,
    () => (uploadId ? getUploadProgress(uploadId) : undefined),
    () => undefined,
  )
}
