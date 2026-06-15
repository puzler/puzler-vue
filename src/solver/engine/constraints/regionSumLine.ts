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

// Split a single line path into consecutive same-region runs.
function segmentByRegion(ctx: AdapterContext, cells: number[]): number[][] {
  const segments: number[][] = []
  let current: number[] = []
  let region: string | null | undefined
  for (const cell of cells) {
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
  return segments
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
