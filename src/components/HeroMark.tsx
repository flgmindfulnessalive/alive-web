// Punto final del titular: late, se convierte en idea → chispa → cohete → corazón
// y vuelve a ser punto. Decorativo (aria-hidden); el H1 ya tiene su aria-label.
export function HeroMark() {
  return (
    <span className="hero-mark" aria-hidden="true">
      <span className="hero-mark__dot">.</span>
      <svg className="hero-mark__icons" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="hero-mark-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="0.55" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#14D9D0" />
          </linearGradient>
        </defs>
        <g className="hero-mark__icon hero-mark__icon--idea">
          <path d="M9.5 18h5M10.5 21h3" />
          <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z" />
        </g>
        <g className="hero-mark__icon hero-mark__icon--spark">
          <path d="M12 2.5c.7 5 2.5 6.8 7.5 7.5-5 .7-6.8 2.5-7.5 7.5-.7-5-2.5-6.8-7.5-7.5 5-.7 6.8-2.5 7.5-7.5Z" />
          <path d="M19 16.5c.3 1.9.9 2.5 2.5 2.8-1.6.3-2.2.9-2.5 2.7-.3-1.8-.9-2.4-2.5-2.7 1.6-.3 2.2-.9 2.5-2.8Z" />
        </g>
        <g className="hero-mark__icon hero-mark__icon--rocket">
          <path d="M12.5 15.5 8.5 11.5c1.6-4.8 5.3-8.4 12-8.9-.5 6.7-4.1 10.4-8 12.9Z" />
          <path d="M8.5 11.5H5l2.5-3.5h4M12.5 15.5V19l3.5-2.5v-4" />
          <path d="M6.5 16.5c-1.6.6-2.5 2.4-2.5 4 1.6 0 3.4-.9 4-2.5" />
          <circle cx="15.5" cy="8.5" r="1.4" />
        </g>
        <g className="hero-mark__icon hero-mark__icon--heart">
          <path d="M12 20.8C9.2 18.9 2.8 14.6 2.8 9 2.8 6 5 3.8 7.7 3.8c2.2 0 3.8 1.6 4.3 5.2.5-3.6 2.1-5.2 4.3-5.2 2.7 0 4.9 2.2 4.9 5.2 0 5.6-6.4 9.9-9.2 11.8Z" />
        </g>
      </svg>
    </span>
  )
}
