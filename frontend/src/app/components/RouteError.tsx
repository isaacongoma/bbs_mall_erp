import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { ErrorPage } from '@/shared/components/ErrorPage'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)

  return <ErrorPage errorTitle={__('Something went wrong')} errorMessage={message} />
}
