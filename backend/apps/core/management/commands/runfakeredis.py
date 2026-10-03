"""Dev-only stand-in for a real Redis server.

CELERY_BROKER_URL and REDIS_URL (config/settings/base.py) already point at
redis://localhost:6379 -- Celery (the Automation Flow drainer/scheduler) and Django Channels
both need something answering the Redis wire protocol there. This machine has no Redis
server, Docker or WSL available, so `fakeredis.TcpFakeServer` serves an in-memory,
protocol-compatible stand-in on the same host/port for local development.

Production must run a real Redis instance -- this command is never invoked outside dev.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run an in-memory Redis-protocol server for local development (no real Redis needed)."

    def add_arguments(self, parser):
        parser.add_argument("--host", default="localhost")
        parser.add_argument("--port", type=int, default=6379)

    def handle(self, *args, **options):
        from fakeredis import TcpFakeServer

        host, port = options["host"], options["port"]
        server = TcpFakeServer((host, port), server_type="redis")
        self.stdout.write(self.style.SUCCESS(f"fakeredis listening on {host}:{port} (dev only)"))
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
