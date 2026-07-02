import { mdiLessThan } from '@mdi/js'
import { defineConnectorConstraint } from '../define'
import { greyscale } from '../types'

export default defineConnectorConstraint({
  type: 'inequality',
  label: 'Inequalities',
  themeLabel: 'Inequality sign',
  icon: { path: mdiLessThan },
  connector: 'inequality',
  themeFamily: 'text',
  textStyle: { fontColor: greyscale(0), size: 0.30 },
  panelId: 'inequality',
})
