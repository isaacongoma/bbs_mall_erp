export type UploadPrivacy = boolean | 0 | 1 | '0' | '1'

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface UploadOptions {
  private?: boolean
  is_private?: UploadPrivacy
  folder?: string
  file_url?: string
  doctype?: string
  docname?: string
  fieldname?: string
  method?: string
  type?: string
  upload_endpoint?: string
  optimize?: boolean
  max_width?: number
  max_height?: number
  params?: Record<string, string | number | boolean>
  signal?: AbortSignal
  onProgress?: (progress: UploadProgress) => void
}

export interface UploadedFile {
  file_name: string
  file_size: number
  file_url: string
  name?: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  is_private?: 0 | 1
  file_type?: string
  folder?: string
  is_folder?: 0 | 1
  content_hash?: string
}

export interface UploadState {
  uploading: boolean
  progress: number
  uploaded: number
  total: number
  error: Error | null
  result: UploadedFile | null
}

export interface UploadConfig {
  endpoint: string
  getHeaders: () => Record<string, string>
}
