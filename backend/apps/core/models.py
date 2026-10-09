from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.user_fields import UserFrappeFields


SYSTEM_USER_NAMES = ("Administrator", "Guest")


class User(UserFrappeFields, AbstractUser):
    """The one system user: the Frappe `User` doctype (table `tabUser`) and the Django auth user.

    `name` is the Frappe document name (the email); `enabled` is the Frappe flag that drives
    Django's `is_active`. Both are kept consistent in `save`."""

    email = models.EmailField(unique=True)
    user_image = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=10, blank=True)
    time_zone = models.CharField(max_length=64, blank=True)
    email_signature = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    doctype = "User"

    class Meta:
        db_table = "tabUser"
        verbose_name = "User"

    def save(self, *args, **kwargs):
        from django.utils import timezone

        if self.name not in SYSTEM_USER_NAMES:
            self.name = self.email
        if not self.username:
            self.username = self.email
        self.full_name = " ".join(part for part in (self.first_name, self.middle_name, self.last_name) if part).strip()
        if self.pk is None or not self.creation:
            self.creation = self.creation or timezone.now().replace(tzinfo=None)
        self.modified = timezone.now().replace(tzinfo=None)
        if kwargs.get("update_fields") is None:
            if self._state.adding:
                self.enabled = 1 if self.is_active else 0
            else:
                self.is_active = bool(self.enabled)
        super().save(*args, **kwargs)


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


from apps.core.doctype.liked_document.liked_document import LikedDocument  # noqa: E402,F401
from apps.core.doctype.seen_document.seen_document import SeenDocument  # noqa: E402,F401
from apps.core.doctype.system_settings.system_settings import SystemSettings  # noqa: E402,F401


class PasskeyCredential(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="passkeys")
    credential_id = models.CharField(max_length=512, unique=True)
    public_key = models.TextField()
    sign_count = models.BigIntegerField(default=0)
    transports = models.CharField(max_length=255, blank=True, default="")
    label = models.CharField(max_length=140, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "core_passkey_credential"
        ordering = ["-created_at"]
