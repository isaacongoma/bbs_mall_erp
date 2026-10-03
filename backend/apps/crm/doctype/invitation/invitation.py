# Port of crm/fcrm/doctype/crm_invitation (frappe/crm, AGPL-3.0): a pending invite to
# join the CRM with a role. Accepting an invitation (and sending the invite email) belongs
# to the Email subsystem, which is deferred -- the record is created and tracked here.
import secrets

from django.conf import settings
from django.db import models

ROLE_CHOICES = [
    ("System Manager", "System Manager"),
    ("Sales Manager", "Sales Manager"),
    ("Sales User", "Sales User"),
]

STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Accepted", "Accepted"),
    ("Expired", "Expired"),
]


class CRMInvitation(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="Sales User")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Pending")
    key = models.CharField(max_length=64, blank=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_invitation"
        verbose_name = "CRM Invitation"
        ordering = ["-creation"]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = secrets.token_hex(6)
        if not self.key:
            self.key = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
