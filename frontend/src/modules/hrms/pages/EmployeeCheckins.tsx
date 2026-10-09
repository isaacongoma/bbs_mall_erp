import { DocumentListPage } from '../components/DocumentListPage'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsDocumentList } from '../stores/listStore'

export default function EmployeeCheckins() {
  const { documents, resource } = useHrmsDocumentList('Employee Checkin', useHrmsEmployee())
  return (
    <DocumentListPage
      title="Employee Checkin History"
      emptyName="Employee Checkins"
      documents={documents}
      loading={resource.loading}
      error={resource.error}
      fields={['name', 'log_type', 'time', 'latitude', 'longitude']}
      filters={[{ field: 'log_type', label: 'Log Type', options: ['IN', 'OUT'] }]}
    />
  )
}
