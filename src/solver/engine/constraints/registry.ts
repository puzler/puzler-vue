import type { Board } from '../board'
import type { Constraint } from '../constraint'
import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import type { ConstraintModule, FogView } from './module'

// Phase 5 — globals & single-cell.
import diagonal from './diagonal'
import disjoint from './disjoint'
import chess from './chess'
import antiKropki from './antiKropki'
import antiXv from './antiXv'
import cellMask from './cellMask'
import countingCircles from './countingCircles'
import minMax from './minMax'
import indexCell from './indexCell'

// Phase 6 — connectors & lines.
import connector from './connector'
import quadruple from './quadruple'
import palindrome from './palindrome'
import whisper from './whisper'
import renban from './renban'
import thermometer from './thermometer'
import slowThermometer from './slowThermometer'
import arrow from './arrow'
import betweenLine from './betweenLine'
import regionSumLine from './regionSumLine'
import groupCycleLine from './groupCycleLine'
import nabnerLine from './nabnerLine'
import zipperLine from './zipperLine'
import lockoutLine from './lockoutLine'

// Internal kinds — produced only by fog projections, never by the adapter.
import sumAtMost from './sumAtMost'
import arrowPrefix from './arrowPrefix'

// Phase 7 — cages, regions & outer clues.
import killerCage from './killerCage'
import extraRegion from './extraRegion'
import house from './house'
import clone from './clone'
import xSum from './xSum'
import sandwich from './sandwich'
import skyscraper from './skyscraper'
import littleKiller from './littleKiller'
import numberedRooms from './numberedRooms'
import battlefield from './battlefield'
import nextToNine from './nextToNine'
import rossini from './rossini'

export type { ConstraintModule } from './module'

// Every constraint module is registered here. Populated across build phases —
// adding a constraint is one import + one array entry.
export const MODULES: ConstraintModule[] = [
  diagonal,
  disjoint,
  chess,
  antiKropki,
  antiXv,
  cellMask,
  countingCircles,
  minMax,
  indexCell,
  connector,
  quadruple,
  palindrome,
  whisper,
  renban,
  thermometer,
  slowThermometer,
  arrow,
  betweenLine,
  regionSumLine,
  groupCycleLine,
  nabnerLine,
  zipperLine,
  lockoutLine,
  killerCage,
  extraRegion,
  house,
  clone,
  xSum,
  sandwich,
  skyscraper,
  littleKiller,
  numberedRooms,
  battlefield,
  nextToNine,
  rossini,
  sumAtMost,
  arrowPrefix,
]

const BY_KIND = new Map<string, ConstraintModule>(MODULES.map((m) => [m.kind, m]))

// Main-thread: gather specs from every module given the editor context.
export function collectSpecs(ctx: AdapterContext): SolverConstraintSpec[] {
  return MODULES.flatMap((m) => m.fromEditor(ctx))
}

// Worker: what a player could currently know of a spec under fog, as buildable
// specs — [spec] itself for never-fogged clues, [] while hidden, or weakened
// projections while partially revealed. Unknown kinds pass through untouched
// (buildConstraints skips them anyway).
export function projectSpec(spec: SolverConstraintSpec, view: FogView): SolverConstraintSpec[] {
  const module = BY_KIND.get(spec.kind)
  if (!module) return [spec]
  return module.fogPolicy.fog === 'always' ? [spec] : module.fogPolicy.project(spec, view)
}

// Worker: construct engine constraints for one spec (unknown kinds build nothing).
export function buildSpec(board: Board, spec: SolverConstraintSpec): Constraint[] {
  const module = BY_KIND.get(spec.kind)
  if (!module) return []
  const built = module.build(board, spec)
  return Array.isArray(built) ? built : [built]
}

// Worker: construct engine constraints for a list of specs.
export function buildConstraints(board: Board, specs: SolverConstraintSpec[]): Constraint[] {
  return specs.flatMap((spec) => buildSpec(board, spec))
}
