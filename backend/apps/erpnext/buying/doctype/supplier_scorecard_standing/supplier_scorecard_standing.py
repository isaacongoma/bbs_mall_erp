import frappe
from frappe.model.document import Document


class SupplierScorecardStanding(Document):


    doctype = 'Supplier Scorecard Standing'

    pass


@frappe.whitelist()
def get_scoring_standing(standing_name: str):
    standing = frappe.get_doc("Supplier Scorecard Standing", standing_name)

    return standing


@frappe.whitelist()
def get_standings_list():
    """Returns a list of all Supplier Scorecard Standings."""
    standings = frappe.get_all("Supplier Scorecard Standing", fields=["name"])

    return standings
