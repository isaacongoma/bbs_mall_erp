import type { ExistingImage } from '../extensions/shared/upload-types'

export interface ImageItem {
  type: 'file' | 'existing'
  id: string
  file?: File
  existing?: ExistingImage
  alt?: string
  status?: 'idle' | 'uploading' | 'uploaded' | 'failed'
  error?: string
  uploaded?: ExistingImage
}
