import type { Editor } from '@tiptap/core'
import { fileSizeLimitMessage } from '../../../utils/fileSize'
import { isSafeUrl } from '../shared/url-safety'
import { findNodeByUploadId } from '../shared/node-view'
import { applyUploadError, applyUploadSuccess, insertPlaceholder, removeNodeByUploadId } from '../shared/media-node-ops'
import { createUploadId } from '../shared/upload-id'
import {
  deleteLocalFile,
  deleteUploadProgress,
  getLocalFile,
  setLocalFile,
  setUploadProgress,
  updateUploadProgress,
} from '../shared/media-upload-state'
import type { MediaUploadOptions } from '../shared/media-upload-engine'
import type { InsertMode } from '../shared/media-upload-types'

export const ATTACHMENT_NODE_NAME = 'attachment'

const NO_DIMENSIONS = { width: null, height: null }

function attachmentAttrsFromFile(file: File): Record<string, unknown> {
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  }
}

async function run(
  file: File,
  editor: Editor,
  pos: number | null | undefined,
  mode: InsertMode,
  options: MediaUploadOptions,
  placeholderAttrs: Record<string, unknown> = attachmentAttrsFromFile(file),
): Promise<string | null> {
  if (!options.uploadFunction) {
    console.error('uploadFunction option is not provided')
    return null
  }
  await Promise.resolve()
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
      insertPlaceholder(editor.view, ATTACHMENT_NODE_NAME, pos, mode, uploadId, NO_DIMENSIONS, placeholderAttrs)
      applyUploadError(editor.view, ATTACHMENT_NODE_NAME, uploadId, validationError)
      return uploadId
    }

    setLocalFile(uploadId, { file })
    if (editor.isDestroyed) {
      deleteLocalFile(uploadId)
      deleteUploadProgress(uploadId)
      return uploadId
    }
    insertPlaceholder(editor.view, ATTACHMENT_NODE_NAME, pos, mode, uploadId, NO_DIMENSIONS, placeholderAttrs)

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
      applyUploadError(editor.view, ATTACHMENT_NODE_NAME, uploadId, 'Upload returned no file URL')
      return uploadId
    }
    applyUploadSuccess(editor.view, ATTACHMENT_NODE_NAME, uploadId, uploaded)
    deleteLocalFile(uploadId)
  } catch (error) {
    if (abortController.signal.aborted) {
      if (!editor.isDestroyed) {
        removeNodeByUploadId(editor.view, ATTACHMENT_NODE_NAME, uploadId)
      }
      deleteLocalFile(uploadId)
      deleteUploadProgress(uploadId)
      return uploadId
    }
    const message = (error as Error)?.message || 'Failed to upload attachment'
    if (!editor.isDestroyed) {
      applyUploadError(editor.view, ATTACHMENT_NODE_NAME, uploadId, message)
    }
  } finally {
    if (!abortController.signal.aborted) {
      deleteUploadProgress(uploadId)
    }
  }
  return uploadId
}

export async function uploadAttachment(file: File, editor: Editor, options: MediaUploadOptions): Promise<void> {
  await run(file, editor, null, 'replace', options)
}

export async function uploadAttachmentFiles(
  files: File[],
  editor: Editor,
  pos: number | null,
  options: MediaUploadOptions,
): Promise<void> {
  if (files.length === 0) return
  if (files.length === 1) {
    await run(files[0]!, editor, pos, 'replace', options)
    return
  }
  let lastUploadId: string | null = null
  for (const file of files) {
    let insertPos = pos
    if (lastUploadId) {
      const prevPos = findNodeByUploadId(editor.view, ATTACHMENT_NODE_NAME, lastUploadId)
      if (prevPos !== null) {
        const prevNode = editor.view.state.doc.nodeAt(prevPos)
        insertPos = prevPos + (prevNode?.nodeSize ?? 1)
      }
    }
    lastUploadId = await run(file, editor, insertPos, 'insert', options)
  }
}

export async function reuploadAttachment(editor: Editor, pos: number, options: MediaUploadOptions): Promise<void> {
  const node = editor.view.state.doc.nodeAt(pos)
  const uploadId = node?.attrs.uploadId as string | undefined
  const entry = uploadId ? getLocalFile(uploadId) : undefined
  if (!uploadId || !entry) {
    console.error(`reuploadAttachment: no staged file for node at ${pos}`)
    return
  }
  const replacementUploadId = await run(
    entry.file,
    editor,
    pos,
    'replace',
    options,
    node?.attrs ?? attachmentAttrsFromFile(entry.file),
  )
  if (replacementUploadId) {
    deleteLocalFile(uploadId)
  }
}
