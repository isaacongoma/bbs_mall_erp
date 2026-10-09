from frappe.model.document import Document
from frappe.utils import time_diff_in_hours


class DowntimeEntry(Document):


    doctype = 'Downtime Entry'

    def validate(self):
        if self.from_time and self.to_time:
            self.downtime = time_diff_in_hours(self.to_time, self.from_time) * 60
