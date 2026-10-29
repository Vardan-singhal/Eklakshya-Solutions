import Image from "next/image";

/** Browser chrome around a screenshot. `pos` crops the image differently per frame. */
export function BrowserFrame({ src, alt, pos = "center", zoom = 1, url = "app.eklakshya.dev" }: { src: string; alt: string; pos?: string; zoom?: number; url?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-ember" />
          <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <i className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="flex-1 truncate rounded-full bg-bg/70 px-3 py-1 text-center font-mono text-[10px] text-muted">{url}</span>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={src} alt={alt} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" style={{ objectPosition: pos, transform: `scale(${zoom})` }} />
      </div>
    </div>
  );
}

/** Phone frame around a screenshot. */
export function PhoneFrame({ src, alt, pos = "center" }: { src: string; alt: string; pos?: string }) {
  return (
    <div className="mx-auto w-[min(100%,260px)] rounded-[2.4rem] border-[6px] border-[#1b1814] bg-[#1b1814] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[1.9rem]">
        <Image src={src} alt={alt} fill sizes="260px" className="object-cover" style={{ objectPosition: pos }} />
        <span aria-hidden className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
