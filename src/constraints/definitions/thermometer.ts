import { mdiThermometer } from '@mdi/js'
import { defineThermoConstraint } from '../define'

// Shared by both thermo types (slow thermometer imports it) and the style resolver.
export const THERMO_STYLE = {
  color: '#aaaaaa',
  strokeWidth: 12,
  bulbRadius: 18,
}

export default defineThermoConstraint({
  type: 'thermometer',
  label: 'Thermometer',
  pickerLabel: 'Thermometers',
  iconPath: mdiThermometer,
  filterOrder: 1,
})
