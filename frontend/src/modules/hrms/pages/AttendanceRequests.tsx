import { DocumentListPage } from '../components/DocumentListPage'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function AttendanceRequests() {
  const { documents, resource } = useHrmsDocumentList('Attendance Request', useHrmsEmployee())
  return (
    <DocumentListPage
      title="Attendance Request History"
      emptyName="Attendance Requests"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'reason', 'from_date', 'to_date', 'docstatus']}
      createPath="/hrms/attendance/requests/new"
      filters={[{ field: 'docstatus', label: 'Document Status', options: ['0', '1', '2'] }]}
    />
  )
}
