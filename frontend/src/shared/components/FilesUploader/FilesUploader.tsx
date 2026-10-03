import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dialog, toast, uploadFile, type UploadedFile } from '@/design-system'
import { useFilesUploader } from '../../hooks/useFilesUploader'
import { isMobileView } from '../../stores/uiStore'
import type { UploaderFile, UploaderOptions } from '../../types/files'
import { FilesUploaderArea } from './FilesUploaderArea'

export interface FilesUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  docname: string
  fieldname?: string
  options?: UploaderOptions
  onAfter?: (files: UploadedFile[]) => void
}

const DEFAULT_OPTIONS: UploaderOptions = { folder: 'Home/Attachments' }

function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message) return error.message
  return __('Error Uploading File')
}

export function FilesUploader({
  open,
  onOpenChange,
  doctype,
  docname,
  fieldname = '',
  options = DEFAULT_OPTIONS,
  onAfter,
}: FilesUploaderProps) {
  const uploader = useFilesUploader({ doctype, options })
  const { files, showWebLink, showCamera, webLink, cameraImage } = uploader
  const [uploadStarted, setUploadStarted] = useState(false)

  const isAllPrivate = files.every((file) => file.private)
  const folder = options.folder

  const disableAttachButton = showCamera ? !cameraImage : showWebLink ? !webLink : !files.length

  async function attachFile(file: UploaderFile): Promise<UploadedFile> {
    uploader.updateFile(file.name, { uploading: true, errorMessage: null })
    try {
      const result = await uploadFile(file.fileObj, {
        private: file.private,
        folder,
        doctype,
        docname,
        fieldname,
        type: file.type,
        onProgress: ({ loaded, total }) => uploader.updateFile(file.name, { uploaded: loaded, total }),
      })
      uploader.updateFile(file.name, { uploading: false })
      return result
    } catch (error) {
      uploader.updateFile(file.name, { uploading: false, errorMessage: errorText(error) })
      throw error
    }
  }

  async function attachWebLink() {
    if (!webLink) {
      toast.error(__('Please enter a valid URL'))
      return
    }
    setUploadStarted(true)
    try {
      const result = await uploadFile(null, {
        private: false,
        folder,
        doctype,
        docname,
        fieldname,
        file_url: decodeURI(webLink),
      })
      onOpenChange(false)
      onAfter?.([result])
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setUploadStarted(false)
    }
  }

  async function attachFiles() {
    if (showWebLink) {
      await attachWebLink()
      return
    }
    setUploadStarted(true)
    const outcomes = await Promise.allSettled(files.map((file) => attachFile(file)))
    setUploadStarted(false)

    const uploaded: UploadedFile[] = []
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        uploaded.push(outcome.value)
        const file = files[index]
        if (file) uploader.removeFile(file.name)
      }
    })

    if (uploaded.length) onAfter?.(uploaded)
    if (uploaded.length === files.length) {
      uploader.removeAllFiles()
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Attach')}
      size="xl"
      actionsContent={() => (
        <div className="flex justify-between">
          <div className="flex gap-2">
            {files.length > 0 && (
              <Button
                variant="subtle"
                label={__('Remove All')}
                disabled={uploadStarted}
                onClick={uploader.removeAllFiles}
              />
            )}
            {(showWebLink || showCamera) && (
              <Button
                label={isMobileView() ? __('Back') : __('Back to File Upload')}
                iconLeft="lucide-arrow-left"
                onClick={uploader.backToUpload}
              />
            )}
            {showCamera && !cameraImage && <Button label={__('Switch Camera')} onClick={uploader.switchCamera} />}
            {cameraImage && <Button label={__('Retake')} onClick={() => uploader.setCameraImage(null)} />}
          </div>
          <div className="flex gap-2">
            {isAllPrivate && files.length > 0 ? (
              <Button
                variant="subtle"
                label={__('Set all as public')}
                disabled={uploadStarted}
                onClick={() => uploader.setAllPrivate(false)}
              />
            ) : files.length > 0 ? (
              <Button
                variant="subtle"
                label={__('Set all as private')}
                disabled={uploadStarted}
                onClick={() => uploader.setAllPrivate(true)}
              />
            ) : null}
            {!showCamera && (
              <Button
                variant="solid"
                label={__('Attach')}
                loading={uploadStarted}
                disabled={disableAttachButton}
                onClick={() => void attachFiles()}
              />
            )}
            {showCamera && cameraImage && (
              <Button variant="solid" label={__('Upload')} onClick={() => void uploader.uploadViaCamera()} />
            )}
            {showCamera && !cameraImage && (
              <Button variant="solid" label={__('Capture')} onClick={uploader.captureImage} />
            )}
          </div>
        </div>
      )}
    >
      <FilesUploaderArea uploader={uploader} />
    </Dialog>
  )
}
