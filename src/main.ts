import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RouterView } from 'vue-router'
import { FaIcon } from '@/utils/font-awesome';

import router from './router'

const app = createApp(RouterView)

app.use(createPinia())
app.use(router)

app.component(
  'fa',
  FaIcon,
)

app.mount('#app')
