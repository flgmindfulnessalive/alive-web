import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// En producción la portada llega prerenderizada (scripts/prerender.mjs): se hidrata. En desarrollo, se monta.
const root = document.getElementById('root')!
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
