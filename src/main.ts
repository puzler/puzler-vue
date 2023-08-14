import Bugsnag from '@bugsnag/js'
import BugsnagPluginVue from '@bugsnag/plugin-vue'

Bugsnag.start({
  apiKey: import.meta.env.VITE_PUZLER_BUGSNAG_API_KEY,
  plugins: [new BugsnagPluginVue()]
})

import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { FaIcon } from '@/utils/font-awesome'
import vuetify from '@/plugins/vuetify'
import router from '@/plugins/router'
import App from '@/App.vue'

const app = createApp(App)

const bugsnagVue = Bugsnag.getPlugin('vue')
if (bugsnagVue) app.use(bugsnagVue)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.component(
  'faIcon',
  FaIcon,
)

app.mount('#app')
