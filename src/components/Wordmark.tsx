import { WORDMARK_PATH, WORDMARK_REGISTERED as R, WORDMARK_VIEWBOX } from '../assets/brand/paths'

type Props = { className?: string; title?: string }

export function Wordmark({ className, title = 'ALIVE' }: Props) {
  return (
    <svg className={className} viewBox={WORDMARK_VIEWBOX} fill="currentColor" role="img" aria-label={title}>
      <path d={WORDMARK_PATH} />
      <g fill="none" stroke="currentColor">
        <circle cx={R.circle.cx} cy={R.circle.cy} r={R.circle.r} strokeWidth={R.circle.strokeWidth} />
        <path d={R.letter.d} strokeWidth={R.letter.strokeWidth} />
      </g>
    </svg>
  )
}
