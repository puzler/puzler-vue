import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { DefaultApolloClient } from '@vue/apollo-composable'
import './style.css'
import App from './App.vue'
import router from './router'
import { apolloClient } from './utils/apolloClient'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.provide(DefaultApolloClient, apolloClient)

// Restore session on load
const auth = useAuthStore()
auth.fetchCurrentUser()

app.mount('#app')
