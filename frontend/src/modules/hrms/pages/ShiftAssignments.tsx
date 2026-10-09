import { DocumentListPage } from '../components/DocumentListPage'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function ShiftAssignments() {
  const { documents, resource } = useHrmsDocumentList('Shift Assignment', useHrmsEmployee())
  return (
    <DocumentListPage
      title="Shift Assignment History"
      emptyName="Shift Assignments"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'shift_type', 'start_date', 'end_date', 'docstatus']}
      filters={[{ field: 'docstatus', label: 'Document Status', options: ['0', '1', '2'] }]}
    />
  )
}
