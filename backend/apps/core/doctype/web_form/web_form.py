# Ported from frappe's core "Web Form" doctype (frappe/frappe, MIT), scoped to the fields
# crm/api/form.py and crm/www/crm_form.py actually read/write -- this port models Web Form as a
# CRM-only public lead/deal capture form, not the general-purpose website form builder Frappe
# core ships (arbitrary doctypes, payments, multi-step wizards, etc. are out of scope, matching
# how crm/api/form.py itself only ever touches a curated slice of the real doctype).
#
# `crm_published` / `crm_hidden_defaults` are CRM's own custom-field additions to the core
# doctype (crm/install.py); modeled here as plain native fields since this port has no separate
# Custom Field/Property Setter layer.
import uuid

from django.db import models

ALLOWED_DOCTYPES = [("CRM Lead", "CRM Lead"), ("CRM Deal", "CRM Deal")]
FORM_MODULE = "FCRM"

FIELDTYPE_CHOICES = [(t, t) for t in (
    "Data", "Small Text", "Text", "Long Text", "Text Editor", "HTML Editor", "Markdown Editor",
    "Select", "Link", "Int", "Float", "Currency", "Percent", "Check", "Date", "Datetime", "Time",
    "Phone", "Color", "Section Break", "Column Break",
)]


class WebForm(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)  # autoname: hash
    title = models.CharField(max_length=255)
    route = models.CharField(max_length=255, unique=True)
    doc_type = models.CharField(max_length=140, choices=ALLOWED_DOCTYPES)

    crm_published = models.BooleanField(default=False)
    published = models.BooleanField(default=False)  # mirrors crm_published (see save_form)

    button_label = models.CharField(max_length=140, blank=True, default="Submit")
    introduction_text = models.TextField(blank=True)
    success_message = models.CharField(max_length=255, blank=True)
    success_url = models.CharField(max_length=255, blank=True)
    allowed_embedding_domains = models.TextField(blank=True)

    login_required = models.BooleanField(default=False)
    allow_multiple = models.BooleanField(default=True)
    is_standard = models.BooleanField(default=False)
    module = models.CharField(max_length=140, default=FORM_MODULE)

    crm_hidden_defaults = models.TextField(blank=True)

    owner = models.ForeignKey(
        "core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "web_form"
        verbose_name = "Web Form"
        ordering = ["-modified"]

    def __str__(self):
        return self.title or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)


class WebFormField(models.Model):
    parent = models.ForeignKey(WebForm, on_delete=models.CASCADE, related_name="field_rows")
    idx = models.PositiveIntegerField(default=0)

    fieldname = models.CharField(max_length=140)
    label = models.CharField(max_length=255, blank=True)
    fieldtype = models.CharField(max_length=20, choices=FIELDTYPE_CHOICES)
    options = models.TextField(blank=True)
    reqd = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    depends_on = models.CharField(max_length=255, blank=True)
    mandatory_depends_on = models.CharField(max_length=255, blank=True)
    read_only_depends_on = models.CharField(max_length=255, blank=True)

    class Meta:
        app_label = "core"
        db_table = "web_form_field"
        verbose_name = "Web Form Field"
        ordering = ["idx"]


class GuestLinkAccess(models.Model):
    """Standing in for a site-level Custom DocPerm granting Guest `select` on a doctype
    (crm.api.form.grant_guest_link_access) -- this port has no generic DocPerm system, so a
    small table of {doctype: allowed} flags is the whole of it."""

    doctype_label = models.CharField(max_length=140, primary_key=True)
    allowed = models.BooleanField(default=True)

    class Meta:
        app_label = "core"
        db_table = "guest_link_access"
        verbose_name = "Guest Link Access"
