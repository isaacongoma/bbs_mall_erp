import { __ } from '@/core/i18n'
import { Button } from '@/design-system'
import { Link } from 'react-router-dom'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { RequestList } from '../components/RequestList'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useAttendanceRequests, useShiftRequests, useShifts } from '../stores/attendanceStore'

export default function Attendance() {
  const employee = useHrmsEmployee()
  const attendance = useAttendanceRequests(employee)
  const shifts = useShifts(employee)
  const shiftRequests = useShiftRequests(employee)
  const upcomingShifts = shifts.shifts
    .filter((shift) => !shift.end_date || shift.end_date >= new Date().toISOString().slice(0, 10))
    .slice(0, 5)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 p-4 sm:p-8">
      <AttendanceCalendar />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button to={{ pathname: '/hrms/attendance/requests/new' }} variant="solid" size="lg">
          {__('Request Attendance')}
        </Button>
        <Button to={{ pathname: '/hrms/attendance/shifts/new' }} variant="outline" size="lg">
          {__('Request a Shift')}
        </Button>
      </div>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-gray-8">{__('Recent Attendance Requests')}</h2>
          <Link className="text-sm text-ink-blue-7" to="/hrms/attendance/requests">
            {__('View all')}
          </Link>
        </div>
        <RequestList
          items={attendance.requests.slice(0, 5)}
          loading={attendance.resource.loading}
          error={attendance.resource.error}
          kind="attendance"
          emptyName="Attendance Requests"
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-gray-8">{__('Upcoming Shifts')}</h2>
        <RequestList
          items={upcomingShifts}
          loading={shifts.resource.loading}
          error={shifts.resource.error}
          kind="shift"
          emptyName="Upcoming Shifts"
        />
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-gray-8">{__('Recent Shift Requests')}</h2>
          <Link className="text-sm text-ink-blue-7" to="/hrms/attendance/shift-requests">
            {__('View all')}
          </Link>
        </div>
        <RequestList
          items={shiftRequests.requests.slice(0, 5)}
          loading={shiftRequests.resource.loading}
          error={shiftRequests.resource.error}
          kind="shift"
          emptyName="Shift Requests"
        />
      </section>
    </main>
  )
}
