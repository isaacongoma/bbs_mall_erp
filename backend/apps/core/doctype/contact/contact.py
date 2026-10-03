# Ported from frappe/contacts/doctype/contact/contact.json (frappe/frappe, MIT)
from django.conf import settings
from django.db import models

from apps.core.middleware import get_current_user
from apps.core.models import BaseDocument

STATUS_CHOICES = [("Passive", "Passive"), ("Open", "Open"), ("Replied", "Replied")]


class Contact(BaseDocument):
    name = models.CharField(max_length=140, primary_key=True, editable=False)

    first_name = models.CharField(max_length=140, blank=True)
    middle_name = models.CharField(max_length=140, blank=True)
    last_name = models.CharField(max_length=140, blank=True)
    full_name = models.CharField(max_length=270, blank=True, editable=False)
    email_id = models.EmailField(blank=True, editable=False)  # fetched from primary email_ids row
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Passive")
    salutation = models.ForeignKey(
        "core.Salutation", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    gender = models.ForeignKey("core.Gender", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    phone = models.CharField(max_length=30, blank=True, editable=False)  # fetched from primary phone_nos row
    mobile_no = models.CharField(max_length=30, blank=True, editable=False)
    image = models.CharField(max_length=255, blank=True)
    is_primary_contact = models.BooleanField(default=False)
    department = models.CharField(max_length=140, blank=True)
    designation = models.CharField(max_length=140, blank=True)
    unsubscribed = models.BooleanField(default=False)
    company_name = models.CharField(max_length=140, blank=True)
    address = models.ForeignKey("core.Address", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        app_label = "core"
        db_table = "contact"
        verbose_name = "Contact"

    def __str__(self):
        return self.full_name or self.name

    def set_full_name(self):
        self.full_name = " ".join(p for p in (self.first_name, self.middle_name, self.last_name) if p)

    def set_primary_email_and_phone(self):
        primary_email = self.email_ids.filter(is_primary=True).first() or self.email_ids.first()
        self.email_id = primary_email.email_id if primary_email else ""

        primary_phone = self.phone_nos.filter(is_primary_phone=True).first() or self.phone_nos.first()
        self.phone = primary_phone.phone if primary_phone else ""

        primary_mobile = self.phone_nos.filter(is_primary_mobile_no=True).first()
        self.mobile_no = primary_mobile.phone if primary_mobile else ""

    def save(self, *args, **kwargs):
        if not self.name:
            from apps.core.naming import make_autoname

            self.name = make_autoname(type(self), "CONTACT-")
        self.set_full_name()
        user = get_current_user()
        if user and getattr(user, "is_authenticated", False):
            if self._state.adding:
                self.owner = user
            self.modified_by = user
        super().save(*args, **kwargs)
        # email_ids/phone_nos are saved separately (reverse FK rows), so the
        # fetched email_id/phone/mobile_no need a second pass once they exist.
        if not self._state.adding:
            self.set_primary_email_and_phone()
            super().save(update_fields=["email_id", "phone", "mobile_no"])
