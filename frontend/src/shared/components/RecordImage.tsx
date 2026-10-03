import type { ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { Avatar, Dropdown, FileUploader } from '@/design-system'
import { validateIsImageFile } from '../utils/text'
import { CameraIcon } from './Icons'

export interface RecordImageProps {
  label: string
  image?: string | null
  size?: 'md' | 'lg'
  onChange: (url: string) => void
  onUploadError?: (message: string) => void
}

const SIZES = {
  md: {
    box: 'size-12',
    overlay: 'bottom-0.5 left-0 right-0.5 h-9 pt-3',
    clip: 'inset(12px 0 0 0)',
    icon: 'size-4',
  },
  lg: {
    box: 'h-15.5 w-15.5',
    overlay: 'bottom-0 left-0 right-0 h-14 pt-5',
    clip: 'inset(22px 0 0 0)',
    icon: 'h-6 w-6',
  },
}

export function RecordImage({ label, image, size = 'md', onChange, onUploadError }: RecordImageProps) {
  const dimensions = SIZES[size]

  return (
    <FileUploader
      validateFile={validateIsImageFile}
      onSuccess={(file) => onChange(file.file_url)}
      onFailure={(failure) => onUploadError?.(failure instanceof Error ? failure.message : String(failure))}
    >
      {({ openFileSelector }) => {
        const overlay: ReactNode = (
          <div
            className={`absolute z-[1] flex cursor-pointer items-center justify-center rounded-b-full bg-black/40 opacity-0 duration-300 ease-in-out group-hover:opacity-100 ${dimensions.overlay}`}
            style={{ WebkitClipPath: dimensions.clip, clipPath: dimensions.clip }}
          >
            <CameraIcon className={`cursor-pointer text-white ${dimensions.icon}`} />
          </div>
        )
        return (
          <div className={`group relative ${dimensions.box}`}>
            <Avatar size="3xl" className={dimensions.box} label={label} image={image} />
            {image ? (
              <Dropdown
                options={[
                  { icon: 'lucide-upload', label: __('Change Image'), onClick: openFileSelector },
                  { icon: 'lucide-trash-2', label: __('Remove Image'), onClick: () => onChange('') },
                ]}
              >
                <div className="!absolute bottom-0 left-0 right-0">{overlay}</div>
              </Dropdown>
            ) : (
              <div className="!absolute bottom-0 left-0 right-0" onClick={openFileSelector}>
                {overlay}
              </div>
            )}
          </div>
        )
      }}
    </FileUploader>
  )
}
