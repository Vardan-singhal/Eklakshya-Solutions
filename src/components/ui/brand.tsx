import { useId } from "react";

/** Supplied artwork, with its black matte keyed out at render time. */
function BrandArtwork({ size = 40, className = "", wordmark = false }: { size?: number; className?: string; wordmark?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={wordmark ? size * 5.3 : size} height={size} viewBox={wordmark ? "220 600 1100 220" : "60 225 1130 730"} className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 1 0 -0.08" />
        </filter>
      </defs>
      <image href={wordmark ? "/brand/full-logo.png" : "/brand/logo.png"} width={wordmark ? 1536 : 1254} height={wordmark ? 1024 : 1254} filter={`url(#${id})`} />
    </svg>
  );
}

/** Preserve the shared logo API and all animations on its callers. */
export function TargetLogo({ size = 40, className = "" }: { size?: number; className?: string; mono?: boolean }) {
  return <BrandArtwork size={size} className={className} />;
}

export function BrandWordmark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <BrandArtwork size={size} className={className} wordmark />;
}

/** Small mono eyebrow label with a target dot. */
export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`t-eyebrow inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="relative grid h-3.5 w-3.5 place-items-center">
        <span className="absolute inset-0 rounded-full border border-current opacity-60" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      {children}
    </p>
  );
}

/**
 * Static target artwork. Used as the hero fallback on mobile / low-end devices /
 * reduced-motion, and as backdrop art. Pure SVG + CSS animation.
 */
export function StaticTarget({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" role="img" aria-label="Concentric target rings with a focus point at the centre">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="var(--c-ember)" stopOpacity=".45" />
          <stop offset="1" stopColor="var(--c-ember)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="600" y2="600" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--c-ember)" }} />
          <stop offset="1" style={{ stopColor: "var(--c-tint)" }} />
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="290" fill={`url(#${id}-glow)`} />
      <g className="animate-spin-slow" style={{ transformOrigin: "300px 300px" }}>
        <circle cx="300" cy="300" r="282" stroke="var(--c-ember)" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="2 12" />
        <circle cx="300" cy="300" r="226" stroke="var(--c-tint)" strokeOpacity=".7" strokeWidth="2" strokeDasharray="90 40 14 40" />
      </g>
      <g className="animate-spin-reverse" style={{ transformOrigin: "300px 300px" }}>
        <circle cx="300" cy="300" r="170" stroke="var(--c-ember)" strokeWidth="2.5" strokeDasharray="120 30" />
        <circle cx="300" cy="300" r="118" stroke="var(--c-tint)" strokeOpacity=".8" strokeWidth="1.5" strokeDasharray="4 10" />
      </g>
      <circle cx="300" cy="300" r="64" stroke={`url(#${id}-g)`} strokeWidth="3" />
      <path d="M300 10v160M300 430v160M10 300h160M430 300h160" stroke="var(--c-fg)" strokeOpacity=".25" strokeWidth="1" />
      <g className="animate-float" style={{ transformOrigin: "300px 300px" }}>
        <polygon points="300,262 332,300 300,338 268,300" fill={`url(#${id}-g)`} />
        <path d="M300 262v76M268 300h64" stroke="var(--c-bg)" strokeOpacity=".45" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
