import { useState } from 'react'
import { Button, Checkbox, ErrorMessage, Select, Textarea, TextInput, toast } from '@/design-system'
import { shopApi } from '../api/shop'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, Loading, PageHeading } from '../components/PortalUi'
import { ShopGate } from '../components/ShopGate'
import { usePortalQuery } from '../hooks/usePortalQuery'
import type { HoursRow, ShopProfile as Profile } from '../types/shop'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const PLATFORMS = ['Website', 'Facebook', 'Instagram', 'X', 'TikTok', 'YouTube', 'WhatsApp']

function fullWeek(rows: HoursRow[]): HoursRow[] {
  return DAYS.map((day) => rows.find((row) => row.day === day) ?? { day, is_closed: 0, opens_at: '08:00:00', closes_at: '18:00:00' })
}

function Form() {
  const { data, loading, error, reload } = usePortalQuery(() => shopApi.profile())
  const [edits, setEdits] = useState<Partial<Profile>>({})
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading && !data) return <Loading />
  if (error) return <ErrorPanel message={error} onRetry={reload} />
  if (!data) return null
  const values: Profile = { ...data, ...edits }
  const hours = fullWeek(values.working_hours)
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setEdits((current) => ({ ...current, [key]: value }))

  async function save() {
    setBusy(true)
    setProblem('')
    try {
      await shopApi.saveProfile({ ...values, working_hours: hours })
      toast.success('Shop profile saved')
      setEdits({})
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Shop profile" subtitle="How shoppers see your shop" actions={<Button label="Save" variant="solid" loading={busy} onClick={() => void save()} />} />
      <ErrorMessage message={problem} />
      <Card title="About">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Tagline" value={values.tagline ?? ''} onChange={(value) => set('tagline', value)} />
          <TextInput label="Contact phone" value={values.contact_phone ?? ''} onChange={(value) => set('contact_phone', value)} />
          <TextInput label="Contact email" value={values.contact_email ?? ''} onChange={(value) => set('contact_email', value)} />
          <Checkbox
            label="Holiday mode (pause new orders)"
            value={Boolean(values.holiday_mode)}
            onChange={(value) => set('holiday_mode', value ? 1 : 0)}
          />
          <div className="sm:col-span-2">
            <Textarea label="About your shop" value={values.description ?? ''} onChange={(value) => set('description', value)} rows={4} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Return policy" value={values.return_policy ?? ''} onChange={(value) => set('return_policy', value)} rows={3} />
          </div>
        </div>
      </Card>
      <Card title="Opening hours">
        <div className="flex flex-col gap-3">
          {hours.map((row) => (
            <div key={row.day} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-3">
              <span className="text-sm font-medium text-ink-gray-8">{row.day}</span>
              <Checkbox
                label="Closed"
                value={Boolean(row.is_closed)}
                onChange={(value) => set('working_hours', hours.map((item) => (item.day === row.day ? { ...item, is_closed: value ? 1 : 0 } : item)))}
              />
              <TextInput
                type="time"
                value={(row.opens_at ?? '').slice(0, 5)}
                onChange={(value) => set('working_hours', hours.map((item) => (item.day === row.day ? { ...item, opens_at: `${value}:00` } : item)))}
              />
              <TextInput
                type="time"
                value={(row.closes_at ?? '').slice(0, 5)}
                onChange={(value) => set('working_hours', hours.map((item) => (item.day === row.day ? { ...item, closes_at: `${value}:00` } : item)))}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card
        title="Closed dates"
        action={<Button label="Add" variant="subtle" size="sm" onClick={() => set('closed_dates', [...values.closed_dates, { date: '', reason: '' }])} />}
      >
        {values.closed_dates.length === 0 ? (
          <p className="text-sm text-ink-gray-5">Holidays and days you will not process orders.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {values.closed_dates.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_2fr_auto] items-end gap-3">
                <TextInput label="Date" type="date" value={row.date} onChange={(value) => set('closed_dates', values.closed_dates.map((item, position) => (position === index ? { ...item, date: value } : item)))} />
                <TextInput label="Reason" value={row.reason ?? ''} onChange={(value) => set('closed_dates', values.closed_dates.map((item, position) => (position === index ? { ...item, reason: value } : item)))} />
                <Button label="Remove" variant="subtle" size="sm" onClick={() => set('closed_dates', values.closed_dates.filter((_, position) => position !== index))} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card
        title="Social links"
        action={<Button label="Add" variant="subtle" size="sm" onClick={() => set('social_links', [...values.social_links, { platform: 'Website', url: '' }])} />}
      >
        <div className="flex flex-col gap-3">
          {values.social_links.map((row, index) => (
            <div key={index} className="grid grid-cols-[160px_1fr_auto] items-end gap-3">
              <Select
                value={row.platform}
                onChange={(value) => set('social_links', values.social_links.map((item, position) => (position === index ? { ...item, platform: String(value) } : item)))}
                options={PLATFORMS.map((value) => ({ label: value, value }))}
              />
              <TextInput value={row.url} onChange={(value) => set('social_links', values.social_links.map((item, position) => (position === index ? { ...item, url: value } : item)))} />
              <Button label="Remove" variant="subtle" size="sm" onClick={() => set('social_links', values.social_links.filter((_, position) => position !== index))} />
            </div>
          ))}
        </div>
      </Card>
      <Card
        title="Shop tags"
        action={<Button label="Add" variant="subtle" size="sm" onClick={() => set('shop_tags', [...values.shop_tags, { tag: '' }])} />}
      >
        <div className="flex flex-wrap gap-3">
          {values.shop_tags.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <TextInput value={row.tag} onChange={(value) => set('shop_tags', values.shop_tags.map((item, position) => (position === index ? { tag: value } : item)))} />
              <Button label="x" variant="subtle" size="sm" onClick={() => set('shop_tags', values.shop_tags.filter((_, position) => position !== index))} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function ShopProfile() {
  return (
    <PortalLayout title="Shop profile">
      <ShopGate>{() => <Form />}</ShopGate>
    </PortalLayout>
  )
}
