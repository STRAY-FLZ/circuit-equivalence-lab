export function SymbolBody({ kind }: { readonly kind: string }) {
  switch (kind) {
    case 'diode': return <><path d="M-40 0H-18 M18 0H40 M-18 -18L18 0L-18 18Z M18 -20V20" /><text x="-38" y="-12" fontSize="11">A</text><text x="28" y="-12" fontSize="11">K</text></>
    case 'npn': return <><path d="M-40 0H-10 M-10 -22V22 M-10 -12L20 -30H40V-40 M-10 12L20 30H40V40 M10 16L20 30L5 26" /><text x="-36" y="-10" fontSize="11">B</text><text x="28" y="-22" fontSize="11">C</text><text x="28" y="24" fontSize="11">E</text></>
    case 'nmos': return <><path d="M-40 0H-16 M-16 -22V22 M-8 -22V22 M-8 -15H20V-40H40 M-8 15H20V40H40" /><text x="-36" y="-10" fontSize="11">G</text><text x="28" y="-22" fontSize="11">D</text><text x="28" y="24" fontSize="11">S</text></>
    case 'ideal-opamp':
    case 'dynamic-opamp': return <><path d="M-40 -20H-25 M-40 20H-25 M-25 -36L25 0L-25 36Z M25 0H40" /><text x="-22" y="-12" fontSize="12">+</text><text x="-22" y="24" fontSize="12">−</text></>
    case 'resistor': return <><path d="M-40 0H-24 M24 0H40" /><rect x="-24" y="-10" width="48" height="20" /></>
    case 'capacitor': return <path d="M-40 0H-5 M-5 -20V20 M5 -20V20 M5 0H40" />
    case 'inductor': return <path d="M-40 0H-24 C-24 -24 -12 -24 -12 0 C-12 -24 0 -24 0 0 C0 -24 12 -24 12 0 C12 -24 24 -24 24 0 H40" />
    case 'voltage-source': return <><path d="M-40 0H-22 M22 0H40 M-14 0H-6 M-10 -4V4 M6 0H14" /><circle r="22" /></>
    case 'current-source': return <><path d="M-40 0H-22 M22 0H40 M-12 0H12 M5 -7L12 0L5 7" /><circle r="22" /></>
    case 'vcvs': case 'vccs': case 'ccvs': case 'cccs': return <><path d="M-40 0H-24 L0 -24 L24 0 L0 24 L-24 0 M24 0H40" />{kind === 'vcvs' || kind === 'ccvs' ? <path d="M-14 0H-6 M-10 -4V4 M6 0H14" /> : <path d="M-12 0H12 M5 -7L12 0L5 7" />}{(kind === 'vcvs' || kind === 'vccs') && <><path d="M-40 60H-26 M26 60H40" /><text x="-22" y="64" fontSize="12">c+</text><text x="8" y="64" fontSize="12">c−</text></>}</>
    default: return <rect x="-45" y="-35" width="90" height="70" />
  }
}
