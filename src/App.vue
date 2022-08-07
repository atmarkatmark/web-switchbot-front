<template>
  <div class="row justify-evenly q-gutter-sm q-ma-xs">
    <div class="col" v-if="!apiKey.length">
      <q-input outlined v-model="apiKey" label="SwitchBot API Key" />
    </div>

    <q-btn @click="getDevices" icon="refresh" class="col-2 col-md-1" />
    <q-btn @click="reset" icon="block" class="col-1 col-md-1" />
  </div>

  <div class="row items-start q-gutter-sm justify-evenly">
    <!-- 赤外線機器 -->
    <q-card v-for="d in irDevices" :key="d" class="device-card">
      <q-card-section class="bg-primary text-white">
        <div class="card-header">{{ d.name }}</div>
        <!-- <div>{{ d.type }}</div> -->
      </q-card-section>

      <q-separator />

      <q-card-section v-if="d.type == 'Air Conditioner'" class="row q-gutter-xs">
        <q-select outlined v-model="d.mode" :options="acModes" label="モード" class="col" map-options />
        <q-select outlined v-model="d.target" :options="acTemp" label="温度" class="col" />
        <q-select outlined v-model="d.fan" :options="acFan" label="風量" class="col" map-options />
      </q-card-section>

      <q-card-section v-if="d.type == 'Light'" class="row q-gutter-lg">
        <q-btn outline icon="light_mode" class="col" @click="brightenLight(d.id)">明るく</q-btn>
        <q-btn outline icon="dark_mode" class="col" @click="dimLight(d.id)">暗く</q-btn>
      </q-card-section>

      <q-card-actions align="center" class="row q-gutter-lg">
        <q-btn flat icon="power_settings_new" @click="turnOn(d.id)" class="col">On</q-btn>
        <q-btn flat icon="remove_circle" @click="turnOff(d.id)" class="col">Off</q-btn>
      </q-card-actions>
    </q-card>


    <!-- メーター -->
    <q-card v-for="m in meters" :key="m" class="device-card">
      <q-card-section class="bg-primary text-white">
        <div class="card-header">{{ m.name }}</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="row q-gutter-md">
        <q-chip :color="tempColor(m.temperature)" text-color="white" class="col">
          {{ m.temperature }}℃
        </q-chip>

        <q-chip color="blue" text-color="white" class="col">
          {{ m.humidity }}%
        </q-chip>

        <q-chip :color="thiColor(m.thi)" text-color="white" class="col">
          {{ m.thi }}
        </q-chip>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'
import { useStore } from "@/store/index"
import { storeToRefs } from 'pinia'

export default {
  name: 'LayoutDefault',

  components: {},

  setup () {
    const store = useStore()
    const { apiKey, deviceList, irDeviceList, meters, irDevices } = storeToRefs(store)

    const acModes = [
      { label: "自動", value: 1 },
      { label: "冷房", value: 2 },
      { label: "除湿", value: 3 },
      { label: "送風", value: 4 },
      { label: "暖房", value: 5 }
    ]

    const acTemp = [
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
    ]

    const acFan = [
      { label: "自動", value: 1 },
      { label: "弱", value: 2 },
      { label: "中", value: 3 },
      { label: "強", value: 4 }
    ]

    // 温度に応じて色変化
    const tempColor = (temp) => {
      if (30 <= temp)
        return "purple"
      else if (27 <= temp)
        return "red"
      else if (temp <= 22)
        return "blue"
      else
        return "green"
    }

    // 不快指数
    const thi = (temp, humi) => {
      return Math.round(0.81 * temp + 0.01 * humi * (0.99 * temp - 14.3) + 46.3)
    }

    const thiColor = (thi) => {
      if (80 <= thi)
        return "black"
      return "green"
    }

    // メーターの値取得
    const getMeterStatus = (deviceId, deviceName) => {
      axios.get(
        "/v1.0/devices/" + deviceId + "/status",
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)

        meters.value.push({
          id: deviceId,
          name: deviceName,
          temperature: res.data.body.temperature,
          humidity: res.data.body.humidity,
          thi: thi(res.data.body.temperature, res.data.body.humidity)
        })
      }).catch(error => {
        console.log(error)
      })
    }

    // 機器一覧の取得
    const getDevices = () => {
      if (apiKey.value == null) return

      axios.get(
        "/v1.0/devices",
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)
        
        deviceList.value = res.data.body.deviceList
        irDeviceList.value = res.data.body.infraredRemoteList

        // メーターだけ抽出
        meters.value = []
        deviceList.value.forEach(i => {
          if (["Meter", "MeterPlus"].includes(i.deviceType)) {
            getMeterStatus(i.deviceId, i.deviceName)
          }
        })

        // 赤外線機器の抽出
        irDevices.value = []
        irDeviceList.value.forEach(i => {
          irDevices.value.push({
            id: i.deviceId,
            name: i.deviceName,
            type: i.remoteType
          })
          // "Air Conditioner"は初期値追加
          irDevices.value[irDevices.value.length - 1].target = 25
          irDevices.value[irDevices.value.length - 1].mode = 1
          irDevices.value[irDevices.value.length - 1].fan = 1
        })
      }).catch(error => {
        console.log(error)
      })
    }

    // 機器の電源を入切
    const turnOn = (id) => {
      // エアコンの場合とそれ以外のデバイスで送信内容を分ける
      let body
      const device = irDevices.value.find(i => i.id == id && i.type == "Air Conditioner")
      if (device) {
        body = {
          "command": "setAll",
          "parameter": device.target + "," + (typeof device.mode === "number" ? device.mode : device.mode.value) + "," + (typeof device.fan === "number" ? device.fan : device.fan.value) + ",on",
          "commandType": "command"
        }
      } else {
        body = {
          "command": "turnOn",
          "parameter": "default",
          "commandType": "command"
        }
      }
      console.log(body)

      axios.post(
        "/v1.0/devices/" + id + "/commands",
        body,
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)
      }).catch(error => {
        console.log(error)
      })
    }
    const turnOff = (id) => {
      axios.post(
        "/v1.0/devices/" + id + "/commands",
        {
          "command": "turnOff",
          "parameter": "default",
          "commandType": "command"
        },
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)
      }).catch(error => {
        console.log(error)
      })
    }

    // ストアの初期化
    const reset = () => {
      store.$reset()
    }

    // 照明の明暗
    const brightenLight = (id) => {
      axios.post(
        "/v1.0/devices/" + id + "/commands",
        {
          "command": "brightnessUp",
          "parameter": "default",
          "commandType": "command"
        },
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)
      }).catch(error => {
        console.log(error)
      })
    }
    const dimLight = (id) => {
      axios.post(
        "/v1.0/devices/" + id + "/commands",
        {
          "command": "brightnessDown",
          "parameter": "default",
          "commandType": "command"
        },
        {
          headers: {
            "Authorization": apiKey.value
          }
        }
      ).then(res => {
        console.log(res.data)
      }).catch(error => {
        console.log(error)
      })
    }

    return {
      apiKey,
      leftDrawerOpen: ref(false),
      getDevices,
      meters,
      irDevices,
      tempColor, thiColor,
      turnOn, turnOff,
      acModes, acTemp, acFan,
      store, reset,
      brightenLight, dimLight
    }
  }
}
</script>

<style scoped>
.device-card {
  width: 100%;
  max-width: 320px;
}

.card-header {
  font-weight: bold;
  font-size: 1rem;
}
</style>