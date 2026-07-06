import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { whenAnyVisible } from './fogPolicies'
import { ForbiddenPairsConstraint } from './shared'

// Border connectors between two orthogonally adjacent cells: difference dots
// (|a−b| = value, default 1), ratio dots (a:b = value:1, default 2), XV
// (a + b = 10 for X, 5 for V) and inequality signs (a < b — the spec swaps
// the cells so `a` is always the smaller side). Quadruples live at corners
// and are handled separately.
interface ConnectorSpec extends SolverConstraintSpec {
  kind: 'connector'
  relation: 'diff' | 'ratio' | 'sum' | 'less'
  value: number
  a: number
  b: number
}

export default defineModule<ConnectorSpec>({
  kind: 'connector',
  fromEditor: (ctx) => {
    const specs: ConnectorSpec[] = []
    for (const dot of ctx.connectorDots) {
      const key = dot.location
      if (!key.includes('|')) continue
      const [ka, kb] = key.split('|')
      const a = ctx.keyToIndex(ka)
      const b = ctx.keyToIndex(kb)
      if (a < 0 || b < 0) continue
      if (dot.type === 'difference_dots') {
        specs.push({ kind: 'connector', relation: 'diff', value: typeof dot.value === 'number' ? dot.value : 1, a, b })
      } else if (dot.type === 'ratio_dots') {
        specs.push({ kind: 'connector', relation: 'ratio', value: typeof dot.value === 'number' ? dot.value : 2, a, b })
      } else if (dot.type === 'xv') {
        const sum = dot.value === 'X' ? 10 : dot.value === 'V' ? 5 : 0
        if (sum) specs.push({ kind: 'connector', relation: 'sum', value: sum, a, b })
      } else if (dot.type === 'inequality') {
        if (dot.value === '<') specs.push({ kind: 'connector', relation: 'less', value: 0, a, b })
        else if (dot.value === '>') specs.push({ kind: 'connector', relation: 'less', value: 0, a: b, b: a })
      }
    }
    return specs
  },
  build: (_board, spec) => {
    const v = spec.value
    const forbidden =
      spec.relation === 'diff'
        ? (a: number, b: number) => Math.abs(a - b) !== v
        : spec.relation === 'ratio'
          ? (a: number, b: number) => !(a === v * b || b === v * a)
          : spec.relation === 'less'
            ? (a: number, b: number) => a >= b
            : (a: number, b: number) => a + b !== v
    return new ForbiddenPairsConstraint('Connector', [[spec.a, spec.b]], forbidden)
  },
  // A connector is always exactly the two cells its glyph sits between, so a
  // half-revealed glyph is fully determined: visible once either endpoint is.
  fogPolicy: whenAnyVisible((spec) => [spec.a, spec.b]),
})
