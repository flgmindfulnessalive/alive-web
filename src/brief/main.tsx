import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '../styles/tokens.css'
import '../styles/global.css'
import './brief.css'
import { BriefApp } from './BriefApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BriefApp />
  </StrictMode>,
)
