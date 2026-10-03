import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, DateRangePicker, Dropdown, Tooltip, usePageMeta } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { ViewBreadcrumbs } from '@/shared/components/ViewBreadcrumbs'
import { useUsers } from '@/shared/hooks/useUsers'
import { copy } from '@/shared/utils/collections'
import { AddChartModal, DashboardGrid } from '../components/Dashboard'
import { formatter, getLastXDays, parseDateRange } from '../utils/dashboard'

type AnyRecord = Record<string, any>

const PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 60 Days', days: 60 },
  { label: 'Last 90 Days', days: 90 },
]

export default function Dashboard() {
  const { crmUsers, getUser, isManager, isAdmin } = useUsers()
  usePageMeta({ title: __('CRM Dashboard') })

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<AnyRecord[] | null>(null)
  const [original, setOriginal] = useState<string>('')
  const [showAddChartModal, setShowAddChartModal] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [preset, setPreset] = useState('Last 30 Days')
  const [period, setPeriod] = useState<string | null>(getLastXDays())
  const [user, setUser] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [fromDate, toDate] = parseDateRange(period)

  const dashboard = useResource<AnyRecord[]>({
    url: 'crm.api.dashboard.get_dashboard',
    params: { from_date: fromDate || null, to_date: toDate || null, user },
    auto: true,
  })

  function refetch(nextPeriod: string | null, nextUser: string | null) {
    const [from, to] = parseDateRange(nextPeriod)
    dashboard.update({ params: { from_date: from || null, to_date: to || null, user: nextUser } })
    void dashboard.reload().catch(() => undefined)
  }

  function choosePreset(label: string, days: number) {
    const next = getLastXDays(days)
    setPreset(label)
    setPeriod(next)
    refetch(next, user)
  }

  function updateUser(value: string) {
    setUser(value || null)
    refetch(period, value || null)
  }

  const items = draft ?? dashboard.data ?? []
  const dirty = editing && JSON.stringify(draft) !== original

  function enableEditing() {
    const snapshot = copy(dashboard.data ?? [])
    setOriginal(JSON.stringify(snapshot))
    setDraft(snapshot)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft(null)
  }

  async function save() {
    const layout = copy(items).map((item: AnyRecord) => {
      const next = { ...item }
      delete next.data
      return next
    })
    setSaving(true)
    try {
      await rpc({
        url: 'frappe.client.set_value',
        method: 'POST',
        params: {
          doctype: 'CRM Dashboard',
          name: 'Manager Dashboard',
          fieldname: 'layout',
          value: JSON.stringify(layout),
        },
      })
      setEditing(false)
      setDraft(null)
      void dashboard.reload().catch(() => undefined)
    } finally {
      setSaving(false)
    }
  }

  async function resetToDefault() {
    await rpc({ url: 'crm.api.dashboard.reset_to_default' })
    setEditing(false)
    setDraft(null)
    void dashboard.reload().catch(() => undefined)
  }

  const presetOptions = [
    {
      group: 'Presets',
      hideLabel: true,
      items: PRESETS.map((entry) => ({ label: __(entry.label), onClick: () => choosePreset(entry.label, entry.days) })),
    },
    {
      label: __('Custom Range'),
      onClick: () => {
        setShowDatePicker(true)
        setPreset('Custom Range')
        setPeriod(null)
      },
    },
  ]

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <LayoutHeader
          left={<ViewBreadcrumbs routeName="Dashboard" />}
          right={
            <>
              {!editing && (
                <Button
                  label={__('Refresh')}
                  iconLeft="lucide-refresh-ccw"
                  onClick={() => void dashboard.reload().catch(() => undefined)}
                />
              )}
              {!editing && isAdmin() && (
                <Button label={__('Edit')} iconLeft="lucide-pen-line" onClick={enableEditing} />
              )}
              {editing && (
                <Button label={__('Chart')} iconLeft="lucide-plus" onClick={() => setShowAddChartModal(true)} />
              )}
              {editing && isAdmin() && (
                <Button label={__('Reset to Default')} iconLeft="lucide-undo-2" onClick={() => void resetToDefault()} />
              )}
              {editing && <Button label={__('Cancel')} onClick={cancel} />}
              {editing && (
                <Button
                  variant="solid"
                  label={__('Save')}
                  disabled={!dirty}
                  loading={saving}
                  onClick={() => void save()}
                />
              )}
            </>
          }
        />

        <div className="flex items-center gap-4 p-5 pb-2">
          {!showDatePicker ? (
            <Dropdown options={presetOptions as never}>
              <Button
                label={__(preset)}
                variant="outline"
                iconLeft="lucide-calendar"
                iconRight="lucide-chevron-down"
                className="!w-full justify-start [&>span]:mr-auto [&>svg]:text-ink-gray-5"
              />
            </Dropdown>
          ) : (
            <DateRangePicker
              className="!w-48"
              value={period ? parseDateRange(period) : []}
              variant="outline"
              placeholder={__('Period')}
              onChange={(value) => {
                const next = typeof value === 'string' ? value : Array.isArray(value) ? value.join(',') : ''
                setShowDatePicker(false)
                if (!next) {
                  const fallback = getLastXDays()
                  setPeriod(fallback)
                  setPreset('Last 30 Days')
                  refetch(fallback, user)
                } else {
                  setPeriod(next)
                  setPreset(formatter(next))
                  refetch(next, user)
                }
              }}
            />
          )}
          {(isAdmin() || isManager()) && (
            <Link
              className="form-control w-48"
              variant="outline"
              value={user ? getUser(user).full_name : ''}
              doctype="User"
              filters={{ name: ['in', crmUsers.map((entry) => entry.name)], ignore_user_type: 1 }}
              placeholder={__('Sales User')}
              hideMe
              onChange={updateUser}
              prefix={() => (user ? <UserAvatar className="mr-2" user={user} size="sm" /> : null)}
              itemPrefix={({ item }) => <UserAvatar className="mr-2" user={item.value as string} size="sm" />}
              itemLabel={({ item }) => (
                <Tooltip text={item.value as string}>
                  <div className="cursor-pointer text-ink-gray-9">{getUser(item.value as string).full_name}</div>
                </Tooltip>
              )}
            />
          )}
        </div>

        <div className="w-full overflow-y-scroll">
          {!dashboard.loading && dashboard.data && (
            <DashboardGrid items={items} onItemsChange={(next) => setDraft(next)} editing={editing} />
          )}
        </div>
      </div>
      {showAddChartModal && (
        <AddChartModal
          open={showAddChartModal}
          onOpenChange={setShowAddChartModal}
          items={items}
          onItemsChange={setDraft}
          fromDate={fromDate || null}
          toDate={toDate || null}
          user={user}
        />
      )}
    </>
  )
}
