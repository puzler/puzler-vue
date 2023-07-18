import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faSun,
  faMoon,
} from '@fortawesome/free-solid-svg-icons'

library.add(faMoon)
library.add(faSun)

export const FaIcon = FontAwesomeIcon
