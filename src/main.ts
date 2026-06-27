import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { DefaultApolloClient } from '@vue/apollo-composable'
import 'driver.js/dist/driver.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { apolloClient } from './utils/apolloClient'
import { useAuthStore } from './stores/auth'
import { initAnalytics } from './utils/analytics'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.provide(DefaultApolloClient, apolloClient)

// Restore session on load
const auth = useAuthStore()
auth.fetchCurrentUser()

initAnalytics()

app.mount('#app')
