import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faSun,
  faMoon,
  faDeleteLeft,
  faPalette,
} from '@fortawesome/free-solid-svg-icons'

library.add(faPalette)
library.add(faMoon)
library.add(faSun)
library.add(faDeleteLeft)

export const FaIcon = FontAwesomeIcon
