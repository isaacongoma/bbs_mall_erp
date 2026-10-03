// Imported first (before router/App.vue) so its setConfig('resourceFetcher', ...)
// side effect runs before those modules' transitive imports (e.g.
// stores/settings.js) get a chance to fire their own `auto: true` resource
// fetch during ES module graph resolution -- see resourceFetcher.js's own
// comment on this for the full explanation.
import { djangoResourceFetcher } from './resourceFetcher'

import './index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createDialog } from './utils/dialogs'
import { initSocket } from './socket'
import router from './router'
import translationPlugin from './translation'
import App from './App.vue'

import {
  FrappeUI,
  Button,
  Input,
  TextInput,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  FeatherIcon,
} from 'frappe-ui'

import { telemetryPlugin } from 'frappe-ui/frappe'
// injects the lucide SVG sprite into the DOM so the IconPicker and lucide Icons
// (used for view icons) can render from it
import { spritePlugin } from 'frappe-ui/icons'

let globalComponents = {
  Button,
  TextInput,
  Input,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  FeatherIcon,
}

// create a pinia instance
let pinia = createPinia()

let app = createApp(App)

// frappe-ui's own plugin defaults socketio: true and opens its own
// socket.io-client connection independently of our $socket global below --
// pointed at a Frappe realtime server we don't have (see socket.js). Off
// here to avoid an endless failed-reconnect loop; our own (currently no-op)
// $socket is still wired up after boot, same as the original.
app.use(FrappeUI, { socketio: false })
app.use(spritePlugin)
app.use(pinia)
app.use(router)
app.use(translationPlugin)
for (let key in globalComponents) {
  app.component(key, globalComponents[key])
}
app.use(telemetryPlugin, { app_name: 'crm' })

app.config.globalProperties.$dialog = createDialog

// The original fetches this (frappe's Jinja boot context, normally injected
// server-side into the desk page) via a dev-only whitelisted RPC and copies
// it onto `window` before mounting, since a lot of ported utility code reads
// window.sysdefaults / window.translated_doctypes optimistically. We have no
// Jinja boot pass (see vite.config.js's jinjaBootData: false), so this always
// runs, not just in DEV -- djangoResourceFetcher resolves the same method
// name to a real Django endpoint (apps/crm/boot_api.py).
djangoResourceFetcher({ url: 'crm.www.crm.get_context_for_dev' }).then(
  (values) => {
    for (let key in values) {
      window[key] = values[key]
    }
    let socket = initSocket()
    app.config.globalProperties.$socket = socket
    app.mount('#app')
  },
)

if (import.meta.env.DEV) {
  window.$dialog = createDialog
}
