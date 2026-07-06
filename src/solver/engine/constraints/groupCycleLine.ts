import type { SolverConstraintSpec } from '../../types'
import type { Board } from '../board'
import type { Constraint } from '../constraint'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { GroupCycleConstraint } from './lineConstraints'
import { lineCellGroups, pairsAtDistance } from './lineHelpers'

// Entropic and modular lines: every run of three successive cells holds one
// digit from each of three groups — thirds of the range (entropic) or residue
// classes mod 3 (modular). Pairwise this is exactly: cells one or two steps
// apart are in different groups, which also forces cells three steps apart into
// the SAME group, seeded as extra links for propagation. The GroupCycleConstraint
// adds whole-class logic on top (see its comment).
interface GroupCycleSpec extends SolverConstraintSpec {
  kind: 'group_cycle_line'
  cells: number[]
  partition: 'thirds' | 'mod3'
  // Fog projection: the pair subsets currently knowable, and whether the
  // whole-class constraint applies (full line visible). Absent = derive all
  // pairs from `cells` and include the whole-class constraint.
  near?: Array<[number, number]>
  far?: Array<[number, number]>
  full?: boolean
}

const LABEL = { thirds: 'Entropic line', mod3: 'Modular line' } as const

function groupFn(partition: GroupCycleSpec['partition'], board: Board): (v: number) => number {
  if (partition === 'mod3') return (v) => v % 3
  const band = Math.ceil(board.size / 3)
  return (v) => Math.floor((v - 1) / band)
}

export default defineModule<GroupCycleSpec>({
  kind: 'group_cycle_line',
  fromEditor: (ctx) => [
    ...lineCellGroups(ctx, 'entropic_lines').map((cells) => ({ kind: 'group_cycle_line' as const, cells, partition: 'thirds' as const })),
    ...lineCellGroups(ctx, 'modular_lines').map((cells) => ({ kind: 'group_cycle_line' as const, cells, partition: 'mod3' as const })),
  ],
  build: (board, spec) => {
    const name = LABEL[spec.partition]
    const group = groupFn(spec.partition, board)
    const near = spec.near ?? [...pairsAtDistance(spec.cells, 1), ...pairsAtDistance(spec.cells, 2)]
    const far = spec.far ?? pairsAtDistance(spec.cells, 3)
    const out: Constraint[] = []
    if (near.length) out.push(new ForbiddenPairsConstraint(name, near, (a, b) => group(a) === group(b)))
    if (far.length) out.push(new ForbiddenPairsConstraint(name, far, (a, b) => group(a) !== group(b)))
    if (spec.full ?? true) out.push(new GroupCycleConstraint(name, spec.cells, group))
    return out
  },
  // Pair knowledge under fog is distance-local: an adjacent (d1) pair shows
  // once either cell is visible (the line visibly exits toward the neighbour);
  // a d2 pair needs its middle cell visible (a fog gap of unknown length breaks
  // distance knowledge otherwise); a d3 same-group pair needs both middles.
  // The whole-class constraint reasons over the entire line, so it needs full
  // visibility.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      const cells = spec.cells
      const near = [
        ...pairsAtDistance(cells, 1).filter(([a, b]) => !view.isFogged(a) || !view.isFogged(b)),
        ...pairsAtDistance(cells, 2).filter((_, i) => !view.isFogged(cells[i + 1])),
      ]
      const far = pairsAtDistance(cells, 3).filter(
        (_, i) => !view.isFogged(cells[i + 1]) && !view.isFogged(cells[i + 2]),
      )
      if (near.length === 0 && far.length === 0) return []
      return [{ ...spec, near, far, full: false }]
    },
  },
})
