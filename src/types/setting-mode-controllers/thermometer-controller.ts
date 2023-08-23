import SettingModeController from './setting-mode-controller'
import { PuzzleSolveCell } from '@/types'
import type {
  Thermometer,
  Address,
} from '@/graphql/generated/types'

class ThermometerController extends SettingModeController {
  currentThermoBulb = null as null|Address
  removeOnMouseup = null as null|Address

  get thermometers() {
    return this.puzzle?.puzzleData?.localConstraints.thermometers
  }

  events = {
    mouseup: () => {
      if (this.removeOnMouseup && this.thermometers) {
        const didRemove = false
        this.puzzle!.puzzleData!.localConstraints.thermometers = this.thermometers.reduce(
          (newThermos, thermo) => {
            if (didRemove) return [...newThermos, thermo]

            if (thermo.bulb === this.removeOnMouseup) {
              return newThermos
            }

            const clickedLineIndex = thermo.lines.findIndex(
              (line) => line.includes(this.removeOnMouseup!)
            )

            if (clickedLineIndex === -1) return [...newThermos, thermo]
            if (thermo.lines.length <= 2) return newThermos

            return [
              ...newThermos,
              {
                bulb: thermo.bulb,
                lines: thermo.lines.slice(0, -1).filter(
                  (_, i) => i !== clickedLineIndex,
                ),
              },
            ]
          },
          [] as Array<Thermometer>
        )
      }

      // on mouseup we delete any lines that are only length 1
      if (this.currentThermoBulb && this.thermometers) {
        const currentThermo = this.thermometers.find(
          ({ bulb }) => bulb === this.currentThermoBulb
        )!
        currentThermo.lines = currentThermo.lines.filter(
          (line) => line.length > 1
        )
      }
      this.removeOnMouseup = null
      this.currentThermoBulb = null
    }
  }

  onReset() {
    this.currentThermoBulb = null
  }

  onSetup() {
    this.currentThermoBulb = null
  }

  onCellClick(cell: PuzzleSolveCell) {
    if (this.thermometers) {
      this.removeOnMouseup = cell.address

      const clickedBulb = this.thermometers.find(
        (thermo) => thermo.bulb === cell.address
      )

      if (clickedBulb) {
        this.currentThermoBulb = cell.address
        clickedBulb.lines.push([cell.address])
        return
      }

      const clickedLineOf = this.thermometers.find(
        (thermo) => thermo.lines.some(
          (line) => line.includes(cell.address),
        ),
      )

      if (clickedLineOf) {
        this.currentThermoBulb = clickedLineOf.bulb
        const currentLineIndex = clickedLineOf.lines.findIndex(
          (line) => line.includes(cell.address),
        )!
        const currentLine = clickedLineOf.lines[currentLineIndex]
        const cellIndex = currentLine.indexOf(cell.address)

        if (cellIndex === currentLine.length - 1) {
          clickedLineOf.lines = [
            // We add an extra temp line to fix an edge case
            // where deleting a line on a thermo that has
            // two lines by clicking the end cell would
            // delete the entire thermo
            [this.currentThermoBulb],
            ...clickedLineOf.lines.filter((_, i) => i !== currentLineIndex),
            currentLine,
          ]
        } else {
          clickedLineOf.lines.push([
            ...currentLine.slice(0, cellIndex + 1),
          ])
        }
        return
      }

      this.thermometers.push({
        bulb: cell.address,
        lines: [[cell.address]],
      })
      this.currentThermoBulb = cell.address
    }
  }

  onCellEnter(cell: PuzzleSolveCell) {
    const thermometers = this.puzzle?.puzzleData?.localConstraints.thermometers
    this.removeOnMouseup = null
    const currentThermo = thermometers?.find(
      (check) => check.bulb === this.currentThermoBulb
    )
    if (!currentThermo) return
    const currentLine = currentThermo.lines[currentThermo.lines.length - 1]

    if (currentLine.includes(cell.address)) {
      while (currentLine[currentLine.length - 1] !== cell.address) {
        currentLine.pop()
      }
    } else {
      currentThermo.lines = [
        ...currentThermo.lines.slice(0, -1),
        [
          ...currentThermo.lines[currentThermo.lines.length - 1],
          cell.address,
        ],
      ]
    }
  }
}

export default new ThermometerController()
