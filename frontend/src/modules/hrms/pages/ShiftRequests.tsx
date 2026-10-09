import { DocumentListPage } from '../components/DocumentListPage'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function ShiftRequests() {
  const { documents, resource } = useHrmsDocumentList('Shift Request', useHrmsEmployee())
  return (
    <DocumentListPage
      title="Shift Request History"
      emptyName="Shift Requests"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'shift_type', 'from_date', 'to_date', 'status']}
      createPath="/hrms/attendance/shifts/new"
      filters={[{ field: 'status', label: 'Status', options: ['Open', 'Approved', 'Rejected', 'Cancelled'] }]}
    />
  )
}
