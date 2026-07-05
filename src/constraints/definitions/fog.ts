import { mdiWeatherFog, mdiLightbulbOnOutline } from '@mdi/js'
import { defineConstraint, defineGlobalConstraint } from '../define'

// Fog of War: the grid starts covered in fog; placing a correct digit clears
// the fog in that cell and its eight neighbors. The global toggle serializes
// as `fog: { enabled: true }`; the light cells the setter places (fog free
// from the start) serialize under `constraints.fogLights`.
const fog = defineGlobalConstraint({
  type: 'fog',
  label: 'Fog of War',
  json: { key: 'fog', selfToggleKey: 'enabled' },
  iconPath: mdiWeatherFog,
  filter: { label: 'Fog of War' },
  panelId: 'fog',
})

// The light-placement tool. single_cell gives it click routing, mark storage
// with undo, and document serialization for free; omitting pickerGroup keeps
// it out of the local-constraint picker (it is managed through the fog panel),
// and omitting filter/theme keeps it out of archive chips and the theme editor.
const fogLights = defineConstraint({
  type: 'fog_lights',
  label: 'Fog Lights',
  json: { key: 'fogLights' },
  toolbox: { category: 'single_cell' },
  icon: { path: mdiLightbulbOnOutline },
  panel: { id: 'fog' },
} as const)

export default [fog, fogLights] as const
