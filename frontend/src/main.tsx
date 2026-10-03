import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { bootstrap } from './app/bootstrap'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')
const root = createRoot(container)

void bootstrap().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
