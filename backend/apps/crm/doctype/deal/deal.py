# Ported from crm/fcrm/doctype/crm_deal/{crm_deal.json,crm_deal.py} (frappe/crm, AGPL-3.0)
from django.conf import settings as django_settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.assignable import AssignableMixin
from apps.core.child_rows import ChildRowBufferMixin
from apps.core.middleware import get_current_user
from apps.core.models import BaseDocument
from apps.core.naming import make_autoname
from apps.crm.cross_record import copy_enrichment_from_organization
from apps.crm.doctype.status_change_log.status_change_log import add_status_change_log

NAMING_SERIES = "CRM-DEAL-.YYYY.-"
NO_OF_EMPLOYEES_CHOICES = [(c, c) for c in ("1-10", "11-50", "51-200", "201-500", "501-1000", "1000+")]
SLA_STATUS_CHOICES = [
    ("", ""),
    ("First Response Due", "First Response Due"),
    ("Rolling Response Due", "Rolling Response Due"),
    ("Failed", "Failed"),
    ("Fulfilled", "Fulfilled"),
]


class CRMDeal(ChildRowBufferMixin, AssignableMixin, BaseDocument):
    doctype_label = "CRM Deal"

    name = models.CharField(max_length=140, primary_key=True, editable=False)
    naming_series = models.CharField(max_length=40, default=NAMING_SERIES, editable=False)

    organization = models.ForeignKey(
        "crm.CRMOrganization", on_delete=models.SET_NULL, null=True, blank=True, related_name="deals"
    )
    organization_name = models.CharField(max_length=140, blank=True)
    next_step = models.CharField(max_length=140, blank=True)
    status = models.ForeignKey("crm.CRMDealStatus", on_delete=models.PROTECT, related_name="deals", null=True)
    deal_owner = models.ForeignKey(
        django_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_deals"
    )

    probability = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    expected_deal_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    deal_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    expected_closure_date = models.DateField(null=True, blank=True)
    closed_date = models.DateField(null=True, blank=True)

    contact = models.ForeignKey("core.Contact", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    lead = models.ForeignKey("crm.CRMLead", on_delete=models.SET_NULL, null=True, blank=True, related_name="deals")
    source = models.ForeignKey(
        "crm.CRMLeadSource", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    lead_name = models.CharField(max_length=140, blank=True)

    website = models.CharField(max_length=255, blank=True)
    organization_logo = models.CharField(max_length=255, blank=True)
    company_description = models.TextField(blank=True)
    linkedin = models.CharField(max_length=255, blank=True)
    twitter = models.CharField(max_length=255, blank=True)
    facebook = models.CharField(max_length=255, blank=True)
    no_of_employees = models.CharField(max_length=10, choices=NO_OF_EMPLOYEES_CHOICES, blank=True)
    job_title = models.CharField(max_length=140, blank=True)
    territory = models.ForeignKey(
        "crm.CRMTerritory", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    currency = models.ForeignKey("crm.Currency", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    exchange_rate = models.FloatField(default=1)
    annual_revenue = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    industry = models.ForeignKey(
        "crm.CRMIndustry", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    salutation = models.ForeignKey(
        "core.Salutation", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    first_name = models.CharField(max_length=140, blank=True)
    last_name = models.CharField(max_length=140, blank=True)
    gender = models.ForeignKey("core.Gender", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    email = models.EmailField(blank=True, editable=False)
    mobile_no = models.CharField(max_length=30, blank=True, editable=False)
    phone = models.CharField(max_length=30, blank=True, editable=False)

    total = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)
    net_total = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)

    sla = models.ForeignKey(
        "crm.CRMServiceLevelAgreement", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    sla_creation = models.DateTimeField(null=True, blank=True)
    sla_status = models.CharField(max_length=25, choices=SLA_STATUS_CHOICES, blank=True)
    communication_status = models.ForeignKey(
        "crm.CRMCommunicationStatus", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+", default="Open",
    )
    response_by = models.DateTimeField(null=True, blank=True)
    first_response_time = models.DurationField(null=True, blank=True)
    first_responded_on = models.DateTimeField(null=True, blank=True)
    last_response_time = models.DurationField(null=True, blank=True)
    last_responded_on = models.DateTimeField(null=True, blank=True)

    lost_reason = models.ForeignKey(
        "crm.CRMLostReason", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    lost_notes = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_deal"
        verbose_name = "CRM Deal"
        ordering = ["-modified"]

    def __str__(self):
        return self.organization_name or self.name

    # -- validation -----------------------------------------------------------

    def validate_status(self):
        if not self._state.adding or self.status_id:
            return
        from apps.crm.doctype.deal_status.deal_status import CRMDealStatus

        default_status = CRMDealStatus.objects.filter(name="Qualification").first()
        self.status = default_status or CRMDealStatus.objects.filter(type="Open").first()

    def set_primary_contact(self, contact_id=None):
        if not self.pk:
            return
        contacts = list(self.contacts.all())
        if not contacts:
            return
        if not contact_id and len(contacts) == 1:
            contacts[0].is_primary = True
            contacts[0].save()
        elif contact_id:
            for row in contacts:
                row.is_primary = row.contact_id == contact_id
                row.save()

    def set_primary_email_mobile_no(self):
        contacts = list(self.contacts.all()) if self.pk else []
        if not contacts:
            self.email = self.mobile_no = self.phone = ""
            return

        primary_rows = [row for row in contacts if row.is_primary]
        if len(primary_rows) > 1:
            raise ValidationError("Only one Contact can be set as primary.")

        if primary_rows:
            contact = primary_rows[0].contact
            self.email = (contact.email_id or "").strip()
            self.mobile_no = (contact.mobile_no or "").strip()
            self.phone = (contact.phone or "").strip()
        else:
            self.email = self.mobile_no = self.phone = ""

    def validate_lost_reason(self):
        if self.status_id and self.status.type == "Lost":
            if not self.lost_reason_id:
                raise ValidationError("Please specify a reason for losing the deal.")
            if self.lost_reason_id == "Other" and not self.lost_notes:
                raise ValidationError("Please specify the reason for losing the deal.")

    def update_closed_date(self):
        if self.status_id and self.status.type == "Won" and not self.closed_date:
            self.closed_date = timezone.now().date()

    def update_default_probability(self):
        if not self.probability and self.status_id:
            self.probability = self.status.probability or 0

    def update_expected_deal_value(self):
        from apps.crm.doctype.settings.settings import FCRMSettings

        fcrm_settings = FCRMSettings.get_solo()
        if fcrm_settings.auto_update_expected_deal_value and (self.net_total or self.total) and self.expected_deal_value:
            self.expected_deal_value = self.net_total or self.total

    def validate_forecasting_fields(self):
        self.update_closed_date()
        self.update_default_probability()
        self.update_expected_deal_value()
        from apps.crm.doctype.settings.settings import FCRMSettings

        if FCRMSettings.get_solo().enable_forecasting:
            if not self.expected_deal_value:
                raise ValidationError("Expected deal value is required.")
            if not self.expected_closure_date:
                raise ValidationError("Expected closure date is required.")

    def update_exchange_rate(self, currency_changed: bool):
        if not (currency_changed or not self.exchange_rate):
            return
        from apps.crm.doctype.settings.settings import FCRMSettings
        from apps.crm.exchange_rate import get_exchange_rate

        system_currency = FCRMSettings.get_solo().currency or "USD"
        rate = 1
        if self.currency_id and self.currency_id != system_currency:
            try:
                rate = get_exchange_rate(self.currency_id, system_currency)
            except Exception:
                rate = self.exchange_rate or 1
        self.exchange_rate = rate

    # -- SLA (before_validate: set_sla / before_save: apply_sla) ----------------

    def set_sla(self):
        if self.sla_id:
            return
        from apps.crm.doctype.service_level_agreement.utils import get_sla

        sla = get_sla(self)
        if not sla:
            self.first_responded_on = None
            self.first_response_time = None
            return
        self.sla = sla

    def apply_sla(self):
        if not self.sla_id:
            return
        self.sla.apply(self)

    # -- save -------------------------------------------------------------------

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        previous = None
        if not is_new:
            previous = (
                type(self)
                .objects.filter(pk=self.pk)
                .values("status_id", "deal_owner_id", "communication_status_id", "currency_id", "organization_id")
                .first()
            )

        if not self.name:
            self.name = make_autoname(type(self), self.naming_series or NAMING_SERIES)

        user = get_current_user()
        if user and getattr(user, "is_authenticated", False):
            if is_new:
                self.owner = user
            self.modified_by = user

        # before_validate + validate, in the same order as the original controller --
        # these must run before full_clean() since they fill required fields
        # (e.g. status) that full_clean()'s own field-blank checks would otherwise reject.
        self.set_sla()
        self.validate_status()
        self.set_primary_contact()
        self.set_primary_email_mobile_no()
        self.validate_forecasting_fields()
        self.validate_lost_reason()

        status_changed = is_new or (previous and previous["status_id"] != self.status_id)
        owner_changed = (not is_new) and previous and previous["deal_owner_id"] != self.deal_owner_id
        self.communication_status_changed = is_new or (
            previous and previous["communication_status_id"] != self.communication_status_id
        )
        currency_changed = is_new or (previous and previous["currency_id"] != self.currency_id)
        organization_changed = is_new or (previous and previous["organization_id"] != self.organization_id)

        self.full_clean(exclude=[f.name for f in self._meta.fields if f.name not in (
            "organization_name", "lost_reason", "lost_notes", "deal_owner",
            "expected_deal_value", "expected_closure_date",
        )])

        self.update_exchange_rate(currency_changed)
        # before_save
        self.apply_sla()

        if self.organization_id and organization_changed:
            copy_enrichment_from_organization(self, self.organization)

        super().save(*args, **kwargs)
        self.flush_child_rows()

        if status_changed:
            from apps.crm.doctype.deal_status.deal_status import CRMDealStatus

            add_status_change_log(self, CRMDealStatus, previous["status_id"] if previous else None, is_new)
            self.flush_child_rows()
            if self.status_id and self.status.type == "Won" and not self.closed_date:
                self.closed_date = timezone.now().date()
                type(self).objects.filter(pk=self.pk).update(closed_date=self.closed_date)

        if owner_changed and self.deal_owner_id:
            self.share_with_agent(self.deal_owner)
            self.assign_agent(self.deal_owner)
        if is_new and self.deal_owner_id:
            if not (user and self.deal_owner_id == getattr(user, "pk", None)):
                self.share_with_agent(self.deal_owner)
            self.assign_agent(self.deal_owner)

        if is_new:
            from apps.crm.domain_enrichment.tasks import auto_enrich_on_create

            auto_enrich_on_create(self)

        from apps.core.doctype.assignment_rule.assignment_rule_engine import (
            apply_assignment_rules, doc_to_condition_dict,
        )

        apply_assignment_rules("CRM Deal", self.pk, doc_to_condition_dict(self))


# -- module-level API functions (crm_deal.py's @frappe.whitelist() functions) ---

def create_organization(data: dict):
    from apps.crm.doctype.organization.organization import CRMOrganization

    org_name = data.get("organization_name")
    if not org_name:
        return None
    existing = CRMOrganization.objects.filter(organization_name=org_name).first()
    if existing:
        return existing
    org = CRMOrganization(
        organization_name=org_name,
        website=data.get("website", ""),
        territory_id=data.get("territory"),
        industry_id=data.get("industry"),
        annual_revenue=data.get("annual_revenue") or 0,
        no_of_employees=data.get("no_of_employees", ""),
    )
    org.save()
    return org


def contact_exists(data: dict):
    from apps.core.doctype.contact.contact import Contact
    from apps.core.doctype.contact_email.contact_email import ContactEmail
    from apps.core.doctype.contact_phone.contact_phone import ContactPhone

    email = data.get("email")
    mobile_no = data.get("mobile_no")
    if email:
        row = ContactEmail.objects.filter(email_id=email).first()
        if row:
            return Contact.objects.filter(pk=row.parent_id).first()
    if mobile_no:
        row = ContactPhone.objects.filter(phone=mobile_no).first()
        if row:
            return Contact.objects.filter(pk=row.parent_id).first()
    return None


def create_contact(data: dict):
    from apps.core.doctype.contact.contact import Contact

    existing = contact_exists(data)
    if existing:
        return existing

    contact = Contact(
        first_name=data.get("first_name", ""),
        last_name=data.get("last_name", ""),
        salutation_id=data.get("salutation") or None,
        company_name=data.get("organization") or data.get("organization_name", ""),
        gender_id=data.get("gender") or None,
    )
    contact.save()
    if data.get("email"):
        contact.email_ids.create(email_id=data["email"], is_primary=True)
    if data.get("mobile_no"):
        contact.phone_nos.create(phone=data["mobile_no"], is_primary_mobile_no=True)
    contact.save()  # refresh denormalized email_id/phone/mobile_no
    return contact


def create_deal(data: dict):
    """Ported from crm_deal.py's create_deal() whitelist endpoint -- builds a
    Deal from a plain dict, auto-creating its Organization/Contact as needed."""
    deal = CRMDeal()

    contact = data.get("contact")
    contact_obj = None
    if not contact and any(data.get(f) for f in ("first_name", "last_name", "email", "mobile_no")):
        contact_obj = create_contact(data)
        contact = contact_obj.pk
    elif contact:
        from apps.core.doctype.contact.contact import Contact

        contact_obj = Contact.objects.filter(pk=contact).first()

    organization = data.get("organization")
    if not organization:
        org = create_organization(data)
        organization = org.pk if org else None

    for field in (
        "next_step", "status", "deal_owner", "probability", "expected_deal_value", "deal_value",
        "expected_closure_date", "lead", "source", "no_of_employees", "job_title", "territory",
        "currency", "annual_revenue", "industry", "lost_reason", "lost_notes",
    ):
        if field in data:
            setattr(deal, f"{field}_id" if field in (
                "status", "deal_owner", "lead", "source", "territory", "currency", "industry", "lost_reason",
            ) else field, data[field])

    deal.organization_id = organization
    deal.save()

    if contact_obj:
        deal.contacts.create(contact=contact_obj, is_primary=True)
        deal.set_primary_email_mobile_no()
        deal.save()

    return deal


def get_deal_contacts(name: str) -> list[dict]:
    """Ported from crm/fcrm/doctype/crm_deal/api.py's get_deal_contacts (frappe/crm, AGPL-3.0)."""
    rows = (
        CRMDeal.objects.get(pk=name).contacts
        .select_related("contact")
        .order_by("-is_primary", "idx")
    )
    return [
        {
            "name": row.contact.pk,
            "image": row.contact.image,
            "full_name": row.contact.full_name,
            "email": row.contact.email_id,
            "mobile_no": row.contact.mobile_no,
            "is_primary": row.is_primary,
        }
        for row in rows
    ]
