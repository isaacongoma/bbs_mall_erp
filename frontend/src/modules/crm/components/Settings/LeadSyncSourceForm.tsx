import { useEffect, useState } from 'react'
import { httpJson } from '@/core/api'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, Combobox, ErrorMessage, FormControl, Switch, Tabs, toast } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { FacebookIcon } from '@/shared/components/Icons'
import { useMeta } from '@/shared/hooks/useMeta'
import { formatDate } from '@/shared/utils/date'
import { BACKGROUND_SYNC_FREQUENCIES, SUPPORTED_SOURCE_TYPES } from '../../utils/leadSyncSourceConfig'
import { FailureLogs } from './FailureLogs'

type AnyRecord = Record<string, any>

export interface LeadSyncSourceFormProps {
  sourceData: AnyRecord | null
  sources: AnyRecord
  onBack: () => void
}

export function LeadSyncSourceForm({ sourceData, sources, onBack }: LeadSyncSourceFormProps) {
  const [isLocal, setIsLocal] = useState(!sourceData?.name || Boolean(sourceData?.__duplicate))
  const [source, setSource] = useState<AnyRecord>(() => ({
    name: sourceData?.name ? `${sourceData.name}` : '',
    type: sourceData?.type ?? '',
    access_token: '',
    facebook_page: sourceData?.facebook_page ?? '',
    facebook_lead_form: sourceData?.facebook_lead_form ?? '',
    enabled: sourceData?.enabled ?? true,
    background_sync_frequency: sourceData?.background_sync_frequency ?? 'Hourly',
    last_synced_at: sourceData?.last_synced_at ?? null,
  }))
  const [editingName] = useState<string | null>(sourceData?.name ?? null)
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [form, setForm] = useState<AnyRecord | null>(null)
  const [questions, setQuestions] = useState<AnyRecord[]>([])
  const { getFields } = useMeta('CRM Lead')

  const leadFieldOptions = (getFields() ?? []).map((field: AnyRecord) => ({
    label: field.label || field.fieldname,
    value: field.fieldname,
  }))

  const formName: string = source.facebook_lead_form
  useEffect(() => {
    let cancelled = false
    if (!formName) return
    void rpc<AnyRecord>({ url: `/api/crm/facebook-lead-forms/${encodeURIComponent(formName)}/` }).then((doc) => {
      if (cancelled) return
      setForm(doc)
      setQuestions(doc.questions ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [formName])

  useEffect(() => {
    let cancelled = false
    if (!editingName || sourceData?.__duplicate) return
    void rpc<AnyRecord>({ url: `/api/crm/lead-sync-sources/${encodeURIComponent(editingName)}/` }).then((doc) => {
      if (!cancelled) setSource((current) => ({ ...current, ...doc, access_token: current.access_token }))
    })
    return () => {
      cancelled = true
    }
  }, [editingName, sourceData?.__duplicate])

  function patch(values: AnyRecord) {
    setSource((current) => ({ ...current, ...values }))
  }

  async function saveMapping() {
    if (!formName || !form) return
    await httpJson('PATCH', `/api/crm/facebook-lead-forms/${encodeURIComponent(formName)}/`, { body: { questions } })
  }

  async function createOrUpdate() {
    setSaving(true)
    try {
      const body: AnyRecord = { ...source }
      if (!body.access_token) delete body.access_token
      if (!body.facebook_page) body.facebook_page = null
      if (!body.facebook_lead_form) body.facebook_lead_form = null
      delete body.last_synced_at
      if (isLocal) {
        await sources.insert.submit({ ...body, type: source.type })
        toast.success(__('Lead sync source created successfully'))
        setIsLocal(false)
      } else {
        await sources.setValue.submit({ ...body, name: source.name })
        await saveMapping()
        toast.success(__('Lead sync source updated successfully'))
      }
      void sources.reload()
    } catch (failure) {
      toast.error(
        toErrorMessage(failure) ||
          (isLocal ? __('Error creating lead sync source') : __('Error updating lead sync source')),
      )
    } finally {
      setSaving(false)
    }
  }

  async function syncNow() {
    setSyncing(true)
    setSyncError('')
    try {
      await rpc({ url: `/api/crm/lead-sync-sources/${encodeURIComponent(source.name)}/sync-leads/`, method: 'POST' })
      toast.success(__('Syncing started in background'))
    } catch (failure) {
      const message = toErrorMessage(failure) || __('Error syncing leads')
      setSyncError(message)
      toast.error(message)
    } finally {
      setSyncing(false)
    }
  }

  const selectedType = SUPPORTED_SOURCE_TYPES.find((type) => type.value === source.type)
  const tabs = [
    { label: __('Details'), icon: 'lucide-info' },
    ...(isLocal ? [] : [{ label: __('Failure Logs'), icon: 'lucide-refresh-cw' }]),
  ]

  return (
    <div className="flex h-full flex-col text-ink-gray-8">
      <div className="flex justify-between px-2 pt-2">
        <div className="-ml-4 flex w-9/12 gap-1">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={isLocal ? __('New Lead Sync Source') : source.name}
            size="md"
            className="!max-w-96 cursor-pointer !justify-start !pr-0 text-2xl-semibold hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={onBack}
          />
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-4">
          <div className="flex items-center space-x-2">
            <Switch size="sm" value={Boolean(source.enabled)} onChange={(value) => patch({ enabled: value })} />
            <span className="text-sm text-ink-gray-7">{__('Enabled')}</span>
          </div>
          {!isLocal && (
            <Button label={__('Sync Now')} variant="outline" loading={syncing} onClick={() => void syncNow()} />
          )}
          <Button
            label={isLocal ? __('Create') : __('Update')}
            iconLeft="lucide-plus"
            variant="solid"
            loading={saving}
            onClick={() => void createOrUpdate()}
          />
        </div>
      </div>

      <Tabs
        className="mt-2"
        tabs={tabs}
        value={Math.min(tab, tabs.length - 1)}
        onChange={setTab}
        tabPanel={({ tab: current }) =>
          current.label === __('Details') ? (
            <div className="mt-4 flex h-full flex-col gap-6 overflow-hidden">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Combobox
                    value={source.type || null}
                    options={SUPPORTED_SOURCE_TYPES}
                    label={__('Source Type')}
                    required
                    placeholder={__('Select Source Type')}
                    onChange={(value) => patch({ type: value ?? '' })}
                    prefix={() => (selectedType ? <FacebookIcon className="mr-2 size-4" /> : null)}
                    itemPrefix={() => <FacebookIcon className="size-4" />}
                  />
                </div>
                {isLocal && (
                  <FormControl
                    type="text"
                    required
                    label={__('Source Name')}
                    placeholder={__('Enter Source Name')}
                    value={source.name}
                    onChange={(value: string) => patch({ name: value })}
                  />
                )}
                <FormControl
                  type="select"
                  required
                  label={__('Background Sync Frequency')}
                  options={BACKGROUND_SYNC_FREQUENCIES}
                  value={source.background_sync_frequency}
                  onChange={(value: string) => patch({ background_sync_frequency: value })}
                />
                <FormControl
                  type="password"
                  required
                  label={__('Access Token')}
                  placeholder={isLocal ? __('Enter Access Token') : '*****'}
                  value={source.access_token}
                  onChange={(value: string) => patch({ access_token: value })}
                  suffix={
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens/"
                    >
                      <span className="lucide-circle-question-mark w-4" aria-hidden="true" />
                    </a>
                  }
                />
                {!isLocal && source.last_synced_at && (
                  <FormControl
                    type="text"
                    disabled
                    label={__('Last Synced At')}
                    value={formatDate(source.last_synced_at, '', true, true)}
                  />
                )}
                {!isLocal && (
                  <Link
                    value={source.facebook_page}
                    label="Facebook Page"
                    doctype="Facebook Page"
                    onChange={(value) => patch({ facebook_page: value, facebook_lead_form: '' })}
                  />
                )}
                {!isLocal && source.facebook_page && (
                  <Link
                    value={source.facebook_lead_form}
                    label="Lead Form"
                    doctype="Facebook Lead Form"
                    filters={{ page: source.facebook_page }}
                    onChange={(value) => patch({ facebook_lead_form: value })}
                  />
                )}
              </div>

              {source.facebook_lead_form && form && (
                <div>
                  <div className="mb-2 text-base-semibold text-ink-gray-8">{__('Field Mapping')}</div>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-3 gap-2 border-b px-3 py-2 text-sm text-ink-gray-5">
                      <span>{__('Question')}</span>
                      <span>{__('Type')}</span>
                      <span>{__('Mapped To CRM Field')}</span>
                    </div>
                    {questions.map((question, index) => (
                      <div
                        key={question.key}
                        className="grid grid-cols-3 items-center gap-2 border-b px-3 py-2 last:border-b-0"
                      >
                        <span className="truncate text-base">{question.label || question.key}</span>
                        <span className="truncate text-base text-ink-gray-6">{question.type}</span>
                        <Combobox
                          value={question.mapped_to_crm_field || null}
                          options={leadFieldOptions}
                          placeholder={__('Not Synced')}
                          onChange={(value) =>
                            setQuestions((current) =>
                              current.map((row, at) =>
                                at === index ? { ...row, mapped_to_crm_field: value ?? '' } : row,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                    {!questions.length && (
                      <div className="p-4 text-center text-ink-gray-5">{__('No questions found')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <FailureLogs source={source.name} />
            </div>
          )
        }
      />

      <ErrorMessage message={syncError} />
    </div>
  )
}
