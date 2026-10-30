// Escultura fluida de la marca, extraída del banner oficial con fondo
// transparente (scripts/process-brand.py).
import heroSrc from '../assets/visual/sculpture-hero.webp'
import closingSrc from '../assets/visual/sculpture-closing.webp'
import './Sculpture.css'

const sources = {
  hero: { src: heroSrc, width: 920, height: 741 },
  closing: { src: closingSrc, width: 1560, height: 741 },
}

type Props = {
  className?: string
  priority?: boolean
  variant?: keyof typeof sources
}

export function Sculpture({ className = '', priority = false, variant = 'hero' }: Props) {
  const { src, width, height } = sources[variant]
  return (
    <div className={`sculpture sculpture--${variant} ${className}`} aria-hidden="true">
      <img
        src={src}
        alt=""
        width={width}
        height={height}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </div>
  )
}
