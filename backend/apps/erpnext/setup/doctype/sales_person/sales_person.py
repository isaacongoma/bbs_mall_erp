from collections import defaultdict
from itertools import chain

from apps.frappe.utils.nestedset import NestedSet, get_root_of
from apps.frappe import exceptions
from apps.erpnext.registry import get_model


class SalesPerson(NestedSet):
    doctype = "Sales Person"
    nsm_parent_field = "parent_sales_person"

    def validate(self):
        if not int(self.get("enabled") or 0):
            self.validate_sales_person()

        if not self.get("parent_sales_person"):
            self.parent_sales_person = get_root_of("Sales Person")

        for d in self.get("targets", []):
            if not float(getattr(d, "target_qty", 0.0)) and not float(getattr(d, "target_amount", 0.0)):
                raise exceptions.ValidationError("Either target qty or target amount is mandatory.")
        self.validate_employee_id()

    def onload(self):
        self.load_dashboard_info()

    def load_dashboard_info(self):
        pass

    def on_update(self):
        super().on_update()
        self.validate_one_root()

    def validate_sales_person(self):
        SalesTeamModel = get_model("Sales Team")
        if SalesTeamModel.objects.filter(sales_person=self.name, parenttype="Customer").exists():
            raise exceptions.ValidationError(
                f"The Sales Person is linked with Customers"
            )

    def get_email_id(self):
        employee = self.get("employee")
        if employee:
            EmployeeModel = get_model("Employee")
            try:
                emp = EmployeeModel.objects.get(name=employee)
                user_id = getattr(emp, "user_id", None)
                if not user_id:
                    raise exceptions.ValidationError(f"User ID not set for Employee {employee}")
                else:
                    UserModel = get_model("User")
                    try:
                        u = UserModel.objects.get(name=user_id)
                        return getattr(u, "email", user_id) or user_id
                    except UserModel.DoesNotExist:
                        return user_id
            except EmployeeModel.DoesNotExist:
                pass
        return None

    def validate_employee_id(self):
        employee = self.get("employee")
        if employee:
            SalesPersonModel = get_model("Sales Person")
            qs = SalesPersonModel.objects.filter(employee=employee).exclude(name=self.name)
            if qs.exists():
                sp = qs.first()
                raise exceptions.ValidationError(
                    f"Another Sales Person {sp.name} exists with the same Employee id"
                )


def get_timeline_data(doctype: str, name: str):
    pass
