import { brand, footerLinks, footerNav } from '../content/site'
import { Wordmark } from './Wordmark'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer" data-page-content>
      <div className="container footer__inner">
        <div className="footer__brand">
          <a href="#inicio" className="footer__logo">
            <Wordmark title="ALIVE, volver al inicio" />
          </a>
          <p className="footer__signature">{brand.signature}</p>
        </div>
        <nav aria-label="Pie de página">
          <ul className="footer__nav">
            {[...footerNav, ...footerLinks].map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
