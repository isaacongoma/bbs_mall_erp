import frappe
from apps.frappe.utils.nestedset import NestedSet, get_root_of
from apps.erpnext.registry import get_model


class Department(NestedSet):
    doctype = "Department"
    nsm_parent_field = "parent_department"

    def autoname(self):
        company = self.get("company")
        department_name = self.get("department_name") or ""
        
        if company:
            self.name = get_abbreviated_name(department_name, company)
        else:
            self.name = department_name

    def validate(self):
        if not self.get("parent_department"):
            root = get_root_of("Department")
            if root:
                self.parent_department = root

    def before_rename(self, old, new, merge=False):
        company = self.get("company")
        if company:
            CompanyModel = get_model("Company")
            try:
                company_doc = CompanyModel.objects.get(name=company)
                abbr = company_doc.abbr or ""
                if abbr not in new:
                    new = get_abbreviated_name(new, company)
            except CompanyModel.DoesNotExist:
                pass
        return new


def get_abbreviated_name(name, company):
    CompanyModel = get_model("Company")
    abbr = ""
    try:
        company_doc = CompanyModel.objects.get(name=company)
        abbr = company_doc.abbr or ""
    except CompanyModel.DoesNotExist:
        pass
    
    new_name = f"{name} - {abbr}" if abbr else name
    return new_name


@frappe.whitelist()
def get_children(
    doctype: str,
    parent: str | None = None,
    company: str | None = None,
    is_root: bool = False,
    include_disabled: str | dict | None = None,
):
    include_disabled = frappe.parse_json(include_disabled)
    fields = ["name as value", "is_group as expandable"]
    filters = {}

    if company == parent:
        filters["name"] = get_root_of("Department")
    elif company:
        filters["parent_department"] = parent
        filters["company"] = company
    else:
        filters["parent_department"] = parent

    if frappe.db.has_column("Department", "disabled") and not include_disabled:
        filters["disabled"] = False

    return frappe.get_list("Department", fields=fields, filters=filters, order_by="name", limit=0)


@frappe.whitelist(methods=["POST"])
def add_node():
    from apps.frappe.desk.treeview import make_tree_args

    args = frappe.form_dict
    args = make_tree_args(**args)

    args.doctype = "Department"

    if args.parent_department == args.company:
        args.parent_department = None

    frappe.get_doc(args).insert()
