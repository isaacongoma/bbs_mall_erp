import { createMediaUploadEngine, type MediaUploadConfig } from '../shared/media-upload-engine'
import { probeVideoDimensions } from '../shared/media-dimensions'

export const videoConfig: MediaUploadConfig = {
  nodeName: 'video',
  probeDimensions: probeVideoDimensions,
  accept: /video/i,
  storeBase64: false,
}

export const videoEngine = createMediaUploadEngine(videoConfig)
