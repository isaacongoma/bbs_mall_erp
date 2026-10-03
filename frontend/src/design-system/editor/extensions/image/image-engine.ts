import { createMediaUploadEngine } from '../shared/media-upload-engine'
import { probeImageDimensions } from '../shared/media-dimensions'
import type { MediaUploadConfig } from '../shared/media-upload-engine'

export const imageUploadConfig: MediaUploadConfig = {
  nodeName: 'image',
  probeDimensions: probeImageDimensions,
  accept: /image/i,
  storeBase64: true,
}

export const imageEngine = createMediaUploadEngine(imageUploadConfig)
