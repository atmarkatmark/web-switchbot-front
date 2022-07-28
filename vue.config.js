const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [
    'quasar'
  ],

  pluginOptions: {
    quasar: {
      importStrategy: 'kebab',
      rtlSupport: false
    }
  },

  devServer: {
    proxy: {
      "/v1.0/": {
        target: "https://api.switch-bot.com",
        logLevel: "debug"
      }
    }
  }
})
