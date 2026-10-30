import { useEffect } from 'react'
import { CapabilityStrip } from './components/CapabilityStrip'
import { ContactForm } from './components/ContactForm'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Manifesto } from './components/Manifesto'
import { Hero } from './components/Hero'
import { Process } from './components/Process'
import { StudioServices } from './components/StudioServices'
import { WorkGallery } from './components/WorkGallery'

// Al llegar desde otra página (/#servicios…), el navegador busca el ancla antes de
// que React pinte las secciones: se desplaza al montar y se reajusta con las fuentes.
function useInitialHash() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    if (!id) return
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    go()
    document.fonts?.ready.then(go)
  }, [])
}

export default function App() {
  useInitialHash()
  return (
    <>
      <a className="skip-link" href="#contenido" data-page-content>
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" data-page-content>
        <Hero />
        <CapabilityStrip />
        <Manifesto />
        <StudioServices />
        <WorkGallery />
        <Process />
        <ContactForm />
      </main>
      <Footer />
    </>
  )
}
