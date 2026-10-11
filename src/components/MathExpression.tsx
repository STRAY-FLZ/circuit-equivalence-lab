import { createElement } from 'react'
import type { ReactNode } from 'react'

/** Native MathML for a small, fixed lesson notation; no symbolic evaluation. */
export function MathExpression({ expression }: { readonly expression: string }) {
  const parts: ReactNode[] = []
  let offset = 0
  for (const match of expression.matchAll(/R_\{([^{}]+)\}/g)) {
    if (match.index > offset) parts.push(createElement('mtext', { key: `text-${offset}` }, expression.slice(offset, match.index)))
    parts.push(createElement('msub', { key: `variable-${match.index}` }, createElement('mi', null, 'R'), createElement('mtext', null, match[1])))
    offset = match.index + match[0].length
  }
  if (offset < expression.length) parts.push(createElement('mtext', { key: `text-${offset}` }, expression.slice(offset)))
  return createElement('math', { className: 'math-expression', 'aria-label': expression.replace(/R_\{([^{}]+)\}/g, 'R 下标 $1') }, createElement('mrow', null, parts))
}
