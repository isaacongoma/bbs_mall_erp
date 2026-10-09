import { rpc } from '@/core/api/rpc'

function unwrapMessage(value: unknown): unknown {
  if (value && typeof value === 'object' && 'message' in (value as object)) return (value as Record<string, unknown>).message
  return value
}

export async function downloadPdf(doctype: string, docname: string): Promise<void> {
  const response = await rpc<unknown>({
    url: 'hrms.api._download_pdf',
    method: 'POST',
    params: { doctype, docname },
  })
  const dataUrl = unwrapMessage(response)
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) throw new Error('Failed to download PDF')
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${docname}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
