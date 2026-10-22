export function SymbolBody({ kind }: { readonly kind: string }) {
  switch (kind) {
    case 'resistor': return <><path d="M-40 0H-24 M24 0H40" /><rect x="-24" y="-10" width="48" height="20" /></>
    case 'capacitor': return <path d="M-40 0H-5 M-5 -20V20 M5 -20V20 M5 0H40" />
    case 'inductor': return <path d="M-40 0H-24 C-24 -24 -12 -24 -12 0 C-12 -24 0 -24 0 0 C0 -24 12 -24 12 0 C12 -24 24 -24 24 0 H40" />
    case 'voltage-source': return <><path d="M-40 0H-22 M22 0H40 M-14 0H-6 M-10 -4V4 M6 0H14" /><circle r="22" /></>
    case 'current-source': return <><path d="M-40 0H-22 M22 0H40 M-12 0H12 M5 -7L12 0L5 7" /><circle r="22" /></>
    case 'vcvs': case 'vccs': case 'ccvs': case 'cccs': return <><path d="M-40 0H-24 L0 -24 L24 0 L0 24 L-24 0 M24 0H40" />{kind === 'vcvs' || kind === 'ccvs' ? <path d="M-14 0H-6 M-10 -4V4 M6 0H14" /> : <path d="M-12 0H12 M5 -7L12 0L5 7" />}{(kind === 'vcvs' || kind === 'vccs') && <><path d="M-40 60H-26 M26 60H40" /><text x="-22" y="64" fontSize="12">c+</text><text x="8" y="64" fontSize="12">c−</text></>}</>
    default: return <rect x="-45" y="-35" width="90" height="70" />
  }
}
