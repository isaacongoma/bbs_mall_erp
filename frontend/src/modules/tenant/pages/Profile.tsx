import { useState } from 'react'
import { Avatar, Button, ErrorMessage, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, KeyValue, PageHeading } from '../components/PortalUi'
import { usePortalStore } from '../stores/portalStore'

export default function Profile() {
  const context = usePortalStore((state) => state.context)
  const tenant = usePortalStore((state) => state.context?.tenants.find((row) => row.customer === state.customer))
  const [name, setName] = useState(context?.user.full_name ?? '')
  const [mobile, setMobile] = useState(context?.user.mobile_no ?? '')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function save() {
    setBusy(true)
    setProblem('')
    try {
      await portalApi.updateProfile(mobile, name)
      usePortalStore.getState().reset()
      await usePortalStore.getState().load()
      toast.success('Profile updated')
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalLayout title="Profile">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeading title="Your profile" />
        <Card>
          <div className="mb-5 flex items-center gap-4">
            <Avatar
              label={name || context?.user.email || 'T'}
              image={context?.user.user_image ?? undefined}
              size="xl"
            />
            <div>
              <p className="text-lg font-semibold text-ink-gray-9">{name || context?.user.email}</p>
              <p className="text-sm text-ink-gray-5">{context?.user.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <TextInput label="Full name" value={name} onChange={setName} />
            <TextInput
              label="Mobile number"
              value={mobile}
              onChange={setMobile}
              description="Used for sign-in codes and payment prompts."
              inputMode="tel"
            />
            <ErrorMessage message={problem} />
            <div className="flex justify-end">
              <Button label="Save changes" variant="solid" loading={busy} onClick={() => void save()} />
            </div>
          </div>
        </Card>
        {tenant && (
          <Card title="Tenant account">
            <dl>
              <KeyValue label="Business">{tenant.customer_name}</KeyValue>
              <KeyValue label="Tenant number">{tenant.customer}</KeyValue>
              <KeyValue label="Your access">{tenant.access_level}</KeyValue>
            </dl>
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
