import type { Component } from "vue"
import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import type { Address } from '@/graphql/generated/types'

interface SettingModeController {
  onInput?(args: any): void
  onCellClick?(cell: PuzzleSolveCell, event: PointerEvent): void
  onCellEnter?(cell: PuzzleSolveCell, event: PointerEvent): void
  onCellDoubleClick?(cell: PuzzleSolveCell, event: PointerEvent): void
  onSetup?(): void
  onReset?(): void
}

abstract class SettingModeController {
  puzzle?: PuzzleSolve
  controllerVue?: Component
  allowGridSelect = false
  events = {} as Record<string, Function> 
  
  selecting = false
  deselecting = false

  input(args: any) {
    if (!this.puzzle) return

    if (this.onInput) {
      this.onInput(args)
    }
  }

  addressesAreEqual(a: Address, b: Address) {
    return a.row === b.row && a.column === b.column
  }

  handleEventListener(event: Event, eventCallback: Function) {
    eventCallback(event)
  }

  resetSelecting() {
    this.selecting = false
    this.deselecting = false
  }

  setup(puzzle: PuzzleSolve) {
    this.puzzle = puzzle

    if (this.allowGridSelect) {
      window.addEventListener('mouseup', () => this.resetSelecting())
    }

    Object.keys(this.events).forEach((eventType) => {
      window.addEventListener(
        eventType as keyof WindowEventMap,
        (event) => this.handleEventListener(event, this.events[eventType]),
      )
    })

    if (this.onSetup) {
      this.onSetup()
    }
  }

  reset() {
    this.puzzle = undefined

    if (this.allowGridSelect) {
      window.removeEventListener('mouseup', () => this.resetSelecting)
    }

    Object.keys(this.events).forEach((eventType) => {
      window.removeEventListener(
        eventType as keyof WindowEventMap,
        (event) => this.handleEventListener(event, this.events[eventType]),
      )
    })

    if (this.onReset) {
      this.onReset()
    }
  }

  cellClick(event: PointerEvent, cell: PuzzleSolveCell) {
    if (event.target instanceof HTMLElement) {
      event.target.releasePointerCapture(event.pointerId)
    }

    if (this.allowGridSelect) {
      const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
      if (addToCurrentSelections) {
        this.selecting = !cell.selected
        this.deselecting = cell.selected

        if (this.selecting) {
          cell.selected = true
        } else {
          cell.selected = false
        }
      } else {
        this.selecting = true
        this.puzzle?.deselectAll()
        if (cell) {
          cell.selected = true
        }
      }
    }

    if (this.onCellClick) {
      this.onCellClick(cell, event)
    }
  }

  cellDoubleClick(event: PointerEvent, cell: PuzzleSolveCell) {
    if (event.target instanceof HTMLElement) {
      event.target.releasePointerCapture(event.pointerId)
    }

    if (this.onCellDoubleClick) {
      this.onCellDoubleClick(cell, event)
    }
  }

  cellEnter(event: PointerEvent, cell: PuzzleSolveCell) {
    if (event.target instanceof HTMLElement) {
      event.target.releasePointerCapture(event.pointerId)
    }

    if (this.allowGridSelect) {
      if (this.selecting) {
        cell.selected = true
      } else if (this.deselecting) {
        cell.selected = false
      }
    }

    if (this.onCellEnter) {
      this.onCellEnter(cell, event)
    }
  }
}

export default SettingModeController
