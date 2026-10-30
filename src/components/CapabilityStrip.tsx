import { capabilities } from '../content/site'
import './CapabilityStrip.css'

export function CapabilityStrip() {
  return (
    <div className="container">
      <div className="capabilities">
        <h2 className="visually-hidden">Capacidades</h2>
        <ul className="capabilities__list">
          {capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
