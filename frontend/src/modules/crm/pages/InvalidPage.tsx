import { __ } from '@/core/i18n'
import { resolveLocation } from '@/core/navigation'
import { Button } from '@/design-system'
import { LeadsIcon } from '../components/Icons'

export default function InvalidPage() {
  return (
    <div className="grid h-full place-items-center px-4 py-20 text-center text-lg text-ink-gray-5">
      <div className="space-y-2">
        <div>{__('Invalid page or not permitted to access')}</div>
        <Button to={resolveLocation({ name: 'Leads' })} label={__('Leads')} iconLeft={LeadsIcon} />
      </div>
    </div>
  )
}
