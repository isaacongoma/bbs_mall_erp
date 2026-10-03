import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Combobox, FormControl, cn } from '@/design-system'
import {
  actionSchema,
  capabilitiesFor,
  stepParams,
  useWorkflowCapabilities,
  type AliasTarget,
} from '../../stores/workflowCapabilitiesStore'
import { groupActionsByApp } from '../../utils/workflowBlocks'
import { actionIcon, stepTypeIcon } from '../../utils/workflowIcons'
import { defaultStepKey, type StepNode } from '../../utils/workflowSteps'
import { WorkflowComboboxIcon, WorkflowComboboxOption } from './WorkflowComboboxParts'
import { WorkflowConditionEditor } from './WorkflowConditionEditor'
import { WorkflowParamEditor } from './WorkflowParamEditor'
import { WorkflowRelatedCondition } from './WorkflowRelatedCondition'
import { WorkflowTargetPicker } from './WorkflowTargetPicker'

type AnyRecord = Record<string, any>

export interface WorkflowStepEditorProps {
  step: StepNode
  doc: AnyRecord
  targets: AliasTarget[]
  onChange: (patch: Partial<StepNode>) => void
}

const WAIT_UNITS = ['Seconds', 'Minutes', 'Hours', 'Days']
const CORRELATION_PLACEHOLDER = '{{ doc.message_id or doc.name }}'

export function WorkflowStepEditor({ step, doc, targets, onChange }: WorkflowStepEditorProps) {
  useWorkflowCapabilities((state) => state.cache)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const stepTypeOptions = [
    { label: __('Action'), value: 'Action' },
    { label: __('Wait'), value: 'Wait' },
    { label: __('Wait for event'), value: 'WaitForEvent' },
    { label: __('If / Else'), value: 'If' },
  ].map((option) => ({ ...option, ...stepTypeIcon(option.value) }))

  const params = stepParams(step)
  const suggestedKey = defaultStepKey(step)
  const targetDoctype = targets.find((target) => target.alias === (step.target || 'trigger'))?.doctype ?? undefined
  const fields: AnyRecord[] = capabilitiesFor(targetDoctype)?.fields || []
  const schema = actionSchema(targetDoctype, step.action_type)
  const actions: AnyRecord[] = capabilitiesFor(targetDoctype)?.actions || []
  const availableActions =
    !step.action_type || actions.some((action) => action.action_type === step.action_type)
      ? actions
      : [schema || { action_type: step.action_type }, ...actions]
  const actionOptions = groupActionsByApp(availableActions, (action) => ({
    value: action.action_type,
    label: action.label || action.action_type,
    ...actionIcon(action.action_type),
  }))

  const eventOptions: AnyRecord[] = capabilitiesFor(doc.document_type)?.custom_events || []
  const correlationOptions: AnyRecord[] =
    eventOptions.find((option) => option.value === params.event_name)?.correlation_options || []

  const outputKeys = Object.keys(schema?.output_schema || {})
  const outputPaths = outputKeys.map((name) => `context.steps.${step.step_key || __('<step key>')}.${name}`)

  function setParam(name: string, value: unknown) {
    onChange({ params: JSON.stringify({ ...params, [name]: value }, null, 2) })
  }

  function pickEvent(name: string) {
    const suggested = eventOptions.find((option) => option.value === name)?.correlation_options?.[0]?.value
    onChange({
      params: JSON.stringify({ ...params, event_name: name, correlation_key: suggested || '' }, null, 2),
    })
  }

  return (
    <div className="space-y-5">
      <Combobox
        value={step.step_type}
        variant="outline"
        side="bottom"
        label={__('Step Type')}
        options={stepTypeOptions}
        onChange={(value) => value && onChange({ step_type: String(value) })}
        itemPrefix={({ item }) => <WorkflowComboboxIcon item={item as AnyRecord} />}
        itemLabel={({ item }) => <WorkflowComboboxOption item={item as AnyRecord} />}
      />

      {step.step_type === 'If' ? (
        <WorkflowConditionEditor
          value={step.step_condition}
          doctype={targetDoctype ?? ''}
          variant="outline"
          label={__('Condition')}
          placeholder={__("doc.status == 'Qualified'")}
          onChange={(value) => onChange({ step_condition: value })}
        />
      ) : step.step_type === 'Wait' ? (
        <div className="flex items-start gap-2">
          <FormControl
            type="number"
            variant="outline"
            className="w-24 shrink-0"
            label={__('Wait')}
            value={params.value ?? ''}
            onChange={(value: string) => setParam('value', Number(value))}
          />
          <FormControl
            type="select"
            variant="outline"
            className="min-w-0 flex-1"
            label={__('Unit')}
            options={WAIT_UNITS}
            value={params.unit || 'Minutes'}
            onChange={(value: string) => setParam('unit', value)}
          />
        </div>
      ) : step.step_type === 'WaitForEvent' ? (
        <>
          <FormControl
            type="select"
            variant="outline"
            label={__('Wait for')}
            options={eventOptions as never}
            placeholder={__('Choose an event')}
            value={params.event_name ?? ''}
            onChange={(value: string) => pickEvent(value)}
          />
          {correlationOptions.length ? (
            <FormControl
              type="select"
              variant="outline"
              label={__('Belonging to')}
              options={correlationOptions as never}
              value={params.correlation_key ?? ''}
              onChange={(value: string) => setParam('correlation_key', value)}
            />
          ) : (
            <FormControl
              variant="outline"
              label={__('Belonging to')}
              placeholder={CORRELATION_PLACEHOLDER}
              value={params.correlation_key ?? ''}
              onChange={(value: string) => setParam('correlation_key', value)}
            />
          )}
          <div className="flex items-start gap-2">
            <FormControl
              type="number"
              variant="outline"
              className="w-24 shrink-0"
              label={__('Timeout')}
              value={params.timeout_value ?? ''}
              onChange={(value: string) => setParam('timeout_value', Number(value))}
            />
            <FormControl
              type="select"
              variant="outline"
              className="min-w-0 flex-1"
              label={__('Unit')}
              options={WAIT_UNITS}
              value={params.timeout_unit || 'Days'}
              onChange={(value: string) => setParam('timeout_unit', value)}
            />
          </div>
        </>
      ) : (
        <>
          <Combobox
            value={step.action_type}
            variant="outline"
            side="bottom"
            label={__('Action')}
            options={actionOptions as never}
            placeholder={__('Choose what this step does')}
            onChange={(value) => onChange({ action_type: String(value ?? '') })}
            itemPrefix={({ item }) => <WorkflowComboboxIcon item={item as AnyRecord} />}
            itemLabel={({ item }) => <WorkflowComboboxOption item={item as AnyRecord} />}
          />
          {targets.length > 1 && (
            <WorkflowTargetPicker
              value={step.target}
              targets={targets}
              label={__('Record')}
              onChange={(value) => onChange({ target: value })}
            />
          )}
          <WorkflowParamEditor
            key={step._id}
            action={step}
            schema={schema}
            doctype={targetDoctype}
            fields={fields}
            onParams={(next) => onChange({ params: JSON.stringify(next, null, 2) })}
          />
        </>
      )}

      {step.step_type !== 'If' && (
        <WorkflowConditionEditor
          value={step.step_condition}
          doctype={targetDoctype ?? ''}
          variant="outline"
          label={__('Only run when')}
          placeholder={__("doc.status == 'Open'")}
          onChange={(value) => onChange({ step_condition: value })}
        />
      )}

      <div className="border-t border-outline-gray-2 pt-4">
        <button
          className="flex w-full items-center gap-1 text-sm text-ink-gray-5"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <span className={cn('lucide-chevron-right size-4', showAdvanced && 'rotate-90')} aria-hidden="true" />
          {__('Advanced')}
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-5">
            <FormControl
              variant="outline"
              label={__('Step name')}
              placeholder={suggestedKey}
              description={__('Names this step in run logs and in its result path.')}
              value={step.step_key}
              onChange={(value: string) => onChange({ step_key: value })}
            />
            {schema?.output_schema && (
              <FormControl
                variant="outline"
                label={__('Name the result')}
                placeholder={__('deal')}
                description={__('Lets a later step act on what this one produced.')}
                value={step.output_alias}
                onChange={(value: string) => onChange({ output_alias: value })}
              />
            )}
            {outputPaths.length > 0 && (
              <div className="min-w-0 overflow-hidden rounded bg-surface-gray-2 p-3">
                <div className="mb-1 text-xs-semibold text-ink-gray-5">{__('Available to later steps')}</div>
                {outputPaths.map((path) => (
                  <div key={path} className="break-all font-mono text-xs text-ink-gray-7">
                    {path}
                  </div>
                ))}
              </div>
            )}
            {step.action_type === 'SetFieldValue' && (
              <WorkflowParamEditor
                key={`${step._id}-advanced`}
                action={step}
                schema={schema}
                doctype={targetDoctype}
                fields={fields}
                advanced
                onParams={(next) => onChange({ params: JSON.stringify(next, null, 2) })}
              />
            )}
            <WorkflowRelatedCondition
              value={step.related_condition}
              targets={targets}
              onChange={(value) => onChange({ related_condition: value })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
