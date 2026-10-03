import { capture } from '@/core/telemetry'
import { DocListPage } from '@/shared/components/DocListPage'
import { Email2Icon } from '@/shared/components/Icons'
import { useOpenFromUrl } from '@/shared/hooks/useOpenFromUrl'
import { useUsers } from '@/shared/hooks/useUsers'
import { useUiStore } from '@/shared/stores/uiStore'
import { getUser } from '@/shared/stores/usersStore'
import { TasksKanban } from '../components/TasksKanban'
import { useSettings } from '../hooks/useSettings'
import { tasksListConfig } from '../utils/listConfigs'
import { timestampCell } from '../utils/timestampCell'

type AnyRecord = Record<string, any>

const CONTROLLER_OPTIONS = { allowedViews: ['list', 'kanban'] }
const SKIP_DATE_FORMAT = ['modified', 'creation', 'due_date']

const CELLS = {
  modified: (record: AnyRecord) => timestampCell(record.modified),
  creation: (record: AnyRecord) => timestampCell(record.creation),
  assigned_to: (record: AnyRecord) => ({
    label: record.assigned_to && getUser(record.assigned_to).full_name,
    ...(record.assigned_to ? getUser(record.assigned_to) : {}),
  }),
}

function OpenTaskFromUrl({ ready, onOpen }: { ready: boolean; onOpen: (name: string) => void }) {
  useOpenFromUrl(ready, onOpen)
  return null
}

export default function Tasks() {
  useUsers()
  const { brand } = useSettings()
  const showDoctypeModal = useUiStore((state) => state.showDoctypeModal)

  function callbacks(reload: () => void) {
    return {
      afterInsert: () => {
        reload()
        capture('task_created')
      },
      afterUpdate: () => {
        reload()
        capture('task_updated')
      },
    }
  }

  function showTask(name: string, reload: () => void) {
    showDoctypeModal({ name, doctype: 'CRM Task', title: 'Task', callbacks: callbacks(reload) })
  }

  function createTask(reload: () => void, columnField?: string, column?: AnyRecord) {
    const defaults: AnyRecord = { status: 'Backlog', priority: 'Low' }
    if (column?.column?.name && columnField) defaults[columnField] = column.column.name
    showDoctypeModal({ doctype: 'CRM Task', title: 'Task', defaults, callbacks: callbacks(reload) })
  }

  return (
    <DocListPage
      routeName="Tasks"
      doctype="CRM Task"
      emptyName="Tasks"
      emptyIcon={Email2Icon}
      config={(controller) =>
        tasksListConfig((name) => showTask(name, () => void controller.list.reload().catch(() => undefined)))
      }
      controllerOptions={CONTROLLER_OPTIONS}
      brandFavicon={brand.favicon}
      rows={{ cells: CELLS, skipDateFormat: SKIP_DATE_FORMAT }}
      kanbanRequiresRows
      onCreate={(controller) => createTask(() => void controller.list.reload().catch(() => undefined))}
      renderKanban={({ controller, rows }) => {
        const reload = () => void controller.list.reload().catch(() => undefined)
        return (
          <TasksKanban
            controller={controller}
            rows={rows}
            onShowTask={(name) => showTask(name, reload)}
            onCreateTask={(column) => createTask(reload, controller.list.params?.column_field, column)}
          />
        )
      }}
      renderExtras={({ controller, rows }) => (
        <OpenTaskFromUrl
          ready={rows.length > 0}
          onOpen={(name) =>
            showTask(String(parseInt(name)), () => void controller.list.reload().catch(() => undefined))
          }
        />
      )}
    />
  )
}
