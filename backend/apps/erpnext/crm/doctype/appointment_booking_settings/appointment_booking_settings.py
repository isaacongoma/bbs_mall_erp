import datetime

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class AppointmentBookingSettings(Document):


    doctype = 'Appointment Booking Settings'

    def validate(self):
        self.number_of_agents = len(self.agent_list)
        self.validate_appointment_scheduling()
        self.validate_portal_booking()

    def validate_appointment_scheduling(self):
        if not self.enable_scheduling:
            return

        self.validate_availability_of_slots()
        self.validate_holiday_list()
        self.validate_advance_booking_days()

    def validate_availability_of_slots(self):
        if not self.availability_of_slots:
            frappe.throw(
                _("Please fill up the Availability of Slots table to enable Appointment Scheduling.")
            )

        format_string = "%Y-%m-%d %H:%M:%S"
        for record in self.availability_of_slots:
            from_time = datetime.datetime.strptime(f"1970-01-01 {record.from_time}", format_string)
            to_time = datetime.datetime.strptime(f"1970-01-01 {record.to_time}", format_string)
            self.validate_from_and_to_time(from_time, to_time, record)
            self.duration_is_divisible(from_time, to_time)

    def validate_from_and_to_time(self, from_time, to_time, record):
        if from_time > to_time:
            err_msg = _("<b>From Time</b> cannot be later than <b>To Time</b> for {0}").format(
                record.day_of_week
            )
            frappe.throw(err_msg)

    def duration_is_divisible(self, from_time, to_time):
        timedelta = to_time - from_time
        if timedelta.total_seconds() % (self.appointment_duration * 60):
            frappe.throw(_("The difference between from time and To Time must be a multiple of Appointment"))

    def validate_holiday_list(self):
        if not self.holiday_list:
            frappe.throw(_("Please select a Holiday List to enable Appointment Scheduling."))

        hl_from_date, hl_to_date = frappe.get_cached_value(
            "Holiday List", self.holiday_list, ["from_date", "to_date"]
        )
        now = getdate()

        if not (now >= hl_from_date and now <= hl_to_date):
            frappe.throw(_("Holiday List - {0} is not valid for current date.").format(self.holiday_list))

    def validate_advance_booking_days(self):
        if not self.advance_booking_days:
            frappe.throw(_("Advance Booking Days is mandatory for Appointment Scheduling."))

    def validate_portal_booking(self):
        if not self.enable_appointment_portal:
            return

        if not self.enable_scheduling:
            frappe.throw(
                _("Appointment Scheduling needs to be enabled for Appointment Booking through portal.")
            )

        self.validate_link_expiry_duration()

    def validate_link_expiry_duration(self):
        if (
            not self.verification_link_expiry_duration
            or self.verification_link_expiry_duration > 60
            or self.verification_link_expiry_duration < 15
        ):
            frappe.throw(_("'Verification Link Expiry Duration' must be between 15 to 60 minutes."))
