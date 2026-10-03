import { useCallback, useEffect, useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { toast } from '@/design-system'
import type { FileUploaderDefaults, UploaderFile, UploaderOptions, UploaderRestrictions } from '../types/files'
import { formatDate } from '../utils/date'

function checkRestrictions(file: File, restrictions: UploaderRestrictions): boolean {
  const { maxFileSize, allowedFileTypes = [] } = restrictions
  let isCorrectType = true
  let validFileSize = true

  if (allowedFileTypes.length) {
    isCorrectType = allowedFileTypes.some((type) => {
      if (type.includes('/')) {
        if (!file.type) return false
        return Boolean(file.type.match(type))
      }
      if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase())
      return false
    })
  }

  if (maxFileSize && file.size != null) validFileSize = file.size < maxFileSize

  if (!isCorrectType) {
    console.warn('File skipped because of invalid file type', file)
    toast.warning(__('File "{0}" was skipped because of invalid file type', [file.name]))
  }
  if (!validFileSize) {
    console.warn('File skipped because of invalid file size', file.size, file)
    toast.warning(
      __('File "{0}" was skipped because size exceeds {1} MB', [file.name, (maxFileSize ?? 0) / (1024 * 1024)]),
    )
  }
  return isCorrectType && validFileSize
}

function snapshotVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
  const width = video.videoWidth
  const height = video.videoHeight
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

function attachStream(video: HTMLVideoElement, stream: MediaStream | null): void {
  video.srcObject = stream
}

async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  return new File([buffer], filename, { type: mimeType })
}

export interface UseFilesUploaderOptions {
  doctype: string
  options?: UploaderOptions
}

export function useFilesUploader({ doctype, options = {} }: UseFilesUploaderOptions) {
  const [files, setFiles] = useState<UploaderFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showWebLink, setShowWebLink] = useState(false)
  const [webLink, setWebLink] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraImage, setCameraImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)

  const defaults = useResource<FileUploaderDefaults>({
    url: 'crm.api.get_file_uploader_defaults',
    params: { doctype },
    cache: ['file_uploader_defaults', doctype],
    auto: true,
  })

  const allowMultiple = options.allowMultiple !== false
  const disableFileBrowser = options.disableFileBrowser ?? true
  const allowWebLink = options.allowWebLink !== false
  const allowTakePhoto = Boolean(options.allowTakePhoto || (typeof navigator !== 'undefined' && navigator.mediaDevices))

  const restrictions = useMemo<UploaderRestrictions>(() => {
    const data = defaults.data
    const base: UploaderRestrictions = data
      ? {
          allowedFileTypes: data.allowed_file_types
            ? data.allowed_file_types.split('\n').map((extension) => `.${extension}`)
            : [],
          maxFileSize: data.max_file_size,
          maxNumberOfFiles: data.max_number_of_files,
        }
      : {}
    return { ...base, ...(options.restrictions ?? {}) }
  }, [defaults.data, options.restrictions])

  const makeAttachmentsPublic = defaults.data
    ? Boolean(defaults.data.make_attachments_public)
    : Boolean(options.makeAttachmentsPublic)

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      let added = Array.from(incoming)
        .filter((file) => checkRestrictions(file, restrictions))
        .map<UploaderFile>((file, index) => {
          const isImage = Boolean(file.type?.startsWith('image'))
          const sizeKb = file.size / 1024
          return {
            index,
            src: isImage ? URL.createObjectURL(file) : null,
            fileObj: file,
            type: file.type,
            optimize: sizeKb > 200 && isImage && !file.type?.includes('svg'),
            name: file.name,
            errorMessage: null,
            uploading: false,
            uploaded: 0,
            total: 0,
            private: !makeAttachmentsPublic,
          }
        })

      const maxNumberOfFiles = restrictions.maxNumberOfFiles
      if (maxNumberOfFiles && added.length > maxNumberOfFiles) {
        for (const file of added.slice(maxNumberOfFiles)) {
          console.warn(
            `File skipped because it exceeds the allowed specified limit of ${maxNumberOfFiles} uploads`,
            file,
          )
          const message = doctype
            ? __('File "{0}" was skipped because only {1} uploads are allowed for DocType "{2}"', [
                file.name,
                maxNumberOfFiles,
                doctype,
              ])
            : __('File "{0}" was skipped because only {1} uploads are allowed', [file.name, maxNumberOfFiles])
          toast.warning(message)
        }
        added = added.slice(0, maxNumberOfFiles)
      }

      setFiles((current) => current.concat(added))
    },
    [restrictions, makeAttachmentsPublic, doctype],
  )

  const updateFile = useCallback((name: string, patch: Partial<UploaderFile>) => {
    setFiles((current) => current.map((file) => (file.name === name ? { ...file, ...patch } : file)))
  }, [])

  const removeFile = useCallback((name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name))
  }, [])

  const removeAllFiles = useCallback(() => setFiles([]), [])

  const setAllPrivate = useCallback((value: boolean) => {
    setFiles((current) => current.map((file) => ({ ...file, private: value })))
  }, [])

  const stopStream = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
    setShowCamera(false)
    setCameraImage(null)
  }, [])

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setShowCamera(true)
    const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false })
    setStream(next)
  }, [])

  const switchCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    stopStream()
    void startCamera(next)
  }, [facingMode, stopStream, startCamera])

  const captureImage = useCallback(() => {
    if (!video || !canvas) return
    setCameraImage(snapshotVideo(video, canvas))
  }, [video, canvas])

  const uploadViaCamera = useCallback(async () => {
    if (!cameraImage) return
    const filename = `capture_${formatDate(new Date(), 'YYYY_MM_DD_HH_mm_ss')}.png`
    const file = await urlToFile(cameraImage, filename, 'image/png')
    addFiles([file])
    setShowCamera(false)
    setCameraImage(null)
  }, [cameraImage, addFiles])

  const backToUpload = useCallback(() => {
    setShowWebLink(false)
    stopStream()
    setWebLink('')
  }, [stopStream])

  useEffect(() => {
    if (video) attachStream(video, stream)
  }, [video, stream])

  useEffect(
    () => () => {
      stream?.getTracks().forEach((track) => track.stop())
    },
    [stream],
  )

  return {
    files,
    isDragging,
    setIsDragging,
    showWebLink,
    setShowWebLink,
    webLink,
    setWebLink,
    showCamera,
    cameraImage,
    setCameraImage,
    setVideo,
    setCanvas,
    restrictions,
    allowMultiple,
    allowWebLink,
    allowTakePhoto,
    disableFileBrowser,
    addFiles,
    updateFile,
    removeFile,
    removeAllFiles,
    setAllPrivate,
    startCamera: () => startCamera(facingMode),
    stopStream,
    switchCamera,
    captureImage,
    uploadViaCamera,
    backToUpload,
  }
}

export type FilesUploaderState = ReturnType<typeof useFilesUploader>
