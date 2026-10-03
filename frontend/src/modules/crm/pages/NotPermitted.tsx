import { __ } from '@/core/i18n'
import { Button } from '@/design-system'
import { useSession } from '@/shared/hooks/useSession'

export default function NotPermitted() {
  const { logout } = useSession()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-gray-1">
      <div className="max-w-md text-center">
        <h1 className="text-4xl-semibold text-ink-gray-5">{__('Access Denied')}</h1>
        <div className="my-[15px] w-full border-t" />
        <p className="text-p-base text-ink-gray-4">
          {__(
            'You do not have enough permissions to access BBS MALL ERP. Please contact your administrator if you believe this is an error.',
          )}
        </p>
        <Button className="mt-5 w-full" variant="solid" label={__('Login with Different Account')} onClick={logout} />
      </div>
    </div>
  )
}
