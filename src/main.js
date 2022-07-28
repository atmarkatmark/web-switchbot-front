import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedState from 'pinia-plugin-persistedstate'
import { Quasar } from 'quasar'
import quasarUserOptions from './quasar-user-options'

const pinia = createPinia()
pinia.use(piniaPluginPersistedState)

createApp(App).use(Quasar, quasarUserOptions).use(pinia).mount('#app')
