import { mdiThermometerLow } from '@mdi/js'
import { defineThermoConstraint } from '../define'

export default defineThermoConstraint({
  type: 'slow_thermometer',
  jsonKey: 'slowThermometers',
  label: 'Slow Thermometer',
  pickerLabel: 'Slow Thermometers',
  themeLabel: 'Slow thermometer',
  iconPath: mdiThermometerLow,
  filterOrder: 2,
  panelProps: {
    title: 'Slow Thermometers',
    ruleText: 'Digits stay the same or increase from the bulb toward each tip',
  },
})
