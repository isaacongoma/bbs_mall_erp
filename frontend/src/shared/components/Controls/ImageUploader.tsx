import { __ } from '@/core/i18n'
import { Button, FileUploader } from '@/design-system'

export interface ImageUploaderProps {
  imageUrl?: string
  imageType?: string
  onUpload?: (fileUrl: string) => void
  onRemove?: () => void
}

export function ImageUploader({ imageUrl = '', imageType = 'image/*', onUpload, onRemove }: ImageUploaderProps) {
  return (
    <FileUploader fileTypes={imageType} onSuccess={(file) => onUpload?.(file.file_url)}>
      {({ progress, uploading, openFileSelector }) => (
        <div className="flex items-end space-x-1">
          <Button
            iconLeft={uploading ? 'lucide-cloud-upload' : 'lucide-image-up'}
            label={uploading ? __('Uploading {0}%', [progress]) : imageUrl ? __('Change') : __('Upload')}
            onClick={openFileSelector}
          />
          {imageUrl && <Button label={__('Remove')} onClick={onRemove} />}
        </div>
      )}
    </FileUploader>
  )
}
