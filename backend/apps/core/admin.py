from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.core.doctype.docshare.docshare import DocShare
from apps.core.doctype.todo.todo import ToDo
from apps.core.models import Contact, User

admin.site.register(User, DjangoUserAdmin)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("name", "full_name", "email_id", "company_name")
    search_fields = ("full_name", "email_id", "company_name")


admin.site.register(ToDo)
admin.site.register(DocShare)
