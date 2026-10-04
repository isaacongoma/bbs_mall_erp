from django.urls import path

from apps.erpnext import api, views


urlpatterns = [
    path("method/<path:method_path>/", api.method_call, name="erpnext-method"),
    path("resource/<str:doctype>/", api.resource_list, name="erpnext-resource-list"),
    path("resource/<str:doctype>/<str:name>/", api.resource_detail, name="erpnext-resource-detail"),
    path("doctypes/", views.doctypes, name="erpnext-doctypes"),
    path("doctype/<str:doctype>/meta/", views.doctype_meta, name="erpnext-doctype-meta"),
    path("doc/", views.doc_create, name="erpnext-doc-create"),
    path("doc/<str:doctype>/", views.list_docs, name="erpnext-doc-list"),
    path("doc/<str:doctype>/<str:name>/", views.doc_detail, name="erpnext-doc-detail"),
    path("doc/<str:doctype>/<str:name>/submit/", views.doc_submit, name="erpnext-doc-submit"),
    path("doc/<str:doctype>/<str:name>/cancel/", views.doc_cancel, name="erpnext-doc-cancel"),
]

