from rest_framework import serializers

from apps.crm.doctype.note.note import FCRMNote


class FCRMNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FCRMNote
        read_only_fields = ("name", "owner", "creation", "modified")
        fields = (
            "name", "title", "content", "reference_doctype", "reference_docname",
            "owner", "creation", "modified",
        )
