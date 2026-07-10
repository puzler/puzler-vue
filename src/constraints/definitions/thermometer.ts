import { mdiThermometer } from '@mdi/js'
import { defineThermoConstraint } from '../define'
import { thermoPaths } from '../uniqueness'

// Shared by both thermo types (slow thermometer imports it) and the style resolver.
export const THERMO_STYLE = {
  color: '#aaaaaa',
  strokeWidth: 12,
  bulbRadius: 18,
}

export default defineThermoConstraint({
  type: 'thermometer',
  jsonKey: 'thermometers',
  label: 'Thermometer',
  pickerLabel: 'Thermometers',
  iconPath: mdiThermometer,
  filterOrder: 1,
  // Strictly increasing along each path — slow thermometers deliberately
  // declare no uniqueness (non-decreasing allows repeats).
  uniqueness: thermoPaths,
})
