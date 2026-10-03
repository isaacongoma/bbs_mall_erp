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

from apps.core.models import User, UserEmail


class UserEmailSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = UserEmail
        fields = ("name", "email_account", "email_id")

    def get_name(self, obj):
        return str(obj.pk)


class UserSerializer(serializers.ModelSerializer):
    user_emails = UserEmailSerializer(many=True, required=False)

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "first_name", "last_name", "user_image",
            "language", "time_zone", "email_signature", "user_emails", "is_active", "is_staff", "is_superuser", "date_joined",
        )
        read_only_fields = ("id", "email", "username", "is_staff", "is_superuser", "date_joined")

    def update(self, instance, validated_data):
        rows = validated_data.pop("user_emails", None)
        instance = super().update(instance, validated_data)
        if rows is not None:
            instance.user_emails.all().delete()
            UserEmail.objects.bulk_create(
                [
                    UserEmail(user=instance, idx=index, email_account=row["email_account"], email_id=row["email_id"])
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
