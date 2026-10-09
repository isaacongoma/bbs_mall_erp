from unittest.mock import patch

import frappe
from frappe.utils import add_days, today

from erpnext.tests.utils import ERPNextTestSuite


class TestProjectUpdate(ERPNextTestSuite):
    def test_daily_reminder_runs_and_finds_yesterdays_update(self):
        from erpnext.projects.doctype.project.test_project import make_project
        from erpnext.projects.doctype.project_update.project_update import daily_reminder

        project = make_project({"project_name": "_Test Project Update Reminder", "company": "_Test Company"})
        project.db_set("frequency", "Daily")

        self.assertNotEqual(project.name, project.project_name)

        user = "_test_project_reminder@example.com"
        from apps.core.models import User
        if not User.objects.filter(email=user).exists():
            User.objects.create_user(username=user, email=user, first_name="PR")
        if user not in [u.user for u in project.users]:
            project.append("users", {"user": user, "welcome_email_sent": 1})
            project.save()

        pu = frappe.get_doc(
            {
                "doctype": "Project Update",
                "project": project.name,
                "date": add_days(today(), -1),
                "time": "10:00:00",
            }
        ).insert()

        updates = frappe.get_all(
            "Project Update",
            filters={"project": project.name, "date": add_days(today(), -1)},
            fields=["name", "date", "time"],
            as_list=True,
        )
        self.assertIn(pu.name, [u[0] for u in updates])

        self.assertIn(user, frappe.get_all("Project User", filters={"parent": project.name}, pluck="user"))
        self.assertEqual(
            frappe.get_all("Project User", filters={"parent": project.project_name}, pluck="user"), []
        )

        with patch("frappe.sendmail"):
            daily_reminder()
