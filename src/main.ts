import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RouterView } from 'vue-router'
import { FaIcon } from '@/utils/font-awesome';

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import router from './router'

const app = createApp(RouterView)

app.use(createPinia())
app.use(router)

const vuetify = createVuetify({
  components,
  directives,
})
app.use(vuetify)

app.component(
  'fa',
  FaIcon,
)

app.mount('#app')
