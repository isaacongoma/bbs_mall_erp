# Ported from frappe/contacts/doctype/contact_phone/contact_phone.json (frappe/frappe, MIT)
from django.db import models


class ContactPhone(models.Model):
    parent = models.ForeignKey("core.Contact", on_delete=models.CASCADE, related_name="phone_nos")
    idx = models.PositiveIntegerField(default=0)
    phone = models.CharField(max_length=30)
    is_primary_phone = models.BooleanField(default=False)
    is_primary_mobile_no = models.BooleanField(default=False)

    class Meta:
        app_label = "core"
        db_table = "contact_phone"
        verbose_name = "Contact Phone"
        ordering = ["idx"]
