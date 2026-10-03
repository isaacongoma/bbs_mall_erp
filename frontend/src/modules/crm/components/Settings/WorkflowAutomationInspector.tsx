import { __ } from '@/core/i18n'
import { FormControl, cn } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { Link } from '@/shared/components/Controls/Link'
import { capabilitiesFor, useWorkflowCapabilities, type AliasTarget } from '../../stores/workflowCapabilitiesStore'
import type { StepNode } from '../../utils/workflowSteps'
import { triggerFromValue, triggerGroups, triggerValue } from '../../utils/workflowTriggers'
import { WorkflowConditionEditor } from './WorkflowConditionEditor'
import { WorkflowFilters } from './WorkflowFilters'
import { WorkflowStepEditor } from './WorkflowStepEditor'
import { WorkflowTriggerDetails } from './WorkflowTriggerDetails'

type AnyRecord = Record<string, any>

export interface WorkflowAutomationInspectorProps {
  doc: AnyRecord
  selectedStep: StepNode | null
  targets: AliasTarget[]
  loading: boolean
  onUpdate: (patch: AnyRecord) => void
  onStepChange: (patch: Partial<StepNode>) => void
}

const RUN_AS_OPTIONS = ['Triggering User', 'Document Owner', 'Automation User']
const DOCTYPE_FILTERS = { istable: 0 }

export function WorkflowAutomationInspector({
  doc,
  selectedStep,
  targets,
  loading,
  onUpdate,
  onStepChange,
}: WorkflowAutomationInspectorProps) {
  useWorkflowCapabilities((state) => state.cache)
  const capabilities = capabilitiesFor(doc.document_type)
  const fields: AnyRecord[] = capabilities?.fields || []
  const events: AnyRecord[] = capabilities?.custom_events || []
  const sections = triggerGroups(doc.document_type)
  const selectedTrigger = triggerValue(doc)

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-base">
      <div className="flex h-12 shrink-0 items-center justify-between px-2">
        <div className="text-base-semibold text-ink-gray-8">{selectedStep ? __('Step') : __('Trigger')}</div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingIndicator className="w-4" />
          </div>
        ) : selectedStep ? (
          <WorkflowStepEditor
            key={selectedStep._id}
            step={selectedStep}
            doc={doc}
            targets={targets}
            onChange={onStepChange}
          />
        ) : (
          <>
            <Link
              value={doc.document_type}
              label="DocType"
              variant="outline"
              doctype="DocType"
              filters={DOCTYPE_FILTERS}
              onChange={(value) => onUpdate({ document_type: value })}
            />
            {sections.map((section) => (
              <div key={section.group}>
                <div className="mb-2 text-base text-ink-gray-5">{section.group}</div>
                {section.options.map((trigger) => (
                  <button
                    key={trigger.value}
                    className={cn(
                      'mt-px flex h-9 w-full items-center gap-3 rounded-md px-2 text-left text-ink-gray-7 hover:bg-surface-gray-3',
                      selectedTrigger === trigger.value && 'bg-surface-gray-3',
                    )}
                    onClick={() => onUpdate(triggerFromValue(trigger.value))}
                  >
                    <span className={cn(trigger.icon, 'size-4', trigger.tone)} aria-hidden="true" />
                    <span className="text-sm">{trigger.label}</span>
                  </button>
                ))}
              </div>
            ))}
            <WorkflowTriggerDetails doc={doc} fields={fields} events={events} onUpdate={onUpdate} />
            <WorkflowFilters
              value={doc.filters}
              doctype={doc.document_type}
              flat
              onChange={(value) => onUpdate({ filters: value })}
            />
            <WorkflowConditionEditor
              value={doc.condition ?? ''}
              doctype={doc.document_type}
              label={__('Condition')}
              variant="outline"
              placeholder={__("doc.status == 'Open'")}
              onChange={(value) => onUpdate({ condition: value })}
            />
            <FormControl
              type="select"
              variant="outline"
              label={__('Run As')}
              options={RUN_AS_OPTIONS}
              value={doc.run_as ?? ''}
              onChange={(value: string) => onUpdate({ run_as: value })}
            />
            {doc.run_as === 'Automation User' && (
              <Link
                value={doc.automation_user}
                label={__('Automation User')}
                variant="outline"
                doctype="User"
                onChange={(value) => onUpdate({ automation_user: value })}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
