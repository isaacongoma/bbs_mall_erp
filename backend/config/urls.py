from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.doctype.web_form.public_views import crm_form_page
from apps.core.meta_views import doctype_meta
from apps.core.upload_views import upload_file

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/meta/<str:doctype>/", doctype_meta, name="doctype-meta"),
    path("api/erpnext/", include("apps.erpnext.urls")),
    path("api/crm/", include("apps.crm.urls")),
    path("api/property/", include("apps.property.urls")),
    path("api/leasing/", include("apps.leasing.urls")),
    path("api/iot/", include("apps.iot.urls")),
    # Literal path -- frappe-ui's FileUploadHandler hits this exact URL
    # unconfigurably (see apps/core/upload_views.py).
    path("api/method/upload_file", upload_file, name="upload-file"),
    # Public lead/deal capture form (crm/www/crm_form.py) -- guest-facing, server-rendered,
    # outside the Vue SPA entirely, matching upstream's own architecture for this one page.
    path("crm-form/<path:route>/", crm_form_page, name="crm-form-page"),
]

if settings.DEBUG and "debug_toolbar" in settings.INSTALLED_APPS:
    import debug_toolbar

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]

if settings.DEBUG:
    from django.conf.urls.static import static

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
