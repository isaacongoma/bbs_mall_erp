import { useRef, type ComponentType, type DragEvent } from 'react'
import { __ } from '@/core/i18n'
import { Button, CircularProgressBar, ErrorMessage, FormControl, TextInput } from '@/design-system'
import type { FilesUploaderState } from '../../hooks/useFilesUploader'
import { convertSize } from '../../utils/text'
import { FileAudioIcon, FileTextIcon, FileVideoIcon } from '../Icons'

export interface FilesUploaderAreaProps {
  uploader: FilesUploaderState
}

function fileIcon(type: string): ComponentType<{ className?: string }> {
  if (type?.startsWith('audio')) return FileAudioIcon
  if (type?.startsWith('video')) return FileVideoIcon
  return FileTextIcon
}

export function FilesUploaderArea({ uploader }: FilesUploaderAreaProps) {
  const {
    files,
    isDragging,
    setIsDragging,
    showWebLink,
    webLink,
    setWebLink,
    setShowWebLink,
    showCamera,
    cameraImage,
    setVideo,
    setCanvas,
    allowMultiple,
    allowWebLink,
    allowTakePhoto,
    restrictions,
    addFiles,
    removeFile,
    startCamera,
  } = uploader
  const fileInput = useRef<HTMLInputElement>(null)

  if (showWebLink) {
    return (
      <div>
        <TextInput value={webLink} onChange={setWebLink} placeholder="https://example.com" />
      </div>
    )
  }

  if (showCamera) {
    return (
      <div>
        <video ref={setVideo} className="rounded" style={{ display: cameraImage ? 'none' : undefined }} autoPlay />
        <canvas
          ref={setCanvas}
          className="rounded"
          style={{ width: '-webkit-fill-available', display: cameraImage ? undefined : 'none' }}
        />
      </div>
    )
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  return (
    <div>
      <div
        className="min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-outline-elevation-2 text-ink-gray-5"
        style={{ display: files.length === 0 ? 'flex' : 'none' }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={onDrop}
      >
        {!isDragging ? (
          <div className="flex flex-col gap-3">
            <div className="text-center text-ink-gray-5">{__('Drag & Drop files here or upload from')}</div>
            <div className="grid grid-flow-col justify-center gap-4 text-center text-base">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                multiple={allowMultiple}
                accept={(restrictions.allowedFileTypes ?? []).join(', ')}
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <div>
                <Button icon="lucide-monitor" size="md" onClick={() => fileInput.current?.click()} />
                <div className="mt-1">{__('Device')}</div>
              </div>
              {allowWebLink && (
                <div>
                  <Button icon="lucide-link" size="md" onClick={() => setShowWebLink(true)} />
                  <div className="mt-1">{__('Link')}</div>
                </div>
              )}
              {allowTakePhoto && (
                <div>
                  <Button icon="lucide-camera" size="md" onClick={() => void startCamera()} />
                  <div className="mt-1">{__('Camera')}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>{__('Drop files here')}</div>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex flex-col divide-y">
          {files.map((file) => {
            const Icon = fileIcon(file.type)
            const isImageFile = file.type?.startsWith('image')
            return (
              <div key={file.name} className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-4 truncate">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded ${isImageFile ? '' : 'border'}`}
                  >
                    {isImageFile ? (
                      <img className="size-full object-cover" src={file.src ?? undefined} alt={file.name} />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 truncate text-sm text-ink-gray-5">
                    <div className="truncate text-base text-ink-gray-8">{file.name}</div>
                    <div className="mb-1">{convertSize(file.fileObj.size)}</div>
                    <FormControl
                      type="checkbox"
                      className="[&>label]:text-sm [&>label]:text-ink-gray-5"
                      label={__('Private')}
                      value={file.private}
                      onChange={(checked: boolean) => uploader.updateFile(file.name, { private: checked })}
                    />
                    {file.errorMessage && <ErrorMessage className="mt-2" message={file.errorMessage} />}
                  </div>
                </div>
                <div>
                  {file.uploading || (file.total > 0 && file.uploaded === file.total) ? (
                    <CircularProgressBar
                      className={file.uploaded === file.total ? 'text-ink-green-5' : undefined}
                      theme={{ primary: '#22C55E', secondary: 'lightgray' }}
                      step={file.uploaded || 1}
                      totalSteps={file.total || 100}
                      size="xs"
                      variant="outline"
                      showPercentage={file.uploading}
                    />
                  ) : (
                    <Button variant="ghost" icon="lucide-trash-2" onClick={() => removeFile(file.name)} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
