from rest_framework import serializers

from apps.core.doctype.data_import.data_import import DataImport


class DataImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataImport
        fields = (
            "name", "reference_doctype", "import_type", "status", "import_file",
            "google_sheets_url", "template_options", "mute_emails", "creation", "modified",
        )
        read_only_fields = ("name", "creation", "modified")
