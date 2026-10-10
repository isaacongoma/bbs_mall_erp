import { useState } from 'react'
import { Avatar, Button, Dialog, ErrorMessage, Select, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'

const LEVELS = [
  { value: 'Owner', label: 'Owner - full access' },
  { value: 'Finance', label: 'Finance - invoices, payments, statements' },
  { value: 'Operations', label: 'Operations - maintenance, utilities, sales' },
]

export default function Team() {
  const customer = usePortalStore((state) => state.customer)
  const email = usePortalStore((state) => state.context?.user.email)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.team(id))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', access_level: 'Operations' })
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function invite() {
    setProblem('')
    if (!form.full_name.trim() || !form.email.trim() || !form.mobile.trim())
      return setProblem('Name, email and mobile are all required.')
    setBusy(true)
    try {
      await portalApi.invite(customer, form.email.trim(), form.full_name.trim(), form.mobile.trim(), form.access_level)
      toast.success(`Invitation sent to ${form.email}`)
      setOpen(false)
      setForm({ full_name: '', email: '', mobile: '', access_level: 'Operations' })
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  async function remove(user: string) {
    try {
      await portalApi.removeUser(customer, user)
      toast.success('Access removed')
      reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <PortalLayout title="Team">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <PageHeading
          title="Your team"
          subtitle="People who can use the portal for your business"
          actions={
            <Button label="Invite someone" variant="solid" iconLeft="lucide-user-plus" onClick={() => setOpen(true)} />
          }
        />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <Card bodyClassName="p-0 sm:p-0">
            {data.length === 0 ? (
              <EmptyState
                icon="users"
                title="Just you"
                message="Invite colleagues and give them the access they need."
              />
            ) : (
              <ul className="divide-y divide-outline-gray-1">
                {data.map((member) => (
                  <li key={member.name} className="flex items-center gap-4 px-5 py-4">
                    <Avatar label={member.full_name || member.user} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-gray-9">
                        {member.full_name}
                        {member.user === email && (
                          <span className="ml-2 text-xs font-normal text-ink-gray-5">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-gray-5">
                        {member.user}
                        {member.mobile_no ? ` - ${member.mobile_no}` : ''}
                      </p>
                    </div>
                    <StatusBadge status="Info" label={member.access_level} />
                    {member.user !== email && (
                      <Button label="Remove" variant="ghost" theme="red" onClick={() => void remove(member.user)} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Invite a team member" size="md">
        <div className="flex flex-col gap-4">
          <TextInput
            label="Full name"
            value={form.full_name}
            onChange={(value) => setForm((row) => ({ ...row, full_name: value }))}
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((row) => ({ ...row, email: value }))}
          />
          <TextInput
            label="Mobile number"
            value={form.mobile}
            onChange={(value) => setForm((row) => ({ ...row, mobile: value }))}
            placeholder="0712 345 678"
            description="They sign in with this number and a code sent by SMS."
          />
          <Select
            label="Access"
            value={form.access_level}
            onChange={(value) => setForm((row) => ({ ...row, access_level: String(value ?? 'Operations') }))}
            options={LEVELS}
          />
          <ErrorMessage message={problem} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={() => setOpen(false)} />
            <Button label="Send invitation" variant="solid" loading={busy} onClick={() => void invite()} />
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  )
}
