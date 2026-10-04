from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Platform user, referenced by owner/modified_by on every record and by
    fields such as Lead.lead_owner."""

    email = models.EmailField(unique=True)
    user_image = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=10, blank=True)
    time_zone = models.CharField(max_length=64, blank=True)
    email_signature = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        # AbstractUser's default verbose_name is lowercase "user" -- every
        # other doctype's Meta.verbose_name is the real "CRM Xyz" label
        # (get_doctype_meta's Link-field options derives from this), and
        # frappe's own doctype label for this one is exactly "User".
        verbose_name = "User"


class UserEmail(models.Model):
    """Child row of User.user_emails: an outgoing Email Account the user can send from."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_emails")
    idx = models.PositiveIntegerField(default=0)
    email_account = models.CharField(max_length=140)
    email_id = models.EmailField()

    class Meta:
        db_table = "core_user_email"
        verbose_name = "User Email"
        ordering = ["idx", "id"]


class BaseDocument(models.Model):
    """Common audit fields shared by every record: who created/last touched it and when."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="+",
        editable=False,
        null=True,
        blank=True,
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="+",
        editable=False,
        null=True,
        blank=True,
    )
    idx = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True


# Re-exported so Django's app registry discovers them (their real source
# lives next to each doctype definition, same convention as apps/crm).
from apps.core.doctype.assignment_rule.assignment_rule import (  # noqa: E402,F401
    AssignmentRule, AssignmentRuleDay, AssignmentRuleUser,
)
from apps.core.doctype.automation_event_subscription.automation_event_subscription import (  # noqa: E402,F401
    AutomationEventSubscription,
)
from apps.core.doctype.automation_flow.automation_flow import AutomationAction, AutomationFlow  # noqa: E402,F401
from apps.core.doctype.automation_settings.automation_settings import AutomationSettings  # noqa: E402,F401
from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (  # noqa: E402,F401
    AutomationTriggerQueue,
)
from apps.core.doctype.background_task.background_task import BackgroundTask  # noqa: E402,F401
from apps.core.doctype.contact.contact import Contact  # noqa: E402,F401
from apps.core.doctype.data_import.data_import import DataImport, DataImportLog  # noqa: E402,F401
from apps.core.doctype.contact_email.contact_email import ContactEmail  # noqa: E402,F401
from apps.core.doctype.contact_phone.contact_phone import ContactPhone  # noqa: E402,F401
from apps.core.doctype.docshare.docshare import DocShare  # noqa: E402,F401
from apps.core.doctype.gender.gender import Gender  # noqa: E402,F401
from apps.core.doctype.liked_document.liked_document import LikedDocument  # noqa: E402,F401
from apps.core.doctype.salutation.salutation import Salutation  # noqa: E402,F401
from apps.core.doctype.seen_document.seen_document import SeenDocument  # noqa: E402,F401
from apps.core.doctype.system_settings.system_settings import SystemSettings  # noqa: E402,F401
from apps.core.doctype.web_form.web_form import GuestLinkAccess, WebForm, WebFormField  # noqa: E402,F401
