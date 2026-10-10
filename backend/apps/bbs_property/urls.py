from django.urls import path

from apps.bbs_property import views

urlpatterns = [
    path("mpesa/<str:token>/<str:kind>/", views.mpesa_callback, name="property-mpesa-callback"),
]
