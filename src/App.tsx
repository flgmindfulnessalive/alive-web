import { CapabilityStrip } from './components/CapabilityStrip'
import { ContactForm } from './components/ContactForm'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Manifesto } from './components/Manifesto'
import { Hero } from './components/Hero'
import { Process } from './components/Process'
import { StudioServices } from './components/StudioServices'
import { WorkGallery } from './components/WorkGallery'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#contenido" data-page-content>
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" data-page-content>
        <Hero />
        <CapabilityStrip />
        <WorkGallery />
        <Manifesto />
        <StudioServices />
        <Process />
        <ContactForm />
      </main>
      <Footer />
    </>
  )
}
