import type { Editor } from '@tiptap/core'
import fileToBase64 from '../../../utils/fileToBase64'
import { fileSizeLimitMessage } from '../../../utils/fileSize'
import { isSafeUrl } from './url-safety'
import { findNodeByUploadId } from './node-view'
import {
  deleteLocalFile,
  deleteUploadProgress,
  getLocalFile,
  setUploadProgress,
  setLocalFile,
  updateLocalFile,
  updateUploadProgress,
} from './media-upload-state'
import { createUploadId } from './upload-id'
import {
  applyUploadError,
  applyUploadSuccess,
  backfillDimensions,
  findNodeBySource,
  insertPlaceholder,
  removeNodeByUploadId,
  type OptionalDimensions,
} from './media-node-ops'
import type {
  InsertMode,
  MediaUploadConfig,
  MediaUploadEngine,
  MediaUploadOptions,
  MediaUploadRequestOptions,
  UploadedFile,
  UploadResult,
} from './media-upload-types'

export type {
  MediaUploadConfig,
  MediaUploadEngine,
  MediaUploadOptions,
  MediaUploadRequestOptions,
  UploadFunction,
  UploadedFile,
  UploadResult,
} from './media-upload-types'

export function resolveUploadOptions(
  raw: Partial<MediaUploadOptions> & {
    editor?: { storage?: unknown } | null
  } = {},
): MediaUploadOptions {
  const { editor, ...options } = raw
  const storage = editor?.storage as Record<string, unknown> | undefined
  const uploadStorage = storage?.upload as { uploadFunction?: MediaUploadOptions['uploadFunction'] } | undefined
  return {
    ...options,
    uploadFunction: options.uploadFunction ?? uploadStorage?.uploadFunction ?? null,
  }
}

export async function uploadFile(
  file: File,
  options: MediaUploadOptions,
  requestOptions?: MediaUploadRequestOptions,
): Promise<UploadedFile> {
  if (!options.uploadFunction) {
    throw new Error('uploadFunction option is not provided')
  }
  const uploaded = await options.uploadFunction(file, requestOptions)
  if (!uploaded?.file_url || !isSafeUrl(uploaded.file_url, { base: window.location.origin })) {
    throw new Error('Upload returned no file URL')
  }
  return uploaded
}

export async function uploadFilesParallel(
  files: File[],
  options: MediaUploadOptions,
  hooks?: { onProgress?: (done: number, total: number) => void },
): Promise<UploadResult[]> {
  const total = files.length
  let done = 0
  return Promise.all(
    files.map(async (file): Promise<UploadResult> => {
      try {
        const uploaded = await uploadFile(file, options)
        return { success: true, file: uploaded }
      } catch (error) {
        return { success: false, error: error as Error }
      } finally {
        done += 1
        hooks?.onProgress?.(done, total)
      }
    }),
  )
}

export async function dataUrlOrBlobToFile(src: string, filename: string): Promise<File> {
  const response = await fetch(src)
  const blob = await response.blob()
  return new File([blob], filename, {
    type: blob.type || 'application/octet-stream',
  })
}

export function createMediaUploadEngine(config: MediaUploadConfig): MediaUploadEngine {
  const { nodeName, probeDimensions, storeBase64 } = config

  function findInsertPosition(editor: Editor): number {
    return editor.view.state.selection.from
  }

  async function probeOrNull(src: string): Promise<OptionalDimensions> {
    try {
      return await probeDimensions(src)
    } catch {
      return { width: null, height: null }
    }
  }

  async function run(
    file: File,
    editor: Editor,
    pos: number | null | undefined,
    mode: InsertMode,
    options: MediaUploadOptions,
    placeholderAttrs: Record<string, unknown> = {},
  ): Promise<string | null> {
    if (!options.uploadFunction) {
      console.error('uploadFunction option is not provided')
      return null
    }
    const uploadId = createUploadId()
    const abortController = new AbortController()
    setUploadProgress(uploadId, {
      loaded: 0,
      total: file.size,
      percent: 0,
      abort: () => abortController.abort(),
    })
    try {
      const validationError = fileSizeLimitMessage(file)
      if (validationError) {
        setLocalFile(uploadId, { file })
        if (editor.isDestroyed) {
          deleteLocalFile(uploadId)
          deleteUploadProgress(uploadId)
          return uploadId
        }
        insertPlaceholder(editor.view, nodeName, pos, mode, uploadId, { width: null, height: null }, placeholderAttrs)
        applyUploadError(editor.view, nodeName, uploadId, validationError)
        return uploadId
      }

      const b64 = storeBase64 ? await fileToBase64(file) : null
      const probeSrc = b64 ?? URL.createObjectURL(file)
      setLocalFile(uploadId, b64 ? { b64, file } : { file })
      let dims: OptionalDimensions
      try {
        dims = await probeOrNull(probeSrc)
      } finally {
        if (!b64) URL.revokeObjectURL(probeSrc)
      }
      if (dims.poster) updateLocalFile(uploadId, { poster: dims.poster })
      if (editor.isDestroyed) {
        deleteLocalFile(uploadId)
        deleteUploadProgress(uploadId)
        return uploadId
      }
      insertPlaceholder(editor.view, nodeName, pos, mode, uploadId, dims, placeholderAttrs)

      const uploaded = await options.uploadFunction(file, {
        signal: abortController.signal,
        onProgress: (progress) => {
          updateUploadProgress(uploadId, {
            ...progress,
            abort: () => abortController.abort(),
          })
        },
      })
      if (editor.isDestroyed) {
        deleteLocalFile(uploadId)
        deleteUploadProgress(uploadId)
        return uploadId
      }
      if (!uploaded?.file_url || !isSafeUrl(uploaded.file_url, { base: window.location.origin })) {
        applyUploadError(editor.view, nodeName, uploadId, 'Upload returned no file URL')
        return uploadId
      }
      applyUploadSuccess(editor.view, nodeName, uploadId, uploaded)
      deleteLocalFile(uploadId)
    } catch (error) {
      if (abortController.signal.aborted) {
        if (!editor.isDestroyed) {
          removeNodeByUploadId(editor.view, nodeName, uploadId)
        }
        deleteLocalFile(uploadId)
        deleteUploadProgress(uploadId)
        return uploadId
      }
      const message = (error as Error)?.message || `Failed to upload ${nodeName}`
      if (!editor.isDestroyed) {
        applyUploadError(editor.view, nodeName, uploadId, message)
      }
    } finally {
      if (!abortController.signal.aborted) {
        deleteUploadProgress(uploadId)
      }
    }
    return uploadId
  }

  async function uploadOne(file: File, editor: Editor, options: MediaUploadOptions): Promise<void> {
    await run(file, editor, null, 'replace', options)
  }

  async function uploadReplace(
    file: File,
    editor: Editor,
    pos: number,
    options: MediaUploadOptions,
    attrs: Record<string, unknown> = {},
  ): Promise<void> {
    await run(file, editor, pos, 'replace', options, attrs)
  }

  async function reupload(editor: Editor, pos: number, options: MediaUploadOptions): Promise<void> {
    const node = editor.view.state.doc.nodeAt(pos)
    const uploadId = node?.attrs.uploadId as string | undefined
    const entry = uploadId ? getLocalFile(uploadId) : undefined
    if (!uploadId || !entry) {
      console.error(`reupload: no staged file for node at ${pos}`)
      return
    }
    const replacementUploadId = await run(entry.file, editor, pos, 'replace', options, node?.attrs ?? {})
    if (replacementUploadId) {
      deleteLocalFile(uploadId)
    }
  }

  async function processMultiple(
    files: File[],
    editor: Editor,
    pos: number | null,
    options: MediaUploadOptions,
  ): Promise<void> {
    if (files.length === 1) {
      await run(files[0]!, editor, pos, 'replace', options)
      return
    }
    let lastUploadId: string | null = null
    for (const file of files) {
      let insertPos = pos
      if (lastUploadId) {
        const prevPos = findNodeByUploadId(editor.view, nodeName, lastUploadId)
        if (prevPos !== null) {
          const prevNode = editor.view.state.doc.nodeAt(prevPos)
          insertPos = prevPos + (prevNode?.nodeSize ?? 1)
        }
      }
      lastUploadId = await run(file, editor, insertPos, 'insert', options)
    }
  }

  return {
    uploadOne,
    uploadReplace,
    reupload,
    processMultiple,
    findInsertPosition,
    updateNodeWithDimensions: (editor, pos, dims) => backfillDimensions(editor.view, nodeName, pos, dims),
    findNodeBySource: (editor, src, uploadId) => findNodeBySource(editor.view, nodeName, src, uploadId),
  }
}
