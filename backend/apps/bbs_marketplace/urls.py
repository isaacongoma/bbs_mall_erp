from django.urls import path

from apps.bbs_marketplace import views

urlpatterns = [
    path("courier/<str:courier>/<str:token>/", views.courier_webhook, name="marketplace-courier-webhook"),
]
