import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { EmptyState } from '@/shared/components/ListViews/EmptyState'
import { AssignmentRuleListItem } from './AssignmentRuleListItem'

type AnyRecord = Record<string, any>

export interface AssignmentRulesProps {
  onOpen: (data: AnyRecord | null) => void
}

export function AssignmentRules({ onOpen }: AssignmentRulesProps) {
  const list = useResource<AnyRecord[]>({
    url: 'crm.api.assignment_rule.get_assignment_rules_list',
    cache: 'assignmentRules.get_assignment_rules_list',
    auto: true,
  })
  const rules = list.data ?? null

  return (
    <div className="flex h-full flex-col gap-6 p-6 text-ink-gray-8">
      <div className="flex justify-between px-2 pt-2">
        <div className="flex w-9/12 flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{__('Assignment Rules')}</h2>
          <p className="text-p-base text-ink-gray-6">
            {__('Auto-assign leads/deals to the right sales user based on predefined conditions')}
          </p>
        </div>
        <div className="item-center flex w-3/12 justify-end space-x-2">
          <Button label={__('New')} iconLeft="lucide-plus" variant="solid" onClick={() => onOpen(null)} />
        </div>
      </div>

      <div className="flex h-full overflow-y-auto">
        {list.loading && !rules ? (
          <div className="mt-12 flex w-full items-center justify-center">
            <LoadingIndicator className="w-4" />
          </div>
        ) : rules?.length === 0 ? (
          <EmptyState
            name="Assignment Rules"
            title="No Assignment Rules Found"
            description={__('Add one to get started.')}
            icon="settings"
          />
        ) : (
          <div className="w-full">
            <div className="flex items-center p-2 text-sm text-ink-gray-5">
              <div className="w-7/12">{__('Assignment Rule')}</div>
              <div className="w-3/12">{__('Priority')}</div>
              <div className="w-2/12">{__('Enabled')}</div>
            </div>
            <div className="mx-2 h-px border-t border-outline-elevation-2" />
            <div className="overflow-y-auto">
              {(rules ?? []).map((rule, index, all) => (
                <div key={rule.name}>
                  <AssignmentRuleListItem data={rule} onOpen={onOpen} onReload={() => void list.reload()} />
                  {all.length !== index + 1 && <hr className="mx-2" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
