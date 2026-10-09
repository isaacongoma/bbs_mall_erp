import { HrmsDocumentForm } from '../components/HrmsDocumentForm'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useParams } from 'react-router-dom'

export default function AttendanceRequestForm() {
  const { id } = useParams()
  return (
    <HrmsDocumentForm
      doctype="Attendance Request"
      title="Request Attendance"
      description="Submit an attendance request for your employee profile."
      listPath="/hrms/attendance/requests"
      employee={useHrmsEmployee()}
      docname={id}
      excludedFields={['naming_series', 'employee', 'employee_name', 'department', 'company', 'posting_date', 'status']}
    />
  )
}
