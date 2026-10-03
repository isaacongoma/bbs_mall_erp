import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import {
  Badge,
  Button,
  ErrorMessage,
  FormControl,
  FormLabel,
  Popover,
  Select,
  Switch,
  createDialog,
  confirmDialog,
  toast,
} from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning'
import { useUiStore } from '@/shared/stores/uiStore'
import { convertToConditions } from '@/shared/utils/conditions'
import { toErrorMessage } from '@/core/api/errors'
import {
  PRIORITY_OPTIONS,
  describeErrors,
  emptyErrors,
  emptyRule,
  ruleFromDoc,
  validateRule,
  type AssignmentRuleData,
  type AssignmentRuleErrors,
  type RuleField,
} from '../../utils/assignmentRules'
import { AssigneeRules } from './AssigneeRules'
import { AssignmentRulesSection } from './AssignmentRulesSection'
import { AssignmentSchedule } from './AssignmentSchedule'
import { PopoverSelect } from './PopoverSelect'

type AnyRecord = Record<string, any>

export interface AssignmentRuleViewProps {
  rule: AnyRecord | null
  onOpen: (data: AnyRecord | null) => void
  onBack: () => void
}

function OldCondition({ condition }: { condition: string }) {
  return (
    <Popover
      hoverTrigger
      hoverDelay={0.25}
      placement="top-end"
      target={() => (
        <div className="flex cursor-default items-center gap-1 text-nowrap text-sm text-ink-gray-6">
          <span>{__('Old Condition')}</span>
          <span className="lucide-info size-4" aria-hidden="true" />
        </div>
      )}
      bodyMain={() => (
        <div className="max-w-96 text-wrap whitespace-pre-wrap rounded-md bg-surface-base p-2 text-sm leading-5 text-ink-gray-6">
          <code>{condition}</code>
        </div>
      )}
    />
  )
}

function LegacyNotice({ name, onAccept }: { name?: string; onAccept: () => void }) {
  return (
    <div className="mb-2 flex flex-col items-center gap-3 rounded-md border border-outline-gray-2 p-3 py-4 text-center text-sm text-ink-gray-7">
      <span className="text-p-sm">
        {__('Conditions for this rule were created from')}{' '}
        <a
          href={`${window.location.origin}/app/assignment-rule/${name}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {__('desk')}
        </a>{' '}
        {__(
          'which are not compatible with this UI, you will need to recreate the conditions here if you want to manage and add new conditions from this UI.',
        )}
      </span>
      <Button label={__('I understand, add conditions')} variant="subtle" theme="gray" onClick={onAccept} />
    </div>
  )
}

export function AssignmentRuleView({ rule, onOpen, onBack }: AssignmentRuleViewProps) {
  const [data, setData] = useState<AssignmentRuleData>(emptyRule)
  const [errors, setErrors] = useState<AssignmentRuleErrors>(emptyErrors)
  const [initial, setInitial] = useState<string | null>(() => (rule ? null : JSON.stringify(emptyRule())))
  const [loading, setLoading] = useState(Boolean(rule))
  const [saving, setSaving] = useState(false)
  const [useNewUI, setUseNewUI] = useState(true)
  const [isOldCondition, setIsOldCondition] = useState(false)
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  })

  const isDirty = initial !== null && JSON.stringify(data) !== initial
  const documentType = data.documentType === 'CRM Lead' ? __('leads') : __('deals')

  function applyDoc(doc: AnyRecord) {
    const next = ruleFromDoc(doc)
    setData(next)
    setInitial(JSON.stringify(next))
    const legacy = next.assignCondition?.length > 0 && !(next.assignConditionJson?.length > 0)
    setUseNewUI(!legacy)
    setIsOldCondition(legacy)
    setLoading(false)
  }

  function load(name: string) {
    setLoading(true)
    return rpc<AnyRecord>({ url: 'frappe.client.get', params: { doctype: 'Assignment Rule', name } }).then(applyDoc)
  }

  useEffect(() => {
    let cancelled = false
    if (rule?.name) {
      void rpc<AnyRecord>({ url: 'frappe.client.get', params: { doctype: 'Assignment Rule', name: rule.name } }).then(
        (doc) => {
          if (!cancelled) applyDoc(doc)
        },
      )
    }
    return () => {
      cancelled = true
    }
  }, [rule?.name])

  useEffect(() => {
    useUiStore.getState().set({ disableSettingModalOutsideClick: isDirty })
  }, [isDirty])

  useEffect(
    () => () => {
      useUiStore.getState().set({ disableSettingModalOutsideClick: false })
    },
    [],
  )

  useUnsavedChangesWarning(() => isDirty)

  function patch(next: Partial<AssignmentRuleData>) {
    setData((current) => ({ ...current, ...next }))
  }

  function validate(key?: RuleField, skipConditionCheck = false) {
    const result = validateRule(dataRef.current, errors, key, skipConditionCheck)
    setErrors(result)
    return result
  }

  function goBack() {
    if (isDirty) {
      createDialog({
        title: __('Unsaved Changes'),
        message: __('Are you sure you want to go back? Unsaved changes will be lost.'),
        actions: [
          {
            label: __('Go Back'),
            variant: 'solid',
            onClick: ({ close }) => {
              onBack()
              close()
            },
          },
        ],
      })
      return
    }
    onBack()
  }

  function conditionPayload() {
    return {
      assign_condition: useNewUI ? convertToConditions({ conditions: data.assignConditionJson }) : data.assignCondition,
      unassign_condition: useNewUI
        ? convertToConditions({ conditions: data.unassignConditionJson })
        : data.unassignCondition,
      assign_condition_json: useNewUI ? JSON.stringify(data.assignConditionJson) : null,
      unassign_condition_json: useNewUI ? JSON.stringify(data.unassignConditionJson) : null,
    }
  }

  async function create() {
    setSaving(true)
    try {
      const created = await rpc<AnyRecord>({
        url: 'frappe.client.insert',
        params: {
          doc: {
            doctype: 'Assignment Rule',
            document_type: data.documentType,
            rule: data.rule,
            priority: data.priority,
            users: data.users,
            disabled: data.disabled,
            description: data.description,
            assignment_days: data.assignmentDays.map((day) => ({ day })),
            name: data.assignmentRuleName,
            assignment_rule_name: data.assignmentRuleName,
            ...conditionPayload(),
          },
        },
      })
      toast.success(__('Assignment rule created'))
      onOpen(created)
    } catch (failure) {
      toast.error(toErrorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  async function update() {
    setSaving(true)
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: {
          doctype: 'Assignment Rule',
          name: data.name,
          fieldname: {
            rule: data.rule,
            priority: data.priority,
            users: data.users,
            disabled: data.disabled,
            description: data.description,
            document_type: data.documentType,
            assignment_days: data.assignmentDays.map((day) => ({ day })),
            ...conditionPayload(),
          },
        },
      })
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Some error occurred while updating assignment rule'))
      setSaving(false)
      return
    }
    let currentName = data.name
    if (data.name !== data.assignmentRuleName) {
      try {
        await rpc({
          url: 'frappe.client.rename_doc',
          params: { doctype: 'Assignment Rule', old_name: data.name, new_name: data.assignmentRuleName },
        })
        currentName = data.assignmentRuleName
      } catch (failure) {
        toast.error(toErrorMessage(failure) || __('Some error occurred while renaming assignment rule'))
      }
    }
    await load(currentName)
    setSaving(false)
    toast.success(__('Assignment rule updated'))
  }

  function save() {
    const result = validate(undefined, !useNewUI)
    const message = describeErrors(result)
    if (message) {
      toast.error(message)
      return
    }
    if (rule) {
      if (isOldCondition && useNewUI) {
        confirmDialog({
          title: __('Confirm Overwrite'),
          message: __('Your old condition will be overwritten. Are you sure you want to save?'),
          onConfirm: ({ close }: { close: () => void }) => {
            void update()
            close()
          },
        } as never)
        return
      }
      void update()
    } else {
      void create()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingIndicator className="w-4" />
      </div>
    )
  }

  const sections = [
    {
      key: 'assignCondition' as const,
      title: __('Assignment Condition'),
      description: __('Choose which {0} are affected by this assignment rule.', [documentType]),
      json: data.assignConditionJson,
      legacy: data.assignCondition,
      error: errors.assignConditionError,
      field: 'assignConditionJson' as const,
      showOld: isOldCondition && Boolean(rule),
    },
    {
      key: 'unassignCondition' as const,
      title: __('Unassignment Condition'),
      description: __('Choose which {0} are affected by this un-assignment rule.', [documentType]),
      json: data.unassignConditionJson,
      legacy: data.unassignCondition,
      error: errors.unassignConditionError,
      field: 'unassignConditionJson' as const,
      showOld: isOldCondition && Boolean(rule) && Boolean(data.unassignCondition),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
      <div className="flex w-full justify-between px-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            iconLeft="lucide-chevron-left"
            label={data.assignmentRuleName || __('New Assignment Rule')}
            size="md"
            className="-ml-4 !max-w-96 cursor-pointer !justify-start !pr-0 text-2xl-semibold hover:bg-transparent hover:opacity-70 focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 active:bg-transparent active:text-ink-gray-5 active:outline-none active:ring-0 active:ring-offset-0"
            onClick={goBack}
          />
          {isDirty && <Badge variant="subtle" theme="orange" size="sm" label={__('Not Saved')} />}
        </div>
        <div className="flex gap-4">
          <div
            className="flex h-7 items-center justify-between gap-2"
            onClick={() => patch({ disabled: !data.disabled })}
          >
            <Switch size="sm" value={!data.disabled} />
            <span className="text-sm text-ink-gray-7">{__('Enabled')}</span>
          </div>
          <Button
            disabled={Boolean(!isDirty && rule)}
            label={__('Save')}
            theme="gray"
            variant="solid"
            loading={saving}
            onClick={save}
          />
        </div>
      </div>
      <div className="overflow-y-auto px-2">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <FormControl
              type="text"
              size="sm"
              variant="subtle"
              placeholder={__('Name')}
              label={__('Name')}
              required
              maxLength={50}
              value={data.assignmentRuleName}
              onChange={(value: string) => patch({ assignmentRuleName: value })}
              onBlur={() => validate('assignmentRuleName')}
            />
            <ErrorMessage message={errors.assignmentRuleName} className="mt-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label={__('Priority')} />
            <PopoverSelect
              options={PRIORITY_OPTIONS}
              value={data.priority}
              onChange={(priority) => patch({ priority })}
              triggerClassName="cursor-default"
              bodyClassName="absolute top-1 w-[--reka-popper-anchor-width] bg-white"
            />
          </div>
          <div>
            <FormControl
              type="textarea"
              size="sm"
              variant="subtle"
              placeholder={__('Description')}
              label={__('Description')}
              required
              maxLength={250}
              value={data.description}
              onChange={(value: string) => patch({ description: value })}
              onBlur={() => validate('description')}
            />
            <ErrorMessage message={errors.description} className="mt-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label={__('Apply On')} />
            <Select
              value={data.documentType}
              onChange={(value) => patch({ documentType: String(value) })}
              options={[
                { label: 'Lead', value: 'CRM Lead' },
                { label: 'Deal', value: 'CRM Deal' },
              ]}
            />
          </div>
        </div>
        {sections.map((section) => (
          <div key={section.key}>
            <hr className="my-8" />
            <div>
              <div className="flex flex-col gap-1">
                <span className="text-lg-semibold text-ink-gray-8">{section.title}</span>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-p-sm text-ink-gray-6">
                    {section.description}{' '}
                    <a
                      className="font-medium underline"
                      href="https://docs.frappe.io/crm/assignment-rule"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {__('Learn about conditions')}
                    </a>
                  </span>
                  {section.showOld && (
                    <div>
                      <OldCondition condition={section.legacy} />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5">
                {!useNewUI && section.legacy ? (
                  <LegacyNotice name={rule?.name} onAccept={() => setUseNewUI(true)} />
                ) : (
                  <AssignmentRulesSection
                    conditions={section.json}
                    errors={section.error}
                    doctype={data.documentType}
                    onChange={(conditions) => patch({ [section.field]: conditions })}
                    onValidate={() => validate(section.key)}
                  />
                )}
                {section.key === 'assignCondition' && (
                  <div className="flex justify-end">
                    <ErrorMessage message={errors.assignCondition} className="mt-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <hr className="my-8" />
        <div>
          <div className="flex flex-col gap-1">
            <span className="text-lg-semibold text-ink-gray-8">{__('Assignment Schedule')}</span>
            <span className="text-p-sm text-ink-gray-6">
              {__('Choose the days of the week when this rule should be active.')}
            </span>
          </div>
          <div className="mt-6">
            <AssignmentSchedule
              days={data.assignmentDays}
              error={errors.assignmentDays}
              onChange={(assignmentDays) => patch({ assignmentDays })}
            />
          </div>
        </div>
        <hr className="my-8" />
        <AssigneeRules
          data={data}
          usersError={errors.users}
          onChange={patch}
          onUsersChanged={(users) => {
            patch({ users })
            setErrors((current) => ({ ...current, users: users.length > 0 ? '' : __('Users are required') }))
          }}
        />
      </div>
    </div>
  )
}
