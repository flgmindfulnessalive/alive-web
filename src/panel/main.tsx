import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '../styles/tokens.css'
import '../styles/global.css'
import './panel.css'
import { PanelApp } from './PanelApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
)
