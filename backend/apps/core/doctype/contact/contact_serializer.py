from rest_framework import serializers

from apps.core.doctype.contact.contact import Contact
from apps.core.doctype.contact_email.contact_email import ContactEmail
from apps.core.doctype.contact_phone.contact_phone import ContactPhone


class ContactEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEmail
        fields = ("email_id", "is_primary")


class ContactPhoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactPhone
        fields = ("phone", "is_primary_phone", "is_primary_mobile_no")


class ContactSerializer(serializers.ModelSerializer):
    # Mutated only through contact_api.create_new/set_as_primary (matching
    # the original -- crm/api/contact.py never exposes these as a raw
    # nested-array PATCH), so read-only here.
    email_ids = ContactEmailSerializer(many=True, read_only=True)
    phone_nos = ContactPhoneSerializer(many=True, read_only=True)

    class Meta:
        model = Contact
        fields = (
            "name", "first_name", "middle_name", "last_name", "full_name", "email_id", "salutation", "gender",
            "phone", "mobile_no", "image", "is_primary_contact", "department", "designation", "unsubscribed",
            "company_name", "address", "status", "email_ids", "phone_nos", "owner", "creation", "modified",
        )
        read_only_fields = ("full_name", "email_id", "phone", "mobile_no", "owner", "creation", "modified")
