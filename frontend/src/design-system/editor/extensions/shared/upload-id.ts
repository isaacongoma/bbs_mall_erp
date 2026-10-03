export function createUploadId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
