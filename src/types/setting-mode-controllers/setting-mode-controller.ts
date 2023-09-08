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
  controllerVue?(): undefined|{ component: Component, props?: any }
}

abstract class SettingModeController {
  puzzle: PuzzleSolve
  allowGridSelect = false
  events = {} as Record<string, Function>

  constructor(puzzle: PuzzleSolve) {
    this.puzzle = puzzle
  }
  
  selecting = false
  deselecting = false
  lastSelected = null as null|Address
  inputListeners = [] as Array<() => void>

  input(args: any) {
    if (!this.puzzle) return

    if (this.onInput) {
      this.onInput(args)
    }

    this.triggerChangeListeners()
  }

  protected triggerChangeListeners() {
    this.inputListeners.forEach((listener) => listener())
  }

  addInputListener(listener: () => void) {
    this.inputListeners.push(listener)
  }

  removeInputListener(listener: () => void) {
    this.inputListeners.filter((check) => check !== listener)
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

  handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) {
      if (event.shiftKey) {
        if (this.puzzle.canRedo) this.puzzle.redo()
      } else if (this.puzzle.canUndo) {
        this.puzzle.undo()
      }
      return
    }

    if (this.allowGridSelect) {
      if (/^(Key(A|W|S|D)|Arrow\w+)$/.test(event.code)) {
        if (event.code === 'KeyA' && (event.ctrlKey || event.metaKey)) {
          this.puzzle.cells.forEach((row) => row.forEach((cell) => cell.selected = true))
          event.stopImmediatePropagation()
          event.stopPropagation()
          event.preventDefault()
          return
        }

        if (this.lastSelected === null) return
        const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
        if (!addToCurrentSelections) this.puzzle.deselectAll()

        let { row, column } = this.lastSelected
        switch (event.code) {
          case 'KeyW':
          case 'ArrowUp':
            row -= 1
            break
          case 'KeyS':
          case 'ArrowDown':
            row += 1
            break
          case 'KeyA':
          case 'ArrowLeft':
            column -= 1
            break
          case 'KeyD':
          case 'ArrowRight':
            column += 1
            break
          default:
            throw 'Unknown code'
        }

        if (row < 0) row = this.puzzle.size - 1
        if (row > this.puzzle.size - 1) row = 0
        if (column < 0) column = this.puzzle.size - 1
        if (column > this.puzzle.size - 1) column = 0

        const target = this.puzzle.cellAt({ row, column })
        if (!target.selected) {
          target.selected = true
          this.lastSelected = target.address
        }
      }
    }
  }

  keydownHandler = (event: KeyboardEvent) => this.handleKeyDown(event)
  resetSelectingEventHandler = () => this.resetSelecting()

  controllerEvents = {} as Record<string, (event: any) => void>

  setup() {
    window.addEventListener('keydown', this.keydownHandler)
    if (this.allowGridSelect) {
      window.addEventListener('mouseup', this.resetSelectingEventHandler)
    }

    this.controllerEvents = Object.keys(this.events).reduce(
      (obj, eventType) => ({
        ...obj,
        [eventType]: (event: any) => this.handleEventListener(event, this.events[eventType]),
      }),
      {} as Record<string, (event: any) => void>
    )

    Object.keys(this.controllerEvents).forEach((eventType) => {
      window.addEventListener(
        eventType as keyof WindowEventMap,
        this.controllerEvents[eventType],
      )
    })

    if (this.onSetup) {
      this.onSetup()
    }
  }

  reset() {
    if (this.allowGridSelect) {
      window.removeEventListener('mouseup', this.resetSelectingEventHandler)
      window.removeEventListener('keydown', this.keydownHandler)
      this.lastSelected = null
    }

    Object.keys(this.controllerEvents).forEach((eventType) => {
      window.removeEventListener(
        eventType as keyof WindowEventMap,
        this.controllerEvents[eventType],
      )
    })

    if (this.onReset) {
      this.onReset()
    }
  }

  cellClick(event: PointerEvent, cell?: PuzzleSolveCell) {
    if (event.target instanceof HTMLElement) {
      event.target.releasePointerCapture(event.pointerId)
    }

    if (this.allowGridSelect) {
      const addToCurrentSelections = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey
      if (!addToCurrentSelections) {
        this.puzzle.deselectAll()
        this.selecting = true
        if (cell) {
          cell.selected = true
          this.lastSelected = cell.address
        }
      } else if (cell) {
        cell.selected = !cell.selected
        this.lastSelected = cell.address
        if (cell.selected) {
          this.selecting = true
        } else {
          this.deselecting = true
        }
      }
    }

    if (this.onCellClick && cell) {
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
        this.lastSelected = cell.address
      } else if (this.deselecting) {
        cell.selected = false
        this.lastSelected = cell.address
      }
    }

    if (this.onCellEnter) {
      this.onCellEnter(cell, event)
    }
  }
}

export default SettingModeController
