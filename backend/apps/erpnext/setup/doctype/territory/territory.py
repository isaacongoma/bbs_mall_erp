from apps.frappe.utils.nestedset import NestedSet, get_root_of
from apps.frappe import exceptions


class Territory(NestedSet):
    doctype = "Territory"
    nsm_parent_field = "parent_territory"

    def validate(self):
        if not self.get("parent_territory"):
            self.parent_territory = get_root_of("Territory")

        for d in self.get("targets", []):
            if not float(getattr(d, "target_qty", 0.0)) and not float(getattr(d, "target_amount", 0.0)):
                raise exceptions.ValidationError("Either target qty or target amount is mandatory")

    def on_update(self):
        super().on_update()
        self.validate_one_root()
