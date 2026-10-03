# Ported from frappe/contacts/doctype/contact_email/contact_email.json (frappe/frappe, MIT)
from django.db import models


class ContactEmail(models.Model):
    parent = models.ForeignKey("core.Contact", on_delete=models.CASCADE, related_name="email_ids")
    idx = models.PositiveIntegerField(default=0)
    email_id = models.EmailField()
    is_primary = models.BooleanField(default=False)

    class Meta:
        app_label = "core"
        db_table = "contact_email"
        verbose_name = "Contact Email"
        ordering = ["idx"]
