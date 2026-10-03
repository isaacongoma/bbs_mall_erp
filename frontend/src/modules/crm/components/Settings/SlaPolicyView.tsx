import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  ErrorMessage,
  FormControl,
  FormLabel,
  Popover,
  Select,
  Switch,
  confirmDialog,
  toast,
} from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning'
import { useUiStore } from '@/shared/stores/uiStore'
import { convertToConditions } from '@/shared/utils/conditions'
import { emptySla, emptySlaErrors, validateSla, type SlaData, type SlaErrors } from '../../utils/sla'
import { AssignmentRulesSection } from './AssignmentRulesSection'
import { SlaHolidays } from './SlaHolidays'
import { SlaPriorityList } from './SlaPriorityList'

type AnyRecord = Record<string, any>

export interface SlaPolicyViewProps {
  policy: AnyRecord | null
  fetchData: boolean
  list: AnyRecord
  onOpen: (data: AnyRecord | null, fetchData?: boolean) => void
  onBack: () => void
}

function parseDoc(data: AnyRecord): SlaData {
  let conditionJson: SlaData['condition_json']
  try {
    conditionJson = JSON.parse(data.condition_json || '[]')
  } catch {
    toast.error(__('Assignment conditions are invalid or corrupt, recreate the conditions.'))
    conditionJson = []
  }
  return {
    ...(data as SlaData),
    enabled: Boolean(data.enabled),
    default: Boolean(data.default),
    rolling_responses: Boolean(data.rolling_responses),
    condition_json: conditionJson,
    start_date: data.start_date ?? '',
    end_date: data.end_date ?? '',
    holiday_list: data.holiday_list ?? '',
  }
}

export function SlaPolicyView({ policy, fetchData, list, onOpen, onBack }: SlaPolicyViewProps) {
  const [data, setData] = useState<SlaData>(emptySla)
  const [errors, setErrors] = useState<SlaErrors>(emptySlaErrors)
  const [initial, setInitial] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(policy && fetchData))
  const [saving, setSaving] = useState(false)
  const [useNewUI, setUseNewUI] = useState(true)
  const [isOldCondition, setIsOldCondition] = useState(false)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  })

  const isNew = !policy
  const isDirty = initial !== null && JSON.stringify(data) !== initial

  function applyDoc(doc: AnyRecord) {
    const next = parseDoc(doc)
    setData(next)
    setInitial(JSON.stringify(next))
    const legacy = next.condition?.length > 0 && !(next.condition_json?.length > 0)
    setUseNewUI(!legacy)
    setIsOldCondition(legacy)
    setLoading(false)
  }

  function load(name: string) {
    return rpc<AnyRecord>({
      url: 'frappe.client.get',
      params: { doctype: 'CRM Service Level Agreement', name },
    }).then(applyDoc)
  }

  useEffect(() => {
    let cancelled = false
    if (policy?.name && fetchData) {
      void rpc<AnyRecord>({
        url: 'frappe.client.get',
        params: { doctype: 'CRM Service Level Agreement', name: policy.name },
      }).then((doc) => {
        if (!cancelled) applyDoc(doc)
      })
    }
    return () => {
      cancelled = true
    }
  }, [policy?.name, fetchData])

  useEffect(() => {
    if (!isNew) return
    const timer = setTimeout(() => setInitial((current) => current ?? JSON.stringify(dataRef.current)), 600)
    return () => clearTimeout(timer)
  }, [isNew])

  useEffect(() => {
    useUiStore.getState().set({ disableSettingModalOutsideClick: isNew || isDirty })
  }, [isDirty, isNew])

  useEffect(
    () => () => {
      useUiStore.getState().set({ disableSettingModalOutsideClick: false })
    },
    [],
  )

  useUnsavedChangesWarning(() => isDirty)

  function patch(next: Partial<SlaData>) {
    setData((current) => ({ ...current, ...next }))
  }

  function validate(key?: keyof SlaErrors, skipConditionCheck = false) {
    const result = validateSla(dataRef.current, key, skipConditionCheck)
    setErrors(result)
    return result
  }

  function goBack() {
    if (isDirty || isNew) {
      confirmDialog({
        title: __('Unsaved Changes'),
        message: __('Are you sure you want to go back? Unsaved changes will be lost.'),
        onConfirm: ({ close }: { close: () => void }) => {
          close()
          setTimeout(onBack, 250)
        },
      } as never)
      return
    }
    setTimeout(onBack, 250)
  }

  function toggleEnabled() {
    if (data.default) {
      toast.error(__('An SLA set as default cannot be disabled'))
      return
    }
    patch({ enabled: !data.enabled })
  }

  function toggleDefault() {
    const next = !data.default
    patch(next ? { default: true, enabled: true } : { default: false })
  }

  function conditionPayload() {
    return {
      condition: useNewUI
        ? convertToConditions({ conditions: data.condition_json, fieldPrefix: 'doc' })
        : data.condition,
      condition_json: useNewUI ? JSON.stringify(data.condition_json) : null,
    }
  }

  function create() {
    setSaving(true)
    list.insert.submit(
      { ...data, ...conditionPayload(), condition_json: JSON.stringify(data.condition_json) },
      {
        onSuccess: (created: AnyRecord) => {
          setSaving(false)
          toast.success(__('SLA policy created'))
          onOpen(created, true)
        },
        onError: (error: AnyRecord) => {
          setSaving(false)
          toast.error(error?.messages?.[0] || __('Some error occurred while creating SLA policy'))
        },
      },
    )
  }

  async function update() {
    if (!policy) return
    setSaving(true)
    try {
      await list.setValue.submit({ ...data, name: policy.name, ...conditionPayload() })
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Some error occurred while updating SLA policy'))
      setSaving(false)
      return
    }
    let current = policy.name as string
    if (data.name !== data.sla_name) {
      try {
        await rpc({
          url: 'frappe.client.rename_doc',
          params: { doctype: 'CRM Service Level Agreement', old_name: policy.name, new_name: data.sla_name },
        })
        current = data.sla_name
      } catch (failure) {
        toast.error(toErrorMessage(failure) || __('Some error occurred while renaming SLA policy'))
      }
    }
    await load(current)
    setSaving(false)
    toast.success(__('SLA policy updated'))
    void list.reload()
  }

  function save() {
    const result = validate(undefined, !useNewUI)
    if (Object.values(result).some(Boolean)) {
      toast.error(__('Invalid fields, check if all are filled in and values are correct.'))
      return
    }
    if (policy) {
      if (isOldCondition && useNewUI) {
        confirmDialog({
          title: __('Confirm Overwrite'),
          message: __('Your old conditions will be overwritten. Are you sure you want to save?'),
          onConfirm: ({ close }: { close: () => void }) => {
            void update()
            close()
          },
        } as never)
        return
      }
      void update()
    } else {
      create()
    }
  }

  const dateField = (field: 'start_date' | 'end_date', label: string, placeholder: string) => (
    <div className="w-full space-y-1.5">
      <FormLabel label={label} />
      <DatePicker
        value={data[field]}
        variant="subtle"
        placeholder={placeholder}
        className="w-full"
        format="DD/MM/YYYY"
        onChange={(value) => {
          const next = { ...dataRef.current, [field]: value }
          setData(next)
          setErrors(validateSla(next, field))
        }}
        prefix={() => <span className="lucide-calendar size-4" aria-hidden="true" />}
      />
      <ErrorMessage message={errors[field]} />
    </div>
  )

  return (
    <SettingsLayoutBase
      title={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={data.sla_name || __('New SLA Policy')}
            size="md"
            className="-ml-4 !max-w-96 cursor-pointer !justify-start !pr-0 text-lg-semibold text-ink-gray-7 hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={goBack}
          />
          {isDirty && <Badge variant="subtle" theme="orange" size="sm" label={__('Not Saved')} />}
        </div>
      }
      headerActions={
        <div className="flex gap-4">
          <div className="flex h-7 cursor-pointer items-center justify-between gap-2" onClick={toggleEnabled}>
            <Switch size="sm" value={data.enabled} />
            <span className="text-sm-medium text-ink-gray-7">{__('Enabled')}</span>
          </div>
          <Button
            label={__('Save')}
            theme="gray"
            variant="solid"
            disabled={Boolean(!isDirty && policy)}
            loading={saving || loading}
            onClick={save}
          />
        </div>
      }
    >
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <LoadingIndicator className="w-4" />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <FormControl
                type="text"
                size="sm"
                variant="subtle"
                placeholder={__('Name')}
                label={__('Name')}
                required
                maxLength={100}
                value={data.sla_name}
                onChange={(value: string) => patch({ sla_name: value })}
                onBlur={() => validate('sla_name')}
              />
              <ErrorMessage message={errors.sla_name} className="mt-2" />
            </div>
            <div className="space-y-1.5">
              <FormLabel label={__('Apply On')} required />
              <Select
                className="w-full"
                value={data.apply_on}
                onChange={(value) => patch({ apply_on: String(value) })}
                options={[
                  { label: 'Lead', value: 'CRM Lead' },
                  { label: 'Deal', value: 'CRM Deal' },
                ]}
              />
            </div>
            <div className="space-y-0.5">
              <Checkbox
                value={data.rolling_responses}
                label={__('Rolling Responses')}
                onChange={(value) => patch({ rolling_responses: value })}
              />
              <div className="text-p-sm text-ink-gray-5">
                {__(
                  'Restart the SLA each time the customer replies (status changes to Open) and fulfill it when marked as Replied',
                )}
              </div>
            </div>
          </div>
          <hr className="my-8 border-outline-gray-2" />
          <div>
            <div className="flex flex-col gap-1">
              <span className="text-lg-semibold text-ink-gray-8">{__('Assignment conditions')}</span>
              <span className="text-p-sm text-ink-gray-6">
                {__('Choose which leads/deals are affected by this policy.')}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <Checkbox
                  label={__('Set as default SLA')}
                  value={data.default}
                  className="text-base-medium text-ink-gray-6"
                  onChange={toggleDefault}
                />
                {isOldCondition && policy && !data.default && (
                  <div>
                    <Popover
                      hoverTrigger
                      hoverDelay={0.25}
                      placement="top-end"
                      target={() => (
                        <div className="flex cursor-default gap-1 text-sm text-ink-gray-6">
                          {__('Old Conditions')}
                          <span className="lucide-info size-4" aria-hidden="true" />
                        </div>
                      )}
                      bodyMain={() => (
                        <div className="max-w-96 text-wrap whitespace-pre-wrap rounded-md bg-surface-base p-2 text-sm leading-5 text-ink-gray-6">
                          <code>{data.condition}</code>
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
              <div className="mt-5">
                {!useNewUI && (
                  <div className="mb-2 flex flex-col items-center gap-3 rounded-md border border-outline-gray-3 p-3 py-4 text-center text-sm text-ink-gray-7">
                    <span className="text-p-sm">
                      Conditions for this SLA were created from{' '}
                      <a
                        href={`${window.location.origin}/app/crm-service-level-agreement/${policy?.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        desk
                      </a>{' '}
                      which are not compatible with this UI, you will need to recreate the conditions here if you want
                      to manage and add new conditions from this UI.
                    </span>
                    <Button
                      label={__('I understand, add conditions')}
                      variant="subtle"
                      theme="gray"
                      onClick={() => setUseNewUI(true)}
                    />
                  </div>
                )}
                {useNewUI && (
                  <AssignmentRulesSection
                    conditions={data.condition_json}
                    errors={errors.condition}
                    doctype={data.apply_on}
                    emptyLabel={__('Add a Custom Condition')}
                    debounce={100}
                    onChange={(condition_json) => patch({ condition_json })}
                    onValidate={() => validate('condition')}
                  />
                )}
              </div>
            </div>
          </div>
          <hr className="my-8 border-outline-gray-2" />
          <div>
            <div className="flex flex-col gap-1">
              <span className="text-lg-semibold text-ink-gray-8">{__('Valid From')}</span>
              <span className="text-p-sm text-ink-gray-6">{__('Choose how long this SLA policy will be active.')}</span>
            </div>
            <div className="mt-3.5 flex flex-col gap-5 md:flex-row">
              {dateField('start_date', __('Start Date'), '11/01/2025')}
              {dateField('end_date', __('End Date'), '25/12/2025')}
            </div>
          </div>
          <hr className="my-8 border-outline-gray-2" />
          <div>
            <div className="flex flex-col gap-1">
              <span className="text-lg-semibold text-ink-gray-8">{__('Response & Follow Up')}</span>
              <span className="text-p-sm text-ink-gray-6">
                {__('Add time targets around support milestones like first response')}
              </span>
            </div>
            <div className="mt-5">
              <div className="mt-5">
                <SlaPriorityList
                  data={data}
                  errors={errors}
                  isNew={isNew}
                  onChange={(priorities) => patch({ priorities })}
                  onValidate={() => validate('priorities')}
                />
              </div>
            </div>
          </div>
          <hr className="my-8 border-outline-gray-2" />
          <SlaHolidays data={data} errors={errors} onPatch={patch} />
        </div>
      )}
    </SettingsLayoutBase>
  )
}
