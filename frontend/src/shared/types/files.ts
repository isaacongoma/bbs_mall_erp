export interface UploaderRestrictions {
  allowedFileTypes?: string[]
  maxFileSize?: number | null
  maxNumberOfFiles?: number | null
}

export interface UploaderOptions {
  folder?: string
  allowMultiple?: boolean
  allowWebLink?: boolean
  allowTakePhoto?: boolean
  disableFileBrowser?: boolean
  makeAttachmentsPublic?: boolean
  restrictions?: UploaderRestrictions
}

export interface UploaderFile {
  index: number
  src: string | null
  fileObj: File
  type: string
  optimize: boolean
  name: string
  errorMessage: string | null
  uploading: boolean
  uploaded: number
  total: number
  private: boolean
}

export interface FileUploaderDefaults {
  allowed_file_types?: string | null
  max_file_size?: number | null
  max_number_of_files?: number | null
  make_attachments_public?: number | boolean | null
}
