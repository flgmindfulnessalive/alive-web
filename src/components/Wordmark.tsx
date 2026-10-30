import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../assets/brand/paths'

type Props = { className?: string; title?: string }

export function Wordmark({ className, title = 'ALIVE' }: Props) {
  return (
    <svg className={className} viewBox={WORDMARK_VIEWBOX} fill="currentColor" role="img" aria-label={title}>
      <path fillRule="evenodd" d={WORDMARK_PATH} />
    </svg>
  )
}
