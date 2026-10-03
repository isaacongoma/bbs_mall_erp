import type { Editor } from '@tiptap/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fileSizeLimitMessage } from '../../utils/fileSize'
import { existingItemId, fileItemId, filterImageFiles } from '../extensions/image-group/image-group-utils'
import { resolveUploadOptions, uploadFile } from '../extensions/shared/media-upload-engine'
import {
  abortUpload,
  deleteUploadProgress,
  setUploadProgress,
  updateUploadProgress,
} from '../extensions/shared/media-upload-state'
import type { ExistingImage, MediaUploadOptions, UploadResult } from '../extensions/shared/upload-types'
import type { ImageItem } from '../types/imageGroup'

export interface UseImageGroupDialogArgs {
  editor: Editor
  mode: 'new' | 'edit'
  files: File[]
  existing?: ExistingImage[]
  initialColumns: number
}

function makeFileItem(file: File): ImageItem {
  return { type: 'file', file, id: fileItemId(file), status: 'idle' }
}

function makeExistingItem(existing: ExistingImage): ImageItem {
  return { type: 'existing', existing, id: existingItemId(existing) }
}

function initialItems(args: UseImageGroupDialogArgs): ImageItem[] {
  const existingItems = (args.existing ?? []).map(makeExistingItem)
  const fileItems = args.files.map(makeFileItem)
  return args.mode === 'edit' ? [...existingItems, ...fileItems] : fileItems
}

export function useImageGroupDialog(args: UseImageGroupDialogArgs) {
  const [images, setImages] = useState<ImageItem[]>(() => initialItems(args))
  const imagesRef = useRef<ImageItem[]>(images)
  const [columns, setColumns] = useState(args.initialColumns)
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasUploadError, setHasUploadError] = useState(false)
  const unmountedRef = useRef(false)
  const editorRef = useRef(args.editor)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  const commit = useCallback((next: ImageItem[]) => {
    imagesRef.current = next
    setImages(next)
  }, [])

  const patchItem = useCallback(
    (id: string, patch: Partial<ImageItem>) => {
      commit(imagesRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    },
    [commit],
  )

  const stagedFiles = (list: ImageItem[]): File[] =>
    list.filter((item) => item.type === 'file' && item.file).map((item) => item.file as File)

  const addFiles = useCallback(
    (incoming: File[]): File[] => {
      const newItems = filterImageFiles(incoming).map(makeFileItem)
      const known = new Set(imagesRef.current.map((item) => item.id))
      const next = [...imagesRef.current, ...newItems.filter((item) => !known.has(item.id))]
      commit(next)
      return stagedFiles(next)
    },
    [commit],
  )

  const removeImage = useCallback(
    (index: number): File[] => {
      const next = imagesRef.current.filter((_, position) => position !== index)
      commit(next)
      return stagedFiles(next)
    },
    [commit],
  )

  const reorder = useCallback(
    (fromIndex: number, toIndex: number): File[] => {
      const current = imagesRef.current
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= current.length) {
        return stagedFiles(current)
      }
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      if (moved) next.splice(toIndex, 0, moved)
      commit(next)
      return stagedFiles(next)
    },
    [commit],
  )

  const setCaption = useCallback(
    (index: number, caption: string) => {
      const item = imagesRef.current[index]
      if (!item) return
      if (item.type === 'existing' && item.existing) {
        patchItem(item.id, { existing: { ...item.existing, alt: caption } })
      } else {
        patchItem(item.id, { alt: caption })
      }
    },
    [patchItem],
  )

  const resolveOptions = useCallback((): MediaUploadOptions => {
    const editor = editorRef.current
    const extension = editor.extensionManager.extensions.find((ext) => ext.name === 'imageGroup')
    const uploadFunction = extension?.options?.uploadFunction as MediaUploadOptions['uploadFunction'] | undefined
    return resolveUploadOptions({ editor, uploadFunction })
  }, [])

  const uploadItem = useCallback(
    async (item: ImageItem): Promise<UploadResult> => {
      if (!item.file) return { success: false, error: new Error('No file selected') }
      if (item.uploaded) return { success: true, file: { file_url: item.uploaded.src } }
      const options = resolveOptions()
      const validationError = fileSizeLimitMessage(item.file)
      if (validationError) {
        patchItem(item.id, { status: 'failed', error: validationError })
        setHasUploadError(true)
        return { success: false, error: new Error(validationError) }
      }

      const abortController = new AbortController()
      setUploadProgress(item.id, {
        loaded: 0,
        total: item.file.size,
        percent: 0,
        abort: () => abortController.abort(),
      })
      patchItem(item.id, { status: 'uploading', error: '' })

      try {
        const result = await uploadFile(item.file, options, {
          signal: abortController.signal,
          onProgress: (progress) => updateUploadProgress(item.id, progress),
        })
        patchItem(item.id, {
          status: 'uploaded',
          uploaded: { src: result.file_url, alt: item.alt || (result.file_name as string) || '' },
        })
        return { success: true, file: result }
      } catch (error) {
        patchItem(item.id, {
          status: 'failed',
          error: abortController.signal.aborted ? 'Upload cancelled' : (error as Error)?.message || 'Upload failed',
        })
        setHasUploadError(true)
        return { success: false, error: error as Error }
      } finally {
        deleteUploadProgress(item.id)
      }
    },
    [patchItem, resolveOptions],
  )

  const uploadStagedFiles = useCallback(
    async (items: ImageItem[]): Promise<UploadResult[]> => {
      if (items.length === 0) return []
      setUploading(true)
      setHasUploadError(false)
      setTotalCount(items.length)
      setUploadedCount(items.filter((item) => item.uploaded).length)
      try {
        return await Promise.all(
          items.map(async (item) => {
            const result = await uploadItem(item)
            setUploadedCount((count) => count + 1)
            return result
          }),
        )
      } finally {
        setUploading(false)
      }
    },
    [uploadItem],
  )

  const buildFinalImages = useCallback(async (): Promise<{ images: ExistingImage[]; failed: boolean }> => {
    const stagedItems = imagesRef.current.filter((item) => item.type === 'file' && item.file && !item.uploaded)
    const results = await uploadStagedFiles(stagedItems)

    const byId = new Map<string, ExistingImage>()
    let failed = false
    stagedItems.forEach((item, index) => {
      const result = results[index]
      if (result?.success && result.file) {
        byId.set(item.id, { src: result.file.file_url, alt: (result.file.file_name as string) ?? '' })
      } else if (result && !result.success) {
        failed = true
      }
    })

    const final: ExistingImage[] = []
    for (const item of imagesRef.current) {
      if (item.type === 'existing' && item.existing) {
        final.push(item.existing)
      } else if (item.uploaded) {
        final.push({ src: item.uploaded.src, alt: item.alt ?? item.uploaded.alt })
      } else {
        const uploaded = byId.get(item.id)
        if (uploaded) final.push({ src: uploaded.src, alt: item.alt ?? uploaded.alt })
      }
    }
    if (failed) setHasUploadError(true)
    return { images: final, failed }
  }, [uploadStagedFiles])

  const retryImage = useCallback(
    async (index: number) => {
      const item = imagesRef.current[index]
      if (!item || item.type !== 'file') return
      setHasUploadError(false)
      setUploading(true)
      setTotalCount(1)
      setUploadedCount(0)
      try {
        await uploadItem(item)
      } finally {
        setUploadedCount(1)
        setUploading(false)
      }
    },
    [uploadItem],
  )

  const abortAll = useCallback(() => {
    imagesRef.current.forEach((item) => abortUpload(item.id))
  }, [])

  const uploadProgress = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0

  return {
    images,
    columns,
    setColumns,
    uploading,
    uploadProgress,
    uploadedCount,
    totalCount,
    hasUploadError,
    isUnmounted: () => unmountedRef.current,
    addFiles,
    removeImage,
    reorder,
    setCaption,
    buildFinalImages,
    retryImage,
    abortAll,
  }
}
