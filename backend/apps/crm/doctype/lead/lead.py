# Ported from crm/fcrm/doctype/crm_lead/{crm_lead.json,crm_lead.py} (frappe/crm, AGPL-3.0)
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models

from apps.core.assignable import AssignableMixin
from apps.core.child_rows import ChildRowBufferMixin
from apps.core.middleware import get_current_user
from apps.core.models import BaseDocument
from apps.core.naming import make_autoname
from apps.crm.cross_record import copy_enrichment_from_organization
from apps.crm.doctype.status_change_log.status_change_log import add_status_change_log

NAMING_SERIES = "CRM-LEAD-.YYYY.-"

NO_OF_EMPLOYEES_CHOICES = [(c, c) for c in ("1-10", "11-50", "51-200", "201-500", "501-1000", "1000+")]
LEAD_TEMPERATURE_CHOICES = [("", ""), ("Cold", "Cold"), ("Warm", "Warm"), ("Hot", "Hot")]
SLA_STATUS_CHOICES = [
    ("", ""),
    ("First Response Due", "First Response Due"),
    ("Rolling Response Due", "Rolling Response Due"),
    ("Failed", "Failed"),
    ("Fulfilled", "Fulfilled"),
]

# Fields carried over from Lead to Deal on conversion. Mirrors get_deal_fieldname()'s
# restricted_map_fields / LEAD_DEAL_FIELD_MAP -- everything else is skipped.
_LEAD_TO_DEAL_FIELD_MAP = {"lead_owner_id": "deal_owner_id"}
_LEAD_TO_DEAL_DIRECT_FIELDS = (
    "salutation", "first_name", "middle_name", "last_name", "gender", "job_title",
    "website", "no_of_employees", "annual_revenue", "source_id", "industry_id", "territory_id",
    "image", "lead_score", "lead_temperature", "organization_logo", "company_description",
    "linkedin", "twitter", "facebook",
)


class CRMLead(ChildRowBufferMixin, AssignableMixin, BaseDocument):
    doctype_label = "CRM Lead"

    name = models.CharField(max_length=140, primary_key=True, editable=False)
    naming_series = models.CharField(max_length=40, default=NAMING_SERIES, editable=False)

    salutation = models.ForeignKey(
        "core.Salutation", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    first_name = models.CharField(max_length=140)
    middle_name = models.CharField(max_length=140, blank=True)
    last_name = models.CharField(max_length=140, blank=True)
    lead_name = models.CharField(max_length=270, blank=True)
    gender = models.ForeignKey("core.Gender", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    email = models.EmailField(blank=True)
    mobile_no = models.CharField(max_length=30, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    job_title = models.CharField(max_length=140, blank=True)

    status = models.ForeignKey("crm.CRMLeadStatus", on_delete=models.PROTECT, related_name="leads", null=True)
    organization = models.CharField(max_length=140, blank=True)
    website = models.CharField(max_length=255, blank=True)
    no_of_employees = models.CharField(max_length=10, choices=NO_OF_EMPLOYEES_CHOICES, blank=True)
    annual_revenue = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    lead_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_leads"
    )
    source = models.ForeignKey(
        "crm.CRMLeadSource", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    industry = models.ForeignKey(
        "crm.CRMIndustry", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    territory = models.ForeignKey(
        "crm.CRMTerritory", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    image = models.CharField(max_length=255, blank=True)
    converted = models.BooleanField(default=False)
    lead_score = models.IntegerField(default=0)
    lead_temperature = models.CharField(max_length=10, choices=LEAD_TEMPERATURE_CHOICES, blank=True)

    organization_logo = models.CharField(max_length=255, blank=True)
    company_description = models.TextField(blank=True)
    linkedin = models.CharField(max_length=255, blank=True)
    twitter = models.CharField(max_length=255, blank=True)
    facebook = models.CharField(max_length=255, blank=True)

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

    total = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)
    net_total = models.DecimalField(max_digits=18, decimal_places=2, default=0, editable=False)

    facebook_lead_id = models.CharField(max_length=140, blank=True, unique=True, null=True)
    facebook_form_id = models.CharField(max_length=140, blank=True)

    lost_reason = models.ForeignKey(
        "crm.CRMLostReason", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    lost_notes = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_lead"
        verbose_name = "CRM Lead"
        ordering = ["-modified"]

    def __str__(self):
        return self.lead_name or self.name

    # -- naming / full name -------------------------------------------------

    def set_full_name(self):
        if self.first_name:
            parts = [self.salutation_id, self.first_name, self.middle_name, self.last_name]
            self.lead_name = " ".join(p for p in parts if p)

    def set_lead_name(self):
        if self.lead_name:
            return
        if self.organization:
            self.lead_name = self.organization
        elif self.email:
            self.lead_name = self.email.split("@")[0]
        elif not self.organization and not self.email:
            raise ValidationError("A Lead requires either a person's name or an organization's name")
        else:
            self.lead_name = "Unnamed Lead"

    # -- validation -----------------------------------------------------------

    def validate_status(self):
        if not self._state.adding or self.status_id:
            return
        from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus

        default_status = CRMLeadStatus.objects.filter(name="New").first()
        self.status = default_status or CRMLeadStatus.objects.filter(type="Open").first()

    def validate_email(self):
        if not self.email:
            return
        validate_email(self.email)
        if self.lead_owner_id and self.email == getattr(self.lead_owner, "email", None):
            raise ValidationError("Lead Owner cannot be same as the Lead Email Address")

    def validate_lost_reason(self):
        if self.status_id and self.status.type == "Lost":
            if not self.lost_reason_id:
                raise ValidationError("Please specify a reason for losing the lead.")
            if self.lost_reason_id == "Other" and not self.lost_notes:
                raise ValidationError("Please specify the reason for losing the lead.")

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

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        previous = None
        if not is_new:
            previous = (
                type(self)
                .objects.filter(pk=self.pk)
                .values("status_id", "lead_owner_id", "communication_status_id", "organization")
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
        self.set_full_name()
        self.set_lead_name()
        self.validate_status()
        self.validate_email()
        self.validate_lost_reason()

        status_changed = is_new or (previous and previous["status_id"] != self.status_id)
        owner_changed = (not is_new) and previous and previous["lead_owner_id"] != self.lead_owner_id
        self.communication_status_changed = is_new or (
            previous and previous["communication_status_id"] != self.communication_status_id
        )
        organization_changed = is_new or (previous and previous["organization"] != self.organization)

        self.full_clean(exclude=[f.name for f in self._meta.fields if f.name not in (
            "first_name", "email", "lost_reason", "lost_notes", "lead_owner",
        )])

        # before_save
        self.apply_sla()

        if self.organization and organization_changed:
            from apps.crm.doctype.organization.organization import CRMOrganization

            org = CRMOrganization.objects.filter(organization_name=self.organization).first()
            if org:
                copy_enrichment_from_organization(self, org)

        super().save(*args, **kwargs)
        self.flush_child_rows()

        if status_changed:
            from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus

            add_status_change_log(self, CRMLeadStatus, previous["status_id"] if previous else None, is_new)
            self.flush_child_rows()

        if owner_changed and self.lead_owner_id:
            self.share_with_agent(self.lead_owner)
            self.assign_agent(self.lead_owner)
        if is_new and self.lead_owner_id:
            if not (user and self.lead_owner_id == getattr(user, "pk", None)):
                self.share_with_agent(self.lead_owner)
            self.assign_agent(self.lead_owner)

        if is_new:
            from apps.crm.domain_enrichment.tasks import auto_enrich_on_create

            auto_enrich_on_create(self)

        from apps.core.doctype.assignment_rule.assignment_rule_engine import (
            apply_assignment_rules, doc_to_condition_dict,
        )

        apply_assignment_rules("CRM Lead", self.pk, doc_to_condition_dict(self))

    # -- conversion -----------------------------------------------------------

    def contact_exists(self):
        from apps.core.doctype.contact.contact import Contact
        from apps.core.doctype.contact_email.contact_email import ContactEmail

        if not self.email:
            return None
        row = ContactEmail.objects.filter(email_id=self.email).first()
        if not row:
            return None
        return Contact.objects.filter(pk=row.parent_id).first()

    def create_contact(self, existing_contact=None):
        from apps.core.doctype.contact.contact import Contact

        if not self.lead_name:
            self.set_full_name()
            self.set_lead_name()

        existing_contact = existing_contact or self.contact_exists()
        if existing_contact:
            self.update_lead_contact(existing_contact)
            return existing_contact

        contact = Contact(
            first_name=self.first_name or self.lead_name,
            last_name=self.last_name,
            salutation=self.salutation,
            gender=self.gender,
            designation=self.job_title,
            company_name=self.organization,
            image=self.image or "",
        )
        contact.save()
        if self.email:
            contact.email_ids.create(email_id=self.email, is_primary=True)
        if self.phone:
            contact.phone_nos.create(phone=self.phone, is_primary_phone=True)
        if self.mobile_no:
            contact.phone_nos.create(phone=self.mobile_no, is_primary_mobile_no=True)
        contact.save()
        return contact

    def update_lead_contact(self, contact):
        self.salutation = contact.salutation
        self.first_name = contact.first_name
        self.last_name = contact.last_name
        self.email = contact.email_id
        self.mobile_no = contact.mobile_no
        type(self).objects.filter(pk=self.pk).update(
            salutation=self.salutation, first_name=self.first_name, last_name=self.last_name,
            email=self.email, mobile_no=self.mobile_no,
        )

    def create_organization(self, existing_organization=None):
        from apps.crm.doctype.organization.organization import CRMOrganization

        if not self.organization and not existing_organization:
            return None

        existing_organization = existing_organization or CRMOrganization.objects.filter(
            organization_name=self.organization
        ).first()
        if existing_organization:
            self.organization = existing_organization.organization_name
            copy_enrichment_from_organization(self, existing_organization)
            type(self).objects.filter(pk=self.pk).update(organization=self.organization)
            return existing_organization

        org = CRMOrganization(
            organization_name=self.organization,
            website=self.website,
            territory=self.territory,
            industry=self.industry,
            annual_revenue=self.annual_revenue,
            no_of_employees=self.no_of_employees,
        )
        org.save()
        return org

    def create_deal(self, contact, organization, deal_overrides=None):
        from apps.crm.doctype.deal.deal import CRMDeal

        new_deal = CRMDeal()
        for field in _LEAD_TO_DEAL_DIRECT_FIELDS:
            setattr(new_deal, field, getattr(self, field))
        for lead_field, deal_field in _LEAD_TO_DEAL_FIELD_MAP.items():
            setattr(new_deal, deal_field, getattr(self, lead_field))

        new_deal.organization = organization
        new_deal.lead = self

        if self.first_responded_on:
            new_deal.sla_creation = self.sla_creation
            new_deal.response_by = self.response_by
            new_deal.sla_status = self.sla_status
            new_deal.communication_status = self.communication_status
            new_deal.first_response_time = self.first_response_time
            new_deal.first_responded_on = self.first_responded_on

        if deal_overrides:
            for key, value in deal_overrides.items():
                setattr(new_deal, key, value)

        new_deal.save()
        if contact:
            new_deal.contacts.create(contact=contact, is_primary=True)
            new_deal.set_primary_email_mobile_no()
            new_deal.save()

        for user_id in self.get_assigned_users():
            if user_id and user_id != new_deal.deal_owner_id:
                new_deal.assign_agent(user_id)

        return new_deal

    def mark_converted(self):
        from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus

        qualified = CRMLeadStatus.objects.filter(name="Qualified").first()
        if qualified:
            self.status = qualified
        self.converted = True
        self.save()


def convert_to_deal(lead_name: str, existing_contact=None, existing_organization=None, deal_overrides=None):
    """Ported from crm_lead.py's convert_to_deal() whitelist endpoint."""
    from django.db import transaction

    from apps.crm.doctype.deal.deal import CRMDeal

    with transaction.atomic():
        lead = CRMLead.objects.select_for_update().get(pk=lead_name)

        existing = CRMDeal.objects.filter(lead=lead).first()
        if existing:
            return existing

        if lead.status_id and lead.status.type == "Lost":
            raise ValidationError(f"Cannot convert a lead with status {lead.status_id}")

        contact = lead.create_contact(existing_contact)
        organization = lead.create_organization(existing_organization)
        new_deal = lead.create_deal(contact, organization, deal_overrides)
        lead.mark_converted()
        return new_deal
