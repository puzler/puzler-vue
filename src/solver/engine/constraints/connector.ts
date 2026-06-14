import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'

// Border connectors between two orthogonally adjacent cells: difference dots
// (|a−b| = value, default 1), ratio dots (a:b = value:1, default 2) and XV
// (a + b = 10 for X, 5 for V). Quadruples live at corners and are handled
// separately.
interface ConnectorSpec extends SolverConstraintSpec {
  kind: 'connector'
  relation: 'diff' | 'ratio' | 'sum'
  value: number
  a: number
  b: number
}

export default defineModule<ConnectorSpec>({
  kind: 'connector',
  fromEditor: (ctx) => {
    const specs: ConnectorSpec[] = []
    for (const [key, dot] of Object.entries(ctx.connectorDots)) {
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
          : (a: number, b: number) => a + b !== v
    return new ForbiddenPairsConstraint('Connector', [[spec.a, spec.b]], forbidden)
  },
})
