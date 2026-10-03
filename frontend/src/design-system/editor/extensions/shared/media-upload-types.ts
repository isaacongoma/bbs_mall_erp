import type { Editor } from '@tiptap/core'
import type { UploadedFile as BaseUploadedFile } from '../../../types/upload'
import type { MediaDimensions } from './media-dimensions'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaUpload: {
      uploadVideoFiles: (files: File[], pos?: number | null) => ReturnType
      replaceImage: (pos: number, file: File) => ReturnType
      replaceVideo: (pos: number, file: File) => ReturnType
      setVideoOptions: (options: { autoplay?: boolean; loop?: boolean; muted?: boolean }) => ReturnType
    }
  }
}

export interface UploadedFile extends Partial<BaseUploadedFile> {
  file_url: string
  width?: number | null
  height?: number | null
}

export interface MediaUploadProgress {
  loaded: number
  total: number
  percent: number
}

export interface MediaUploadRequestOptions {
  signal?: AbortSignal
  onProgress?: (progress: MediaUploadProgress) => void
}

export type UploadFunction = (file: File, options?: MediaUploadRequestOptions) => Promise<UploadedFile>

export interface MediaUploadOptions {
  uploadFunction?: UploadFunction | null
  HTMLAttributes?: Record<string, unknown>
  [k: string]: unknown
}

export interface UploadResult {
  success: boolean
  file?: UploadedFile
  error?: Error
}

export interface MediaUploadConfig {
  nodeName: 'image' | 'video'
  probeDimensions: (src: string) => Promise<MediaDimensions>
  accept: RegExp
  storeBase64: boolean
}

export type InsertMode = 'insert' | 'replace'

export interface MediaUploadEngine {
  uploadOne(file: File, editor: Editor, options: MediaUploadOptions): Promise<void>
  uploadReplace(
    file: File,
    editor: Editor,
    pos: number,
    options: MediaUploadOptions,
    attrs?: Record<string, unknown>,
  ): Promise<void>
  reupload(editor: Editor, pos: number, options: MediaUploadOptions): Promise<void>
  processMultiple(files: File[], editor: Editor, pos: number | null, options: MediaUploadOptions): Promise<void>
  findInsertPosition(editor: Editor): number
  updateNodeWithDimensions(editor: Editor, pos: number, dims: MediaDimensions): void
  findNodeBySource(editor: Editor, src: string, uploadId?: string): number | null
}
