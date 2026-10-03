from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, LeaseViewSet, LeaseDocumentViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'leases', LeaseViewSet, basename='lease')
router.register(r'lease-documents', LeaseDocumentViewSet, basename='leasedocument')

urlpatterns = [
    path('', include(router.urls)),
]
