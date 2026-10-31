// Prerenderizado de la portada en el build (scripts/prerender.mjs): el HTML llega con el contenido
// ya escrito y el navegador lo pinta sin esperar al JavaScript; luego React lo hidrata (main.tsx).
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
