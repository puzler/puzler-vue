import SettingModeController from './setting-mode-controller'
import { Cell, type Thermometer } from '@/types'

class ThermometerController extends SettingModeController {
  currentThermoBulb = null as null|string
  removeOnMouseup = null as null|string

  events = {
    mouseup: () => {
      if (this.removeOnMouseup && this.puzzle?.thermometers) {
        const didRemove = false
        this.puzzle.thermometers = this.puzzle.thermometers.reduce(
          (newThermos, thermo) => {
            if (didRemove) return [...newThermos, thermo]

            if (thermo.bulb === this.removeOnMouseup) {
              return newThermos
            }

            const clickedLineIndex = thermo.lines.findIndex(
              (line) => line.includes(this.removeOnMouseup!)
            )

            if (clickedLineIndex === -1) return [...newThermos, thermo]
            console.log(thermo.lines.length)
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
      if (this.currentThermoBulb && this.puzzle?.thermometers) {
        const currentThermo = this.puzzle.thermometers.find(
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

  onCellClick(cell: Cell) {
    if (this.puzzle?.thermometers) {
      this.removeOnMouseup = cell.address

      const clickedBulb = this.puzzle.thermometers.find(
        (thermo) => thermo.bulb === cell.address
      )

      if (clickedBulb) {
        this.currentThermoBulb = cell.address
        clickedBulb.lines.push([cell.address])
        return
      }

      const clickedLineOf = this.puzzle.thermometers.find(
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

      this.puzzle.thermometers.push({
        bulb: cell.address,
        lines: [[cell.address]],
      })
      this.currentThermoBulb = cell.address
    }
  }

  onCellEnter(cell: Cell) {
    this.removeOnMouseup = null
    const currentThermo = this.puzzle?.thermometers?.find(
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
