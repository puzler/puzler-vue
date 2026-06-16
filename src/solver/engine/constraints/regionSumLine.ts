import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import { defineModule } from './module'
import { RegionSumLineConstraint } from './lineConstraints'
import { lineCellGroups, groupConnectedPaths } from './lineHelpers'

// Region sum line: each maximal run of the line within a single region holds the
// same sum. Segmented by region in the adapter (so it respects custom regions).
interface RegionSumSpec extends SolverConstraintSpec {
  kind: 'region_sum'
  segments: number[][]
}

// Split a single line path into consecutive same-region runs. Handles a closed
// loop (drawn as a path whose first cell repeats at the end): the repeated cell is
// one cell, not two, and the run wraps around it.
function segmentByRegion(ctx: AdapterContext, cells: number[]): number[][] {
  // A loop repeats its start at the end; drop the duplicate so it isn't summed
  // twice (the source of the "full loop breaks the line" bug).
  const loop = cells.length > 2 && cells[0] === cells[cells.length - 1]
  const path = loop ? cells.slice(0, -1) : cells

  const segments: number[][] = []
  let current: number[] = []
  let region: string | null | undefined
  for (const cell of path) {
    const r = ctx.regionOfCell(cell)
    if (current.length === 0 || r === region) {
      current.push(cell)
    } else {
      segments.push(current)
      current = [cell]
    }
    region = r
  }
  if (current.length) segments.push(current)

  // On a loop the run continues across the wrap from the last cell back to the
  // first; if both ends sit in the same region those two segments are really one.
  if (
    loop &&
    segments.length > 1 &&
    ctx.regionOfCell(path[0]) === ctx.regionOfCell(path[path.length - 1])
  ) {
    const tail = segments.pop() as number[]
    segments[0] = [...tail, ...segments[0]]
  }
  // Defensive: a cell visited twice within one run is still summed once.
  return segments.map((seg) => (seg.length === new Set(seg).size ? seg : [...new Set(seg)]))
}

export default defineModule<RegionSumSpec>({
  kind: 'region_sum',
  // Branched arms are separate instances sharing a cell; every box-segment across
  // the whole connected shape shares one sum, so merge their segments into one spec.
  fromEditor: (ctx) =>
    groupConnectedPaths(lineCellGroups(ctx, 'region_sum')).map((component) => ({
      kind: 'region_sum' as const,
      segments: component.flatMap((path) => segmentByRegion(ctx, path)),
    })),
  build: (_board, spec) => new RegionSumLineConstraint(spec.segments),
})
