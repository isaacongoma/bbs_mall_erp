from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MallViewSet, BuildingViewSet, FloorViewSet, UnitViewSet

router = DefaultRouter()
router.register(r'malls', MallViewSet, basename='mall')
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'units', UnitViewSet, basename='unit')

urlpatterns = [
    path('', include(router.urls)),
]
