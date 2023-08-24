import SettingModeController from './setting-mode-controller'
import { PuzzleSolve, PuzzleSolveCell } from '@/types'
import type { MultiCell, Address, KillerCage, Clone } from '@/graphql/generated/types'
import NumpadControl from '@/components/player/setter-controls/NumpadControl.vue'

class MultiCellController extends SettingModeController {
  constraintType: string
  constructor(puzzle: PuzzleSolve, { constraintType }: { constraintType: string }) {
    super(puzzle)
    this.constraintType = constraintType
  }

  get minSize() {
    if (this.constraintType === 'Extra Regions') return this.puzzle.size
    return 1
  }

  get maxSize() {
    if (this.constraintType === 'Clones') return
    return this.puzzle.size
  }

  controllerVue = () => {
    if (this.constraintType !== 'Killer Cages') return

    return {
      component: NumpadControl,
      props: {
        numpad: [
          1, 2, 3,
          4, 5, 6,
          7, 8, 9,
          0, null, 'delete',
        ],
      },
    }
  }

  events = {
    'mouseup': () => {
      if (this.removeOnMouseup) {
        setTimeout(
          () => {
            if (!this.removeOnMouseup) return

            if (this.constraintType === 'Clones' && this.draggingCloneGroup) {
              const clones = this.areaList as Array<Clone>
              const cloneGroup = clones.find(
                ({ cloneCells }) => cloneCells[cloneCells.length - 1].every(
                  (address, i) => this.addressesAreEqual(address, this.draggingCloneGroup!.cloneGroup[i])
                )
              )
              if (cloneGroup) cloneGroup.cloneCells.pop()
            }
    
            const clickedAreaIndex = this.areaList.findIndex(
              ({ cells }) => cells.some(
                (address) => this.addressesAreEqual(address, this.removeOnMouseup!)
              )
            )
    
            if (clickedAreaIndex >= 0) {
              if (this.constraintType === 'Clones') {
                const clone = this.areaList[clickedAreaIndex] as Clone
                if (clone.cloneCells.length) {
                  const newOrigin = [...clone.cloneCells.pop()!]
                  clone.cells = newOrigin
                } else {
                  this.areaList.splice(clickedAreaIndex, 1)
                }
              } else {
                this.areaList.splice(clickedAreaIndex, 1)
              }
            } else {
              let clickedCloneIndex = -1
              let clickedGroupIndex = -1;
              
              const clones = this.areaList as Array<Clone>
              clones.some(
                ({ cloneCells }, cloneIndex) => {
                  const groupIndex = cloneCells.findIndex(
                    (addresses) => addresses.some(
                      (address) => this.addressesAreEqual(address, this.removeOnMouseup!)
                    )
                  )
                  if (groupIndex === -1) return
                  
                  clickedCloneIndex = cloneIndex
                  clickedGroupIndex = groupIndex
                  return true
                }
              )
      
              if (clickedGroupIndex >= 0) {
                clones[clickedCloneIndex].cloneCells.splice(clickedGroupIndex, 1)
              }
            }
    
            this.removeOnMouseup = null
          },
          this.constraintType === 'Killer Cages' ? 100 : 10
        )
      } else if (this.draggingConstraint) {
        if (this.draggingConstraint.cells.length < this.minSize) {
          console.log('too short')
          const indexToRemove = this.areaList.findIndex(
            (area) => area.cells.every(
              (cell, i) => this.addressesAreEqual(cell, this.draggingConstraint!.cells[i])
            )
          )
          console.log('foundIndex', indexToRemove)

          if (indexToRemove >= 0) {
            this.areaList.splice(indexToRemove, 1)
          }
        } else {
          this.inputTarget = this.draggingConstraint
        }

        this.draggingConstraint = null
      } else if (this.draggingCloneGroup) {
        const groupCellsOutOfBounds = this.draggingCloneGroup.cloneGroup.some(
          ({ row, column }) => {
            if (row < 0) return true
            if (column < 0) return true
            if (row > this.puzzle.size - 1) return true
            if (column > this.puzzle.size - 1) return true
            return false
          }
        )

        if (groupCellsOutOfBounds) {
          const clones = this.areaList as Array<Clone>
          let groupCloneIndex = -1
          let groupIndex = -1
          clones.some(
            ({ cloneCells }, cloneIndex) => {
              const matchIndex = cloneCells.indexOf(this.draggingCloneGroup!.cloneGroup)
              if (matchIndex === -1) return false

              groupCloneIndex = cloneIndex
              groupIndex = matchIndex
              return true
            }
          )

          if (groupIndex >= 0) {
            clones[groupCloneIndex].cloneCells.splice(groupIndex, 1)
          }
        }

        this.draggingCloneGroup = null
      }
    },
    'keydown': (event: KeyboardEvent) => {
      if (this.constraintType !== 'Killer Cages') return

      if (/^(Digit|Numpad)\d$/.test(event.code)) {
        this.input(parseInt(event.code.charAt(event.code.length - 1), 10))
      } else if (event.code === 'Backspace') {
        this.input('delete')
      }
    }
  }

  draggingConstraint = null as null|MultiCell
  draggingCloneGroup = null as null|{ lastCell: Address, cloneGroup: Array<Address> }
  inputTarget = null as null|KillerCage
  removeOnMouseup = null as null|Address

  get constraintKey() {
    switch (this.constraintType) {
      case 'Killer Cages': return 'killerCages'
      case 'Clones': return 'clones'
      case 'Extra Regions': return 'extraRegions'
    }

    throw new Error('Unknown constraint type')
  }

  get areaList() {
    const list = this.puzzle.puzzleData.localConstraints[this.constraintKey]

    if (list) {
      return list as Array<MultiCell>
    }

    throw new Error('Could not find list')
  }

  constraintExtraData() {
    if (this.constraintType === 'Clones') {
      return { cloneCells: [] }
    }

    return {}
  }

  onCellClick(cell: PuzzleSolveCell) {
    this.inputTarget = null
    const areaClickedIndex = this.areaList.findIndex(
      ({ cells }) => cells.some((address) => this.addressesAreEqual(address, cell.address))
    )

    if (areaClickedIndex >= 0) {
      this.removeOnMouseup = cell.address
      if (this.constraintType === 'Clones') {
        const newCloneGroup = this.areaList[areaClickedIndex].cells.map(
          (address) => ({ ...address }),
        ) as Array<Address>
        (this.areaList[areaClickedIndex] as Clone).cloneCells.push(newCloneGroup)

        this.draggingCloneGroup = {
          lastCell: cell.address,
          cloneGroup: newCloneGroup,
        }
      } else {
        this.draggingConstraint = this.areaList[areaClickedIndex]
      }
    } else {
      if (this.constraintType === 'Clones') {
        const clickedGroupOf = this.areaList.find(
          (clone) => {
            const groups = (clone as Clone).cloneCells
            return groups.some(
              (addresses) => addresses.some(
                (address) => this.addressesAreEqual(address, cell.address)
              )
            )
          }
        )

        if (clickedGroupOf) {
          this.removeOnMouseup = cell.address

          const clickedGroup = (clickedGroupOf as Clone).cloneCells.find(
            (addresses) => addresses.some(
              (address) => this.addressesAreEqual(address, cell.address)
            )
          )

          if (clickedGroup) {
            const newCloneGroup = clickedGroup.map(
              (address) => ({ ...address }),
            ) as Array<Address>

            (clickedGroupOf as Clone).cloneCells.push(newCloneGroup)
            this.draggingCloneGroup = {
              lastCell: cell.address,
              cloneGroup: newCloneGroup,
            }
            return
          }
          
        }
      }

      this.draggingConstraint = {
        cells: [cell.address],
        ...this.constraintExtraData()
      }
      this.areaList.push(this.draggingConstraint)
    }
  }

  onCellEnter(cell: PuzzleSolveCell) {
    this.removeOnMouseup = null

    if (this.draggingConstraint) {
      const cellAlreadyInArea = this.draggingConstraint.cells.some(
        (address) => this.addressesAreEqual(cell.address, address)
      )
      if (!cellAlreadyInArea) {
        const cellIsANeighbor = Object.values(cell.neighbors).some(
          (neighbor) => {
            if (!neighbor) return false
            return this.draggingConstraint!.cells.some(
              (address) => this.addressesAreEqual(address, neighbor.address)
            )
          },
        )
        if (!cellIsANeighbor) return
        if (this.maxSize && this.draggingConstraint.cells.length >= this.maxSize) return
  
        this.draggingConstraint.cells.push(cell.address)
      }
    } else if (this.draggingCloneGroup) {
      const horizontalMove = cell.address.column - this.draggingCloneGroup.lastCell.column
      const verticalMove = cell.address.row - this.draggingCloneGroup.lastCell.row

      for (let i = 0; i < this.draggingCloneGroup.cloneGroup.length; i += 1) {
        this.draggingCloneGroup.cloneGroup[i].row += verticalMove
        this.draggingCloneGroup.cloneGroup[i].column += horizontalMove
      }

      this.draggingCloneGroup.lastCell = cell.address
    }
  }

  onCellDoubleClick(cell: PuzzleSolveCell) {
    if (this.constraintType !== 'Killer Cages') return

    this.removeOnMouseup = null
    const clickedCage = this.areaList.find(
      ({ cells }) => cells.some((address) => this.addressesAreEqual(address, cell.address))
    )

    if (clickedCage) this.inputTarget = clickedCage
  }

  onInput(input: number|'delete') {
    if (this.constraintType !== 'Killer Cages') return
    if (this.inputTarget) {
      const cage = this.puzzle.puzzleData.localConstraints.killerCages!.find(
        ({ cells }) => cells.every(
          (address, i) => this.addressesAreEqual(address, this.inputTarget!.cells[i])
        )
      )!

      if (input === 'delete') {
        if (cage.value !== undefined && cage.value !== null) {
          const strValue = cage.value.toString()
          const newValue = strValue.substring(0, strValue.length - 1)
          if (newValue.length) {
            cage.value = parseInt(newValue, 10)
          } else {
            delete cage.value
          }
        }
      } else {
        const oldValStr = cage.value?.toString() || ''
        cage.value = parseInt(`${oldValStr}${input}`, 10)
      }
    }
  }
}

export default MultiCellController
