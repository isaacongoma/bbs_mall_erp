# Ported from crm/fcrm/doctype/crm_contacts/crm_contacts.json (frappe/crm, AGPL-3.0)
# Child table (istable: 1) -- a Deal's linked Contact rows.
from django.db import models


class CRMDealContact(models.Model):
    parent_deal = models.ForeignKey("crm.CRMDeal", on_delete=models.CASCADE, related_name="contacts")
    idx = models.PositiveIntegerField(default=0)

    contact = models.ForeignKey("core.Contact", on_delete=models.CASCADE, related_name="+")
    is_primary = models.BooleanField(default=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_deal_contact"
        verbose_name = "CRM Contact Row"
        ordering = ["idx"]

    # full_name/email/mobile_no/phone/gender are fetch_from(contact) in the
    # original; exposed as properties instead of denormalized columns.
    @property
    def full_name(self):
        return self.contact.full_name

    @property
    def email(self):
        return self.contact.email_id

    @property
    def mobile_no(self):
        return self.contact.mobile_no

    @property
    def phone(self):
        return self.contact.phone

    @property
    def gender(self):
        return self.contact.gender
