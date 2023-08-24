import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faSun,
  faMoon,
  faDeleteLeft,
  faPalette,
  faArrowsSplitUpAndLeft,
} from '@fortawesome/free-solid-svg-icons'

library.add(faArrowsSplitUpAndLeft)
library.add(faPalette)
library.add(faMoon)
library.add(faSun)
library.add(faDeleteLeft)

export const FaIcon = FontAwesomeIcon
