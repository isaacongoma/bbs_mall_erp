import { sanitizeHTML } from '../utils/text'

export interface ErrorPageProps {
  errorTitle: string
  errorMessage: string
}

export function ErrorPage({ errorTitle, errorMessage }: ErrorPageProps) {
  return (
    <div className="grid h-full place-items-center px-4 py-20 text-center text-lg text-ink-gray-5">
      <div className="flex flex-col items-center justify-between gap-3">
        <span className="lucide-x-octagon h-12 w-12 text-ink-red-6" aria-hidden="true" />
        <div className="text-3xl-semibold">{errorTitle}</div>
        <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(errorMessage) }} />
      </div>
    </div>
  )
}
