"""Base settings shared by every environment."""

from datetime import timedelta
from pathlib import Path
import sys

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
APPS_DIR = BASE_DIR / "apps"
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

import importlib.abc
import importlib.machinery


class _PackageAliasLoader:
    def __init__(self, target):
        self.target = target

    def create_module(self, spec):
        return sys.modules.get(self.target)

    def exec_module(self, module):
        return None


class _FrappeErpnextAliasFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        alt = None
        for prefix in ("frappe", "erpnext", "hrms"):
            apps_name = "apps." + prefix
            if fullname == prefix or fullname.startswith(prefix + "."):
                alt = "apps." + fullname
                break
            if fullname == apps_name or fullname.startswith(apps_name + "."):
                alt = fullname[len("apps."):]
                break
        if not alt:
            return None
        existing = sys.modules.get(alt)
        if existing is None:
            return None
        is_pkg = hasattr(existing, "__path__")
        spec = importlib.machinery.ModuleSpec(
            fullname,
            _PackageAliasLoader(alt),
            is_package=is_pkg,
            origin=getattr(existing, "__file__", None),
        )
        if is_pkg:
            spec.submodule_search_locations = list(getattr(existing, "__path__", []))
        return spec


if not any(type(finder).__name__ == "_FrappeErpnextAliasFinder" for finder in sys.meta_path):
    sys.meta_path.insert(0, _FrappeErpnextAliasFinder())

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-secret-key-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    "channels",
]

# Each app owns one or more doctype/ modules.
BBS_ERP_APPS = [
    "apps.core",
    "apps.frappe",
    "apps.erpnext",
    "apps.hrms",
    "apps.crm",
    "apps.property",
    "apps.leasing",
    "apps.iot",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + BBS_ERP_APPS

AUTH_USER_MODEL = "core.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.CurrentUserMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://bbs_erp:bbs_erp@localhost:5432/bbs_erp"),
}
DATABASES["default"]["TEST"] = {"NAME": env("TEST_DATABASE_NAME", default="test_bbs_erp")}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "BBS-ERP API",
    "DESCRIPTION": "Django/DRF backend for BBS-ERP (CRM + ERP modules ported from Frappe CRM / ERPNext).",
    "VERSION": "0.1.0",
}

# Externally-reachable base URL, used to build webhook callback URLs (Twilio/Exotel).
PUBLIC_URL = env("PUBLIC_URL", default="http://localhost:8000")

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:8080"])

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# Automation Flow engine: cron/date-based triggers and queue upkeep, ported from real Frappe's
# scheduler_events hooks (frappe/automation_engine's own periodic tasks). "automation-drain-due"
# is the safety net: it requeues any queue row stuck Running past its claim timeout, then drains
# inline, so a crashed worker can't strand a row forever even if kick_drainer's after-commit hook
# never fired for it.
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "automation-process-cron": {"task": "automation_engine.process_cron", "schedule": 60.0},
    "automation-process-date-based": {"task": "automation_engine.process_date_based", "schedule": crontab(minute=0)},
    "automation-drain-due": {"task": "automation_engine.drain_due", "schedule": 30.0},
    "automation-purge-queue": {"task": "automation_engine.purge_queue", "schedule": crontab(hour=2, minute=0)},
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [env("REDIS_URL", default="redis://localhost:6379/1")]},
    }
}
