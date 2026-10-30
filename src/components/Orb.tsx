import './Orb.css'

// Orbe de la marca para el cierre: una forma líquida que se deforma y flota en un espacio
// con estrellas. Solo CSS (sin imágenes): capas con el degradado de ALIVE, cada una con su
// propio ritmo, para que el movimiento nunca se repita igual. Decorativo.
export function Orb({ className = '' }: { className?: string }) {
  return (
    <div className={`orb ${className}`} aria-hidden="true">
      <div className="orb__stars" />
      <div className="orb__float">
        <div className="orb__glow" />
        {/* Antes del cuerpo: al cruzarse, la gota pasa por detrás, como en órbita. */}
        <div className="orb__drop" />
        <div className="orb__body">
          <div className="orb__swirl" />
          <div className="orb__tint" />
          <div className="orb__shine" />
        </div>
        <div className="orb__shadow" />
      </div>
    </div>
  )
}
