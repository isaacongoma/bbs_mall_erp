from rest_framework import serializers

from apps.core import contacts
from apps.core.identity import user_pk
from apps.frappe.runtime import get_doc

SCALAR_FIELDS = (
    "name", "first_name", "middle_name", "last_name", "full_name", "email_id", "salutation", "gender",
    "phone", "mobile_no", "image", "department", "designation", "company_name", "address", "status",
)
FLAG_FIELDS = ("is_primary_contact", "unsubscribed")


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(read_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    middle_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    salutation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    designation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    company_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_primary_contact = serializers.BooleanField(required=False)
    unsubscribed = serializers.BooleanField(required=False)

    def to_representation(self, instance):
        data = {field: getattr(instance, field, None) or "" for field in SCALAR_FIELDS}
        data["name"] = instance.name
        for field in FLAG_FIELDS:
            data[field] = bool(getattr(instance, field, 0))
        data["email_ids"] = [
            {"email_id": row.email_id, "is_primary": bool(row.is_primary)} for row in contacts.email_rows(instance.name)
        ]
        data["phone_nos"] = [
            {
                "phone": row.phone,
                "is_primary_phone": bool(row.is_primary_phone),
                "is_primary_mobile_no": bool(row.is_primary_mobile_no),
            }
            for row in contacts.phone_rows(instance.name)
        ]
        data["owner"] = user_pk(instance.owner)
        datetime_field = serializers.DateTimeField()
        data["creation"] = datetime_field.to_representation(instance.creation) if instance.creation else None
        data["modified"] = datetime_field.to_representation(instance.modified) if instance.modified else None
        return data

    def create(self, validated_data):
        values = {key: (int(value) if isinstance(value, bool) else value) for key, value in validated_data.items()}
        return contacts.create_contact(**values)

    def update(self, instance, validated_data):
        document = get_doc("Contact", instance.name, ignore_permissions=True)
        for key, value in validated_data.items():
            document.set(key, int(value) if isinstance(value, bool) else value)
        document.flags.ignore_links = True
        document.save(ignore_permissions=True)
        return contacts.contact_model().objects.get(pk=instance.name)
