from rest_framework import viewsets

from apps.crm.doctype.note.note import FCRMNote
from apps.crm.doctype.note.note_serializer import FCRMNoteSerializer


class FCRMNoteViewSet(viewsets.ModelViewSet):
    queryset = FCRMNote.objects.all()
    serializer_class = FCRMNoteSerializer
    lookup_field = "name"
    filterset_fields = ("reference_doctype", "reference_docname")
