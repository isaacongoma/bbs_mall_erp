from apps.frappe.model.document import Document
from apps.frappe.utils.nestedset import NestedSet
from apps.frappe import exceptions
from apps.erpnext.registry import get_model

class CostCenter(NestedSet, Document):
    doctype = 'Cost Center'
    nsm_parent_field = "parent_cost_center"

    def autoname(self):
        from apps.erpnext.accounts.utils import get_autoname_with_number
        self.name = get_autoname_with_number(getattr(self, "cost_center_number", None), getattr(self, "cost_center_name", ""), getattr(self, "company", ""))

    def validate(self):
        self.validate_mandatory()
        self.validate_parent_cost_center()

    def validate_mandatory(self):
        if self.get("cost_center_name") != self.get("company") and not self.get("parent_cost_center"):
            raise exceptions.ValidationError("Please enter parent cost center")
        elif self.get("cost_center_name") == self.get("company") and self.get("parent_cost_center"):
            raise exceptions.ValidationError("Root cannot have a parent cost center")

    def validate_parent_cost_center(self):
        if self.get("parent_cost_center"):
            CostCenterModel = get_model("Cost Center")
            try:
                parent_doc = CostCenterModel.objects.get(name=self.get("parent_cost_center"))
                if not parent_doc.is_group:
                    raise exceptions.ValidationError(
                        f"{self.get('parent_cost_center')} is not a group node. Please select a group node as parent cost center"
                    )
            except CostCenterModel.DoesNotExist:
                pass

    def convert_group_to_ledger(self):
        if self.check_if_child_exists():
            raise exceptions.ValidationError("Cannot convert Cost Center to ledger as it has child nodes")
        elif self.check_gle_exists():
            raise exceptions.ValidationError("Cost Center with existing transactions can not be converted to ledger")
        else:
            self.is_group = 0
            self.save()
            return 1

    def convert_ledger_to_group(self):
        if self.if_allocation_exists_against_cost_center():
            raise exceptions.ValidationError("Cost Center with Allocation records can not be converted to a group")
        if self.check_if_part_of_cost_center_allocation():
            raise exceptions.ValidationError("Cost Center is a part of Cost Center Allocation, hence cannot be converted to a group")
        if self.check_gle_exists():
            raise exceptions.ValidationError("Cost Center with existing transactions can not be converted to group")
        self.is_group = 1
        self.save()
        return 1

    def check_gle_exists(self):
        try:
            return get_model("GL Entry").objects.filter(cost_center=self.name).exists()
        except LookupError:
            return False

    def check_if_child_exists(self):
        try:
            return get_model("Cost Center").objects.filter(parent_cost_center=self.name).exclude(docstatus=2).exists()
        except LookupError:
            return False

    def if_allocation_exists_against_cost_center(self):
        try:
            return get_model("Cost Center Allocation").objects.filter(main_cost_center=self.name, docstatus=1).exists()
        except LookupError:
            return False

    def check_if_part_of_cost_center_allocation(self):
        try:
            return get_model("Cost Center Allocation Percentage").objects.filter(cost_center=self.name, docstatus=1).exists()
        except LookupError:
            return False

    def before_rename(self, olddn, newdn, merge=False):
        from apps.erpnext.setup.doctype.company.company import get_name_with_abbr
        new_cost_center = get_name_with_abbr(newdn, self.company)
        
        super().before_rename(olddn, new_cost_center, merge, "is_group")
        if not merge:
            from apps.erpnext.accounts.doctype.cost_center.cost_center import get_name_with_number
            new_cost_center = get_name_with_number(new_cost_center, self.cost_center_number)

        return new_cost_center

    def after_rename(self, olddn, newdn, merge=False):
        super().after_rename(olddn, newdn, merge)

        if not merge:
            CostCenterModel = get_model("Cost Center")
            new_cost_center = CostCenterModel.objects.get(name=newdn)
            
            new_parts = newdn.split(" - ")[:-1]
            if new_parts and new_parts[0] and new_parts[0][0].isdigit():
                if len(new_parts) == 1:
                    new_parts = newdn.split(" ")
                if getattr(new_cost_center, "cost_center_number", None) != new_parts[0]:
                    from apps.erpnext.accounts.utils import validate_field_number
                    validate_field_number(
                        "Cost Center", self.name, new_parts[0], self.company, "cost_center_number"
                    )
                    self.cost_center_number = new_parts[0]
                    self.db_set("cost_center_number", new_parts[0])
                new_parts = new_parts[1:]

            cost_center_name = " - ".join(new_parts)
            if getattr(new_cost_center, "cost_center_name", None) != cost_center_name:
                self.cost_center_name = cost_center_name
                self.db_set("cost_center_name", cost_center_name)

    def on_update(self):
        NestedSet.on_update(self)
        self.validate_one_root()


def get_name_with_number(new_account, account_number):
    if account_number and not new_account[0].isdigit():
        new_account = account_number + " - " + new_account
    return new_account
