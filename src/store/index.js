import { defineStore } from 'pinia'

export const useStore = defineStore('pinia', {
  state: () => ({
    apiKey: "",
    deviceList: [],
    irDeviceList: [],
    meters: [],
    irDevices: []
  }),

  getters: {
    
  },

  actions: {
    
  },

  persist: true
})
