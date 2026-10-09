# REST surface for the User doctype -- needed by Settings' Profile/Preferences
# panels (createDocumentResource({doctype: 'User', name: sessionUser})), which
# were failing outright with no endpoint mapped at all (blocking the whole
# Settings modal, not just these two panels, since GlobalModals.vue also
# eagerly resolves a User document resource on mount).
from __future__ import annotations

import zoneinfo

from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import User


def user_email_model():
    from apps.erpnext.registry import get_model

    return get_model("User Email")


class UserSerializer(serializers.ModelSerializer):
    user_emails = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "first_name", "last_name", "user_image",
            "language", "time_zone", "email_signature", "user_emails", "is_active", "is_staff", "is_superuser", "date_joined",
        )
        read_only_fields = ("id", "email", "username", "is_staff", "is_superuser", "date_joined")

    def get_user_emails(self, obj):
        rows = user_email_model().objects.filter(parent=obj.email, parentfield="user_emails", parenttype="User").order_by("idx")
        return [{"name": row.name, "email_account": row.email_account, "email_id": row.email_id} for row in rows]

    def update(self, instance, validated_data):
        rows = self.initial_data.get("user_emails") if hasattr(self, "initial_data") else None
        instance = super().update(instance, validated_data)
        if rows is not None:
            from apps.frappe.utils.data import generate_hash

            model = user_email_model()
            model.objects.filter(parent=instance.email, parentfield="user_emails", parenttype="User").delete()
            model.objects.bulk_create(
                [
                    model(
                        name=generate_hash(length=10),
                        parent=instance.email,
                        parentfield="user_emails",
                        parenttype="User",
                        idx=index + 1,
                        email_account=row["email_account"],
                        email_id=row["email_id"],
                    )
                    for index, row in enumerate(rows)
                ]
            )
        return instance


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = "pk"
    search_fields = ("email", "first_name", "last_name")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_timezones(request):
    # Matches frappe.core.doctype.user.user.get_timezones's real shape --
    # PreferencesSettings.vue reads `timeZones.data?.timezones`, not a bare list.
    return Response({"timezones": sorted(zoneinfo.available_timezones())})
