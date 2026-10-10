import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ErrorMessage, LucideIcon, Select, Textarea, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, ErrorPanel, Loading, PageHeading } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { fileToBase64 } from '../utils/format'

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Cleaning',
  'Security',
  'Lifts and Escalators',
  'Fire Safety',
  'Structural',
  'Signage',
  'Pest Control',
  'IT and Network',
  'Other',
]
const PRIORITIES = [
  { value: 'Low', label: 'Low', hint: 'Can wait' },
  { value: 'Medium', label: 'Medium', hint: 'This week' },
  { value: 'High', label: 'High', hint: 'Affects trading' },
  { value: 'Urgent', label: 'Urgent', hint: 'Safety or no trading' },
]

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let live = true
    void fileToBase64(file).then((value) => {
      if (live) setUrl(value)
    })
    return () => {
      live = false
    }
  }, [file])
  return url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null
}

export default function MaintenanceNew() {
  const navigate = useNavigate()
  const customer = usePortalStore((state) => state.customer)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.dashboard(id))
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('Other')
  const [priority, setPriority] = useState('Medium')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)

  const units = data?.units ?? []
  const selectedUnit = unit || units[0]?.unit || ''

  async function submit() {
    setProblem('')
    if (!subject.trim()) return setProblem('Tell us briefly what is wrong.')
    if (!selectedUnit) return setProblem('Choose the space this is about.')
    setBusy(true)
    try {
      const name = await portalApi.createMaintenance(customer, {
        subject: subject.trim(),
        unit: selectedUnit,
        category,
        priority,
        description,
      })
      for (const file of files) {
        await portalApi.upload('Maintenance Request', name, file.name, await fileToBase64(file), customer)
      }
      toast.success('Request sent. The maintenance team has been notified.')
      navigate(`/tenant/maintenance/${encodeURIComponent(name)}`)
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  return (
    <PortalLayout title="New request">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeading title="Report an issue" subtitle="The more detail you give, the faster we can fix it" />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <Card>
            <div className="flex flex-col gap-5">
              {units.length > 1 && (
                <Select
                  label="Which space?"
                  value={selectedUnit}
                  onChange={(value) => setUnit(String(value ?? ''))}
                  options={units.map((row) => ({
                    label: `${row.unit_name || row.unit} (${row.unit})`,
                    value: row.unit,
                  }))}
                />
              )}
              <TextInput
                label="What is wrong?"
                value={subject}
                onChange={setSubject}
                placeholder="e.g. Water leaking from ceiling near the entrance"
              />
              <Select
                label="Category"
                value={category}
                onChange={(value) => setCategory(String(value ?? 'Other'))}
                options={CATEGORIES.map((value) => ({ label: value, value }))}
              />
              <div>
                <p className="mb-2 text-sm font-medium text-ink-gray-7">How urgent is it?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRIORITIES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${priority === option.value ? 'border-[#b8860b] bg-[#b8860b]/10' : 'border-outline-gray-2 hover:bg-surface-gray-1'}`}
                    >
                      <span className="block text-sm font-semibold text-ink-gray-9">{option.label}</span>
                      <span className="block text-xs text-ink-gray-5">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Details"
                value={description}
                onChange={setDescription}
                rows={5}
                placeholder="When did it start? What have you noticed?"
              />
              <div>
                <p className="mb-2 text-sm font-medium text-ink-gray-7">Photos</p>
                <div className="flex flex-wrap gap-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="relative size-20 overflow-hidden rounded-xl border border-outline-gray-2"
                    >
                      {file.type.startsWith('image/') ? (
                        <Thumb file={file} />
                      ) : (
                        <span className="flex size-full items-center justify-center text-ink-gray-5">
                          <LucideIcon name="file" className="size-6" />
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setFiles((rows) => rows.filter((_, position) => position !== index))}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <LucideIcon name="x" className="size-3" />
                      </button>
                    </div>
                  ))}
                  {files.length < 5 && (
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline-gray-3 text-xs text-ink-gray-5 hover:bg-surface-gray-1"
                    >
                      <LucideIcon name="camera" className="size-5" />
                      Add
                    </button>
                  )}
                </div>
                <input
                  ref={input}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const picked = Array.from(event.target.files ?? [])
                    setFiles((rows) => [...rows, ...picked].slice(0, 5))
                    event.target.value = ''
                  }}
                />
              </div>
              <ErrorMessage message={problem} />
              <div className="flex justify-end gap-2">
                <Button label="Cancel" variant="subtle" onClick={() => navigate('/tenant/maintenance')} />
                <Button label="Send request" variant="solid" loading={busy} onClick={() => void submit()} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
