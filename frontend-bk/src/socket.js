// The original connects to Frappe's socket.io realtime server and, on a
// `refetch_resource` event carrying a `cache_key`, reloads the matching
// cached resource (see vendor/crm/frontend/src/socket.js). This backend has
// no realtime transport wired up yet -- config/asgi.py's ProtocolTypeRouter
// only serves "http", no Channels consumer/routing exists for a "websocket"
// protocol. Rather than silently pretend a live connection exists, this is a
// no-op stub with the same shape ($socket.on/.off/.emit) so code ported
// verbatim from the original that calls those methods doesn't crash; it just
// never receives realtime events until a Channels consumer is built.
export function initSocket() {
  return {
    on() {},
    off() {},
    emit() {},
    connected: false,
  }
}
