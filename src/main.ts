import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { FaIcon } from '@/utils/font-awesome'
import vuetify from '@/plugins/vuetify'
import router from '@/plugins/router'
import App from '@/App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.component(
  'fa',
  FaIcon,
)

app.mount('#app')
