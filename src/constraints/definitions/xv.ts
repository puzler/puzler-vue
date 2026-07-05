import { mdiAlphaVCircle } from '@mdi/js'
import { defineConnectorConstraint } from '../define'
import { greyscale } from '../types'

export default defineConnectorConstraint({
  type: 'xv',
  jsonKey: 'xv',
  label: 'XV',
  themeLabel: 'XV clue',
  icon: { path: mdiAlphaVCircle },
  connector: 'xv',
  themeFamily: 'text',
  textStyle: { fontColor: greyscale(0), size: 0.30 },
  panelId: 'xv',
})
