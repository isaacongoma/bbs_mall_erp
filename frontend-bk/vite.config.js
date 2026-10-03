import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import frappeuiPlugin from 'frappe-ui/vite'

export default defineConfig({
  plugins: [
    // Only the parts of frappe-ui's own vite plugin that don't assume a
    // Frappe backend: icon resolution (~icons/* virtual modules used by
    // frappe-ui's own components) and the `import { X } from 'frappe-ui'`
    // barrel-to-module resolution. frappeProxy/jinjaBootData (dev-proxy to a
    // Frappe site, Jinja-templated boot data) are off -- this project talks
    // to the Django REST backend instead, via resourceFetcher.js.
    ...frappeuiPlugin({
      frappeProxy: false,
      jinjaBootData: false,
      buildConfig: false,
      lucideIcons: true,
      barrelImports: true,
    }),
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // '@framework/ui' points at a sibling checkout of frappe-ui's private
      // monorepo in the original project -- not available to us (not in the
      // published npm package). Only one file uses it
      // (Settings/WorkflowAutomations/WorkflowFilters.vue, for
      // ConditionBuilder); see src/framework-ui-shim/ConditionBuilder.js.
      '@framework/ui/components/ConditionBuilder': path.resolve(
        import.meta.dirname,
        'src/framework-ui-shim/ConditionBuilder.js',
      ),
      '@framework/ui/ActivityTimeline': path.resolve(
        import.meta.dirname,
        'src/framework-ui-shim/ActivityTimeline.js',
      ),
    },
    dedupe: ['vue', 'vue-router', 'frappe-ui'],
  },
  optimizeDeps: {
    // frappe-ui's own components import virtual `~icons/lucide/*` modules,
    // resolved by the lucideIcons plugin above (a Rollup-style resolveId/load
    // plugin). Vite's dev-mode dependency pre-bundler runs a separate,
    // primitive esbuild scan first that doesn't see Vite/Rollup plugin hooks,
    // so pre-bundling frappe-ui crashes on those unresolved virtual imports.
    // Excluding it here forces Vite to process it through the real plugin
    // pipeline instead (unnecessary in the original project, where frappe-ui
    // was a symlinked monorepo package, not a pre-bundled node_modules dep).
    exclude: ['frappe-ui'],
    // These CJS packages need esbuild's pre-bundling pass to get a synthesized
    // default export (without it, the browser loads the raw CJS file as ESM,
    // where `export default` doesn't exist -- e.g. FeatherIcon.vue's `import
    // feather from 'feather-icons'` fails). Carried over from the original
    // project's vite.config.js, where this list was needed for the same reason.
    include: ['feather-icons', 'prosemirror-state', 'prosemirror-view', 'lowlight', 'interactjs', 'debug'],
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
