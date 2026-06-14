import type { Board } from '../board'
import type { Constraint } from '../constraint'
import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import type { ConstraintModule } from './module'

// Phase 5 — globals & single-cell.
import diagonal from './diagonal'
import disjoint from './disjoint'
import chess from './chess'
import antiKropki from './antiKropki'
import antiXv from './antiXv'
import cellMask from './cellMask'
import minMax from './minMax'
import indexCell from './indexCell'

// Phase 6 — connectors & lines.
import connector from './connector'
import quadruple from './quadruple'
import palindrome from './palindrome'
import whisper from './whisper'
import renban from './renban'
import thermometer from './thermometer'
import arrow from './arrow'
import betweenLine from './betweenLine'
import regionSumLine from './regionSumLine'

// Phase 7 — cages, regions & outer clues.
import killerCage from './killerCage'
import extraRegion from './extraRegion'
import clone from './clone'
import xSum from './xSum'
import sandwich from './sandwich'
import skyscraper from './skyscraper'
import littleKiller from './littleKiller'

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
  minMax,
  indexCell,
  connector,
  quadruple,
  palindrome,
  whisper,
  renban,
  thermometer,
  arrow,
  betweenLine,
  regionSumLine,
  killerCage,
  extraRegion,
  clone,
  xSum,
  sandwich,
  skyscraper,
  littleKiller,
]

const BY_KIND = new Map<string, ConstraintModule>(MODULES.map((m) => [m.kind, m]))

// Main-thread: gather specs from every module given the editor context.
export function collectSpecs(ctx: AdapterContext): SolverConstraintSpec[] {
  return MODULES.flatMap((m) => m.fromEditor(ctx))
}

// Worker: construct engine constraints for a list of specs.
export function buildConstraints(board: Board, specs: SolverConstraintSpec[]): Constraint[] {
  const out: Constraint[] = []
  for (const spec of specs) {
    const module = BY_KIND.get(spec.kind)
    if (!module) continue
    const built = module.build(board, spec)
    if (Array.isArray(built)) out.push(...built)
    else out.push(built)
  }
  return out
}
