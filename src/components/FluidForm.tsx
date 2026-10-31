import { useId } from 'react'
import './FluidForm.css'

// Forma fluida de la marca para el cierre: una ola de seda que sube desde abajo, con pliegues de
// luz. Se deforma despacio (SMIL, cada capa con su ritmo) y flota; se funde arriba, abajo y a la
// izquierda como la cinta del hero. Solo SVG, sin imágenes. Decorativa.

// Cada forma tiene tres posiciones con la misma estructura de curvas, para poder interpolar.
const BODY = [
  'M40,620 C70,470 150,420 240,380 C340,335 370,210 440,150 C510,95 590,150 592,270 C594,390 520,480 560,620 Z',
  'M20,620 C80,490 175,440 262,398 C350,356 352,236 414,174 C476,112 584,128 598,246 C610,360 546,470 576,620 Z',
  'M60,620 C55,455 130,392 222,358 C318,322 392,228 462,176 C530,128 596,190 586,292 C576,394 500,486 548,620 Z',
]
const FOLD = [
  'M130,620 C160,520 230,470 300,440 C380,405 410,320 462,262 C500,220 548,246 540,312 C530,392 450,470 478,620 Z',
  'M110,620 C170,530 250,486 322,450 C392,414 398,336 444,282 C482,238 552,236 550,300 C548,382 472,472 500,620 Z',
  'M150,620 C150,505 216,452 286,424 C366,392 424,312 480,256 C520,216 556,262 538,330 C520,404 438,480 462,620 Z',
]
const SHADOW = [
  'M40,620 C70,500 120,460 190,440 C260,420 290,470 300,620 Z',
  'M20,620 C70,515 130,476 210,456 C280,438 300,492 320,620 Z',
  'M60,620 C60,490 112,450 176,430 C246,410 280,458 284,620 Z',
]
const SHEEN = [
  'M210,452 C300,410 390,318 448,214',
  'M228,470 C320,430 380,344 430,240',
  'M196,438 C290,404 404,300 470,226',
]
const SHEEN2 = [
  'M360,560 C420,500 470,420 500,330',
  'M380,570 C440,500 486,420 520,342',
  'M340,552 C404,494 456,414 484,320',
]

const loop = (frames: string[]) => [...frames, frames[0]].join(';')
const SPLINES = '0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1'

function Morph({ frames, dur }: { frames: string[]; dur: string }) {
  return <animate attributeName="d" dur={dur} repeatCount="indefinite" values={loop(frames)} keyTimes="0;0.33;0.66;1" calcMode="spline" keySplines={SPLINES} />
}

export function FluidForm({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const u = (name: string) => `url(#${name}-${id})`
  return (
    <div className={`fluid ${className}`} aria-hidden="true">
      <svg className="fluid__svg" viewBox="0 0 640 620" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id={`base-${id}`} x1="0.1" y1="1" x2="0.9" y2="0">
            <stop offset="0" stopColor="#3b1fb0" />
            <stop offset="0.38" stopColor="#7c3aed" />
            <stop offset="0.68" stopColor="#2f6bff" />
            <stop offset="1" stopColor="#00e0d0" />
          </linearGradient>
          <linearGradient id={`fold-${id}`} x1="0.2" y1="1" x2="0.8" y2="0">
            <stop offset="0" stopColor="#2f6bff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5b8cff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#5ff5e6" stopOpacity="0.9" />
          </linearGradient>
          <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={`sheen-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={`halo-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="40" />
          </filter>
          <filter id={`edge-${id}`}>
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <clipPath id={`clip-${id}`}>
            <path d={BODY[0]}>
              <Morph frames={BODY} dur="18s" />
            </path>
          </clipPath>
        </defs>

        {/* Halo de luz detrás */}
        <path d={BODY[0]} fill={u('base')} opacity="0.45" filter={u('halo')}>
          <Morph frames={BODY} dur="18s" />
        </path>

        {/* Cuerpo con sus pliegues, recortado por la propia forma */}
        <g clipPath={u('clip')} filter={u('edge')}>
          <rect width="640" height="620" fill={u('base')} />
          <path d={FOLD[0]} fill={u('fold')} filter={u('soft')} opacity="0.9">
            <Morph frames={FOLD} dur="14s" />
          </path>
          <path d={SHADOW[0]} fill="#080f14" filter={u('soft')} opacity="0.75">
            <Morph frames={SHADOW} dur="16s" />
          </path>
          <path d={SHEEN[0]} fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" filter={u('sheen')} opacity="0.5">
            <Morph frames={SHEEN} dur="18s" />
          </path>
          <path d={SHEEN2[0]} fill="none" stroke="#bffcf6" strokeWidth="6" strokeLinecap="round" filter={u('sheen')} opacity="0.4">
            <Morph frames={SHEEN2} dur="14s" />
          </path>
        </g>
      </svg>
    </div>
  )
}
