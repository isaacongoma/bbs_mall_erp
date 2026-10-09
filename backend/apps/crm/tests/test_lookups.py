from django.test import TestCase

from apps.crm.doctype.deal import deal as deal_module
from apps.crm.doctype.lead.lead import CRMLead
from apps.crm.doctype.organization.organization import CRMOrganization
from apps.crm.doctype_registry import get_doctype_model
from apps.erpnext.registry import get_model
from apps.frappe import session


class LookupUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_registry_labels_resolve_to_the_canonical_models(self):
        self.assertIs(get_doctype_model("CRM Industry"), get_model("Industry Type"))
        self.assertIs(get_doctype_model("CRM Lead Source"), get_model("UTM Source"))
        self.assertIs(get_doctype_model("CRM Lost Reason"), get_model("Opportunity Lost Reason"))
        self.assertIs(get_doctype_model("CRM Territory"), get_model("Territory"))

    def test_foreign_keys_point_at_canonical_tables(self):
        for model, field, table in (
            (CRMLead, "industry", "tabIndustry Type"),
            (CRMLead, "source", "tabUTM Source"),
            (CRMLead, "territory", "tabTerritory"),
            (CRMLead, "lost_reason", "tabOpportunity Lost Reason"),
            (CRMOrganization, "territory", "tabTerritory"),
            (CRMOrganization, "industry", "tabIndustry Type"),
        ):
            self.assertEqual(model._meta.get_field(field).related_model._meta.db_table, table)

    def test_organization_uses_canonical_lookup_rows(self):
        get_model("Industry Type").objects.get_or_create(name="Software", defaults={"industry": "Software"})
        get_model("Territory").objects.get_or_create(
            name="Kenya", defaults={"territory_name": "Kenya", "parent_territory": "", "is_group": 0}
        )
        organization = deal_module.create_organization(
            {"organization_name": "Acme", "territory": "Kenya", "industry": "Software"}
        )
        reloaded = CRMOrganization.objects.get(pk=organization.pk)
        self.assertEqual((reloaded.territory_id, reloaded.industry_id), ("Kenya", "Software"))
